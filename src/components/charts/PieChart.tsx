import { useState } from 'react';
import { getColorByIndex, calculatePercentage } from '../../utils/chartHelpers';

export interface PieChartData {
  label: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieChartData[];
  title?: string;
  width?: number;
  height?: number;
  showLegend?: boolean;
  showPercentages?: boolean;
}

export function PieChart({
  data,
  title,
  width = 400,
  height = 400,
  showLegend = true,
  showPercentages = true,
}: PieChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);

  if (data.length === 0 || data.every(d => d.value === 0)) {
    return (
      <div className="space-y-2">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        )}
        <div
          className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          style={{ width, height: showLegend ? height : height / 2 }}
        >
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  // Calculate total
  const total = data.reduce((sum, d) => sum + d.value, 0);

  // Calculate segments
  const segments = data.map((item, index) => {
    const percentage = calculatePercentage(item.value, total);
    const color = item.color || getColorByIndex(index);
    return {
      ...item,
      percentage,
      color,
    };
  });

  // Calculate pie segments
  const radius = Math.min(width, height) / 2 - 40;
  const centerX = width / 2;
  const centerY = showLegend ? height / 3 : height / 2;

  let currentAngle = -90; // Start at top

  const pieSegments = segments.map(segment => {
    const angle = (segment.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    currentAngle += angle;

    // Calculate path
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    // Calculate label position (middle of segment)
    const midAngle = (startAngle + endAngle) / 2;
    const midRad = (midAngle * Math.PI) / 180;
    const labelRadius = radius * 0.7;
    const labelX = centerX + labelRadius * Math.cos(midRad);
    const labelY = centerY + labelRadius * Math.sin(midRad);

    return {
      path,
      labelX,
      labelY,
      ...segment,
    };
  });

  return (
    <div className="space-y-2">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <svg width={width} height={showLegend ? height : height / 2}>
          {pieSegments.map((segment, index) => (
            <g key={index}>
              <path
                d={segment.path}
                fill={segment.color}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-opacity"
                style={{
                  opacity: hoveredSegment === null || hoveredSegment === index ? 1 : 0.5,
                }}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
              />
              {showPercentages && segment.percentage >= 5 && (
                <text
                  x={segment.labelX}
                  y={segment.labelY}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  className="text-xs font-medium fill-white pointer-events-none"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {segment.percentage.toFixed(1)}%
                </text>
              )}
            </g>
          ))}
        </svg>

        {showLegend && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {segments.map((segment, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                style={{
                  opacity: hoveredSegment === null || hoveredSegment === index ? 1 : 0.5,
                }}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div
                  className="w-4 h-4 rounded flex-shrink-0"
                  style={{ backgroundColor: segment.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {segment.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {segment.value} ({segment.percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

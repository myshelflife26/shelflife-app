import { useState, useMemo } from 'react';
import {
  calculateDimensions,
  calculateScale,
  generateTicks,
  calculateAreaPath,
  formatNumber,
  formatDateLabel,
  CHART_COLORS,
} from '../../utils/chartHelpers';

interface AreaChartProps {
  data: Array<{ timestamp: number; value: number }>;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  formatValue?: (value: number) => string;
  smooth?: boolean;
}

export function AreaChart({
  data,
  title,
  xAxisLabel,
  yAxisLabel,
  width = 600,
  height = 400,
  color = CHART_COLORS.primary,
  fillColor,
  formatValue = formatNumber,
  smooth = true,
}: AreaChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Use lighter version of color for fill if not specified
  const actualFillColor = fillColor || `${color}40`; // 40 = 25% opacity in hex

  const chartData = useMemo(() => {
    if (data.length === 0) {
      return {
        points: [],
        dimensions: calculateDimensions(width, height),
        xScale: calculateScale(0, 1, 5),
        yScale: calculateScale(0, 1, 5),
        xTicks: [],
        yTicks: [],
        baselineY: 0,
      };
    }

    const dimensions = calculateDimensions(width, height, {
      top: 20,
      right: 20,
      bottom: 50,
      left: 70,
    });

    // Calculate scales
    const values = data.map(d => d.value);
    const timestamps = data.map(d => d.timestamp);

    const yScale = calculateScale(0, Math.max(...values), 6); // Start from 0 for cumulative
    const xMin = Math.min(...timestamps);
    const xMax = Math.max(...timestamps);
    const xRange = xMax - xMin || 1;

    // Calculate baseline Y (bottom of chart)
    const baselineY = dimensions.marginTop + dimensions.chartHeight;

    // Calculate point positions
    const points = data.map(d => ({
      x: dimensions.marginLeft + ((d.timestamp - xMin) / xRange) * dimensions.chartWidth,
      y: dimensions.marginTop + dimensions.chartHeight -
         ((d.value - yScale.min) / yScale.range) * dimensions.chartHeight,
      timestamp: d.timestamp,
      value: d.value,
    }));

    // Generate ticks
    const yTicks = generateTicks(yScale, 6);
    const xTicks = timestamps.filter((_, i) => i % Math.ceil(timestamps.length / 6) === 0);

    return {
      points,
      dimensions,
      xScale: { min: xMin, max: xMax, range: xRange, step: xRange / 5 },
      yScale,
      xTicks,
      yTicks,
      baselineY,
    };
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        style={{ width, height }}
      >
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const areaPath = calculateAreaPath(chartData.points, chartData.baselineY, smooth);

  return (
    <div className="space-y-2">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      )}
      <div className="relative">
        <svg
          width={width}
          height={height}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          {/* Y-axis grid lines */}
          {chartData.yTicks.map(tick => {
            const y = chartData.dimensions.marginTop + chartData.dimensions.chartHeight -
              ((tick - chartData.yScale.min) / chartData.yScale.range) * chartData.dimensions.chartHeight;

            return (
              <g key={tick}>
                <line
                  x1={chartData.dimensions.marginLeft}
                  y1={y}
                  x2={chartData.dimensions.marginLeft + chartData.dimensions.chartWidth}
                  y2={y}
                  stroke="currentColor"
                  className="text-gray-200 dark:text-gray-700"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={chartData.dimensions.marginLeft - 10}
                  y={y}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                >
                  {formatValue(tick)}
                </text>
              </g>
            );
          })}

          {/* X-axis grid lines */}
          {chartData.xTicks.map((timestamp, i) => {
            const x = chartData.dimensions.marginLeft +
              ((timestamp - chartData.xScale.min) / chartData.xScale.range) * chartData.dimensions.chartWidth;

            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={chartData.dimensions.marginTop}
                  x2={x}
                  y2={chartData.dimensions.marginTop + chartData.dimensions.chartHeight}
                  stroke="currentColor"
                  className="text-gray-200 dark:text-gray-700"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={x}
                  y={chartData.dimensions.marginTop + chartData.dimensions.chartHeight + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                >
                  {formatDateLabel(timestamp, 'short')}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path
            d={areaPath}
            fill={actualFillColor}
            stroke="none"
          />

          {/* Line border */}
          <path
            d={areaPath.split(' L ')[0] + ' ' + areaPath.split(' L ').slice(1, -2).join(' L ')}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {chartData.points.map((point, i) => (
            <g key={i}>
              <circle
                cx={point.x}
                cy={point.y}
                r={hoveredPoint === i ? 6 : 4}
                fill={color}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          ))}

          {/* Axis labels */}
          {yAxisLabel && (
            <text
              x={15}
              y={chartData.dimensions.marginTop + chartData.dimensions.chartHeight / 2}
              textAnchor="middle"
              className="text-xs fill-gray-700 dark:fill-gray-300 font-medium"
              transform={`rotate(-90, 15, ${chartData.dimensions.marginTop + chartData.dimensions.chartHeight / 2})`}
            >
              {yAxisLabel}
            </text>
          )}

          {xAxisLabel && (
            <text
              x={chartData.dimensions.marginLeft + chartData.dimensions.chartWidth / 2}
              y={height - 10}
              textAnchor="middle"
              className="text-xs fill-gray-700 dark:fill-gray-300 font-medium"
            >
              {xAxisLabel}
            </text>
          )}
        </svg>

        {/* Tooltip */}
        {hoveredPoint !== null && chartData.points[hoveredPoint] && (
          <div
            className="absolute bg-gray-900 dark:bg-gray-700 text-white px-3 py-2 rounded shadow-lg text-sm pointer-events-none z-10"
            style={{
              left: chartData.points[hoveredPoint].x + 10,
              top: chartData.points[hoveredPoint].y - 40,
            }}
          >
            <div className="font-medium">{formatValue(chartData.points[hoveredPoint].value)}</div>
            <div className="text-xs text-gray-300">
              {formatDateLabel(chartData.points[hoveredPoint].timestamp, 'medium')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

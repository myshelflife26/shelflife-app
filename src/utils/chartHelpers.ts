// Shared utilities for SVG-based charts

export interface DataPoint {
  label: string;
  value: number;
  timestamp?: number;
}

export interface ChartScale {
  min: number;
  max: number;
  range: number;
  step: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  chartWidth: number;
  chartHeight: number;
}

// Tailwind color palette for charts (dark mode compatible)
export const CHART_COLORS = {
  primary: '#3b82f6', // blue-500
  secondary: '#8b5cf6', // violet-500
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  info: '#06b6d4', // cyan-500
  purple: '#a855f7', // purple-500
  pink: '#ec4899', // pink-500
  indigo: '#6366f1', // indigo-500
  teal: '#14b8a6', // teal-500
};

export const CHART_COLOR_ARRAY = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.info,
  CHART_COLORS.purple,
  CHART_COLORS.pink,
  CHART_COLORS.indigo,
  CHART_COLORS.teal,
];

/**
 * Calculate chart dimensions with margins
 */
export function calculateDimensions(
  width: number,
  height: number,
  margins?: Partial<{ top: number; right: number; bottom: number; left: number }>
): ChartDimensions {
  const marginTop = margins?.top ?? 20;
  const marginRight = margins?.right ?? 20;
  const marginBottom = margins?.bottom ?? 40;
  const marginLeft = margins?.left ?? 60;

  return {
    width,
    height,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    chartWidth: width - marginLeft - marginRight,
    chartHeight: height - marginTop - marginBottom,
  };
}

/**
 * Calculate nice scale values for axis
 */
export function calculateScale(min: number, max: number, tickCount: number = 5): ChartScale {
  const range = max - min;

  if (range === 0) {
    return { min: min - 1, max: max + 1, range: 2, step: 1 };
  }

  // Calculate nice step value
  const roughStep = range / (tickCount - 1);
  const magnitude = Math.floor(Math.log10(roughStep));
  const magnitudePow = Math.pow(10, magnitude);
  const normalizedStep = roughStep / magnitudePow;

  let niceStep: number;
  if (normalizedStep <= 1) {
    niceStep = 1;
  } else if (normalizedStep <= 2) {
    niceStep = 2;
  } else if (normalizedStep <= 5) {
    niceStep = 5;
  } else {
    niceStep = 10;
  }

  const step = niceStep * magnitudePow;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  return {
    min: niceMin,
    max: niceMax,
    range: niceMax - niceMin,
    step,
  };
}

/**
 * Format currency value for display
 */
export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Format large numbers with K/M suffix
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

/**
 * Format date for axis labels
 */
export function formatDateLabel(timestamp: number, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const date = new Date(timestamp);

  switch (format) {
    case 'short':
      return `${date.getMonth() + 1}/${date.getDate()}`;
    case 'medium':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'long':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Format date range for display
 */
export function formatDateRange(startTimestamp: number, endTimestamp: number): string {
  const start = new Date(startTimestamp);
  const end = new Date(endTimestamp);

  const startStr = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return `${startStr} - ${endStr}`;
}

/**
 * Generate tick values for axis
 */
export function generateTicks(scale: ChartScale, maxTicks: number = 6): number[] {
  const ticks: number[] = [];
  const tickCount = Math.min(Math.floor(scale.range / scale.step) + 1, maxTicks);

  for (let i = 0; i < tickCount; i++) {
    ticks.push(scale.min + i * scale.step);
  }

  return ticks;
}

/**
 * Calculate SVG path for line chart
 */
export function calculateLinePath(
  points: { x: number; y: number }[],
  smooth: boolean = true
): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  if (!smooth) {
    // Simple polyline
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  }

  // Smooth curve using quadratic bezier
  let path = `M ${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    const prev = points[i - 1];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;

    if (i === 1) {
      path += ` L ${midX},${midY}`;
    } else {
      path += ` Q ${prev.x},${prev.y} ${midX},${midY}`;
    }

    if (i === points.length - 1) {
      path += ` L ${curr.x},${curr.y}`;
    }
  }

  return path;
}

/**
 * Calculate SVG path for area chart (line + fill to bottom)
 */
export function calculateAreaPath(
  points: { x: number; y: number }[],
  baselineY: number,
  smooth: boolean = true
): string {
  if (points.length === 0) return '';

  const linePath = calculateLinePath(points, smooth);

  // Add baseline closure
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  return `${linePath} L ${lastPoint.x},${baselineY} L ${firstPoint.x},${baselineY} Z`;
}

/**
 * Calculate position for tooltip to avoid overflow
 */
export function calculateTooltipPosition(
  mouseX: number,
  mouseY: number,
  tooltipWidth: number,
  tooltipHeight: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number; position: 'top' | 'bottom' | 'left' | 'right' } {
  const padding = 10;

  // Default to right and below
  let x = mouseX + padding;
  let y = mouseY + padding;
  let position: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

  // Check if tooltip would overflow right edge
  if (x + tooltipWidth > containerWidth) {
    x = mouseX - tooltipWidth - padding;
    position = 'left';
  }

  // Check if tooltip would overflow bottom edge
  if (y + tooltipHeight > containerHeight) {
    y = mouseY - tooltipHeight - padding;
    position = 'top';
  }

  // Ensure minimum position
  x = Math.max(padding, x);
  y = Math.max(padding, y);

  return { x, y, position };
}

/**
 * Get color from palette by index
 */
export function getColorByIndex(index: number): string {
  return CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length];
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Sort data points by timestamp
 */
export function sortByTimestamp(points: DataPoint[]): DataPoint[] {
  return [...points].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
}

/**
 * Group data points by month
 */
export function groupByMonth(points: DataPoint[]): DataPoint[] {
  const grouped = new Map<string, number>();

  points.forEach(point => {
    if (!point.timestamp) return;

    const date = new Date(point.timestamp);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    grouped.set(key, (grouped.get(key) ?? 0) + point.value);
  });

  return Array.from(grouped.entries()).map(([key, value]) => {
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);

    return {
      label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      value,
      timestamp: date.getTime(),
    };
  });
}

/**
 * Aggregate values from data points
 */
export function aggregateValues(points: DataPoint[], aggregation: 'sum' | 'avg' | 'max' | 'min'): number {
  if (points.length === 0) return 0;

  const values = points.map(p => p.value);

  switch (aggregation) {
    case 'sum':
      return values.reduce((sum, v) => sum + v, 0);
    case 'avg':
      return values.reduce((sum, v) => sum + v, 0) / values.length;
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
    default:
      return 0;
  }
}

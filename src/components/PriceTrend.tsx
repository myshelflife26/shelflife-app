import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PriceHistoryEntry } from '../types';

interface PriceTrendProps {
  priceHistory?: PriceHistoryEntry[];
  currentValue: number;
  size?: 'sm' | 'md' | 'lg';
}

function PriceTrend({ priceHistory, currentValue, size = 'md' }: PriceTrendProps) {
  if (!priceHistory || priceHistory.length < 2) {
    return null; // Not enough data to show trend
  }

  // Get the previous value (second to last entry)
  const previousValue = priceHistory[priceHistory.length - 2].value;
  const change = currentValue - previousValue;
  const percentChange = previousValue > 0 ? ((change / previousValue) * 100) : 0;

  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';

  if (change > 0) {
    return (
      <span className={`inline-flex items-center gap-1 text-green-600 dark:text-green-400 ${textSize}`} title={`Up $${change.toFixed(2)} (${percentChange.toFixed(1)}%)`}>
        <TrendingUp className={iconSize} />
        <span className="font-medium">+{percentChange.toFixed(0)}%</span>
      </span>
    );
  } else if (change < 0) {
    return (
      <span className={`inline-flex items-center gap-1 text-red-600 dark:text-red-400 ${textSize}`} title={`Down $${Math.abs(change).toFixed(2)} (${Math.abs(percentChange).toFixed(1)}%)`}>
        <TrendingDown className={iconSize} />
        <span className="font-medium">{percentChange.toFixed(0)}%</span>
      </span>
    );
  } else {
    return (
      <span className={`inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 ${textSize}`} title="No change">
        <Minus className={iconSize} />
        <span className="font-medium">0%</span>
      </span>
    );
  }
}


export default PriceTrend;
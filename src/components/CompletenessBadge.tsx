import { AccessoryService } from '../utils/accessoryService';
import { Check, AlertCircle, X, Package } from 'lucide-react';

interface CompletenessBadgeProps {
  percentage?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  condition?: string;
}

export function CompletenessBadge({
  percentage = 100,
  size = 'sm',
  showLabel = true,
  condition
}: CompletenessBadgeProps) {
  // Don't show for MIB condition
  if (condition === 'MIB') {
    return null;
  }

  const badge = AccessoryService.getCompletenessBadge(percentage);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const colorClasses = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
  };

  const IconComponent =
    badge.icon === 'check' ? Check :
    badge.icon === 'alert' ? AlertCircle :
    X;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold border
        ${sizeClasses[size]}
        ${colorClasses[badge.color]}
      `}
      title={`${percentage}% complete`}
    >
      <IconComponent className={iconSizes[size]} />
      {showLabel && (
        <span>{percentage}%</span>
      )}
    </div>
  );
}

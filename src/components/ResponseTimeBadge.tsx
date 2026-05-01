import { Clock } from 'lucide-react';
import { formatResponseTime, getResponseTimeRating } from '../utils/responseTime';

interface ResponseTimeBadgeProps {
  responseTimeHours: number | null;
  showLabel?: boolean;
}

export function ResponseTimeBadge({ responseTimeHours, showLabel = true }: ResponseTimeBadgeProps) {
  const rating = getResponseTimeRating(responseTimeHours);
  const formattedTime = formatResponseTime(responseTimeHours);

  const ratingColors = {
    fast: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    average: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    slow: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  };

  const ratingLabels = {
    fast: 'Fast responder',
    average: 'Usually responds',
    slow: 'Slow to respond',
    unknown: 'No response history'
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ratingColors[rating]}`}
      title={`Average response time: ${formattedTime}`}
    >
      <Clock className="h-3.5 w-3.5" />
      <span>
        {showLabel ? `Responds in ${formattedTime}` : formattedTime}
      </span>
    </div>
  );
}

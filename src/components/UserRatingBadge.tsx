import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { MarketplaceService } from '../utils/marketplaceService';

interface UserRatingBadgeProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

export function UserRatingBadge({ userId, size = 'sm', showCount = true }: UserRatingBadgeProps) {
  const [rating, setRating] = useState<{ average: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRating();
  }, [userId]);

  const loadRating = async () => {
    try {
      const ratings = await MarketplaceService.getUserRatings(userId);
      const stats = MarketplaceService.calculateRatingStats(ratings);
      setRating({
        average: stats.averageRating,
        count: stats.totalRatings
      });
    } catch (error) {
      console.error('Failed to load user rating:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!rating || rating.count === 0) {
    return null;
  }

  const starSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';

  return (
    <div className="flex items-center gap-1">
      <Star className={`${starSize} fill-yellow-400 text-yellow-400`} />
      <span className={`${textSize} font-medium text-gray-900 dark:text-white`}>
        {rating.average.toFixed(1)}
      </span>
      {showCount && (
        <span className={`${textSize} text-gray-500 dark:text-gray-400`}>
          ({rating.count})
        </span>
      )}
    </div>
  );
}

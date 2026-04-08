import { useState, useEffect } from 'react';
import type { UserRating } from '../types/index';
import { MarketplaceService } from '../utils/marketplaceService';
import { Star, ThumbsUp, Award } from 'lucide-react';

interface UserRatingsDisplayProps {
  userId: string;
  userName?: string;
  compact?: boolean; // Show just stars and count
}

export function UserRatingsDisplay({ userId, userName, compact = false }: UserRatingsDisplayProps) {
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [stats, setStats] = useState<{
    averageRating: number;
    totalRatings: number;
    ratingBreakdown: Record<number, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRatings();
  }, [userId]);

  const loadRatings = async () => {
    try {
      const userRatings = await MarketplaceService.getUserRatings(userId);
      setRatings(userRatings);
      const ratingStats = MarketplaceService.calculateRatingStats(userRatings);
      setStats(ratingStats);
    } catch (error) {
      console.error('Failed to load ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Loading ratings...
      </div>
    );
  }

  if (!stats || stats.totalRatings === 0) {
    return compact ? (
      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
        <Star className="h-4 w-4" />
        <span>No ratings yet</span>
      </div>
    ) : (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
        <Award className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400">No ratings yet</p>
      </div>
    );
  }

  // Compact view - just stars and count
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-4 w-4 ${
                star <= Math.round(stats.averageRating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {stats.averageRating.toFixed(1)}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({stats.totalRatings} {stats.totalRatings === 1 ? 'rating' : 'ratings'})
        </span>
      </div>
    );
  }

  // Full view - detailed breakdown
  return (
    <div className="space-y-4">
      {/* Overall Rating */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {userName ? `${userName}'s Rating` : 'User Rating'}
            </h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.averageRating.toFixed(1)}
              <span className="text-base font-normal text-gray-600 dark:text-gray-400 ml-2">
                / 5.0
              </span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Based on {stats.totalRatings} {stats.totalRatings === 1 ? 'review' : 'reviews'}
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-6 w-6 ${
                    star <= Math.round(stats.averageRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>
            {stats.averageRating >= 4.5 && (
              <div className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                <ThumbsUp className="h-4 w-4" />
                Highly Rated
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating Breakdown */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Rating Distribution
        </h4>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.ratingBreakdown[rating] || 0;
            const percentage = (count / stats.totalRatings) * 100;
            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {rating}
                  </span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Reviews */}
      {ratings.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Recent Reviews
          </h4>
          <div className="space-y-3">
            {ratings.slice(0, 5).map((rating) => (
              <div key={rating.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-3 last:pb-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">
                      {rating.fromUserName}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= rating.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(rating.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {rating.feedback}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

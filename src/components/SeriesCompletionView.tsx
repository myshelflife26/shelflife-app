import { useState, useEffect } from 'react';
import type { ActionFigure } from '../types';
import { SeriesCompletionService, type SeriesCompletion } from '../utils/seriesCompletion';
import { Check, Package } from 'lucide-react';

interface SeriesCompletionViewProps {
  userFigures: ActionFigure[];
}

export function SeriesCompletionView({ userFigures }: SeriesCompletionViewProps) {
  const [completions, setCompletions] = useState<SeriesCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadCompletions();
  }, [userFigures]);

  const loadCompletions = async () => {
    setLoading(true);
    try {
      const results = await SeriesCompletionService.calculateSeriesCompletion(userFigures);
      // Only show series where user owns at least one figure
      const filtered = results.filter(r => r.owned > 0);
      setCompletions(filtered);
    } catch (error) {
      console.error('Failed to load series completion:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">Calculating series completion...</p>
      </div>
    );
  }

  if (completions.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400">No series data available</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Series completion requires figures to be in the master database
        </p>
      </div>
    );
  }

  const displayedCompletions = showAll ? completions : completions.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Series Completion
        </h3>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Tracking {completions.length} series
        </span>
      </div>

      <div className="space-y-3">
        {displayedCompletions.map((completion) => {
          const isComplete = completion.completionPercent === 100;

          return (
            <div
              key={`${completion.series}-${completion.productLine}`}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {completion.series}
                    </h4>
                    {isComplete && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  {completion.productLine && completion.productLine !== 'N/A' && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {completion.productLine}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {completion.completionPercent.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {completion.owned}/{completion.totalInSeries}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    isComplete
                      ? 'bg-green-600'
                      : completion.completionPercent >= 75
                      ? 'bg-blue-600'
                      : completion.completionPercent >= 50
                      ? 'bg-yellow-600'
                      : 'bg-gray-400'
                  }`}
                  style={{ width: `${completion.completionPercent}%` }}
                ></div>
              </div>

              {/* Missing count */}
              {!isComplete && completion.missingCount > 0 && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {completion.missingCount} figure{completion.missingCount !== 1 ? 's' : ''} remaining
                </div>
              )}
            </div>
          );
        })}
      </div>

      {completions.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline py-2"
        >
          {showAll ? 'Show Less' : `Show All (${completions.length - 10} more)`}
        </button>
      )}
    </div>
  );
}

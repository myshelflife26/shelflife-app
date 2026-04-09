import { useMemo, useState } from 'react';
import type { ActionFigure, SetCompletion } from '../../types/index';
import { SeriesSetsService } from '../../utils/seriesSets';
import { AuthService } from '../../utils/auth';
import { CheckCircle, Circle, ChevronDown, ChevronUp, Target, Plus, Filter } from 'lucide-react';
import { Select } from '../ui/select';
import { SeriesCompletionView } from '../SeriesCompletionView';

interface CompletenessTabProps {
  figures: ActionFigure[];
}

export function CompletenessTab({ figures }: CompletenessTabProps) {
  const currentUser = AuthService.getCurrentUser();
  const [expandedSetIds, setExpandedSetIds] = useState<Set<string>>(new Set());
  const [seriesFilter, setSeriesFilter] = useState<string>('all');
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('all');
  const [showCompleteOnly, setShowCompleteOnly] = useState(false);

  const completionData = useMemo(() => {
    if (!currentUser) return [];
    return SeriesSetsService.getCompletionData(currentUser.id, figures);
  }, [figures, currentUser]);

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = completionData;

    if (seriesFilter !== 'all') {
      filtered = filtered.filter(c => c.set.series === seriesFilter);
    }

    if (manufacturerFilter !== 'all') {
      filtered = filtered.filter(c => c.set.manufacturer === manufacturerFilter);
    }

    if (showCompleteOnly) {
      filtered = filtered.filter(c => c.completionPercentage === 100);
    }

    // Sort by completion percentage (descending)
    return filtered.sort((a, b) => b.completionPercentage - a.completionPercentage);
  }, [completionData, seriesFilter, manufacturerFilter, showCompleteOnly]);

  // Filter options
  const { allSeries, allManufacturers } = useMemo(() => {
    if (!currentUser) return { allSeries: [], allManufacturers: [] };

    return {
      allSeries: SeriesSetsService.getAllSeries(currentUser.id),
      allManufacturers: SeriesSetsService.getAllManufacturers(currentUser.id),
    };
  }, [currentUser]);

  const toggleExpanded = (setId: string) => {
    setExpandedSetIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(setId)) {
        newSet.delete(setId);
      } else {
        newSet.add(setId);
      }
      return newSet;
    });
  };

  const completedSetsCount = completionData.filter(c => c.completionPercentage === 100).length;
  const totalSetsCount = completionData.length;

  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Login to track collection completeness
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Series Completion (from Master Database) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <SeriesCompletionView userFigures={figures} />
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Set Completeness
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {completedSetsCount} of {totalSetsCount} sets completed
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {completedSetsCount}
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Complete Sets</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Series
            </label>
            <Select
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Series</option>
              {allSeries.map(series => (
                <option key={series} value={series}>
                  {series}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Manufacturer
            </label>
            <Select
              value={manufacturerFilter}
              onChange={(e) => setManufacturerFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Manufacturers</option>
              {allManufacturers.map(mfg => (
                <option key={mfg} value={mfg}>
                  {mfg}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleteOnly}
                onChange={(e) => setShowCompleteOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Show complete only
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Sets */}
      {filteredData.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No sets found matching your filters
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredData.map((completion) => {
            const isExpanded = expandedSetIds.has(completion.set.id);
            const isComplete = completion.completionPercentage === 100;

            return (
              <div
                key={completion.set.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border-2 transition-colors ${
                  isComplete
                    ? 'border-green-500 dark:border-green-600'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Set Header */}
                <button
                  onClick={() => toggleExpanded(completion.set.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div>
                      {isComplete ? (
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {completion.set.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>{completion.set.series}</span>
                        {completion.set.manufacturer && (
                          <>
                            <span>•</span>
                            <span>{completion.set.manufacturer}</span>
                          </>
                        )}
                        {completion.set.releaseYear && (
                          <>
                            <span>•</span>
                            <span>{completion.set.releaseYear}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        isComplete
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {completion.completionPercentage.toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {completion.ownedCount} / {completion.set.totalCount}
                      </div>
                    </div>
                    <div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Progress Bar */}
                <div className="px-4 pb-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isComplete
                          ? 'bg-green-600 dark:bg-green-500'
                          : 'bg-blue-600 dark:bg-blue-500'
                      }`}
                      style={{ width: `${completion.completionPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Owned Figures */}
                      {completion.ownedFigures.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            Owned ({completion.ownedFigures.length})
                          </h4>
                          <ul className="space-y-2">
                            {completion.ownedFigures.map((figureName, index) => (
                              <li
                                key={index}
                                className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
                              >
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                                {figureName}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Missing Figures */}
                      {completion.missingFigures.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                            <Circle className="w-4 h-4 text-gray-400" />
                            Missing ({completion.missingFigures.length})
                          </h4>
                          <ul className="space-y-2">
                            {completion.missingFigures.map((figureName, index) => (
                              <li
                                key={index}
                                className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2"
                              >
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />
                                {figureName}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Set Note */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Want to track custom sets?
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Custom set creation feature coming soon! You'll be able to create and track your own custom series and sets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

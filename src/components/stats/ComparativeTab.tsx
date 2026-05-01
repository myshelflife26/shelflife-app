import { useState, useEffect, useRef } from 'react';
import type { ActionFigure } from '../../types/index';
import { ComparativeAnalyticsService, type ComparativeStats, type SeriesComparison } from '../../utils/comparativeAnalytics';
import { AuthService } from '../../utils/auth';
import { TrendingUp, TrendingDown, Minus, Trophy, Target, BarChart3, Users, Award } from 'lucide-react';

interface ComparativeTabProps {
  figures: ActionFigure[];
}

export function ComparativeTab({ figures }: ComparativeTabProps) {
  const currentUser = AuthService.getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ComparativeStats | null>(null);
  const [seriesComparisons, setSeriesComparisons] = useState<SeriesComparison[]>([]);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const figuresLengthRef = useRef(figures.length);

  useEffect(() => {
    const loadComparativeData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Prevent multiple simultaneous loads
      if (loadingRef.current) {
        return;
      }

      // Only reload if figures count changed
      if (figuresLengthRef.current === figures.length && stats !== null) {
        return;
      }

      try {
        loadingRef.current = true;
        setLoading(true);
        setError(null);
        figuresLengthRef.current = figures.length;

        const [comparativeStats, seriesData] = await Promise.all([
          ComparativeAnalyticsService.getComparativeStats(figures, currentUser.id),
          ComparativeAnalyticsService.getSeriesComparisons(figures, currentUser.id),
        ]);

        setStats(comparativeStats);
        setSeriesComparisons(seriesData);
      } catch (err) {
        console.error('Failed to load comparative analytics:', err);
        setError('Failed to load comparison data');
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };

    loadComparativeData();
  }, [figures.length, currentUser?.id]);

  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Login to compare your collection with other collectors
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Calculating comparisons...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const renderTrendIcon = (value: number) => {
    if (value > 5) {
      return <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />;
    } else if (value < -5) {
      return <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />;
    } else {
      return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const renderComparisonColor = (value: number) => {
    if (value > 5) {
      return 'text-green-600 dark:text-green-400';
    } else if (value < -5) {
      return 'text-red-600 dark:text-red-400';
    } else {
      return 'text-gray-600 dark:text-gray-400';
    }
  };

  const marketBenchmarks = ComparativeAnalyticsService.getMarketBenchmarks(
    stats.userBenchmark,
    stats.globalBenchmark
  );

  return (
    <div className="space-y-6">
      {/* Overall Rankings */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Your Rankings
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Value Rank */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Collection Value
              </span>
              <Award className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                #{stats.rankings.valueRank}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                of {stats.rankings.totalCollectors}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              {stats.percentileRanks.value.toFixed(0)}th percentile
            </div>
          </div>

          {/* Count Rank */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Collection Size
              </span>
              <BarChart3 className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                #{stats.rankings.countRank}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                of {stats.rankings.totalCollectors}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              {stats.percentileRanks.count.toFixed(0)}th percentile
            </div>
          </div>

          {/* Avg Value Rank */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Figure Value
              </span>
              <Target className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                #{stats.rankings.avgValueRank}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                of {stats.rankings.totalCollectors}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              {stats.percentileRanks.avgValue.toFixed(0)}th percentile
            </div>
          </div>
        </div>
      </div>

      {/* Comparison vs Average Collector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            vs. Average Collector
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Value Comparison */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Value
              </span>
              {renderTrendIcon(stats.comparisons.valueVsAverage)}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              ${stats.userBenchmark.totalValue.toFixed(2)}
            </div>
            <div className={`text-sm font-semibold ${renderComparisonColor(stats.comparisons.valueVsAverage)}`}>
              {stats.comparisons.valueVsAverage > 0 ? '+' : ''}
              {stats.comparisons.valueVsAverage.toFixed(1)}% vs avg
            </div>
          </div>

          {/* Collection Size Comparison */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Collection Size
              </span>
              {renderTrendIcon(stats.comparisons.countVsAverage)}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {stats.userBenchmark.totalCount} figures
            </div>
            <div className={`text-sm font-semibold ${renderComparisonColor(stats.comparisons.countVsAverage)}`}>
              {stats.comparisons.countVsAverage > 0 ? '+' : ''}
              {stats.comparisons.countVsAverage.toFixed(1)}% vs avg
            </div>
          </div>

          {/* Avg Value Comparison */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Figure Value
              </span>
              {renderTrendIcon(stats.comparisons.avgValueVsAverage)}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              ${stats.userBenchmark.averageValue.toFixed(2)}
            </div>
            <div className={`text-sm font-semibold ${renderComparisonColor(stats.comparisons.avgValueVsAverage)}`}>
              {stats.comparisons.avgValueVsAverage > 0 ? '+' : ''}
              {stats.comparisons.avgValueVsAverage.toFixed(1)}% vs avg
            </div>
          </div>
        </div>
      </div>

      {/* Market Benchmarks Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Market Benchmarks
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Metric
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Your Collection
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Market Average
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Difference
                </th>
              </tr>
            </thead>
            <tbody>
              {marketBenchmarks.map((benchmark, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                    {benchmark.label}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                    {benchmark.userValue}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">
                    {benchmark.marketValue}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                    {benchmark.comparison}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Series Comparisons */}
      {seriesComparisons.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Series Comparisons
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            See how your collection compares to other collectors in each series
          </p>

          <div className="space-y-4">
            {seriesComparisons.slice(0, 10).map((series) => (
              <div
                key={series.seriesName}
                className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {series.seriesName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Rank #{series.rank} of {series.totalCollectorsWithSeries} collectors
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {series.userCount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">figures</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Completeness Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>Completeness</span>
                      <span className="font-semibold">{series.userCompleteness.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${series.userCompleteness}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Your Count</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {series.userCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Avg Count</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {series.avgCollectorCount.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Top Count</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {series.topCollectorCount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {seriesComparisons.length > 10 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
              Showing top 10 series • You have {seriesComparisons.length} total series
            </p>
          )}
        </div>
      )}

      {/* Info Footer */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Comparisons are calculated from {stats.rankings.totalCollectors} public
          collectors with shared collections. Rankings and percentiles update as collections change.
        </p>
      </div>
    </div>
  );
}

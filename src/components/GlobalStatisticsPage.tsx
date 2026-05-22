import { useState, useEffect } from 'react';
import { GlobalStatisticsService, type GlobalStats } from '../utils/globalStatistics';
import { Users, Package, DollarSign, TrendingUp, Award, Sparkles } from 'lucide-react';

function GlobalStatisticsPage() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const data = await GlobalStatisticsService.getGlobalStatistics();
      setStats(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Failed to load statistics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Global Statistics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Community-wide collection insights</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Collectors</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Figures</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalFigures.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Collection</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgCollectionSize.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Collected Figures */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-6 w-6 text-yellow-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Most Collected</h2>
          </div>
          <div className="space-y-3">
            {stats.mostCollectedFigures.slice(0, 5).map((fig, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{fig.figureName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {fig.productLine || <span className="italic">No Product Line</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">{fig.count}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">collectors</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Figures */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Trending</h2>
          </div>
          <div className="space-y-3">
            {stats.trendingFigures.slice(0, 5).map((fig, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{fig.figureName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {fig.productLine || <span className="italic">No Product Line</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">{fig.count}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">recently added</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rarest Figures */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Rarest Figures</h2>
          </div>
          <div className="space-y-3">
            {stats.rarestFigures.slice(0, 5).map((fig, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{fig.figureName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {fig.productLine || <span className="italic">No Product Line</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-purple-600 dark:text-purple-400">{fig.count}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">owner{fig.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Product Lines */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Top Product Lines</h2>
          </div>
          <div className="space-y-3">
            {stats.topProductLines.slice(0, 5).map((productLine, index) => (
              <div key={index} className="flex items-center justify-between">
                <p className="font-medium text-gray-900 dark:text-white flex-1">
                  {productLine.productLine || <span className="text-gray-500 dark:text-gray-400 italic">No Product Line</span>}
                </p>
                <p className="font-bold text-gray-900 dark:text-white">{productLine.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


export default GlobalStatisticsPage;
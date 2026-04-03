import type { ActionFigure } from '../types/index';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { BarChart3, Package, TrendingUp, DollarSign, CheckCircle, XCircle } from 'lucide-react';

interface CollectionStatsReportProps {
  open: boolean;
  onClose: () => void;
  figures: ActionFigure[];
  masterFigures: any[];
}

export function CollectionStatsReport({
  open,
  onClose,
  figures,
  masterFigures
}: CollectionStatsReportProps) {
  // Calculate total figures
  const totalOwned = figures.length;
  const totalKnown = masterFigures.length;
  const collectionPercentage = totalKnown > 0 ? Math.round((totalOwned / totalKnown) * 100) : 100;

  // Calculate total value
  const totalValue = figures.reduce((sum, f) => sum + (f.currentValue || 0), 0);
  const averageValue = totalOwned > 0 ? totalValue / totalOwned : 0;

  // Condition breakdown
  const conditionBreakdown = figures.reduce((acc, f) => {
    const condition = f.condition || 'Unknown';
    acc[condition] = (acc[condition] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Manufacturer breakdown
  const manufacturerBreakdown = figures.reduce((acc, f) => {
    const manufacturer = f.manufacturer || 'Unknown';
    acc[manufacturer] = (acc[manufacturer] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topManufacturers = Object.entries(manufacturerBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Product Line breakdown with master data
  const productLineStats = (() => {
    // Group user's figures by productLine + subProductLine
    const userLineGroups = figures.reduce((acc, figure) => {
      const productLine = figure.productLine || 'Unknown';
      const subLine = figure.subProductLine;
      const key = subLine ? `${productLine} - ${subLine}` : productLine;

      if (!acc[key]) {
        acc[key] = { owned: 0, productLine, subProductLine: subLine };
      }
      acc[key].owned++;
      return acc;
    }, {} as Record<string, { owned: number; productLine: string; subProductLine?: string }>);

    // Count total figures in master database for each group
    const lineStats = Object.entries(userLineGroups).map(([key, data]) => {
      const totalInMaster = masterFigures.filter(mf => {
        const matchesProductLine = (mf.productLine || 'Unknown') === data.productLine;
        const matchesSubLine = data.subProductLine
          ? mf.subProductLine === data.subProductLine
          : !mf.subProductLine;
        return matchesProductLine && matchesSubLine;
      }).length;

      const percentage = totalInMaster > 0 ? Math.round((data.owned / totalInMaster) * 100) : 100;

      return {
        key,
        label: key,
        owned: data.owned,
        total: totalInMaster > 0 ? totalInMaster : data.owned,
        percentage
      };
    }).sort((a, b) => b.owned - a.owned);

    return lineStats;
  })();

  // Completeness stats (for accessories)
  const completenessStats = (() => {
    const withAccessories = figures.filter(f =>
      f.condition !== 'MIB' && f.accessories && f.accessories.length > 0
    );

    const complete = withAccessories.filter(f => (f.completenessPercentage || 0) === 100).length;
    const incomplete = withAccessories.filter(f => (f.completenessPercentage || 0) < 100).length;

    return {
      total: withAccessories.length,
      complete,
      incomplete,
      percentage: withAccessories.length > 0 ? Math.round((complete / withAccessories.length) * 100) : 0
    };
  })();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Collection Statistics
          </DialogTitle>
          <DialogDescription>
            Comprehensive overview of your action figure collection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Figures */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-600 dark:bg-blue-500 text-white rounded-lg p-2">
                  <Package className="h-5 w-5" />
                </div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Total Figures
                </div>
              </div>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {totalOwned}
                {totalKnown > 0 && (
                  <span className="text-lg text-blue-600 dark:text-blue-400">
                    /{totalKnown}
                  </span>
                )}
              </div>
              {totalKnown > 0 && (
                <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {collectionPercentage}% of known figures
                </div>
              )}
            </div>

            {/* Total Value */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-600 dark:bg-green-500 text-white rounded-lg p-2">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div className="text-sm font-medium text-green-900 dark:text-green-200">
                  Total Value
                </div>
              </div>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                ${totalValue.toLocaleString()}
              </div>
              <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                Avg: ${averageValue.toFixed(2)} per figure
              </div>
            </div>

            {/* Completeness */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-600 dark:bg-purple-500 text-white rounded-lg p-2">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="text-sm font-medium text-purple-900 dark:text-purple-200">
                  Completeness
                </div>
              </div>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {completenessStats.complete}
                <span className="text-lg text-purple-600 dark:text-purple-400">
                  /{completenessStats.total}
                </span>
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                {completenessStats.percentage}% complete with accessories
              </div>
            </div>
          </div>

          {/* Product Line Breakdown */}
          {productLineStats.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                By Product Line
              </h3>
              <div className="space-y-3">
                {productLineStats.map((stat) => (
                  <div key={stat.key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {stat.label}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {stat.owned}/{stat.total}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {stat.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          stat.percentage === 100
                            ? 'bg-green-600'
                            : stat.percentage >= 75
                            ? 'bg-blue-600'
                            : stat.percentage >= 50
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Condition Breakdown */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                By Condition
              </h3>
              <div className="space-y-2">
                {Object.entries(conditionBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([condition, count]) => {
                    const percentage = Math.round((count / totalOwned) * 100);
                    return (
                      <div key={condition} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              condition === 'MIB'
                                ? 'bg-green-500'
                                : condition === 'Loose'
                                ? 'bg-yellow-500'
                                : 'bg-blue-500'
                            }`}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {condition}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {count}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({percentage}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Top Manufacturers */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Manufacturers
              </h3>
              <div className="space-y-2">
                {topManufacturers.map(([manufacturer, count], index) => {
                  const percentage = Math.round((count / totalOwned) * 100);
                  return (
                    <div key={manufacturer} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {manufacturer}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {count}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({percentage}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Completeness Details */}
          {completenessStats.total > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Accessory Completeness
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  <div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {completenessStats.complete}
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-300">
                      Complete (100%)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  <div>
                    <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                      {completenessStats.incomplete}
                    </div>
                    <div className="text-xs text-red-700 dark:text-red-300">
                      Incomplete (&lt;100%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

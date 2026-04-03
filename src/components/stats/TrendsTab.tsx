import { useMemo } from 'react';
import type { ActionFigure } from '../../types/index';
import { LineChart } from '../charts/LineChart';
import { AreaChart } from '../charts/AreaChart';
import { PieChart, type PieChartData } from '../charts/PieChart';
import { ValueTrackingService } from '../../utils/valueTracking';
import { JealousyTrackingService } from '../../utils/jealousyTracking';
import { AuthService } from '../../utils/auth';
import { Storage } from '../../utils/storage';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/chartHelpers';

interface TrendsTabProps {
  figures: ActionFigure[];
}

export function TrendsTab({ figures }: TrendsTabProps) {
  const currentUser = AuthService.getCurrentUser();

  // Value trend data
  const valueTrendData = useMemo(() => {
    if (!currentUser) return [];
    return ValueTrackingService.getChartData(currentUser.id).map(snapshot => ({
      timestamp: snapshot.timestamp,
      value: snapshot.totalValue,
    }));
  }, [currentUser]);

  const hasValueData = valueTrendData.length >= 2;

  // Acquisition timeline data
  const acquisitionData = useMemo(() => {
    // Group by month from purchaseDate
    const monthCounts = new Map<string, number>();

    figures.forEach(figure => {
      if (!figure.purchaseDate) return;

      try {
        const date = new Date(figure.purchaseDate);
        if (isNaN(date.getTime())) return;

        // Use first day of month as key
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
      } catch (e) {
        // Skip invalid dates
      }
    });

    // Convert to cumulative data
    const sortedMonths = Array.from(monthCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    let cumulative = 0;
    return sortedMonths.map(([monthKey, count]) => {
      cumulative += count;
      return {
        timestamp: new Date(monthKey).getTime(),
        value: cumulative,
      };
    });
  }, [figures]);

  // Distribution data
  const distributionData = useMemo(() => {
    // Value by category
    const valueByCategory = figures.reduce((acc, f) => {
      const cat = f.category || 'Unknown';
      acc[cat] = (acc[cat] || 0) + f.currentValue;
      return acc;
    }, {} as Record<string, number>);

    const categoryData: PieChartData[] = Object.entries(valueByCategory)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    // Value by manufacturer
    const valueByManufacturer = figures.reduce((acc, f) => {
      const mfg = f.manufacturer || 'Unknown';
      acc[mfg] = (acc[mfg] || 0) + f.currentValue;
      return acc;
    }, {} as Record<string, number>);

    const manufacturerData: PieChartData[] = Object.entries(valueByManufacturer)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    // Count by condition
    const countByCondition = figures.reduce((acc, f) => {
      acc[f.condition] = (acc[f.condition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const conditionData: PieChartData[] = Object.entries(countByCondition)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    return {
      categoryData,
      manufacturerData,
      conditionData,
    };
  }, [figures]);

  // Rising Stars data
  const risingStarsData = useMemo(() => {
    if (!currentUser) return [];

    const publicFigures = figures
      .filter(f => f.isPublic || currentUser.collectionPublic)
      .map(f => ({ id: f.id, userId: f.userId || currentUser.id }));

    const risingStars = JealousyTrackingService.getRisingStars(publicFigures, 10);

    return risingStars.map(star => {
      const figure = figures.find(f => f.id === star.figureId);
      return {
        ...star,
        figure,
      };
    });
  }, [figures, currentUser]);

  // Most valuable by category
  const mostValuableByCategory = useMemo(() => {
    const byCategory = figures.reduce((acc, f) => {
      const cat = f.category || 'Unknown';
      if (!acc[cat] || f.currentValue > acc[cat].currentValue) {
        acc[cat] = f;
      }
      return acc;
    }, {} as Record<string, ActionFigure>);

    return Object.entries(byCategory)
      .sort(([, a], [, b]) => b.currentValue - a.currentValue)
      .slice(0, 5);
  }, [figures]);

  // Most valuable by manufacturer
  const mostValuableByManufacturer = useMemo(() => {
    const byManufacturer = figures.reduce((acc, f) => {
      const mfg = f.manufacturer || 'Unknown';
      if (!acc[mfg] || f.currentValue > acc[mfg].currentValue) {
        acc[mfg] = f;
      }
      return acc;
    }, {} as Record<string, ActionFigure>);

    return Object.entries(byManufacturer)
      .sort(([, a], [, b]) => b.currentValue - a.currentValue)
      .slice(0, 5);
  }, [figures]);

  return (
    <div className="space-y-6">
      {/* Value Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Collection Value Trend
          </h3>
        </div>

        {hasValueData ? (
          <LineChart
            data={valueTrendData}
            xAxisLabel="Date"
            yAxisLabel="Total Value"
            width={800}
            height={300}
            formatValue={formatCurrency}
          />
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Not enough data yet
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Value tracking records snapshots daily. Check back tomorrow to see your first trend!
            </p>
          </div>
        )}
      </div>

      {/* Acquisition Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Acquisition Timeline
          </h3>
        </div>

        {acquisitionData.length > 0 ? (
          <AreaChart
            data={acquisitionData}
            xAxisLabel="Date"
            yAxisLabel="Cumulative Figures"
            width={800}
            height={300}
            formatValue={(v) => v.toFixed(0)}
          />
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Add purchase dates to your figures to see acquisition trends
            </p>
          </div>
        )}
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PieChart
          data={distributionData.categoryData}
          title="Value by Category"
          width={350}
          height={350}
          showLegend={true}
        />

        <PieChart
          data={distributionData.manufacturerData}
          title="Value by Manufacturer"
          width={350}
          height={350}
          showLegend={true}
        />

        <PieChart
          data={distributionData.conditionData}
          title="Count by Condition"
          width={350}
          height={350}
          showLegend={true}
        />
      </div>

      {/* Rising Stars */}
      {risingStarsData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Rising Stars
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              (Biggest jealousy score increases)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 font-medium">Rank</th>
                  <th className="pb-2 font-medium">Figure</th>
                  <th className="pb-2 font-medium text-right">Previous Score</th>
                  <th className="pb-2 font-medium text-right">Current Score</th>
                  <th className="pb-2 font-medium text-right">Increase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {risingStarsData.map((star, index) => (
                  <tr key={star.figureId} className="text-sm">
                    <td className="py-3 text-gray-900 dark:text-gray-100 font-medium">
                      #{index + 1}
                    </td>
                    <td className="py-3 text-gray-900 dark:text-gray-100">
                      {star.figure?.name || 'Unknown'}
                    </td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                      {star.previousScore}
                    </td>
                    <td className="py-3 text-right text-gray-900 dark:text-gray-100 font-medium">
                      {star.currentScore}
                    </td>
                    <td className="py-3 text-right text-green-600 dark:text-green-400 font-semibold">
                      +{star.increase}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Most Valuable by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Most Valuable by Category
          </h3>
          <div className="space-y-3">
            {mostValuableByCategory.map(([category, figure]) => (
              <div
                key={category}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {category}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {figure.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(figure.currentValue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Most Valuable by Manufacturer
          </h3>
          <div className="space-y-3">
            {mostValuableByManufacturer.map(([manufacturer, figure]) => (
              <div
                key={manufacturer}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {manufacturer}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {figure.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(figure.currentValue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

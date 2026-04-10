import { useMemo } from 'react';
import type { ActionFigure } from '../types/index';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, DollarSign, Package } from 'lucide-react';

interface CollectionGrowthPageProps {
  figures: ActionFigure[];
}

interface DataPoint {
  date: string;
  count: number;
  value: number;
}

interface MonthlyData {
  month: string;
  added: number;
}

export function CollectionGrowthPage({ figures }: CollectionGrowthPageProps) {
  // Calculate cumulative growth data
  const growthData = useMemo(() => {
    if (figures.length === 0) return [];

    // Sort figures by purchase date
    const sortedFigures = [...figures].sort((a, b) =>
      a.purchaseDate.localeCompare(b.purchaseDate)
    );

    const data: DataPoint[] = [];
    let cumulativeValue = 0;

    sortedFigures.forEach((figure, index) => {
      cumulativeValue += figure.currentValue;

      data.push({
        date: new Date(figure.purchaseDate).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        }),
        count: index + 1,
        value: parseFloat(cumulativeValue.toFixed(2)),
      });
    });

    // Deduplicate by date, keeping the last entry for each date
    const uniqueData: DataPoint[] = [];
    const dateMap = new Map<string, DataPoint>();

    data.forEach(point => {
      dateMap.set(point.date, point);
    });

    dateMap.forEach(point => uniqueData.push(point));

    return uniqueData;
  }, [figures]);

  // Calculate monthly additions
  const monthlyAdditions = useMemo(() => {
    const monthMap = new Map<string, number>();

    figures.forEach(figure => {
      const monthKey = new Date(figure.purchaseDate).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      });
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
    });

    const data: MonthlyData[] = [];
    monthMap.forEach((count, month) => {
      data.push({ month, added: count });
    });

    // Sort by date
    data.sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });

    return data;
  }, [figures]);

  // Calculate stats
  const stats = useMemo(() => {
    if (figures.length === 0) {
      return {
        totalFigures: 0,
        totalValue: 0,
        averageValue: 0,
        oldestDate: 'N/A',
        newestDate: 'N/A',
      };
    }

    const totalValue = figures.reduce((sum, fig) => sum + fig.currentValue, 0);
    const sortedByDate = [...figures].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));

    return {
      totalFigures: figures.length,
      totalValue: parseFloat(totalValue.toFixed(2)),
      averageValue: parseFloat((totalValue / figures.length).toFixed(2)),
      oldestDate: new Date(sortedByDate[0].purchaseDate).toLocaleDateString(),
      newestDate: new Date(sortedByDate[sortedByDate.length - 1].purchaseDate).toLocaleDateString(),
    };
  }, [figures]);

  if (figures.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Add figures to your collection to see growth statistics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Collection Growth
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Track how your collection has grown over time
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Figures</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalFigures}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            From {stats.oldestDate} to {stats.newestDate}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Value</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ${stats.totalValue.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Avg: ${stats.averageValue.toLocaleString()} per figure
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Growth Rate</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {monthlyAdditions.length > 0
              ? (stats.totalFigures / monthlyAdditions.length).toFixed(1)
              : '0'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Figures per month (avg)
          </p>
        </div>
      </div>

      {/* Collection Count Growth Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Collection Size Over Time
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={growthData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'currentColor', className: 'text-gray-600 dark:text-gray-400' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'currentColor', className: 'text-gray-600 dark:text-gray-400' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg, white)',
                border: '1px solid var(--tooltip-border, #e5e7eb)',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Total Figures"
              dot={{ fill: '#3b82f6', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Collection Value Growth Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Collection Value Over Time
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={growthData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'currentColor', className: 'text-gray-600 dark:text-gray-400' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'currentColor', className: 'text-gray-600 dark:text-gray-400' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg, white)',
                border: '1px solid var(--tooltip-border, #e5e7eb)',
                borderRadius: '0.5rem',
              }}
              formatter={(value: number) => `$${value.toLocaleString()}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={2}
              name="Total Value ($)"
              dot={{ fill: '#10b981', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Additions Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Figures Added Per Month
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyAdditions}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
            <XAxis
              dataKey="month"
              className="text-xs"
              tick={{ fill: 'currentColor', className: 'text-gray-600 dark:text-gray-400' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'currentColor', className: 'text-gray-600 dark:text-gray-400' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg, white)',
                border: '1px solid var(--tooltip-border, #e5e7eb)',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Bar dataKey="added" fill="#8b5cf6" name="Figures Added" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

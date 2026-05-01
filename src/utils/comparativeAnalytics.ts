/**
 * Comparative Analytics Service
 * Calculates collection benchmarks and comparisons against other collectors
 */

import type { ActionFigure } from '../types/index';
import { FirebaseStorage } from './firebaseStorage';
import { FirebaseAuthService } from './firebaseAuth';

export interface CollectionBenchmark {
  totalValue: number;
  totalCount: number;
  averageValue: number;
  medianValue: number;
  mostCommonManufacturer: string;
  mostCommonCategory: string;
  mibPercentage: number;
  nibbPercentage: number;
  loosePercentage: number;
}

export interface ComparativeStats {
  userBenchmark: CollectionBenchmark;
  globalBenchmark: CollectionBenchmark;
  percentileRanks: {
    value: number; // Percentile for total collection value (0-100)
    count: number; // Percentile for collection size
    avgValue: number; // Percentile for average figure value
  };
  comparisons: {
    valueVsAverage: number; // % difference from average collector
    countVsAverage: number;
    avgValueVsAverage: number;
  };
  rankings: {
    valueRank: number; // Rank by total value (1 = highest)
    countRank: number; // Rank by collection size
    avgValueRank: number; // Rank by average value
    totalCollectors: number;
  };
}

export interface SeriesComparison {
  seriesName: string;
  userCount: number;
  userCompleteness: number; // 0-100%
  avgCollectorCount: number;
  topCollectorCount: number;
  totalCollectorsWithSeries: number;
  rank: number; // User's rank for this series
}

export class ComparativeAnalyticsService {
  /**
   * Calculate benchmark statistics for a collection
   */
  static calculateBenchmark(figures: ActionFigure[]): CollectionBenchmark {
    if (figures.length === 0) {
      return {
        totalValue: 0,
        totalCount: 0,
        averageValue: 0,
        medianValue: 0,
        mostCommonManufacturer: 'N/A',
        mostCommonCategory: 'N/A',
        mibPercentage: 0,
        nibbPercentage: 0,
        loosePercentage: 0,
      };
    }

    const totalValue = figures.reduce((sum, f) => sum + f.currentValue, 0);
    const totalCount = figures.length;
    const averageValue = totalValue / totalCount;

    // Calculate median value
    const sortedValues = [...figures].map(f => f.currentValue).sort((a, b) => a - b);
    const mid = Math.floor(sortedValues.length / 2);
    const medianValue = sortedValues.length % 2 === 0
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
      : sortedValues[mid];

    // Find most common manufacturer
    const manufacturerCounts = figures.reduce((acc, f) => {
      const mfg = f.manufacturer || 'Unknown';
      acc[mfg] = (acc[mfg] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostCommonManufacturer = Object.entries(manufacturerCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    // Find most common category
    const categoryCounts = figures.reduce((acc, f) => {
      const cat = f.category || 'Unknown';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostCommonCategory = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    // Calculate condition percentages
    const conditionCounts = figures.reduce((acc, f) => {
      acc[f.condition] = (acc[f.condition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mibPercentage = ((conditionCounts['MIB'] || 0) / totalCount) * 100;
    const nibbPercentage = ((conditionCounts['NRFB'] || 0) / totalCount) * 100;
    const loosePercentage = ((conditionCounts['Loose'] || 0) / totalCount) * 100;

    return {
      totalValue,
      totalCount,
      averageValue,
      medianValue,
      mostCommonManufacturer,
      mostCommonCategory,
      mibPercentage,
      nibbPercentage,
      loosePercentage,
    };
  }

  /**
   * Get all public collectors' figures for comparison
   */
  static async getAllPublicFigures(): Promise<Map<string, ActionFigure[]>> {
    const allUsers = await FirebaseAuthService.getAllUsers();
    const publicUsers = allUsers.filter(u => u.collectionPublic);

    const figuresByUser = new Map<string, ActionFigure[]>();

    for (const user of publicUsers) {
      try {
        const userFigures = await FirebaseStorage.getPublicFiguresByUser(user.id);
        if (userFigures.length > 0) {
          figuresByUser.set(user.id, userFigures);
        }
      } catch (error) {
        console.error(`Failed to load figures for user ${user.id}:`, error);
        // Continue with other users even if one fails
      }
    }

    return figuresByUser;
  }

  /**
   * Calculate comprehensive comparative statistics
   */
  static async getComparativeStats(
    userFigures: ActionFigure[],
    userId: string
  ): Promise<ComparativeStats> {
    const userBenchmark = this.calculateBenchmark(userFigures);

    // Get all public figures for comparison
    const figuresByUser = await this.getAllPublicFigures();

    // Calculate global benchmark (all public collectors combined)
    const allPublicFigures = Array.from(figuresByUser.values()).flat();
    const globalBenchmark = this.calculateBenchmark(allPublicFigures);

    // Calculate benchmarks for each collector
    const collectorBenchmarks = Array.from(figuresByUser.entries())
      .map(([uid, figures]) => ({
        userId: uid,
        benchmark: this.calculateBenchmark(figures),
      }));

    // Calculate percentile ranks
    const valuePercentile = this.calculatePercentile(
      userBenchmark.totalValue,
      collectorBenchmarks.map(c => c.benchmark.totalValue)
    );

    const countPercentile = this.calculatePercentile(
      userBenchmark.totalCount,
      collectorBenchmarks.map(c => c.benchmark.totalCount)
    );

    const avgValuePercentile = this.calculatePercentile(
      userBenchmark.averageValue,
      collectorBenchmarks.map(c => c.benchmark.averageValue)
    );

    // Calculate rankings
    const valueRank = this.calculateRank(
      userBenchmark.totalValue,
      collectorBenchmarks.map(c => c.benchmark.totalValue),
      'desc'
    );

    const countRank = this.calculateRank(
      userBenchmark.totalCount,
      collectorBenchmarks.map(c => c.benchmark.totalCount),
      'desc'
    );

    const avgValueRank = this.calculateRank(
      userBenchmark.averageValue,
      collectorBenchmarks.map(c => c.benchmark.averageValue),
      'desc'
    );

    // Calculate comparisons (% difference from average)
    const avgTotalValue = collectorBenchmarks.length > 0
      ? collectorBenchmarks.reduce((sum, c) => sum + c.benchmark.totalValue, 0) / collectorBenchmarks.length
      : 0;

    const avgTotalCount = collectorBenchmarks.length > 0
      ? collectorBenchmarks.reduce((sum, c) => sum + c.benchmark.totalCount, 0) / collectorBenchmarks.length
      : 0;

    const avgAvgValue = collectorBenchmarks.length > 0
      ? collectorBenchmarks.reduce((sum, c) => sum + c.benchmark.averageValue, 0) / collectorBenchmarks.length
      : 0;

    const valueVsAverage = avgTotalValue > 0
      ? ((userBenchmark.totalValue - avgTotalValue) / avgTotalValue) * 100
      : 0;

    const countVsAverage = avgTotalCount > 0
      ? ((userBenchmark.totalCount - avgTotalCount) / avgTotalCount) * 100
      : 0;

    const avgValueVsAverage = avgAvgValue > 0
      ? ((userBenchmark.averageValue - avgAvgValue) / avgAvgValue) * 100
      : 0;

    return {
      userBenchmark,
      globalBenchmark,
      percentileRanks: {
        value: valuePercentile,
        count: countPercentile,
        avgValue: avgValuePercentile,
      },
      comparisons: {
        valueVsAverage,
        countVsAverage,
        avgValueVsAverage,
      },
      rankings: {
        valueRank,
        countRank,
        avgValueRank,
        totalCollectors: collectorBenchmarks.length,
      },
    };
  }

  /**
   * Calculate percentile rank (0-100)
   */
  private static calculatePercentile(value: number, allValues: number[]): number {
    if (allValues.length === 0) return 50;

    const sorted = [...allValues].sort((a, b) => a - b);
    const belowCount = sorted.filter(v => v < value).length;

    return (belowCount / sorted.length) * 100;
  }

  /**
   * Calculate rank (1 = best)
   */
  private static calculateRank(
    value: number,
    allValues: number[],
    order: 'asc' | 'desc' = 'desc'
  ): number {
    if (allValues.length === 0) return 1;

    const sorted = [...allValues].sort((a, b) => order === 'desc' ? b - a : a - b);
    const rank = sorted.findIndex(v => v === value) + 1;

    return rank > 0 ? rank : sorted.length + 1;
  }

  /**
   * Get series-level comparisons
   */
  static async getSeriesComparisons(
    userFigures: ActionFigure[],
    userId: string
  ): Promise<SeriesComparison[]> {
    // Group user's figures by series
    const userSeriesCounts = userFigures.reduce((acc, f) => {
      const series = f.series || 'Unknown';
      acc[series] = (acc[series] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get all public figures
    const figuresByUser = await this.getAllPublicFigures();

    const seriesComparisons: SeriesComparison[] = [];

    for (const [seriesName, userCount] of Object.entries(userSeriesCounts)) {
      // Calculate stats for this series across all collectors
      const seriesStats = Array.from(figuresByUser.entries())
        .map(([uid, figures]) => {
          const seriesFigures = figures.filter(f => f.series === seriesName);
          return {
            userId: uid,
            count: seriesFigures.length,
          };
        })
        .filter(s => s.count > 0);

      const avgCollectorCount = seriesStats.length > 0
        ? seriesStats.reduce((sum, s) => sum + s.count, 0) / seriesStats.length
        : 0;

      const topCollectorCount = seriesStats.length > 0
        ? Math.max(...seriesStats.map(s => s.count))
        : userCount;

      const userCompleteness = topCollectorCount > 0
        ? (userCount / topCollectorCount) * 100
        : 100;

      const rank = this.calculateRank(
        userCount,
        seriesStats.map(s => s.count),
        'desc'
      );

      seriesComparisons.push({
        seriesName,
        userCount,
        userCompleteness,
        avgCollectorCount,
        topCollectorCount,
        totalCollectorsWithSeries: seriesStats.length,
        rank,
      });
    }

    // Sort by user count (most figures first)
    return seriesComparisons.sort((a, b) => b.userCount - a.userCount);
  }

  /**
   * Get market benchmark data for display
   */
  static getMarketBenchmarks(
    userBenchmark: CollectionBenchmark,
    globalBenchmark: CollectionBenchmark
  ): Array<{ label: string; userValue: string; marketValue: string; comparison: string }> {
    const percentDiff = (user: number, market: number) => {
      if (market === 0) return 'N/A';
      const diff = ((user - market) / market) * 100;
      const sign = diff > 0 ? '+' : '';
      return `${sign}${diff.toFixed(1)}%`;
    };

    return [
      {
        label: 'Total Collection Value',
        userValue: `$${userBenchmark.totalValue.toFixed(2)}`,
        marketValue: `$${globalBenchmark.totalValue.toFixed(2)}`,
        comparison: percentDiff(userBenchmark.totalValue, globalBenchmark.averageValue),
      },
      {
        label: 'Collection Size',
        userValue: `${userBenchmark.totalCount} figures`,
        marketValue: `${globalBenchmark.totalCount} figures`,
        comparison: percentDiff(userBenchmark.totalCount, globalBenchmark.averageValue),
      },
      {
        label: 'Average Figure Value',
        userValue: `$${userBenchmark.averageValue.toFixed(2)}`,
        marketValue: `$${globalBenchmark.averageValue.toFixed(2)}`,
        comparison: percentDiff(userBenchmark.averageValue, globalBenchmark.averageValue),
      },
      {
        label: 'Median Figure Value',
        userValue: `$${userBenchmark.medianValue.toFixed(2)}`,
        marketValue: `$${globalBenchmark.medianValue.toFixed(2)}`,
        comparison: percentDiff(userBenchmark.medianValue, globalBenchmark.medianValue),
      },
      {
        label: 'MIB Percentage',
        userValue: `${userBenchmark.mibPercentage.toFixed(1)}%`,
        marketValue: `${globalBenchmark.mibPercentage.toFixed(1)}%`,
        comparison: `${(userBenchmark.mibPercentage - globalBenchmark.mibPercentage).toFixed(1)}pp`,
      },
    ];
  }
}

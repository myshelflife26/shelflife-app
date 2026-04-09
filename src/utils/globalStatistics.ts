import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ActionFigure } from '../types';

export interface FigurePopularity {
  figureName: string;
  series: string;
  manufacturer: string;
  count: number; // How many users own this
  totalValue: number; // Combined value across all owners
  avgValue: number;
}

export interface GlobalStats {
  totalUsers: number;
  totalFigures: number;
  totalValue: number;
  avgCollectionSize: number;
  mostCollectedFigures: FigurePopularity[];
  rarestFigures: FigurePopularity[];
  trendingFigures: FigurePopularity[]; // Recently added (last 30 days)
  topSeries: Array<{ series: string; count: number }>;
  topManufacturers: Array<{ manufacturer: string; count: number }>;
}

export class GlobalStatisticsService {
  private static cache: GlobalStats | null = null;
  private static cacheTimestamp = 0;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get global statistics across all users
   */
  static async getGlobalStatistics(): Promise<GlobalStats> {
    // Return cached data if still valid
    if (this.cache && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      // Get all figures from all users
      const figuresSnapshot = await getDocs(collection(db, 'figures'));
      const allFigures = figuresSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as ActionFigure[];

      // Get unique users
      const userIds = new Set(allFigures.map(f => f.userId).filter(Boolean));
      const totalUsers = userIds.size;
      const totalFigures = allFigures.length;
      const totalValue = allFigures.reduce((sum, f) => sum + (f.currentValue || 0), 0);
      const avgCollectionSize = totalUsers > 0 ? totalFigures / totalUsers : 0;

      // Calculate figure popularity (group by name + series)
      const figureMap = new Map<string, {
        figureName: string;
        series: string;
        manufacturer: string;
        count: number;
        totalValue: number;
        recentlyAdded: number; // Count added in last 30 days
      }>();

      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      allFigures.forEach(fig => {
        const key = `${fig.name}|||${fig.series}|||${fig.manufacturer}`;
        if (!figureMap.has(key)) {
          figureMap.set(key, {
            figureName: fig.name,
            series: fig.series,
            manufacturer: fig.manufacturer,
            count: 0,
            totalValue: 0,
            recentlyAdded: 0
          });
        }

        const entry = figureMap.get(key)!;
        entry.count++;
        entry.totalValue += fig.currentValue || 0;

        // Check if added in last 30 days (use updatedAt as proxy for creation)
        if (fig.updatedAt && fig.updatedAt > thirtyDaysAgo) {
          entry.recentlyAdded++;
        }
      });

      // Convert to array and calculate averages
      const figurePopularity: FigurePopularity[] = Array.from(figureMap.values()).map(entry => ({
        figureName: entry.figureName,
        series: entry.series,
        manufacturer: entry.manufacturer,
        count: entry.count,
        totalValue: entry.totalValue,
        avgValue: entry.count > 0 ? entry.totalValue / entry.count : 0
      }));

      // Most collected (sorted by count)
      const mostCollectedFigures = [...figurePopularity]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Rarest (owned by fewest users)
      const rarestFigures = [...figurePopularity]
        .filter(f => f.count > 0 && f.count <= 3) // At most 3 owners
        .sort((a, b) => a.count - b.count)
        .slice(0, 10);

      // Trending (recently added, sorted by recent activity)
      const trendingFigures = Array.from(figureMap.entries())
        .filter(([_, entry]) => entry.recentlyAdded > 0)
        .map(([_, entry]) => ({
          figureName: entry.figureName,
          series: entry.series,
          manufacturer: entry.manufacturer,
          count: entry.count,
          totalValue: entry.totalValue,
          avgValue: entry.count > 0 ? entry.totalValue / entry.count : 0
        }))
        .sort((a, b) => b.count - a.count) // Sort by total count
        .slice(0, 10);

      // Top series
      const seriesMap = new Map<string, number>();
      allFigures.forEach(fig => {
        seriesMap.set(fig.series, (seriesMap.get(fig.series) || 0) + 1);
      });
      const topSeries = Array.from(seriesMap.entries())
        .map(([series, count]) => ({ series, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top manufacturers
      const manufacturerMap = new Map<string, number>();
      allFigures.forEach(fig => {
        manufacturerMap.set(fig.manufacturer, (manufacturerMap.get(fig.manufacturer) || 0) + 1);
      });
      const topManufacturers = Array.from(manufacturerMap.entries())
        .map(([manufacturer, count]) => ({ manufacturer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const stats: GlobalStats = {
        totalUsers,
        totalFigures,
        totalValue,
        avgCollectionSize,
        mostCollectedFigures,
        rarestFigures,
        trendingFigures,
        topSeries,
        topManufacturers
      };

      // Cache the results
      this.cache = stats;
      this.cacheTimestamp = Date.now();

      return stats;
    } catch (error) {
      console.error('Failed to get global statistics:', error);
      throw error;
    }
  }

  /**
   * Clear the statistics cache
   */
  static clearCache() {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

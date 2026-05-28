import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ViewTrackingService } from './viewTracking';
import { ReactionsService } from './reactions';
import type { ActionFigure, TrendingMetrics, ViewStats } from '../types/index';
import { privacyAnalytics } from './privacyAnalytics';

/**
 * TrendingService - Enhanced trending algorithm that combines view tracking with reactions
 *
 * Features:
 * - View velocity calculation (24h/7d growth rates)
 * - Reaction velocity integration with existing ReactionsService
 * - Recency boost for newly added figures
 * - Multiple trending categories (hot, rising, evergreen)
 * - Privacy-compliant trending analytics
 */
export class TrendingService {
  private static readonly TRENDING_METRICS_COLLECTION = 'trending_metrics';

  // Trending calculation constants
  private static readonly RECENCY_BOOST_HOURS = 72; // 3 days
  private static readonly MIN_VIEWS_FOR_TRENDING = 5;
  private static readonly MIN_REACTIONS_FOR_TRENDING = 2;

  // Weight factors for trending score calculation
  private static readonly WEIGHTS = {
    VIEW_VELOCITY: 0.4,
    REACTION_VELOCITY: 0.3,
    RECENCY_BOOST: 0.2,
    TOTAL_ENGAGEMENT: 0.1
  };

  /**
   * Calculate trending score for a figure
   */
  static async calculateTrendingScore(figureId: string): Promise<number> {
    try {
      const now = Date.now();
      const last24h = now - (24 * 60 * 60 * 1000);
      const last7d = now - (7 * 24 * 60 * 60 * 1000);

      // Get view statistics
      const viewStats = await ViewTrackingService.getViewStats(figureId);
      if (!viewStats) return 0;

      // Get reaction statistics from existing ReactionsService
      const reactionStats = await ReactionsService.getReactionStats(figureId);
      const totalReactions = Object.values(reactionStats || {}).reduce((sum, count) => sum + count, 0);

      // Skip figures with insufficient engagement
      if (viewStats.total < this.MIN_VIEWS_FOR_TRENDING && totalReactions < this.MIN_REACTIONS_FOR_TRENDING) {
        return 0;
      }

      // Calculate view velocity (views per hour over different periods)
      const viewVelocity24h = viewStats.recent24h / 24;
      const viewVelocity7d = viewStats.recent7d / (7 * 24);

      // Emphasize recent activity
      const viewVelocity = (viewVelocity24h * 0.7) + (viewVelocity7d * 0.3);

      // Calculate reaction velocity (simplified - would need time-based reaction data for true velocity)
      // For now, use total reactions as a proxy weighted by recency of views
      const reactionVelocity = totalReactions * (viewStats.recent24h / Math.max(viewStats.total, 1));

      // Calculate recency boost for newly added figures
      const figureAge = now - (viewStats.lastViewed || now);
      const recencyBoostHours = this.RECENCY_BOOST_HOURS * 60 * 60 * 1000;
      const recencyBoost = figureAge < recencyBoostHours
        ? Math.max(0, 1 - (figureAge / recencyBoostHours))
        : 0;

      // Calculate total engagement score
      const totalEngagement = Math.log(viewStats.total + totalReactions + 1);

      // Calculate weighted trending score
      const trendingScore =
        (viewVelocity * this.WEIGHTS.VIEW_VELOCITY) +
        (reactionVelocity * this.WEIGHTS.REACTION_VELOCITY) +
        (recencyBoost * this.WEIGHTS.RECENCY_BOOST) +
        (totalEngagement * this.WEIGHTS.TOTAL_ENGAGEMENT);

      return Math.round(trendingScore * 100) / 100; // Round to 2 decimal places

    } catch (error) {
      console.error('Failed to calculate trending score:', error instanceof Error ? error.message : String(error));
      return 0;
    }
  }

  /**
   * Update trending metrics for a figure
   */
  static async updateTrendingMetrics(figureId: string): Promise<void> {
    try {
      const score = await this.calculateTrendingScore(figureId);
      const now = Date.now();
      const last24h = now - (24 * 60 * 60 * 1000);

      // Get view statistics for velocity calculation
      const viewStats = await ViewTrackingService.getViewStats(figureId);
      const viewVelocity = viewStats ? viewStats.recent24h / 24 : 0;

      // Get reaction statistics
      const reactionStats = await ReactionsService.getReactionStats(figureId);
      const totalReactions = Object.values(reactionStats || {}).reduce((sum, count) => sum + count, 0);
      const reactionVelocity = totalReactions * 0.1; // Simplified calculation

      // Calculate recency boost
      const figureAge = viewStats ? (now - (viewStats.lastViewed || now)) : Infinity;
      const recencyBoostHours = this.RECENCY_BOOST_HOURS * 60 * 60 * 1000;
      const recencyBoost = figureAge < recencyBoostHours
        ? Math.max(0, 1 - (figureAge / recencyBoostHours))
        : 0;

      const metrics: TrendingMetrics = {
        figureId,
        score,
        viewVelocity,
        reactionVelocity,
        recencyBoost,
        lastCalculated: now
      };

      const metricsRef = doc(db, this.TRENDING_METRICS_COLLECTION, figureId);
      await setDoc(metricsRef, metrics);

      // Track in privacy analytics
      privacyAnalytics.trackEvent('trending_score_update', {
        score,
        hasViews: viewVelocity > 0,
        hasReactions: reactionVelocity > 0,
        hasRecencyBoost: recencyBoost > 0
      });

    } catch (error) {
      console.error('Failed to update trending metrics:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Get trending figures with different algorithms
   */
  static async getTrendingFigures(
    limitCount: number = 20,
    category: 'hot' | 'rising' | 'evergreen' = 'hot'
  ): Promise<ActionFigure[]> {
    try {
      let metricsQuery;

      switch (category) {
        case 'hot':
          // Hot: Highest overall trending scores
          metricsQuery = query(
            collection(db, this.TRENDING_METRICS_COLLECTION),
            where('score', '>', 0.5),
            orderBy('score', 'desc'),
            limit(limitCount)
          );
          break;

        case 'rising':
          // Rising: High view velocity with recency boost
          metricsQuery = query(
            collection(db, this.TRENDING_METRICS_COLLECTION),
            where('viewVelocity', '>', 0.1),
            where('recencyBoost', '>', 0.3),
            orderBy('viewVelocity', 'desc'),
            limit(limitCount)
          );
          break;

        case 'evergreen':
          // Evergreen: Consistent engagement over time
          metricsQuery = query(
            collection(db, this.TRENDING_METRICS_COLLECTION),
            where('reactionVelocity', '>', 0.1),
            orderBy('reactionVelocity', 'desc'),
            limit(limitCount)
          );
          break;
      }

      const querySnapshot = await getDocs(metricsQuery);
      const figureIds: string[] = [];

      querySnapshot.forEach((doc) => {
        const metrics = doc.data() as TrendingMetrics;
        figureIds.push(metrics.figureId);
      });

      // Note: In a full implementation, this would join with the figures collection
      // For now, return empty array as figures would need to be fetched separately
      return [];

    } catch (error) {
      console.error('Failed to get trending figures:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Get trending metrics for a specific figure
   */
  static async getTrendingMetrics(figureId: string): Promise<TrendingMetrics | null> {
    try {
      const metricsRef = doc(db, this.TRENDING_METRICS_COLLECTION, figureId);
      const metricsDoc = await getDoc(metricsRef);

      if (!metricsDoc.exists()) {
        return null;
      }

      return metricsDoc.data() as TrendingMetrics;
    } catch (error) {
      console.error('Failed to get trending metrics:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Get trending figures by manufacturer (for niche communities)
   */
  static async getTrendingByManufacturer(
    manufacturer: string,
    limitCount: number = 10
  ): Promise<{ figureId: string; score: number }[]> {
    try {
      // This would require joining with the figures collection to filter by manufacturer
      // For now, return empty array as this needs enhanced database schema
      return [];
    } catch (error) {
      console.error('Failed to get trending by manufacturer:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Batch update trending scores for multiple figures
   */
  static async batchUpdateTrendingScores(figureIds: string[]): Promise<void> {
    const promises = figureIds.map(figureId => this.updateTrendingMetrics(figureId));

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Failed to batch update trending scores:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Get trending summary for analytics
   */
  static async getTrendingSummary(): Promise<{
    totalTrendingFigures: number;
    averageScore: number;
    topScore: number;
    categoryCounts: {
      hot: number;
      rising: number;
      evergreen: number;
    };
  }> {
    try {
      const metricsQuery = query(
        collection(db, this.TRENDING_METRICS_COLLECTION),
        where('score', '>', 0)
      );

      const querySnapshot = await getDocs(metricsQuery);
      const scores: number[] = [];
      let hotCount = 0;
      let risingCount = 0;
      let evergreenCount = 0;

      querySnapshot.forEach((doc) => {
        const metrics = doc.data() as TrendingMetrics;
        scores.push(metrics.score);

        // Categorize based on characteristics
        if (metrics.score > 0.5) hotCount++;
        if (metrics.viewVelocity > 0.1 && metrics.recencyBoost > 0.3) risingCount++;
        if (metrics.reactionVelocity > 0.1) evergreenCount++;
      });

      const totalTrendingFigures = scores.length;
      const averageScore = totalTrendingFigures > 0
        ? scores.reduce((sum, score) => sum + score, 0) / totalTrendingFigures
        : 0;
      const topScore = totalTrendingFigures > 0 ? Math.max(...scores) : 0;

      return {
        totalTrendingFigures,
        averageScore: Math.round(averageScore * 100) / 100,
        topScore: Math.round(topScore * 100) / 100,
        categoryCounts: {
          hot: hotCount,
          rising: risingCount,
          evergreen: evergreenCount
        }
      };

    } catch (error) {
      console.error('Failed to get trending summary:', error instanceof Error ? error.message : String(error));
      return {
        totalTrendingFigures: 0,
        averageScore: 0,
        topScore: 0,
        categoryCounts: {
          hot: 0,
          rising: 0,
          evergreen: 0
        }
      };
    }
  }
}
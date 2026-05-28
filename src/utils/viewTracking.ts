import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  runTransaction,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ViewStats, ViewEvent, ViewSource, ActionFigure } from '../types/index';
import { privacyAnalytics } from './privacyAnalytics';

/**
 * ViewTrackingService - Handles tracking and analytics for figure and profile views
 *
 * Features:
 * - Privacy-compliant view tracking (anonymous + authenticated)
 * - Aggregated view statistics with time-based breakdowns
 * - Deduplication to prevent spam/bot views
 * - Source attribution for understanding discovery paths
 * - Integration with existing PrivacyAnalytics system
 */
export class ViewTrackingService {
  private static readonly VIEW_STATS_COLLECTION = 'view_stats';
  private static readonly VIEW_EVENTS_COLLECTION = 'view_events';

  // Cache to prevent duplicate view events within short time periods
  private static recentViews = new Map<string, number>();
  private static readonly DEDUPE_WINDOW = 30000; // 30 seconds

  /**
   * Track a figure view event
   */
  static async trackFigureView(
    figureId: string,
    source: ViewSource,
    userId?: string,
    duration?: number
  ): Promise<void> {
    try {
      // Create deduplication key
      const dedupeKey = `${figureId}-${userId || 'anon'}-${source}`;
      const now = Date.now();

      // Check if we've tracked this view recently
      const lastView = this.recentViews.get(dedupeKey);
      if (lastView && (now - lastView) < this.DEDUPE_WINDOW) {
        return; // Skip duplicate view
      }

      this.recentViews.set(dedupeKey, now);

      // Clean up old cache entries
      this.cleanupCache();

      // Create view event
      const viewEvent: ViewEvent = {
        figureId,
        userId,
        viewedAt: now,
        source,
        duration,
        userAgent: navigator.userAgent,
        // Don't store IP for privacy compliance
      };

      // Record the individual view event
      const eventRef = doc(collection(db, this.VIEW_EVENTS_COLLECTION));
      await setDoc(eventRef, viewEvent);

      // Update aggregated statistics
      await this.updateViewStats(figureId, userId !== undefined);

      // Track in privacy analytics for aggregate insights
      privacyAnalytics.trackEvent('figure_view', {
        source,
        authenticated: userId !== undefined,
        duration: duration || 0
      });

    } catch (error) {
      console.error('Failed to track figure view:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Track a profile view event
   */
  static async trackProfileView(
    profileUserId: string,
    viewerUserId?: string
  ): Promise<void> {
    try {
      // Don't track self-views
      if (profileUserId === viewerUserId) {
        return;
      }

      const dedupeKey = `profile-${profileUserId}-${viewerUserId || 'anon'}`;
      const now = Date.now();

      const lastView = this.recentViews.get(dedupeKey);
      if (lastView && (now - lastView) < this.DEDUPE_WINDOW) {
        return;
      }

      this.recentViews.set(dedupeKey, now);
      this.cleanupCache();

      // Track profile view in privacy analytics
      privacyAnalytics.trackEvent('profile_view', {
        authenticated: viewerUserId !== undefined
      });

    } catch (error) {
      console.error('Failed to track profile view:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Get view statistics for a figure
   */
  static async getViewStats(figureId: string): Promise<ViewStats | null> {
    try {
      const statsRef = doc(db, this.VIEW_STATS_COLLECTION, figureId);
      const statsDoc = await getDoc(statsRef);

      if (!statsDoc.exists()) {
        return null;
      }

      return statsDoc.data() as ViewStats;
    } catch (error) {
      console.error('Failed to get view stats:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Get trending figures based on view velocity
   */
  static async getTrendingByViews(limitCount: number = 20): Promise<ActionFigure[]> {
    try {
      // This would typically be handled by a Firebase Function that calculates
      // trending scores periodically, but for now we'll do a simple query
      const statsQuery = query(
        collection(db, this.VIEW_STATS_COLLECTION),
        orderBy('recent24h', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(statsQuery);
      const trendingFigureIds: string[] = [];

      querySnapshot.forEach((doc) => {
        trendingFigureIds.push(doc.id);
      });

      // Note: In a full implementation, this would join with the figures collection
      // For now, return empty array as this will be enhanced in Phase 2
      return [];

    } catch (error) {
      console.error('Failed to get trending figures:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Get view events for a figure (for analytics)
   */
  static async getViewEvents(
    figureId: string,
    limitCount: number = 100
  ): Promise<ViewEvent[]> {
    try {
      const eventsQuery = query(
        collection(db, this.VIEW_EVENTS_COLLECTION),
        where('figureId', '==', figureId),
        orderBy('viewedAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(eventsQuery);
      const events: ViewEvent[] = [];

      querySnapshot.forEach((doc) => {
        events.push(doc.data() as ViewEvent);
      });

      return events;
    } catch (error) {
      console.error('Failed to get view events:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Get popular figures by source (for understanding discovery patterns)
   */
  static async getPopularBySource(
    source: ViewSource,
    limitCount: number = 10
  ): Promise<{ figureId: string; viewCount: number }[]> {
    try {
      const now = Date.now();
      const last24h = now - (24 * 60 * 60 * 1000);

      const eventsQuery = query(
        collection(db, this.VIEW_EVENTS_COLLECTION),
        where('source', '==', source),
        where('viewedAt', '>=', last24h),
        orderBy('viewedAt', 'desc'),
        limit(1000) // Get recent events to aggregate
      );

      const querySnapshot = await getDocs(eventsQuery);
      const figureViews = new Map<string, number>();

      querySnapshot.forEach((doc) => {
        const event = doc.data() as ViewEvent;
        const count = figureViews.get(event.figureId) || 0;
        figureViews.set(event.figureId, count + 1);
      });

      // Convert to sorted array
      const popularFigures = Array.from(figureViews.entries())
        .map(([figureId, viewCount]) => ({ figureId, viewCount }))
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, limitCount);

      return popularFigures;
    } catch (error) {
      console.error('Failed to get popular figures by source:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Update aggregated view statistics for a figure
   */
  private static async updateViewStats(figureId: string, isAuthenticated: boolean): Promise<void> {
    const statsRef = doc(db, this.VIEW_STATS_COLLECTION, figureId);
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const last7d = now - (7 * 24 * 60 * 60 * 1000);
    const last30d = now - (30 * 24 * 60 * 60 * 1000);

    try {
      await runTransaction(db, async (transaction) => {
        const statsDoc = await transaction.get(statsRef);

        let stats: ViewStats;
        if (statsDoc.exists()) {
          stats = statsDoc.data() as ViewStats;
        } else {
          stats = {
            total: 0,
            unique: 0,
            recent24h: 0,
            recent7d: 0,
            recent30d: 0,
            lastViewed: 0
          };
        }

        // Update counters
        stats.total += 1;
        if (isAuthenticated) {
          // Note: For true unique counting, we'd need to track user IDs
          // This is a simplified approach
          stats.unique += 1;
        }

        // For time-based counters, we'd typically use Firebase Functions
        // to clean up old data periodically. For now, increment all.
        stats.recent24h += 1;
        stats.recent7d += 1;
        stats.recent30d += 1;
        stats.lastViewed = now;

        transaction.set(statsRef, stats);
      });
    } catch (error) {
      console.error('Failed to update view stats:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Clean up old cache entries to prevent memory leaks
   */
  private static cleanupCache(): void {
    const now = Date.now();
    const cutoff = now - (this.DEDUPE_WINDOW * 2); // Clean entries older than 2x dedupe window

    for (const [key, timestamp] of this.recentViews.entries()) {
      if (timestamp < cutoff) {
        this.recentViews.delete(key);
      }
    }
  }

  /**
   * Get view analytics summary for a user's figures
   */
  static async getUserViewAnalytics(userId: string): Promise<{
    totalViews: number;
    averageViewsPerFigure: number;
    mostViewedFigure?: { figureId: string; views: number };
    recentGrowth: number; // percentage growth in last 7 days
  }> {
    try {
      // This would typically be pre-calculated by Firebase Functions
      // For now, return placeholder data
      return {
        totalViews: 0,
        averageViewsPerFigure: 0,
        recentGrowth: 0
      };
    } catch (error) {
      console.error('Failed to get user view analytics:', error instanceof Error ? error.message : String(error));
      return {
        totalViews: 0,
        averageViewsPerFigure: 0,
        recentGrowth: 0
      };
    }
  }
}
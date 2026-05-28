import { FirebaseAuthService } from './firebaseAuth';
import { FirebaseStorage } from './firebaseStorage';
import { AdmirersService } from './admirers';
import { ViewTrackingService } from './viewTracking';
import type { User } from '../types/user';
import type { ActionFigure } from '../types/index';
import { privacyAnalytics } from './privacyAnalytics';

/**
 * UserRecommendationsService - Sophisticated recommendation engine for user discovery
 *
 * Features:
 * - Similar collectors based on collection overlap
 * - Complementary collections (has figures you want)
 * - Activity-based suggestions (active traders, frequent updaters)
 * - Geographic proximity recommendations (if location shared)
 * - Collection diversity recommendations
 */
export class UserRecommendationsService {

  /**
   * Get recommended collectors for a user
   */
  static async getRecommendedCollectors(
    userId: string,
    limit: number = 10
  ): Promise<{
    user: User;
    reason: string;
    score: number;
    sharedInterests?: string[];
    complementaryCount?: number;
    lastActive?: string;
  }[]> {
    try {
      const currentUser = await FirebaseAuthService.getUserById(userId);
      if (!currentUser) return [];

      const userFigures = await FirebaseStorage.getFigures(userId);
      const allUsers = await FirebaseAuthService.getAllUsers();
      const publicUsers = allUsers.filter(u => u.id !== userId && u.collectionPublic);

      const recommendations: any[] = [];

      for (const user of publicUsers) {
        const userPublicFigures = await FirebaseStorage.getPublicFiguresByUser(user.id);

        // Calculate different recommendation scores
        const similarity = this.calculateCollectionSimilarity(userFigures, userPublicFigures);
        const complementarity = this.calculateComplementarity(userFigures, userPublicFigures);
        const activity = await this.calculateActivityScore(user.id);

        // Combine scores with weights
        const totalScore = (similarity.score * 0.4) + (complementarity.score * 0.3) + (activity * 0.3);

        if (totalScore > 0.1) { // Minimum threshold
          let reason = '';
          let sharedInterests: string[] = [];
          let complementaryCount = 0;

          if (similarity.score > 0.3) {
            reason = `Collects similar ${similarity.sharedCategories[0]} figures`;
            sharedInterests = similarity.sharedCategories;
          } else if (complementarity.score > 0.2) {
            reason = `Has ${complementarity.uniqueCount} figures you might like`;
            complementaryCount = complementarity.uniqueCount;
          } else if (activity > 0.5) {
            reason = 'Active collector with recent updates';
          } else {
            reason = 'Diverse collection worth exploring';
          }

          recommendations.push({
            user,
            reason,
            score: totalScore,
            sharedInterests,
            complementaryCount,
            lastActive: await this.getLastActiveTime(user.id)
          });
        }
      }

      // Sort by score and return top recommendations
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      console.error('Failed to get recommended collectors:', error);
      return [];
    }
  }

  /**
   * Get users with complementary collections (they have what you might want)
   */
  static async getComplementaryCollectors(
    userId: string,
    limit: number = 5
  ): Promise<{
    user: User;
    matchingFigures: ActionFigure[];
    totalMatches: number;
  }[]> {
    try {
      const userFigures = await FirebaseStorage.getFigures(userId);
      const userManufacturers = new Set(userFigures.map(f => f.manufacturer));
      const userCategories = new Set(userFigures.map(f => f.category));
      const userSeries = new Set(userFigures.map(f => f.series));

      const allUsers = await FirebaseAuthService.getAllUsers();
      const publicUsers = allUsers.filter(u => u.id !== userId && u.collectionPublic);

      const complementary: any[] = [];

      for (const user of publicUsers) {
        const userPublicFigures = await FirebaseStorage.getPublicFiguresByUser(user.id);

        // Find figures that match user's interests but they don't have
        const matchingFigures = userPublicFigures.filter(figure => {
          const hasManufacturer = userManufacturers.has(figure.manufacturer);
          const hasCategory = userCategories.has(figure.category);
          const hasSeries = userSeries.has(figure.series);

          // Check if user already has this exact figure
          const alreadyHas = userFigures.some(userFig =>
            userFig.name === figure.name &&
            userFig.manufacturer === figure.manufacturer &&
            userFig.series === figure.series
          );

          return (hasManufacturer || hasCategory || hasSeries) && !alreadyHas;
        });

        if (matchingFigures.length >= 3) {
          complementary.push({
            user,
            matchingFigures: matchingFigures.slice(0, 5), // Top 5 matches
            totalMatches: matchingFigures.length
          });
        }
      }

      return complementary
        .sort((a, b) => b.totalMatches - a.totalMatches)
        .slice(0, limit);

    } catch (error) {
      console.error('Failed to get complementary collectors:', error);
      return [];
    }
  }

  /**
   * Get active traders and collectors
   */
  static async getActiveCollectors(
    userId: string,
    limit: number = 8
  ): Promise<{
    user: User;
    activityScore: number;
    recentFigures: number;
    lastSeen: string;
  }[]> {
    try {
      const allUsers = await FirebaseAuthService.getAllUsers();
      const publicUsers = allUsers.filter(u => u.id !== userId && u.collectionPublic);

      const activeCollectors: any[] = [];
      const now = Date.now();
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

      for (const user of publicUsers) {
        const userFigures = await FirebaseStorage.getPublicFiguresByUser(user.id);

        // Count recent figures (added in last 30 days)
        const recentFigures = userFigures.filter(f =>
          (f.createdAt && f.createdAt > thirtyDaysAgo) ||
          (f.updatedAt && f.updatedAt > thirtyDaysAgo)
        ).length;

        const activityScore = await this.calculateActivityScore(user.id);
        const lastSeen = await this.getLastActiveTime(user.id);

        if (activityScore > 0.2 || recentFigures > 0) {
          activeCollectors.push({
            user,
            activityScore,
            recentFigures,
            lastSeen
          });
        }
      }

      return activeCollectors
        .sort((a, b) => b.activityScore - a.activityScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Failed to get active collectors:', error);
      return [];
    }
  }

  /**
   * Get collectors with similar taste (based on reactions and views)
   */
  static async getSimilarTasteCollectors(
    userId: string,
    limit: number = 6
  ): Promise<{
    user: User;
    similarityScore: number;
    commonInteractions: number;
  }[]> {
    try {
      // This would analyze reaction patterns and view history to find users with similar taste
      // For now, return empty array as this requires more complex analytics
      return [];
    } catch (error) {
      console.error('Failed to get similar taste collectors:', error);
      return [];
    }
  }

  /**
   * Calculate collection similarity between two users
   */
  private static calculateCollectionSimilarity(
    userFigures: ActionFigure[],
    otherUserFigures: ActionFigure[]
  ): {
    score: number;
    sharedCategories: string[];
    sharedManufacturers: string[];
  } {
    const userManufacturers = new Set(userFigures.map(f => f.manufacturer));
    const userCategories = new Set(userFigures.map(f => f.category));
    const userSeries = new Set(userFigures.map(f => f.series));

    const otherManufacturers = new Set(otherUserFigures.map(f => f.manufacturer));
    const otherCategories = new Set(otherUserFigures.map(f => f.category));
    const otherSeries = new Set(otherUserFigures.map(f => f.series));

    // Calculate overlaps
    const sharedManufacturers = Array.from(userManufacturers).filter(m => otherManufacturers.has(m));
    const sharedCategories = Array.from(userCategories).filter(c => otherCategories.has(c));
    const sharedSeries = Array.from(userSeries).filter(s => otherSeries.has(s));

    // Calculate Jaccard similarity
    const manufacturerSimilarity = sharedManufacturers.length /
      (userManufacturers.size + otherManufacturers.size - sharedManufacturers.length);
    const categorySimilarity = sharedCategories.length /
      (userCategories.size + otherCategories.size - sharedCategories.length);
    const seriesSimilarity = sharedSeries.length /
      (userSeries.size + otherSeries.size - sharedSeries.length);

    const score = (manufacturerSimilarity * 0.4) + (categorySimilarity * 0.3) + (seriesSimilarity * 0.3);

    return {
      score,
      sharedCategories,
      sharedManufacturers
    };
  }

  /**
   * Calculate complementarity score (how much the other user has that this user might want)
   */
  private static calculateComplementarity(
    userFigures: ActionFigure[],
    otherUserFigures: ActionFigure[]
  ): {
    score: number;
    uniqueCount: number;
  } {
    const userManufacturers = new Set(userFigures.map(f => f.manufacturer));
    const userCategories = new Set(userFigures.map(f => f.category));

    // Count figures the other user has that match this user's interests
    const relevantFigures = otherUserFigures.filter(f =>
      userManufacturers.has(f.manufacturer) || userCategories.has(f.category)
    );

    // Count unique figures (not duplicates of what user already has)
    const uniqueFigures = relevantFigures.filter(otherFig =>
      !userFigures.some(userFig =>
        userFig.name === otherFig.name &&
        userFig.manufacturer === otherFig.manufacturer
      )
    );

    const score = uniqueFigures.length / Math.max(userFigures.length, 1);

    return {
      score: Math.min(score, 1), // Cap at 1
      uniqueCount: uniqueFigures.length
    };
  }

  /**
   * Calculate activity score based on recent updates, reactions received, etc.
   */
  private static async calculateActivityScore(userId: string): Promise<number> {
    try {
      const now = Date.now();
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

      // Get user's figures to check for recent activity
      const userFigures = await FirebaseStorage.getPublicFiguresByUser(userId);

      // Count recent additions/updates
      const recentActivity = userFigures.filter(f =>
        (f.createdAt && f.createdAt > thirtyDaysAgo) ||
        (f.updatedAt && f.updatedAt > thirtyDaysAgo)
      ).length;

      // Activity score based on recent updates (normalized to 0-1)
      const activityScore = Math.min(recentActivity / 10, 1);

      return activityScore;
    } catch (error) {
      console.error('Failed to calculate activity score:', error);
      return 0;
    }
  }

  /**
   * Get last active time (simplified - would use real activity tracking in production)
   */
  private static async getLastActiveTime(userId: string): Promise<string> {
    try {
      const userFigures = await FirebaseStorage.getPublicFiguresByUser(userId);

      // Find the most recent figure update
      let lastActivity = 0;
      for (const figure of userFigures) {
        const activityTime = Math.max(figure.createdAt || 0, figure.updatedAt || 0);
        if (activityTime > lastActivity) {
          lastActivity = activityTime;
        }
      }

      if (lastActivity === 0) return 'Unknown';

      const now = Date.now();
      const daysSince = Math.floor((now - lastActivity) / (24 * 60 * 60 * 1000));

      if (daysSince === 0) return 'Today';
      if (daysSince === 1) return 'Yesterday';
      if (daysSince < 7) return `${daysSince} days ago`;
      if (daysSince < 30) return `${Math.floor(daysSince / 7)} weeks ago`;

      return `${Math.floor(daysSince / 30)} months ago`;
    } catch (error) {
      console.error('Failed to get last active time:', error);
      return 'Unknown';
    }
  }

  /**
   * Track recommendation interactions for improving algorithms
   */
  static trackRecommendationInteraction(
    userId: string,
    recommendedUserId: string,
    action: 'view' | 'admire' | 'message' | 'dismiss'
  ): void {
    try {
      privacyAnalytics.trackEvent('recommendation_interaction', {
        action,
        hasRecommendation: true
      });
    } catch (error) {
      console.error('Failed to track recommendation interaction:', error);
    }
  }
}
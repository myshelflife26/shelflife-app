import type { User, ActionFigure } from '../types/index';

export interface CommunityActivity {
  id: string;
  type: 'figure_added' | 'figure_updated' | 'collection_milestone' | 'trade_completed' | 'user_joined' | 'figure_admired' | 'figure_wanted' | 'comment_added';
  userId: string;
  userName: string;
  userDisplayName: string;
  timestamp: number;
  data: {
    figureId?: string;
    figureName?: string;
    figureImageUrl?: string;
    milestone?: string;
    tradeId?: string;
    tradedWith?: string;
    commentText?: string;
    targetUserId?: string;
    targetUserName?: string;
    [key: string]: any;
  };
}

const ACTIVITY_KEY = 'app-community-activity';
const MAX_ACTIVITIES = 500; // Keep last 500 activities

export class CommunityActivityService {
  /**
   * Record a new community activity
   */
  static recordActivity(activity: Omit<CommunityActivity, 'id' | 'timestamp'>): void {
    try {
      const activities = this.getAll();

      const newActivity: CommunityActivity = {
        ...activity,
        id: crypto.randomUUID(),
        timestamp: Date.now()
      };

      // Add to beginning of array
      activities.unshift(newActivity);

      // Keep only the most recent activities
      if (activities.length > MAX_ACTIVITIES) {
        activities.splice(MAX_ACTIVITIES);
      }

      this.saveAll(activities);
    } catch (error) {
      console.error('Error recording community activity:', error);
    }
  }

  /**
   * Get recent community activities
   */
  static getRecentActivities(limit = 25): CommunityActivity[] {
    try {
      return this.getAll()
        .slice(0, limit)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting recent activities:', error);
      return [];
    }
  }

  /**
   * Get activities for a specific user
   */
  static getUserActivities(userId: string, limit = 25): CommunityActivity[] {
    try {
      return this.getAll()
        .filter(activity => activity.userId === userId)
        .slice(0, limit)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting user activities:', error);
      return [];
    }
  }

  /**
   * Get activities by type
   */
  static getActivitiesByType(type: CommunityActivity['type'], limit = 25): CommunityActivity[] {
    try {
      return this.getAll()
        .filter(activity => activity.type === type)
        .slice(0, limit)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting activities by type:', error);
      return [];
    }
  }

  /**
   * Get activities from the last N days
   */
  static getActivitiesFromDays(days: number, limit = 50): CommunityActivity[] {
    try {
      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

      return this.getAll()
        .filter(activity => activity.timestamp >= cutoffTime)
        .slice(0, limit)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting activities from days:', error);
      return [];
    }
  }

  /**
   * Get trending activities (most engaging recent activities)
   */
  static getTrendingActivities(limit = 10): CommunityActivity[] {
    try {
      const recentActivities = this.getActivitiesFromDays(7, 100);

      // Score activities based on type and recency
      const scoredActivities = recentActivities.map(activity => {
        let score = 0;

        // Base score by type
        switch (activity.type) {
          case 'trade_completed':
            score += 10;
            break;
          case 'collection_milestone':
            score += 8;
            break;
          case 'figure_added':
            score += 5;
            break;
          case 'figure_admired':
            score += 3;
            break;
          case 'comment_added':
            score += 4;
            break;
          case 'user_joined':
            score += 6;
            break;
          default:
            score += 2;
        }

        // Recency bonus (activities in last 24h get bonus)
        const hoursAgo = (Date.now() - activity.timestamp) / (1000 * 60 * 60);
        if (hoursAgo < 24) {
          score += Math.max(0, 5 - (hoursAgo / 24) * 5);
        }

        return { activity, score };
      });

      return scoredActivities
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.activity);
    } catch (error) {
      console.error('Error getting trending activities:', error);
      return [];
    }
  }

  /**
   * Get activity statistics
   */
  static getActivityStats(days = 7): {
    totalActivities: number;
    activeUsers: number;
    byType: Record<string, number>;
    byDay: Array<{ date: string; count: number }>;
  } {
    try {
      const activities = this.getActivitiesFromDays(days, 1000);
      const activeUsers = new Set(activities.map(a => a.userId));

      // Count by type
      const byType: Record<string, number> = {};
      activities.forEach(activity => {
        byType[activity.type] = (byType[activity.type] || 0) + 1;
      });

      // Count by day
      const byDay: Array<{ date: string; count: number }> = [];
      const dayGroups = new Map<string, number>();

      activities.forEach(activity => {
        const date = new Date(activity.timestamp).toISOString().split('T')[0];
        dayGroups.set(date, (dayGroups.get(date) || 0) + 1);
      });

      // Fill in missing days
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        byDay.push({
          date,
          count: dayGroups.get(date) || 0
        });
      }

      return {
        totalActivities: activities.length,
        activeUsers: activeUsers.size,
        byType,
        byDay
      };
    } catch (error) {
      console.error('Error getting activity stats:', error);
      return {
        totalActivities: 0,
        activeUsers: 0,
        byType: {},
        byDay: []
      };
    }
  }

  /**
   * Clear old activities (keep only recent ones)
   */
  static cleanupOldActivities(keepDays = 30): number {
    try {
      const cutoffTime = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
      const activities = this.getAll();
      const originalCount = activities.length;

      const filtered = activities.filter(activity => activity.timestamp >= cutoffTime);
      this.saveAll(filtered);

      return originalCount - filtered.length;
    } catch (error) {
      console.error('Error cleaning up activities:', error);
      return 0;
    }
  }

  /**
   * Get all activities (private)
   */
  private static getAll(): CommunityActivity[] {
    try {
      const data = localStorage.getItem(ACTIVITY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading activities:', error);
      return [];
    }
  }

  /**
   * Save all activities (private)
   */
  private static saveAll(activities: CommunityActivity[]): void {
    try {
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
    } catch (error) {
      console.error('Error saving activities:', error);
    }
  }

  /**
   * Clear all activities (admin only)
   */
  static clearAll(): void {
    localStorage.removeItem(ACTIVITY_KEY);
  }
}

// Helper functions to record common activities
export class ActivityRecorder {
  static figureAdded(user: User, figure: ActionFigure): void {
    CommunityActivityService.recordActivity({
      type: 'figure_added',
      userId: user.id,
      userName: user.username,
      userDisplayName: user.displayName,
      data: {
        figureId: figure.id,
        figureName: figure.name,
        figureImageUrl: figure.imageUrl
      }
    });
  }

  static figureAdmired(user: User, figure: ActionFigure, targetUser: User): void {
    CommunityActivityService.recordActivity({
      type: 'figure_admired',
      userId: user.id,
      userName: user.username,
      userDisplayName: user.displayName,
      data: {
        figureId: figure.id,
        figureName: figure.name,
        figureImageUrl: figure.imageUrl,
        targetUserId: targetUser.id,
        targetUserName: targetUser.username
      }
    });
  }

  static collectionMilestone(user: User, milestone: string): void {
    CommunityActivityService.recordActivity({
      type: 'collection_milestone',
      userId: user.id,
      userName: user.username,
      userDisplayName: user.displayName,
      data: {
        milestone
      }
    });
  }

  static tradeCompleted(user: User, tradePartner: User, tradeId: string): void {
    CommunityActivityService.recordActivity({
      type: 'trade_completed',
      userId: user.id,
      userName: user.username,
      userDisplayName: user.displayName,
      data: {
        tradeId,
        tradedWith: tradePartner.username,
        targetUserId: tradePartner.id,
        targetUserName: tradePartner.username
      }
    });
  }

  static userJoined(user: User): void {
    CommunityActivityService.recordActivity({
      type: 'user_joined',
      userId: user.id,
      userName: user.username,
      userDisplayName: user.displayName,
      data: {}
    });
  }

  static commentAdded(user: User, commentText: string, figure?: ActionFigure): void {
    CommunityActivityService.recordActivity({
      type: 'comment_added',
      userId: user.id,
      userName: user.username,
      userDisplayName: user.displayName,
      data: {
        commentText: commentText.substring(0, 100), // Truncate long comments
        figureId: figure?.id,
        figureName: figure?.name
      }
    });
  }
}
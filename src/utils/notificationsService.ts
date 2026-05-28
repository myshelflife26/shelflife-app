import { AdmirersService } from './admirers';
import { ReactionsService } from './reactions';
import { Storage } from './storage';
import { PriceAlertsService } from './priceAlertsService';
import { ViewTrackingService } from './viewTracking';
import { TrendingService } from './trending';
import { MessagingNotificationsService } from './messagingNotifications';

const NOTIFICATIONS_KEY = 'app-notifications-state';
const MAX_SEEN_IDS = 20;

export interface NotificationState {
  lastSeenAdmirerRequests: number;
  lastSeenReactions: number;
  lastSeenFigures: number;
  seenNotificationIds: string[]; // For deduplication
}

export interface NotificationResult {
  type: 'admirerRequest' | 'reaction' | 'newFigure' | 'reportUpdate' | 'priceAlert' | 'viewMilestone' | 'trendingStatus' | 'new_message' | 'message_reaction' | 'conversation_activity';
  id: string; // Unique ID for this notification
  message: string;
  data?: any; // Additional data for the notification
}

export class NotificationsService {
  private static getState(userId: string): NotificationState {
    try {
      const key = `${NOTIFICATIONS_KEY}-${userId}`;
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error reading notification state:', error);
    }

    // Default state
    return {
      lastSeenAdmirerRequests: Date.now(),
      lastSeenReactions: Date.now(),
      lastSeenFigures: Date.now(),
      seenNotificationIds: []
    };
  }

  private static saveState(userId: string, state: NotificationState): void {
    try {
      const key = `${NOTIFICATIONS_KEY}-${userId}`;
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving notification state:', error);
    }
  }

  private static hasSeenNotification(userId: string, notificationId: string): boolean {
    const state = this.getState(userId);
    return state.seenNotificationIds.includes(notificationId);
  }

  private static markAsSeen(userId: string, notificationId: string): void {
    const state = this.getState(userId);

    // Add to seen list (keep only last MAX_SEEN_IDS)
    if (!state.seenNotificationIds.includes(notificationId)) {
      state.seenNotificationIds.unshift(notificationId);
      state.seenNotificationIds = state.seenNotificationIds.slice(0, MAX_SEEN_IDS);
      this.saveState(userId, state);
    }
  }

  // Update last-seen timestamp for a specific notification type
  static updateLastSeen(userId: string, type: 'admirerRequests' | 'reactions' | 'figures'): void {
    const state = this.getState(userId);
    const now = Date.now();

    switch (type) {
      case 'admirerRequests':
        state.lastSeenAdmirerRequests = now;
        break;
      case 'reactions':
        state.lastSeenReactions = now;
        break;
      case 'figures':
        state.lastSeenFigures = now;
        break;
    }

    this.saveState(userId, state);
  }

  // Detect new admirer requests
  static async detectNewAdmirerRequests(userId: string): Promise<NotificationResult[]> {
    const pendingRequests = await AdmirersService.getPendingRequests(userId);
    const notifications: NotificationResult[] = [];

    for (const request of pendingRequests) {
      const notificationId = `admirer-request-${request.id}-${userId}`;

      if (!this.hasSeenNotification(userId, notificationId)) {
        notifications.push({
          type: 'admirerRequest',
          id: notificationId,
          message: `${request.displayName} wants to admire your collection`,
          data: request
        });
        this.markAsSeen(userId, notificationId);
      }
    }

    return notifications;
  }

  // Detect new reactions on user's figures
  static detectNewReactions(userId: string): NotificationResult[] {
    const state = this.getState(userId);
    const userFigures = Storage.getAll(userId);
    const figureIds = userFigures.map(f => f.id);

    // Get all reactions for user's figures
    const reactions = ReactionsService.getReactionsForOwner(userId, figureIds);

    // Filter reactions that happened after last seen and are from other users
    const newReactions = reactions.filter(r =>
      r.timestamp > state.lastSeenReactions &&
      r.userId !== userId // Exclude user's own reactions
    );

    const notifications: NotificationResult[] = [];

    for (const reaction of newReactions) {
      const notificationId = `reaction-${reaction.id}`;

      if (!this.hasSeenNotification(userId, notificationId)) {
        // Get figure name
        const figure = userFigures.find(f => f.id === reaction.figureId);
        const figureName = figure?.name || 'your figure';

        const reactionEmoji = {
          appreciate: '👍',
          love: '❤️',
          fire: '🔥'
        }[reaction.reactionType];

        notifications.push({
          type: 'reaction',
          id: notificationId,
          message: `${reaction.displayName} reacted ${reactionEmoji} to ${figureName}`,
          data: { reaction, figure }
        });
        this.markAsSeen(userId, notificationId);
      }
    }

    return notifications;
  }

  // Detect new public figures from people the current user admires
  static async detectNewFiguresFromAdmirers(userId: string): Promise<NotificationResult[]> {
    const state = this.getState(userId);
    const admiringUserIds = await AdmirersService.getAdmiring(userId);
    const notifications: NotificationResult[] = [];

    for (const admireeId of admiringUserIds) {
      // Get all public figures from this admiree
      const admireeFigures = Storage.getAll(admireeId).filter(f => f.isPublic);

      // Find figures created or made public after last seen
      // A figure is "new" if:
      // 1. It was created after lastSeenFigures (createdAt > lastSeenFigures)
      // 2. OR it was made public after lastSeenFigures (updatedAt > lastSeenFigures and was private before)
      const newFigures = admireeFigures.filter(f => {
        // If no timestamp, don't show (shouldn't happen with Firebase storage)
        if (!f.createdAt && !f.updatedAt) return false;

        // Show if created recently
        if (f.createdAt && f.createdAt > state.lastSeenFigures) return true;

        // Show if made public recently (updatedAt > lastSeen and it's now public)
        if (f.updatedAt && f.updatedAt > state.lastSeenFigures && f.isPublic) return true;

        return false;
      });

      for (const figure of newFigures) {
        const notificationId = `new-figure-${figure.id}`;

        if (!this.hasSeenNotification(userId, notificationId)) {
          const admiringCollections = await AdmirersService.getAdmiringCollections(userId);
          const admiree = admiringCollections.find(u => u.id === admireeId);
          const admireeName = admiree?.displayName || 'Someone you admire';

          notifications.push({
            type: 'newFigure',
            id: notificationId,
            message: `${admireeName} added ${figure.name}`,
            data: { figure, admireeId }
          });
          this.markAsSeen(userId, notificationId);
        }
      }
    }

    // Sort by timestamp (most recent first) and limit to most recent 5
    return notifications
      .sort((a, b) => {
        const aTime = a.data.figure.createdAt || a.data.figure.updatedAt || 0;
        const bTime = b.data.figure.createdAt || b.data.figure.updatedAt || 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }

  // Create a notification for a report status update
  static notifyReportUpdate(
    reporterId: string,
    reportedUsername: string,
    newStatus: string,
    reviewerUsername?: string
  ): void {
    const notificationId = `report-update-${reporterId}-${Date.now()}`;

    let message = '';
    switch (newStatus) {
      case 'reviewed':
        message = `Your report against @${reportedUsername} has been reviewed`;
        break;
      case 'dismissed':
        message = `Your report against @${reportedUsername} was dismissed`;
        break;
      case 'action_taken':
        message = `Action has been taken on your report against @${reportedUsername}`;
        break;
      default:
        message = `Your report against @${reportedUsername} status was updated`;
    }

    if (reviewerUsername) {
      message += ` by ${reviewerUsername}`;
    }

    // Mark as seen immediately (we'll show it as a toast instead)
    this.markAsSeen(reporterId, notificationId);
  }

  // Detect price alerts
  static detectPriceAlerts(userId: string): NotificationResult[] {
    const alerts = PriceAlertsService.getUnseenAlerts(userId);
    const notifications: NotificationResult[] = [];

    for (const alert of alerts) {
      const notificationId = `price-alert-${alert.id}`;

      if (!this.hasSeenNotification(userId, notificationId)) {
        const message = PriceAlertsService.formatChangeMessage(alert);

        notifications.push({
          type: 'priceAlert',
          id: notificationId,
          message,
          data: alert
        });
        this.markAsSeen(userId, notificationId);
        PriceAlertsService.markAsSeen(userId, alert.id);
      }
    }

    return notifications;
  }

  // Detect all new notifications
  static async detectAllNewNotifications(userId: string): Promise<NotificationResult[]> {
    const admirerNotifications = await this.detectNewAdmirerRequests(userId);
    const reactionNotifications = this.detectNewReactions(userId);
    const figureNotifications = await this.detectNewFiguresFromAdmirers(userId);
    const priceAlertNotifications = this.detectPriceAlerts(userId);
    const viewMilestoneNotifications = await this.detectViewMilestones(userId);
    const trendingStatusNotifications = await this.detectTrendingStatus(userId);

    // New messaging notifications
    const messageNotifications = await MessagingNotificationsService.detectNewMessages(userId);
    const messageReactionNotifications = await MessagingNotificationsService.detectMessageReactions(userId);
    const conversationActivityNotifications = await MessagingNotificationsService.detectImportantConversationActivity(userId);

    // Combine and return (most recent first)
    return [
      ...admirerNotifications,
      ...reactionNotifications,
      ...figureNotifications,
      ...priceAlertNotifications,
      ...viewMilestoneNotifications,
      ...trendingStatusNotifications,
      ...messageNotifications,
      ...messageReactionNotifications,
      ...conversationActivityNotifications
    ];
  }

  // Get count of pending admirer requests (for badge)
  static async getPendingAdmirerRequestCount(userId: string): Promise<number> {
    return await AdmirersService.getPendingRequestCount(userId);
  }

  // Reset notification state (for testing or user request)
  static resetNotificationState(userId: string): void {
    const state: NotificationState = {
      lastSeenAdmirerRequests: Date.now(),
      lastSeenReactions: Date.now(),
      lastSeenFigures: Date.now(),
      seenNotificationIds: []
    };
    this.saveState(userId, state);
  }

  // Detect view milestone notifications (100 views, 1000 views, etc.)
  static async detectViewMilestones(userId: string): Promise<NotificationResult[]> {
    const notifications: NotificationResult[] = [];

    try {
      const userFigures = Storage.getAll(userId);
      const milestones = [100, 500, 1000, 5000, 10000];

      for (const figure of userFigures) {
        if (!figure.isPublic) continue; // Only public figures get view milestones

        const viewStats = await ViewTrackingService.getViewStats(figure.id);
        if (!viewStats) continue;

        // Check each milestone
        for (const milestone of milestones) {
          if (viewStats.total >= milestone) {
            const notificationId = `view-milestone-${figure.id}-${milestone}`;

            if (!this.hasSeenNotification(userId, notificationId)) {
              notifications.push({
                type: 'viewMilestone',
                id: notificationId,
                message: `${figure.name} reached ${milestone.toLocaleString()} views!`,
                data: { figure, milestone, viewCount: viewStats.total }
              });
              this.markAsSeen(userId, notificationId);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error detecting view milestones:', error);
    }

    return notifications.sort((a, b) => (b.data.milestone || 0) - (a.data.milestone || 0));
  }

  // Detect trending status notifications
  static async detectTrendingStatus(userId: string): Promise<NotificationResult[]> {
    const notifications: NotificationResult[] = [];

    try {
      const userFigures = Storage.getAll(userId);

      for (const figure of userFigures) {
        if (!figure.isPublic) continue; // Only public figures can trend

        const trendingMetrics = await TrendingService.getTrendingMetrics(figure.id);
        if (!trendingMetrics || trendingMetrics.score < 1.0) continue; // Only notify for significant trending

        const notificationId = `trending-${figure.id}-${Math.floor(trendingMetrics.lastCalculated / 3600000)}`; // Hour-based deduplication

        if (!this.hasSeenNotification(userId, notificationId)) {
          notifications.push({
            type: 'trendingStatus',
            id: notificationId,
            message: `${figure.name} is trending! Score: ${trendingMetrics.score}`,
            data: { figure, trendingMetrics }
          });
          this.markAsSeen(userId, notificationId);
        }
      }
    } catch (error) {
      console.error('Error detecting trending status:', error);
    }

    return notifications.sort((a, b) => (b.data.trendingMetrics?.score || 0) - (a.data.trendingMetrics?.score || 0));
  }
}

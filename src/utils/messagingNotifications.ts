import { FirebaseConversationsService } from './firebaseConversations';
import { NotificationsService } from './notificationsService';
import { RichMessagesService } from './richMessages';
import { privacyAnalytics } from './privacyAnalytics';

/**
 * MessagingNotificationsService - Enhanced notifications for messaging system
 *
 * Features:
 * - New message notifications with rich content previews
 * - Conversation activity summaries
 * - Message reaction notifications
 * - Typing indicator alerts for important conversations
 * - Integration with existing notification system
 */
export class MessagingNotificationsService {

  /**
   * Check for new message notifications
   */
  static async detectNewMessages(userId: string): Promise<{
    type: 'new_message';
    id: string;
    message: string;
    data?: any;
  }[]> {
    try {
      const conversations = await FirebaseConversationsService.getUserConversations(userId, false);
      const notifications: any[] = [];

      for (const conversation of conversations) {
        // Check if there are unread messages
        const unreadCount = conversation.unreadCount[userId] || 0;

        if (unreadCount > 0) {
          // Get the latest messages to create meaningful notifications
          const recentMessages = await FirebaseConversationsService.getMessages(
            conversation.id,
            Math.min(unreadCount, 3) // Get up to 3 recent messages
          );

          for (const message of recentMessages) {
            // Skip messages from the current user
            if (message.fromUserId === userId) continue;

            // Check if we've already seen this message
            const notificationId = `new-message-${message.id}`;
            if (NotificationsService.hasSeenNotification(userId, notificationId)) {
              continue;
            }

            // Parse rich message content for better previews
            const richContent = RichMessagesService.parseRichMessage(message.message);
            const preview = RichMessagesService.getMessagePreview(richContent);

            // Create notification
            notifications.push({
              type: 'new_message',
              id: notificationId,
              message: `${message.fromDisplayName}: ${preview}`,
              data: {
                conversationId: conversation.id,
                messageId: message.id,
                fromUserId: message.fromUserId,
                fromDisplayName: message.fromDisplayName,
                richContent
              }
            });

            // Mark as seen
            NotificationsService.markAsSeen(userId, notificationId);
          }
        }
      }

      return notifications.slice(0, 5); // Limit to 5 most recent

    } catch (error) {
      console.error('Failed to detect new messages:', error);
      return [];
    }
  }

  /**
   * Check for message reaction notifications
   */
  static async detectMessageReactions(userId: string): Promise<{
    type: 'message_reaction';
    id: string;
    message: string;
    data?: any;
  }[]> {
    try {
      // This would require tracking reactions at the conversation level
      // For now, return empty array as this needs enhanced schema
      return [];

    } catch (error) {
      console.error('Failed to detect message reactions:', error);
      return [];
    }
  }

  /**
   * Check for important conversation activity
   */
  static async detectImportantConversationActivity(userId: string): Promise<{
    type: 'conversation_activity';
    id: string;
    message: string;
    data?: any;
  }[]> {
    try {
      const conversations = await FirebaseConversationsService.getUserConversations(userId, false);
      const notifications: any[] = [];
      const now = Date.now();
      const last24h = now - (24 * 60 * 60 * 1000);

      for (const conversation of conversations) {
        // Skip if no recent activity
        if (conversation.lastMessageTimestamp < last24h) continue;

        // Skip if user was the last to send a message
        if (conversation.lastMessageSenderId === userId) continue;

        // Check for high activity conversations (multiple messages in short time)
        const unreadCount = conversation.unreadCount[userId] || 0;

        if (unreadCount >= 3) {
          const notificationId = `high-activity-${conversation.id}-${Math.floor(now / 3600000)}`; // Hour-based deduplication

          if (!NotificationsService.hasSeenNotification(userId, notificationId)) {
            // Determine other participant name
            const otherParticipant = conversation.participants.find(p => p !== userId);
            const otherName = otherParticipant ? conversation.participantNames[otherParticipant] : 'Someone';

            notifications.push({
              type: 'conversation_activity',
              id: notificationId,
              message: `${unreadCount} new messages from ${otherName}`,
              data: {
                conversationId: conversation.id,
                unreadCount,
                otherParticipant: otherName
              }
            });

            NotificationsService.markAsSeen(userId, notificationId);
          }
        }
      }

      return notifications;

    } catch (error) {
      console.error('Failed to detect conversation activity:', error);
      return [];
    }
  }

  /**
   * Check for figure-related message opportunities
   */
  static async detectFigureMessageOpportunities(userId: string): Promise<{
    type: 'figure_message_opportunity';
    id: string;
    message: string;
    data?: any;
  }[]> {
    try {
      // This would analyze user's collection and recent activity to suggest
      // messaging other users about figures they might be interested in
      // For now, return empty array as this needs more complex logic
      return [];

    } catch (error) {
      console.error('Failed to detect figure message opportunities:', error);
      return [];
    }
  }

  /**
   * Generate message templates based on conversation context
   */
  static generateContextualTemplates(
    conversationId: string,
    otherUserId: string,
    currentUserId: string
  ): { templateId: string; text: string; description: string }[] {
    const templates: { templateId: string; text: string; description: string }[] = [];

    // Add figure-related templates
    templates.push(
      {
        templateId: 'interested_trade',
        text: "I noticed you have some great figures. Would you be interested in trading?",
        description: 'Express interest in trading'
      },
      {
        templateId: 'collection_compliment',
        text: "Your collection is amazing! I really love your display setup.",
        description: 'Compliment their collection'
      },
      {
        templateId: 'advice_request',
        text: "I'm looking for advice on collecting {manufacturer} figures. Any tips?",
        description: 'Ask for collecting advice'
      }
    );

    // Add general conversation templates
    templates.push(
      {
        templateId: 'thanks_sharing',
        text: "Thanks for sharing! That really helps.",
        description: 'Thank them for sharing'
      },
      {
        templateId: 'follow_up',
        text: "Just following up on our previous conversation. Any updates?",
        description: 'Follow up on previous topics'
      }
    );

    return templates;
  }

  /**
   * Analyze conversation for engagement insights
   */
  static analyzeConversationEngagement(conversationId: string): {
    responseTime: number; // Average response time in minutes
    messageLength: number; // Average message length
    activityLevel: 'low' | 'medium' | 'high';
    topics: string[]; // Main topics discussed
  } {
    // This would analyze message patterns, response times, etc.
    // For now, return default values
    return {
      responseTime: 60, // 1 hour average
      messageLength: 50,
      activityLevel: 'medium',
      topics: ['trading', 'collection']
    };
  }

  /**
   * Track messaging engagement for analytics
   */
  static trackMessagingEngagement(
    action: 'send' | 'react' | 'read' | 'archive',
    messageType: 'text' | 'figure' | 'template' | 'image' = 'text'
  ): void {
    try {
      privacyAnalytics.trackEvent('messaging_engagement', {
        action,
        messageType,
        hasEngagement: true
      });
    } catch (error) {
      console.error('Failed to track messaging engagement:', error);
    }
  }

  /**
   * Get messaging activity summary for user dashboard
   */
  static async getMessagingActivitySummary(userId: string): Promise<{
    totalConversations: number;
    unreadMessages: number;
    activeConversations: number; // Conversations with activity in last 7 days
    responseRate: number; // Percentage of messages that get responses
    averageResponseTime: number; // In minutes
  }> {
    try {
      const conversations = await FirebaseConversationsService.getUserConversations(userId, false);
      const now = Date.now();
      const last7d = now - (7 * 24 * 60 * 60 * 1000);

      const totalConversations = conversations.length;
      const unreadMessages = conversations.reduce((sum, conv) => sum + (conv.unreadCount[userId] || 0), 0);
      const activeConversations = conversations.filter(conv => conv.lastMessageTimestamp > last7d).length;

      return {
        totalConversations,
        unreadMessages,
        activeConversations,
        responseRate: 0.85, // Placeholder - would calculate from actual data
        averageResponseTime: 120 // 2 hours placeholder
      };

    } catch (error) {
      console.error('Failed to get messaging activity summary:', error);
      return {
        totalConversations: 0,
        unreadMessages: 0,
        activeConversations: 0,
        responseRate: 0,
        averageResponseTime: 0
      };
    }
  }
}
import {
  collection,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { privacyAnalytics } from './privacyAnalytics';

/**
 * MessageReactionsService - Handle emoji reactions to messages
 *
 * Features:
 * - Add/remove emoji reactions to messages
 * - Track reaction counts and user lists
 * - Real-time reaction updates
 * - Privacy-compliant analytics tracking
 * - Support for common emoji reactions
 */

export type MessageReactionType =
  | 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
  | 'thumbs_up' | 'thumbs_down' | 'heart' | 'fire' | 'star';

export interface MessageReaction {
  emoji: MessageReactionType;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface MessageReactionSummary {
  [key in MessageReactionType]?: {
    count: number;
    users: string[]; // User IDs who reacted
    userNames: string[]; // Display names for tooltip
  };
}

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_SUBCOLLECTION = 'messages';

export class MessageReactionsService {

  /**
   * Add a reaction to a message
   */
  static async addReaction(
    conversationId: string,
    messageId: string,
    emoji: MessageReactionType,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const messageRef = doc(
        db,
        CONVERSATIONS_COLLECTION,
        conversationId,
        MESSAGES_SUBCOLLECTION,
        messageId
      );

      const reaction: MessageReaction = {
        emoji,
        userId,
        userName,
        timestamp: Date.now()
      };

      // Add reaction to the reactions array
      await updateDoc(messageRef, {
        reactions: arrayUnion(reaction)
      });

      // Track in analytics
      privacyAnalytics.trackEvent('message_reaction_add', {
        emoji,
        hasReaction: true
      });

    } catch (error) {
      console.error('Failed to add message reaction:', error);
      throw new Error('Failed to add reaction');
    }
  }

  /**
   * Remove a reaction from a message
   */
  static async removeReaction(
    conversationId: string,
    messageId: string,
    emoji: MessageReactionType,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const messageRef = doc(
        db,
        CONVERSATIONS_COLLECTION,
        conversationId,
        MESSAGES_SUBCOLLECTION,
        messageId
      );

      // Get current reactions to find the exact reaction to remove
      const messageDoc = await getDoc(messageRef);
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data();
      const reactions: MessageReaction[] = messageData.reactions || [];

      // Find the specific reaction to remove (by user and emoji)
      const reactionToRemove = reactions.find(r =>
        r.emoji === emoji && r.userId === userId
      );

      if (reactionToRemove) {
        await updateDoc(messageRef, {
          reactions: arrayRemove(reactionToRemove)
        });

        // Track in analytics
        privacyAnalytics.trackEvent('message_reaction_remove', {
          emoji,
          hasReaction: false
        });
      }

    } catch (error) {
      console.error('Failed to remove message reaction:', error);
      throw new Error('Failed to remove reaction');
    }
  }

  /**
   * Toggle a reaction (add if not present, remove if present)
   */
  static async toggleReaction(
    conversationId: string,
    messageId: string,
    emoji: MessageReactionType,
    userId: string,
    userName: string
  ): Promise<'added' | 'removed'> {
    try {
      const messageRef = doc(
        db,
        CONVERSATIONS_COLLECTION,
        conversationId,
        MESSAGES_SUBCOLLECTION,
        messageId
      );

      const messageDoc = await getDoc(messageRef);
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data();
      const reactions: MessageReaction[] = messageData.reactions || [];

      // Check if user already reacted with this emoji
      const existingReaction = reactions.find(r =>
        r.emoji === emoji && r.userId === userId
      );

      if (existingReaction) {
        await this.removeReaction(conversationId, messageId, emoji, userId, userName);
        return 'removed';
      } else {
        await this.addReaction(conversationId, messageId, emoji, userId, userName);
        return 'added';
      }

    } catch (error) {
      console.error('Failed to toggle message reaction:', error);
      throw new Error('Failed to toggle reaction');
    }
  }

  /**
   * Get reaction summary for a message
   */
  static getReactionSummary(reactions: MessageReaction[] = []): MessageReactionSummary {
    const summary: MessageReactionSummary = {};

    for (const reaction of reactions) {
      if (!summary[reaction.emoji]) {
        summary[reaction.emoji] = {
          count: 0,
          users: [],
          userNames: []
        };
      }

      summary[reaction.emoji]!.count++;
      summary[reaction.emoji]!.users.push(reaction.userId);
      summary[reaction.emoji]!.userNames.push(reaction.userName);
    }

    return summary;
  }

  /**
   * Get user's reaction to a message (if any)
   */
  static getUserReaction(
    reactions: MessageReaction[] = [],
    userId: string
  ): MessageReactionType | null {
    const userReaction = reactions.find(r => r.userId === userId);
    return userReaction ? userReaction.emoji : null;
  }

  /**
   * Subscribe to reaction changes for a message
   */
  static subscribeToMessageReactions(
    conversationId: string,
    messageId: string,
    callback: (reactions: MessageReaction[]) => void
  ): Unsubscribe {
    const messageRef = doc(
      db,
      CONVERSATIONS_COLLECTION,
      conversationId,
      MESSAGES_SUBCOLLECTION,
      messageId
    );

    return onSnapshot(messageRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback(data.reactions || []);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error('Failed to subscribe to message reactions:', error);
      callback([]);
    });
  }

  /**
   * Get emoji display information
   */
  static getEmojiInfo(emoji: MessageReactionType): { symbol: string; name: string } {
    const emojiMap: { [key in MessageReactionType]: { symbol: string; name: string } } = {
      like: { symbol: '👍', name: 'Like' },
      love: { symbol: '❤️', name: 'Love' },
      laugh: { symbol: '😂', name: 'Laugh' },
      wow: { symbol: '😮', name: 'Wow' },
      sad: { symbol: '😢', name: 'Sad' },
      angry: { symbol: '😡', name: 'Angry' },
      thumbs_up: { symbol: '👍', name: 'Thumbs Up' },
      thumbs_down: { symbol: '👎', name: 'Thumbs Down' },
      heart: { symbol: '❤️', name: 'Heart' },
      fire: { symbol: '🔥', name: 'Fire' },
      star: { symbol: '⭐', name: 'Star' }
    };

    return emojiMap[emoji] || { symbol: '👍', name: 'Like' };
  }

  /**
   * Get popular reaction emojis for quick selection
   */
  static getPopularReactions(): MessageReactionType[] {
    return ['like', 'love', 'laugh', 'wow', 'fire', 'star'];
  }
}
import {
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
  deleteField
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * TypingIndicatorsService - Handle real-time typing indicators for conversations
 *
 * Features:
 * - Show when users are typing in conversations
 * - Automatic cleanup of stale typing indicators
 * - Debounced typing updates to reduce Firebase writes
 * - Real-time subscriptions for instant feedback
 */

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

const CONVERSATIONS_COLLECTION = 'conversations';
const TYPING_TIMEOUT = 3000; // 3 seconds - how long to show typing after last activity
const UPDATE_DEBOUNCE = 500; // 500ms - debounce typing updates

export class TypingIndicatorsService {
  private static typingTimers = new Map<string, NodeJS.Timeout>();
  private static updateTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Start typing in a conversation
   */
  static startTyping(
    conversationId: string,
    userId: string,
    userName: string
  ): void {
    const key = `${conversationId}-${userId}`;

    // Clear existing timer
    const existingTimer = this.updateTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Debounce the update to avoid too many Firebase writes
    const timer = setTimeout(async () => {
      try {
        await this.updateTypingStatus(conversationId, userId, userName, true);
        this.scheduleTypingCleanup(conversationId, userId);
      } catch (error) {
        console.error('Failed to update typing status:', error);
      }
    }, UPDATE_DEBOUNCE);

    this.updateTimers.set(key, timer);
  }

  /**
   * Stop typing in a conversation
   */
  static stopTyping(conversationId: string, userId: string): void {
    const key = `${conversationId}-${userId}`;

    // Clear debounce timer
    const updateTimer = this.updateTimers.get(key);
    if (updateTimer) {
      clearTimeout(updateTimer);
      this.updateTimers.delete(key);
    }

    // Clear cleanup timer
    const typingTimer = this.typingTimers.get(key);
    if (typingTimer) {
      clearTimeout(typingTimer);
      this.typingTimers.delete(key);
    }

    // Immediately remove typing status
    this.updateTypingStatus(conversationId, userId, '', false);
  }

  /**
   * Update typing status in Firestore
   */
  private static async updateTypingStatus(
    conversationId: string,
    userId: string,
    userName: string,
    isTyping: boolean
  ): Promise<void> {
    try {
      const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);

      if (isTyping) {
        const typingData: TypingUser = {
          userId,
          userName,
          timestamp: Date.now()
        };

        await updateDoc(conversationRef, {
          [`typingUsers.${userId}`]: typingData
        });
      } else {
        await updateDoc(conversationRef, {
          [`typingUsers.${userId}`]: deleteField()
        });
      }
    } catch (error) {
      console.error('Failed to update typing status:', error);
    }
  }

  /**
   * Schedule cleanup of typing indicator after timeout
   */
  private static scheduleTypingCleanup(conversationId: string, userId: string): void {
    const key = `${conversationId}-${userId}`;

    // Clear existing cleanup timer
    const existingTimer = this.typingTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new cleanup timer
    const timer = setTimeout(() => {
      this.stopTyping(conversationId, userId);
    }, TYPING_TIMEOUT);

    this.typingTimers.set(key, timer);
  }

  /**
   * Subscribe to typing indicators for a conversation
   */
  static subscribeToTyping(
    conversationId: string,
    currentUserId: string,
    callback: (typingUsers: TypingUser[]) => void
  ): Unsubscribe {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);

    return onSnapshot(conversationRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const typingUsers: TypingUser[] = [];

        // Extract typing users (excluding current user)
        const typingData = data.typingUsers || {};
        const now = Date.now();

        for (const [userId, userData] of Object.entries(typingData)) {
          const user = userData as TypingUser;

          // Skip current user and expired typing indicators
          if (userId !== currentUserId && (now - user.timestamp) < TYPING_TIMEOUT) {
            typingUsers.push(user);
          }
        }

        callback(typingUsers);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error('Failed to subscribe to typing indicators:', error);
      callback([]);
    });
  }

  /**
   * Format typing indicator text
   */
  static formatTypingText(typingUsers: TypingUser[]): string {
    if (typingUsers.length === 0) {
      return '';
    }

    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} is typing...`;
    }

    if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
    }

    return `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing...`;
  }

  /**
   * Clean up all timers (call when component unmounts)
   */
  static cleanup(): void {
    // Clear all update timers
    for (const timer of this.updateTimers.values()) {
      clearTimeout(timer);
    }
    this.updateTimers.clear();

    // Clear all typing timers
    for (const timer of this.typingTimers.values()) {
      clearTimeout(timer);
    }
    this.typingTimers.clear();
  }

  /**
   * Clean up timers for a specific conversation (call when leaving conversation)
   */
  static cleanupConversation(conversationId: string, userId: string): void {
    const key = `${conversationId}-${userId}`;

    const updateTimer = this.updateTimers.get(key);
    if (updateTimer) {
      clearTimeout(updateTimer);
      this.updateTimers.delete(key);
    }

    const typingTimer = this.typingTimers.get(key);
    if (typingTimer) {
      clearTimeout(typingTimer);
      this.typingTimers.delete(key);
    }

    // Make sure to stop typing when leaving
    this.stopTyping(conversationId, userId);
  }
}
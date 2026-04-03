import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { BlockingService } from './blocking';
import type { Message } from '../types/user';

const MESSAGES_COLLECTION = 'messages';

export class FirebaseMessagesService {
  /**
   * Send a message
   */
  static async send(
    fromUserId: string,
    fromDisplayName: string,
    toUserId: string,
    subject: string,
    message: string,
    figureId?: string,
    figureName?: string
  ): Promise<Message | null> {
    try {
      // Check if users are blocked
      if (BlockingService.isUserBlocked(fromUserId, toUserId) ||
          BlockingService.isUserBlocked(toUserId, fromUserId)) {
        console.warn('Cannot send message between blocked users');
        return null;
      }

      const messageData = {
        fromUserId,
        fromDisplayName,
        toUserId,
        subject,
        message,
        figureId: figureId || null,
        figureName: figureName || null,
        timestamp: Date.now(),
        read: false
      };

      const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), messageData);

      return {
        id: docRef.id,
        ...messageData
      };
    } catch (error) {
      console.error('Failed to send message:', error);
      return null;
    }
  }

  /**
   * Get inbox messages for a user
   */
  static async getInbox(userId: string): Promise<Message[]> {
    try {
      const q = query(
        collection(db, MESSAGES_COLLECTION),
        where('toUserId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));

      // Filter out messages from blocked users
      return messages.filter(m =>
        !BlockingService.isUserBlocked(userId, m.fromUserId) &&
        !BlockingService.isUserBlocked(m.fromUserId, userId)
      );
    } catch (error) {
      console.error('Failed to get inbox:', error);
      return [];
    }
  }

  /**
   * Get sent messages for a user
   */
  static async getSent(userId: string): Promise<Message[]> {
    try {
      const q = query(
        collection(db, MESSAGES_COLLECTION),
        where('fromUserId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));

      // Filter out messages to blocked users
      return messages.filter(m =>
        !BlockingService.isUserBlocked(userId, m.toUserId) &&
        !BlockingService.isUserBlocked(m.toUserId, userId)
      );
    } catch (error) {
      console.error('Failed to get sent messages:', error);
      return [];
    }
  }

  /**
   * Mark message as read
   */
  static async markAsRead(messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
      await updateDoc(messageRef, {
        read: true
      });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }

  /**
   * Mark all messages as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, MESSAGES_COLLECTION),
        where('toUserId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(doc =>
        updateDoc(doc.ref, { read: true })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }

  /**
   * Delete a message
   */
  static async delete(messageId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, MESSAGES_COLLECTION, messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, MESSAGES_COLLECTION),
        where('toUserId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Get a single message by ID
   */
  static async getById(messageId: string): Promise<Message | null> {
    try {
      const messageDoc = await getDoc(doc(db, MESSAGES_COLLECTION, messageId));

      if (!messageDoc.exists()) {
        return null;
      }

      return {
        id: messageDoc.id,
        ...messageDoc.data()
      } as Message;
    } catch (error) {
      console.error('Failed to get message:', error);
      return null;
    }
  }
}

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  writeBatch,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Notification } from '../types/notification';

export class FirebaseNotifications {
  private static readonly NOTIFICATIONS_COLLECTION = 'notifications';
  private static readonly MAX_NOTIFICATIONS = 50; // Keep only last 50 per user

  /**
   * Create a new comment notification
   */
  static async createCommentNotification(
    figureOwnerId: string,
    figureId: string,
    figureName: string,
    figureImage: string | undefined,
    commentId: string,
    commentText: string,
    actorId: string,
    actorName: string,
    actorUsername: string
  ): Promise<void> {
    // Don't notify yourself
    if (figureOwnerId === actorId) return;

    await addDoc(collection(db, this.NOTIFICATIONS_COLLECTION), {
      userId: figureOwnerId,
      type: 'comment',
      read: false,
      timestamp: Date.now(),
      commentId,
      figureId,
      figureName,
      figureImage: figureImage || '',
      actorId,
      actorName,
      actorUsername,
      text: this.truncateText(commentText, 100),
      actionUrl: `/browse/${figureOwnerId}?figure=${figureId}`,
    });

    // Clean up old notifications
    await this.cleanupOldNotifications(figureOwnerId);
  }

  /**
   * Create a mention notification
   */
  static async createMentionNotification(
    mentionedUserId: string,
    figureId: string,
    figureName: string,
    figureImage: string | undefined,
    commentId: string,
    commentText: string,
    actorId: string,
    actorName: string,
    actorUsername: string
  ): Promise<void> {
    // Don't notify yourself
    if (mentionedUserId === actorId) return;

    await addDoc(collection(db, this.NOTIFICATIONS_COLLECTION), {
      userId: mentionedUserId,
      type: 'mention',
      read: false,
      timestamp: Date.now(),
      commentId,
      figureId,
      figureName,
      figureImage: figureImage || '',
      actorId,
      actorName,
      actorUsername,
      text: this.truncateText(commentText, 100),
      actionUrl: `/browse?figure=${figureId}`,
    });

    await this.cleanupOldNotifications(mentionedUserId);
  }

  /**
   * Create a report notification (for figure owner)
   */
  static async createReportNotification(
    figureOwnerId: string,
    figureId: string,
    figureName: string,
    commentId: string,
    reportId: string,
    reportReason: string,
    actorId: string,
    actorName: string
  ): Promise<void> {
    await addDoc(collection(db, this.NOTIFICATIONS_COLLECTION), {
      userId: figureOwnerId,
      type: 'report',
      read: false,
      timestamp: Date.now(),
      commentId,
      figureId,
      figureName,
      reportId,
      reportReason,
      actorId,
      actorName,
      text: `A comment was reported: ${this.truncateText(reportReason, 80)}`,
      actionUrl: `/browse/${figureOwnerId}?figure=${figureId}`,
    });

    await this.cleanupOldNotifications(figureOwnerId);
  }

  /**
   * Create a like notification
   */
  static async createLikeNotification(
    commentOwnerId: string,
    figureId: string,
    figureName: string,
    commentId: string,
    actorId: string,
    actorName: string,
    actorUsername: string
  ): Promise<void> {
    // Don't notify yourself
    if (commentOwnerId === actorId) return;

    await addDoc(collection(db, this.NOTIFICATIONS_COLLECTION), {
      userId: commentOwnerId,
      type: 'like',
      read: false,
      timestamp: Date.now(),
      commentId,
      figureId,
      figureName,
      actorId,
      actorName,
      actorUsername,
      text: 'liked your comment',
      actionUrl: `/browse?figure=${figureId}`,
    });

    await this.cleanupOldNotifications(commentOwnerId);
  }

  /**
   * Create a formula access request notification
   */
  static async createFormulaAccessRequestNotification(
    figureOwnerId: string,
    figureId: string,
    figureName: string,
    figureImage: string | undefined,
    requesterId: string,
    requesterName: string,
    requesterUsername: string
  ): Promise<void> {
    // Don't notify yourself
    if (figureOwnerId === requesterId) return;

    await addDoc(collection(db, this.NOTIFICATIONS_COLLECTION), {
      userId: figureOwnerId,
      type: 'formula_access_request',
      read: false,
      timestamp: Date.now(),
      figureId,
      figureName,
      figureImage: figureImage || '',
      actorId: requesterId,
      actorName: requesterName,
      actorUsername: requesterUsername,
      text: 'wants to view your custom formula',
      actionUrl: `/browse/${figureOwnerId}?figure=${figureId}`,
    });

    await this.cleanupOldNotifications(figureOwnerId);
  }

  /**
   * Get all notifications for a user
   */
  static async getNotifications(userId: string, limitCount: number = 20): Promise<Notification[]> {
    const q = query(
      collection(db, this.NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Notification));
  }

  /**
   * Subscribe to real-time notifications
   */
  static subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
  ): () => void {
    const q = query(
      collection(db, this.NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Notification));
      callback(notifications);
    });
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(db, this.NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, {
      read: true,
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const q = query(
      collection(db, this.NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { read: true });
    });

    await batch.commit();
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    const notificationRef = doc(db, this.NOTIFICATIONS_COLLECTION, notificationId);
    await deleteDoc(notificationRef);
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const q = query(
      collection(db, this.NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  /**
   * Clean up old notifications (keep only last MAX_NOTIFICATIONS)
   */
  private static async cleanupOldNotifications(userId: string): Promise<void> {
    const q = query(
      collection(db, this.NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);

    if (snapshot.size > this.MAX_NOTIFICATIONS) {
      const batch = writeBatch(db);
      const docsToDelete = snapshot.docs.slice(this.MAX_NOTIFICATIONS);

      docsToDelete.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();
    }
  }

  /**
   * Truncate text to max length
   */
  private static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Extract @mentions from comment text
   */
  static extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]); // username without @
    }

    return [...new Set(mentions)]; // Remove duplicates
  }
}

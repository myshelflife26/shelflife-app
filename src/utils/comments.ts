import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot, getDocs, getDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Comment } from '../types/comment';
import { FirebaseNotifications } from './firebaseNotifications';

export class CommentsService {
  private static readonly COMMENTS_COLLECTION = 'comments';
  private static readonly FIGURES_COLLECTION = 'figures';
  private static readonly RATE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes
  private static readonly MAX_COMMENTS_PER_PERIOD = 5;
  private static readonly MIN_COMMENT_LENGTH = 10;
  private static readonly MAX_COMMENT_LENGTH = 1000;

  /**
   * Add a new comment to a figure
   */
  static async addComment(
    figureId: string,
    userId: string,
    userDisplayName: string,
    userUsername: string,
    text: string
  ): Promise<Comment> {
    // Validate comment text
    if (text.length < this.MIN_COMMENT_LENGTH) {
      throw new Error(`Comment must be at least ${this.MIN_COMMENT_LENGTH} characters`);
    }
    if (text.length > this.MAX_COMMENT_LENGTH) {
      throw new Error(`Comment must be less than ${this.MAX_COMMENT_LENGTH} characters`);
    }

    // Check rate limit
    await this.checkRateLimit(userId);

    // Get figure to check if comments are enabled and user is not blocked
    const figureDoc = await getDoc(doc(db, this.FIGURES_COLLECTION, figureId));
    if (!figureDoc.exists()) {
      throw new Error('Figure not found');
    }

    const figureData = figureDoc.data();

    // Check if comments are enabled
    if (figureData.commentsEnabled === false) {
      throw new Error('Comments are disabled for this figure');
    }

    // Check if comments are locked
    if (figureData.commentsLocked === true) {
      throw new Error('Comments are locked for this figure');
    }

    // Check if user is blocked
    const blockedUsers = figureData.blockedFromCommenting || [];
    if (blockedUsers.includes(userId)) {
      throw new Error('You are blocked from commenting on this figure');
    }

    // Determine if comment needs approval
    const requiresApproval = figureData.requireCommentApproval === true;
    const isOwner = figureData.userId === userId;

    const commentData: Omit<Comment, 'id'> = {
      figureId,
      userId,
      userDisplayName,
      userUsername,
      text,
      timestamp: Date.now(),
      edited: false,
      likes: [],
      hidden: false,
      approved: !requiresApproval || isOwner, // Auto-approve if no pre-moderation or user is owner
      pinned: false,
    };

    // Add comment to Firestore
    const docRef = await addDoc(collection(db, this.COMMENTS_COLLECTION), commentData);

    // Update figure comment count if auto-approved
    if (commentData.approved) {
      await this.updateCommentCount(figureId, 1);

      // Create notification for figure owner (if not commenting on own figure)
      if (figureData.userId && figureData.userId !== userId) {
        await FirebaseNotifications.createCommentNotification(
          figureData.userId,
          figureId,
          figureData.name || 'your figure',
          figureData.images?.[0],
          docRef.id,
          text,
          userId,
          userDisplayName,
          userUsername
        );
      }

      // Extract and notify @mentioned users
      const mentions = FirebaseNotifications.extractMentions(text);
      for (const mentionedUsername of mentions) {
        // Look up user ID by username
        const FirebaseAuthService = (await import('./firebaseAuth')).FirebaseAuthService;
        const mentionedUser = await FirebaseAuthService.getUserByUsername(mentionedUsername);

        if (mentionedUser && mentionedUser.id !== userId) {
          // Send mention notification
          await FirebaseNotifications.createMentionNotification(
            mentionedUser.id,
            figureId,
            figureName,
            figureImage,
            userId,
            userDisplayName,
            userUsername,
            text
          );
        }
      }
    }

    return {
      id: docRef.id,
      ...commentData,
    };
  }

  /**
   * Check if user has exceeded rate limit
   */
  private static async checkRateLimit(userId: string): Promise<void> {
    const cutoffTime = Date.now() - this.RATE_LIMIT_MS;
    const q = query(
      collection(db, this.COMMENTS_COLLECTION),
      where('userId', '==', userId),
      where('timestamp', '>=', cutoffTime)
    );

    const snapshot = await getDocs(q);
    if (snapshot.size >= this.MAX_COMMENTS_PER_PERIOD) {
      throw new Error('You are commenting too frequently. Please wait a few minutes.');
    }
  }

  /**
   * Get all comments for a figure
   */
  static async getComments(figureId: string, includeHidden: boolean = false): Promise<Comment[]> {
    const constraints = [
      where('figureId', '==', figureId),
      where('approved', '==', true),
      orderBy('timestamp', 'asc')
    ];

    if (!includeHidden) {
      constraints.push(where('hidden', '==', false));
    }

    const q = query(collection(db, this.COMMENTS_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Comment));
  }

  /**
   * Get pending comments awaiting approval
   */
  static async getPendingComments(figureId: string): Promise<Comment[]> {
    const q = query(
      collection(db, this.COMMENTS_COLLECTION),
      where('figureId', '==', figureId),
      where('approved', '==', false),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Comment));
  }

  /**
   * Subscribe to comments in real-time
   */
  static subscribeToComments(
    figureId: string,
    includeHidden: boolean,
    callback: (comments: Comment[]) => void
  ): () => void {
    const constraints = [
      where('figureId', '==', figureId),
      where('approved', '==', true),
      orderBy('timestamp', 'asc')
    ];

    if (!includeHidden) {
      constraints.push(where('hidden', '==', false));
    }

    const q = query(collection(db, this.COMMENTS_COLLECTION), ...constraints);

    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Comment));
      callback(comments);
    });
  }

  /**
   * Update a comment's text
   */
  static async updateComment(commentId: string, text: string): Promise<void> {
    if (text.length < this.MIN_COMMENT_LENGTH) {
      throw new Error(`Comment must be at least ${this.MIN_COMMENT_LENGTH} characters`);
    }
    if (text.length > this.MAX_COMMENT_LENGTH) {
      throw new Error(`Comment must be less than ${this.MAX_COMMENT_LENGTH} characters`);
    }

    const commentRef = doc(db, this.COMMENTS_COLLECTION, commentId);
    await updateDoc(commentRef, {
      text,
      edited: true,
      editedAt: Date.now(),
    });
  }

  /**
   * Delete a comment
   */
  static async deleteComment(commentId: string, figureId: string, wasApproved: boolean): Promise<void> {
    const commentRef = doc(db, this.COMMENTS_COLLECTION, commentId);
    await deleteDoc(commentRef);

    // Decrement comment count if comment was approved
    if (wasApproved) {
      await this.updateCommentCount(figureId, -1);
    }
  }

  /**
   * Hide/unhide a comment (owner moderation)
   */
  static async hideComment(commentId: string, hidden: boolean, hiddenBy?: string): Promise<void> {
    const commentRef = doc(db, this.COMMENTS_COLLECTION, commentId);
    await updateDoc(commentRef, {
      hidden,
      hiddenBy: hidden ? hiddenBy : null,
    });
  }

  /**
   * Pin/unpin a comment (owner moderation)
   */
  static async pinComment(commentId: string, pinned: boolean): Promise<void> {
    const commentRef = doc(db, this.COMMENTS_COLLECTION, commentId);
    await updateDoc(commentRef, {
      pinned,
    });
  }

  /**
   * Approve a comment (for pre-moderation)
   */
  static async approveComment(commentId: string, figureId: string): Promise<void> {
    const commentRef = doc(db, this.COMMENTS_COLLECTION, commentId);
    await updateDoc(commentRef, {
      approved: true,
    });

    // Increment comment count
    await this.updateCommentCount(figureId, 1);
  }

  /**
   * Toggle like on a comment
   */
  static async toggleLike(commentId: string, userId: string): Promise<void> {
    const commentRef = doc(db, this.COMMENTS_COLLECTION, commentId);
    const commentDoc = await getDoc(commentRef);

    if (!commentDoc.exists()) {
      throw new Error('Comment not found');
    }

    const comment = commentDoc.data() as Comment;
    const likes = comment.likes || [];
    const hasLiked = likes.includes(userId);

    if (hasLiked) {
      // Remove like
      await updateDoc(commentRef, {
        likes: likes.filter(id => id !== userId),
      });
    } else {
      // Add like
      await updateDoc(commentRef, {
        likes: [...likes, userId],
      });
    }
  }

  /**
   * Block a user from commenting on a figure
   */
  static async blockUserFromFigure(figureId: string, userId: string): Promise<void> {
    const figureRef = doc(db, this.FIGURES_COLLECTION, figureId);
    const figureDoc = await getDoc(figureRef);

    if (!figureDoc.exists()) {
      throw new Error('Figure not found');
    }

    const figureData = figureDoc.data();
    const blockedUsers = figureData.blockedFromCommenting || [];

    if (!blockedUsers.includes(userId)) {
      await updateDoc(figureRef, {
        blockedFromCommenting: [...blockedUsers, userId],
      });
    }
  }

  /**
   * Unblock a user from commenting on a figure
   */
  static async unblockUserFromFigure(figureId: string, userId: string): Promise<void> {
    const figureRef = doc(db, this.FIGURES_COLLECTION, figureId);
    const figureDoc = await getDoc(figureRef);

    if (!figureDoc.exists()) {
      throw new Error('Figure not found');
    }

    const figureData = figureDoc.data();
    const blockedUsers = figureData.blockedFromCommenting || [];

    await updateDoc(figureRef, {
      blockedFromCommenting: blockedUsers.filter((id: string) => id !== userId),
    });
  }

  /**
   * Update figure comment settings
   */
  static async updateFigureCommentSettings(
    figureId: string,
    settings: {
      commentsEnabled?: boolean;
      commentsLocked?: boolean;
      requireCommentApproval?: boolean;
    }
  ): Promise<void> {
    const figureRef = doc(db, this.FIGURES_COLLECTION, figureId);
    await updateDoc(figureRef, settings);
  }

  /**
   * Update comment count on figure
   */
  private static async updateCommentCount(figureId: string, delta: number): Promise<void> {
    const figureRef = doc(db, this.FIGURES_COLLECTION, figureId);
    const figureDoc = await getDoc(figureRef);

    if (!figureDoc.exists()) {
      return;
    }

    const currentCount = figureDoc.data().commentCount || 0;
    const newCount = Math.max(0, currentCount + delta);

    await updateDoc(figureRef, {
      commentCount: newCount,
    });
  }

  /**
   * Get comment count for a figure
   */
  static async getCommentCount(figureId: string): Promise<number> {
    const q = query(
      collection(db, this.COMMENTS_COLLECTION),
      where('figureId', '==', figureId),
      where('approved', '==', true),
      where('hidden', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  }
}

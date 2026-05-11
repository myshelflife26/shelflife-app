import { db } from '../config/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from 'firebase/firestore';
import type { Comment } from '../types/comment';

const COMMENTS_COLLECTION = 'comments';
const FIGURES_COLLECTION = 'figures';

// Rate limiting constants
const RATE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes
const MAX_COMMENTS_PER_PERIOD = 5;

export class FirebaseCommentsService {
  /**
   * Add a new comment
   */
  static async addComment(
    figureId: string,
    userId: string,
    userName: string,
    userDisplayName: string,
    text: string
  ): Promise<string> {
    try {
      const commentData = {
        figureId,
        userId,
        userName,
        userDisplayName,
        text,
        timestamp: Date.now(),
        likes: [],
        edited: false,
      };

      const docRef = await addDoc(collection(db, COMMENTS_COLLECTION), commentData);
      return docRef.id;
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }

  /**
   * Get all comments for a figure
   */
  static async getCommentsForFigure(figureId: string): Promise<Comment[]> {
    try {
      const q = query(
        collection(db, COMMENTS_COLLECTION),
        where('figureId', '==', figureId),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const comments: Comment[] = [];

      querySnapshot.forEach((doc) => {
        comments.push({
          id: doc.id,
          ...doc.data(),
        } as Comment);
      });

      return comments;
    } catch (error) {
      console.error('Failed to get comments:', error);
      return [];
    }
  }

  /**
   * Get comment count for a figure
   */
  static async getCommentCount(figureId: string): Promise<number> {
    try {
      const q = query(
        collection(db, COMMENTS_COLLECTION),
        where('figureId', '==', figureId)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Failed to get comment count:', error);
      return 0;
    }
  }

  /**
   * Get comment counts for multiple figures
   */
  static async getCommentCounts(figureIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();

    if (figureIds.length === 0) return counts;

    try {
      // Firestore 'in' query has a limit of 10 items, so we need to batch
      const batchSize = 10;
      for (let i = 0; i < figureIds.length; i += batchSize) {
        const batch = figureIds.slice(i, i + batchSize);

        const q = query(
          collection(db, COMMENTS_COLLECTION),
          where('figureId', 'in', batch)
        );

        const querySnapshot = await getDocs(q);

        // Count comments per figure
        batch.forEach(figureId => counts.set(figureId, 0));

        querySnapshot.forEach((doc) => {
          const figureId = doc.data().figureId;
          counts.set(figureId, (counts.get(figureId) || 0) + 1);
        });
      }

      return counts;
    } catch (error) {
      console.error('Failed to get comment counts:', error);
      return counts;
    }
  }

  /**
   * Update a comment
   */
  static async updateComment(commentId: string, text: string): Promise<void> {
    try {
      const commentRef = doc(db, COMMENTS_COLLECTION, commentId);
      await updateDoc(commentRef, {
        text,
        edited: true,
        editedAt: Date.now(),
      });
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  }

  /**
   * Delete a comment
   */
  static async deleteComment(commentId: string): Promise<void> {
    try {
      const commentRef = doc(db, COMMENTS_COLLECTION, commentId);
      await deleteDoc(commentRef);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }

  /**
   * Toggle like on a comment
   */
  static async toggleLike(commentId: string, userId: string): Promise<void> {
    try {
      const commentRef = doc(db, COMMENTS_COLLECTION, commentId);

      // First, get the current comment to check if user has already liked
      const comments = await this.getCommentsForFigure(''); // We need a better way to get single comment
      // For now, we'll use arrayUnion/arrayRemove which handles duplicates

      // Try to remove first
      const commentSnapshot = await getDocs(query(
        collection(db, COMMENTS_COLLECTION),
        where('__name__', '==', commentId)
      ));

      if (!commentSnapshot.empty) {
        const comment = commentSnapshot.docs[0].data() as Comment;
        const hasLiked = comment.likes.includes(userId);

        if (hasLiked) {
          // Remove like
          await updateDoc(commentRef, {
            likes: arrayRemove(userId),
          });
        } else {
          // Add like
          await updateDoc(commentRef, {
            likes: arrayUnion(userId),
          });
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      throw error;
    }
  }

  /**
   * Get recent comments for a user's figures (for notifications)
   */
  static async getRecentCommentsOnUserFigures(
    userId: string,
    figureIds: string[],
    since: number
  ): Promise<Comment[]> {
    if (figureIds.length === 0) return [];

    try {
      const comments: Comment[] = [];

      // Batch queries for figureIds (10 at a time due to Firestore 'in' limit)
      const batchSize = 10;
      for (let i = 0; i < figureIds.length; i += batchSize) {
        const batch = figureIds.slice(i, i + batchSize);

        const q = query(
          collection(db, COMMENTS_COLLECTION),
          where('figureId', 'in', batch),
          where('timestamp', '>', since),
          orderBy('timestamp', 'desc'),
          firestoreLimit(50)
        );

        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
          const comment = { id: doc.id, ...doc.data() } as Comment;
          // Exclude comments by the user themselves
          if (comment.userId !== userId) {
            comments.push(comment);
          }
        });
      }

      return comments.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to get recent comments:', error);
      return [];
    }
  }

  // ========== MODERATION FEATURES ==========

  /**
   * Pin or unpin a comment (owner only)
   */
  static async pinComment(commentId: string, pinned: boolean): Promise<void> {
    try {
      const commentRef = doc(db, COMMENTS_COLLECTION, commentId);
      await updateDoc(commentRef, { pinned });
    } catch (error) {
      console.error('Failed to pin comment:', error);
      throw error;
    }
  }

  /**
   * Hide or unhide a comment (owner only)
   */
  static async hideComment(commentId: string, hidden: boolean, hiddenBy?: string): Promise<void> {
    try {
      const commentRef = doc(db, COMMENTS_COLLECTION, commentId);
      await updateDoc(commentRef, {
        hidden,
        hiddenBy: hidden ? hiddenBy : null,
      });
    } catch (error) {
      console.error('Failed to hide comment:', error);
      throw error;
    }
  }

  /**
   * Approve a comment for pre-moderation mode
   */
  static async approveComment(commentId: string, figureId: string): Promise<void> {
    try {
      const commentRef = doc(db, COMMENTS_COLLECTION, commentId);
      await updateDoc(commentRef, { approved: true });

      // Update figure comment count
      const figureRef = doc(db, FIGURES_COLLECTION, figureId);
      const figureDoc = await getDoc(figureRef);
      if (figureDoc.exists()) {
        const currentCount = figureDoc.data().commentCount || 0;
        await updateDoc(figureRef, { commentCount: currentCount + 1 });
      }
    } catch (error) {
      console.error('Failed to approve comment:', error);
      throw error;
    }
  }

  /**
   * Get pending comments awaiting approval
   */
  static async getPendingComments(figureId: string): Promise<Comment[]> {
    try {
      const q = query(
        collection(db, COMMENTS_COLLECTION),
        where('figureId', '==', figureId),
        where('approved', '==', false),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const comments: Comment[] = [];

      querySnapshot.forEach((doc) => {
        comments.push({
          id: doc.id,
          ...doc.data(),
        } as Comment);
      });

      return comments;
    } catch (error) {
      console.error('Failed to get pending comments:', error);
      return [];
    }
  }

  /**
   * Block a user from commenting on a figure
   */
  static async blockUserFromFigure(figureId: string, userId: string): Promise<void> {
    try {
      const figureRef = doc(db, FIGURES_COLLECTION, figureId);
      await updateDoc(figureRef, {
        blockedFromCommenting: arrayUnion(userId),
      });
    } catch (error) {
      console.error('Failed to block user:', error);
      throw error;
    }
  }

  /**
   * Unblock a user from commenting on a figure
   */
  static async unblockUserFromFigure(figureId: string, userId: string): Promise<void> {
    try {
      const figureRef = doc(db, FIGURES_COLLECTION, figureId);
      await updateDoc(figureRef, {
        blockedFromCommenting: arrayRemove(userId),
      });
    } catch (error) {
      console.error('Failed to unblock user:', error);
      throw error;
    }
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
    try {
      const figureRef = doc(db, FIGURES_COLLECTION, figureId);
      await updateDoc(figureRef, settings);
    } catch (error) {
      console.error('Failed to update comment settings:', error);
      throw error;
    }
  }

  /**
   * Subscribe to comments in real-time
   */
  static subscribeToComments(
    figureId: string,
    includeHidden: boolean,
    callback: (comments: Comment[]) => void
  ): () => void {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where('figureId', '==', figureId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Comment))
        .filter(comment => {
          // Filter out hidden comments unless includeHidden is true
          if (!includeHidden && comment.hidden) return false;
          // Only show approved comments (or all if approved field doesn't exist)
          return comment.approved !== false;
        });

      callback(comments);
    });
  }
}

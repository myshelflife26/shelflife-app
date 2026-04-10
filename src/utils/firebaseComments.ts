import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import type { Comment } from '../types/comment';

const COMMENTS_COLLECTION = 'comments';

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
}

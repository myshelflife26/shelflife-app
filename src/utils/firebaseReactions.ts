import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  deleteDoc,
  updateDoc,
  writeBatch,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Reaction, ReactionType } from '../types/user';

const REACTIONS_COLLECTION = 'reactions';

export interface ReactionStats {
  appreciate: number;
  love: number;
  fire: number;
  total: number;
}

export class FirebaseReactionsService {
  /**
   * Add or update a reaction
   */
  static async react(
    figureId: string,
    ownerId: string,
    userId: string,
    displayName: string,
    reactionType: ReactionType
  ): Promise<Reaction | null> {
    try {
      // Check if user already reacted to this figure
      const q = query(
        collection(db, REACTIONS_COLLECTION),
        where('figureId', '==', figureId),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);

      const timestamp = Date.now();

      if (!snapshot.empty) {
        // Update existing reaction
        const reactionDoc = snapshot.docs[0];
        await updateDoc(doc(db, REACTIONS_COLLECTION, reactionDoc.id), {
          reactionType,
          timestamp
        });

        return {
          id: reactionDoc.id,
          figureId,
          userId,
          displayName,
          reactionType,
          timestamp
        };
      } else {
        // Create new reaction
        const reactionData = {
          figureId,
          ownerId,
          userId,
          displayName,
          reactionType,
          timestamp
        };

        const docRef = await addDoc(collection(db, REACTIONS_COLLECTION), reactionData);

        return {
          id: docRef.id,
          figureId,
          userId,
          displayName,
          reactionType,
          timestamp
        };
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
      return null;
    }
  }

  /**
   * Remove a reaction
   */
  static async removeReaction(figureId: string, userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, REACTIONS_COLLECTION),
        where('figureId', '==', figureId),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        await deleteDoc(snapshot.docs[0].ref);
      }
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  }

  /**
   * Toggle a reaction (add if not present, remove if present)
   */
  static async toggleReaction(
    figureId: string,
    ownerId: string,
    userId: string,
    displayName: string,
    reactionType: ReactionType
  ): Promise<void> {
    try {
      const currentReaction = await this.getUserReaction(figureId, userId);

      if (currentReaction?.reactionType === reactionType) {
        // Same reaction type - remove it
        await this.removeReaction(figureId, userId);
      } else {
        // Different or no reaction - add/update it
        await this.react(figureId, ownerId, userId, displayName, reactionType);
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  }

  /**
   * Get all reactions for a specific figure
   */
  static async getReactionsForFigure(figureId: string): Promise<Reaction[]> {
    try {
      const q = query(
        collection(db, REACTIONS_COLLECTION),
        where('figureId', '==', figureId)
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Reaction));
    } catch (error) {
      console.error('Failed to get reactions for figure:', error);
      return [];
    }
  }

  /**
   * Get reaction stats for a specific figure
   */
  static async getStatsForFigure(figureId: string): Promise<ReactionStats> {
    try {
      const reactions = await this.getReactionsForFigure(figureId);
      return {
        appreciate: reactions.filter(r => r.reactionType === 'appreciate').length,
        love: reactions.filter(r => r.reactionType === 'love').length,
        fire: reactions.filter(r => r.reactionType === 'fire').length,
        total: reactions.length
      };
    } catch (error) {
      console.error('Failed to get stats for figure:', error);
      return { appreciate: 0, love: 0, fire: 0, total: 0 };
    }
  }

  /**
   * Get current user's reaction to a figure (if any)
   */
  static async getUserReaction(figureId: string, userId: string): Promise<Reaction | null> {
    try {
      const q = query(
        collection(db, REACTIONS_COLLECTION),
        where('figureId', '==', figureId),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Reaction;
    } catch (error) {
      console.error('Failed to get user reaction:', error);
      return null;
    }
  }

  /**
   * Calculate jealousy score for a figure (excluding owner's own reactions)
   * Fire = 5 points, Love = 3 points, Appreciate = 1 point
   * Can optionally filter by timestamp to get historical score
   */
  static async getJealousyScore(
    figureId: string,
    ownerId: string,
    beforeTimestamp?: number
  ): Promise<number> {
    try {
      const reactions = await this.getReactionsForFigure(figureId);

      // Filter out owner's reactions
      let othersReactions = reactions.filter(r => r.userId !== ownerId);

      // If beforeTimestamp provided, only include reactions that existed before that time
      if (beforeTimestamp) {
        othersReactions = othersReactions.filter(r => r.timestamp <= beforeTimestamp);
      }

      const appreciate = othersReactions.filter(r => r.reactionType === 'appreciate').length;
      const love = othersReactions.filter(r => r.reactionType === 'love').length;
      const fire = othersReactions.filter(r => r.reactionType === 'fire').length;

      return appreciate * 1 + love * 3 + fire * 5;
    } catch (error) {
      console.error('Failed to calculate jealousy score:', error);
      return 0;
    }
  }

  /**
   * Get jealousy stats for a figure (excluding owner's reactions)
   */
  static async getJealousyStats(figureId: string, ownerId: string): Promise<ReactionStats> {
    try {
      const reactions = await this.getReactionsForFigure(figureId);
      const othersReactions = reactions.filter(r => r.userId !== ownerId);

      return {
        appreciate: othersReactions.filter(r => r.reactionType === 'appreciate').length,
        love: othersReactions.filter(r => r.reactionType === 'love').length,
        fire: othersReactions.filter(r => r.reactionType === 'fire').length,
        total: othersReactions.length
      };
    } catch (error) {
      console.error('Failed to get jealousy stats:', error);
      return { appreciate: 0, love: 0, fire: 0, total: 0 };
    }
  }

  /**
   * Delete all reactions for a figure (used when figure is deleted)
   */
  static async deleteReactionsForFigure(figureId: string): Promise<void> {
    try {
      const q = query(
        collection(db, REACTIONS_COLLECTION),
        where('figureId', '==', figureId)
      );
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error('Failed to delete reactions for figure:', error);
    }
  }

  /**
   * Delete all reactions by a user (used when user is deleted)
   */
  static async deleteReactionsByUser(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, REACTIONS_COLLECTION),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error('Failed to delete reactions by user:', error);
    }
  }

  /**
   * Get all reactions for multiple figures (batch operation)
   */
  static async getReactionsForFigures(figureIds: string[]): Promise<Map<string, Reaction[]>> {
    try {
      const reactionsMap = new Map<string, Reaction[]>();

      // Firestore 'in' queries are limited to 10 items, so batch them
      const batchSize = 10;
      for (let i = 0; i < figureIds.length; i += batchSize) {
        const batch = figureIds.slice(i, i + batchSize);
        const q = query(
          collection(db, REACTIONS_COLLECTION),
          where('figureId', 'in', batch)
        );
        const snapshot = await getDocs(q);

        snapshot.docs.forEach(doc => {
          const reaction = { id: doc.id, ...doc.data() } as Reaction;
          const existing = reactionsMap.get(reaction.figureId) || [];
          reactionsMap.set(reaction.figureId, [...existing, reaction]);
        });
      }

      return reactionsMap;
    } catch (error) {
      console.error('Failed to get reactions for figures:', error);
      return new Map();
    }
  }

  /**
   * Migrate localStorage reactions to Firestore
   */
  static async migrateFromLocalStorage(): Promise<{ success: number; failed: number }> {
    try {
      const localStorageKey = 'app-reactions';
      const data = localStorage.getItem(localStorageKey);

      if (!data) {
        console.log('No localStorage reactions to migrate');
        return { success: 0, failed: 0 };
      }

      const reactions: Reaction[] = JSON.parse(data);
      console.log(`Found ${reactions.length} reactions to migrate`);

      let success = 0;
      let failed = 0;

      // Batch write for efficiency
      const batchSize = 500;
      for (let i = 0; i < reactions.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchReactions = reactions.slice(i, i + batchSize);

        for (const reaction of batchReactions) {
          try {
            // Check if reaction already exists in Firestore
            const q = query(
              collection(db, REACTIONS_COLLECTION),
              where('figureId', '==', reaction.figureId),
              where('userId', '==', reaction.userId)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
              // Add to batch
              const docRef = doc(collection(db, REACTIONS_COLLECTION));
              batch.set(docRef, {
                figureId: reaction.figureId,
                ownerId: reaction.figureId.split('-')[0] || '', // Try to extract ownerId, fallback to empty
                userId: reaction.userId,
                displayName: reaction.displayName,
                reactionType: reaction.reactionType,
                timestamp: reaction.timestamp
              });
              success++;
            } else {
              console.log(`Reaction already exists for figure ${reaction.figureId} by user ${reaction.userId}`);
            }
          } catch (error) {
            console.error('Failed to prepare reaction for batch:', error);
            failed++;
          }
        }

        try {
          await batch.commit();
          console.log(`Batch ${i / batchSize + 1} committed successfully`);
        } catch (error) {
          console.error('Failed to commit batch:', error);
          failed += batchReactions.length;
          success -= batchReactions.length;
        }
      }

      console.log(`Migration complete: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      console.error('Migration failed:', error);
      return { success: 0, failed: 0 };
    }
  }
}

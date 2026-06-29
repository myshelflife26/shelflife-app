import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  ToyLine,
  ToyLineFigure,
  ToyLineCompletion,
  LineCompletion,
  CollectionImage
} from '../types/toyLine';
import type { ActionFigure } from '../types';

class ToyLinesService {
  private static toyLinesCollection = 'toyLines';
  private static figuresCollection = 'toyLineFigures';
  private static userFiguresCollection = 'figures';

  // ===== TOY LINE MANAGEMENT =====

  /**
   * Get all toy lines
   */
  static async getAll(): Promise<ToyLine[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, this.toyLinesCollection),
          where('isPublic', '==', true),
          orderBy('name')
        )
      );

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ToyLine));
    } catch (error) {
      console.error('Error fetching toy lines:', error);
      throw new Error('Failed to fetch toy lines');
    }
  }

  /**
   * Get toy line by ID
   */
  static async getById(id: string): Promise<ToyLine | null> {
    try {
      const docRef = doc(db, this.toyLinesCollection, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as ToyLine;
      }

      return null;
    } catch (error) {
      console.error('Error fetching toy line:', error);
      throw new Error('Failed to fetch toy line');
    }
  }

  /**
   * Create new toy line
   */
  static async create(toyLine: Partial<ToyLine>): Promise<string> {
    try {
      const now = Date.now();
      const toyLineData = {
        ...toyLine,
        figureCount: 0,
        createdAt: now,
        verified: false,
        isPublic: true
      };

      const docRef = await addDoc(collection(db, this.toyLinesCollection), toyLineData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating toy line:', error);
      throw new Error('Failed to create toy line');
    }
  }

  /**
   * Update toy line
   */
  static async update(id: string, updates: Partial<ToyLine>): Promise<void> {
    try {
      const docRef = doc(db, this.toyLinesCollection, id);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating toy line:', error);
      throw new Error('Failed to update toy line');
    }
  }

  /**
   * Delete toy line (admin only)
   */
  static async delete(id: string): Promise<void> {
    try {
      // First, delete all figures in this toy line
      const figuresQuery = query(
        collection(db, this.figuresCollection),
        where('toyLineId', '==', id)
      );
      const figuresSnapshot = await getDocs(figuresQuery);

      // Delete all figures
      const deletePromises = figuresSnapshot.docs.map(doc =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      // Then delete the toy line itself
      const docRef = doc(db, this.toyLinesCollection, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting toy line:', error);
      throw new Error('Failed to delete toy line');
    }
  }

  // ===== FIGURE MANAGEMENT WITHIN LINES =====

  /**
   * Get all figures in a toy line
   */
  static async getFiguresInLine(toyLineId: string): Promise<ToyLineFigure[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, this.figuresCollection),
          where('toyLineId', '==', toyLineId),
          orderBy('figureNumber'),
          orderBy('name')
        )
      );

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ToyLineFigure));
    } catch (error) {
      console.error('Error fetching toy line figures:', error);
      throw new Error('Failed to fetch toy line figures');
    }
  }

  /**
   * Add figure to toy line
   */
  static async addFigureToLine(toyLineId: string, figure: Partial<ToyLineFigure>): Promise<string> {
    try {
      const now = Date.now();
      const figureData = {
        ...figure,
        toyLineId,
        collectionImages: [],
        createdAt: now
      };

      const docRef = await addDoc(collection(db, this.figuresCollection), figureData);

      // Update toy line figure count
      await this.updateFigureCount(toyLineId);

      return docRef.id;
    } catch (error) {
      console.error('Error adding figure to toy line:', error);
      throw new Error('Failed to add figure to toy line');
    }
  }

  /**
   * Update figure in toy line
   */
  static async updateFigureInLine(figureId: string, updates: Partial<ToyLineFigure>): Promise<void> {
    try {
      const docRef = doc(db, this.figuresCollection, figureId);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating toy line figure:', error);
      throw new Error('Failed to update toy line figure');
    }
  }

  /**
   * Remove figure from toy line
   */
  static async removeFigureFromLine(figureId: string): Promise<void> {
    try {
      // Get the figure first to get toyLineId
      const figureDoc = await getDoc(doc(db, this.figuresCollection, figureId));
      if (!figureDoc.exists()) {
        throw new Error('Figure not found');
      }

      const toyLineId = figureDoc.data().toyLineId;

      // Delete the figure
      await deleteDoc(doc(db, this.figuresCollection, figureId));

      // Update toy line figure count
      await this.updateFigureCount(toyLineId);
    } catch (error) {
      console.error('Error removing figure from toy line:', error);
      throw new Error('Failed to remove figure from toy line');
    }
  }

  /**
   * Update figure count for a toy line
   */
  private static async updateFigureCount(toyLineId: string): Promise<void> {
    try {
      const figures = await this.getFiguresInLine(toyLineId);
      await this.update(toyLineId, { figureCount: figures.length });
    } catch (error) {
      console.error('Error updating figure count:', error);
    }
  }

  // ===== COLLECTION IMAGE AGGREGATION =====

  /**
   * Update collection images for a specific figure
   */
  static async updateFigureCollectionImages(figureId: string): Promise<void> {
    try {
      // Get the toy line figure
      const figureDoc = await getDoc(doc(db, this.figuresCollection, figureId));
      if (!figureDoc.exists()) {
        return;
      }

      const toyLineFigure = figureDoc.data() as ToyLineFigure;

      // Find user figures that match this toy line figure
      // This is a simplified approach - in practice, you'd want more sophisticated matching
      const userFiguresQuery = query(
        collection(db, this.userFiguresCollection),
        where('name', '==', toyLineFigure.name),
        where('manufacturer', '==', toyLineFigure.manufacturer),
        where('isPublic', '==', true)
      );

      const userFiguresSnapshot = await getDocs(userFiguresQuery);
      const collectionImages: CollectionImage[] = [];

      for (const userFigureDoc of userFiguresSnapshot.docs) {
        const userFigure = userFigureDoc.data() as ActionFigure;

        // Only include if the figure has images
        if (userFigure.images && userFigure.images.length > 0) {
          const mainImageIndex = userFigure.mainImageIndex || 0;
          const mainImage = userFigure.images[mainImageIndex];

          if (mainImage) {
            collectionImages.push({
              userId: userFigure.userId || '',
              userName: '', // Would need to fetch user data separately
              userDisplayName: '', // Would need to fetch user data separately
              imageUrl: mainImage,
              figureId: userFigureDoc.id,
              uploadedAt: userFigure.createdAt || Date.now()
            });
          }
        }
      }

      // Update the toy line figure with collection images
      await this.updateFigureInLine(figureId, { collectionImages });
    } catch (error) {
      console.error('Error updating collection images:', error);
      throw new Error('Failed to update collection images');
    }
  }

  /**
   * Refresh collection images for all figures (batch operation)
   */
  static async refreshAllCollectionImages(): Promise<void> {
    try {
      const allFigures = await getDocs(collection(db, this.figuresCollection));

      // Process in batches to avoid overwhelming the system
      const batchSize = 10;
      const figures = allFigures.docs;

      for (let i = 0; i < figures.length; i += batchSize) {
        const batch = figures.slice(i, i + batchSize);
        const promises = batch.map(doc =>
          this.updateFigureCollectionImages(doc.id).catch(error =>
            console.error(`Failed to update images for figure ${doc.id}:`, error)
          )
        );

        await Promise.all(promises);

        // Small delay between batches
        if (i + batchSize < figures.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Error refreshing all collection images:', error);
      throw new Error('Failed to refresh collection images');
    }
  }

  // ===== USER COMPLETION TRACKING =====

  /**
   * Get completion stats for all toy lines for a user
   */
  static async getUserCompletionStats(userId: string): Promise<ToyLineCompletion[]> {
    try {
      // Get user's figures
      const userFiguresQuery = query(
        collection(db, this.userFiguresCollection),
        where('userId', '==', userId)
      );
      const userFiguresSnapshot = await getDocs(userFiguresQuery);
      const userFigures = userFiguresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));

      // Get all toy lines
      const toyLines = await this.getAll();
      const completionStats: ToyLineCompletion[] = [];

      for (const toyLine of toyLines) {
        const lineCompletion = await this.getLineCompletionForUser(userId, toyLine.id);

        if (lineCompletion.ownedCount > 0) {
          completionStats.push({
            toyLineId: toyLine.id,
            toyLineName: toyLine.name,
            totalFigures: lineCompletion.totalFigures,
            ownedFigures: lineCompletion.ownedCount,
            completionPercentage: lineCompletion.completionPercentage,
            ownedFigureIds: lineCompletion.figuresWithOwnership
              .filter(f => f.owned)
              .map(f => f.userFigureId!)
              .filter(Boolean)
          });
        }
      }

      return completionStats.sort((a, b) => b.completionPercentage - a.completionPercentage);
    } catch (error) {
      console.error('Error getting user completion stats:', error);
      throw new Error('Failed to get completion stats');
    }
  }

  /**
   * Get completion details for a specific toy line and user
   */
  static async getLineCompletionForUser(userId: string, toyLineId: string): Promise<LineCompletion> {
    try {
      // Get all figures in the toy line
      const toyLineFigures = await this.getFiguresInLine(toyLineId);

      // Get user's figures
      const userFiguresQuery = query(
        collection(db, this.userFiguresCollection),
        where('userId', '==', userId)
      );
      const userFiguresSnapshot = await getDocs(userFiguresQuery);
      const userFigures = userFiguresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));

      // Match user figures to toy line figures
      const figuresWithOwnership = toyLineFigures.map(toyLineFigure => {
        // Find matching user figure (simplified matching by name and manufacturer)
        const matchingUserFigure = userFigures.find(userFigure =>
          userFigure.name.toLowerCase() === toyLineFigure.name.toLowerCase() &&
          userFigure.manufacturer.toLowerCase() === toyLineFigure.manufacturer.toLowerCase()
        );

        return {
          figure: toyLineFigure,
          owned: !!matchingUserFigure,
          userFigureId: matchingUserFigure?.id
        };
      });

      const ownedCount = figuresWithOwnership.filter(f => f.owned).length;
      const totalFigures = toyLineFigures.length;
      const completionPercentage = totalFigures > 0 ? Math.round((ownedCount / totalFigures) * 100) : 0;

      return {
        toyLineId,
        totalFigures,
        ownedCount,
        missingCount: totalFigures - ownedCount,
        completionPercentage,
        figuresWithOwnership
      };
    } catch (error) {
      console.error('Error getting line completion for user:', error);
      throw new Error('Failed to get line completion');
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Search toy lines by name
   */
  static async searchByName(searchTerm: string): Promise<ToyLine[]> {
    try {
      const allLines = await this.getAll();
      const term = searchTerm.toLowerCase();

      return allLines.filter(line =>
        line.name.toLowerCase().includes(term) ||
        line.manufacturer.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching toy lines:', error);
      throw new Error('Failed to search toy lines');
    }
  }

  /**
   * Get toy lines by manufacturer
   */
  static async getByManufacturer(manufacturer: string): Promise<ToyLine[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, this.toyLinesCollection),
          where('manufacturer', '==', manufacturer),
          where('isPublic', '==', true),
          orderBy('name')
        )
      );

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ToyLine));
    } catch (error) {
      console.error('Error fetching toy lines by manufacturer:', error);
      throw new Error('Failed to fetch toy lines by manufacturer');
    }
  }
}

export { ToyLinesService };
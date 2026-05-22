import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ActionFigure } from '../types/index';
import { MarketplaceService } from './marketplaceService';
import { ActivityRecorder } from './communityActivity';
import { FirebaseAuthService } from './firebaseAuth';

const FIGURES_COLLECTION = 'figures';

/**
 * Recursively remove undefined values from an object
 * Firebase doesn't accept undefined values in documents
 */
function cleanUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedValues(item)).filter(item => item !== undefined);
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value);
      }
    }
    return cleaned;
  }

  return obj;
}

export class FirebaseStorage {
  /**
   * Get all figures for a specific user
   */
  static async getFigures(userId: string): Promise<ActionFigure[]> {
    try {
      const figuresRef = collection(db, FIGURES_COLLECTION);
      const q = query(
        figuresRef,
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const figures = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));

      // Sort in memory instead of in query
      return figures.sort((a, b) => {
        const aTime = (a as any).createdAt || 0;
        const bTime = (b as any).createdAt || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Failed to get figures:', error);
      return [];
    }
  }

  /**
   * Get public/listed figures for a specific user (for trade proposals)
   * Queries without userId filter to avoid security rule conflicts
   */
  static async getPublicFiguresForUser(userId: string): Promise<ActionFigure[]> {
    try {
      console.log('getPublicFiguresForUser called for userId:', userId);
      const figuresRef = collection(db, FIGURES_COLLECTION);

      // Query for ALL public figures (no userId filter to avoid security rule conflict)
      const publicQuery = query(
        figuresRef,
        where('isPublic', '==', true)
      );

      const listedQuery = query(
        figuresRef,
        where('isListed', '==', true)
      );

      // Execute both queries
      const [publicSnapshot, listedSnapshot] = await Promise.all([
        getDocs(publicQuery),
        getDocs(listedQuery)
      ]);

      // Combine results, deduplicate, and filter by userId in memory
      const figureMap = new Map<string, ActionFigure>();

      publicSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log('Public figure userId:', data.userId, 'Looking for:', userId, 'Match:', data.userId === userId);
        if (data.userId === userId) {
          figureMap.set(doc.id, { id: doc.id, ...data } as ActionFigure);
        }
      });

      listedSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log('Listed figure userId:', data.userId, 'Looking for:', userId, 'Match:', data.userId === userId);
        if (data.userId === userId) {
          figureMap.set(doc.id, { id: doc.id, ...data } as ActionFigure);
        }
      });

      const results = Array.from(figureMap.values());
      console.log(`Found ${results.length} public figures for userId ${userId}`);
      return results;
    } catch (error) {
      console.error('Failed to get public figures:', error);
      return [];
    }
  }

  /**
   * Get a single figure by ID
   */
  static async getFigure(figureId: string): Promise<ActionFigure | null> {
    try {
      const figureDoc = await getDoc(doc(db, FIGURES_COLLECTION, figureId));
      if (!figureDoc.exists()) {
        return null;
      }

      return {
        id: figureDoc.id,
        ...figureDoc.data()
      } as ActionFigure;
    } catch (error) {
      console.error('Failed to get figure:', error);
      return null;
    }
  }

  /**
   * Add a new figure
   */
  /**
   * Calculate if a figure is listed (for marketplace queries optimization)
   */
  private static calculateIsListed(figure: Partial<ActionFigure>): boolean {
    const isForSale = figure.marketplaceListing?.forSale || false;
    const isForTrade = figure.marketplaceListing?.forTrade || false;
    const hasLegacyAvailability = figure.availability && figure.availability.length > 0;
    return isForSale || isForTrade || hasLegacyAvailability;
  }

  static async addFigure(userId: string, figure: Omit<ActionFigure, 'id'>): Promise<string> {
    try {
      const figuresRef = collection(db, FIGURES_COLLECTION);
      const newFigureRef = doc(figuresRef);

      // Initialize price history with current value
      const priceHistory = figure.currentValue ? [{
        date: Date.now(),
        value: figure.currentValue
      }] : [];

      const cleanedFigure = cleanUndefinedValues({
        ...figure,
        userId,
        priceHistory,
        isListed: this.calculateIsListed(figure),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      await setDoc(newFigureRef, cleanedFigure);

      // Clear marketplace cache if figure is listed
      if (cleanedFigure.isListed) {
        MarketplaceService.clearListingsCache();
      }

      // Record community activity
      try {
        const user = await FirebaseAuthService.getUserById(userId);
        if (user) {
          const figureWithId = { ...cleanedFigure, id: newFigureRef.id } as ActionFigure;
          ActivityRecorder.figureAdded(user, figureWithId);
        }
      } catch (activityError) {
        console.warn('Failed to record figure added activity:', activityError);
      }

      return newFigureRef.id;
    } catch (error) {
      console.error('Failed to add figure:', error);
      throw error;
    }
  }

  /**
   * Update an existing figure
   */
  static async updateFigure(figureId: string, updates: Partial<ActionFigure>): Promise<void> {
    try {
      const figureRef = doc(db, FIGURES_COLLECTION, figureId);

      // Get current figure for price history and isListed calculation
      const currentDoc = await getDoc(figureRef);
      let currentFigure: ActionFigure | null = null;
      if (currentDoc.exists()) {
        currentFigure = currentDoc.data() as ActionFigure;
      }

      // If currentValue is being updated, track price history and detect price alerts
      if (updates.currentValue !== undefined && currentFigure && updates.currentValue !== currentFigure.currentValue) {
        const priceHistory = currentFigure.priceHistory || [];
        // Add new price entry
        priceHistory.push({
          date: Date.now(),
          value: updates.currentValue
        });
        updates.priceHistory = priceHistory;

        // Detect significant price change and create alert
        if (currentFigure.userId) {
          const { PriceAlertsService } = await import('./priceAlertsService');
          PriceAlertsService.detectPriceChange(
            currentFigure.userId,
            figureId,
            currentFigure.name,
            currentFigure.currentValue,
            updates.currentValue
          );
        }
      }

      // If marketplace or availability fields are being updated, recalculate isListed
      if (updates.marketplaceListing !== undefined || updates.availability !== undefined) {
        if (currentFigure) {
          const mergedFigure = { ...currentFigure, ...updates };
          updates.isListed = this.calculateIsListed(mergedFigure);
        } else {
          // If figure doesn't exist yet, just calculate based on updates
          updates.isListed = this.calculateIsListed(updates);
        }
      }

      const cleanedUpdates = cleanUndefinedValues({
        ...updates,
        updatedAt: Date.now()
      });
      await updateDoc(figureRef, cleanedUpdates);

      // Clear marketplace cache if marketplace fields were updated
      if (updates.marketplaceListing !== undefined || updates.availability !== undefined || updates.isListed !== undefined) {
        MarketplaceService.clearListingsCache();
      }
    } catch (error) {
      console.error('Failed to update figure:', error);
      throw error;
    }
  }

  /**
   * Delete a figure
   */
  static async deleteFigure(figureId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, FIGURES_COLLECTION, figureId));
    } catch (error) {
      console.error('Failed to delete figure:', error);
      throw error;
    }
  }

  /**
   * Delete multiple figures
   */
  static async deleteFigures(figureIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      figureIds.forEach(id => {
        batch.delete(doc(db, FIGURES_COLLECTION, id));
      });
      await batch.commit();
    } catch (error) {
      console.error('Failed to delete figures:', error);
      throw error;
    }
  }

  /**
   * Set public status for a figure
   */
  static async setPublic(figureId: string, isPublic: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, FIGURES_COLLECTION, figureId), {
        isPublic,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Failed to set public status:', error);
      throw error;
    }
  }

  /**
   * Set public status for multiple figures
   */
  static async setPublicMany(figureIds: string[], isPublic: boolean): Promise<void> {
    try {
      const batch = writeBatch(db);
      figureIds.forEach(id => {
        batch.update(doc(db, FIGURES_COLLECTION, id), {
          isPublic,
          updatedAt: Date.now()
        });
      });
      await batch.commit();
    } catch (error) {
      console.error('Failed to set public status for multiple figures:', error);
      throw error;
    }
  }

  /**
   * Get all public figures (for Browse/Feed)
   */
  static async getPublicFigures(): Promise<ActionFigure[]> {
    try {
      const figuresRef = collection(db, FIGURES_COLLECTION);
      const q = query(
        figuresRef,
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));
    } catch (error) {
      console.error('Failed to get public figures:', error);
      return [];
    }
  }

  /**
   * Get public figures by user ID
   */
  static async getPublicFiguresByUser(userId: string): Promise<ActionFigure[]> {
    try {
      const figuresRef = collection(db, FIGURES_COLLECTION);
      const q = query(
        figuresRef,
        where('userId', '==', userId),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));
    } catch (error) {
      console.error('Failed to get public figures by user:', error);
      return [];
    }
  }

  /**
   * Import multiple figures (for data migration)
   */
  static async importFigures(userId: string, figures: ActionFigure[]): Promise<void> {
    try {
      const batch = writeBatch(db);

      figures.forEach(figure => {
        const newFigureRef = doc(collection(db, FIGURES_COLLECTION));
        batch.set(newFigureRef, {
          ...figure,
          userId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Failed to import figures:', error);
      throw error;
    }
  }

  /**
   * Clear all figures for a user (use with caution)
   */
  static async clearUserFigures(userId: string): Promise<void> {
    try {
      const figures = await this.getFigures(userId);
      const batch = writeBatch(db);

      figures.forEach(figure => {
        batch.delete(doc(db, FIGURES_COLLECTION, figure.id));
      });

      await batch.commit();
    } catch (error) {
      console.error('Failed to clear user figures:', error);
      throw error;
    }
  }
}

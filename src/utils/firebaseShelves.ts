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
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import type { Shelf } from '../types/shelf';

const SHELVES_COLLECTION = 'shelves';

export class FirebaseShelvesService {
  /**
   * Create a new shelf
   */
  static async createShelf(
    userId: string,
    name: string,
    description?: string,
    isPublic: boolean = false
  ): Promise<string> {
    try {
      const shelfData: Omit<Shelf, 'id'> = {
        userId,
        name,
        description,
        figureIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPublic,
      };

      const docRef = await addDoc(collection(db, SHELVES_COLLECTION), shelfData);
      return docRef.id;
    } catch (error) {
      console.error('Failed to create shelf:', error);
      throw error;
    }
  }

  /**
   * Get all shelves for a user
   */
  static async getUserShelves(userId: string): Promise<Shelf[]> {
    try {
      const q = query(
        collection(db, SHELVES_COLLECTION),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const shelves: Shelf[] = [];

      querySnapshot.forEach((doc) => {
        shelves.push({
          id: doc.id,
          ...doc.data(),
        } as Shelf);
      });

      return shelves;
    } catch (error) {
      console.error('Failed to get user shelves:', error);
      return [];
    }
  }

  /**
   * Get a single shelf by ID
   */
  static async getShelf(shelfId: string): Promise<Shelf | null> {
    try {
      const docRef = doc(db, SHELVES_COLLECTION, shelfId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as Shelf;
      }
      return null;
    } catch (error) {
      console.error('Failed to get shelf:', error);
      return null;
    }
  }

  /**
   * Update shelf details (name, description, privacy)
   */
  static async updateShelf(
    shelfId: string,
    updates: Partial<Pick<Shelf, 'name' | 'description' | 'isPublic'>>
  ): Promise<void> {
    try {
      const shelfRef = doc(db, SHELVES_COLLECTION, shelfId);
      await updateDoc(shelfRef, {
        ...updates,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Failed to update shelf:', error);
      throw error;
    }
  }

  /**
   * Delete a shelf
   */
  static async deleteShelf(shelfId: string): Promise<void> {
    try {
      const shelfRef = doc(db, SHELVES_COLLECTION, shelfId);
      await deleteDoc(shelfRef);
    } catch (error) {
      console.error('Failed to delete shelf:', error);
      throw error;
    }
  }

  /**
   * Add a figure to a shelf
   */
  static async addFigureToShelf(shelfId: string, figureId: string): Promise<void> {
    try {
      const shelfRef = doc(db, SHELVES_COLLECTION, shelfId);
      await updateDoc(shelfRef, {
        figureIds: arrayUnion(figureId),
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Failed to add figure to shelf:', error);
      throw error;
    }
  }

  /**
   * Remove a figure from a shelf
   */
  static async removeFigureFromShelf(shelfId: string, figureId: string): Promise<void> {
    try {
      const shelfRef = doc(db, SHELVES_COLLECTION, shelfId);
      await updateDoc(shelfRef, {
        figureIds: arrayRemove(figureId),
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Failed to remove figure from shelf:', error);
      throw error;
    }
  }

  /**
   * Reorder figures in a shelf
   */
  static async reorderShelfFigures(shelfId: string, figureIds: string[]): Promise<void> {
    try {
      const shelfRef = doc(db, SHELVES_COLLECTION, shelfId);
      await updateDoc(shelfRef, {
        figureIds,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Failed to reorder shelf figures:', error);
      throw error;
    }
  }

  /**
   * Get shelves that contain a specific figure
   */
  static async getShelvesContainingFigure(userId: string, figureId: string): Promise<Shelf[]> {
    try {
      const q = query(
        collection(db, SHELVES_COLLECTION),
        where('userId', '==', userId),
        where('figureIds', 'array-contains', figureId)
      );

      const querySnapshot = await getDocs(q);
      const shelves: Shelf[] = [];

      querySnapshot.forEach((doc) => {
        shelves.push({
          id: doc.id,
          ...doc.data(),
        } as Shelf);
      });

      return shelves;
    } catch (error) {
      console.error('Failed to get shelves containing figure:', error);
      return [];
    }
  }

  /**
   * Get public shelves (for browsing)
   */
  static async getPublicShelves(limit: number = 50): Promise<Shelf[]> {
    try {
      const q = query(
        collection(db, SHELVES_COLLECTION),
        where('isPublic', '==', true),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const shelves: Shelf[] = [];

      querySnapshot.forEach((doc) => {
        shelves.push({
          id: doc.id,
          ...doc.data(),
        } as Shelf);
      });

      return shelves.slice(0, limit);
    } catch (error) {
      console.error('Failed to get public shelves:', error);
      return [];
    }
  }
}

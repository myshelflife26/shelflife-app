import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { AccessorySuggestion, AccessoryCategory } from '../types/index';

const SUGGESTIONS_COLLECTION = 'accessorySuggestions';

export class AccessorySuggestionService {
  /**
   * Submit a new accessory suggestion
   */
  static async submitSuggestion(
    figureId: string,
    figureName: string,
    userId: string,
    userName: string,
    accessoryName: string,
    category: AccessoryCategory,
    required: boolean,
    description?: string,
    imageUrl?: string
  ): Promise<string | null> {
    try {
      const suggestion: Omit<AccessorySuggestion, 'id'> = {
        figureId,
        figureName,
        userId,
        userName,
        accessoryName,
        category,
        required,
        description,
        imageUrl,
        status: 'pending',
        submittedAt: Date.now()
      };

      const docRef = await addDoc(collection(db, SUGGESTIONS_COLLECTION), suggestion);
      return docRef.id;
    } catch (error) {
      console.error('Failed to submit accessory suggestion:', error);
      return null;
    }
  }

  /**
   * Get all pending suggestions
   */
  static async getPendingSuggestions(): Promise<AccessorySuggestion[]> {
    try {
      const suggestionsRef = collection(db, SUGGESTIONS_COLLECTION);
      const q = query(
        suggestionsRef,
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AccessorySuggestion));
    } catch (error) {
      console.error('Failed to get pending suggestions:', error);
      return [];
    }
  }

  /**
   * Get suggestions for a specific figure
   */
  static async getSuggestionsForFigure(figureId: string): Promise<AccessorySuggestion[]> {
    try {
      const suggestionsRef = collection(db, SUGGESTIONS_COLLECTION);
      const q = query(
        suggestionsRef,
        where('figureId', '==', figureId),
        orderBy('submittedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AccessorySuggestion));
    } catch (error) {
      console.error('Failed to get suggestions for figure:', error);
      return [];
    }
  }

  /**
   * Get suggestions by user
   */
  static async getUserSuggestions(userId: string): Promise<AccessorySuggestion[]> {
    try {
      const suggestionsRef = collection(db, SUGGESTIONS_COLLECTION);
      const q = query(
        suggestionsRef,
        where('userId', '==', userId),
        orderBy('submittedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AccessorySuggestion));
    } catch (error) {
      console.error('Failed to get user suggestions:', error);
      return [];
    }
  }

  /**
   * Approve a suggestion (admin only)
   */
  static async approveSuggestion(
    suggestionId: string,
    reviewerId: string
  ): Promise<boolean> {
    try {
      const suggestionRef = doc(db, SUGGESTIONS_COLLECTION, suggestionId);
      await updateDoc(suggestionRef, {
        status: 'approved',
        reviewedAt: Date.now(),
        reviewedBy: reviewerId
      });
      return true;
    } catch (error) {
      console.error('Failed to approve suggestion:', error);
      return false;
    }
  }

  /**
   * Reject a suggestion (admin only)
   */
  static async rejectSuggestion(
    suggestionId: string,
    reviewerId: string
  ): Promise<boolean> {
    try {
      const suggestionRef = doc(db, SUGGESTIONS_COLLECTION, suggestionId);
      await updateDoc(suggestionRef, {
        status: 'rejected',
        reviewedAt: Date.now(),
        reviewedBy: reviewerId
      });
      return true;
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
      return false;
    }
  }
}

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { FirebaseNotifications } from './firebaseNotifications';
import { ToyLinesService } from './toyLinesService';
import type { ToyLineSuggestion, ToyLineFigure } from '../types/toyLine';

class ToyLineSuggestionsService {
  private static suggestionsCollection = 'toyLineSuggestions';

  // ===== USER SUBMISSIONS =====

  /**
   * Submit a new figure suggestion for a toy line
   */
  static async submitFigureSuggestion(suggestion: Partial<ToyLineSuggestion>): Promise<string> {
    try {
      const now = Date.now();

      // Validate required fields
      if (!suggestion.toyLineId || !suggestion.figureName || !suggestion.userId || !suggestion.reason) {
        throw new Error('Missing required fields for suggestion');
      }

      const suggestionData: ToyLineSuggestion = {
        id: '', // Will be set by Firestore
        toyLineId: suggestion.toyLineId,
        figureName: suggestion.figureName.trim(),
        figureNumber: suggestion.figureNumber?.trim(),
        year: suggestion.year,
        subLine: suggestion.subLine?.trim(),
        reason: suggestion.reason.trim(),
        imageUrl: suggestion.imageUrl,
        userId: suggestion.userId,
        userName: suggestion.userName || '',
        status: 'pending',
        submittedAt: now
      };

      const docRef = await addDoc(collection(db, this.suggestionsCollection), suggestionData);

      // Optionally notify admins about new suggestion
      await this.notifyAdminsOfNewSuggestion(docRef.id, suggestionData);

      return docRef.id;
    } catch (error) {
      console.error('Error submitting figure suggestion:', error);
      throw new Error('Failed to submit figure suggestion');
    }
  }

  /**
   * Get all suggestions submitted by a specific user
   */
  static async getUserSuggestions(userId: string): Promise<ToyLineSuggestion[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, this.suggestionsCollection),
          where('userId', '==', userId),
          orderBy('submittedAt', 'desc')
        )
      );

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ToyLineSuggestion));
    } catch (error) {
      console.error('Error fetching user suggestions:', error);
      throw new Error('Failed to fetch user suggestions');
    }
  }

  // ===== ADMIN REVIEW =====

  /**
   * Get all pending suggestions for admin review
   */
  static async getPendingSuggestions(): Promise<ToyLineSuggestion[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, this.suggestionsCollection),
          where('status', '==', 'pending'),
          orderBy('submittedAt', 'asc')
        )
      );

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ToyLineSuggestion));
    } catch (error) {
      console.error('Error fetching pending suggestions:', error);
      throw new Error('Failed to fetch pending suggestions');
    }
  }

  /**
   * Get all suggestions (for admin dashboard)
   */
  static async getAllSuggestions(): Promise<ToyLineSuggestion[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, this.suggestionsCollection),
          orderBy('submittedAt', 'desc')
        )
      );

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ToyLineSuggestion));
    } catch (error) {
      console.error('Error fetching all suggestions:', error);
      throw new Error('Failed to fetch suggestions');
    }
  }

  /**
   * Approve a suggestion and add it to the toy line
   */
  static async approveSuggestion(suggestionId: string, adminId: string, reviewNotes?: string): Promise<void> {
    try {
      // Get the suggestion
      const suggestionDoc = await getDoc(doc(db, this.suggestionsCollection, suggestionId));
      if (!suggestionDoc.exists()) {
        throw new Error('Suggestion not found');
      }

      const suggestion = { id: suggestionDoc.id, ...suggestionDoc.data() } as ToyLineSuggestion;

      // Create the new toy line figure from the suggestion
      const newFigure: Partial<ToyLineFigure> = {
        name: suggestion.figureName,
        figureNumber: suggestion.figureNumber,
        year: suggestion.year || new Date().getFullYear(),
        subLine: suggestion.subLine,
        manufacturer: '', // Will need to get from toy line
        category: 'Action Figures', // Default
        source: 'user-suggestion',
        createdBy: adminId
      };

      // Get the toy line to populate manufacturer and category
      const toyLine = await ToyLinesService.getById(suggestion.toyLineId);
      if (toyLine) {
        newFigure.manufacturer = toyLine.manufacturer;
        newFigure.category = toyLine.category;
      }

      // Add the figure to the toy line
      await ToyLinesService.addFigureToLine(suggestion.toyLineId, newFigure);

      // Update the suggestion status
      const now = Date.now();
      await updateDoc(doc(db, this.suggestionsCollection, suggestionId), {
        status: 'approved',
        reviewedAt: now,
        reviewedBy: adminId,
        reviewNotes: reviewNotes || ''
      });

      // Notify the user
      await this.notifyUserOfReview(suggestion, true, reviewNotes);
    } catch (error) {
      console.error('Error approving suggestion:', error);
      throw new Error('Failed to approve suggestion');
    }
  }

  /**
   * Reject a suggestion
   */
  static async rejectSuggestion(suggestionId: string, adminId: string, reviewNotes: string): Promise<void> {
    try {
      // Get the suggestion for notification
      const suggestionDoc = await getDoc(doc(db, this.suggestionsCollection, suggestionId));
      if (!suggestionDoc.exists()) {
        throw new Error('Suggestion not found');
      }

      const suggestion = { id: suggestionDoc.id, ...suggestionDoc.data() } as ToyLineSuggestion;

      // Update the suggestion status
      const now = Date.now();
      await updateDoc(doc(db, this.suggestionsCollection, suggestionId), {
        status: 'rejected',
        reviewedAt: now,
        reviewedBy: adminId,
        reviewNotes: reviewNotes
      });

      // Notify the user
      await this.notifyUserOfReview(suggestion, false, reviewNotes);
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      throw new Error('Failed to reject suggestion');
    }
  }

  /**
   * Get suggestions for a specific toy line
   */
  static async getSuggestionsForToyLine(toyLineId: string): Promise<ToyLineSuggestion[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, this.suggestionsCollection),
          where('toyLineId', '==', toyLineId),
          orderBy('submittedAt', 'desc')
        )
      );

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ToyLineSuggestion));
    } catch (error) {
      console.error('Error fetching suggestions for toy line:', error);
      throw new Error('Failed to fetch suggestions for toy line');
    }
  }

  // ===== NOTIFICATION HELPERS =====

  /**
   * Notify user of suggestion review outcome
   */
  private static async notifyUserOfReview(
    suggestion: ToyLineSuggestion,
    approved: boolean,
    reviewNotes?: string
  ): Promise<void> {
    try {
      const toyLine = await ToyLinesService.getById(suggestion.toyLineId);
      const toyLineName = toyLine?.name || 'Unknown Toy Line';

      if (approved) {
        await FirebaseNotifications.createToyLineSuggestionApprovedNotification(
          suggestion.userId,
          suggestion.figureName,
          toyLineName,
          'Admin',
          reviewNotes
        );
      } else {
        await FirebaseNotifications.createToyLineSuggestionRejectedNotification(
          suggestion.userId,
          suggestion.figureName,
          toyLineName,
          'Admin',
          reviewNotes || 'No specific reason provided'
        );
      }
    } catch (error) {
      console.error('Error notifying user of review:', error);
      // Don't throw - notification failure shouldn't fail the review process
    }
  }

  /**
   * Notify admins of new suggestion (optional feature)
   */
  private static async notifyAdminsOfNewSuggestion(
    suggestionId: string,
    suggestion: ToyLineSuggestion
  ): Promise<void> {
    try {
      // This would require getting a list of admin users
      // For now, we'll skip this feature but leave the structure in place
      console.log('New suggestion submitted:', suggestionId, suggestion.figureName);
    } catch (error) {
      console.error('Error notifying admins:', error);
      // Don't throw - notification failure shouldn't fail the submission
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Check if user has already suggested this figure
   */
  static async hasUserSuggestedFigure(
    userId: string,
    toyLineId: string,
    figureName: string
  ): Promise<boolean> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, this.suggestionsCollection),
          where('userId', '==', userId),
          where('toyLineId', '==', toyLineId),
          where('figureName', '==', figureName.trim()),
          where('status', 'in', ['pending', 'approved'])
        )
      );

      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking duplicate suggestion:', error);
      return false; // Err on the side of allowing the suggestion
    }
  }

  /**
   * Get suggestion statistics
   */
  static async getSuggestionStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    try {
      const allSuggestions = await this.getAllSuggestions();

      const stats = {
        pending: allSuggestions.filter(s => s.status === 'pending').length,
        approved: allSuggestions.filter(s => s.status === 'approved').length,
        rejected: allSuggestions.filter(s => s.status === 'rejected').length,
        total: allSuggestions.length
      };

      return stats;
    } catch (error) {
      console.error('Error getting suggestion stats:', error);
      return { pending: 0, approved: 0, rejected: 0, total: 0 };
    }
  }
}

export { ToyLineSuggestionsService };
import { FirebaseAuthService } from './firebaseAuth';
import { FirebaseStorage } from './firebaseStorage';
import { Storage } from './storage';
import type { ActionFigure } from '../types/index';

export class FirebaseMigration {
  /**
   * Migrate localStorage data to Firebase for the current user
   */
  static async migrateUserData(userId: string): Promise<{ success: boolean; error?: string; figureCount?: number }> {
    try {
      console.log('🔄 Starting migration for user:', userId);

      // Get figures from localStorage
      const localFigures = Storage.getAll();

      if (localFigures.length === 0) {
        console.log('No local figures to migrate');
        return { success: true, figureCount: 0 };
      }

      console.log(`Found ${localFigures.length} figures in localStorage`);

      // Check if user already has figures in Firebase
      const existingFigures = await FirebaseStorage.getFigures(userId);

      if (existingFigures.length > 0) {
        console.warn(`User already has ${existingFigures.length} figures in Firebase`);
        return {
          success: false,
          error: `You already have ${existingFigures.length} figures in Firebase. Migration skipped to avoid duplicates.`
        };
      }

      // Upload figures to Firebase
      console.log('Uploading figures to Firebase...');
      await FirebaseStorage.importFigures(userId, localFigures);

      console.log('✅ Migration complete!');
      return { success: true, figureCount: localFigures.length };
    } catch (error: any) {
      console.error('Migration failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if localStorage has data that needs migration
   */
  static hasLocalData(): boolean {
    const localFigures = Storage.getAll();
    return localFigures.length > 0;
  }

  /**
   * Get count of local figures
   */
  static getLocalFigureCount(): number {
    const localFigures = Storage.getAll();
    return localFigures.length;
  }

  /**
   * Clear localStorage after successful migration (optional)
   */
  static clearLocalData(): void {
    if (confirm('Clear localStorage data? Your figures are now safely stored in Firebase.')) {
      // Clear figures
      localStorage.removeItem('action-figures');

      // Note: We keep settings, user preferences, etc.
      console.log('✅ localStorage cleared');
    }
  }

  /**
   * Initialize default users in Firebase (one-time setup)
   */
  static async initializeDefaultUsers(): Promise<void> {
    console.log('Initializing default Firebase users...');
    await FirebaseAuthService.initializeDefaultUsers();
    console.log('✅ Default users created');
  }
}

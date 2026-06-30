import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { MasterFiguresService } from './masterFigures';
import type { ActionFigure } from '../types';
import type { MasterFigure } from './masterFigures';

class CollectionImageSyncService {
  private static userFiguresCollection = 'figures';

  /**
   * Find user figures that match master figures but may be in wrong toy line context
   */
  static async findToyLineContextIssues(): Promise<Array<{
    userFigure: ActionFigure;
    currentMatch: MasterFigure | null;
    suggestedMatches: MasterFigure[];
    issue: string;
  }>> {
    try {
      // Get all user figures (not just public ones)
      const userFiguresSnapshot = await getDocs(collection(db, this.userFiguresCollection));
      const userFigures = userFiguresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));

      // Get all master figures
      const masterFigures = await MasterFiguresService.getAll();

      const contextIssues = [];

      for (const userFigure of userFigures) {
        // Find current exact match
        const currentMatch = masterFigures.find(mf =>
          mf.name.toLowerCase() === userFigure.name.toLowerCase() &&
          mf.manufacturer.toLowerCase() === userFigure.manufacturer.toLowerCase()
        );

        // Find other possible matches by name (different manufacturer/context)
        const nameMatches = masterFigures.filter(mf =>
          mf.name.toLowerCase() === userFigure.name.toLowerCase() &&
          mf.id !== currentMatch?.id
        );

        if (nameMatches.length > 0) {
          contextIssues.push({
            userFigure,
            currentMatch,
            suggestedMatches: nameMatches,
            issue: currentMatch
              ? `Matches "${currentMatch.manufacturer}" but other versions exist`
              : 'No exact match but similar names found'
          });
        }
      }

      return contextIssues;
    } catch (error) {
      console.error('Error finding toy line context issues:', error);
      throw new Error('Failed to find toy line context issues');
    }
  }

  /**
   * Find orphaned user figures that don't match any master figures
   */
  static async findOrphanedUserFigures(): Promise<Array<{
    userFigure: ActionFigure;
    possibleMatches: MasterFigure[];
    issue: string;
  }>> {
    try {
      // Get all public user figures
      const userFiguresQuery = query(
        collection(db, this.userFiguresCollection),
        where('isPublic', '==', true)
      );
      const userFiguresSnapshot = await getDocs(userFiguresQuery);
      const userFigures = userFiguresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));

      // Get all master figures
      const masterFigures = await MasterFiguresService.getAll();

      const orphanedFigures = [];

      for (const userFigure of userFigures) {
        // Try to find exact match first
        const exactMatch = masterFigures.find(mf =>
          mf.name.toLowerCase() === userFigure.name.toLowerCase() &&
          mf.manufacturer.toLowerCase() === userFigure.manufacturer.toLowerCase()
        );

        if (!exactMatch) {
          // Find possible matches by name only
          const nameMatches = masterFigures.filter(mf =>
            mf.name.toLowerCase() === userFigure.name.toLowerCase()
          );

          // Find possible matches by similar name (fuzzy matching)
          const fuzzyMatches = masterFigures.filter(mf =>
            this.fuzzyMatch(mf.name, userFigure.name) &&
            mf.manufacturer.toLowerCase() === userFigure.manufacturer.toLowerCase()
          );

          let issue = 'No matching master figure found';
          let possibleMatches = [];

          if (nameMatches.length > 0) {
            issue = `Name matches found but different manufacturer. User has "${userFigure.manufacturer}"`;
            possibleMatches = nameMatches;
          } else if (fuzzyMatches.length > 0) {
            issue = 'Similar names found with same manufacturer';
            possibleMatches = fuzzyMatches;
          }

          orphanedFigures.push({
            userFigure,
            possibleMatches,
            issue
          });
        }
      }

      return orphanedFigures;
    } catch (error) {
      console.error('Error finding orphaned user figures:', error);
      throw new Error('Failed to find orphaned figures');
    }
  }

  /**
   * Update a user figure to match a master figure
   */
  static async updateUserFigureToMatchMaster(
    userFigureId: string,
    masterFigure: MasterFigure,
    userId: string
  ): Promise<void> {
    try {
      const userFigureRef = doc(db, this.userFiguresCollection, userFigureId);

      await updateDoc(userFigureRef, {
        name: masterFigure.name,
        manufacturer: masterFigure.manufacturer,
        franchise: masterFigure.franchise || null,
        productLine: masterFigure.productLine || null,
        series: masterFigure.productLine || masterFigure.series || null,
        year: masterFigure.year || null,
        version: masterFigure.version || null,
        size: masterFigure.size || null,
        packaging: masterFigure.packaging || null,
        upc: masterFigure.upc || null,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error updating user figure:', error);
      throw new Error('Failed to update user figure');
    }
  }

  /**
   * Find user figures that should match a specific master figure but don't
   */
  static async findDisconnectedImagesForMaster(masterFigure: MasterFigure): Promise<ActionFigure[]> {
    try {
      // Look for user figures with similar names and manufacturers
      const userFiguresSnapshot = await getDocs(
        collection(db, this.userFiguresCollection)
      );
      const userFigures = userFiguresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));

      const disconnectedFigures = userFigures.filter(userFigure => {
        // Skip if already matches exactly
        if (
          userFigure.name.toLowerCase() === masterFigure.name.toLowerCase() &&
          userFigure.manufacturer.toLowerCase() === masterFigure.manufacturer.toLowerCase()
        ) {
          return false;
        }

        // Check if it's a fuzzy match that should be connected
        return this.fuzzyMatch(userFigure.name, masterFigure.name) &&
               userFigure.manufacturer.toLowerCase() === masterFigure.manufacturer.toLowerCase();
      });

      return disconnectedFigures;
    } catch (error) {
      console.error('Error finding disconnected images:', error);
      return [];
    }
  }

  /**
   * Simple fuzzy matching for figure names
   */
  private static fuzzyMatch(name1: string, name2: string): boolean {
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n1 = normalize(name1);
    const n2 = normalize(name2);

    // Exact match
    if (n1 === n2) return true;

    // Check if one is contained in the other
    if (n1.includes(n2) || n2.includes(n1)) return true;

    // Check Levenshtein distance for very similar names
    const distance = this.levenshteinDistance(n1, n2);
    const maxLength = Math.max(n1.length, n2.length);
    const similarity = (maxLength - distance) / maxLength;

    return similarity > 0.8; // 80% similarity threshold
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Batch update multiple user figures to match master figures
   */
  static async batchUpdateUserFigures(
    updates: Array<{
      userFigureId: string;
      masterFigure: MasterFigure;
      userId: string;
    }>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const update of updates) {
      try {
        await this.updateUserFigureToMatchMaster(
          update.userFigureId,
          update.masterFigure,
          update.userId
        );
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to update ${update.userFigureId}: ${error.message}`);
      }
    }

    return results;
  }
}

export { CollectionImageSyncService };
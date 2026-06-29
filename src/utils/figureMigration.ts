import {
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { MasterFiguresService, type MasterFigure } from './masterFigures';
import type { ActionFigure } from '../types';

class FigureMigrationService {
  private static userFiguresCollection = 'figures';

  /**
   * Migrate all user figures to masterFigures database
   * This ensures every figure in user collections is also in the master database
   */
  static async migrateUserFiguresToMaster(): Promise<{
    processed: number;
    added: number;
    skipped: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      added: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      console.log('Starting migration of user figures to master database...');

      // Get all user figures
      const userFiguresSnapshot = await getDocs(collection(db, this.userFiguresCollection));
      const userFigures = userFiguresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));

      console.log(`Found ${userFigures.length} user figures to process`);

      // Get all existing master figures for duplicate checking
      const existingMasterFigures = await MasterFiguresService.getAll();
      const masterFigureMap = new Map<string, MasterFigure>();

      // Create lookup map for existing master figures
      for (const figure of existingMasterFigures) {
        const key = this.createFigureKey(figure.name, figure.manufacturer, figure.productLine || figure.series);
        masterFigureMap.set(key, figure);
      }

      // Process each user figure
      for (const userFigure of userFigures) {
        results.processed++;

        try {
          // Create lookup key for this user figure
          const figureKey = this.createFigureKey(
            userFigure.name,
            userFigure.manufacturer,
            userFigure.productLine || userFigure.series
          );

          // Check if master figure already exists
          if (masterFigureMap.has(figureKey)) {
            results.skipped++;
            continue;
          }

          // Create master figure from user figure
          const masterFigureData: Omit<MasterFigure, 'id' | 'createdAt'> = {
            name: userFigure.name,
            version: userFigure.version,
            year: userFigure.year,
            series: userFigure.series, // Keep for backward compatibility
            manufacturer: userFigure.manufacturer,
            category: userFigure.category,
            size: userFigure.size,
            productLine: userFigure.productLine || userFigure.series,
            productLineNumber: userFigure.productLineNumber,
            subProductLine: userFigure.subProductLine,
            packaging: userFigure.packaging,
            upc: userFigure.upc,
            imageUrl: this.getFirstUserImage(userFigure),
            notes: `Migrated from user collection. Original owner: ${userFigure.userId}`,
            accessories: userFigure.accessories?.map(acc => ({
              id: acc.id,
              name: acc.name,
              category: acc.category,
              isIncluded: true, // Default to included in master database
              notes: acc.notes
            })),
            createdBy: userFigure.userId || 'migration',
            createdByName: 'Migration Script',
            source: 'user',
            sourceName: 'User Collection Migration'
          };

          // Add to master figures
          const addedFigure = await MasterFiguresService.add(masterFigureData, 'migration', 'Migration Script');

          if (addedFigure) {
            results.added++;
            // Add to our local map to prevent duplicates in this run
            masterFigureMap.set(figureKey, addedFigure);
            console.log(`Added: ${userFigure.name} by ${userFigure.manufacturer}`);
          } else {
            results.errors.push(`Failed to add ${userFigure.name} by ${userFigure.manufacturer}`);
          }

        } catch (error) {
          results.errors.push(`Error processing ${userFigure.name}: ${error.message}`);
          console.error(`Error processing figure ${userFigure.name}:`, error);
        }

        // Log progress every 50 figures
        if (results.processed % 50 === 0) {
          console.log(`Progress: ${results.processed}/${userFigures.length} processed, ${results.added} added`);
        }
      }

      console.log('Migration completed:', results);
      return results;

    } catch (error) {
      console.error('Migration failed:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  /**
   * Create a unique key for figure matching
   */
  private static createFigureKey(name: string, manufacturer: string, productLine?: string): string {
    const normalizedName = name.toLowerCase().trim();
    const normalizedManufacturer = manufacturer.toLowerCase().trim();
    const normalizedProductLine = productLine ? productLine.toLowerCase().trim() : '';

    return `${normalizedManufacturer}:${normalizedName}:${normalizedProductLine}`;
  }

  /**
   * Get the first available image from user figure
   */
  private static getFirstUserImage(userFigure: ActionFigure): string | undefined {
    // Check new images array first
    if (userFigure.images && userFigure.images.length > 0) {
      const mainIndex = userFigure.mainImageIndex || 0;
      return userFigure.images[mainIndex] || userFigure.images[0];
    }

    // Fall back to legacy imageUrl
    if (userFigure.imageUrl) {
      return userFigure.imageUrl;
    }

    return undefined;
  }

  /**
   * Check migration status - see how many user figures are not in master
   */
  static async checkMigrationStatus(): Promise<{
    totalUserFigures: number;
    uniqueUserFigures: number;
    alreadyInMaster: number;
    needingMigration: number;
    missingFigures: Array<{
      name: string;
      manufacturer: string;
      productLine?: string;
      userCount: number;
    }>;
  }> {
    try {
      // Get all user figures
      const userFiguresSnapshot = await getDocs(collection(db, this.userFiguresCollection));
      const userFigures = userFiguresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));

      // Get all master figures
      const masterFigures = await MasterFiguresService.getAll();
      const masterFigureMap = new Map<string, MasterFigure>();

      for (const figure of masterFigures) {
        const key = this.createFigureKey(figure.name, figure.manufacturer, figure.productLine || figure.series);
        masterFigureMap.set(key, figure);
      }

      // Analyze user figures
      const uniqueFigures = new Map<string, {
        name: string;
        manufacturer: string;
        productLine?: string;
        userCount: number;
        inMaster: boolean;
      }>();

      for (const userFigure of userFigures) {
        const key = this.createFigureKey(
          userFigure.name,
          userFigure.manufacturer,
          userFigure.productLine || userFigure.series
        );

        if (uniqueFigures.has(key)) {
          uniqueFigures.get(key)!.userCount++;
        } else {
          uniqueFigures.set(key, {
            name: userFigure.name,
            manufacturer: userFigure.manufacturer,
            productLine: userFigure.productLine || userFigure.series,
            userCount: 1,
            inMaster: masterFigureMap.has(key)
          });
        }
      }

      const uniqueArray = Array.from(uniqueFigures.values());
      const alreadyInMaster = uniqueArray.filter(f => f.inMaster).length;
      const needingMigration = uniqueArray.filter(f => !f.inMaster).length;

      return {
        totalUserFigures: userFigures.length,
        uniqueUserFigures: uniqueArray.length,
        alreadyInMaster,
        needingMigration,
        missingFigures: uniqueArray
          .filter(f => !f.inMaster)
          .sort((a, b) => b.userCount - a.userCount) // Sort by most common first
      };

    } catch (error) {
      console.error('Error checking migration status:', error);
      throw new Error(`Failed to check migration status: ${error.message}`);
    }
  }

  /**
   * Migrate figures for a specific user only
   */
  static async migrateUserFiguresForUser(userId: string): Promise<{
    processed: number;
    added: number;
    skipped: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      added: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      // Get user's figures only
      const userFiguresQuery = query(
        collection(db, this.userFiguresCollection),
        where('userId', '==', userId)
      );
      const userFiguresSnapshot = await getDocs(userFiguresQuery);
      const userFigures = userFiguresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));

      console.log(`Found ${userFigures.length} figures for user ${userId}`);

      // Get existing master figures
      const existingMasterFigures = await MasterFiguresService.getAll();
      const masterFigureMap = new Map<string, MasterFigure>();

      for (const figure of existingMasterFigures) {
        const key = this.createFigureKey(figure.name, figure.manufacturer, figure.productLine || figure.series);
        masterFigureMap.set(key, figure);
      }

      // Process each figure
      for (const userFigure of userFigures) {
        results.processed++;

        try {
          const figureKey = this.createFigureKey(
            userFigure.name,
            userFigure.manufacturer,
            userFigure.productLine || userFigure.series
          );

          if (masterFigureMap.has(figureKey)) {
            results.skipped++;
            continue;
          }

          const masterFigureData: Omit<MasterFigure, 'id' | 'createdAt'> = {
            name: userFigure.name,
            version: userFigure.version,
            year: userFigure.year,
            series: userFigure.series,
            manufacturer: userFigure.manufacturer,
            category: userFigure.category,
            size: userFigure.size,
            productLine: userFigure.productLine || userFigure.series,
            productLineNumber: userFigure.productLineNumber,
            subProductLine: userFigure.subProductLine,
            packaging: userFigure.packaging,
            upc: userFigure.upc,
            imageUrl: this.getFirstUserImage(userFigure),
            notes: `Added by user ${userId}`,
            createdBy: userId,
            source: 'user'
          };

          const addedFigure = await MasterFiguresService.add(masterFigureData, userId);

          if (addedFigure) {
            results.added++;
            masterFigureMap.set(figureKey, addedFigure);
          } else {
            results.errors.push(`Failed to add ${userFigure.name}`);
          }

        } catch (error) {
          results.errors.push(`Error processing ${userFigure.name}: ${error.message}`);
        }
      }

      return results;

    } catch (error) {
      console.error(`Error migrating figures for user ${userId}:`, error);
      throw new Error(`Migration failed for user: ${error.message}`);
    }
  }
}

export { FigureMigrationService };
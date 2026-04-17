import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ImageUploadService } from './imageUploadService';
import type { ActionFigure } from '../types';

/**
 * Migrate all figures with base64 images to use Firebase Storage URLs
 * This should be run once to convert existing figures
 */
export async function migrateFiguresToStorage(userId: string): Promise<{
  total: number;
  migrated: number;
  skipped: number;
  errors: string[];
}> {
  console.log('Starting migration for user:', userId);

  const results = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: [] as string[]
  };

  try {
    // Get all figures for this user
    const figuresRef = collection(db, 'figures');
    const snapshot = await getDocs(figuresRef);

    const userFigures = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as ActionFigure))
      .filter(fig => fig.userId === userId);

    results.total = userFigures.length;
    console.log(`Found ${results.total} figures to check`);

    for (const figure of userFigures) {
      try {
        if (!figure.images || figure.images.length === 0) {
          console.log(`Skipping ${figure.name} - no images`);
          results.skipped++;
          continue;
        }

        // Check if any images are base64
        const hasBase64 = figure.images.some(img => !ImageUploadService.isStorageUrl(img));

        if (!hasBase64) {
          console.log(`Skipping ${figure.name} - already using Storage URLs`);
          results.skipped++;
          continue;
        }

        console.log(`Migrating ${figure.name} - ${figure.images.length} images`);

        // Upload base64 images to Storage
        const imageUrls = await ImageUploadService.migrateImagesToStorage(
          figure.images,
          userId,
          figure.id
        );

        // Update the figure with new URLs
        await updateDoc(doc(db, 'figures', figure.id), {
          images: imageUrls,
          updatedAt: Date.now()
        });

        console.log(`✓ Migrated ${figure.name}`);
        results.migrated++;
      } catch (error) {
        const errorMsg = `Failed to migrate ${figure.name}: ${error}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    console.log('Migration complete:', results);
    return results;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Check how many figures need migration
 */
export async function checkMigrationStatus(userId: string): Promise<{
  total: number;
  needsMigration: number;
  alreadyMigrated: number;
}> {
  const figuresRef = collection(db, 'figures');
  const snapshot = await getDocs(figuresRef);

  const userFigures = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as ActionFigure))
    .filter(fig => fig.userId === userId);

  let needsMigration = 0;
  let alreadyMigrated = 0;

  for (const figure of userFigures) {
    if (!figure.images || figure.images.length === 0) {
      continue;
    }

    const hasBase64 = figure.images.some(img => !ImageUploadService.isStorageUrl(img));

    if (hasBase64) {
      needsMigration++;
    } else {
      alreadyMigrated++;
    }
  }

  return {
    total: userFigures.length,
    needsMigration,
    alreadyMigrated
  };
}

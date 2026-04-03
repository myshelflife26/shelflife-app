import { collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ActionFigure } from '../types/index';

/**
 * Migration script to add isListed field to all figures
 * This enables fast marketplace queries
 *
 * Run this once to update all existing figures in the database
 */
export async function migrateIsListedField(): Promise<{
  total: number;
  updated: number;
  errors: number;
}> {
  console.log('Starting isListed field migration...');

  const stats = {
    total: 0,
    updated: 0,
    errors: 0
  };

  try {
    // Get all figures
    const figuresRef = collection(db, 'figures');
    const snapshot = await getDocs(figuresRef);

    stats.total = snapshot.docs.length;
    console.log(`Found ${stats.total} figures to process`);

    // Process in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    let batch = writeBatch(db);
    let batchCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const figure = docSnapshot.data() as ActionFigure;

      // Determine if figure is listed
      const isForSale = figure.marketplaceListing?.forSale || false;
      const isForTrade = figure.marketplaceListing?.forTrade || false;
      const hasLegacyAvailability = figure.availability && figure.availability.length > 0;

      const isListed = isForSale || isForTrade || hasLegacyAvailability;

      // Only update if isListed field is missing or incorrect
      if (figure.isListed !== isListed) {
        const docRef = doc(db, 'figures', docSnapshot.id);
        batch.update(docRef, { isListed });
        batchCount++;

        // Commit batch if we hit the limit
        if (batchCount === batchSize) {
          await batch.commit();
          stats.updated += batchCount;
          console.log(`Committed batch: ${stats.updated} / ${stats.total}`);
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }

    // Commit remaining items
    if (batchCount > 0) {
      await batch.commit();
      stats.updated += batchCount;
      console.log(`Committed final batch: ${stats.updated} / ${stats.total}`);
    }

    console.log('Migration complete!');
    console.log(`Total figures: ${stats.total}`);
    console.log(`Updated: ${stats.updated}`);
    console.log(`Errors: ${stats.errors}`);

    return stats;
  } catch (error) {
    console.error('Migration failed:', error);
    stats.errors++;
    return stats;
  }
}

/**
 * Utility function to update a single figure's isListed field
 * Call this whenever a figure's marketplace status changes
 */
export async function updateFigureIsListed(figureId: string, figure: ActionFigure): Promise<void> {
  const isForSale = figure.marketplaceListing?.forSale || false;
  const isForTrade = figure.marketplaceListing?.forTrade || false;
  const hasLegacyAvailability = figure.availability && figure.availability.length > 0;

  const isListed = isForSale || isForTrade || hasLegacyAvailability;

  // Update Firebase
  const docRef = doc(db, 'figures', figureId);
  await updateDoc(docRef, { isListed });
}

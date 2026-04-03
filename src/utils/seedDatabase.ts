// Utility to seed the master figures database with popular figures
// Run this once to populate the database with starter data

import { MasterFiguresService } from './masterFigures';
import { seedFigures, getSeedStats } from '../data/seedFigures';

// Track if database has been seeded
let _databaseSeeded = false;
let _seedStatus = { imported: 0, skipped: 0, errors: 0, total: 0 };

/**
 * Check if database has been seeded
 */
export function isDatabaseSeeded(): boolean {
  return _databaseSeeded;
}

/**
 * Get seed status
 */
export function getSeedStatus() {
  return _seedStatus;
}

/**
 * Import all seed figures into master figures database
 * This creates a system user as the contributor
 */
export async function seedCommunityDatabase(): Promise<{
  imported: number;
  skipped: number;
  errors: number;
  stats: ReturnType<typeof getSeedStats>;
}> {
  const systemUserId = 'system';
  const systemUserName = 'ShelfLife Database';

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  console.log('🌱 Starting master figures database seed...');
  console.log(`📦 Found ${seedFigures.length} figures to import`);

  for (let index = 0; index < seedFigures.length; index++) {
    const seedFig = seedFigures[index];
    try {
      // Check if figure already exists
      const existing = await MasterFiguresService.findDuplicate(
        seedFig.name,
        seedFig.manufacturer,
        seedFig.productLine,
        seedFig.subProductLine
      );

      if (existing) {
        skipped++;
      } else {
        // Add new figure
        const result = await MasterFiguresService.add(
          {
            name: seedFig.name,
            manufacturer: seedFig.manufacturer,
            year: seedFig.year ? parseInt(seedFig.year) : undefined,
            productLine: seedFig.productLine,
            subProductLine: seedFig.subProductLine,
            category: seedFig.category,
            imageUrl: seedFig.images?.[0], // Use first image
            notes: `Average value: $${seedFig.averageValue}`,
            createdBy: systemUserId,
            createdByName: systemUserName,
            source: 'admin' as const
          },
          systemUserId,
          systemUserName
        );

        if (result) {
          imported++;
        } else {
          errors++;
        }
      }

      // Progress indicator every 50 figures
      if ((index + 1) % 50 === 0) {
        console.log(`✓ Processed ${index + 1}/${seedFigures.length} figures...`);
      }
    } catch (error) {
      console.error(`❌ Failed to import: ${seedFig.name}`, error);
      errors++;
    }
  }

  const stats = getSeedStats();

  console.log('\n✅ Database seeding complete!');
  console.log(`   📥 Imported: ${imported} new figures`);
  console.log(`   ⏭️  Skipped: ${skipped} duplicates`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`\n📊 Database Statistics:`);
  console.log(`   Total figures: ${stats.total}`);
  console.log(`   Product lines: ${stats.productLines}`);
  console.log(`   Manufacturers: ${stats.manufacturers}`);
  console.log(`\n🎭 By Product Line:`);
  Object.entries(stats.byLine).forEach(([line, count]) => {
    console.log(`   - ${line}: ${count}`);
  });

  _databaseSeeded = true;
  _seedStatus = { imported, skipped, errors, total: stats.total };

  return { imported, skipped, errors, stats };
}

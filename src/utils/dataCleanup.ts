/**
 * Data Cleanup Utilities
 * Fixes common data quality issues in the master database
 */

import { MasterFiguresService, type MasterFigure } from './masterFigures';

export interface CleanupResult {
  totalScanned: number;
  issuesFound: number;
  fixed: number;
  errors: string[];
  details: CleanupDetail[];
}

export interface CleanupDetail {
  figureId: string;
  figureName: string;
  field: string;
  oldValue: string;
  newValue: string;
  additionalUpdates?: Record<string, string>;
}

/**
 * Detect and fix concatenated size fields
 * Common patterns:
 * - "3.75,Action Figure,Individual" -> size: "3.75", category: "Action Figure", packaging: "Individual"
 * - "3.75,Action Figure,Individual,Wave 1" -> size: "3.75", category: "Action Figure", packaging: "Individual", subProductLine: "Wave 1"
 */
function parseContaminatedSizeField(sizeValue: string): {
  size: string;
  category?: string;
  packaging?: string;
  subProductLine?: string;
} | null {
  // Check if size contains commas (indicator of contamination)
  if (!sizeValue.includes(',')) {
    return null;
  }

  const parts = sizeValue.split(',').map(p => p.trim()).filter(p => p);

  if (parts.length === 0) {
    return null;
  }

  const result: any = {};

  // First part should be the actual size (usually numeric + unit)
  // e.g., "3.75", "6 inch", "12\"", etc.
  if (parts[0]) {
    result.size = parts[0];
  }

  // Second part is often category
  if (parts[1]) {
    const secondPart = parts[1].toLowerCase();
    if (secondPart.includes('action figure') || secondPart.includes('figure') ||
        secondPart.includes('vehicle') || secondPart.includes('playset')) {
      result.category = parts[1];
    }
  }

  // Third part is often packaging or sub product line
  if (parts[2]) {
    const thirdPart = parts[2].toLowerCase();
    if (thirdPart.includes('individual') || thirdPart.includes('carded') ||
        thirdPart.includes('boxed') || thirdPart.includes('loose')) {
      result.packaging = parts[2];
    } else if (thirdPart.includes('wave') || thirdPart.includes('series')) {
      result.subProductLine = parts[2];
    } else {
      // Default to packaging
      result.packaging = parts[2];
    }
  }

  // Fourth part is usually sub product line
  if (parts[3]) {
    result.subProductLine = parts[3];
  }

  return result;
}

/**
 * Scan and fix contaminated size fields in master database
 */
export async function cleanupContaminatedSizeFields(dryRun: boolean = false): Promise<CleanupResult> {
  const result: CleanupResult = {
    totalScanned: 0,
    issuesFound: 0,
    fixed: 0,
    errors: [],
    details: []
  };

  try {
    const allFigures = await MasterFiguresService.getAll();
    result.totalScanned = allFigures.length;

    for (const figure of allFigures) {
      // Check if size field contains commas
      if (figure.size && figure.size.includes(',')) {
        result.issuesFound++;

        const parsed = parseContaminatedSizeField(figure.size);

        if (parsed) {
          const updates: Partial<MasterFigure> = {};
          const additionalUpdates: Record<string, string> = {};

          // Update size
          updates.size = parsed.size;

          // Update category if it's empty and we found one
          if (parsed.category && !figure.category) {
            updates.category = parsed.category;
            additionalUpdates.category = parsed.category;
          }

          // Update packaging if it's empty and we found one
          if (parsed.packaging && !figure.packaging) {
            updates.packaging = parsed.packaging;
            additionalUpdates.packaging = parsed.packaging;
          }

          // Update subProductLine if it's empty and we found one
          if (parsed.subProductLine && !figure.subProductLine) {
            updates.subProductLine = parsed.subProductLine;
            additionalUpdates.subProductLine = parsed.subProductLine;
          }

          result.details.push({
            figureId: figure.id,
            figureName: figure.name,
            field: 'size',
            oldValue: figure.size,
            newValue: parsed.size,
            additionalUpdates: Object.keys(additionalUpdates).length > 0 ? additionalUpdates : undefined
          });

          // Apply fixes if not dry run
          if (!dryRun) {
            const success = await MasterFiguresService.update(figure.id, updates);
            if (success) {
              result.fixed++;
            } else {
              result.errors.push(`Failed to update figure: ${figure.name} (${figure.id})`);
            }
          } else {
            result.fixed++;
          }
        }
      }
    }

  } catch (error) {
    result.errors.push(`Cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Other cleanup functions can be added here:
 * - Fix duplicate spaces in names
 * - Normalize manufacturer names
 * - Clean up year formatting
 * - etc.
 */

export async function cleanupAll(dryRun: boolean = false): Promise<CleanupResult> {
  // Run all cleanup functions
  return await cleanupContaminatedSizeFields(dryRun);
}

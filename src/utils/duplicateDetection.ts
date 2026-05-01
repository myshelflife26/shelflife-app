import { MasterFiguresService, type MasterFigure } from './masterFigures';
import { RejectedDuplicatesService } from './rejectedDuplicates';

export interface DuplicateMatch {
  figure1: MasterFigure;
  figure2: MasterFigure;
  matchType: 'likely' | 'possible';
  matchedFields: string[];
  matchScore: number;
}

export interface DetectionCriteria {
  minMatchingFields: number;
  requiredFields?: string[];
}

/**
 * Service for detecting duplicate master figures
 */
export class DuplicateDetectionService {
  // Fields to compare for duplicate detection
  private static COMPARISON_FIELDS = [
    'name',
    'manufacturer',
    'year',
    'version',
    'productLine',
    'productLineNumber',
    'subProductLine'
    // Note: 'series' is a legacy field and should not be used for comparison
  ];

  // Minimum name similarity required (0-1 scale, where 1 is identical)
  private static MIN_NAME_SIMILARITY = 0.6;

  /**
   * Scan entire master database for duplicates
   */
  static async detectAllDuplicates(): Promise<DuplicateMatch[]> {
    const allFigures = await MasterFiguresService.getAll();
    const matches: DuplicateMatch[] = [];
    const comparedPairs = new Set<string>();

    // Load rejected pairs for filtering
    const rejectedPairs = await RejectedDuplicatesService.getRejectedPairIds();

    // Compare each pair once
    for (let i = 0; i < allFigures.length; i++) {
      for (let j = i + 1; j < allFigures.length; j++) {
        const fig1 = allFigures[i];
        const fig2 = allFigures[j];

        // Create unique pair ID (sorted to avoid duplicates)
        const pairId = [fig1.id, fig2.id].sort().join('-');
        if (comparedPairs.has(pairId)) continue;
        comparedPairs.add(pairId);

        // Skip if this pair has been rejected
        if (rejectedPairs.has(pairId)) {
          continue;
        }

        const match = this.compareFigures(fig1, fig2);
        if (match.matchType !== null) {
          matches.push(match);
        }
      }
    }

    // Sort: likely first, then by match score descending
    return matches.sort((a, b) => {
      if (a.matchType === 'likely' && b.matchType === 'possible') return -1;
      if (a.matchType === 'possible' && b.matchType === 'likely') return 1;
      return b.matchScore - a.matchScore;
    });
  }

  /**
   * Calculate Dice coefficient for string similarity (0-1 scale)
   * Based on bigram comparison
   */
  private static calculateNameSimilarity(str1: string, str2: string): number {
    // Normalize strings
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) return 1.0;

    // One contains the other (high similarity)
    if (s1.includes(s2) || s2.includes(s1)) {
      const shorter = Math.min(s1.length, s2.length);
      const longer = Math.max(s1.length, s2.length);
      return shorter / longer; // Returns 0.5-1.0 range
    }

    // Dice coefficient (bigram comparison)
    const bigrams1 = this.getBigrams(s1);
    const bigrams2 = this.getBigrams(s2);

    if (bigrams1.size === 0 || bigrams2.size === 0) {
      return 0;
    }

    const intersection = new Set([...bigrams1].filter(x => bigrams2.has(x)));
    return (2.0 * intersection.size) / (bigrams1.size + bigrams2.size);
  }

  /**
   * Get bigrams (character pairs) from a string
   */
  private static getBigrams(str: string): Set<string> {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  }

  /**
   * Compare two specific figures and determine if they're duplicates
   * REQUIRES name similarity before considering other fields
   */
  static compareFigures(fig1: MasterFigure, fig2: MasterFigure): DuplicateMatch {
    const matchedFields: string[] = [];
    let matchScore = 0;

    // First, check name similarity - this is REQUIRED
    const nameSimilarity = this.calculateNameSimilarity(fig1.name, fig2.name);
    const nameMatches = nameSimilarity >= this.MIN_NAME_SIMILARITY;

    // If names don't match sufficiently, not a duplicate
    if (!nameMatches) {
      return {
        figure1: fig1,
        figure2: fig2,
        matchType: null as any,
        matchedFields: [],
        matchScore: 0
      };
    }

    // Names match, so count it
    matchedFields.push('name');
    matchScore++;

    // Check remaining comparison fields (skip name since we already checked it)
    for (const field of this.COMPARISON_FIELDS) {
      if (field === 'name') continue; // Already checked

      const val1 = (fig1 as any)[field];
      const val2 = (fig2 as any)[field];

      const matches = this.fieldsMatch(val1, val2);

      if (matches) {
        matchedFields.push(field);
        matchScore++;
      }
    }

    // Determine match type based on criteria
    let matchType: 'likely' | 'possible' | null = null;

    // Likely match: name matches AND 2+ other fields match (total 3+)
    if (matchScore >= 3) {
      matchType = 'likely';
    }
    // Possible match: name + manufacturer (same figure name from same company is strong signal)
    else if (
      matchedFields.includes('name') &&
      matchedFields.includes('manufacturer') &&
      matchScore >= 2
    ) {
      matchType = 'possible';
    }
    // Possible match: name matches AND (year OR version) match
    else if (
      matchedFields.includes('year') ||
      matchedFields.includes('version')
    ) {
      matchType = 'possible';
    }

    return {
      figure1: fig1,
      figure2: fig2,
      matchType: matchType as 'likely' | 'possible',
      matchedFields,
      matchScore
    };
  }

  /**
   * Check if two field values match (case-insensitive for strings)
   */
  private static fieldsMatch(field1: any, field2: any): boolean {
    // Both empty/null/undefined
    if (!field1 && !field2) return false; // Don't count empty fields as matches
    if (!field1 || !field2) return false;

    // String comparison (case-insensitive)
    if (typeof field1 === 'string' && typeof field2 === 'string') {
      return field1.toLowerCase().trim() === field2.toLowerCase().trim();
    }

    // Number comparison
    if (typeof field1 === 'number' && typeof field2 === 'number') {
      return field1 === field2;
    }

    // Mixed type comparison (number vs string) - convert both to string
    if ((typeof field1 === 'number' && typeof field2 === 'string') ||
        (typeof field1 === 'string' && typeof field2 === 'number')) {
      return String(field1) === String(field2);
    }

    // Default: strict equality
    return field1 === field2;
  }

  /**
   * Count matching fields between two figures
   */
  private static countMatchingFields(fig1: MasterFigure, fig2: MasterFigure): number {
    let count = 0;
    for (const field of this.COMPARISON_FIELDS) {
      const val1 = (fig1 as any)[field];
      const val2 = (fig2 as any)[field];
      if (this.fieldsMatch(val1, val2)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get a display string for a figure (for UI purposes)
   */
  static getFigureDisplayName(figure: MasterFigure): string {
    let display = figure.name;
    if (figure.version) display += ` (${figure.version})`;
    if (figure.year) display += ` - ${figure.year}`;
    if (figure.manufacturer) display += ` [${figure.manufacturer}]`;
    return display;
  }

  /**
   * Calculate completeness score (number of populated fields)
   */
  static getCompletenessScore(figure: MasterFigure): number {
    const fields = [
      'name', 'manufacturer', 'year', 'version', 'productLine',
      'subProductLine', 'series', 'category', 'size', 'packaging',
      'upc', 'imageUrl', 'notes'
    ];

    let score = 0;
    for (const field of fields) {
      const value = (figure as any)[field];
      if (value !== undefined && value !== null && value !== '') {
        score++;
      }
    }
    return score;
  }

  /**
   * Determine which figure is more complete (for auto-select in merge)
   */
  static getMoreCompleteFigure(fig1: MasterFigure, fig2: MasterFigure): 1 | 2 | 0 {
    const score1 = this.getCompletenessScore(fig1);
    const score2 = this.getCompletenessScore(fig2);

    if (score1 > score2) return 1;
    if (score2 > score1) return 2;
    return 0; // Equal
  }

  /**
   * Determine which figure is older (for merge preference)
   */
  static getOlderFigure(fig1: MasterFigure, fig2: MasterFigure): 1 | 2 {
    return fig1.createdAt < fig2.createdAt ? 1 : 2;
  }
}

import { MasterFiguresService, type MasterFigure } from './masterFigures';

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
    'subProductLine',
    'series'
  ];

  /**
   * Scan entire master database for duplicates
   */
  static async detectAllDuplicates(): Promise<DuplicateMatch[]> {
    const allFigures = await MasterFiguresService.getAll();
    const matches: DuplicateMatch[] = [];
    const comparedPairs = new Set<string>();

    // Compare each pair once
    for (let i = 0; i < allFigures.length; i++) {
      for (let j = i + 1; j < allFigures.length; j++) {
        const fig1 = allFigures[i];
        const fig2 = allFigures[j];

        // Create unique pair ID (sorted to avoid duplicates)
        const pairId = [fig1.id, fig2.id].sort().join('-');
        if (comparedPairs.has(pairId)) continue;
        comparedPairs.add(pairId);

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
   * Compare two specific figures and determine if they're duplicates
   */
  static compareFigures(fig1: MasterFigure, fig2: MasterFigure): DuplicateMatch {
    const matchedFields: string[] = [];
    let matchScore = 0;

    // Check each comparison field
    for (const field of this.COMPARISON_FIELDS) {
      const val1 = (fig1 as any)[field];
      const val2 = (fig2 as any)[field];

      if (this.fieldsMatch(val1, val2)) {
        matchedFields.push(field);
        matchScore++;
      }
    }

    // Determine match type based on criteria
    let matchType: 'likely' | 'possible' | null = null;

    // Likely match: 3+ fields match
    if (matchScore >= 3) {
      matchType = 'likely';
    }
    // Possible match: name + year OR name + version
    else if (
      matchedFields.includes('name') &&
      (matchedFields.includes('year') || matchedFields.includes('version'))
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

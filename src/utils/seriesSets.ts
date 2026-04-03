import type { SeriesSet, SetCompletion, ActionFigure } from '../types/index';

const STORAGE_KEY = 'custom-series-sets';

// Pre-populated G.I. Joe sets
const PREDEFINED_SETS: SeriesSet[] = [
  // G.I. Joe Classified Series
  {
    id: 'classified-wave-1',
    name: 'Classified Wave 1',
    series: 'Classified',
    manufacturer: 'Hasbro',
    totalCount: 10,
    releaseYear: 2020,
    figureNames: [
      'Snake Eyes',
      'Duke',
      'Scarlett',
      'Roadblock',
      'Destro',
      'Cobra Commander',
      'Cobra Infantry',
      'Red Ninja',
      'Arctic Mission Storm Shadow',
      'Cobra Viper',
    ],
    isCustom: false,
  },
  {
    id: 'classified-wave-2',
    name: 'Classified Wave 2',
    series: 'Classified',
    manufacturer: 'Hasbro',
    totalCount: 8,
    releaseYear: 2021,
    figureNames: [
      'Beach Head',
      'Gung Ho',
      'Cobra Trooper',
      'Arctic Mission Cobra Commander',
      'Firefly',
      'Lady Jaye',
      'Zartan',
      'Baroness',
    ],
    isCustom: false,
  },
  {
    id: 'classified-wave-3',
    name: 'Classified Wave 3',
    series: 'Classified',
    manufacturer: 'Hasbro',
    totalCount: 8,
    releaseYear: 2021,
    figureNames: [
      'Flint',
      'Cobra Officer',
      'Major Bludd',
      'Alley Viper',
      'Spirit',
      'Storm Shadow',
      'Scarlett (v2)',
      'Snake Eyes (v2)',
    ],
    isCustom: false,
  },
  {
    id: 'classified-wave-4',
    name: 'Classified Wave 4',
    series: 'Classified',
    manufacturer: 'Hasbro',
    totalCount: 6,
    releaseYear: 2022,
    figureNames: [
      'Serpentor',
      'Quick Kick',
      'Crimson Guard',
      'Dusty',
      'Stalker',
      'Wayne Sneeden',
    ],
    isCustom: false,
  },

  // A Real American Hero (25th Anniversary)
  {
    id: 'arah-25th-wave-1',
    name: '25th Anniversary Wave 1',
    series: 'A Real American Hero',
    manufacturer: 'Hasbro',
    totalCount: 10,
    releaseYear: 2007,
    figureNames: [
      'Snake Eyes',
      'Duke',
      'Scarlett',
      'Storm Shadow',
      'Cobra Commander',
      'Cobra Officer',
      'Cobra Trooper',
      'Shipwreck',
      'Beachhead',
      'Firefly',
    ],
    isCustom: false,
  },
  {
    id: 'arah-25th-wave-2',
    name: '25th Anniversary Wave 2',
    series: 'A Real American Hero',
    manufacturer: 'Hasbro',
    totalCount: 8,
    releaseYear: 2007,
    figureNames: [
      'Roadblock',
      'Destro',
      'Zartan',
      'Baroness',
      'Wild Bill',
      'Crimson Guard',
      'Flint',
      'Lady Jaye',
    ],
    isCustom: false,
  },

  // Original A Real American Hero (1982-1983)
  {
    id: 'arah-original-1982',
    name: 'Original 1982 Series',
    series: 'A Real American Hero',
    manufacturer: 'Hasbro',
    totalCount: 13,
    releaseYear: 1982,
    figureNames: [
      'Breaker',
      'Clutch',
      'Flash',
      'Grand Slam',
      'Grunt',
      'Hawk',
      'Rock & Roll',
      'Scarlett',
      'Short-Fuze',
      'Snake Eyes',
      'Stalker',
      'Steeler',
      'Zap',
    ],
    isCustom: false,
  },
  {
    id: 'arah-original-1983',
    name: 'Original 1983 Series',
    series: 'A Real American Hero',
    manufacturer: 'Hasbro',
    totalCount: 14,
    releaseYear: 1983,
    figureNames: [
      'Airborne',
      'Doc',
      'Duke',
      'Gung-Ho',
      'Major Bludd',
      'Snow Job',
      'Tripwire',
      'Wild Bill',
      'Cobra Commander',
      'Cobra Officer',
      'Cobra Soldier',
      'Destro',
      'Storm Shadow',
      'Torpedo',
    ],
    isCustom: false,
  },

  // Retro Collection
  {
    id: 'retro-wave-1',
    name: 'Retro Collection Wave 1',
    series: 'Retro Collection',
    manufacturer: 'Hasbro',
    totalCount: 6,
    releaseYear: 2020,
    figureNames: [
      'Duke',
      'Scarlett',
      'Roadblock',
      'Cobra Commander',
      'Destro',
      'Cobra Trooper',
    ],
    isCustom: false,
  },
];

export class SeriesSetsService {
  // Get all predefined sets
  static getPredefinedSets(): SeriesSet[] {
    return PREDEFINED_SETS;
  }

  // Get custom sets for user
  private static getCustomSets(userId: string): SeriesSet[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY}-${userId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading custom sets:', error);
      return [];
    }
  }

  // Save custom sets for user
  private static saveCustomSets(userId: string, sets: SeriesSet[]): void {
    try {
      localStorage.setItem(`${STORAGE_KEY}-${userId}`, JSON.stringify(sets));
    } catch (error) {
      console.error('Error saving custom sets:', error);
    }
  }

  // Get all sets (predefined + custom)
  static getAllSets(userId?: string): SeriesSet[] {
    const predefined = PREDEFINED_SETS;
    const custom = userId ? this.getCustomSets(userId) : [];
    return [...predefined, ...custom];
  }

  // Add custom set
  static addCustomSet(userId: string, set: Omit<SeriesSet, 'id' | 'isCustom'>): SeriesSet {
    const customSets = this.getCustomSets(userId);

    const newSet: SeriesSet = {
      ...set,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isCustom: true,
    };

    customSets.push(newSet);
    this.saveCustomSets(userId, customSets);

    return newSet;
  }

  // Update custom set
  static updateCustomSet(userId: string, setId: string, updates: Partial<SeriesSet>): boolean {
    const customSets = this.getCustomSets(userId);
    const index = customSets.findIndex(s => s.id === setId && s.isCustom);

    if (index === -1) return false;

    customSets[index] = { ...customSets[index], ...updates };
    this.saveCustomSets(userId, customSets);

    return true;
  }

  // Delete custom set
  static deleteCustomSet(userId: string, setId: string): boolean {
    const customSets = this.getCustomSets(userId);
    const filtered = customSets.filter(s => s.id !== setId);

    if (filtered.length === customSets.length) return false;

    this.saveCustomSets(userId, filtered);
    return true;
  }

  // Fuzzy match figure name to set figure names
  private static fuzzyMatch(figureName: string, targetNames: string[]): boolean {
    const normalized = figureName.toLowerCase().trim();

    return targetNames.some(targetName => {
      const normalizedTarget = targetName.toLowerCase().trim();

      // Exact match
      if (normalized === normalizedTarget) return true;

      // Contains match
      if (normalized.includes(normalizedTarget) || normalizedTarget.includes(normalized)) {
        return true;
      }

      // Remove common suffixes/prefixes for matching
      const cleanFigureName = normalized
        .replace(/\s*\(.*?\)/g, '') // Remove parentheses
        .replace(/\s+v\d+$/i, '') // Remove version numbers
        .replace(/\s+(figure|action figure)$/i, '') // Remove "figure" suffix
        .trim();

      const cleanTargetName = normalizedTarget
        .replace(/\s*\(.*?\)/g, '')
        .replace(/\s+v\d+$/i, '')
        .replace(/\s+(figure|action figure)$/i, '')
        .trim();

      if (cleanFigureName === cleanTargetName) return true;

      return false;
    });
  }

  // Get completion data for all sets
  static getCompletionData(userId: string, figures: ActionFigure[]): SetCompletion[] {
    const allSets = this.getAllSets(userId);

    return allSets.map(set => {
      const ownedFigures: string[] = [];

      // Find owned figures that match this set
      figures.forEach(figure => {
        // Check series match
        const seriesMatch =
          figure.series?.toLowerCase() === set.series.toLowerCase() ||
          figure.productLine?.toLowerCase() === set.series.toLowerCase();

        // Check manufacturer match (if specified)
        const manufacturerMatch =
          !set.manufacturer ||
          figure.manufacturer?.toLowerCase() === set.manufacturer.toLowerCase();

        if (seriesMatch && manufacturerMatch) {
          // Check if figure name matches any in the set
          if (this.fuzzyMatch(figure.name, set.figureNames)) {
            ownedFigures.push(figure.name);
          }
        }
      });

      const ownedCount = ownedFigures.length;
      const missingCount = set.totalCount - ownedCount;
      const completionPercentage = (ownedCount / set.totalCount) * 100;

      // Find missing figures
      const ownedNormalized = new Set(ownedFigures.map(n => n.toLowerCase()));
      const missingFigures = set.figureNames.filter(
        name => !Array.from(ownedNormalized).some(owned =>
          this.fuzzyMatch(owned, [name])
        )
      );

      return {
        set,
        ownedCount,
        missingCount,
        completionPercentage,
        ownedFigures,
        missingFigures,
      };
    });
  }

  // Get completion data for a specific set
  static getSetCompletion(
    userId: string,
    setId: string,
    figures: ActionFigure[]
  ): SetCompletion | null {
    const allSets = this.getAllSets(userId);
    const set = allSets.find(s => s.id === setId);

    if (!set) return null;

    const completionData = this.getCompletionData(userId, figures);
    return completionData.find(c => c.set.id === setId) || null;
  }

  // Get sets by series
  static getSetsBySeries(userId: string, series: string): SeriesSet[] {
    const allSets = this.getAllSets(userId);
    return allSets.filter(s => s.series.toLowerCase() === series.toLowerCase());
  }

  // Get sets by manufacturer
  static getSetsByManufacturer(userId: string, manufacturer: string): SeriesSet[] {
    const allSets = this.getAllSets(userId);
    return allSets.filter(
      s => s.manufacturer?.toLowerCase() === manufacturer.toLowerCase()
    );
  }

  // Get completed sets count
  static getCompletedSetsCount(userId: string, figures: ActionFigure[]): number {
    const completionData = this.getCompletionData(userId, figures);
    return completionData.filter(c => c.completionPercentage === 100).length;
  }

  // Get unique series from all sets
  static getAllSeries(userId: string): string[] {
    const allSets = this.getAllSets(userId);
    return Array.from(new Set(allSets.map(s => s.series))).sort();
  }

  // Get unique manufacturers from all sets
  static getAllManufacturers(userId: string): string[] {
    const allSets = this.getAllSets(userId);
    return Array.from(
      new Set(allSets.map(s => s.manufacturer).filter(Boolean) as string[])
    ).sort();
  }
}

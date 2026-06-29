import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  ToyLine,
  ToyLineFigure,
  ToyLineCompletion,
  LineCompletion,
  CollectionImage
} from '../types/toyLine';
import type { ActionFigure } from '../types';
import { MasterFiguresService, type MasterFigure } from './masterFigures';

class ToyLinesService {
  private static userFiguresCollection = 'figures';

  // ===== DYNAMIC TOY LINE GENERATION FROM MASTER FIGURES =====

  /**
   * Generate toy lines dynamically from masterFigures collection
   * Groups figures by franchise/productLine/series
   */
  static async getAll(): Promise<ToyLine[]> {
    try {
      // Get all master figures
      const masterFigures = await MasterFiguresService.getAll();

      // Group figures by franchise/productLine/series to create toy lines
      const toyLineGroups = new Map<string, {
        figures: MasterFigure[];
        name: string;
        manufacturer: string;
        startYear: number;
        endYear?: number;
        description?: string;
        category: string;
      }>();

      for (const figure of masterFigures) {
        // Determine the toy line identifier - use productLine first, then series, then category
        const toyLineName = figure.productLine || figure.series || `${figure.manufacturer} ${figure.category}`;

        if (!toyLineName) continue;

        // Create unique key for grouping
        const key = `${figure.manufacturer}-${toyLineName}`;

        if (!toyLineGroups.has(key)) {
          toyLineGroups.set(key, {
            figures: [],
            name: toyLineName,
            manufacturer: figure.manufacturer,
            startYear: figure.year || new Date().getFullYear(),
            category: figure.category,
            description: figure.subProductLine ? `${figure.subProductLine} collection` : undefined
          });
        }

        const group = toyLineGroups.get(key)!;
        group.figures.push(figure);

        // Update year range
        if (figure.year) {
          if (figure.year < group.startYear) {
            group.startYear = figure.year;
          }
          if (!group.endYear || figure.year > group.endYear) {
            group.endYear = figure.year;
          }
        }
      }

      // Convert groups to ToyLine objects
      const toyLines: ToyLine[] = [];
      for (const [key, group] of toyLineGroups) {
        // Only include toy lines with multiple figures or well-known franchises
        if (group.figures.length >= 2 || this.isWellKnownFranchise(group.name)) {
          toyLines.push({
            id: key, // Use the key as ID
            name: group.name,
            manufacturer: group.manufacturer,
            startYear: group.startYear,
            endYear: group.endYear === group.startYear ? undefined : group.endYear,
            description: group.description,
            category: group.category,
            isActive: !group.endYear || group.endYear >= new Date().getFullYear() - 1,
            figureCount: group.figures.length,
            verified: true,
            isPublic: true,
            source: 'admin',
            createdBy: 'system',
            createdAt: Date.now()
          });
        }
      }

      // Sort by name
      return toyLines.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error generating toy lines from master figures:', error);
      throw new Error('Failed to fetch toy lines');
    }
  }

  /**
   * Check if a franchise is well-known (should be included even with few figures)
   */
  private static isWellKnownFranchise(name: string): boolean {
    const wellKnown = [
      'G.I. Joe',
      'Transformers',
      'Star Wars',
      'Marvel',
      'DC',
      'Teenage Mutant Ninja Turtles',
      'Masters of the Universe',
      'Power Rangers'
    ];

    return wellKnown.some(franchise =>
      name.toLowerCase().includes(franchise.toLowerCase())
    );
  }

  /**
   * Get toy line by ID (which is the generated key)
   */
  static async getById(id: string): Promise<ToyLine | null> {
    try {
      const allLines = await this.getAll();
      return allLines.find(line => line.id === id) || null;
    } catch (error) {
      console.error('Error fetching toy line by ID:', error);
      throw new Error('Failed to fetch toy line');
    }
  }

  // ===== FIGURE MANAGEMENT WITHIN LINES =====

  /**
   * Get all figures in a toy line (from masterFigures collection)
   */
  static async getFiguresInLine(toyLineId: string): Promise<ToyLineFigure[]> {
    try {
      // Parse the toyLineId to get manufacturer and toy line name
      const [manufacturer, ...toyLineNameParts] = toyLineId.split('-');
      const toyLineName = toyLineNameParts.join('-');

      // Get all master figures
      const masterFigures = await MasterFiguresService.getAll();

      // Filter figures that belong to this toy line
      const lineFigures = masterFigures.filter(figure => {
        const figureToyLine = figure.productLine || figure.series || `${figure.manufacturer} ${figure.category}`;
        return figure.manufacturer === manufacturer && figureToyLine === toyLineName;
      });

      // Convert to ToyLineFigure format and add collection images
      const toyLineFigures: ToyLineFigure[] = [];

      for (const figure of lineFigures) {
        // Get collection images for this figure
        const collectionImages = await this.getCollectionImagesForFigure(figure);

        toyLineFigures.push({
          id: figure.id,
          toyLineId,
          name: figure.name,
          figureNumber: figure.productLineNumber,
          year: figure.year || new Date().getFullYear(),
          subLine: figure.subProductLine,
          wave: undefined, // Not in master figures schema
          manufacturer: figure.manufacturer,
          category: figure.category,
          size: figure.size,
          upc: figure.upc,
          collectionImages,
          createdAt: figure.createdAt,
          createdBy: figure.createdBy,
          source: figure.source as any,
          masterFigureId: figure.id
        });
      }

      // Sort by figure number then name
      return toyLineFigures.sort((a, b) => {
        if (a.figureNumber && b.figureNumber) {
          return a.figureNumber.localeCompare(b.figureNumber);
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('Error fetching toy line figures:', error);
      throw new Error('Failed to fetch toy line figures');
    }
  }

  /**
   * Get collection images for a master figure from user collections
   */
  private static async getCollectionImagesForFigure(masterFigure: MasterFigure): Promise<CollectionImage[]> {
    try {
      // Find user figures that match this master figure
      const userFiguresQuery = query(
        collection(db, this.userFiguresCollection),
        where('name', '==', masterFigure.name),
        where('manufacturer', '==', masterFigure.manufacturer),
        where('isPublic', '==', true)
      );

      const userFiguresSnapshot = await getDocs(userFiguresQuery);
      const collectionImages: CollectionImage[] = [];

      for (const userFigureDoc of userFiguresSnapshot.docs) {
        const userFigure = userFigureDoc.data() as ActionFigure;

        // Only include if the figure has images
        if (userFigure.images && userFigure.images.length > 0) {
          const mainImageIndex = userFigure.mainImageIndex || 0;
          const mainImage = userFigure.images[mainImageIndex];

          if (mainImage) {
            collectionImages.push({
              userId: userFigure.userId || '',
              userName: '', // Would need to fetch user data separately
              userDisplayName: '', // Would need to fetch user data separately
              imageUrl: mainImage,
              figureId: userFigureDoc.id,
              uploadedAt: userFigure.createdAt || Date.now()
            });
          }
        }
      }

      return collectionImages;
    } catch (error) {
      console.error('Error fetching collection images:', error);
      return [];
    }
  }

  // ===== USER COMPLETION TRACKING =====

  /**
   * Get completion stats for all toy lines for a user
   */
  static async getUserCompletionStats(userId: string): Promise<ToyLineCompletion[]> {
    try {
      // Get user's figures
      const userFiguresQuery = query(
        collection(db, this.userFiguresCollection),
        where('userId', '==', userId)
      );
      const userFiguresSnapshot = await getDocs(userFiguresQuery);
      const userFigures = userFiguresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));

      // Get all toy lines
      const toyLines = await this.getAll();
      const completionStats: ToyLineCompletion[] = [];

      for (const toyLine of toyLines) {
        const lineCompletion = await this.getLineCompletionForUser(userId, toyLine.id);

        if (lineCompletion.ownedCount > 0) {
          completionStats.push({
            toyLineId: toyLine.id,
            toyLineName: toyLine.name,
            totalFigures: lineCompletion.totalFigures,
            ownedFigures: lineCompletion.ownedCount,
            completionPercentage: lineCompletion.completionPercentage,
            ownedFigureIds: lineCompletion.figuresWithOwnership
              .filter(f => f.owned)
              .map(f => f.userFigureId!)
              .filter(Boolean)
          });
        }
      }

      return completionStats.sort((a, b) => b.completionPercentage - a.completionPercentage);
    } catch (error) {
      console.error('Error getting user completion stats:', error);
      throw new Error('Failed to get completion stats');
    }
  }

  /**
   * Get completion details for a specific toy line and user
   */
  static async getLineCompletionForUser(userId: string, toyLineId: string): Promise<LineCompletion> {
    try {
      // Get all figures in the toy line
      const toyLineFigures = await this.getFiguresInLine(toyLineId);

      // Get user's figures
      const userFiguresQuery = query(
        collection(db, this.userFiguresCollection),
        where('userId', '==', userId)
      );
      const userFiguresSnapshot = await getDocs(userFiguresQuery);
      const userFigures = userFiguresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));

      // Match user figures to toy line figures
      const figuresWithOwnership = toyLineFigures.map(toyLineFigure => {
        // Find matching user figure by name, manufacturer, AND toy line
        const matchingUserFigure = userFigures.find(userFigure => {
          const nameMatch = userFigure.name.toLowerCase() === toyLineFigure.name.toLowerCase();
          const manufacturerMatch = userFigure.manufacturer.toLowerCase() === toyLineFigure.manufacturer.toLowerCase();

          // Match toy line: check productLine first, then series, then use manufacturer + category as fallback
          const userToyLine = userFigure.productLine || userFigure.series || `${userFigure.manufacturer} ${userFigure.category}`;
          const toyLineName = toyLineFigure.name; // This is the toy line name from the dynamic generation

          // Parse toyLineId to get the expected toy line name
          const [, ...toyLineNameParts] = toyLineId.split('-');
          const expectedToyLineName = toyLineNameParts.join('-');

          const toyLineMatch = userToyLine.toLowerCase() === expectedToyLineName.toLowerCase();

          return nameMatch && manufacturerMatch && toyLineMatch;
        });

        return {
          figure: toyLineFigure,
          owned: !!matchingUserFigure,
          userFigureId: matchingUserFigure?.id
        };
      });

      const ownedCount = figuresWithOwnership.filter(f => f.owned).length;
      const totalFigures = toyLineFigures.length;
      const completionPercentage = totalFigures > 0 ? Math.round((ownedCount / totalFigures) * 100) : 0;

      return {
        toyLineId,
        totalFigures,
        ownedCount,
        missingCount: totalFigures - ownedCount,
        completionPercentage,
        figuresWithOwnership
      };
    } catch (error) {
      console.error('Error getting line completion for user:', error);
      throw new Error('Failed to get line completion');
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Search toy lines by name
   */
  static async searchByName(searchTerm: string): Promise<ToyLine[]> {
    try {
      const allLines = await this.getAll();
      const term = searchTerm.toLowerCase();

      return allLines.filter(line =>
        line.name.toLowerCase().includes(term) ||
        line.manufacturer.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching toy lines:', error);
      throw new Error('Failed to search toy lines');
    }
  }

  /**
   * Get toy lines by manufacturer
   */
  static async getByManufacturer(manufacturer: string): Promise<ToyLine[]> {
    try {
      const allLines = await this.getAll();
      return allLines.filter(line => line.manufacturer === manufacturer);
    } catch (error) {
      console.error('Error fetching toy lines by manufacturer:', error);
      throw new Error('Failed to fetch toy lines by manufacturer');
    }
  }

  /**
   * Debug ownership detection for a specific user and toy line
   */
  static async debugOwnership(userId: string, toyLineId: string): Promise<{
    toyLine: ToyLine | null;
    toyLineFigures: ToyLineFigure[];
    userFigures: ActionFigure[];
    matches: Array<{
      toyLineFigure: ToyLineFigure;
      userFigure?: ActionFigure;
      matched: boolean;
      reason: string;
    }>;
  }> {
    try {
      const toyLine = await this.getById(toyLineId);
      if (!toyLine) {
        throw new Error('Toy line not found');
      }

      const toyLineFigures = await this.getFiguresInLine(toyLineId);

      // Get user's figures
      const userFiguresQuery = query(
        collection(db, this.userFiguresCollection),
        where('userId', '==', userId)
      );
      const userFiguresSnapshot = await getDocs(userFiguresQuery);
      const userFigures = userFiguresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));

      // Parse toyLineId to get expected toy line name
      const [, ...toyLineNameParts] = toyLineId.split('-');
      const expectedToyLineName = toyLineNameParts.join('-');

      const matches = toyLineFigures.map(toyLineFigure => {
        const potentialMatches = userFigures.filter(userFigure =>
          userFigure.name.toLowerCase() === toyLineFigure.name.toLowerCase() &&
          userFigure.manufacturer.toLowerCase() === toyLineFigure.manufacturer.toLowerCase()
        );

        if (potentialMatches.length === 0) {
          return {
            toyLineFigure,
            matched: false,
            reason: 'No user figure with matching name and manufacturer'
          };
        }

        // Check toy line matching for each potential match
        for (const userFigure of potentialMatches) {
          const userToyLine = userFigure.productLine || userFigure.series || `${userFigure.manufacturer} ${userFigure.category}`;
          const toyLineMatch = userToyLine.toLowerCase() === expectedToyLineName.toLowerCase();

          if (toyLineMatch) {
            return {
              toyLineFigure,
              userFigure,
              matched: true,
              reason: `Matched on toy line: "${userToyLine}"`
            };
          }
        }

        // Show the first non-matching figure with details
        const userFigure = potentialMatches[0];
        const userToyLine = userFigure.productLine || userFigure.series || `${userFigure.manufacturer} ${userFigure.category}`;

        return {
          toyLineFigure,
          userFigure,
          matched: false,
          reason: `Name/manufacturer match but wrong toy line: user has "${userToyLine}", expected "${expectedToyLineName}"`
        };
      });

      return {
        toyLine,
        toyLineFigures,
        userFigures,
        matches
      };

    } catch (error) {
      console.error('Error debugging ownership:', error);
      throw new Error(`Debug failed: ${error.message}`);
    }
  }
}

export { ToyLinesService };
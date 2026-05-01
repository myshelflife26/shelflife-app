// Unified Figure Search Service
// Searches master figures database first, then community database, then falls back to eBay

import { EbaySearchService, type EbayFigureResult } from './ebayAPI';
import { CommunityDatabaseService, type CommunityFigure } from './communityDatabase';
import { MasterFiguresService } from './masterFigures';

export interface FigureSearchResult {
  source: 'community' | 'ebay';
  name: string;
  manufacturer?: string;
  year?: string;
  version?: string;
  franchise?: string;
  images: string[];
  estimatedValue?: number;
  productLine?: string;
  productLineNumber?: string;
  subProductLine?: string;
  category?: string;
  size?: string;
  packaging?: string;
  upc?: string;
  condition?: string;
  verified?: boolean; // For community results
  ebayUrl?: string; // For eBay results
  communityId?: string; // For tracking usage
}

export class FigureSearchService {
  /**
   * Unified search - checks master figures database, community database, then eBay
   * This provides fast results from databases and falls back to eBay
   */
  static async search(query: string): Promise<FigureSearchResult[]> {
    const results: FigureSearchResult[] = [];

    // 1. Search Firebase master figures database first
    try {
      const masterFigures = await MasterFiguresService.search(query);

      results.push(
        ...masterFigures.map((fig) => ({
          source: 'community' as const,
          name: fig.name,
          manufacturer: fig.manufacturer || 'Unknown',
          year: fig.year?.toString(),
          version: fig.version,
          images: fig.imageUrl ? [fig.imageUrl] : [],
          estimatedValue: undefined,
          productLine: fig.productLine,
          productLineNumber: fig.productLineNumber,
          subProductLine: fig.subProductLine,
          category: fig.category,
          size: fig.size,
          packaging: fig.packaging,
          upc: fig.upc,
          verified: true, // Master database figures are verified
          communityId: fig.id,
        }))
      );
    } catch (error) {
      console.error('Master figures search failed:', error);
    }

    // 2. Search local community database
    try {
      const communityResults = CommunityDatabaseService.search(query);

      results.push(
        ...communityResults.map((fig) => ({
          source: 'community' as const,
          name: fig.name,
          manufacturer: fig.manufacturer,
          year: fig.year,
          version: undefined, // Local community database doesn't store version
          images: fig.images,
          estimatedValue: fig.averageValue,
          productLine: fig.productLine,
          subProductLine: fig.subProductLine,
          category: fig.category,
          verified: fig.verified,
          communityId: fig.id,
        }))
      );
    } catch (error) {
      console.error('Community database search failed:', error);
    }

    // 3. If less than 5 results, search eBay for more
    if (results.length < 5) {
      try {
        const ebayResults = await EbaySearchService.search(query);

        results.push(
          ...ebayResults.map((item) => ({
            source: 'ebay' as const,
            name: item.title,
            manufacturer: item.manufacturer,
            year: item.year,
            version: undefined, // eBay doesn't provide version separately
            images: item.imageUrl ? [item.imageUrl] : [],
            estimatedValue: item.price,
            condition: item.condition,
            productLine: EbaySearchService.extractProductLine(item.title),
            ebayUrl: item.listingUrl,
          }))
        );
      } catch (error) {
        console.error('eBay search failed:', error);
        // Don't throw - just return database results if eBay fails
      }
    }

    return results;
  }

  /**
   * Search master figures database and community database
   * Shows ALL matching figures (including duplicates)
   */
  static async searchCommunityOnly(query: string): Promise<FigureSearchResult[]> {
    const results: FigureSearchResult[] = [];

    // 1. Search Firebase master figures database first
    try {
      console.log('Searching master figures database for:', query);
      const masterFigures = await MasterFiguresService.search(query);
      console.log('Master figures found:', masterFigures.length, masterFigures);

      results.push(
        ...masterFigures.map((fig) => ({
          source: 'community' as const,
          name: fig.name,
          manufacturer: fig.manufacturer || 'Unknown',
          year: fig.year?.toString(),
          version: fig.version,
          images: fig.imageUrl ? [fig.imageUrl] : [],
          estimatedValue: undefined,
          productLine: fig.productLine,
          productLineNumber: fig.productLineNumber,
          subProductLine: fig.subProductLine,
          category: fig.category,
          size: fig.size,
          packaging: fig.packaging,
          upc: fig.upc,
          verified: true, // Master database figures are verified
          communityId: fig.id,
        }))
      );
    } catch (error) {
      console.error('Master figures search failed:', error);
    }

    // 2. Also search local community database
    try {
      const communityResults = CommunityDatabaseService.search(query);
      console.log('Local community results found:', communityResults.length);

      results.push(
        ...communityResults.map((fig) => ({
          source: 'community' as const,
          name: fig.name,
          manufacturer: fig.manufacturer,
          year: fig.year,
          version: undefined, // Local community database doesn't store version
          images: fig.images,
          estimatedValue: fig.averageValue,
          productLine: fig.productLine,
          subProductLine: fig.subProductLine,
          category: fig.category,
          verified: fig.verified,
          communityId: fig.id,
        }))
      );
    } catch (error) {
      console.error('Community database search failed:', error);
    }

    console.log('Total search results:', results.length, results);
    return results;
  }

  /**
   * Search only eBay (slower, always fresh data)
   * Useful when user wants current market prices
   */
  static async searchEbayOnly(query: string): Promise<FigureSearchResult[]> {
    try {
      const ebayResults = await EbaySearchService.search(query);

      return ebayResults.map((item) => ({
        source: 'ebay' as const,
        name: item.title,
        manufacturer: item.manufacturer,
        year: item.year,
        version: undefined, // eBay doesn't provide version separately
        images: item.imageUrl ? [item.imageUrl] : [],
        estimatedValue: item.price,
        condition: item.condition,
        productLine: EbaySearchService.extractProductLine(item.title),
        ebayUrl: item.listingUrl,
      }));
    } catch (error) {
      console.error('eBay search failed:', error);
      throw error;
    }
  }

  /**
   * When user imports a figure, save to community database
   * This builds our database over time
   */
  static saveToDatabase(
    result: FigureSearchResult,
    userId: string,
    userName: string
  ): void {
    try {
      if (result.source === 'ebay') {
        // This came from eBay, add to community database
        CommunityDatabaseService.add({
          name: result.name,
          manufacturer: result.manufacturer || 'Unknown',
          year: result.year || 'Unknown',
          productLine: result.productLine,
          subProductLine: result.subProductLine,
          category: result.category,
          images: result.images,
          averageValue: result.estimatedValue,
          contributorId: userId,
          contributorName: userName,
          verified: false, // Needs manual verification
        });
      } else if (result.communityId) {
        // This came from community database, increment usage
        CommunityDatabaseService.incrementUsage(result.communityId);
      }
    } catch (error) {
      console.error('Failed to save to community database:', error);
      // Don't throw - importing the figure is more important
    }
  }

  /**
   * Verify a community figure (for moderators)
   */
  static verifyCommunityFigure(figureId: string): boolean {
    return CommunityDatabaseService.verify(figureId);
  }

  /**
   * Get community database statistics
   */
  static getCommunityStats() {
    return CommunityDatabaseService.getStats();
  }

  /**
   * Get figures contributed by current user
   */
  static getUserContributions(userId: string): CommunityFigure[] {
    return CommunityDatabaseService.getByContributor(userId);
  }
}

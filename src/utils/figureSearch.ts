// Unified Figure Search Service
// Searches community database first, then falls back to eBay

import { EbaySearchService, type EbayFigureResult } from './ebayAPI';
import { CommunityDatabaseService, type CommunityFigure } from './communityDatabase';

export interface FigureSearchResult {
  source: 'community' | 'ebay';
  name: string;
  manufacturer?: string;
  year?: string;
  images: string[];
  estimatedValue?: number;
  productLine?: string;
  subProductLine?: string;
  category?: string;
  condition?: string;
  verified?: boolean; // For community results
  ebayUrl?: string; // For eBay results
  communityId?: string; // For tracking usage
}

export class FigureSearchService {
  /**
   * Unified search - checks community database first, then eBay
   * This provides fast results from community DB and falls back to eBay
   */
  static async search(query: string): Promise<FigureSearchResult[]> {
    const results: FigureSearchResult[] = [];

    // 1. Search community database first (instant, no API call)
    try {
      const communityResults = CommunityDatabaseService.search(query);

      results.push(
        ...communityResults.map((fig) => ({
          source: 'community' as const,
          name: fig.name,
          manufacturer: fig.manufacturer,
          year: fig.year,
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

    // 2. If less than 5 community results, search eBay for more
    if (results.length < 5) {
      try {
        const ebayResults = await EbaySearchService.search(query);

        results.push(
          ...ebayResults.map((item) => ({
            source: 'ebay' as const,
            name: item.title,
            manufacturer: item.manufacturer,
            year: item.year,
            images: item.imageUrl ? [item.imageUrl] : [],
            estimatedValue: item.price,
            condition: item.condition,
            productLine: EbaySearchService.extractProductLine(item.title),
            ebayUrl: item.listingUrl,
          }))
        );
      } catch (error) {
        console.error('eBay search failed:', error);
        // Don't throw - just return community results if eBay fails
      }
    }

    return results;
  }

  /**
   * Search only community database (fast)
   * Useful for quick lookups
   */
  static searchCommunityOnly(query: string): FigureSearchResult[] {
    const communityResults = CommunityDatabaseService.search(query);

    return communityResults.map((fig) => ({
      source: 'community' as const,
      name: fig.name,
      manufacturer: fig.manufacturer,
      year: fig.year,
      images: fig.images,
      estimatedValue: fig.averageValue,
      productLine: fig.productLine,
      subProductLine: fig.subProductLine,
      category: fig.category,
      verified: fig.verified,
      communityId: fig.id,
    }));
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

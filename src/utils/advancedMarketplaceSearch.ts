import { MarketplaceService } from './marketplaceService';
import { SmartPricingService } from './smartPricing';
import { Storage } from './storage';
import type { ActionFigure, Filters } from '../types/index';
import { privacyAnalytics } from './privacyAnalytics';

/**
 * AdvancedMarketplaceSearchService - Enhanced search and discovery for marketplace
 *
 * Features:
 * - Intelligent search with fuzzy matching
 * - Saved searches with alerts
 * - Advanced filtering and sorting options
 * - Personalized recommendations
 * - Price-based search (under budget, deals, etc.)
 * - Collection gap analysis
 * - Search history and trending searches
 */

export interface SearchFilter extends Filters {
  // Additional marketplace-specific filters
  priceMin?: number;
  priceMax?: number;
  listingAge?: 'today' | 'week' | 'month' | 'all';
  dealQuality?: 'all' | 'fair' | 'good' | 'excellent';
  sellerRating?: number; // Minimum seller rating
  sellerLocation?: string;
  hasImages?: boolean;
  excludeOwned?: boolean; // Exclude figures user already owns
  negotiable?: boolean;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: SearchFilter;
  alertsEnabled: boolean;
  lastRun: number;
  resultCount: number;
  createdAt: number;
}

export interface SearchResult {
  figures: ActionFigure[];
  totalCount: number;
  facets: SearchFacets;
  searchStats: SearchStats;
  recommendations?: ActionFigure[];
}

export interface SearchFacets {
  manufacturers: { name: string; count: number; avgPrice: number }[];
  conditions: { name: string; count: number; avgPrice: number }[];
  priceRanges: { range: string; count: number; label: string }[];
  series: { name: string; count: number; avgPrice: number }[];
  categories: { name: string; count: number; avgPrice: number }[];
}

export interface SearchStats {
  averagePrice: number;
  medianPrice: number;
  priceRange: { min: number; max: number };
  totalListings: number;
  newListingsToday: number;
  dealCount: number;
}

export interface CollectionGap {
  figureId: string;
  figureName: string;
  manufacturer: string;
  series: string;
  averagePrice: number;
  availability: number; // How many are available
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

export class AdvancedMarketplaceSearchService {
  private static readonly SAVED_SEARCHES_KEY = 'saved_marketplace_searches';
  private static readonly SEARCH_HISTORY_KEY = 'marketplace_search_history';
  private static readonly MAX_SEARCH_HISTORY = 50;

  /**
   * Perform advanced marketplace search
   */
  static async search(
    query: string,
    filters: SearchFilter = {},
    userId?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<SearchResult> {
    try {
      // Get all marketplace listings
      const allListings = await MarketplaceService.getAllListings();

      // Apply text search
      let filteredResults = query
        ? this.performTextSearch(allListings, query)
        : allListings;

      // Apply filters
      filteredResults = this.applyFilters(filteredResults, filters, userId);

      // Apply sorting
      filteredResults = this.applySorting(filteredResults, filters.sort || 'relevance');

      // Calculate facets before pagination
      const facets = this.calculateFacets(filteredResults);
      const searchStats = this.calculateSearchStats(filteredResults);

      // Apply pagination
      const startIndex = (page - 1) * pageSize;
      const paginatedResults = filteredResults.slice(startIndex, startIndex + pageSize);

      // Get personalized recommendations if user provided
      let recommendations: ActionFigure[] = [];
      if (userId) {
        recommendations = await this.getPersonalizedRecommendations(userId, filteredResults);
      }

      // Track search analytics
      this.trackSearchAnalytics(query, filters, filteredResults.length);

      // Save to search history
      if (userId) {
        this.saveToSearchHistory(userId, query, filters);
      }

      return {
        figures: paginatedResults,
        totalCount: filteredResults.length,
        facets,
        searchStats,
        recommendations
      };

    } catch (error) {
      console.error('Advanced marketplace search failed:', error);
      return {
        figures: [],
        totalCount: 0,
        facets: this.getEmptyFacets(),
        searchStats: this.getEmptyStats(),
        recommendations: []
      };
    }
  }

  /**
   * Perform intelligent text search with fuzzy matching
   */
  private static performTextSearch(listings: ActionFigure[], query: string): ActionFigure[] {
    if (!query.trim()) return listings;

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    const results: { figure: ActionFigure; score: number }[] = [];

    for (const figure of listings) {
      let score = 0;

      // Search in various fields with different weights
      const searchFields = {
        name: { text: figure.name.toLowerCase(), weight: 10 },
        manufacturer: { text: figure.manufacturer.toLowerCase(), weight: 5 },
        series: { text: figure.series.toLowerCase(), weight: 7 },
        category: { text: figure.category.toLowerCase(), weight: 3 },
        notes: { text: (figure.notes || '').toLowerCase(), weight: 1 },
        productLine: { text: (figure.productLine || '').toLowerCase(), weight: 4 }
      };

      for (const term of searchTerms) {
        for (const [fieldName, field] of Object.entries(searchFields)) {
          if (field.text.includes(term)) {
            // Exact word match gets full weight
            if (field.text.split(' ').includes(term)) {
              score += field.weight * 2;
            } else {
              // Partial match gets partial weight
              score += field.weight;
            }

            // Bonus for matches at the beginning
            if (field.text.startsWith(term)) {
              score += field.weight;
            }
          }

          // Fuzzy matching for typos (simplified)
          if (term.length > 3 && this.fuzzyMatch(term, field.text)) {
            score += field.weight * 0.5;
          }
        }
      }

      if (score > 0) {
        results.push({ figure, score });
      }
    }

    // Sort by relevance score
    return results
      .sort((a, b) => b.score - a.score)
      .map(result => result.figure);
  }

  /**
   * Apply filters to search results
   */
  private static applyFilters(
    listings: ActionFigure[],
    filters: SearchFilter,
    userId?: string
  ): ActionFigure[] {
    let filtered = listings;

    // Price filters
    if (filters.priceMin !== undefined) {
      filtered = filtered.filter(f => f.currentValue >= filters.priceMin!);
    }
    if (filters.priceMax !== undefined) {
      filtered = filtered.filter(f => f.currentValue <= filters.priceMax!);
    }

    // Standard filters (manufacturer, condition, etc.)
    if (filters.manufacturers?.length) {
      filtered = filtered.filter(f => f.manufacturer && filters.manufacturers!.includes(f.manufacturer));
    }
    if (filters.conditions?.length) {
      filtered = filtered.filter(f => f.condition && filters.conditions!.includes(f.condition));
    }
    if (filters.categories?.length) {
      filtered = filtered.filter(f => f.category && filters.categories!.includes(f.category));
    }
    if (filters.sizes?.length) {
      filtered = filtered.filter(f => filters.sizes!.includes(f.size || ''));
    }

    // Marketplace-specific filters
    if (filters.listingAge) {
      const now = Date.now();
      let cutoffTime = 0;

      switch (filters.listingAge) {
        case 'today':
          cutoffTime = now - (24 * 60 * 60 * 1000);
          break;
        case 'week':
          cutoffTime = now - (7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffTime = now - (30 * 24 * 60 * 60 * 1000);
          break;
      }

      if (cutoffTime > 0) {
        filtered = filtered.filter(f =>
          (f.marketplaceListing?.listedAt || f.updatedAt || f.createdAt || 0) >= cutoffTime
        );
      }
    }

    if (filters.hasImages) {
      filtered = filtered.filter(f =>
        (f.images && f.images.length > 0) || f.imageUrl
      );
    }

    // Exclude figures user already owns
    if (filters.excludeOwned && userId) {
      const userFigures = Storage.getAll(userId);
      const ownedNames = new Set(
        userFigures.map(f => `${f.name}-${f.manufacturer}-${f.series}`)
      );

      filtered = filtered.filter(f =>
        !ownedNames.has(`${f.name}-${f.manufacturer}-${f.series}`)
      );
    }

    return filtered;
  }

  /**
   * Apply sorting to search results
   */
  private static applySorting(listings: ActionFigure[], sortBy: string): ActionFigure[] {
    const sorted = [...listings];

    switch (sortBy) {
      case 'price_low':
        return sorted.sort((a, b) => a.currentValue - b.currentValue);

      case 'price_high':
        return sorted.sort((a, b) => b.currentValue - a.currentValue);

      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));

      case 'manufacturer':
        return sorted.sort((a, b) =>
          a.manufacturer.localeCompare(b.manufacturer) || a.name.localeCompare(b.name)
        );

      case 'date_new':
        return sorted.sort((a, b) =>
          (b.marketplaceListing?.listedAt || b.updatedAt || b.createdAt || 0) -
          (a.marketplaceListing?.listedAt || a.updatedAt || a.createdAt || 0)
        );

      case 'date_old':
        return sorted.sort((a, b) =>
          (a.marketplaceListing?.listedAt || a.updatedAt || a.createdAt || 0) -
          (b.marketplaceListing?.listedAt || b.updatedAt || b.createdAt || 0)
        );

      case 'condition':
        return sorted.sort((a, b) => {
          const conditionRank = { 'MIB': 6, 'MOC': 5, 'Mint': 4, 'Loose': 3, 'Good': 2, 'Fair': 1, 'Poor': 0 };
          const aRank = conditionRank[a.condition as keyof typeof conditionRank] || 0;
          const bRank = conditionRank[b.condition as keyof typeof conditionRank] || 0;
          return bRank - aRank;
        });

      case 'relevance':
      default:
        return sorted; // Already sorted by relevance if text search was performed
    }
  }

  /**
   * Calculate search facets for filtering UI
   */
  private static calculateFacets(listings: ActionFigure[]): SearchFacets {
    const manufacturers = new Map<string, { count: number; totalPrice: number }>();
    const conditions = new Map<string, { count: number; totalPrice: number }>();
    const series = new Map<string, { count: number; totalPrice: number }>();
    const categories = new Map<string, { count: number; totalPrice: number }>();

    for (const figure of listings) {
      // Manufacturers
      const mfg = manufacturers.get(figure.manufacturer) || { count: 0, totalPrice: 0 };
      mfg.count++;
      mfg.totalPrice += figure.currentValue;
      manufacturers.set(figure.manufacturer, mfg);

      // Conditions
      const cond = conditions.get(figure.condition) || { count: 0, totalPrice: 0 };
      cond.count++;
      cond.totalPrice += figure.currentValue;
      conditions.set(figure.condition, cond);

      // Series
      const ser = series.get(figure.series) || { count: 0, totalPrice: 0 };
      ser.count++;
      ser.totalPrice += figure.currentValue;
      series.set(figure.series, ser);

      // Categories
      const cat = categories.get(figure.category) || { count: 0, totalPrice: 0 };
      cat.count++;
      cat.totalPrice += figure.currentValue;
      categories.set(figure.category, cat);
    }

    // Convert to arrays and sort by count
    const toFacetArray = (map: Map<string, { count: number; totalPrice: number }>) =>
      Array.from(map.entries())
        .map(([name, data]) => ({
          name,
          count: data.count,
          avgPrice: Math.round(data.totalPrice / data.count)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 per facet

    // Price ranges
    const prices = listings.map(f => f.currentValue).sort((a, b) => a - b);
    const priceRanges = this.calculatePriceRanges(prices);

    return {
      manufacturers: toFacetArray(manufacturers),
      conditions: toFacetArray(conditions),
      series: toFacetArray(series),
      categories: toFacetArray(categories),
      priceRanges
    };
  }

  /**
   * Calculate price ranges for faceted search
   */
  private static calculatePriceRanges(sortedPrices: number[]): { range: string; count: number; label: string }[] {
    if (sortedPrices.length === 0) return [];

    const ranges = [
      { min: 0, max: 25, label: 'Under $25' },
      { min: 25, max: 50, label: '$25 - $50' },
      { min: 50, max: 100, label: '$50 - $100' },
      { min: 100, max: 200, label: '$100 - $200' },
      { min: 200, max: 500, label: '$200 - $500' },
      { min: 500, max: Infinity, label: 'Over $500' }
    ];

    return ranges
      .map(range => ({
        range: `${range.min}-${range.max === Infinity ? 'max' : range.max}`,
        count: sortedPrices.filter(p => p >= range.min && p < range.max).length,
        label: range.label
      }))
      .filter(r => r.count > 0);
  }

  /**
   * Calculate search statistics
   */
  private static calculateSearchStats(listings: ActionFigure[]): SearchStats {
    if (listings.length === 0) return this.getEmptyStats();

    const prices = listings.map(f => f.currentValue).sort((a, b) => a - b);
    const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const medianPrice = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)];

    const now = Date.now();
    const today = now - (24 * 60 * 60 * 1000);

    const newListingsToday = listings.filter(f =>
      (f.marketplaceListing?.listedAt || f.updatedAt || f.createdAt || 0) >= today
    ).length;

    // Simple deal detection (priced 20% below average for similar figures)
    const dealCount = listings.filter(f => f.currentValue < averagePrice * 0.8).length;

    return {
      averagePrice: Math.round(averagePrice),
      medianPrice: Math.round(medianPrice),
      priceRange: { min: prices[0] || 0, max: prices[prices.length - 1] || 0 },
      totalListings: listings.length,
      newListingsToday,
      dealCount
    };
  }

  /**
   * Get personalized recommendations based on user's collection
   */
  private static async getPersonalizedRecommendations(
    userId: string,
    searchResults: ActionFigure[]
  ): Promise<ActionFigure[]> {
    try {
      const userFigures = Storage.getAll(userId);
      if (userFigures.length === 0) return [];

      // Analyze user's collection patterns
      const userManufacturers = this.getTopValues(userFigures.map(f => f.manufacturer));
      const userCategories = this.getTopValues(userFigures.map(f => f.category));
      const userSeries = this.getTopValues(userFigures.map(f => f.series));

      // Score recommendations based on user preferences
      const scored = searchResults
        .map(figure => ({
          figure,
          score: this.calculateRecommendationScore(figure, userManufacturers, userCategories, userSeries)
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);

      return scored.slice(0, 5).map(item => item.figure);

    } catch (error) {
      console.error('Failed to generate personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Calculate recommendation score based on user preferences
   */
  private static calculateRecommendationScore(
    figure: ActionFigure,
    userManufacturers: Map<string, number>,
    userCategories: Map<string, number>,
    userSeries: Map<string, number>
  ): number {
    let score = 0;

    // Manufacturer preference
    score += (userManufacturers.get(figure.manufacturer) || 0) * 3;

    // Category preference
    score += (userCategories.get(figure.category) || 0) * 2;

    // Series preference (higher weight for exact series match)
    score += (userSeries.get(figure.series) || 0) * 5;

    return score;
  }

  /**
   * Get top values from an array with counts
   */
  private static getTopValues(values: string[]): Map<string, number> {
    const counts = new Map<string, number>();

    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }

    return counts;
  }

  /**
   * Simple fuzzy matching for search terms
   */
  private static fuzzyMatch(term: string, text: string): boolean {
    if (term.length < 3) return false;

    // Simple edit distance check (very basic implementation)
    const words = text.split(' ');
    return words.some(word =>
      word.length >= term.length - 1 &&
      word.length <= term.length + 1 &&
      this.levenshteinDistance(term, word) <= 1
    );
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Save search to history
   */
  private static saveToSearchHistory(userId: string, query: string, filters: SearchFilter): void {
    try {
      const key = `${this.SEARCH_HISTORY_KEY}-${userId}`;
      const history = JSON.parse(localStorage.getItem(key) || '[]');

      const searchEntry = {
        query,
        filters,
        timestamp: Date.now()
      };

      history.unshift(searchEntry);

      // Limit history size
      if (history.length > this.MAX_SEARCH_HISTORY) {
        history.splice(this.MAX_SEARCH_HISTORY);
      }

      localStorage.setItem(key, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }

  /**
   * Track search analytics
   */
  private static trackSearchAnalytics(query: string, filters: SearchFilter, resultCount: number): void {
    privacyAnalytics.trackEvent('marketplace_search', {
      hasQuery: !!query,
      hasFilters: Object.keys(filters).length > 0,
      resultCount: Math.min(resultCount, 100), // Cap for privacy
      hasPriceFilter: !!(filters.priceMin || filters.priceMax)
    });
  }

  /**
   * Get empty facets structure
   */
  private static getEmptyFacets(): SearchFacets {
    return {
      manufacturers: [],
      conditions: [],
      priceRanges: [],
      series: [],
      categories: []
    };
  }

  /**
   * Get empty stats structure
   */
  private static getEmptyStats(): SearchStats {
    return {
      averagePrice: 0,
      medianPrice: 0,
      priceRange: { min: 0, max: 0 },
      totalListings: 0,
      newListingsToday: 0,
      dealCount: 0
    };
  }

  /**
   * Analyze collection gaps for purchase recommendations
   */
  static async analyzeCollectionGaps(userId: string): Promise<CollectionGap[]> {
    try {
      const userFigures = Storage.getAll(userId);
      const allListings = await MarketplaceService.getAllListings();

      // Identify series the user is collecting
      const userSeries = this.getTopValues(userFigures.map(f => f.series));
      const gaps: CollectionGap[] = [];

      for (const [seriesName, userCount] of userSeries.entries()) {
        if (userCount < 2) continue; // Skip series with only 1 figure

        // Find all figures in this series available in marketplace
        const seriesFigures = allListings.filter(f => f.series === seriesName);

        // Find figures user doesn't have
        const ownedNames = new Set(userFigures.map(f => f.name));
        const missingFigures = seriesFigures.filter(f => !ownedNames.has(f.name));

        for (const figure of missingFigures) {
          const availability = allListings.filter(f => f.name === figure.name).length;

          gaps.push({
            figureId: figure.id,
            figureName: figure.name,
            manufacturer: figure.manufacturer,
            series: figure.series,
            averagePrice: figure.currentValue,
            availability,
            priority: availability <= 2 ? 'high' : availability <= 5 ? 'medium' : 'low',
            reasoning: availability <= 2
              ? 'Rare - limited availability'
              : `Complete your ${seriesName} collection`
          });
        }
      }

      return gaps
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
        .slice(0, 10);

    } catch (error) {
      console.error('Failed to analyze collection gaps:', error);
      return [];
    }
  }
}
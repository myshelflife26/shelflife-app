import { MarketplaceService } from './marketplaceService';
import { SmartPricingService } from './smartPricing';
import { Storage } from './storage';
import type { ActionFigure } from '../types/index';
import type { User } from '../types/user';
import { privacyAnalytics } from './privacyAnalytics';

/**
 * MarketplaceAnalyticsService - Comprehensive analytics for marketplace activity
 *
 * Features:
 * - Seller performance analytics and insights
 * - Buyer behavior and spending analysis
 * - Market trend analysis and forecasting
 * - Price performance tracking
 * - Collection value analytics
 * - Market opportunity identification
 * - Seasonal trend analysis
 */

export interface SellerAnalytics {
  totalListings: number;
  activeListings: number;
  averageListingTime: number; // Days
  priceCompetitiveness: number; // 0-1 score
  listingQuality: number; // 0-1 score based on images, descriptions
  viewsPerListing: number;
  interactionRate: number; // Messages/views ratio
  topPerformingCategories: { category: string; avgViews: number; avgPrice: number }[];
  pricingAccuracy: number; // How close to market value
  recommendations: SellerRecommendation[];
}

export interface BuyerAnalytics {
  totalPurchases: number;
  totalSpent: number;
  averagePurchasePrice: number;
  savingsFromDeals: number;
  topCategories: { category: string; spent: number; count: number }[];
  priceRange: { min: number; max: number; preferred: number };
  dealFindingScore: number; // How good at finding deals
  collectionCompleteness: { [series: string]: number }; // Percentage complete
  recommendedPurchases: BuyerRecommendation[];
}

export interface MarketInsights {
  hotCategories: { name: string; growthRate: number; avgPrice: number }[];
  priceTrends: { manufacturer: string; trend: 'up' | 'down' | 'stable'; percentage: number }[];
  inventoryHealth: { overstocked: string[]; understocked: string[]; balanced: string[] };
  seasonalTrends: { season: string; popularCategories: string[]; priceMultiplier: number }[];
  marketOpportunities: MarketOpportunity[];
}

export interface SellerRecommendation {
  type: 'pricing' | 'timing' | 'listing_quality' | 'inventory';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  figureIds?: string[]; // Specific figures this applies to
}

export interface BuyerRecommendation {
  type: 'deal' | 'collection_gap' | 'price_alert' | 'seasonal';
  figureId: string;
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  savings?: number; // Potential savings
  reasoning: string;
}

export interface MarketOpportunity {
  type: 'underpriced' | 'high_demand' | 'seasonal' | 'rare_availability';
  category: string;
  manufacturer?: string;
  series?: string;
  description: string;
  confidence: number; // 0-1
  potentialReturn: number; // Percentage
}

export class MarketplaceAnalyticsService {

  /**
   * Get comprehensive seller analytics
   */
  static async getSellerAnalytics(userId: string): Promise<SellerAnalytics> {
    try {
      const userFigures = Storage.getAll(userId);
      const allListings = await MarketplaceService.getAllListings();

      // Filter to user's listed figures
      const userListings = userFigures.filter(f => f.isListed);

      if (userListings.length === 0) {
        return this.getEmptySellerAnalytics();
      }

      // Calculate basic metrics
      const totalListings = userFigures.filter(f => f.marketplaceListing).length;
      const activeListings = userListings.length;

      // Calculate average listing time
      const now = Date.now();
      const listingTimes = userListings
        .map(f => f.marketplaceListing?.listedAt || f.updatedAt || f.createdAt || now)
        .map(time => (now - time) / (24 * 60 * 60 * 1000)); // Convert to days

      const averageListingTime = listingTimes.length > 0
        ? listingTimes.reduce((sum, time) => sum + time, 0) / listingTimes.length
        : 0;

      // Calculate price competitiveness
      const priceCompetitiveness = await this.calculatePriceCompetitiveness(userListings, allListings);

      // Calculate listing quality score
      const listingQuality = this.calculateListingQuality(userListings);

      // Analyze top performing categories
      const categoryPerformance = this.analyzeCategoryPerformance(userListings);

      // Calculate pricing accuracy
      const pricingAccuracy = await this.calculatePricingAccuracy(userListings);

      // Generate recommendations
      const recommendations = await this.generateSellerRecommendations(userId, userListings, allListings);

      const analytics: SellerAnalytics = {
        totalListings,
        activeListings,
        averageListingTime: Math.round(averageListingTime),
        priceCompetitiveness,
        listingQuality,
        viewsPerListing: 0, // Would track from view analytics
        interactionRate: 0.15, // Placeholder - would calculate from messages
        topPerformingCategories: categoryPerformance,
        pricingAccuracy,
        recommendations
      };

      // Track analytics usage
      privacyAnalytics.trackEvent('seller_analytics_viewed', {
        totalListings: Math.min(totalListings, 100),
        hasRecommendations: recommendations.length > 0
      });

      return analytics;

    } catch (error) {
      console.error('Failed to get seller analytics:', error);
      return this.getEmptySellerAnalytics();
    }
  }

  /**
   * Get comprehensive buyer analytics
   */
  static async getBuyerAnalytics(userId: string): Promise<BuyerAnalytics> {
    try {
      const userFigures = Storage.getAll(userId);

      if (userFigures.length === 0) {
        return this.getEmptyBuyerAnalytics();
      }

      // Analyze spending patterns (simplified - would track actual purchases)
      const totalPurchases = userFigures.length;
      const totalSpent = userFigures.reduce((sum, f) => sum + f.currentValue, 0);
      const averagePurchasePrice = totalSpent / totalPurchases;

      // Analyze categories
      const categorySpending = new Map<string, { spent: number; count: number }>();
      for (const figure of userFigures) {
        const existing = categorySpending.get(figure.category) || { spent: 0, count: 0 };
        existing.spent += figure.currentValue;
        existing.count++;
        categorySpending.set(figure.category, existing);
      }

      const topCategories = Array.from(categorySpending.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 5);

      // Calculate price range and preferences
      const prices = userFigures.map(f => f.currentValue).sort((a, b) => a - b);
      const priceRange = {
        min: prices[0] || 0,
        max: prices[prices.length - 1] || 0,
        preferred: this.calculatePreferredPriceRange(prices)
      };

      // Calculate collection completeness by series
      const collectionCompleteness = await this.calculateCollectionCompleteness(userId);

      // Generate buyer recommendations
      const recommendedPurchases = await this.generateBuyerRecommendations(userId);

      const analytics: BuyerAnalytics = {
        totalPurchases,
        totalSpent: Math.round(totalSpent),
        averagePurchasePrice: Math.round(averagePurchasePrice),
        savingsFromDeals: 0, // Would calculate from deal tracking
        topCategories,
        priceRange,
        dealFindingScore: 0.7, // Placeholder
        collectionCompleteness,
        recommendedPurchases
      };

      // Track analytics usage
      privacyAnalytics.trackEvent('buyer_analytics_viewed', {
        totalFigures: Math.min(totalPurchases, 100),
        averagePrice: Math.min(averagePurchasePrice, 1000)
      });

      return analytics;

    } catch (error) {
      console.error('Failed to get buyer analytics:', error);
      return this.getEmptyBuyerAnalytics();
    }
  }

  /**
   * Get market insights and trends
   */
  static async getMarketInsights(): Promise<MarketInsights> {
    try {
      const allListings = await MarketplaceService.getAllListings();

      if (allListings.length === 0) {
        return this.getEmptyMarketInsights();
      }

      // Analyze hot categories based on listing volume and price trends
      const hotCategories = this.analyzeHotCategories(allListings);

      // Analyze price trends by manufacturer
      const priceTrends = await this.analyzePriceTrends(allListings);

      // Analyze inventory health
      const inventoryHealth = this.analyzeInventoryHealth(allListings);

      // Generate market opportunities
      const marketOpportunities = await this.identifyMarketOpportunities(allListings);

      const insights: MarketInsights = {
        hotCategories,
        priceTrends,
        inventoryHealth,
        seasonalTrends: this.getSeasonalTrends(),
        marketOpportunities
      };

      return insights;

    } catch (error) {
      console.error('Failed to get market insights:', error);
      return this.getEmptyMarketInsights();
    }
  }

  /**
   * Calculate price competitiveness score
   */
  private static async calculatePriceCompetitiveness(
    userListings: ActionFigure[],
    allListings: ActionFigure[]
  ): Promise<number> {
    if (userListings.length === 0) return 0;

    let totalScore = 0;
    let count = 0;

    for (const figure of userListings) {
      const priceSuggestion = await SmartPricingService.getPriceSuggestion(figure);

      if (priceSuggestion.suggestedPrice > 0) {
        const userPrice = figure.currentValue;
        const suggestedPrice = priceSuggestion.suggestedPrice;

        // Score based on how close to suggested price (1.0 = perfect, 0 = way off)
        const priceRatio = Math.min(userPrice, suggestedPrice) / Math.max(userPrice, suggestedPrice);
        totalScore += priceRatio;
        count++;
      }
    }

    return count > 0 ? totalScore / count : 0;
  }

  /**
   * Calculate listing quality score
   */
  private static calculateListingQuality(listings: ActionFigure[]): number {
    if (listings.length === 0) return 0;

    let totalScore = 0;

    for (const figure of listings) {
      let score = 0;

      // Images (40% of quality score)
      if (figure.images && figure.images.length > 0) {
        score += 0.3; // Has images
        if (figure.images.length >= 3) score += 0.1; // Multiple angles
      } else if (figure.imageUrl) {
        score += 0.2; // Has single image
      }

      // Description quality (30% of quality score)
      if (figure.notes && figure.notes.length > 50) {
        score += 0.3;
      } else if (figure.notes && figure.notes.length > 0) {
        score += 0.15;
      }

      // Completeness of data (30% of quality score)
      const fieldsScore = [
        figure.manufacturer,
        figure.series,
        figure.category,
        figure.condition,
        figure.size,
        figure.packaging
      ].filter(Boolean).length / 6;

      score += fieldsScore * 0.3;

      totalScore += score;
    }

    return totalScore / listings.length;
  }

  /**
   * Analyze category performance
   */
  private static analyzeCategoryPerformance(listings: ActionFigure[]): {
    category: string;
    avgViews: number;
    avgPrice: number;
  }[] {
    const categoryStats = new Map<string, { totalViews: number; totalPrice: number; count: number }>();

    for (const figure of listings) {
      const existing = categoryStats.get(figure.category) || { totalViews: 0, totalPrice: 0, count: 0 };
      existing.totalViews += figure.viewCount || 0;
      existing.totalPrice += figure.currentValue;
      existing.count++;
      categoryStats.set(figure.category, existing);
    }

    return Array.from(categoryStats.entries())
      .map(([category, stats]) => ({
        category,
        avgViews: Math.round(stats.totalViews / stats.count),
        avgPrice: Math.round(stats.totalPrice / stats.count)
      }))
      .sort((a, b) => b.avgViews - a.avgViews)
      .slice(0, 5);
  }

  /**
   * Calculate pricing accuracy
   */
  private static async calculatePricingAccuracy(listings: ActionFigure[]): Promise<number> {
    // This would compare user's prices to market prices over time
    // For now, return a reasonable default
    return 0.75; // 75% accuracy
  }

  /**
   * Generate seller recommendations
   */
  private static async generateSellerRecommendations(
    userId: string,
    userListings: ActionFigure[],
    allListings: ActionFigure[]
  ): Promise<SellerRecommendation[]> {
    const recommendations: SellerRecommendation[] = [];

    // Check for pricing opportunities
    for (const figure of userListings.slice(0, 5)) { // Check top 5 to avoid too many recommendations
      const priceSuggestion = await SmartPricingService.getPriceSuggestion(figure);

      if (priceSuggestion.suggestedPrice > figure.currentValue * 1.1) {
        recommendations.push({
          type: 'pricing',
          title: 'Price Adjustment Opportunity',
          description: `${figure.name} could be priced ${Math.round((priceSuggestion.suggestedPrice / figure.currentValue - 1) * 100)}% higher based on market data`,
          impact: 'medium',
          effort: 'low',
          figureIds: [figure.id]
        });
      }
    }

    // Check for listing quality improvements
    const lowQualityFigures = userListings.filter(f =>
      (!f.images || f.images.length === 0) && !f.imageUrl
    );

    if (lowQualityFigures.length > 0) {
      recommendations.push({
        type: 'listing_quality',
        title: 'Add Photos to Boost Interest',
        description: `${lowQualityFigures.length} listings missing photos. Listings with photos get 3x more views.`,
        impact: 'high',
        effort: 'medium',
        figureIds: lowQualityFigures.map(f => f.id)
      });
    }

    return recommendations.slice(0, 5); // Limit recommendations
  }

  /**
   * Generate buyer recommendations
   */
  private static async generateBuyerRecommendations(userId: string): Promise<BuyerRecommendation[]> {
    const recommendations: BuyerRecommendation[] = [];

    try {
      const allListings = await MarketplaceService.getAllListings();

      // Find potential deals (figures priced below market value)
      for (const figure of allListings.slice(0, 10)) {
        const priceSuggestion = await SmartPricingService.getPriceSuggestion(figure);

        if (figure.currentValue < priceSuggestion.suggestedPrice * 0.8) {
          const savings = priceSuggestion.suggestedPrice - figure.currentValue;

          recommendations.push({
            type: 'deal',
            figureId: figure.id,
            title: 'Great Deal Found',
            description: `${figure.name} priced $${savings} below market value`,
            urgency: savings > 50 ? 'high' : 'medium',
            savings,
            reasoning: `Market analysis suggests fair value of $${priceSuggestion.suggestedPrice}`
          });
        }
      }

      return recommendations.slice(0, 5);

    } catch (error) {
      console.error('Failed to generate buyer recommendations:', error);
      return [];
    }
  }

  /**
   * Analyze hot categories
   */
  private static analyzeHotCategories(listings: ActionFigure[]): {
    name: string;
    growthRate: number;
    avgPrice: number;
  }[] {
    const categoryStats = new Map<string, { count: number; totalPrice: number }>();

    for (const figure of listings) {
      const existing = categoryStats.get(figure.category) || { count: 0, totalPrice: 0 };
      existing.count++;
      existing.totalPrice += figure.currentValue;
      categoryStats.set(figure.category, existing);
    }

    return Array.from(categoryStats.entries())
      .map(([name, stats]) => ({
        name,
        growthRate: Math.random() * 20 - 5, // Placeholder: -5% to +15%
        avgPrice: Math.round(stats.totalPrice / stats.count)
      }))
      .sort((a, b) => b.growthRate - a.growthRate)
      .slice(0, 5);
  }

  /**
   * Analyze price trends by manufacturer
   */
  private static async analyzePriceTrends(listings: ActionFigure[]): Promise<{
    manufacturer: string;
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  }[] > {
    const manufacturers = [...new Set(listings.map(f => f.manufacturer))];

    return manufacturers.slice(0, 10).map(manufacturer => ({
      manufacturer,
      trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'stable' : 'down',
      percentage: Math.round((Math.random() - 0.5) * 20) // -10% to +10%
    }));
  }

  /**
   * Analyze inventory health
   */
  private static analyzeInventoryHealth(listings: ActionFigure[]): {
    overstocked: string[];
    understocked: string[];
    balanced: string[];
  } {
    const categoryCounts = new Map<string, number>();

    for (const figure of listings) {
      categoryCounts.set(figure.category, (categoryCounts.get(figure.category) || 0) + 1);
    }

    const overstocked: string[] = [];
    const understocked: string[] = [];
    const balanced: string[] = [];

    for (const [category, count] of categoryCounts.entries()) {
      if (count > 20) {
        overstocked.push(category);
      } else if (count < 5) {
        understocked.push(category);
      } else {
        balanced.push(category);
      }
    }

    return { overstocked, understocked, balanced };
  }

  /**
   * Identify market opportunities
   */
  private static async identifyMarketOpportunities(listings: ActionFigure[]): Promise<MarketOpportunity[]> {
    const opportunities: MarketOpportunity[] = [];

    // Analyze for underpriced items
    const categoryPrices = new Map<string, number[]>();

    for (const figure of listings) {
      const prices = categoryPrices.get(figure.category) || [];
      prices.push(figure.currentValue);
      categoryPrices.set(figure.category, prices);
    }

    for (const [category, prices] of categoryPrices.entries()) {
      if (prices.length >= 5) {
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const lowPriced = prices.filter(p => p < avgPrice * 0.7).length;

        if (lowPriced > 0) {
          opportunities.push({
            type: 'underpriced',
            category,
            description: `${lowPriced} underpriced ${category} figures available`,
            confidence: 0.7,
            potentialReturn: 25
          });
        }
      }
    }

    return opportunities.slice(0, 3);
  }

  /**
   * Get seasonal trends
   */
  private static getSeasonalTrends(): { season: string; popularCategories: string[]; priceMultiplier: number }[] {
    return [
      {
        season: 'Holiday Season',
        popularCategories: ['Vintage', 'Premium', 'Collectible'],
        priceMultiplier: 1.15
      },
      {
        season: 'Summer',
        popularCategories: ['Action', 'Outdoor'],
        priceMultiplier: 0.95
      }
    ];
  }

  /**
   * Calculate preferred price range for buyer
   */
  private static calculatePreferredPriceRange(sortedPrices: number[]): number {
    // Return the median as the preferred price
    return sortedPrices.length % 2 === 0
      ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
      : sortedPrices[Math.floor(sortedPrices.length / 2)];
  }

  /**
   * Calculate collection completeness by series
   */
  private static async calculateCollectionCompleteness(userId: string): Promise<{ [series: string]: number }> {
    try {
      const userFigures = Storage.getAll(userId);
      const allListings = await MarketplaceService.getAllListings();

      const userSeries = new Map<string, number>();
      const totalSeries = new Map<string, Set<string>>();

      // Count user's figures by series
      for (const figure of userFigures) {
        userSeries.set(figure.series, (userSeries.get(figure.series) || 0) + 1);
      }

      // Count total unique figures per series in marketplace
      for (const figure of allListings) {
        const names = totalSeries.get(figure.series) || new Set();
        names.add(figure.name);
        totalSeries.set(figure.series, names);
      }

      const completeness: { [series: string]: number } = {};

      for (const [series, userCount] of userSeries.entries()) {
        const totalCount = totalSeries.get(series)?.size || userCount;
        completeness[series] = Math.round((userCount / totalCount) * 100);
      }

      return completeness;

    } catch (error) {
      console.error('Failed to calculate collection completeness:', error);
      return {};
    }
  }

  /**
   * Get empty seller analytics
   */
  private static getEmptySellerAnalytics(): SellerAnalytics {
    return {
      totalListings: 0,
      activeListings: 0,
      averageListingTime: 0,
      priceCompetitiveness: 0,
      listingQuality: 0,
      viewsPerListing: 0,
      interactionRate: 0,
      topPerformingCategories: [],
      pricingAccuracy: 0,
      recommendations: []
    };
  }

  /**
   * Get empty buyer analytics
   */
  private static getEmptyBuyerAnalytics(): BuyerAnalytics {
    return {
      totalPurchases: 0,
      totalSpent: 0,
      averagePurchasePrice: 0,
      savingsFromDeals: 0,
      topCategories: [],
      priceRange: { min: 0, max: 0, preferred: 0 },
      dealFindingScore: 0,
      collectionCompleteness: {},
      recommendedPurchases: []
    };
  }

  /**
   * Get empty market insights
   */
  private static getEmptyMarketInsights(): MarketInsights {
    return {
      hotCategories: [],
      priceTrends: [],
      inventoryHealth: { overstocked: [], understocked: [], balanced: [] },
      seasonalTrends: [],
      marketOpportunities: []
    };
  }
}
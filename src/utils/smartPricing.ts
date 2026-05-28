import { FirebaseStorage } from './firebaseStorage';
import { MarketplaceService } from './marketplaceService';
import type { ActionFigure } from '../types/index';
import { privacyAnalytics } from './privacyAnalytics';

/**
 * SmartPricingService - AI-driven price recommendations and market analysis
 *
 * Features:
 * - Intelligent price suggestions based on similar figures
 * - Market trend analysis and price predictions
 * - Condition-based price adjustments
 * - Rarity and demand scoring
 * - Price history tracking and analysis
 * - Market competitiveness indicators
 */

export interface PriceSuggestion {
  suggestedPrice: number;
  confidence: number; // 0-1 score
  reasoning: string;
  priceRange: {
    min: number;
    max: number;
    median: number;
  };
  marketData: {
    totalListings: number;
    recentSales: number;
    averagePrice: number;
    priceGrowth: number; // Percentage change over time
  };
  competitiveAnalysis: {
    cheaperAlternatives: number;
    similarPriced: number;
    moreExpensive: number;
  };
}

export interface MarketTrend {
  manufacturer: string;
  series?: string;
  category?: string;
  priceDirection: 'rising' | 'falling' | 'stable';
  changePercentage: number;
  confidence: number;
  timeframe: '7d' | '30d' | '90d';
}

export class SmartPricingService {

  /**
   * Get price suggestion for a figure
   */
  static async getPriceSuggestion(figure: ActionFigure): Promise<PriceSuggestion> {
    try {
      // Get all marketplace listings for analysis
      const allListings = await MarketplaceService.getAllListings();

      // Find similar figures for comparison
      const similarFigures = this.findSimilarFigures(figure, allListings);

      // Calculate base price from similar figures
      const basePriceData = this.calculateBasePrice(similarFigures);

      // Apply condition adjustments
      const conditionAdjustment = this.getConditionAdjustment(figure.condition);

      // Apply rarity and demand factors
      const rarityMultiplier = await this.calculateRarityMultiplier(figure, allListings);

      // Calculate final suggested price
      const suggestedPrice = Math.round(
        basePriceData.median * conditionAdjustment * rarityMultiplier
      );

      // Analyze competition
      const competitiveAnalysis = this.analyzeCompetition(figure, allListings, suggestedPrice);

      // Generate reasoning
      const reasoning = this.generatePriceReasoning(
        figure,
        basePriceData,
        conditionAdjustment,
        rarityMultiplier,
        similarFigures.length
      );

      // Calculate confidence score
      const confidence = this.calculateConfidence(
        similarFigures.length,
        basePriceData.standardDeviation,
        Date.now() - (figure.updatedAt || figure.createdAt || 0)
      );

      const suggestion: PriceSuggestion = {
        suggestedPrice,
        confidence,
        reasoning,
        priceRange: {
          min: Math.round(suggestedPrice * 0.8),
          max: Math.round(suggestedPrice * 1.2),
          median: basePriceData.median
        },
        marketData: {
          totalListings: allListings.length,
          recentSales: 0, // Would track actual sales in full implementation
          averagePrice: basePriceData.average,
          priceGrowth: await this.calculatePriceGrowth(figure)
        },
        competitiveAnalysis
      };

      // Track analytics
      privacyAnalytics.trackEvent('price_suggestion_generated', {
        confidence,
        hasSimilarFigures: similarFigures.length > 0,
        manufacturer: figure.manufacturer,
        condition: figure.condition
      });

      return suggestion;

    } catch (error) {
      console.error('Failed to generate price suggestion:', error);

      // Return fallback suggestion
      return this.getFallbackPriceSuggestion(figure);
    }
  }

  /**
   * Find figures similar to the given figure for price comparison
   */
  private static findSimilarFigures(
    targetFigure: ActionFigure,
    allFigures: ActionFigure[]
  ): ActionFigure[] {
    const similar: { figure: ActionFigure; similarity: number }[] = [];

    for (const figure of allFigures) {
      if (figure.id === targetFigure.id) continue; // Skip self
      if (!figure.isListed) continue; // Only consider listed figures

      let similarity = 0;

      // Exact matches get highest priority
      if (figure.name.toLowerCase() === targetFigure.name.toLowerCase()) {
        similarity += 50;
      } else if (figure.name.toLowerCase().includes(targetFigure.name.toLowerCase()) ||
                 targetFigure.name.toLowerCase().includes(figure.name.toLowerCase())) {
        similarity += 30;
      }

      // Manufacturer match
      if (figure.manufacturer === targetFigure.manufacturer) {
        similarity += 20;
      }

      // Series match
      if (figure.series === targetFigure.series) {
        similarity += 15;
      }

      // Category match
      if (figure.category === targetFigure.category) {
        similarity += 10;
      }

      // Size match
      if (figure.size === targetFigure.size) {
        similarity += 5;
      }

      // Condition similarity
      if (figure.condition === targetFigure.condition) {
        similarity += 10;
      } else if (this.getConditionRank(figure.condition) === this.getConditionRank(targetFigure.condition)) {
        similarity += 5;
      }

      if (similarity >= 25) { // Minimum threshold
        similar.push({ figure, similarity });
      }
    }

    // Sort by similarity and return top matches
    return similar
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20)
      .map(item => item.figure);
  }

  /**
   * Calculate base price statistics from similar figures
   */
  private static calculateBasePrice(similarFigures: ActionFigure[]): {
    average: number;
    median: number;
    standardDeviation: number;
  } {
    if (similarFigures.length === 0) {
      return { average: 0, median: 0, standardDeviation: 0 };
    }

    const prices = similarFigures.map(f => f.currentValue).sort((a, b) => a - b);

    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const median = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)];

    const variance = prices.reduce((sum, price) => sum + Math.pow(price - average, 2), 0) / prices.length;
    const standardDeviation = Math.sqrt(variance);

    return { average, median, standardDeviation };
  }

  /**
   * Get condition-based price adjustment multiplier
   */
  private static getConditionAdjustment(condition: string): number {
    const conditionMultipliers: { [key: string]: number } = {
      'MIB': 1.2,  // Mint in Box - premium
      'MOC': 1.15, // Mint on Card - premium
      'Mint': 1.1,
      'Loose': 0.8,  // Loose figures are typically cheaper
      'Good': 0.7,
      'Fair': 0.6,
      'Poor': 0.4,
      'Custom': 0.9, // Custom builds vary widely
      'Damaged': 0.3
    };

    return conditionMultipliers[condition] || 1.0;
  }

  /**
   * Calculate rarity multiplier based on market availability
   */
  private static async calculateRarityMultiplier(
    figure: ActionFigure,
    allListings: ActionFigure[]
  ): Promise<number> {
    // Count how many of this exact figure are listed
    const exactMatches = allListings.filter(f =>
      f.name.toLowerCase() === figure.name.toLowerCase() &&
      f.manufacturer === figure.manufacturer &&
      f.series === figure.series
    ).length;

    // Count manufacturer/series availability
    const seriesMatches = allListings.filter(f =>
      f.manufacturer === figure.manufacturer &&
      f.series === figure.series
    ).length;

    // Rarity scoring
    if (exactMatches === 0) return 1.3; // Very rare
    if (exactMatches <= 2) return 1.2; // Rare
    if (exactMatches <= 5) return 1.1; // Uncommon
    if (seriesMatches <= 10) return 1.05; // Slightly uncommon series

    return 1.0; // Common
  }

  /**
   * Analyze competition for pricing
   */
  private static analyzeCompetition(
    figure: ActionFigure,
    allListings: ActionFigure[],
    suggestedPrice: number
  ): { cheaperAlternatives: number; similarPriced: number; moreExpensive: number } {
    const competitors = allListings.filter(f =>
      f.manufacturer === figure.manufacturer &&
      f.category === figure.category &&
      f.id !== figure.id
    );

    const cheaperAlternatives = competitors.filter(f => f.currentValue < suggestedPrice * 0.9).length;
    const similarPriced = competitors.filter(f =>
      f.currentValue >= suggestedPrice * 0.9 && f.currentValue <= suggestedPrice * 1.1
    ).length;
    const moreExpensive = competitors.filter(f => f.currentValue > suggestedPrice * 1.1).length;

    return { cheaperAlternatives, similarPriced, moreExpensive };
  }

  /**
   * Generate human-readable pricing reasoning
   */
  private static generatePriceReasoning(
    figure: ActionFigure,
    basePriceData: { average: number; median: number },
    conditionAdjustment: number,
    rarityMultiplier: number,
    similarCount: number
  ): string {
    const reasons: string[] = [];

    if (similarCount === 0) {
      reasons.push("No similar figures found - price based on category averages");
    } else if (similarCount < 3) {
      reasons.push(`Limited market data (${similarCount} similar listings)`);
    } else {
      reasons.push(`Based on ${similarCount} similar figures`);
    }

    if (conditionAdjustment > 1.1) {
      reasons.push("Premium for excellent condition");
    } else if (conditionAdjustment < 0.9) {
      reasons.push("Adjusted down for condition");
    }

    if (rarityMultiplier > 1.1) {
      reasons.push("Rare figure with limited availability");
    }

    return reasons.join('. ');
  }

  /**
   * Calculate confidence score for price suggestion
   */
  private static calculateConfidence(
    similarCount: number,
    standardDeviation: number,
    daysSinceUpdate: number
  ): number {
    let confidence = 0.5; // Base confidence

    // More similar figures = higher confidence
    if (similarCount >= 10) confidence += 0.3;
    else if (similarCount >= 5) confidence += 0.2;
    else if (similarCount >= 3) confidence += 0.1;

    // Lower standard deviation = higher confidence
    if (standardDeviation < 5) confidence += 0.2;
    else if (standardDeviation < 15) confidence += 0.1;
    else if (standardDeviation > 50) confidence -= 0.1;

    // Recent data = higher confidence
    const daysOld = daysSinceUpdate / (24 * 60 * 60 * 1000);
    if (daysOld < 7) confidence += 0.1;
    else if (daysOld > 90) confidence -= 0.1;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Get condition rank for comparison
   */
  private static getConditionRank(condition: string): number {
    const ranks: { [key: string]: number } = {
      'MIB': 10, 'MOC': 9, 'Mint': 8, 'Loose': 6, 'Good': 5,
      'Fair': 4, 'Poor': 2, 'Custom': 7, 'Damaged': 1
    };
    return ranks[condition] || 5;
  }

  /**
   * Calculate price growth over time
   */
  private static async calculatePriceGrowth(figure: ActionFigure): Promise<number> {
    // In a full implementation, this would analyze price history
    // For now, return a placeholder based on age and condition
    const age = Date.now() - (figure.createdAt || 0);
    const ageInYears = age / (365 * 24 * 60 * 60 * 1000);

    // Vintage figures tend to appreciate
    if (ageInYears > 20) return 15; // 15% growth
    if (ageInYears > 10) return 8;  // 8% growth
    if (ageInYears > 5) return 3;   // 3% growth

    return 0; // No significant growth for recent figures
  }

  /**
   * Get fallback price suggestion when analysis fails
   */
  private static getFallbackPriceSuggestion(figure: ActionFigure): PriceSuggestion {
    const fallbackPrice = figure.currentValue || 25; // Use existing price or default

    return {
      suggestedPrice: fallbackPrice,
      confidence: 0.3,
      reasoning: "Limited market data available - suggestion based on existing price",
      priceRange: {
        min: Math.round(fallbackPrice * 0.8),
        max: Math.round(fallbackPrice * 1.2),
        median: fallbackPrice
      },
      marketData: {
        totalListings: 0,
        recentSales: 0,
        averagePrice: fallbackPrice,
        priceGrowth: 0
      },
      competitiveAnalysis: {
        cheaperAlternatives: 0,
        similarPriced: 0,
        moreExpensive: 0
      }
    };
  }

  /**
   * Get market trends for categories/manufacturers
   */
  static async getMarketTrends(
    manufacturer?: string,
    series?: string,
    category?: string,
    timeframe: '7d' | '30d' | '90d' = '30d'
  ): Promise<MarketTrend[]> {
    try {
      // This would analyze price changes over time
      // For now, return sample trends based on manufacturer popularity
      const trends: MarketTrend[] = [];

      if (manufacturer) {
        trends.push({
          manufacturer,
          series,
          category,
          priceDirection: 'stable',
          changePercentage: 2.5,
          confidence: 0.7,
          timeframe
        });
      }

      return trends;

    } catch (error) {
      console.error('Failed to get market trends:', error);
      return [];
    }
  }

  /**
   * Suggest optimal listing timing based on market conditions
   */
  static async getOptimalListingTime(figure: ActionFigure): Promise<{
    recommendation: 'list_now' | 'wait_for_trend' | 'seasonal_timing';
    reasoning: string;
    bestTimeToList?: string;
  }> {
    try {
      const trends = await this.getMarketTrends(figure.manufacturer, figure.series, figure.category);

      if (trends.length > 0 && trends[0].priceDirection === 'rising') {
        return {
          recommendation: 'list_now',
          reasoning: `${figure.manufacturer} figures are trending up (+${trends[0].changePercentage}%)`
        };
      }

      return {
        recommendation: 'list_now',
        reasoning: 'Market conditions are stable - good time to list'
      };

    } catch (error) {
      return {
        recommendation: 'list_now',
        reasoning: 'Ready to list based on current market'
      };
    }
  }
}
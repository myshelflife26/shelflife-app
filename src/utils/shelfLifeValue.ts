import { Storage } from './storage';
import { MarketplaceService } from './marketplaceService';
import type { ActionFigure, TradeProposal } from '../types/index';

/**
 * Service for calculating Shelf Life Value - a market-based valuation
 * based on actual transaction prices and current marketplace listings
 */
export class ShelfLifeValueService {
  /**
   * Calculate Shelf Life Value for a specific figure
   * Based on:
   * - Completed trade/sale prices (weighted 2x)
   * - Current marketplace asking prices (weighted 1x)
   * - Average across all matching figures
   */
  static calculateShelfLifeValue(figure: ActionFigure): number | null {
    const matchingFigures = this.findMatchingFigures(figure);

    if (matchingFigures.length === 0) {
      return null;
    }

    const values: { value: number; weight: number }[] = [];

    // Get completed transaction prices (weight: 2)
    const completedPrices = this.getCompletedTransactionPrices(figure);
    completedPrices.forEach(price => {
      values.push({ value: price, weight: 2 });
    });

    // Get current marketplace asking prices (weight: 1)
    matchingFigures.forEach(f => {
      if (f.marketplaceListing?.askingPrice && f.marketplaceListing.askingPrice > 0) {
        values.push({ value: f.marketplaceListing.askingPrice, weight: 1 });
      }
    });

    // If no market data, return null
    if (values.length === 0) {
      return null;
    }

    // Calculate weighted average
    const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);
    const weightedSum = values.reduce((sum, v) => sum + (v.value * v.weight), 0);
    const average = weightedSum / totalWeight;

    return Math.round(average * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Find all figures that match the given figure
   * Matching criteria: name, manufacturer, condition
   */
  private static findMatchingFigures(figure: ActionFigure): ActionFigure[] {
    const allFigures = Storage.getAllPublicFigures();

    return allFigures.filter(f => {
      // Must match name (case insensitive)
      if (f.name.toLowerCase() !== figure.name.toLowerCase()) {
        return false;
      }

      // Must match manufacturer (case insensitive)
      if (f.manufacturer?.toLowerCase() !== figure.manufacturer?.toLowerCase()) {
        return false;
      }

      // For condition, we're more flexible:
      // - MIB matches MIB
      // - Loose matches Loose
      // - Custom is treated separately (always matches only Custom)
      if (figure.condition === 'Custom' || f.condition === 'Custom') {
        return f.condition === figure.condition;
      }

      // For non-custom, just match the condition
      return f.condition === figure.condition;
    });
  }

  /**
   * Get completed transaction prices for matching figures
   * This includes both completed trades and sales
   */
  private static getCompletedTransactionPrices(figure: ActionFigure): number[] {
    const trades = this.getAllCompletedTrades();
    const prices: number[] = [];

    trades.forEach(trade => {
      // Check if any of the traded figures match
      const tradedFigureIds = [...trade.offeredFigureIds, ...trade.requestedFigureIds];

      tradedFigureIds.forEach(figureId => {
        const tradedFigure = this.findFigureById(figureId);
        if (tradedFigure && this.figuresMatch(figure, tradedFigure)) {
          // For trades, we need to calculate the effective price
          // This is the cash involved in the trade divided by number of figures
          const totalCash = trade.offeredCash + trade.requestedCash;
          const totalFigures = tradedFigureIds.length;

          if (totalCash > 0) {
            // If cash was involved, use that as a price indicator
            prices.push(totalCash / totalFigures);
          }

          // Also consider the asking price if it was a sale (no figures exchanged)
          if (trade.offeredFigureIds.length === 0 && trade.offeredCash > 0) {
            // This was a pure sale
            prices.push(trade.offeredCash);
          }
        }
      });
    });

    return prices;
  }

  /**
   * Get all completed trades from localStorage
   */
  private static getAllCompletedTrades(): TradeProposal[] {
    const tradesJson = localStorage.getItem('trades');
    if (!tradesJson) return [];

    try {
      const trades = JSON.parse(tradesJson) as TradeProposal[];
      return trades.filter(t => t.status === 'completed');
    } catch (error) {
      console.error('Failed to parse trades:', error);
      return [];
    }
  }

  /**
   * Find a figure by ID across all collections
   */
  private static findFigureById(figureId: string): ActionFigure | null {
    const allFigures = Storage.getAllFigures();
    return allFigures.find(f => f.id === figureId) || null;
  }

  /**
   * Check if two figures match for pricing purposes
   */
  private static figuresMatch(figure1: ActionFigure, figure2: ActionFigure): boolean {
    // Must match name (case insensitive)
    if (figure1.name.toLowerCase() !== figure2.name.toLowerCase()) {
      return false;
    }

    // Must match manufacturer (case insensitive)
    if (figure1.manufacturer?.toLowerCase() !== figure2.manufacturer?.toLowerCase()) {
      return false;
    }

    // Match condition
    if (figure1.condition === 'Custom' || figure2.condition === 'Custom') {
      return figure1.condition === figure2.condition;
    }

    return figure1.condition === figure2.condition;
  }

  /**
   * Get market statistics for a figure
   */
  static getMarketStats(figure: ActionFigure): {
    shelfLifeValue: number | null;
    sampleSize: number;
    lowestListing: number | null;
    highestListing: number | null;
    completedSales: number;
  } {
    const matchingFigures = this.findMatchingFigures(figure);
    const completedPrices = this.getCompletedTransactionPrices(figure);

    const listingPrices = matchingFigures
      .map(f => f.marketplaceListing?.askingPrice)
      .filter((price): price is number => price !== undefined && price > 0);

    return {
      shelfLifeValue: this.calculateShelfLifeValue(figure),
      sampleSize: matchingFigures.length + completedPrices.length,
      lowestListing: listingPrices.length > 0 ? Math.min(...listingPrices) : null,
      highestListing: listingPrices.length > 0 ? Math.max(...listingPrices) : null,
      completedSales: completedPrices.length,
    };
  }

  /**
   * Get all figures with Shelf Life Values
   * Useful for bulk calculations
   */
  static getAllFiguresWithShelfLifeValue(figures: ActionFigure[]): Map<string, number | null> {
    const valueMap = new Map<string, number | null>();

    figures.forEach(figure => {
      const value = this.calculateShelfLifeValue(figure);
      valueMap.set(figure.id, value);
    });

    return valueMap;
  }
}

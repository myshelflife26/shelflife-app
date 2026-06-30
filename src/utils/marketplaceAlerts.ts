/**
 * Marketplace Alerts Service
 * Checks marketplace listings against user's want list and creates alerts
 */

import type { ActionFigure } from '../types/index';
import { WantListService, type WantListItem } from './wantList';
import { toastManager } from './toastManager';

export interface MarketplaceMatch {
  wantListItem: WantListItem;
  figure: ActionFigure;
  matchScore: number; // 0-100, how well it matches
  priceMatch: boolean;
  conditionMatch: boolean;
}

export class MarketplaceAlertsService {
  /**
   * Check a single marketplace listing against user's want list
   * Returns matches found
   */
  static checkListing(
    userId: string,
    figure: ActionFigure & { ownerName: string; ownerDisplayName: string }
  ): MarketplaceMatch[] {
    const matches = WantListService.checkForMatches(userId, {
      id: figure.id,
      name: figure.name,
      manufacturer: figure.manufacturer,
      series: figure.series,
      category: figure.category,
      version: figure.version,
      condition: figure.condition,
      currentValue: figure.marketplaceListing?.askingPrice || figure.currentValue,
    });

    return matches.map(wantItem => {
      const askingPrice = figure.marketplaceListing?.askingPrice || figure.currentValue;

      // Calculate match score
      let matchScore = 60; // Base score for name match

      // Boost for manufacturer match
      if (wantItem.manufacturer && figure.manufacturer?.toLowerCase().includes(wantItem.manufacturer.toLowerCase())) {
        matchScore += 10;
      }

      // Boost for series match
      if (wantItem.series && figure.series?.toLowerCase().includes(wantItem.series.toLowerCase())) {
        matchScore += 10;
      }

      // Boost for version match
      if (wantItem.version && figure.version?.toLowerCase().includes(wantItem.version.toLowerCase())) {
        matchScore += 10;
      }

      // Boost for condition match
      const conditionMatch = !wantItem.condition || wantItem.condition === figure.condition;
      if (conditionMatch) {
        matchScore += 5;
      }

      // Boost for price match
      const priceMatch = !wantItem.maxPrice || askingPrice <= wantItem.maxPrice;
      if (priceMatch) {
        matchScore += 5;
      }

      return {
        wantListItem: wantItem,
        figure,
        matchScore,
        priceMatch,
        conditionMatch,
      };
    });
  }

  /**
   * Check multiple listings and create alerts for matches
   * Returns number of alerts created
   */
  static async checkMarketplaceListings(
    userId: string,
    listings: Array<ActionFigure & { ownerName: string; ownerDisplayName: string }>
  ): Promise<number> {
    let alertsCreated = 0;

    for (const listing of listings) {
      // Skip user's own listings
      if (listing.userId === userId) continue;

      // Skip if not for sale
      if (!(listing.availability || []).includes('for-sale')) continue;

      const matches = this.checkListing(userId, listing);

      for (const match of matches) {
        // Only create alert if notifications are enabled for this want list item
        if (!match.wantListItem.notificationEnabled) continue;

        // Create alert
        try {
          WantListService.createAlert(userId, {
            wantListItemId: match.wantListItem.id,
            figureId: listing.id,
            figureName: listing.name,
            listingPrice: listing.marketplaceListing?.askingPrice || listing.currentValue,
            listedAt: listing.marketplaceListing?.listedAt || listing.createdAt || Date.now(),
            sellerName: listing.ownerDisplayName || listing.ownerName,
            sellerId: listing.userId,
          });

          alertsCreated++;
        } catch (error) {
          console.error('Failed to create alert:', error);
        }
      }
    }

    return alertsCreated;
  }

  /**
   * Scan marketplace and show toast notification for any matches
   * Call this when marketplace page loads or when new listings appear
   */
  static async scanAndNotify(
    userId: string,
    listings: Array<ActionFigure & { ownerName: string; ownerDisplayName: string }>
  ): Promise<void> {
    const alertsCreated = await this.checkMarketplaceListings(userId, listings);

    if (alertsCreated > 0) {
      toastManager.success(
        `${alertsCreated} want list match${alertsCreated !== 1 ? 'es' : ''} found!`,
        {
          duration: 5000,
        }
      );
    }
  }

  /**
   * Get all unread alerts for user
   */
  static getUnreadAlerts(userId: string) {
    const alerts = WantListService.getAlerts(userId);
    return alerts.filter(a => !a.viewed && !a.dismissed);
  }

  /**
   * Get unread alert count (for badge display)
   */
  static getUnreadCount(userId: string): number {
    return WantListService.getUnreadAlertCount(userId);
  }

  /**
   * Check if a specific figure matches any want list items
   * Useful for showing badges on browse/marketplace cards
   */
  static hasMatch(
    userId: string,
    figureId: string,
    figureName: string,
    manufacturer?: string,
    series?: string
  ): boolean {
    const matches = WantListService.checkForMatches(userId, {
      id: figureId,
      name: figureName,
      manufacturer,
      series,
    });

    return matches.length > 0;
  }

  /**
   * Mark all alerts for a specific listing as viewed
   * Call this when user views the figure detail
   */
  static markListingAlertsViewed(userId: string, figureId: string): void {
    const alerts = WantListService.getAlerts(userId);
    alerts
      .filter(a => a.figureId === figureId)
      .forEach(a => WantListService.markAlertViewed(userId, a.id));
  }
}

/**
 * Want List Service
 * Manages figures that users want to acquire
 * Provides marketplace alerts when wanted figures are listed
 */

export interface WantListItem {
  id: string; // Unique ID for this want list entry
  name: string; // Figure name (required)
  manufacturer?: string;
  series?: string;
  category?: string;
  version?: string;
  notes?: string;
  maxPrice?: number; // Alert only if price is below this
  condition?: string; // Preferred condition (MIB, NRFB, Loose, etc.)
  priority: 'low' | 'medium' | 'high';
  addedAt: number; // Timestamp when added
  source?: 'manual' | 'set-completion' | 'browse'; // How it was added
  notificationEnabled: boolean; // Send alerts for this item
  matchedListingIds: string[]; // Track which listings have been matched (to avoid duplicate alerts)
}

export interface WantListAlert {
  id: string;
  wantListItemId: string;
  figureId: string; // The actual listed figure
  figureName: string;
  listingPrice: number;
  listedAt: number;
  sellerName: string;
  sellerId: string;
  viewed: boolean;
  dismissed: boolean;
}

const WANT_LIST_STORAGE_KEY = 'myshelflife-want-list';
const WANT_ALERTS_STORAGE_KEY = 'myshelflife-want-alerts';

export class WantListService {
  /**
   * Get user's want list (requires userId for multi-user support)
   */
  static getWantList(userId: string): WantListItem[] {
    try {
      const key = `${WANT_LIST_STORAGE_KEY}-${userId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load want list:', error);
      return [];
    }
  }

  /**
   * Add item to want list
   */
  static addWantListItem(userId: string, item: Omit<WantListItem, 'id' | 'addedAt' | 'matchedListingIds'>): WantListItem {
    const wantList = this.getWantList(userId);

    // Check for duplicates (same name + manufacturer + version)
    const duplicate = wantList.find(w =>
      w.name.toLowerCase() === item.name.toLowerCase() &&
      (w.manufacturer || '').toLowerCase() === (item.manufacturer || '').toLowerCase() &&
      (w.version || '').toLowerCase() === (item.version || '').toLowerCase()
    );

    if (duplicate) {
      throw new Error('This figure is already on your want list');
    }

    const newItem: WantListItem = {
      ...item,
      id: `want-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      addedAt: Date.now(),
      matchedListingIds: [],
    };

    wantList.push(newItem);
    this.saveWantList(userId, wantList);

    return newItem;
  }

  /**
   * Update want list item
   */
  static updateWantListItem(userId: string, itemId: string, updates: Partial<WantListItem>): void {
    const wantList = this.getWantList(userId);
    const index = wantList.findIndex(w => w.id === itemId);

    if (index === -1) {
      throw new Error('Want list item not found');
    }

    wantList[index] = { ...wantList[index], ...updates };
    this.saveWantList(userId, wantList);
  }

  /**
   * Remove item from want list
   */
  static removeWantListItem(userId: string, itemId: string): void {
    const wantList = this.getWantList(userId);
    const filtered = wantList.filter(w => w.id !== itemId);
    this.saveWantList(userId, filtered);
  }

  /**
   * Clear entire want list
   */
  static clearWantList(userId: string): void {
    const key = `${WANT_LIST_STORAGE_KEY}-${userId}`;
    localStorage.removeItem(key);
  }

  /**
   * Save want list to storage
   */
  private static saveWantList(userId: string, wantList: WantListItem[]): void {
    const key = `${WANT_LIST_STORAGE_KEY}-${userId}`;
    localStorage.setItem(key, JSON.stringify(wantList));
  }

  /**
   * Get want list count
   */
  static getWantListCount(userId: string): number {
    return this.getWantList(userId).length;
  }

  /**
   * Check if a figure matches any want list items
   * Returns matched want list items
   */
  static checkForMatches(userId: string, figure: {
    id: string;
    name: string;
    manufacturer?: string;
    series?: string;
    category?: string;
    version?: string;
    condition?: string;
    currentValue?: number;
  }): WantListItem[] {
    const wantList = this.getWantList(userId);

    return wantList.filter(want => {
      // Skip if already matched this listing
      if (want.matchedListingIds.includes(figure.id)) {
        return false;
      }

      // Name match (fuzzy)
      const nameLower = figure.name.toLowerCase();
      const wantNameLower = want.name.toLowerCase();

      // Check if names contain each other or are very similar
      const nameMatch = nameLower.includes(wantNameLower) ||
                       wantNameLower.includes(nameLower) ||
                       this.calculateSimilarity(nameLower, wantNameLower) > 0.7;

      if (!nameMatch) return false;

      // Manufacturer match (if specified)
      if (want.manufacturer) {
        const mfgMatch = (figure.manufacturer || '').toLowerCase().includes(want.manufacturer.toLowerCase());
        if (!mfgMatch) return false;
      }

      // Series match (if specified)
      if (want.series) {
        const seriesMatch = (figure.series || '').toLowerCase().includes(want.series.toLowerCase());
        if (!seriesMatch) return false;
      }

      // Version match (if specified)
      if (want.version) {
        const versionMatch = (figure.version || '').toLowerCase().includes(want.version.toLowerCase());
        if (!versionMatch) return false;
      }

      // Price check (if max price specified)
      if (want.maxPrice && figure.currentValue) {
        if (figure.currentValue > want.maxPrice) {
          return false;
        }
      }

      // Condition check (if specified)
      if (want.condition) {
        if (figure.condition !== want.condition) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate similarity between two strings (0-1)
   * Simple Levenshtein distance based similarity
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

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
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Mark a listing as matched for a want list item
   */
  static markAsMatched(userId: string, wantListItemId: string, figureId: string): void {
    const wantList = this.getWantList(userId);
    const item = wantList.find(w => w.id === wantListItemId);

    if (item) {
      if (!item.matchedListingIds.includes(figureId)) {
        item.matchedListingIds.push(figureId);
        this.saveWantList(userId, wantList);
      }
    }
  }

  /**
   * Get all alerts for user
   */
  static getAlerts(userId: string): WantListAlert[] {
    try {
      const key = `${WANT_ALERTS_STORAGE_KEY}-${userId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      return [];
    }
  }

  /**
   * Create a new alert
   */
  static createAlert(userId: string, alert: Omit<WantListAlert, 'id' | 'viewed' | 'dismissed'>): WantListAlert {
    const alerts = this.getAlerts(userId);

    const newAlert: WantListAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      viewed: false,
      dismissed: false,
    };

    alerts.unshift(newAlert); // Add to beginning
    this.saveAlerts(userId, alerts);

    // Mark the want list item as matched
    this.markAsMatched(userId, alert.wantListItemId, alert.figureId);

    return newAlert;
  }

  /**
   * Mark alert as viewed
   */
  static markAlertViewed(userId: string, alertId: string): void {
    const alerts = this.getAlerts(userId);
    const alert = alerts.find(a => a.id === alertId);

    if (alert) {
      alert.viewed = true;
      this.saveAlerts(userId, alerts);
    }
  }

  /**
   * Dismiss alert
   */
  static dismissAlert(userId: string, alertId: string): void {
    const alerts = this.getAlerts(userId);
    const alert = alerts.find(a => a.id === alertId);

    if (alert) {
      alert.dismissed = true;
      this.saveAlerts(userId, alerts);
    }
  }

  /**
   * Clear all alerts
   */
  static clearAlerts(userId: string): void {
    const key = `${WANT_ALERTS_STORAGE_KEY}-${userId}`;
    localStorage.removeItem(key);
  }

  /**
   * Get unread alert count
   */
  static getUnreadAlertCount(userId: string): number {
    const alerts = this.getAlerts(userId);
    return alerts.filter(a => !a.viewed && !a.dismissed).length;
  }

  /**
   * Save alerts to storage
   */
  private static saveAlerts(userId: string, alerts: WantListAlert[]): void {
    const key = `${WANT_ALERTS_STORAGE_KEY}-${userId}`;

    // Keep only last 100 alerts to prevent storage bloat
    const trimmedAlerts = alerts.slice(0, 100);

    localStorage.setItem(key, JSON.stringify(trimmedAlerts));
  }

  /**
   * Auto-populate want list from incomplete sets
   */
  static autoPopulateFromSets(
    userId: string,
    missingFigures: string[],
    setInfo: { name: string; series: string; manufacturer?: string }
  ): number {
    let addedCount = 0;

    for (const figureName of missingFigures) {
      try {
        this.addWantListItem(userId, {
          name: figureName,
          series: setInfo.series,
          manufacturer: setInfo.manufacturer,
          priority: 'medium',
          notificationEnabled: true,
          source: 'set-completion',
          notes: `Needed for ${setInfo.name} set`,
        });
        addedCount++;
      } catch (error) {
        // Skip duplicates
        console.debug(`Skipped duplicate: ${figureName}`);
      }
    }

    return addedCount;
  }

  /**
   * Get want list statistics
   */
  static getStats(userId: string): {
    total: number;
    byPriority: { high: number; medium: number; low: number };
    bySource: { manual: number; setCompletion: number; browse: number };
    withAlerts: number;
    avgItemAge: number; // Days
  } {
    const wantList = this.getWantList(userId);
    const now = Date.now();

    const byPriority = {
      high: wantList.filter(w => w.priority === 'high').length,
      medium: wantList.filter(w => w.priority === 'medium').length,
      low: wantList.filter(w => w.priority === 'low').length,
    };

    const bySource = {
      manual: wantList.filter(w => w.source === 'manual' || !w.source).length,
      setCompletion: wantList.filter(w => w.source === 'set-completion').length,
      browse: wantList.filter(w => w.source === 'browse').length,
    };

    const withAlerts = wantList.filter(w => w.notificationEnabled).length;

    const totalAge = wantList.reduce((sum, w) => sum + (now - w.addedAt), 0);
    const avgItemAge = wantList.length > 0 ? totalAge / wantList.length / (1000 * 60 * 60 * 24) : 0;

    return {
      total: wantList.length,
      byPriority,
      bySource,
      withAlerts,
      avgItemAge,
    };
  }
}

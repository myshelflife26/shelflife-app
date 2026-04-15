import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { WishlistItem, WishlistStats, WishlistPriority, WishlistStatus } from '../types/wishlist';

const WISHLIST_COLLECTION = 'wishlist';

/**
 * Recursively remove undefined values from an object
 * Firebase doesn't accept undefined values in documents
 */
function cleanUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedValues(item)).filter(item => item !== undefined);
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value);
      }
    }
    return cleaned;
  }

  return obj;
}

export class FirebaseWishlistService {
  /**
   * Add item to wishlist
   */
  static async addItem(
    userId: string,
    item: Omit<WishlistItem, 'id' | 'userId' | 'dateAdded' | 'lastUpdated'>
  ): Promise<string> {
    try {
      const wishlistItem: Omit<WishlistItem, 'id'> = {
        ...item,
        userId,
        dateAdded: Date.now(),
        lastUpdated: Date.now()
      };

      // Clean undefined values before saving
      const cleanedItem = cleanUndefinedValues(wishlistItem);

      const docRef = await addDoc(collection(db, WISHLIST_COLLECTION), cleanedItem);
      return docRef.id;
    } catch (error) {
      console.error('Failed to add wishlist item:', error);
      throw error;
    }
  }

  /**
   * Get all wishlist items for a user
   */
  static async getItems(userId: string): Promise<WishlistItem[]> {
    try {
      const q = query(
        collection(db, WISHLIST_COLLECTION),
        where('userId', '==', userId),
        orderBy('dateAdded', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as WishlistItem[];
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      return [];
    }
  }

  /**
   * Update wishlist item
   */
  static async updateItem(itemId: string, updates: Partial<WishlistItem>): Promise<void> {
    try {
      const itemRef = doc(db, WISHLIST_COLLECTION, itemId);
      const updateData = {
        ...updates,
        lastUpdated: Date.now()
      };

      // Clean undefined values before saving
      const cleanedData = cleanUndefinedValues(updateData);

      await updateDoc(itemRef, cleanedData);
    } catch (error) {
      console.error('Failed to update wishlist item:', error);
      throw error;
    }
  }

  /**
   * Delete wishlist item
   */
  static async deleteItem(itemId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, WISHLIST_COLLECTION, itemId));
    } catch (error) {
      console.error('Failed to delete wishlist item:', error);
      throw error;
    }
  }

  /**
   * Calculate wishlist statistics
   */
  static calculateStats(items: WishlistItem[]): WishlistStats {
    const stats: WishlistStats = {
      totalItems: items.length,
      highPriority: items.filter(i => i.priority === 'high').length,
      mediumPriority: items.filter(i => i.priority === 'medium').length,
      lowPriority: items.filter(i => i.priority === 'low').length,
      estimatedTotalCost: items.reduce((sum, item) => sum + (item.targetPrice || 0), 0)
    };

    return stats;
  }

  /**
   * Mark item as acquired (removes from wishlist, optionally adds to collection)
   */
  static async markAsAcquired(itemId: string): Promise<void> {
    try {
      await this.deleteItem(itemId);
    } catch (error) {
      console.error('Failed to mark item as acquired:', error);
      throw error;
    }
  }

  /**
   * Search wishlist items
   */
  static searchItems(items: WishlistItem[], searchTerm: string): WishlistItem[] {
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.figureName.toLowerCase().includes(term) ||
      item.series?.toLowerCase().includes(term) ||
      item.manufacturer?.toLowerCase().includes(term) ||
      item.notes?.toLowerCase().includes(term)
    );
  }

  /**
   * Filter wishlist by priority
   */
  static filterByPriority(items: WishlistItem[], priority: WishlistPriority): WishlistItem[] {
    return items.filter(item => item.priority === priority);
  }

  /**
   * Filter wishlist by status
   */
  static filterByStatus(items: WishlistItem[], status: WishlistStatus): WishlistItem[] {
    return items.filter(item => item.status === status);
  }

  /**
   * Sort wishlist items
   */
  static sortItems(
    items: WishlistItem[],
    sortBy: 'dateAdded' | 'priority' | 'targetPrice' | 'figureName'
  ): WishlistItem[] {
    const sorted = [...items];

    switch (sortBy) {
      case 'dateAdded':
        return sorted.sort((a, b) => b.dateAdded - a.dateAdded);
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return sorted.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
      case 'targetPrice':
        return sorted.sort((a, b) => (b.targetPrice || 0) - (a.targetPrice || 0));
      case 'figureName':
        return sorted.sort((a, b) => a.figureName.localeCompare(b.figureName));
      default:
        return sorted;
    }
  }
}

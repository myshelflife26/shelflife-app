import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  startAfter,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TradeProposal, TradeStatus, TradeCounter, TradeMessage, UserRating, MarketplaceListing, ActionFigure } from '../types/index';

const TRADES_COLLECTION = 'trades';
const RATINGS_COLLECTION = 'userRatings';

// Cache for marketplace listings (5 minute TTL)
interface ListingsCache {
  data: ActionFigure[];
  timestamp: number;
}

let listingsCache: ListingsCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class MarketplaceService {
  /**
   * Clear the listings cache (call when a figure is listed/unlisted)
   */
  static clearListingsCache(): void {
    listingsCache = null;
  }

  /**
   * Get all marketplace listings (figures marked for sale/trade)
   * Uses caching and optimized Firebase queries
   */
  static async getAllListings(limit?: number, startAfterDoc?: any): Promise<ActionFigure[]> {
    try {
      // Check cache first (only if not paginating)
      if (!startAfterDoc && !limit && listingsCache && Date.now() - listingsCache.timestamp < CACHE_TTL) {
        return listingsCache.data;
      }

      const figuresRef = collection(db, 'figures');

      // Build optimized query using isListed field
      let q = query(
        figuresRef,
        where('isPublic', '==', true),
        where('isListed', '==', true)
      );

      // Add pagination if requested
      if (limit) {
        q = query(q, orderBy('marketplaceListing.listedAt', 'desc'));
        if (startAfterDoc) {
          q = query(q, startAfter(startAfterDoc));
        }
        q = query(q, fbLimit(limit));
      }

      const snapshot = await getDocs(q);
      const figures = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));

      // Cache the results (only for non-paginated queries)
      if (!startAfterDoc && !limit) {
        listingsCache = {
          data: figures,
          timestamp: Date.now()
        };
      }

      return figures;
    } catch (error) {
      console.error('Failed to get marketplace listings:', error);
      return [];
    }
  }

  /**
   * Get user's active listings
   */
  static async getUserListings(userId: string): Promise<ActionFigure[]> {
    try {
      const figuresRef = collection(db, 'figures');
      const q = query(figuresRef, where('userId', '==', userId));

      const snapshot = await getDocs(q);
      const figures = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionFigure));

      // Filter to figures with marketplace listing OR availability set
      return figures.filter(f => {
        // New way: check marketplaceListing
        if (f.marketplaceListing?.forSale || f.marketplaceListing?.forTrade) {
          return true;
        }
        // Legacy way: check availability array
        if (f.availability && f.availability.length > 0) {
          return true;
        }
        return false;
      });
    } catch (error) {
      console.error('Failed to get user listings:', error);
      return [];
    }
  }

  /**
   * Create a trade proposal
   */
  static async createTradeProposal(
    fromUserId: string,
    fromUserName: string,
    toUserId: string,
    toUserName: string,
    offeredFigureIds: string[],
    requestedFigureIds: string[],
    offeredCash: number,
    requestedCash: number,
    message?: string
  ): Promise<string | null> {
    try {
      const proposal: Omit<TradeProposal, 'id'> = {
        status: 'pending',
        fromUserId,
        fromUserName,
        toUserId,
        toUserName,
        offeredFigureIds,
        requestedFigureIds,
        offeredCash,
        requestedCash,
        messages: message ? [{
          userId: fromUserId,
          userName: fromUserName,
          message,
          timestamp: Date.now()
        }] : [],
        counterHistory: [],
        fromUserShippingStatus: 'not-shipped',
        toUserShippingStatus: 'not-shipped',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const docRef = await addDoc(collection(db, TRADES_COLLECTION), proposal);
      return docRef.id;
    } catch (error) {
      console.error('Failed to create trade proposal:', error);
      return null;
    }
  }

  /**
   * Get trade proposal by ID
   */
  static async getTradeProposal(tradeId: string): Promise<TradeProposal | null> {
    try {
      const tradeDoc = await getDoc(doc(db, TRADES_COLLECTION, tradeId));
      if (!tradeDoc.exists()) {
        return null;
      }

      return {
        id: tradeDoc.id,
        ...tradeDoc.data()
      } as TradeProposal;
    } catch (error) {
      console.error('Failed to get trade proposal:', error);
      return null;
    }
  }

  /**
   * Get all trade proposals for a user
   */
  static async getUserTrades(userId: string): Promise<TradeProposal[]> {
    try {
      const tradesRef = collection(db, TRADES_COLLECTION);

      // Get trades where user is either sender or recipient
      const sentQuery = query(tradesRef, where('fromUserId', '==', userId));
      const receivedQuery = query(tradesRef, where('toUserId', '==', userId));

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery)
      ]);

      const sentTrades = sentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TradeProposal));

      const receivedTrades = receivedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TradeProposal));

      // Combine and sort by most recent
      return [...sentTrades, ...receivedTrades]
        .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Failed to get user trades:', error);
      return [];
    }
  }

  /**
   * Counter a trade proposal
   */
  static async counterTradeProposal(
    tradeId: string,
    userId: string,
    userName: string,
    offeredFigureIds: string[],
    requestedFigureIds: string[],
    offeredCash: number,
    requestedCash: number,
    message?: string
  ): Promise<boolean> {
    try {
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      const tradeDoc = await getDoc(tradeRef);

      if (!tradeDoc.exists()) {
        return false;
      }

      const trade = tradeDoc.data() as TradeProposal;

      const counter: TradeCounter = {
        userId,
        userName,
        offeredFigureIds,
        requestedFigureIds,
        offeredCash,
        requestedCash,
        message,
        timestamp: Date.now()
      };

      const updates: Partial<TradeProposal> = {
        status: 'countered',
        counterHistory: [...trade.counterHistory, counter],
        updatedAt: Date.now()
      };

      if (message) {
        updates.messages = [...trade.messages, {
          userId,
          userName,
          message,
          timestamp: Date.now()
        }];
      }

      // Swap the offered/requested based on who is countering
      if (userId === trade.toUserId) {
        // Recipient is countering, so swap perspective
        updates.offeredFigureIds = requestedFigureIds;
        updates.requestedFigureIds = offeredFigureIds;
        updates.offeredCash = requestedCash;
        updates.requestedCash = offeredCash;
      } else {
        // Sender is countering, update directly
        updates.offeredFigureIds = offeredFigureIds;
        updates.requestedFigureIds = requestedFigureIds;
        updates.offeredCash = offeredCash;
        updates.requestedCash = requestedCash;
      }

      await updateDoc(tradeRef, updates);
      return true;
    } catch (error) {
      console.error('Failed to counter trade:', error);
      return false;
    }
  }

  /**
   * Accept a trade proposal
   */
  static async acceptTradeProposal(tradeId: string, userId: string): Promise<boolean> {
    try {
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      const tradeDoc = await getDoc(tradeRef);

      if (!tradeDoc.exists()) {
        return false;
      }

      const trade = tradeDoc.data() as TradeProposal;

      // Only the recipient can accept
      if (userId !== trade.toUserId) {
        return false;
      }

      await updateDoc(tradeRef, {
        status: 'accepted',
        acceptedAt: Date.now(),
        updatedAt: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Failed to accept trade:', error);
      return false;
    }
  }

  /**
   * Decline a trade proposal
   */
  static async declineTradeProposal(tradeId: string, userId: string): Promise<boolean> {
    try {
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);

      await updateDoc(tradeRef, {
        status: 'declined',
        updatedAt: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Failed to decline trade:', error);
      return false;
    }
  }

  /**
   * Cancel a trade proposal
   */
  static async cancelTradeProposal(tradeId: string, userId: string): Promise<boolean> {
    try {
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);

      await updateDoc(tradeRef, {
        status: 'cancelled',
        cancelledAt: Date.now(),
        updatedAt: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Failed to cancel trade:', error);
      return false;
    }
  }

  /**
   * Add message to trade
   */
  static async addTradeMessage(
    tradeId: string,
    userId: string,
    userName: string,
    message: string
  ): Promise<boolean> {
    try {
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      const tradeDoc = await getDoc(tradeRef);

      if (!tradeDoc.exists()) {
        return false;
      }

      const trade = tradeDoc.data() as TradeProposal;

      await updateDoc(tradeRef, {
        messages: [...trade.messages, {
          userId,
          userName,
          message,
          timestamp: Date.now()
        }],
        updatedAt: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Failed to add message:', error);
      return false;
    }
  }

  /**
   * Update shipping status
   */
  static async updateShippingStatus(
    tradeId: string,
    userId: string,
    status: 'shipped' | 'received'
  ): Promise<boolean> {
    try {
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      const tradeDoc = await getDoc(tradeRef);

      if (!tradeDoc.exists()) {
        return false;
      }

      const trade = tradeDoc.data() as TradeProposal;

      const updates: Partial<TradeProposal> = {
        updatedAt: Date.now()
      };

      if (userId === trade.fromUserId) {
        updates.fromUserShippingStatus = status;
      } else {
        updates.toUserShippingStatus = status;
      }

      // Check if trade is complete (both shipped and received)
      if (
        (userId === trade.fromUserId && status === 'received' && trade.toUserShippingStatus === 'received') ||
        (userId === trade.toUserId && status === 'received' && trade.fromUserShippingStatus === 'received')
      ) {
        updates.status = 'completed';
        updates.completedAt = Date.now();
      }

      await updateDoc(tradeRef, updates);
      return true;
    } catch (error) {
      console.error('Failed to update shipping status:', error);
      return false;
    }
  }

  /**
   * Leave rating for completed trade
   */
  static async leaveRating(
    tradeId: string,
    fromUserId: string,
    fromUserName: string,
    toUserId: string,
    rating: number,
    feedback: string
  ): Promise<boolean> {
    try {
      const userRating: Omit<UserRating, 'id'> = {
        tradeId,
        fromUserId,
        fromUserName,
        toUserId,
        rating,
        feedback,
        timestamp: Date.now()
      };

      await addDoc(collection(db, RATINGS_COLLECTION), userRating);
      return true;
    } catch (error) {
      console.error('Failed to leave rating:', error);
      return false;
    }
  }

  /**
   * Get user ratings
   */
  static async getUserRatings(userId: string): Promise<UserRating[]> {
    try {
      const ratingsRef = collection(db, RATINGS_COLLECTION);
      const q = query(ratingsRef, where('toUserId', '==', userId));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserRating));
    } catch (error) {
      console.error('Failed to get user ratings:', error);
      return [];
    }
  }

  /**
   * Calculate user rating stats
   */
  static calculateRatingStats(ratings: UserRating[]): {
    averageRating: number;
    totalRatings: number;
    ratingBreakdown: Record<number, number>;
  } {
    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;

    const ratingBreakdown = ratings.reduce((acc, r) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalRatings: ratings.length,
      ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...ratingBreakdown }
    };
  }
}

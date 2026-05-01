import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

const REJECTED_DUPLICATES_COLLECTION = 'rejectedDuplicates';

export interface RejectedDuplicate {
  id: string;
  figure1Id: string;
  figure2Id: string;
  figure1Name: string;
  figure2Name: string;
  rejectedBy: string;
  rejectedByName?: string;
  rejectedAt: number;
}

export class RejectedDuplicatesService {
  /**
   * Mark a pair of figures as "not duplicates"
   */
  static async reject(
    figure1Id: string,
    figure2Id: string,
    figure1Name: string,
    figure2Name: string,
    userId: string,
    userName?: string
  ): Promise<boolean> {
    try {
      // Create sorted pair ID to avoid duplicates (A-B and B-A are the same pair)
      const [id1, id2] = [figure1Id, figure2Id].sort();

      // Check if already rejected
      const existing = await this.findRejection(id1, id2);
      if (existing) {
        console.log('Pair already rejected');
        return true;
      }

      await addDoc(collection(db, REJECTED_DUPLICATES_COLLECTION), {
        figure1Id: id1,
        figure2Id: id2,
        figure1Name,
        figure2Name,
        rejectedBy: userId,
        rejectedByName: userName,
        rejectedAt: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Failed to reject duplicate:', error);
      return false;
    }
  }

  /**
   * Check if a pair has been rejected
   */
  static async isRejected(figure1Id: string, figure2Id: string): Promise<boolean> {
    const rejection = await this.findRejection(figure1Id, figure2Id);
    return rejection !== null;
  }

  /**
   * Find rejection record for a pair
   */
  static async findRejection(figure1Id: string, figure2Id: string): Promise<RejectedDuplicate | null> {
    try {
      // Create sorted pair ID
      const [id1, id2] = [figure1Id, figure2Id].sort();

      const q = query(
        collection(db, REJECTED_DUPLICATES_COLLECTION),
        where('figure1Id', '==', id1),
        where('figure2Id', '==', id2)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as RejectedDuplicate;
    } catch (error) {
      console.error('Failed to find rejection:', error);
      return null;
    }
  }

  /**
   * Get all rejected pairs
   */
  static async getAll(): Promise<RejectedDuplicate[]> {
    try {
      const snapshot = await getDocs(collection(db, REJECTED_DUPLICATES_COLLECTION));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RejectedDuplicate));
    } catch (error) {
      console.error('Failed to get rejected duplicates:', error);
      return [];
    }
  }

  /**
   * Remove a rejection (allow pair to be flagged as duplicate again)
   */
  static async unreject(rejectionId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, REJECTED_DUPLICATES_COLLECTION, rejectionId));
      return true;
    } catch (error) {
      console.error('Failed to unreject duplicate:', error);
      return false;
    }
  }

  /**
   * Get set of rejected pair IDs for fast lookup
   * Returns Set of "id1-id2" strings (sorted)
   */
  static async getRejectedPairIds(): Promise<Set<string>> {
    const rejected = await this.getAll();
    return new Set(rejected.map(r => `${r.figure1Id}-${r.figure2Id}`));
  }
}

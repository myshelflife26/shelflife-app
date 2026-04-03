import type { User } from '../types/user';
import { FirebaseAuthService } from './firebaseAuth';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const ADMIRERS_COLLECTION = 'admirers';
const ADMIRER_REQUESTS_COLLECTION = 'admirer_requests';

interface AdmirerRelationship {
  id?: string;
  admirerId: string;
  targetUserId: string;
  timestamp: number;
}

export class AdmirersService {
  // Get user by ID (from Firebase)
  private static async getUser(userId: string): Promise<User | null> {
    return await FirebaseAuthService.getUserById(userId);
  }

  // Get all users (from Firebase)
  private static async getAllUsers(): Promise<User[]> {
    return await FirebaseAuthService.getAllUsers();
  }

  // Request to be an admirer of someone's collection
  static async requestToAdmire(admirerId: string, targetUserId: string): Promise<{
    success: boolean;
    message: string;
    autoApproved?: boolean;
  }> {
    if (admirerId === targetUserId) {
      return { success: false, message: 'You cannot admire your own collection' };
    }

    const targetUser = await this.getUser(targetUserId);
    if (!targetUser) {
      return { success: false, message: 'User not found' };
    }

    // Check if already an admirer
    const admirersQuery = query(
      collection(db, ADMIRERS_COLLECTION),
      where('admirerId', '==', admirerId),
      where('targetUserId', '==', targetUserId)
    );
    const admirersSnapshot = await getDocs(admirersQuery);
    if (!admirersSnapshot.empty) {
      return { success: false, message: 'You are already an admirer of this collection' };
    }

    // Check if request already pending
    const requestsQuery = query(
      collection(db, ADMIRER_REQUESTS_COLLECTION),
      where('admirerId', '==', admirerId),
      where('targetUserId', '==', targetUserId)
    );
    const requestsSnapshot = await getDocs(requestsQuery);
    if (!requestsSnapshot.empty) {
      return { success: false, message: 'Your request is already pending' };
    }

    // Auto-approve if enabled
    if (targetUser.autoApproveAdmirers) {
      await addDoc(collection(db, ADMIRERS_COLLECTION), {
        admirerId,
        targetUserId,
        timestamp: Date.now()
      });
      return { success: true, message: 'You are now an admirer!', autoApproved: true };
    }

    // Add to pending requests
    await addDoc(collection(db, ADMIRER_REQUESTS_COLLECTION), {
      admirerId,
      targetUserId,
      timestamp: Date.now()
    });

    return { success: true, message: 'Request sent! Waiting for approval.' };
  }

  // Approve an admirer request
  static async approveRequest(userId: string, admirerId: string): Promise<boolean> {
    try {
      // Find the request
      const requestsQuery = query(
        collection(db, ADMIRER_REQUESTS_COLLECTION),
        where('admirerId', '==', admirerId),
        where('targetUserId', '==', userId)
      );
      const requestsSnapshot = await getDocs(requestsQuery);

      if (requestsSnapshot.empty) return false;

      // Delete the request
      await deleteDoc(requestsSnapshot.docs[0].ref);

      // Add to admirers
      await addDoc(collection(db, ADMIRERS_COLLECTION), {
        admirerId,
        targetUserId: userId,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Failed to approve request:', error);
      return false;
    }
  }

  // Reject an admirer request
  static async rejectRequest(userId: string, admirerId: string): Promise<boolean> {
    try {
      const requestsQuery = query(
        collection(db, ADMIRER_REQUESTS_COLLECTION),
        where('admirerId', '==', admirerId),
        where('targetUserId', '==', userId)
      );
      const requestsSnapshot = await getDocs(requestsQuery);

      if (requestsSnapshot.empty) return false;

      await deleteDoc(requestsSnapshot.docs[0].ref);
      return true;
    } catch (error) {
      console.error('Failed to reject request:', error);
      return false;
    }
  }

  // Remove an admirer
  static async removeAdmirer(userId: string, admirerId: string): Promise<boolean> {
    try {
      const admirersQuery = query(
        collection(db, ADMIRERS_COLLECTION),
        where('admirerId', '==', admirerId),
        where('targetUserId', '==', userId)
      );
      const admirersSnapshot = await getDocs(admirersQuery);

      if (admirersSnapshot.empty) return false;

      await deleteDoc(admirersSnapshot.docs[0].ref);
      return true;
    } catch (error) {
      console.error('Failed to remove admirer:', error);
      return false;
    }
  }

  // Stop admiring a collection (remove yourself as an admirer)
  static async stopAdmiring(admirerId: string, targetUserId: string): Promise<boolean> {
    return await this.removeAdmirer(targetUserId, admirerId);
  }

  // Cancel your pending request
  static async cancelRequest(admirerId: string, targetUserId: string): Promise<boolean> {
    return await this.rejectRequest(targetUserId, admirerId);
  }

  // Get list of approved admirers for a user (with details)
  static async getAdmirers(userId: string): Promise<Array<{
    id: string;
    username: string;
    displayName: string;
    profileImage?: string;
  }>> {
    try {
      const admirersQuery = query(
        collection(db, ADMIRERS_COLLECTION),
        where('targetUserId', '==', userId)
      );
      const admirersSnapshot = await getDocs(admirersQuery);

      if (admirersSnapshot.empty) return [];

      const admirerIds = admirersSnapshot.docs.map(doc => doc.data().admirerId);
      const users = await this.getAllUsers();

      return admirerIds
        .map(admirerId => {
          const admirer = users.find(u => u.id === admirerId);
          if (!admirer) return null;
          return {
            id: admirer.id,
            username: admirer.username,
            displayName: admirer.displayName,
            profileImage: admirer.profileImage
          };
        })
        .filter(a => a !== null) as Array<{
          id: string;
          username: string;
          displayName: string;
          profileImage?: string;
        }>;
    } catch (error) {
      console.error('Failed to get admirers:', error);
      return [];
    }
  }

  // Get pending admirer requests (with details)
  static async getPendingRequests(userId: string): Promise<Array<{
    id: string;
    username: string;
    displayName: string;
    profileImage?: string;
  }>> {
    try {
      const requestsQuery = query(
        collection(db, ADMIRER_REQUESTS_COLLECTION),
        where('targetUserId', '==', userId)
      );
      const requestsSnapshot = await getDocs(requestsQuery);

      if (requestsSnapshot.empty) return [];

      const requestIds = requestsSnapshot.docs.map(doc => doc.data().admirerId);
      const users = await this.getAllUsers();

      return requestIds
        .map(admirerId => {
          const admirer = users.find(u => u.id === admirerId);
          if (!admirer) return null;
          return {
            id: admirer.id,
            username: admirer.username,
            displayName: admirer.displayName,
            profileImage: admirer.profileImage
          };
        })
        .filter(a => a !== null) as Array<{
          id: string;
          username: string;
          displayName: string;
          profileImage?: string;
        }>;
    } catch (error) {
      console.error('Failed to get pending requests:', error);
      return [];
    }
  }

  // Get list of user IDs you are admiring (simple version)
  static async getAdmiring(admirerId: string): Promise<string[]> {
    try {
      const admirersQuery = query(
        collection(db, ADMIRERS_COLLECTION),
        where('admirerId', '==', admirerId)
      );
      const admirersSnapshot = await getDocs(admirersQuery);
      return admirersSnapshot.docs.map(doc => doc.data().targetUserId);
    } catch (error) {
      console.error('Failed to get admiring list:', error);
      return [];
    }
  }

  // Get collections you are admiring (with details)
  static async getAdmiringCollections(admirerId: string): Promise<Array<{
    id: string;
    username: string;
    displayName: string;
    profileImage?: string;
    admirerCount: number;
  }>> {
    try {
      const admiringIds = await this.getAdmiring(admirerId);
      if (admiringIds.length === 0) return [];

      const users = await this.getAllUsers();
      const results = [];

      for (const userId of admiringIds) {
        const user = users.find(u => u.id === userId);
        if (user) {
          const count = await this.getAdmirerCount(userId);
          results.push({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            profileImage: user.profileImage,
            admirerCount: count
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to get admiring collections:', error);
      return [];
    }
  }

  // Get collections with pending requests from you
  static async getPendingRequestsSent(admirerId: string): Promise<Array<{
    id: string;
    username: string;
    displayName: string;
    profileImage?: string;
  }>> {
    try {
      const requestsQuery = query(
        collection(db, ADMIRER_REQUESTS_COLLECTION),
        where('admirerId', '==', admirerId)
      );
      const requestsSnapshot = await getDocs(requestsQuery);

      const targetIds = requestsSnapshot.docs.map(doc => doc.data().targetUserId);
      if (targetIds.length === 0) return [];

      const users = await this.getAllUsers();
      return targetIds
        .map(userId => {
          const user = users.find(u => u.id === userId);
          if (!user) return null;
          return {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            profileImage: user.profileImage
          };
        })
        .filter(u => u !== null) as Array<{
          id: string;
          username: string;
          displayName: string;
          profileImage?: string;
        }>;
    } catch (error) {
      console.error('Failed to get pending requests sent:', error);
      return [];
    }
  }

  // Check if someone is an admirer
  static async isAdmirer(userId: string, admirerId: string): Promise<boolean> {
    try {
      const admirersQuery = query(
        collection(db, ADMIRERS_COLLECTION),
        where('admirerId', '==', admirerId),
        where('targetUserId', '==', userId)
      );
      const admirersSnapshot = await getDocs(admirersQuery);
      return !admirersSnapshot.empty;
    } catch (error) {
      console.error('Failed to check admirer status:', error);
      return false;
    }
  }

  // Check if there's a pending request
  static async hasPendingRequest(userId: string, admirerId: string): Promise<boolean> {
    try {
      const requestsQuery = query(
        collection(db, ADMIRER_REQUESTS_COLLECTION),
        where('admirerId', '==', admirerId),
        where('targetUserId', '==', userId)
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      return !requestsSnapshot.empty;
    } catch (error) {
      console.error('Failed to check pending request:', error);
      return false;
    }
  }

  // Get admirer count for a user
  static async getAdmirerCount(userId: string): Promise<number> {
    try {
      const admirersQuery = query(
        collection(db, ADMIRERS_COLLECTION),
        where('targetUserId', '==', userId)
      );
      const admirersSnapshot = await getDocs(admirersQuery);
      return admirersSnapshot.size;
    } catch (error) {
      console.error('Failed to get admirer count:', error);
      return 0;
    }
  }

  // Get pending request count for a user
  static async getPendingRequestCount(userId: string): Promise<number> {
    try {
      const requestsQuery = query(
        collection(db, ADMIRER_REQUESTS_COLLECTION),
        where('targetUserId', '==', userId)
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      return requestsSnapshot.size;
    } catch (error) {
      console.error('Failed to get pending request count:', error);
      return 0;
    }
  }

  // Set auto-approve setting (store in Firebase user profile)
  static async setAutoApprove(userId: string, autoApprove: boolean): Promise<void> {
    await FirebaseAuthService.updateUser(userId, { autoApproveAdmirers: autoApprove });
  }
}

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User, UserRole } from '../types/user';

const USERS_COLLECTION = 'users';

export class FirebaseAuthService {
  private static currentUserCache: User | null = null;

  /**
   * Initialize default users (for testing)
   * Call this once when setting up Firebase for the first time
   */
  static async initializeDefaultUsers() {
    try {
      // Check if default users already exist
      const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
      if (usersSnapshot.size > 0) {
        console.log('Users already exist, skipping initialization');
        return;
      }

      // Create default test users
      const defaultUsers = [
        {
          username: 'ackpack34',
          email: 'ackpack34@test.com',
          password: '543210',
          role: 'management' as UserRole,
          displayName: 'ackpack34',
          subscriptionTier: 'premium' as const
        },
        {
          username: 'ackpack342',
          email: 'ackpack342@test.com',
          password: '123456',
          role: 'user' as UserRole,
          displayName: 'ackpack342',
          subscriptionTier: 'free' as const
        }
      ];

      for (const user of defaultUsers) {
        try {
          // Create Firebase Auth user
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            user.email,
            user.password
          );

          // Create Firestore user document
          await setDoc(doc(db, USERS_COLLECTION, userCredential.user.uid), {
            username: user.username,
            email: user.email,
            role: user.role,
            displayName: user.displayName,
            subscriptionTier: user.subscriptionTier,
            collectionPublic: false,
            autoApproveAdmirers: false,
            admirers: [],
            admirerRequests: [],
            createdAt: Date.now()
          });

          console.log(`✅ Created user: ${user.username}`);
        } catch (error: any) {
          console.error(`Failed to create user ${user.username}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Failed to initialize default users:', error);
    }
  }

  /**
   * Login with username and password
   * Converts username to email internally
   */
  static async login(username: string, password: string): Promise<User | null> {
    try {
      // Find user by username to get their email
      const usersRef = collection(db, USERS_COLLECTION);
      const q = query(usersRef, where('username', '==', username.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.error('User not found');
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const email = userData.email;

      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Fetch full user data from Firestore
      const user = await this.getUserById(userCredential.user.uid);
      this.currentUserCache = user;
      return user;
    } catch (error: any) {
      console.error('Login failed:', error.message);
      return null;
    }
  }

  /**
   * Logout current user
   */
  static async logout() {
    try {
      await firebaseSignOut(auth);
      this.currentUserCache = null;
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  /**
   * Get current authenticated user
   */
  static async getCurrentUser(): Promise<User | null> {
    // Return cached user if available
    if (this.currentUserCache) {
      return this.currentUserCache;
    }

    // Check Firebase Auth state
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      return null;
    }

    // Fetch user data from Firestore
    const user = await this.getUserById(firebaseUser.uid);
    this.currentUserCache = user;
    return user;
  }

  /**
   * Get user by ID from Firestore
   */
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
      if (!userDoc.exists()) {
        return null;
      }

      const data = userDoc.data();
      return {
        id: userDoc.id,
        username: data.username,
        password: '', // Don't expose password
        role: data.role,
        displayName: data.displayName,
        email: data.email,
        profileImage: data.profileImage,
        collectionPublic: data.collectionPublic,
        admirers: data.admirers || [],
        admirerRequests: data.admirerRequests || [],
        autoApproveAdmirers: data.autoApproveAdmirers || false,
        subscriptionTier: data.subscriptionTier || 'free'
      };
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = await this.getUserById(firebaseUser.uid);
        this.currentUserCache = user;
        callback(user);
      } else {
        this.currentUserCache = null;
        callback(null);
      }
    });
  }

  /**
   * Check if current user is authenticated
   */
  static isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  /**
   * Check if current user is management
   */
  static async isManagement(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === 'management';
  }

  /**
   * Create new user (admin only)
   */
  static async createUser(
    username: string,
    password: string,
    displayName: string,
    role: UserRole,
    email?: string
  ): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      // Validate inputs
      if (!username || username.trim().length < 3) {
        return { success: false, error: 'Username must be at least 3 characters long' };
      }

      if (!password || password.length < 4) {
        return { success: false, error: 'Password must be at least 4 characters long' };
      }

      if (!displayName || displayName.trim().length < 2) {
        return { success: false, error: 'Display name must be at least 2 characters long' };
      }

      // Check if username already exists
      const usersRef = collection(db, USERS_COLLECTION);
      const q = query(usersRef, where('username', '==', username.toLowerCase()));
      const existingUser = await getDocs(q);

      if (!existingUser.empty) {
        return { success: false, error: 'Username already exists' };
      }

      // Generate email if not provided
      const userEmail = email || `${username.toLowerCase()}@shelflife.app`;

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, userEmail, password);

      // Create Firestore user document
      const userData = {
        username: username.trim().toLowerCase(),
        email: userEmail,
        role: role,
        displayName: displayName.trim(),
        subscriptionTier: 'free',
        collectionPublic: false,
        autoApproveAdmirers: false,
        admirers: [],
        admirerRequests: [],
        createdAt: Date.now()
      };

      await setDoc(doc(db, USERS_COLLECTION, userCredential.user.uid), userData);

      const newUser: User = {
        id: userCredential.user.uid,
        username: userData.username,
        password: '', // Don't expose
        role: userData.role,
        displayName: userData.displayName,
        email: userData.email,
        subscriptionTier: userData.subscriptionTier as 'free' | 'premium'
      };

      return { success: true, user: newUser };
    } catch (error: any) {
      console.error('Failed to create user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user data
   */
  static async updateUser(
    userId: string,
    updates: Partial<Omit<User, 'id' | 'password'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, USERS_COLLECTION, userId);

      // Remove undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );

      await updateDoc(userRef, cleanUpdates);

      // Update cache if it's the current user
      if (this.currentUserCache?.id === userId) {
        this.currentUserCache = { ...this.currentUserCache, ...updates };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Failed to update user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete user (admin only)
   */
  static async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Prevent deleting yourself
      const currentUser = await this.getCurrentUser();
      if (currentUser?.id === userId) {
        return { success: false, error: 'Cannot delete your own account' };
      }

      // Delete Firestore document
      await deleteDoc(doc(db, USERS_COLLECTION, userId));

      // TODO: Delete user's figures, reactions, messages, etc.
      // TODO: Delete Firebase Auth user (requires Admin SDK on backend)

      return { success: true };
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all users (admin only)
   */
  static async getAllUsers(): Promise<User[]> {
    try {
      const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
      return usersSnapshot.docs.map(doc => ({
        id: doc.id,
        username: doc.data().username,
        password: '', // Don't expose
        role: doc.data().role,
        displayName: doc.data().displayName,
        email: doc.data().email,
        profileImage: doc.data().profileImage,
        collectionPublic: doc.data().collectionPublic,
        admirers: doc.data().admirers || [],
        admirerRequests: doc.data().admirerRequests || [],
        autoApproveAdmirers: doc.data().autoApproveAdmirers || false,
        subscriptionTier: doc.data().subscriptionTier || 'free'
      }));
    } catch (error) {
      console.error('Failed to get users:', error);
      return [];
    }
  }

  /**
   * Update profile image
   */
  static async updateProfileImage(userId: string, profileImage: string | null): Promise<void> {
    try {
      await updateDoc(doc(db, USERS_COLLECTION, userId), {
        profileImage: profileImage || null
      });

      // Update cache
      if (this.currentUserCache?.id === userId) {
        this.currentUserCache.profileImage = profileImage || undefined;
      }
    } catch (error) {
      console.error('Failed to update profile image:', error);
    }
  }
}

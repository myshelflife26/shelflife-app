import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateEmail
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
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User, UserRole } from '../types/user';
import { SettingsService } from './settings';
import { ActivityRecorder } from './communityActivity';

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
      console.log('[LOGIN] Starting login for username:', username);

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

      console.log('[LOGIN] Found user in Firestore:');
      console.log('[LOGIN] - Username:', userData.username);
      console.log('[LOGIN] - Email:', email);
      console.log('[LOGIN] - Firestore Doc ID:', userDoc.id);

      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      console.log('[LOGIN] Signed in successfully. Firebase UID:', userCredential.user.uid);
      console.log('[LOGIN] Username (lowercase):', username.toLowerCase());
      console.log('[LOGIN] Migrating localStorage to Firestore...');

      // Migrate localStorage settings to Firestore
      await SettingsService.migrateLocalStorageToFirestore(userCredential.user.uid);

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
   * Get current user ID synchronously (from cache or Firebase auth)
   */
  static getCurrentUserId(): string | null {
    // Try cache first
    if (this.currentUserCache) {
      return this.currentUserCache.id;
    }

    // Fall back to Firebase auth current user
    const firebaseUser = auth.currentUser;
    return firebaseUser ? firebaseUser.uid : null;
  }

  /**
   * Get user by ID from Firestore
   */
  static async getUserById(userId: string): Promise<User | null> {
    // Strict input validation
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      console.warn('[AUTH] getUserById called with invalid userId:', { userId, type: typeof userId });
      return null;
    }

    try {
      console.log('[AUTH] Fetching user from Firestore:', userId);
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));

      if (!userDoc.exists()) {
        console.warn(`[AUTH] User not found in Firestore: ${userId}`);
        return null;
      }

      const data = userDoc.data();
      if (!data || typeof data !== 'object') {
        console.warn(`[AUTH] User document has no data: ${userId}`);
        return null;
      }

      // Validate essential fields
      const docId = userDoc.id;
      if (!docId || typeof docId !== 'string') {
        console.error(`[AUTH] User document has invalid ID: ${docId}`);
        return null;
      }

      // Construct user with validated fields
      const user: User = {
        id: docId,
        username: (typeof data.username === 'string' ? data.username : '') || '',
        password: '', // Don't expose password
        role: (data.role === 'admin' || data.role === 'management') ? (data.role as 'admin' | 'management') : 'user',
        displayName: (typeof data.displayName === 'string' ? data.displayName : '') || '',
        email: (typeof data.email === 'string' ? data.email : '') || '',
        profileImage: (typeof data.profileImage === 'string' ? data.profileImage : '') || '',
        collectionPublic: Boolean(data.collectionPublic ?? true),
        admirers: Array.isArray(data.admirers) ? data.admirers : [],
        admirerRequests: Array.isArray(data.admirerRequests) ? data.admirerRequests : [],
        autoApproveAdmirers: Boolean(data.autoApproveAdmirers || false),
        subscriptionTier: (data.subscriptionTier === 'premium' ? 'premium' : 'free')
      };

      // Final validation that user object has required fields
      if (!user.id || !user.username || user.username.length === 0) {
        console.error(`[AUTH] Created user object is invalid:`, JSON.stringify(user, null, 2));
        return null;
      }

      console.log(`[AUTH] Successfully created user object for: ${user.username} (${user.id})`);
      return user;
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
      // Ultra-defensive wrapper to prevent any React crashes
      setTimeout(async () => {
        try {
          // Strict validation of callback
          if (!callback || typeof callback !== 'function') {
            console.error('[AUTH] Invalid callback provided');
            return;
          }

          // Validate firebaseUser parameter
          if (firebaseUser === undefined) {
            console.error('[AUTH] Received undefined firebaseUser - forcing to null');
            firebaseUser = null;
          }

          if (firebaseUser && firebaseUser.uid && typeof firebaseUser.uid === 'string' && firebaseUser.uid.trim().length > 0) {
            console.log('[AUTH] Firebase user detected, fetching user data...', firebaseUser.uid);

            try {
              // Add timeout to getUserById to prevent hanging
              const getUserPromise = this.getUserById(firebaseUser.uid);
              const timeoutPromise = new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('getUserById timeout')), 10000)
              );

              const user = await Promise.race([getUserPromise, timeoutPromise]);

              // Ultra-strict validation of user data
              if (user &&
                  user.id &&
                  typeof user.id === 'string' &&
                  user.id.trim().length > 0 &&
                  user.username &&
                  typeof user.username === 'string' &&
                  user.displayName &&
                  typeof user.displayName === 'string') {

                console.log('[AUTH] User data fully validated:', user.id);

                // Migrate localStorage settings to Firestore if user exists
                try {
                  await SettingsService.migrateLocalStorageToFirestore(firebaseUser.uid);
                } catch (migrationError) {
                  console.warn('[AUTH] Settings migration failed:', migrationError);
                  // Don't fail auth if migration fails
                }

                this.currentUserCache = user;

                // Extra safety: delay callback to ensure React is ready
                setTimeout(() => {
                  try {
                    console.log('[AUTH] Calling callback with validated user');
                    callback(user);
                  } catch (callbackError) {
                    console.error('[AUTH] Callback error:', callbackError);
                  }
                }, 10);

              } else {
                console.warn('[AUTH] getUserById returned invalid user data:', user);
                this.currentUserCache = null;
                setTimeout(() => {
                  try {
                    callback(null);
                  } catch (callbackError) {
                    console.error('[AUTH] Callback error:', callbackError);
                  }
                }, 10);
              }
            } catch (getUserError) {
              console.error('[AUTH] Error in getUserById:', getUserError);
              this.currentUserCache = null;
              setTimeout(() => {
                try {
                  callback(null);
                } catch (callbackError) {
                  console.error('[AUTH] Callback error:', callbackError);
                }
              }, 10);
            }
          } else {
            console.log('[AUTH] No valid Firebase user, calling callback with null');
            this.currentUserCache = null;
            setTimeout(() => {
              try {
                callback(null);
              } catch (callbackError) {
                console.error('[AUTH] Callback error:', callbackError);
              }
            }, 10);
          }
        } catch (outerError) {
          console.error('[AUTH] Critical error in auth state change handler:', outerError);
          // Last resort: ensure callback is called
          this.currentUserCache = null;
          setTimeout(() => {
            try {
              callback(null);
            } catch (callbackError) {
              console.error('[AUTH] Final callback error:', callbackError);
            }
          }, 10);
        }
      }, 0); // Defer execution to next tick
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

      // Record community activity for new user registration
      try {
        ActivityRecorder.userJoined(newUser);
      } catch (activityError) {
        console.warn('Failed to record user joined activity:', activityError);
      }

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
   * Cascades deletion to user's personal data while preserving historical/shared data
   */
  static async deleteUser(userId: string, options?: { deleteReactions?: boolean; deleteTrades?: boolean }): Promise<{ success: boolean; error?: string }> {
    try {
      // Prevent deleting yourself
      const currentUser = await this.getCurrentUser();
      if (currentUser?.id === userId) {
        return { success: false, error: 'Cannot delete your own account' };
      }

      console.log('Starting cascading delete for user:', userId);
      console.log('Options:', options);

      // 1. Delete user's figures
      const figuresQuery = query(collection(db, 'figures'), where('userId', '==', userId));
      const figuresSnapshot = await getDocs(figuresQuery);
      const figureDeletions = figuresSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(figureDeletions);
      console.log(`Deleted ${figuresSnapshot.size} figures`);

      // 2. Anonymize user's comments (keep comment history but remove user association)
      const commentsQuery = query(collection(db, 'comments'), where('userId', '==', userId));
      const commentsSnapshot = await getDocs(commentsQuery);
      const batch = writeBatch(db);
      commentsSnapshot.docs.forEach(docSnap => {
        batch.update(docSnap.ref, {
          userId: 'deleted_user',
          userDisplayName: '[Deleted User]',
          userName: 'deleted'
        });
      });
      await batch.commit();
      console.log(`Anonymized ${commentsSnapshot.size} comments`);

      // 3. Delete comment reports by or for this user (no longer relevant)
      const reportsByUserQuery = query(collection(db, 'commentReports'), where('reportedBy', '==', userId));
      const reportsForUserQuery = query(collection(db, 'commentReports'), where('figureOwnerId', '==', userId));
      const [reportsBySnapshot, reportsForSnapshot] = await Promise.all([
        getDocs(reportsByUserQuery),
        getDocs(reportsForUserQuery)
      ]);
      const reportDeletions = [
        ...reportsBySnapshot.docs.map(doc => deleteDoc(doc.ref)),
        ...reportsForSnapshot.docs.map(doc => deleteDoc(doc.ref))
      ];
      await Promise.all(reportDeletions);
      console.log(`Deleted ${reportsBySnapshot.size + reportsForSnapshot.size} comment reports`);

      // 4. Delete user's personal notifications
      const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const notificationDeletions = notificationsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(notificationDeletions);
      console.log(`Deleted ${notificationsSnapshot.size} notifications`);

      // 5. Anonymize messages in conversations (preserve conversation history)
      const conversationsQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', userId));
      const conversationsSnapshot = await getDocs(conversationsQuery);

      for (const convDoc of conversationsSnapshot.docs) {
        const messagesQuery = collection(db, 'conversations', convDoc.id, 'messages');
        const messagesSnapshot = await getDocs(messagesQuery);
        const messageBatch = writeBatch(db);

        messagesSnapshot.docs.forEach(msgDoc => {
          const msgData = msgDoc.data();
          if (msgData.fromUserId === userId) {
            messageBatch.update(msgDoc.ref, {
              fromUserId: 'deleted_user',
              fromDisplayName: '[Deleted User]'
            });
          }
        });

        await messageBatch.commit();
      }
      console.log(`Anonymized messages in ${conversationsSnapshot.size} conversations`);

      // 6. OPTIONAL: Delete reactions (only if explicitly requested)
      if (options?.deleteReactions) {
        const reactionsQuery = query(collection(db, 'reactions'), where('userId', '==', userId));
        const reactionsSnapshot = await getDocs(reactionsQuery);
        const reactionDeletions = reactionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(reactionDeletions);
        console.log(`Deleted ${reactionsSnapshot.size} reactions`);
      } else {
        console.log('Preserved reactions (historical data)');
      }

      // 7. Delete admirer relationships (relationship-based, not historical)
      const admirerQuery1 = query(collection(db, 'admirers'), where('admirerId', '==', userId));
      const admirerQuery2 = query(collection(db, 'admirers'), where('targetUserId', '==', userId));
      const [admirerSnapshot1, admirerSnapshot2] = await Promise.all([
        getDocs(admirerQuery1),
        getDocs(admirerQuery2)
      ]);
      const admirerDeletions = [
        ...admirerSnapshot1.docs.map(doc => deleteDoc(doc.ref)),
        ...admirerSnapshot2.docs.map(doc => deleteDoc(doc.ref))
      ];
      await Promise.all(admirerDeletions);
      console.log(`Deleted ${admirerSnapshot1.size + admirerSnapshot2.size} admirer relationships`);

      // 8. Delete admirer requests (pending relationships)
      const requestQuery1 = query(collection(db, 'admirer_requests'), where('admirerId', '==', userId));
      const requestQuery2 = query(collection(db, 'admirer_requests'), where('targetUserId', '==', userId));
      const [requestSnapshot1, requestSnapshot2] = await Promise.all([
        getDocs(requestQuery1),
        getDocs(requestQuery2)
      ]);
      const requestDeletions = [
        ...requestSnapshot1.docs.map(doc => deleteDoc(doc.ref)),
        ...requestSnapshot2.docs.map(doc => deleteDoc(doc.ref))
      ];
      await Promise.all(requestDeletions);
      console.log(`Deleted ${requestSnapshot1.size + requestSnapshot2.size} admirer requests`);

      // 9. OPTIONAL: Delete trades (only if explicitly requested, otherwise preserve history)
      if (options?.deleteTrades) {
        const tradesQuery1 = query(collection(db, 'trades'), where('fromUserId', '==', userId));
        const tradesQuery2 = query(collection(db, 'trades'), where('toUserId', '==', userId));
        const [tradesSnapshot1, tradesSnapshot2] = await Promise.all([
          getDocs(tradesQuery1),
          getDocs(tradesQuery2)
        ]);
        const tradeDeletions = [
          ...tradesSnapshot1.docs.map(doc => deleteDoc(doc.ref)),
          ...tradesSnapshot2.docs.map(doc => deleteDoc(doc.ref))
        ];
        await Promise.all(tradeDeletions);
        console.log(`Deleted ${tradesSnapshot1.size + tradesSnapshot2.size} trades`);
      } else {
        console.log('Preserved trades (historical data)');
      }

      // 10. Delete user's personal shelves
      const shelvesQuery = query(collection(db, 'shelves'), where('userId', '==', userId));
      const shelvesSnapshot = await getDocs(shelvesQuery);
      const shelfDeletions = shelvesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(shelfDeletions);
      console.log(`Deleted ${shelvesSnapshot.size} shelves`);

      // 11. Delete user's personal wishlist
      const wishlistQuery = query(collection(db, 'wishlist'), where('userId', '==', userId));
      const wishlistSnapshot = await getDocs(wishlistQuery);
      const wishlistDeletions = wishlistSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(wishlistDeletions);
      console.log(`Deleted ${wishlistSnapshot.size} wishlist items`);

      // 12. Keep user ratings (affects other users' reputation - historical data)
      console.log('Preserved user ratings (historical data affecting other users)');

      // Finally, delete the user document
      await deleteDoc(doc(db, USERS_COLLECTION, userId));
      console.log('Deleted user document');

      // NOTE: Firebase Auth user deletion requires Admin SDK on backend
      // This would need to be implemented as a Cloud Function or backend endpoint
      console.warn('Firebase Auth user not deleted - requires Admin SDK on backend');

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
   * Get user by username
   */
  static async getUserByUsername(username: string): Promise<User | null> {
    try {
      const q = query(
        collection(db, USERS_COLLECTION),
        where('username', '==', username)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
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
      };
    } catch (error) {
      console.error('Failed to get user by username:', error);
      return null;
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

  /**
   * Update user display name
   */
  static async updateDisplayName(userId: string, displayName: string): Promise<void> {
    try {
      await updateDoc(doc(db, USERS_COLLECTION, userId), {
        displayName
      });

      // Update cache
      if (this.currentUserCache?.id === userId) {
        this.currentUserCache.displayName = displayName;
      }
    } catch (error) {
      console.error('Failed to update display name:', error);
      throw error;
    }
  }

  /**
   * Update user email (requires current password for re-authentication)
   */
  static async updateUserEmail(userId: string, newEmail: string, currentPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No authenticated user');
      }

      if (user.uid !== userId) {
        throw new Error('Can only update email for current user');
      }

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update email in Firebase Auth
      await updateEmail(user, newEmail);

      // Update Firestore
      await updateDoc(doc(db, USERS_COLLECTION, userId), {
        email: newEmail
      });

      // Update cache
      if (this.currentUserCache?.id === userId) {
        this.currentUserCache.email = newEmail;
      }
    } catch (error: any) {
      console.error('Failed to update email:', error);
      if (error.code === 'auth/wrong-password') {
        throw new Error('Current password is incorrect');
      } else if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email is already in use by another account');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address');
      }
      throw error;
    }
  }

  /**
   * Change user password
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No authenticated user');
      }

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password in Firebase Auth
      await updatePassword(user, newPassword);
    } catch (error: any) {
      console.error('Failed to change password:', error);
      if (error.code === 'auth/wrong-password') {
        throw new Error('Current password is incorrect');
      }
      throw error;
    }
  }
}

import type { User, UserRole } from '../types/user';

const USERS_KEY = 'action-figure-tracker-users';
const CURRENT_USER_KEY = 'action-figure-tracker-current-user';
const SESSION_KEY = 'action-figure-tracker-session';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface Session {
  userId: string;
  token: string;
  timestamp: number;
  lastActivity: number;
}

// Initialize default users
const defaultUsers: User[] = [
  {
    id: 'user-1',
    username: 'ackpack34',
    password: '1234',
    role: 'management',
    displayName: 'ackpack34',
    subscriptionTier: 'premium'
  },
  {
    id: 'user-2',
    username: 'ackpack342',
    password: '1234',
    role: 'user',
    displayName: 'ackpack342',
    subscriptionTier: 'free' // Free tier to test watermarks
  }
];

export class AuthService {
  static initialize() {
    // Initialize users if not present
    const users = localStorage.getItem(USERS_KEY);
    if (!users) {
      localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    }
  }

  static getUsers(): User[] {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : defaultUsers;
  }

  static getUserById(userId: string): User | null {
    const users = this.getUsers();
    return users.find(u => u.id === userId) || null;
  }

  private static generateSessionToken(): string {
    return crypto.randomUUID() + '-' + Date.now();
  }

  private static createSession(userId: string): Session {
    const session: Session = {
      userId,
      token: this.generateSessionToken(),
      timestamp: Date.now(),
      lastActivity: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  private static getSession(): Session | null {
    const sessionData = localStorage.getItem(SESSION_KEY);
    return sessionData ? JSON.parse(sessionData) : null;
  }

  private static updateLastActivity(): void {
    const session = this.getSession();
    if (session) {
      session.lastActivity = Date.now();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }

  static isSessionValid(): boolean {
    const session = this.getSession();
    if (!session) return false;

    const now = Date.now();
    const timeSinceLastActivity = now - session.lastActivity;

    // Session expires after SESSION_TIMEOUT of inactivity
    if (timeSinceLastActivity > SESSION_TIMEOUT) {
      this.logout();
      return false;
    }

    // Update last activity
    this.updateLastActivity();
    return true;
  }

  static login(username: string, password: string): User | null {
    const users = this.getUsers();
    const user = users.find(u =>
      u.username.toLowerCase() === username.toLowerCase() &&
      u.password === password
    );

    if (user) {
      // Create new session (this will replace any existing session)
      this.createSession(user.id);

      // Store current user
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

      // Listen for storage events to detect logins on other tabs
      this.setupStorageListener();

      return user;
    }

    return null;
  }

  static logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  static getCurrentUser(): User | null {
    // Validate session first
    if (!this.isSessionValid()) {
      return null;
    }

    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null && this.isSessionValid();
  }

  static isManagement(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'management';
  }

  // Setup listener to detect session changes across tabs
  private static storageListenerSetup = false;
  private static storageListenerCallback: ((e: StorageEvent) => void) | null = null;

  static setupStorageListener() {
    if (this.storageListenerSetup) return;

    this.storageListenerCallback = (e: StorageEvent) => {
      // If session token changes, it means another tab logged in
      if (e.key === SESSION_KEY && e.newValue !== e.oldValue) {
        const currentSession = this.getSession();
        const newSession = e.newValue ? JSON.parse(e.newValue) : null;

        // If the token changed, another login occurred
        if (currentSession && newSession && currentSession.token !== newSession.token) {
          // Current session is no longer valid
          console.log('Session invalidated by another login');
          window.location.reload();
        }
      }

      // If someone logged out in another tab
      if (e.key === CURRENT_USER_KEY && !e.newValue && e.oldValue) {
        window.location.reload();
      }
    };

    window.addEventListener('storage', this.storageListenerCallback);
    this.storageListenerSetup = true;
  }

  static removeStorageListener() {
    if (this.storageListenerCallback) {
      window.removeEventListener('storage', this.storageListenerCallback);
      this.storageListenerSetup = false;
      this.storageListenerCallback = null;
    }
  }

  static updateProfileImage(userId: string, profileImage: string | null): void {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex !== -1) {
      users[userIndex].profileImage = profileImage || undefined;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      // Update current user if it's the same user
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        currentUser.profileImage = profileImage || undefined;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      }
    }
  }

  // User Management (Admin only)
  static createUser(username: string, password: string, displayName: string, role: UserRole, email?: string): { success: boolean; error?: string; user?: User } {
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

    // Validate email if provided
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return { success: false, error: 'Invalid email address' };
      }
    }

    const users = this.getUsers();

    // Check if username already exists (case-insensitive)
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, error: 'Username already exists' };
    }

    // Generate new user ID
    const maxId = users.reduce((max, u) => {
      const idNum = parseInt(u.id.replace('user-', ''));
      return idNum > max ? idNum : max;
    }, 0);

    const newUser: User = {
      id: `user-${maxId + 1}`,
      username: username.trim(),
      password: password,
      role: role,
      displayName: displayName.trim(),
      email: email?.trim() || undefined,
      subscriptionTier: 'free' // Default to free tier
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    return { success: true, user: newUser };
  }

  static updateUser(userId: string, updates: Partial<Omit<User, 'id'>>): { success: boolean; error?: string } {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return { success: false, error: 'User not found' };
    }

    // If updating username, check for duplicates
    if (updates.username) {
      if (updates.username.trim().length < 3) {
        return { success: false, error: 'Username must be at least 3 characters long' };
      }

      const duplicate = users.find(u =>
        u.id !== userId &&
        u.username.toLowerCase() === updates.username!.toLowerCase()
      );

      if (duplicate) {
        return { success: false, error: 'Username already exists' };
      }
    }

    // Validate password if being updated
    if (updates.password && updates.password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long' };
    }

    // Validate display name if being updated
    if (updates.displayName && updates.displayName.trim().length < 2) {
      return { success: false, error: 'Display name must be at least 2 characters long' };
    }

    // Validate email if being updated
    if (updates.email !== undefined) {
      if (updates.email && updates.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updates.email.trim())) {
          return { success: false, error: 'Invalid email address' };
        }
      }
    }

    // Apply updates
    users[userIndex] = { ...users[userIndex], ...updates };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // Update current user if it's the same user
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      const updatedUser = users[userIndex];
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    }

    return { success: true };
  }

  static deleteUser(userId: string): { success: boolean; error?: string } {
    const users = this.getUsers();

    // Prevent deleting the last management user
    const managementUsers = users.filter(u => u.role === 'management');
    const userToDelete = users.find(u => u.id === userId);

    if (userToDelete?.role === 'management' && managementUsers.length === 1) {
      return { success: false, error: 'Cannot delete the last management user' };
    }

    // Prevent users from deleting themselves
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      return { success: false, error: 'Cannot delete your own account. Please use another admin account.' };
    }

    const filteredUsers = users.filter(u => u.id !== userId);

    if (filteredUsers.length === users.length) {
      return { success: false, error: 'User not found' };
    }

    localStorage.setItem(USERS_KEY, JSON.stringify(filteredUsers));

    // Clean up user's data
    // Note: You may want to also clean up their figures and settings
    localStorage.removeItem(`action-figures-${userId}`);
    localStorage.removeItem(`app-settings-user-${userId}`);

    return { success: true };
  }

  static getAllUsers(): User[] {
    return this.getUsers();
  }
}

// Initialize on module load
AuthService.initialize();

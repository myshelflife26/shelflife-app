import type { ActionFigure } from '../types/index';
import { AuthService } from './auth';

const STORAGE_KEY_PREFIX = 'action-figures';
const OLD_STORAGE_KEY = 'action-figures';

export class Storage {
  private static getUserStorageKey(userId?: string): string {
    const id = userId || AuthService.getCurrentUser()?.id || 'default';
    return `${STORAGE_KEY_PREFIX}-${id}`;
  }

  // Migrate old data to user-scoped storage (for ackpack34 - the management account)
  static migrateOldData() {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser || currentUser.id !== 'user-1') {
        // Only migrate for the management account (ackpack34)
        return;
      }

      const newKey = this.getUserStorageKey('user-1');
      const existingNewData = localStorage.getItem(newKey);

      // If new location already has data, migration is complete
      if (existingNewData) {
        try {
          const parsed = JSON.parse(existingNewData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Migration already done, clean up old key to free space
            localStorage.removeItem(OLD_STORAGE_KEY);
            return;
          }
        } catch (e) {
          // Invalid data, proceed with migration
        }
      }

      const oldData = localStorage.getItem(OLD_STORAGE_KEY);
      if (!oldData) {
        // No old data to migrate
        return;
      }

      // Move data (not copy) to save space
      localStorage.setItem(newKey, oldData);
      localStorage.removeItem(OLD_STORAGE_KEY);
      console.log('Migrated old data to user-scoped storage');

    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded. Cannot migrate data. Consider removing old images or exporting data.');
        alert('Storage limit reached! Your collection has too much data (likely large images). Please export your data and consider reducing image sizes or removing some figures.');
      } else {
        console.error('Error migrating old data:', error);
      }
    }
  }

  static getAll(userId?: string): ActionFigure[] {
    try {
      const data = localStorage.getItem(this.getUserStorageKey(userId));
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading from storage:', error);
      return [];
    }
  }

  static save(figure: ActionFigure, userId?: string): ActionFigure {
    const figures = this.getAll(userId);
    const index = figures.findIndex(f => f.id === figure.id);

    if (index !== -1) {
      figures[index] = figure;
    } else {
      figures.push(figure);
    }

    this.saveAll(figures, userId);
    return figure;
  }

  static add(figure: Omit<ActionFigure, 'id'>, userId?: string): ActionFigure {
    const figures = this.getAll(userId);
    const currentUserId = userId || AuthService.getCurrentUser()?.id;
    const newFigure: ActionFigure = {
      ...figure,
      id: crypto.randomUUID(),
      userId: currentUserId, // Set owner
      isPublic: figure.isPublic ?? false, // Default to private
    };
    figures.push(newFigure);
    this.saveAll(figures, userId);
    return newFigure;
  }

  static addWithId(figure: ActionFigure, userId?: string): ActionFigure {
    const figures = this.getAll(userId);
    figures.push(figure);
    this.saveAll(figures, userId);
    return figure;
  }

  static update(id: string, figure: Omit<ActionFigure, 'id'>, userId?: string): void {
    const figures = this.getAll(userId);
    const index = figures.findIndex(f => f.id === id);
    if (index !== -1) {
      const currentUserId = userId || AuthService.getCurrentUser()?.id;
      figures[index] = {
        ...figure,
        id,
        userId: figure.userId || currentUserId, // Preserve or set owner
        isPublic: figure.isPublic ?? false, // Ensure isPublic has a value
      };
      this.saveAll(figures, userId);
    }
  }

  static delete(id: string, userId?: string): void {
    const figures = this.getAll(userId).filter(f => f.id !== id);
    this.saveAll(figures, userId);
  }

  static deleteMany(ids: string[], userId?: string): void {
    const idsSet = new Set(ids);
    const figures = this.getAll(userId).filter(f => !idsSet.has(f.id));
    this.saveAll(figures, userId);
  }

  // Bulk update privacy settings
  static setPublicMany(ids: string[], isPublic: boolean, userId?: string): void {
    const idsSet = new Set(ids);
    const figures = this.getAll(userId);

    figures.forEach(figure => {
      if (idsSet.has(figure.id)) {
        figure.isPublic = isPublic;
      }
    });

    this.saveAll(figures, userId);
  }

  static exportJSON(userId?: string): string {
    const figures = this.getAll(userId);
    return JSON.stringify(figures, null, 2);
  }

  static exportCSV(userId?: string): string {
    const figures = this.getAll(userId);
    if (figures.length === 0) return '';

    const headers = [
      'ID', 'Name', 'Series', 'Manufacturer', 'Category',
      'Condition', 'Current Value', 'Purchase Date', 'Location', 'Notes'
    ];

    const rows = figures.map(f => [
      f.id,
      f.name,
      f.series,
      f.manufacturer,
      f.category,
      f.condition,
      f.currentValue.toString(),
      f.purchaseDate,
      f.location,
      f.notes
    ]);

    const escapeCsvValue = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvRows = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCsvValue).join(','))
    ];

    return csvRows.join('\n');
  }

  static importJSON(jsonString: string, userId?: string): number {
    try {
      const figures = JSON.parse(jsonString);
      if (Array.isArray(figures)) {
        // When importing, add to existing rather than replace
        const existing = this.getAll(userId);
        this.saveAll([...existing, ...figures], userId);
        return figures.length;
      } else {
        throw new Error('Invalid JSON format');
      }
    } catch (error) {
      throw new Error('Failed to import JSON: ' + (error as Error).message);
    }
  }

  private static saveAll(figures: ActionFigure[], userId?: string): void {
    try {
      localStorage.setItem(this.getUserStorageKey(userId), JSON.stringify(figures));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded:', error);
        alert(
          'Storage limit exceeded! Your collection is too large (likely due to high-resolution images).\n\n' +
          'Solutions:\n' +
          '1. Export your data as backup\n' +
          '2. Remove some images or figures\n' +
          '3. Use smaller/compressed images (< 2MB each)\n' +
          '4. Consider reducing image count per figure'
        );
        throw error;
      } else {
        console.error('Error saving to storage:', error);
        throw error;
      }
    }
  }

  // Admin-only: Get all figures from all users
  static getAllUsersFigures(): Array<{ userId: string; username: string; displayName: string; figures: ActionFigure[] }> {
    const usersKey = 'action-figure-tracker-users';
    const usersData = localStorage.getItem(usersKey);
    if (!usersData) return [];

    try {
      const users = JSON.parse(usersData);
      return users.map((user: any) => ({
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        figures: this.getAll(user.id)
      }));
    } catch (error) {
      console.error('Error loading all users figures:', error);
      return [];
    }
  }

  // Admin-only: Delete figure from specific user
  static deleteFromUser(figureId: string, userId: string): void {
    const figures = this.getAll(userId);
    const filtered = figures.filter(f => f.id !== figureId);
    this.saveAll(filtered, userId);
  }

  // Admin-only: Get figure count for each user
  static getUserFigureCounts(): Array<{ userId: string; username: string; displayName: string; count: number }> {
    const usersKey = 'action-figure-tracker-users';
    const usersData = localStorage.getItem(usersKey);
    if (!usersData) return [];

    try {
      const users = JSON.parse(usersData);
      return users.map((user: any) => ({
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        count: this.getAll(user.id).length
      }));
    } catch (error) {
      console.error('Error loading user figure counts:', error);
      return [];
    }
  }

  // Get all public figures from all users
  static getAllPublicFigures(): Array<ActionFigure & { ownerName: string; ownerUsername: string }> {
    const usersKey = 'action-figure-tracker-users';
    const usersData = localStorage.getItem(usersKey);
    if (!usersData) return [];

    try {
      // Get current user for blocking checks
      const currentUserData = localStorage.getItem('action-figure-tracker-current-user');
      const currentUserId = currentUserData ? JSON.parse(currentUserData).id : null;

      const users = JSON.parse(usersData);
      const publicFigures: Array<ActionFigure & { ownerName: string; ownerUsername: string }> = [];

      users.forEach((user: any) => {
        // Skip if this user is blocked by current user or if current user is blocked by this user
        if (currentUserId) {
          // Import blocking check inline to avoid circular dependency
          const blockedUsersKey = `blocked-users-${currentUserId}`;
          const blockedByCurrentUser = localStorage.getItem(blockedUsersKey);
          const blockedList = blockedByCurrentUser ? JSON.parse(blockedByCurrentUser) : [];

          if (blockedList.includes(user.id)) {
            return; // Skip this user's figures
          }

          // Check if current user is blocked by this user
          const blockedByThisUserKey = `blocked-users-${user.id}`;
          const blockedByThisUser = localStorage.getItem(blockedByThisUserKey);
          const theirBlockedList = blockedByThisUser ? JSON.parse(blockedByThisUser) : [];

          if (theirBlockedList.includes(currentUserId)) {
            return; // Skip this user's figures
          }
        }

        // Check if user's collection is public or if individual figures are public
        const figures = this.getAll(user.id);
        const userCollectionPublic = user.collectionPublic === true;

        figures.forEach((figure: ActionFigure) => {
          // Figure is visible if:
          // 1. User's entire collection is public, OR
          // 2. This specific figure is marked as public
          const isVisible = userCollectionPublic || figure.isPublic === true;

          if (isVisible) {
            publicFigures.push({
              ...figure,
              userId: user.id, // Ensure userId is set
              ownerName: user.displayName,
              ownerUsername: user.username
            });
          }
        });
      });

      return publicFigures;
    } catch (error) {
      console.error('Error loading public figures:', error);
      return [];
    }
  }

  // Get users with public collections
  static getPublicCollectionUsers(): Array<{ userId: string; username: string; displayName: string; count: number; profileImage?: string }> {
    const usersKey = 'action-figure-tracker-users';
    const usersData = localStorage.getItem(usersKey);
    if (!usersData) return [];

    try {
      // Get current user for blocking checks
      const currentUserData = localStorage.getItem('action-figure-tracker-current-user');
      const currentUserId = currentUserData ? JSON.parse(currentUserData).id : null;

      const users = JSON.parse(usersData);
      const publicUsers = users
        .filter((user: any) => {
          if (user.collectionPublic !== true) return false;

          // Filter out blocked users
          if (currentUserId) {
            const blockedUsersKey = `blocked-users-${currentUserId}`;
            const blockedByCurrentUser = localStorage.getItem(blockedUsersKey);
            const blockedList = blockedByCurrentUser ? JSON.parse(blockedByCurrentUser) : [];

            if (blockedList.includes(user.id)) {
              return false; // Skip blocked user
            }

            // Check if current user is blocked by this user
            const blockedByThisUserKey = `blocked-users-${user.id}`;
            const blockedByThisUser = localStorage.getItem(blockedByThisUserKey);
            const theirBlockedList = blockedByThisUser ? JSON.parse(blockedByThisUser) : [];

            if (theirBlockedList.includes(currentUserId)) {
              return false; // Skip if blocked by this user
            }
          }

          return true;
        })
        .map((user: any) => {
          const figures = this.getAll(user.id);
          return {
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            count: figures.length,
            profileImage: user.profileImage
          };
        });

      return publicUsers;
    } catch (error) {
      console.error('Error loading public collection users:', error);
      return [];
    }
  }

  // Get public figures for a specific user
  static getPublicFiguresForUser(userId: string): ActionFigure[] {
    const usersKey = 'action-figure-tracker-users';
    const usersData = localStorage.getItem(usersKey);
    if (!usersData) return [];

    try {
      const users = JSON.parse(usersData);
      const user = users.find((u: any) => u.id === userId);

      if (!user) return [];

      const figures = this.getAll(userId);
      const userCollectionPublic = user.collectionPublic === true;

      // Return figures that are visible (collection public OR individual figure public)
      return figures.filter((figure: ActionFigure) =>
        userCollectionPublic || figure.isPublic === true
      );
    } catch (error) {
      console.error('Error loading user public figures:', error);
      return [];
    }
  }
}

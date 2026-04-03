import { AdmirersService } from './admirers';

const STORAGE_KEY = 'blocked-users';

interface BlockedUser {
  userId: string;
  blockedAt: number;
  reason?: string;
}

export class BlockingService {
  // Get blocked user data for current user
  private static getBlockedUsers(userId: string): BlockedUser[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY}-${userId}`);
      if (!data) return [];

      const parsed = JSON.parse(data);

      // Migration: Convert old string array format to new object format
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        const migrated = parsed.map((id: string) => ({
          userId: id,
          blockedAt: Date.now() // Set current time for migrated data
        }));
        this.saveBlockedUsers(userId, migrated);
        return migrated;
      }

      return parsed;
    } catch (error) {
      console.error('Error loading blocked users:', error);
      return [];
    }
  }

  // Save blocked user data for current user
  private static saveBlockedUsers(userId: string, blockedUsers: BlockedUser[]): void {
    try {
      localStorage.setItem(`${STORAGE_KEY}-${userId}`, JSON.stringify(blockedUsers));
    } catch (error) {
      console.error('Error saving blocked users:', error);
    }
  }

  // Block a user
  static blockUser(currentUserId: string, userIdToBlock: string, reason?: string): boolean {
    if (!currentUserId || !userIdToBlock) return false;
    if (currentUserId === userIdToBlock) return false; // Can't block yourself

    const blockedUsers = this.getBlockedUsers(currentUserId);

    if (blockedUsers.some(bu => bu.userId === userIdToBlock)) {
      return false; // Already blocked
    }

    blockedUsers.push({
      userId: userIdToBlock,
      blockedAt: Date.now(),
      reason: reason || undefined
    });
    this.saveBlockedUsers(currentUserId, blockedUsers);

    // Remove admirer relationships in both directions
    // If current user is admiring the blocked user, stop admiring
    AdmirersService.stopAdmiring(currentUserId, userIdToBlock);

    // If blocked user is admiring current user, remove them as admirer
    AdmirersService.removeAdmirer(currentUserId, userIdToBlock);

    return true;
  }

  // Unblock a user
  static unblockUser(currentUserId: string, userIdToUnblock: string): boolean {
    if (!currentUserId || !userIdToUnblock) return false;

    const blockedUsers = this.getBlockedUsers(currentUserId);
    const filtered = blockedUsers.filter(bu => bu.userId !== userIdToUnblock);

    if (filtered.length === blockedUsers.length) {
      return false; // User wasn't blocked
    }

    this.saveBlockedUsers(currentUserId, filtered);
    return true;
  }

  // Check if a user is blocked by current user
  static isUserBlocked(currentUserId: string, userIdToCheck: string): boolean {
    if (!currentUserId || !userIdToCheck) return false;

    const blockedUsers = this.getBlockedUsers(currentUserId);
    return blockedUsers.some(bu => bu.userId === userIdToCheck);
  }

  // Check if current user is blocked by another user
  static isBlockedBy(currentUserId: string, otherUserId: string): boolean {
    if (!currentUserId || !otherUserId) return false;

    const theirBlockedUsers = this.getBlockedUsers(otherUserId);
    return theirBlockedUsers.includes(currentUserId);
  }

  // Check if two users have blocked each other (either direction)
  static areUsersBlocked(userId1: string, userId2: string): boolean {
    return this.isUserBlocked(userId1, userId2) || this.isUserBlocked(userId2, userId1);
  }

  // Get list of blocked user IDs
  static getBlockedUserIds(currentUserId: string): string[] {
    return this.getBlockedUsers(currentUserId).map(bu => bu.userId);
  }

  // Get blocked users with full data (userId + timestamp)
  static getBlockedUsersWithData(currentUserId: string): BlockedUser[] {
    return this.getBlockedUsers(currentUserId);
  }

  // Get timestamp when a user was blocked
  static getBlockedTimestamp(currentUserId: string, blockedUserId: string): number | null {
    const blockedUsers = this.getBlockedUsers(currentUserId);
    const found = blockedUsers.find(bu => bu.userId === blockedUserId);
    return found ? found.blockedAt : null;
  }

  // Get count of blocked users
  static getBlockedCount(currentUserId: string): number {
    return this.getBlockedUsers(currentUserId).length;
  }

  // Clear all blocked users (for testing)
  static clearBlockedUsers(userId: string): void {
    localStorage.removeItem(`${STORAGE_KEY}-${userId}`);
  }
}

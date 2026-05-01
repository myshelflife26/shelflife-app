/**
 * Bookmarks Service
 * Manages figure bookmarks for users without accounts using localStorage
 * Optionally syncs to Firebase when user logs in
 */

const BOOKMARKS_STORAGE_KEY = 'myshelflife-bookmarks';

export interface Bookmark {
  figureId: string;
  bookmarkedAt: number;
  figureName?: string; // Optional: for display without fetching figure
  imageUrl?: string; // Optional: for preview
}

export class BookmarksService {
  /**
   * Get all bookmarks for current session
   */
  static getBookmarks(): Bookmark[] {
    try {
      const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      return [];
    }
  }

  /**
   * Check if a figure is bookmarked
   */
  static isBookmarked(figureId: string): boolean {
    const bookmarks = this.getBookmarks();
    return bookmarks.some(b => b.figureId === figureId);
  }

  /**
   * Add a bookmark
   */
  static addBookmark(figureId: string, figureName?: string, imageUrl?: string): void {
    try {
      const bookmarks = this.getBookmarks();

      // Don't add duplicate
      if (bookmarks.some(b => b.figureId === figureId)) {
        return;
      }

      bookmarks.push({
        figureId,
        bookmarkedAt: Date.now(),
        figureName,
        imageUrl,
      });

      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      throw error;
    }
  }

  /**
   * Remove a bookmark
   */
  static removeBookmark(figureId: string): void {
    try {
      const bookmarks = this.getBookmarks();
      const filtered = bookmarks.filter(b => b.figureId !== figureId);
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      throw error;
    }
  }

  /**
   * Toggle bookmark (add if not bookmarked, remove if bookmarked)
   */
  static toggleBookmark(figureId: string, figureName?: string, imageUrl?: string): boolean {
    const isCurrentlyBookmarked = this.isBookmarked(figureId);

    if (isCurrentlyBookmarked) {
      this.removeBookmark(figureId);
      return false;
    } else {
      this.addBookmark(figureId, figureName, imageUrl);
      return true;
    }
  }

  /**
   * Get bookmark count
   */
  static getBookmarkCount(): number {
    return this.getBookmarks().length;
  }

  /**
   * Clear all bookmarks
   */
  static clearBookmarks(): void {
    localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
  }

  /**
   * Get bookmarked figure IDs
   */
  static getBookmarkedFigureIds(): string[] {
    return this.getBookmarks().map(b => b.figureId);
  }

  /**
   * Sync localStorage bookmarks to Firebase (called after login)
   * This would integrate with your existing favorites/bookmarks system
   */
  static async syncToFirebase(userId: string): Promise<void> {
    // TODO: Implement Firebase sync when user logs in
    // This would merge localStorage bookmarks with user's Firebase bookmarks
    // For now, this is a placeholder for future implementation
    console.log('Bookmark sync to Firebase for user:', userId);
  }
}

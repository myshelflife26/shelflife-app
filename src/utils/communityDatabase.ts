// Community Figure Database
// Users contribute figure data, making searches faster over time

export interface CommunityFigure {
  id: string;
  name: string;
  manufacturer: string;
  franchise?: string; // Franchise/IP (e.g., G.I. Joe, Marvel, Star Wars)
  year: string;
  productLine?: string;
  subProductLine?: string;
  category?: string;
  images: string[];
  averageValue?: number;
  contributorId: string;
  contributorName: string;
  verified: boolean; // Approved by moderator
  timesUsed: number; // How many users imported this
  createdAt: number;
  updatedAt: number;
}

const COMMUNITY_DB_KEY = 'app-community-figures';

export class CommunityDatabaseService {
  /**
   * Search community database
   * Returns most popular (most used) results first
   */
  static search(query: string): CommunityFigure[] {
    const db = this.getAll();
    const lowerQuery = query.toLowerCase();

    return db
      .filter(
        (fig) =>
          fig.name.toLowerCase().includes(lowerQuery) ||
          fig.manufacturer.toLowerCase().includes(lowerQuery) ||
          fig.franchise?.toLowerCase().includes(lowerQuery) ||
          fig.productLine?.toLowerCase().includes(lowerQuery) ||
          fig.subProductLine?.toLowerCase().includes(lowerQuery) ||
          fig.year.includes(lowerQuery)
      )
      .sort((a, b) => {
        // Sort by: verified first, then by times used, then by date
        if (a.verified !== b.verified) return a.verified ? -1 : 1;
        if (a.timesUsed !== b.timesUsed) return b.timesUsed - a.timesUsed;
        return b.createdAt - a.createdAt;
      });
  }

  /**
   * Add a new figure to community database
   * Called when user imports from eBay
   */
  static add(figure: Omit<CommunityFigure, 'id' | 'timesUsed' | 'createdAt' | 'updatedAt'>): CommunityFigure {
    const db = this.getAll();

    // Check if similar figure already exists
    const existing = this.findSimilar(figure.name, figure.manufacturer, figure.year);
    if (existing) {
      // Increment usage instead of creating duplicate
      this.incrementUsage(existing.id);
      return existing;
    }

    const newFigure: CommunityFigure = {
      ...figure,
      id: crypto.randomUUID(),
      timesUsed: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.push(newFigure);
    this.saveAll(db);
    return newFigure;
  }

  /**
   * Find similar figure to avoid duplicates
   */
  private static findSimilar(
    name: string,
    manufacturer: string,
    year: string
  ): CommunityFigure | null {
    const db = this.getAll();
    const nameLower = name.toLowerCase();

    return (
      db.find((fig) => {
        const figNameLower = fig.name.toLowerCase();
        // Check if names are very similar and year/manufacturer match
        return (
          this.stringSimilarity(nameLower, figNameLower) > 0.8 &&
          fig.manufacturer === manufacturer &&
          fig.year === year
        );
      }) || null
    );
  }

  /**
   * Simple string similarity check (Dice coefficient)
   */
  private static stringSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    return (2 * intersection.size) / (set1.size + set2.size);
  }

  /**
   * Increment usage count when someone imports this figure
   */
  static incrementUsage(figureId: string): void {
    const db = this.getAll();
    const figure = db.find((f) => f.id === figureId);
    if (figure) {
      figure.timesUsed++;
      figure.updatedAt = Date.now();
      this.saveAll(db);
    }
  }

  /**
   * Update a figure's data
   * Users can suggest corrections
   */
  static update(
    figureId: string,
    updates: Partial<Omit<CommunityFigure, 'id' | 'timesUsed' | 'createdAt'>>
  ): boolean {
    const db = this.getAll();
    const index = db.findIndex((f) => f.id === figureId);

    if (index === -1) return false;

    db[index] = {
      ...db[index],
      ...updates,
      updatedAt: Date.now(),
    };

    this.saveAll(db);
    return true;
  }

  /**
   * Verify a figure (moderator action)
   * Pro/Curator tier users or admins can verify
   */
  static verify(figureId: string): boolean {
    return this.update(figureId, { verified: true });
  }

  /**
   * Get a specific figure by ID
   */
  static getById(figureId: string): CommunityFigure | null {
    const db = this.getAll();
    return db.find((f) => f.id === figureId) || null;
  }

  /**
   * Get all figures
   */
  private static getAll(): CommunityFigure[] {
    try {
      const data = localStorage.getItem(COMMUNITY_DB_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading community database:', error);
      return [];
    }
  }

  /**
   * Save all figures
   */
  private static saveAll(figures: CommunityFigure[]): void {
    try {
      localStorage.setItem(COMMUNITY_DB_KEY, JSON.stringify(figures));
    } catch (error) {
      console.error('Error saving community database:', error);
    }
  }

  /**
   * Get statistics about the database
   */
  static getStats(): {
    total: number;
    verified: number;
    contributors: number;
    mostPopular: CommunityFigure[];
  } {
    const db = this.getAll();
    const contributors = new Set(db.map((f) => f.contributorId));

    return {
      total: db.length,
      verified: db.filter((f) => f.verified).length,
      contributors: contributors.size,
      mostPopular: db.sort((a, b) => b.timesUsed - a.timesUsed).slice(0, 10),
    };
  }

  /**
   * Get figures contributed by a specific user
   */
  static getByContributor(userId: string): CommunityFigure[] {
    const db = this.getAll();
    return db.filter((f) => f.contributorId === userId);
  }

  /**
   * Delete a figure (admin only)
   */
  static delete(figureId: string): boolean {
    const db = this.getAll();
    const filtered = db.filter((f) => f.id !== figureId);

    if (filtered.length === db.length) return false;

    this.saveAll(filtered);
    return true;
  }

  /**
   * Clear all data (use with caution!)
   */
  static clearAll(): void {
    localStorage.removeItem(COMMUNITY_DB_KEY);
  }
}

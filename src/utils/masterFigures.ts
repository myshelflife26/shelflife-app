import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ActionFigure } from '../types/index';

const MASTER_FIGURES_COLLECTION = 'masterFigures';

// Default placeholder image for figures without images
export const DEFAULT_FIGURE_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzNCODJGNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';

export type FigureSource = 'user' | 'import' | 'admin';

export interface MasterFigure {
  id: string;
  name: string;
  version?: string;
  year?: number;
  series?: string; // Legacy field - use productLine/subProductLine instead
  manufacturer: string;
  category: string;
  size?: string;
  productLine?: string; // Primary field
  subProductLine?: string; // Primary field
  packaging?: string;
  upc?: string; // UPC/EAN barcode
  imageUrl?: string;
  notes?: string;
  accessories?: import('../types/index').Accessory[]; // What accessories should come with this figure
  createdAt: number;
  createdBy: string;
  createdByName?: string;
  source: FigureSource; // Track how this figure was added
  sourceName?: string; // Human-readable source (e.g., "YoJoe.com", "Hasbro Pulse")
  sourceUrl?: string; // URL to original figure page
}

export class MasterFiguresService {
  /**
   * Remove undefined values from object (Firebase doesn't allow undefined)
   */
  private static cleanObject(obj: any): any {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  }

  /**
   * Add a master figure to the database
   */
  static async add(figure: Omit<MasterFigure, 'id' | 'createdAt'>, userId: string, userName?: string): Promise<MasterFigure | null> {
    try {
      const masterFigure = this.cleanObject({
        ...figure,
        imageUrl: figure.imageUrl || DEFAULT_FIGURE_IMAGE,
        createdAt: Date.now(),
        createdBy: userId,
        createdByName: userName
      });

      const docRef = await addDoc(collection(db, MASTER_FIGURES_COLLECTION), masterFigure);

      return {
        id: docRef.id,
        ...masterFigure
      };
    } catch (error) {
      console.error('Failed to add master figure:', error);
      return null;
    }
  }

  /**
   * Add a figure from user's collection to master database (if it doesn't exist)
   */
  static async addFromUserFigure(
    figure: { name: string; version?: string; year?: number; series?: string; productLine?: string; subProductLine?: string; manufacturer: string; category: string; size?: string; packaging?: string; imageUrl?: string },
    userId: string,
    userName: string,
    source: FigureSource
  ): Promise<MasterFigure | null> {
    try {
      // Check if figure already exists (by name, manufacturer, productLine, subProductLine, and version)
      const existing = await this.findDuplicate(figure.name, figure.manufacturer, figure.productLine, figure.subProductLine, figure.version);
      if (existing) {
        console.log('Figure already exists in master database');
        return existing;
      }

      // Add the figure
      return await this.add(
        {
          name: figure.name,
          version: figure.version,
          year: figure.year,
          series: figure.series, // Legacy field
          productLine: figure.productLine,
          subProductLine: figure.subProductLine,
          manufacturer: figure.manufacturer,
          category: figure.category,
          size: figure.size,
          packaging: figure.packaging,
          imageUrl: figure.imageUrl,
          createdBy: userId,
          createdByName: userName,
          source
        },
        userId,
        userName
      );
    } catch (error) {
      console.error('Failed to add figure from user collection:', error);
      return null;
    }
  }

  /**
   * Find duplicate figure
   */
  static async findDuplicate(name: string, manufacturer: string, productLine?: string, subProductLine?: string, version?: string): Promise<MasterFigure | null> {
    try {
      const allFigures = await this.getAll();
      return allFigures.find(f =>
        f.name.toLowerCase() === name.toLowerCase() &&
        f.manufacturer.toLowerCase() === manufacturer.toLowerCase() &&
        (f.productLine || '').toLowerCase() === (productLine || '').toLowerCase() &&
        (f.subProductLine || '').toLowerCase() === (subProductLine || '').toLowerCase() &&
        (f.version || '').toLowerCase() === (version || '').toLowerCase()
      ) || null;
    } catch (error) {
      console.error('Failed to find duplicate:', error);
      return null;
    }
  }

  /**
   * Migrate existing user figures to master database
   */
  static async migrateUserFigures(userId: string, userName: string, figures: any[]): Promise<number> {
    try {
      let successCount = 0;

      for (const figure of figures) {
        const result = await this.addFromUserFigure(
          {
            name: figure.name,
            version: figure.version,
            year: figure.year,
            series: figure.series,
            productLine: figure.productLine,
            subProductLine: figure.subProductLine,
            manufacturer: figure.manufacturer,
            category: figure.category,
            size: figure.size,
            packaging: figure.packaging,
            imageUrl: figure.images?.[figure.mainImageIndex || 0]
          },
          userId,
          userName,
          'user'
        );
        if (result) {
          successCount++;
        }
      }

      return successCount;
    } catch (error) {
      console.error('Failed to migrate user figures:', error);
      return 0;
    }
  }

  /**
   * Get all master figures
   */
  static async getAll(): Promise<MasterFigure[]> {
    try {
      const q = query(
        collection(db, MASTER_FIGURES_COLLECTION),
        orderBy('name', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MasterFigure));
    } catch (error) {
      console.error('Failed to get master figures:', error);
      return [];
    }
  }

  /**
   * Get a single master figure by ID
   */
  static async getById(id: string): Promise<MasterFigure | null> {
    try {
      const figureDoc = await getDoc(doc(db, MASTER_FIGURES_COLLECTION, id));

      if (!figureDoc.exists()) {
        return null;
      }

      return {
        id: figureDoc.id,
        ...figureDoc.data()
      } as MasterFigure;
    } catch (error) {
      console.error('Failed to get master figure:', error);
      return null;
    }
  }

  /**
   * Update a master figure
   */
  static async update(id: string, updates: Partial<MasterFigure>): Promise<boolean> {
    try {
      const figureRef = doc(db, MASTER_FIGURES_COLLECTION, id);
      await updateDoc(figureRef, updates);
      return true;
    } catch (error) {
      console.error('Failed to update master figure:', error);
      return false;
    }
  }

  /**
   * Update a master figure (alias for update)
   */
  static async updateFigure(id: string, updates: Partial<MasterFigure>): Promise<boolean> {
    return this.update(id, updates);
  }

  /**
   * Delete a master figure
   */
  static async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, MASTER_FIGURES_COLLECTION, id));
      return true;
    } catch (error) {
      console.error('Failed to delete master figure:', error);
      return false;
    }
  }

  /**
   * Delete a master figure (alias for delete)
   */
  static async deleteFigure(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Import multiple master figures
   */
  static async importMany(figures: any[], userId: string, userName: string, source: FigureSource): Promise<number> {
    try {
      let successCount = 0;

      for (const figure of figures) {
        const result = await this.add(
          {
            ...figure,
            createdBy: userId,
            createdByName: userName,
            source
          },
          userId,
          userName
        );
        if (result) {
          successCount++;
        }
      }

      return successCount;
    } catch (error) {
      console.error('Failed to import master figures:', error);
      return 0;
    }
  }

  /**
   * Search master figures by name
   */
  static async search(searchTerm: string): Promise<MasterFigure[]> {
    try {
      const allFigures = await this.getAll();
      const term = searchTerm.toLowerCase();

      return allFigures.filter(figure =>
        figure.name.toLowerCase().includes(term) ||
        figure.manufacturer.toLowerCase().includes(term) ||
        figure.series.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Failed to search master figures:', error);
      return [];
    }
  }

  /**
   * Find figure by UPC code
   */
  static async findByUPC(upc: string): Promise<MasterFigure | null> {
    try {
      const allFigures = await this.getAll();
      return allFigures.find(f => f.upc === upc) || null;
    } catch (error) {
      console.error('Failed to find figure by UPC:', error);
      return null;
    }
  }
}

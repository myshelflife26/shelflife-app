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
  franchise?: string; // Franchise/IP (e.g., "G.I. Joe", "Star Wars", "Masters of the Universe")
  series?: string; // Legacy field - use productLine/subProductLine instead
  manufacturer: string;
  category: string;
  size?: string;
  productLine?: string; // Primary field
  productLineNumber?: string; // Item number within product line (e.g., "#45", "1234")
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
      // Clean undefined values before updating (Firebase doesn't accept undefined)
      const cleanedUpdates = this.cleanObject(updates);
      await updateDoc(figureRef, cleanedUpdates);
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
      console.log('Total figures in database:', allFigures.length);
      const term = searchTerm.toLowerCase();

      const results = allFigures.filter(figure =>
        figure.name.toLowerCase().includes(term) ||
        (figure.manufacturer && figure.manufacturer.toLowerCase().includes(term)) ||
        (figure.series && figure.series.toLowerCase().includes(term)) ||
        (figure.productLine && figure.productLine.toLowerCase().includes(term)) ||
        (figure.subProductLine && figure.subProductLine.toLowerCase().includes(term))
      );

      console.log('Filtered figures matching', term, ':', results.length);
      return results;
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

  /**
   * Merge two master figures
   * @param keepFigureId - ID of figure to keep (usually older one)
   * @param deleteFigureId - ID of figure to delete (duplicate)
   * @param mergedData - Field-by-field selections for the merged figure
   * @param userUpdateStrategy - How to update user collections: 'soft' (only empty fields) or 'full' (all fields)
   * @returns Object with success status, count of updated user figures, count of notified users, and count of consolidated duplicates
   */
  static async mergeFigures(
    keepFigureId: string,
    deleteFigureId: string,
    mergedData: Partial<MasterFigure>,
    userUpdateStrategy: 'soft' | 'full' = 'soft'
  ): Promise<{ success: boolean; updatedUserFigures: number; notifiedUsers: number; consolidatedDuplicates: number; error?: string }> {
    try {
      // Get both figures to validate they exist
      const keepFigure = await this.getById(keepFigureId);
      const deleteFigure = await this.getById(deleteFigureId);

      if (!keepFigure || !deleteFigure) {
        return {
          success: false,
          updatedUserFigures: 0,
          notifiedUsers: 0,
          consolidatedDuplicates: 0,
          error: 'One or both figures not found'
        };
      }

      // Step 1: Update the figure we're keeping with merged data
      const updateSuccess = await this.update(keepFigureId, this.cleanObject(mergedData));
      if (!updateSuccess) {
        return {
          success: false,
          updatedUserFigures: 0,
          notifiedUsers: 0,
          consolidatedDuplicates: 0,
          error: 'Failed to update keep figure'
        };
      }

      // Step 2: Find and update user figures that reference the deleted figure
      // Since user figures don't have masterFigureId, we match by data fields
      let updatedCount = 0;
      const affectedUsers = new Set<string>(); // Track unique user IDs

      try {
        const figuresCollection = collection(db, 'figures');
        const allUserFigures = await getDocs(figuresCollection);

        for (const docSnapshot of allUserFigures.docs) {
          const userFig = docSnapshot.data();

          // Check if this user figure matches the figure being deleted
          const nameMatch = userFig.name?.toLowerCase() === deleteFigure.name?.toLowerCase();
          const mfgMatch = userFig.manufacturer?.toLowerCase() === deleteFigure.manufacturer?.toLowerCase();
          const yearMatch = !userFig.year || userFig.year === deleteFigure.year;
          const versionMatch = !userFig.version || userFig.version === deleteFigure.version;

          if (nameMatch && mfgMatch && yearMatch && versionMatch) {
            // Build update object based on strategy
            const updates: any = {
              'metadata.mergedFromMasterFigure': deleteFigureId,
              'metadata.mergedToMasterFigure': keepFigureId,
              'metadata.mergedAt': Date.now()
            };

            // Fields that should NEVER be updated (user-specific data)
            const preservedFields = [
              'userId', 'createdAt', 'updatedAt', 'id',
              'condition', 'location', 'purchasePrice', 'currentValue',
              'purchaseDate', 'notes', 'tags', 'images', 'mainImageIndex',
              'isWishlist', 'accessories', 'metadata'
            ];

            // Apply update strategy
            if (userUpdateStrategy === 'full') {
              // Full update: Copy all non-preserved fields from merged data
              for (const key in mergedData) {
                if (!preservedFields.includes(key)) {
                  updates[key] = (mergedData as any)[key];
                }
              }
            } else {
              // Soft update: Only update empty fields
              for (const key in mergedData) {
                if (!preservedFields.includes(key)) {
                  const userValue = (userFig as any)[key];
                  const isEmpty = userValue === undefined || userValue === null || userValue === '';
                  if (isEmpty) {
                    updates[key] = (mergedData as any)[key];
                  }
                }
              }
            }

            // Apply the update
            await updateDoc(docSnapshot.ref, this.cleanObject(updates));
            updatedCount++;

            // Track the user for notifications
            if (userFig.userId) {
              affectedUsers.add(userFig.userId);
            }
          }
        }
      } catch (error) {
        console.error('Error updating user figures:', error);
        // Continue with deletion even if user figure updates fail
      }

      // Step 2.5: Detect and merge duplicate user figures
      // After updating user figures to point to the merged master, check if any user now has duplicates
      let consolidatedCount = 0;
      try {
        for (const userId of affectedUsers) {
          // Get all figures for this user
          const userFiguresQuery = query(
            collection(db, 'figures'),
            where('userId', '==', userId)
          );
          const userFiguresSnapshot = await getDocs(userFiguresQuery);
          const userFigures = userFiguresSnapshot.docs.map(doc => ({
            id: doc.id,
            ref: doc.ref,
            ...doc.data()
          }));

          // Group figures by name+manufacturer+year+version to find duplicates
          const figureGroups = new Map<string, any[]>();
          for (const fig of userFigures) {
            const key = `${fig.name?.toLowerCase()}-${fig.manufacturer?.toLowerCase()}-${fig.year || 'null'}-${fig.version?.toLowerCase() || 'null'}`;
            if (!figureGroups.has(key)) {
              figureGroups.set(key, []);
            }
            figureGroups.get(key)!.push(fig);
          }

          // For each group with duplicates, keep one and delete the rest
          for (const [key, duplicates] of figureGroups.entries()) {
            if (duplicates.length > 1) {
              // Sort by completeness (most fields populated), then by oldest
              duplicates.sort((a, b) => {
                // Count populated fields
                const countFields = (fig: any) => {
                  const fields = ['name', 'manufacturer', 'year', 'version', 'productLine', 'subProductLine', 'category', 'size', 'packaging', 'imageUrl', 'notes', 'condition', 'location'];
                  return fields.filter(f => fig[f] !== undefined && fig[f] !== null && fig[f] !== '').length;
                };
                const aCount = countFields(a);
                const bCount = countFields(b);
                if (aCount !== bCount) return bCount - aCount; // More complete first
                return (a.createdAt || 0) - (b.createdAt || 0); // Older first
              });

              // Keep the first one (most complete and oldest), delete the rest
              const keepFig = duplicates[0];
              for (let i = 1; i < duplicates.length; i++) {
                const deleteFig = duplicates[i];
                await deleteDoc(deleteFig.ref);
                consolidatedCount++;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error consolidating duplicate user figures:', error);
        // Continue even if consolidation fails
      }

      // Step 3: Create notifications for affected users
      let notifiedCount = 0;
      try {
        const notificationsCollection = collection(db, 'notifications');
        const notificationMessage = userUpdateStrategy === 'full'
          ? `A figure in your collection "${deleteFigure.name}" was merged with "${keepFigure.name}". Your figure data has been updated to match the merged record.`
          : `A figure in your collection "${deleteFigure.name}" was merged with "${keepFigure.name}". Empty fields in your figure have been updated with new data.`;

        for (const userId of affectedUsers) {
          await addDoc(notificationsCollection, {
            userId,
            type: 'figure_merge',
            title: 'Figure Merged in Database',
            message: notificationMessage,
            read: false,
            createdAt: Date.now(),
            data: {
              deletedFigureId: deleteFigureId,
              deletedFigureName: deleteFigure.name,
              keptFigureId: keepFigureId,
              keptFigureName: keepFigure.name,
              updateStrategy: userUpdateStrategy
            }
          });
          notifiedCount++;
        }
      } catch (error) {
        console.error('Error creating notifications:', error);
        // Continue even if notifications fail
      }

      // Step 4: Delete the duplicate figure
      const deleteSuccess = await this.delete(deleteFigureId);
      if (!deleteSuccess) {
        return {
          success: false,
          updatedUserFigures: updatedCount,
          notifiedUsers: notifiedCount,
          consolidatedDuplicates: consolidatedCount,
          error: 'Failed to delete duplicate figure'
        };
      }

      return {
        success: true,
        updatedUserFigures: updatedCount,
        notifiedUsers: notifiedCount,
        consolidatedDuplicates: consolidatedCount
      };
    } catch (error) {
      console.error('Failed to merge figures:', error);
      return {
        success: false,
        updatedUserFigures: 0,
        notifiedUsers: 0,
        consolidatedDuplicates: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

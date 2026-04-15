export type WishlistPriority = 'low' | 'medium' | 'high';
export type WishlistStatus = 'wanted' | 'watching' | 'considering';

export interface WishlistItem {
  id: string;
  userId: string;

  // Figure details (can be from master DB or user-defined)
  figureName: string;
  franchise?: string;
  series?: string;
  manufacturer?: string;
  version?: string;
  year?: number;

  // Wishlist-specific fields
  priority: WishlistPriority;
  status: WishlistStatus;
  targetPrice?: number; // Max price willing to pay
  notes?: string;

  // Optional link to master figure
  masterFigureId?: string;

  // Tracking
  dateAdded: number;
  lastUpdated: number;

  // Optional image
  imageUrl?: string;
}

export interface WishlistStats {
  totalItems: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  estimatedTotalCost: number;
}

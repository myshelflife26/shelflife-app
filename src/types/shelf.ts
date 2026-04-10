export interface Shelf {
  id: string;
  userId: string;
  name: string;
  description?: string;
  figureIds: string[]; // Ordered list of figure IDs in this shelf
  createdAt: number;
  updatedAt: number;
  isPublic?: boolean; // Whether others can view this shelf
}

export interface ShelfWithFigures extends Shelf {
  figureCount: number;
  thumbnailUrls: string[]; // First few figure images for preview
}

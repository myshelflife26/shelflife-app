export interface ToyLine {
  id: string;                      // Auto-generated
  name: string;                    // "G.I. Joe: A Real American Hero"
  manufacturer: string;            // "Hasbro"
  startYear: number;              // 1982
  endYear?: number;               // undefined if still active
  description?: string;           // Optional background info
  category: string;               // "Action Figures"
  isActive: boolean;              // Still in production
  figureCount: number;            // Total figures in line (cached)

  // Display settings
  imageUrl?: string;              // Line logo/representative image
  themeColor?: string;            // Brand color for UI theming

  // Metadata
  createdAt: number;
  createdBy: string;              // Admin who added it
  source: 'import' | 'admin' | 'user-suggestion';
  verified: boolean;              // Admin-verified
  isPublic: boolean;              // Show in public browse
}

export interface CollectionImage {
  userId: string;
  userName: string;
  userDisplayName: string;
  imageUrl: string;
  figureId: string;               // Reference to user's figure
  uploadedAt: number;
}

export interface ToyLineFigure {
  id: string;                     // Auto-generated
  toyLineId: string;              // References toyLine.id

  // Figure identification
  name: string;                   // "Cobra Eel"
  figureNumber?: string;          // "#34" or "1234"
  year: number;                   // 2024
  subLine?: string;               // "Tiger Force", "Python Patrol"
  wave?: string;                  // "Wave 1", "Exclusive"

  // Product details
  manufacturer: string;           // "Hasbro"
  category: string;               // "Action Figures"
  size?: string;                  // "6 inch"
  upc?: string;                   // Barcode if available

  // Images from user collections
  collectionImages: CollectionImage[]; // Populated from users who own this figure

  // Metadata
  createdAt: number;
  createdBy: string;
  source: 'import' | 'admin' | 'user-suggestion';
  masterFigureId?: string;        // Link to existing masterFigures if mapped
}

export interface ToyLineSuggestion {
  id: string;
  toyLineId: string;              // Which line to add to

  // Suggested figure details
  figureName: string;
  figureNumber?: string;
  year?: number;
  subLine?: string;
  reason: string;                 // Why user thinks it belongs
  imageUrl?: string;              // Optional supporting image

  // Submission tracking
  userId: string;
  userName: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;

  // Review tracking
  reviewedAt?: number;
  reviewedBy?: string;            // Admin who reviewed
  reviewNotes?: string;           // Admin feedback
}

export interface ToyLineCompletion {
  toyLineId: string;
  toyLineName: string;
  totalFigures: number;
  ownedFigures: number;
  completionPercentage: number;
  ownedFigureIds: string[];       // User's figure IDs in this line
}

export interface LineCompletion {
  toyLineId: string;
  totalFigures: number;
  ownedCount: number;
  missingCount: number;
  completionPercentage: number;
  figuresWithOwnership: Array<{
    figure: ToyLineFigure;
    owned: boolean;
    userFigureId?: string;        // If owned, reference to user's collection
  }>;
}

// For adding figures from toy lines to collections
export interface ToyLineFigureAddition {
  source: 'toy-line';
  toyLineId: string;
  toyLineFigureId: string;
  prefillData: Partial<ActionFigure>;
}

// Import ActionFigure for the ToyLineFigureAddition interface
import type { ActionFigure } from './index';
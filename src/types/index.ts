export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea';

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  options?: string[]; // For select type
  required?: boolean;
}

export interface CustomFormula {
  head?: string;
  torso?: string;
  waist?: string;
  rightArm?: string;
  leftArm?: string;
  rightLeg?: string;
  leftLeg?: string;
  accessories?: string;
  other?: string;
}

export type SaleTradeStatus = 'for-sale' | 'for-trade';

export type AccessoryCategory = 'weapon' | 'gear' | 'vehicle' | 'clothing' | 'display' | 'other';

// Marketplace types
export type TradeStatus = 'pending' | 'countered' | 'accepted' | 'declined' | 'completed' | 'cancelled';
export type ShippingStatus = 'not-shipped' | 'shipped' | 'received';

export interface MarketplaceListing {
  figureId: string;
  forSale: boolean;
  forTrade: boolean;
  askingPrice?: number;
  marketplaceDescription?: string;
  customBuildDetails?: string; // For custom figures
  listedAt: number;
}

export interface TradeMessage {
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

export interface TradeCounter {
  userId: string;
  userName: string;
  offeredFigureIds: string[];
  requestedFigureIds: string[];
  offeredCash: number;
  requestedCash: number;
  message?: string;
  timestamp: number;
}

export interface FigureSettings {
  figureId: string;
  isPublic: boolean;
  forSale: boolean;
  forTrade: boolean;
}

export interface TradeProposal {
  id: string;
  status: TradeStatus;

  // Initiator (person making the offer)
  fromUserId: string;
  fromUserName: string;
  fromUserUsername?: string;
  offeredFigureIds: string[];
  offeredCash: number;

  // Recipient (person receiving the offer)
  toUserId: string;
  toUserName: string;
  toUserUsername?: string;
  requestedFigureIds: string[];
  requestedCash: number;

  // Negotiation
  messages: TradeMessage[];
  counterHistory: TradeCounter[];
  counterCount?: number; // Track number of counters (max 3)
  lastCounteredBy?: string; // User ID of last person to counter

  // Shipping tracking
  fromUserShippingStatus: ShippingStatus;
  toUserShippingStatus: ShippingStatus;

  // Figure settings for received figures
  fromUserFigureSettings?: FigureSettings[]; // Settings for figures fromUser receives (requestedFigures)
  toUserFigureSettings?: FigureSettings[]; // Settings for figures toUser receives (offeredFigures)

  // Timestamps
  createdAt: number;
  updatedAt: number;
  acceptedAt?: number;
  completedAt?: number;
  cancelledAt?: number;
}

export interface UserRating {
  id: string;
  tradeId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  rating: number; // 1-5 stars
  feedback: string;
  timestamp: number;
}

// Master database accessory (what SHOULD come with figure)
export interface Accessory {
  id: string;
  name: string;
  category: AccessoryCategory;
  required: boolean; // True if it's part of the standard package
  description?: string;
  imageUrl?: string;
}

// User's owned accessories (what they ACTUALLY have)
export interface UserAccessory {
  id: string; // References Accessory.id from master list
  name: string; // Duplicate for convenience
  owned: boolean;
  condition?: string; // MIB, Loose, Damaged, etc.
  notes?: string;
  imageUrl?: string; // Photo of the accessory (base64 image data URL)
  isCustom?: boolean; // True if this is a user-created accessory (not from master database)
}

// Suggested accessory (user-submitted for approval to master database)
export interface AccessorySuggestion {
  id: string;
  figureId: string; // Which figure this is suggested for
  figureName: string;
  userId: string;
  userName: string;
  accessoryName: string;
  category: AccessoryCategory;
  required: boolean;
  description?: string;
  imageUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

export interface PriceHistoryEntry {
  date: number; // timestamp
  value: number;
}

export interface ActionFigure {
  id: string;
  name: string;
  version?: string; // Version of the figure (e.g., "V1", "V2", "25th Anniversary", etc.)
  year?: number; // Release year of the figure
  series: string;
  manufacturer: string;
  category: string;
  condition: string; // MIB, Loose, Custom, or user-defined
  currentValue: number;
  priceHistory?: PriceHistoryEntry[]; // Track value changes over time
  purchaseDate: string;
  location: string;
  notes: string;
  imageUrl?: string; // Deprecated, kept for backward compatibility
  // Images (up to 5)
  images?: string[]; // Array of image data URLs (base64)
  mainImageIndex?: number; // Index of the main image (0-4)
  imagePosition?: string; // CSS object-position for main image (e.g., "center top", "center center")
  storagePhoto?: string; // Storage/Display photo (base64 image data URL)
  // New fields
  size?: string; // 4", 7", 12", etc.
  productLine?: string;
  subProductLine?: string;
  packaging?: string; // Individual, with Vehicle, Multi-pack
  upc?: string; // UPC/EAN barcode for product identification
  // Accessories tracking
  accessories?: UserAccessory[]; // What accessories the user actually has
  completenessPercentage?: number; // 0-100, calculated from accessories
  // Legacy completeness fields (kept for backward compatibility)
  isComplete?: boolean; // Deprecated - use completenessPercentage instead
  completenessNotes?: string; // Additional notes about completeness/condition
  customFormula?: CustomFormula; // Only for Custom condition - describes parts used
  customFormulaPrivacy?: 'private' | 'admirers-only' | 'public'; // Privacy setting for custom build details (default: private)
  availability?: SaleTradeStatus[]; // Can be for sale, for trade, or both
  // Custom fields
  customFields?: Record<string, any>; // Dynamic custom field values
  // Privacy
  isPublic?: boolean; // Whether this figure is visible to other users (default: false)
  userId?: string; // Owner of this figure (for public browsing)
  // Organization
  isFavorite?: boolean; // Star/favorite this figure for quick access (default: false)
  // Marketplace
  marketplaceListing?: MarketplaceListing; // If listed in marketplace
  isListed?: boolean; // Quick flag for marketplace queries (true if forSale or forTrade)
  // Timestamps
  createdAt?: number; // When the figure was first added
  updatedAt?: number; // When the figure was last modified
}

export type TableColumn =
  | 'image'
  | 'name'
  | 'manufacturer'
  | 'category'
  | 'condition'
  | 'size'
  | 'packaging'
  | 'currentValue'
  | 'purchaseDate'
  | 'location'
  | 'availability';

export interface ColumnVisibility {
  [key: string]: boolean;
}

export interface AppSettings {
  conditionOptions: string[];
  categoryOptions: string[];
  manufacturerOptions: string[];
  seriesOptions: string[];
  versionOptions: string[];
  sizeOptions: string[];
  packagingOptions: string[];
  customFields: CustomField[]; // User-defined custom fields
  visibleColumns?: ColumnVisibility; // User column visibility preferences
}

export interface Filters {
  search: string;
  manufacturers: string[];
  conditions: string[];
  priceRange: [number, number];
  dateRange: [string, string];
  categories: string[];
  sizes: string[];
  packaging: string[];
  productLines: string[];
  locations: string[];
  // Advanced search filters
  years: number[]; // Filter by release year
  versions: string[]; // Filter by version (V1, V2, etc.)
  upc?: string; // Search by UPC/EAN barcode
  isComplete?: 'all' | 'yes' | 'no'; // For Loose condition only (legacy)
  completenessRange?: [number, number]; // 0-100 percentage range for accessory completeness
  saleTradeStatuses: SaleTradeStatus[]; // For sale, for trade, or neither
  customFields?: Record<string, string[]>; // Custom field filters: { fieldId: [values] }
  showFavoritesOnly?: boolean; // Show only favorited figures
}

export type ViewMode = 'gallery' | 'table' | 'stats';

// Statistics Dashboard Types

export interface ValueSnapshot {
  timestamp: number;
  totalValue: number;
  figureCount: number;
  averageValue: number;
}

export type MilestoneCategory = 'value' | 'social' | 'completeness' | 'diversity';

export interface Milestone {
  id: string;
  name: string;
  description: string;
  category: MilestoneCategory;
  threshold: number;
  icon: string; // lucide-react icon name
}

export interface UnlockedMilestone extends Milestone {
  unlockedAt: number;
}

export interface SeriesSet {
  id: string;
  name: string; // "Classified Wave 1"
  series: string; // "Classified"
  manufacturer?: string;
  totalCount: number;
  releaseYear?: number;
  figureNames: string[]; // Expected figure names
  isCustom: boolean; // User-created vs system
}

export interface SetCompletion {
  set: SeriesSet;
  ownedCount: number;
  missingCount: number;
  completionPercentage: number;
  ownedFigures: string[]; // Figure names
  missingFigures: string[]; // Missing figure names
}

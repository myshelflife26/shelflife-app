export type UserRole = 'management' | 'manager' | 'user';
export type SubscriptionTier = 'free' | 'premium';

export interface User {
  id: string;
  username: string;
  password: string; // In production, this would be hashed
  role: UserRole;
  displayName: string;
  email?: string; // Email for notifications
  profileImage?: string; // Base64 encoded profile image
  collectionPublic?: boolean; // Whether entire collection is public (default: false)
  admirers?: string[]; // User IDs who are approved admirers
  admirerRequests?: string[]; // User IDs who have requested to be admirers
  autoApproveAdmirers?: boolean; // Auto-approve admirer requests (default: false)
  subscriptionTier?: SubscriptionTier; // Subscription tier (default: free)
}

export interface PendingDeletion {
  id: string;
  figureId: string;
  figureName: string;
  userId: string;
  scheduledAt: number; // Timestamp when scheduled
  executeAt: number; // Timestamp when it should be deleted (scheduledAt + 2 hours)
  reason?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
}

export interface Message {
  id: string;
  fromUserId: string;
  fromDisplayName: string; // Cached for display
  toUserId: string;
  figureId?: string; // Optional - if message is about a specific figure
  figureName?: string; // Cached figure name for display
  subject: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export type ReactionType = 'appreciate' | 'love' | 'fire';

export interface Reaction {
  id: string;
  figureId: string;
  userId: string; // User who reacted
  displayName: string; // Cached display name
  reactionType: ReactionType;
  timestamp: number;
}

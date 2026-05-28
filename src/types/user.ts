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

// Conversation for threaded messaging
export interface Conversation {
  id: string;
  participants: string[]; // Array of user IDs (2 for direct messages, 3+ for group)
  participantNames: { [userId: string]: string }; // Cached display names
  lastMessage: string; // Preview text of last message
  lastMessageTimestamp: number;
  lastMessageSenderId: string;
  unreadCount: { [userId: string]: number }; // Per-user unread count
  figureId?: string; // If conversation is about a specific figure
  figureName?: string; // Cached figure name
  archived?: { [userId: string]: boolean }; // Per-user archive status
  typingUsers?: { [userId: string]: TypingUser }; // Users currently typing
  createdAt: number;
}

// Message within a conversation
export interface Message {
  id: string;
  conversationId: string; // Links message to conversation
  fromUserId: string;
  fromDisplayName: string; // Cached for display
  toUserId?: string; // Optional - for backwards compatibility with old messages
  figureId?: string; // Optional - if message is about a specific figure
  figureName?: string; // Cached figure name for display
  subject?: string; // Optional - for backwards compatibility with old messages
  message: string;
  timestamp: number;
  read?: boolean; // Deprecated - use readBy instead
  readBy: string[]; // Array of user IDs who have read this message
  replyToMessageId?: string; // For reply threading within conversation
  edited?: boolean; // Track if message was edited
  editedAt?: number; // When message was edited
  reactions?: MessageReaction[]; // Emoji reactions to the message
}

export type ReactionType = 'appreciate' | 'love' | 'fire';

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

export interface Reaction {
  id: string;
  figureId: string;
  userId: string; // User who reacted
  displayName: string; // Cached display name
  reactionType: ReactionType;
  timestamp: number;
}

export interface Comment {
  id: string;
  figureId: string;
  userId: string;
  userName: string;
  userDisplayName: string;
  text: string;
  timestamp: number;
  likes: string[]; // Array of user IDs who liked this comment
  edited: boolean;
  editedAt?: number;
}

export interface CommentWithOwner extends Comment {
  isOwner: boolean; // Is the current user the comment author
}

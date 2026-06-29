export interface Notification {
  id: string;
  userId: string; // Who receives this notification
  type: 'comment' | 'reply' | 'mention' | 'report' | 'like' | 'figure_reaction' | 'formula_access_request' | 'toy_line_suggestion_approved' | 'toy_line_suggestion_rejected';
  read: boolean;
  timestamp: number;

  // Comment-related notifications
  commentId?: string;
  figureId?: string;
  figureName?: string;
  figureImage?: string;

  // Actor (who triggered the notification)
  actorId: string;
  actorName: string;
  actorUsername?: string;

  // Content
  text?: string; // Comment text preview or notification message

  // Report-specific
  reportId?: string;
  reportReason?: string;

  // Metadata
  actionUrl?: string; // Where to navigate when clicked
}

export type NotificationType = Notification['type'];

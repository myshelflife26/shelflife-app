export interface CommentReport {
  id: string;
  commentId: string;
  figureId: string;
  figureName: string;
  figureOwnerId: string;
  commentText: string;
  commentAuthorId: string;
  commentAuthorName: string;
  reportedBy: string;
  reporterName: string;
  reporterUsername: string;
  reason: string;
  timestamp: number;
  status: 'pending' | 'dismissed' | 'action-taken';
  actionTaken?: 'comment-hidden' | 'user-blocked' | 'comment-deleted';
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNotes?: string;
}

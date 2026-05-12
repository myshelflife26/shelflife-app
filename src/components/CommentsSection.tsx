import { useState, useEffect, useRef } from 'react';
import { FirebaseCommentsService } from '../utils/firebaseComments';
import type { Comment } from '../types/comment';
import type { User } from '../types/user';
import type { ActionFigure } from '../types';
import { MessageSquare, Heart, Trash2, Edit2, Send, X, Pin, PinOff, Eye, EyeOff, MoreVertical, Settings, Lock, AlertCircle, UserX, Flag } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { toastManager } from '../utils/toastManager';
import { CommentModerationPanel } from './CommentModerationPanel';

interface CommentsSectionProps {
  figureId: string;
  currentUser: User;
  figureOwnerId: string;
  figure?: ActionFigure;
  onFigureUpdate?: (updates: Partial<ActionFigure>) => void;
}

export function CommentsSection({ figureId, currentUser, figureOwnerId, figure, onFigureUpdate }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const [commentActions, setCommentActions] = useState<string | null>(null);

  const isOwner = figureOwnerId === currentUser.id;
  const commentsEnabled = figure?.commentsEnabled !== false;
  const commentsLocked = figure?.commentsLocked === true;
  const isBlocked = (figure?.blockedFromCommenting || []).includes(currentUser.id);
  const canComment = commentsEnabled && !commentsLocked && !isBlocked;

  // Ref for click-away detection on menu
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to real-time comments
    const unsubscribe = FirebaseCommentsService.subscribeToComments(
      figureId,
      isOwner, // Include hidden if owner
      (updatedComments) => {
        setComments(updatedComments);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [figureId, isOwner]);

  // Click away listener for comment actions menu
  useEffect(() => {
    if (!commentActions) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setCommentActions(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [commentActions]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (newComment.trim().length < 10) {
      toastManager.error('Comment must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      await FirebaseCommentsService.addComment(
        figureId,
        currentUser.id,
        currentUser.username,
        currentUser.displayName,
        newComment.trim()
      );

      setNewComment('');
      toastManager.success('Comment added');
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      toastManager.error(error.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      await FirebaseCommentsService.updateComment(commentId, editText.trim());
      setEditingId(null);
      setEditText('');
      toastManager.success('Comment updated');
    } catch (error) {
      console.error('Failed to update comment:', error);
      toastManager.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      await FirebaseCommentsService.deleteComment(commentId);
      toastManager.success('Comment deleted');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toastManager.error('Failed to delete comment');
    }
  };

  const handleToggleLike = async (commentId: string) => {
    try {
      await FirebaseCommentsService.toggleLike(commentId, currentUser.id);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handlePinComment = async (commentId: string, pinned: boolean) => {
    try {
      await FirebaseCommentsService.pinComment(commentId, pinned);
      toastManager.success(pinned ? 'Comment pinned' : 'Comment unpinned');
      setCommentActions(null);
    } catch (error) {
      console.error('Failed to pin comment:', error);
      toastManager.error('Failed to pin comment');
    }
  };

  const handleHideComment = async (commentId: string, hidden: boolean) => {
    try {
      await FirebaseCommentsService.hideComment(commentId, hidden, currentUser.id);
      toastManager.success(hidden ? 'Comment hidden' : 'Comment unhidden');
      setCommentActions(null);
    } catch (error) {
      console.error('Failed to hide comment:', error);
      toastManager.error('Failed to hide comment');
    }
  };

  const handleBlockUser = async (userId: string) => {
    if (!confirm('Block this user from commenting on this figure?')) return;

    try {
      await FirebaseCommentsService.blockUserFromFigure(figureId, userId);
      onFigureUpdate?.({ blockedFromCommenting: [...(figure?.blockedFromCommenting || []), userId] });
      toastManager.success('User blocked');
      setCommentActions(null);
    } catch (error) {
      console.error('Failed to block user:', error);
      toastManager.error('Failed to block user');
    }
  };

  const handleReportComment = (comment: Comment) => {
    const reason = prompt(
      `Report this comment by ${comment.userDisplayName}?\n\nPlease provide a reason (optional):`
    );

    if (reason !== null) {
      // For now, just show a confirmation. Later this could be saved to a reports collection
      console.log('Comment reported:', {
        commentId: comment.id,
        reportedBy: currentUser.id,
        reason: reason || 'No reason provided',
        commentText: comment.text,
        commentAuthor: comment.userId
      });
      toastManager.success('Comment reported. Thank you for helping keep the community safe.');
      setCommentActions(null);
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
    setCommentActions(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Parse @mentions in comment text and return JSX with clickable links
  const parseCommentWithMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g);

    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        return (
          <span
            key={index}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              toastManager.info(`View profile: @${username}`);
            }}
            title={`View @${username}'s profile`}
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Sort comments
  const sortedComments = [...comments].sort((a, b) => {
    // Pinned comments always first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    switch (sortOrder) {
      case 'newest':
        return b.timestamp - a.timestamp;
      case 'oldest':
        return a.timestamp - b.timestamp;
      case 'most-liked':
        return b.likes.length - a.likes.length;
      default:
        return 0;
    }
  });

  if (!commentsEnabled) {
    return (
      <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400">
          Comments are disabled for this figure
        </p>
        {isOwner && (
          <Button
            size="sm"
            className="mt-3"
            onClick={() => setShowModerationPanel(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Comment Settings
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Comments ({figure?.commentCount || comments.length})
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="most-liked">Most Liked</option>
          </select>

          {isOwner && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowModerationPanel(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {commentsLocked && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
          <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <span className="text-sm text-yellow-800 dark:text-yellow-200">
            This discussion is locked. No new comments can be added.
          </span>
        </div>
      )}

      {isBlocked && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-800 dark:text-red-200">
            You have been blocked from commenting on this figure.
          </span>
        </div>
      )}

      {figure?.requireCommentApproval && !isOwner && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-blue-800 dark:text-blue-200">
            Comments require approval before appearing.
          </span>
        </div>
      )}

      {/* Add Comment */}
      {canComment && (
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment... (Use @username to mention someone)"
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {newComment.length > 0 && `${newComment.length} / 1000 characters`}
            </span>
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || submitting || newComment.length < 10}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading comments...
          </div>
        ) : sortedComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No comments yet. {canComment && 'Be the first to comment!'}
          </div>
        ) : (
          sortedComments.map((comment) => {
            const isCommentOwner = comment.userId === currentUser.id;
            const isEditing = editingId === comment.id;
            const hasLiked = comment.likes.includes(currentUser.id);
            const showActions = commentActions === comment.id;

            return (
              <div
                key={comment.id}
                className={`rounded-lg p-4 space-y-2 ${
                  comment.pinned
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700'
                    : 'bg-gray-50 dark:bg-gray-800'
                } ${comment.hidden ? 'opacity-60' : ''}`}
              >
                {/* Comment Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {comment.userDisplayName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      @{comment.userName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(comment.timestamp)}
                    </span>
                    {comment.edited && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        (edited)
                      </span>
                    )}
                    {comment.pinned && (
                      <Pin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                    {comment.hidden && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded">
                        Hidden
                      </span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="relative" ref={showActions ? menuRef : null}>
                      <button
                        onClick={() => setCommentActions(showActions ? null : comment.id)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </button>

                      {showActions && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                          {isCommentOwner && (
                            <>
                              <button
                                onClick={() => startEditing(comment)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Edit2 className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </>
                          )}

                          {/* Report option for figure owner on others' comments */}
                          {isOwner && !isCommentOwner && (
                            <button
                              onClick={() => handleReportComment(comment)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-orange-600 dark:text-orange-400"
                            >
                              <Flag className="h-4 w-4" />
                              Report
                            </button>
                          )}

                          {isOwner && (
                            <>
                              <button
                                onClick={() => handlePinComment(comment.id, !comment.pinned)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                {comment.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                                {comment.pinned ? 'Unpin' : 'Pin'}
                              </button>
                              <button
                                onClick={() => handleHideComment(comment.id, !comment.hidden)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                {comment.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                {comment.hidden ? 'Unhide' : 'Hide'}
                              </button>
                              {!isCommentOwner && (
                                <>
                                  <button
                                    onClick={() => handleBlockUser(comment.userId)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                                  >
                                    <UserX className="h-4 w-4" />
                                    Block User
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </button>
                                </>
                              )}
                            </>
                          )}

                          {/* Report option for all users */}
                          {!isCommentOwner && !isOwner && (
                            <button
                              onClick={() => handleReportComment(comment)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-orange-600 dark:text-orange-400"
                            >
                              <Flag className="h-4 w-4" />
                              Report Comment
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Comment Body */}
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={cancelEditing}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleUpdateComment(comment.id)}
                        disabled={!editText.trim()}
                        size="sm"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {parseCommentWithMentions(comment.text)}
                  </p>
                )}

                {/* Comment Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-4 pt-1">
                    <button
                      onClick={() => handleToggleLike(comment.id)}
                      className={`flex items-center gap-1 text-sm ${
                        hasLiked
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                      }`}
                    >
                      <Heart
                        className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`}
                      />
                      {comment.likes.length > 0 && (
                        <span>{comment.likes.length}</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Moderation Panel */}
      {showModerationPanel && figure && onFigureUpdate && (
        <CommentModerationPanel
          figure={figure}
          onClose={() => setShowModerationPanel(false)}
          onSettingsUpdate={onFigureUpdate}
        />
      )}
    </div>
  );
}

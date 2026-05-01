import { useState, useEffect } from 'react';
import { FirebaseCommentsService } from '../utils/firebaseComments';
import type { Comment } from '../types/comment';
import type { User } from '../types/user';
import { MessageSquare, Heart, Trash2, Edit2, Send, X } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { toastManager } from '../utils/toastManager';

interface CommentsSectionProps {
  figureId: string;
  currentUser: User;
  figureOwnerId: string;
}

export function CommentsSection({ figureId, currentUser, figureOwnerId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [figureId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const fetchedComments = await FirebaseCommentsService.getCommentsForFigure(figureId);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

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
      await loadComments();
      toastManager.success('Comment added');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toastManager.error('Failed to add comment');
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
      await loadComments();
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
      await loadComments();
      toastManager.success('Comment deleted');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toastManager.error('Failed to delete comment');
    }
  };

  const handleToggleLike = async (commentId: string) => {
    try {
      await FirebaseCommentsService.toggleLike(commentId, currentUser.id);
      await loadComments();
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
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
    // Split text by @mentions pattern
    const parts = text.split(/(@\w+)/g);

    return parts.map((part, index) => {
      // Check if this part is a mention
      if (part.startsWith('@')) {
        const username = part.slice(1); // Remove @ symbol
        return (
          <span
            key={index}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              toastManager.info(`View profile: @${username}`);
              // TODO: Navigate to user profile when profile page exists
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Comments ({comments.length})
        </h3>
      </div>

      {/* Add Comment */}
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment... (Use @username to mention someone)"
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim() || submitting}
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => {
            const isOwner = comment.userId === currentUser.id;
            const isEditing = editingId === comment.id;
            const hasLiked = comment.likes.includes(currentUser.id);

            return (
              <div
                key={comment.id}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2"
              >
                {/* Comment Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {comment.userDisplayName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      @{comment.userName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {formatTime(comment.timestamp)}
                    </span>
                    {comment.edited && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        (edited)
                      </span>
                    )}
                  </div>
                  {isOwner && !isEditing && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditing(comment)}
                        className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
    </div>
  );
}

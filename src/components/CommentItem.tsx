import React, { useState } from 'react';
import { Comment } from '../types';
import { Button } from './ui/button';
import { ThumbsUp, Edit2, Trash2, Pin, PinOff, Eye, EyeOff, MoreVertical } from 'lucide-react';
import { CommentForm } from './CommentForm';
import { formatDistanceToNow } from 'date-fns';

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  isOwner: boolean; // Is current user the figure owner?
  onLike: (commentId: string) => Promise<void>;
  onEdit: (commentId: string, text: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onPin: (commentId: string, pinned: boolean) => Promise<void>;
  onHide: (commentId: string, hidden: boolean) => Promise<void>;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  isOwner,
  onLike,
  onEdit,
  onDelete,
  onPin,
  onHide,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isOwnComment = comment.userId === currentUserId;
  const hasLiked = comment.likes.includes(currentUserId);

  const handleLike = async () => {
    setIsProcessing(true);
    try {
      await onLike(comment.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = async (text: string) => {
    setIsProcessing(true);
    try {
      await onEdit(comment.id, text);
      setIsEditing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    setIsProcessing(true);
    try {
      await onDelete(comment.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePin = async () => {
    setIsProcessing(true);
    try {
      await onPin(comment.id, !comment.pinned);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHide = async () => {
    setIsProcessing(true);
    try {
      await onHide(comment.id, !comment.hidden);
    } finally {
      setIsProcessing(false);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true });

  return (
    <div
      className={`
        p-4 rounded-lg
        ${comment.pinned
          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700'
          : 'bg-gray-50 dark:bg-gray-800/50'}
        ${comment.hidden ? 'opacity-60' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          {/* User Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
            {comment.userDisplayName.charAt(0).toUpperCase()}
          </div>

          {/* User Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">
                {comment.userDisplayName}
              </span>
              {comment.userUsername && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  @{comment.userUsername}
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
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {timeAgo}
              {comment.edited && ' (edited)'}
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        {(isOwnComment || isOwner) && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              disabled={isProcessing}
            >
              <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>

            {showActions && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                {isOwnComment && (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        handleDelete();
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                )}

                {isOwner && (
                  <>
                    <button
                      onClick={() => {
                        handlePin();
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      {comment.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      {comment.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={() => {
                        handleHide();
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      {comment.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {comment.hidden ? 'Unhide' : 'Hide'}
                    </button>
                    {!isOwnComment && (
                      <button
                        onClick={() => {
                          handleDelete();
                          setShowActions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comment Text or Edit Form */}
      {isEditing ? (
        <div className="mt-3">
          <CommentForm
            onSubmit={handleEdit}
            onCancel={() => setIsEditing(false)}
            initialText={comment.text}
            placeholder="Edit your comment..."
            submitLabel="Save"
            isEditing={true}
          />
        </div>
      ) : (
        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
          {comment.text}
        </p>
      )}

      {/* Like Button */}
      {!isEditing && (
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant={hasLiked ? 'default' : 'outline'}
            onClick={handleLike}
            disabled={isProcessing}
            className="gap-1"
          >
            <ThumbsUp className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
            {comment.likes.length > 0 && (
              <span>{comment.likes.length}</span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

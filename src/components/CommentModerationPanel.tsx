import React, { useState, useEffect } from 'react';
import { ActionFigure, Comment } from '../types';
import { Button } from './ui/button';
import { Settings, X, Lock, Unlock, CheckSquare, Square, UserX } from 'lucide-react';
import { CommentsService } from '../utils/comments';

interface CommentModerationPanelProps {
  figure: ActionFigure;
  onClose: () => void;
  onSettingsUpdate: (settings: Partial<ActionFigure>) => Promise<void>;
}

export const CommentModerationPanel: React.FC<CommentModerationPanelProps> = ({
  figure,
  onClose,
  onSettingsUpdate,
}) => {
  const [commentsEnabled, setCommentsEnabled] = useState(figure.commentsEnabled !== false);
  const [commentsLocked, setCommentsLocked] = useState(figure.commentsLocked === true);
  const [requireApproval, setRequireApproval] = useState(figure.requireCommentApproval === true);
  const [blockedUsers, setBlockedUsers] = useState<string[]>(figure.blockedFromCommenting || []);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  useEffect(() => {
    if (requireApproval) {
      loadPendingComments();
    }
  }, [requireApproval]);

  const loadPendingComments = async () => {
    setIsLoadingPending(true);
    try {
      const pending = await CommentsService.getPendingComments(figure.id);
      setPendingComments(pending);
    } catch (error) {
      console.error('Error loading pending comments:', error);
    } finally {
      setIsLoadingPending(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const settings = {
        commentsEnabled,
        commentsLocked,
        requireCommentApproval: requireApproval,
      };

      await CommentsService.updateFigureCommentSettings(figure.id, settings);
      await onSettingsUpdate(settings);
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveComment = async (commentId: string) => {
    try {
      await CommentsService.approveComment(commentId, figure.id);
      setPendingComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error: any) {
      alert(error.message || 'Failed to approve comment');
    }
  };

  const handleDeletePendingComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      await CommentsService.deleteComment(commentId, figure.id, false);
      setPendingComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error: any) {
      alert(error.message || 'Failed to delete comment');
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await CommentsService.unblockUserFromFigure(figure.id, userId);
      setBlockedUsers(prev => prev.filter(id => id !== userId));
    } catch (error: any) {
      alert(error.message || 'Failed to unblock user');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Comment Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Settings */}
        <div className="p-6 space-y-6">
          {/* Enable/Disable Comments */}
          <div className="flex items-start gap-3">
            <button
              onClick={() => setCommentsEnabled(!commentsEnabled)}
              className="mt-1"
            >
              {commentsEnabled ? (
                <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <Square className="h-5 w-5 text-gray-400" />
              )}
            </button>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Allow comments on this figure
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                When disabled, no one can add new comments
              </p>
            </div>
          </div>

          {/* Lock Comments */}
          {commentsEnabled && (
            <div className="flex items-start gap-3">
              <button
                onClick={() => setCommentsLocked(!commentsLocked)}
                className="mt-1"
              >
                {commentsLocked ? (
                  <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <Unlock className="h-5 w-5 text-gray-400" />
                )}
              </button>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Lock discussion (no new comments)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Existing comments remain visible, but no new comments can be added
                </p>
              </div>
            </div>
          )}

          {/* Pre-Moderation */}
          {commentsEnabled && !commentsLocked && (
            <div className="flex items-start gap-3">
              <button
                onClick={() => setRequireApproval(!requireApproval)}
                className="mt-1"
              >
                {requireApproval ? (
                  <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Square className="h-5 w-5 text-gray-400" />
                )}
              </button>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Require approval for new comments
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Comments won't appear until you approve them
                </p>
              </div>
            </div>
          )}

          {/* Pending Comments */}
          {requireApproval && pendingComments.length > 0 && (
            <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Pending Approval ({pendingComments.length})
              </h3>
              <div className="space-y-3">
                {pendingComments.map(comment => (
                  <div
                    key={comment.id}
                    className="bg-white dark:bg-gray-800 rounded p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        {comment.userDisplayName}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        @{comment.userUsername}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {comment.text}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveComment(comment.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeletePendingComment(comment.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blocked Users */}
          {blockedUsers.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Blocked Users ({blockedUsers.length})
                </h3>
              </div>
              <div className="space-y-2">
                {blockedUsers.map(userId => (
                  <div
                    key={userId}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded p-2"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      User ID: {userId}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnblock(userId)}
                    >
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Stats */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Activity
            </h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div>{figure.commentCount || 0} approved comments</div>
              {requireApproval && (
                <div>{pendingComments.length} pending approval</div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

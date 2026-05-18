import { useState, useEffect } from 'react';
import { CommentReportsService } from '../utils/commentReports';
import { FirebaseCommentsService } from '../utils/firebaseComments';
import type { CommentReport } from '../types/commentReport';
import type { User } from '../types/user';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  UserX,
  Trash2,
  MessageSquare,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from './ui/button';
import { toastManager } from '../utils/toastManager';

interface CommentReportsPageProps {
  currentUser: User;
  onClose: () => void;
}

export function CommentReportsPage({ currentUser, onClose }: CommentReportsPageProps) {
  const [reports, setReports] = useState<CommentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'dismissed' | 'action-taken'>('pending');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [processingReport, setProcessingReport] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to real-time reports
    const unsubscribe = CommentReportsService.subscribeToReports(
      currentUser.id,
      (updatedReports) => {
        setReports(updatedReports);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser.id]);

  const filteredReports = reports.filter((report) => {
    if (filter === 'all') return true;
    return report.status === filter;
  });

  const handleDismiss = async (reportId: string) => {
    const notes = prompt('Reason for dismissing this report (optional):');
    if (notes === null) return; // User cancelled

    setProcessingReport(reportId);
    try {
      await CommentReportsService.dismissReport(reportId, currentUser.id, notes || undefined);
      toastManager.success('Report dismissed');
    } catch (error) {
      console.error('Failed to dismiss report:', error);
      toastManager.error('Failed to dismiss report');
    } finally {
      setProcessingReport(null);
    }
  };

  const handleHideComment = async (report: CommentReport) => {
    if (!confirm('Hide this comment from public view?')) return;

    setProcessingReport(report.id);
    try {
      // Hide the comment
      await FirebaseCommentsService.hideComment(report.commentId, true, currentUser.id);

      // Mark report as action taken
      await CommentReportsService.markActionTaken(
        report.id,
        currentUser.id,
        'comment-hidden',
        'Comment hidden from public view'
      );

      toastManager.success('Comment hidden and report resolved');
    } catch (error) {
      console.error('Failed to hide comment:', error);
      toastManager.error('Failed to hide comment');
    } finally {
      setProcessingReport(null);
    }
  };

  const handleBlockUser = async (report: CommentReport) => {
    if (!confirm(`Block ${report.commentAuthorName} from commenting on this figure?`)) return;

    setProcessingReport(report.id);
    try {
      // Block the user
      await FirebaseCommentsService.blockUserFromFigure(report.figureId, report.commentAuthorId);

      // Mark report as action taken
      await CommentReportsService.markActionTaken(
        report.id,
        currentUser.id,
        'user-blocked',
        `User ${report.commentAuthorName} blocked from commenting`
      );

      toastManager.success('User blocked and report resolved');
    } catch (error) {
      console.error('Failed to block user:', error);
      toastManager.error('Failed to block user');
    } finally {
      setProcessingReport(null);
    }
  };

  const handleDeleteComment = async (report: CommentReport) => {
    if (!confirm('Permanently delete this comment?')) return;

    setProcessingReport(report.id);
    try {
      // Delete the comment
      await FirebaseCommentsService.deleteComment(report.commentId);

      // Mark report as action taken
      await CommentReportsService.markActionTaken(
        report.id,
        currentUser.id,
        'comment-deleted',
        'Comment permanently deleted'
      );

      toastManager.success('Comment deleted and report resolved');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toastManager.error('Failed to delete comment');
    } finally {
      setProcessingReport(null);
    }
  };

  const getStatusBadge = (status: CommentReport['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
            <AlertCircle className="h-3 w-3" />
            Pending
          </span>
        );
      case 'dismissed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 rounded-full">
            <XCircle className="h-3 w-3" />
            Dismissed
          </span>
        );
      case 'action-taken':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
            <CheckCircle className="h-3 w-3" />
            Action Taken
          </span>
        );
    }
  };

  const getActionBadge = (actionTaken?: CommentReport['actionTaken']) => {
    if (!actionTaken) return null;

    switch (actionTaken) {
      case 'comment-hidden':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">
            <EyeOff className="h-3 w-3" />
            Hidden
          </span>
        );
      case 'user-blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded">
            <UserX className="h-3 w-3" />
            User Blocked
          </span>
        );
      case 'comment-deleted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded">
            <Trash2 className="h-3 w-3" />
            Deleted
          </span>
        );
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Comment Reports
              </h2>
              {pendingCount > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {pendingCount} pending {pendingCount === 1 ? 'report' : 'reports'} requiring review
                </p>
              )}
            </div>
            <Button onClick={onClose} variant="ghost" size="sm">
              <XCircle className="h-5 w-5" />
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All ({reports.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('action-taken')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'action-taken'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Resolved ({reports.filter(r => r.status === 'action-taken').length})
            </button>
            <button
              onClick={() => setFilter('dismissed')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'dismissed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Dismissed ({reports.filter(r => r.status === 'dismissed').length})
            </button>
          </div>
        </div>

        {/* Reports List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Loading reports...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {filter === 'pending'
                  ? 'No pending reports. Great job keeping the community safe!'
                  : `No ${filter === 'all' ? '' : filter} reports to display.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => {
                const isExpanded = expandedReport === report.id;
                const isProcessing = processingReport === report.id;

                return (
                  <div
                    key={report.id}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-gray-700"
                  >
                    {/* Report Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(report.status)}
                          {getActionBadge(report.actionTaken)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Reported by <span className="font-medium">{report.reporterName}</span> on{' '}
                          <span className="font-medium">{report.figureName}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {formatTimestamp(report.timestamp)}
                        </p>
                      </div>

                      <button
                        onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {/* Report Reason */}
                    <div className="bg-white dark:bg-gray-900 rounded p-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Report Reason:
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {report.reason}
                      </p>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <>
                        {/* Comment Text */}
                        <div className="bg-white dark:bg-gray-900 rounded p-3">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Reported Comment:
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                            "{report.commentText}"
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                            By {report.commentAuthorName}
                          </p>
                        </div>

                        {/* Review Notes (if reviewed) */}
                        {report.reviewNotes && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                              Review Notes:
                            </p>
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                              {report.reviewNotes}
                            </p>
                            {report.reviewedAt && (
                              <p className="text-xs text-blue-500 dark:text-blue-500 mt-1">
                                Reviewed {formatTimestamp(report.reviewedAt)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action Buttons (only for pending reports) */}
                        {report.status === 'pending' && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDismiss(report.id)}
                              disabled={isProcessing}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Dismiss
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleHideComment(report)}
                              disabled={isProcessing}
                            >
                              <EyeOff className="h-4 w-4 mr-1" />
                              Hide Comment
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBlockUser(report)}
                              disabled={isProcessing}
                              className="text-orange-600 hover:text-orange-700 dark:text-orange-400"
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Block User
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteComment(report)}
                              disabled={isProcessing}
                              className="text-red-600 hover:text-red-700 dark:text-red-400"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete Comment
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { ReportingService } from '../utils/reporting';
import { AuthService } from '../utils/auth';
import { NotificationsService } from '../utils/notificationsService';
import { toastManager } from '../utils/toastManager';
import { MasterFiguresService } from '../utils/masterFigures';
import { FirebaseStorage } from '../utils/firebaseStorage';
import { StatsView } from './StatsView';
import type { UserReport, ReportStatus, ReportCategory } from '../utils/reporting';
import type { User } from '../types/user';
import type { ActionFigure } from '../types/index';
import { Flag, AlertCircle, Search, Filter, TrendingUp, CheckCircle, XCircle, AlertTriangle, Trash2, BarChart3, Package, DollarSign, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface AdminReportsPageProps {
  currentUser: User;
  onNavigateBack?: () => void;
}

type ReportsTab = 'userReports' | 'collectionStats' | 'summary';

function AdminReportsPage({ currentUser, onNavigateBack }: AdminReportsPageProps) {
  const [currentTab, setCurrentTab] = useState<ReportsTab>('collectionStats');
  const [reports, setReports] = useState<UserReport[]>([]);
  const [figures, setFigures] = useState<ActionFigure[]>([]);
  const [masterFigures, setMasterFigures] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<ReportCategory | 'all'>('all');

  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0);
    loadReports();
    loadCollectionData();
  }, [currentUser]);

  const loadReports = () => {
    const allReports = ReportingService.getAllReports();
    // Sort by timestamp descending (newest first)
    const sorted = allReports.sort((a, b) => b.timestamp - a.timestamp);
    setReports(sorted);
  };

  const loadCollectionData = async () => {
    try {
      const [userFigures, allMasterFigures] = await Promise.all([
        FirebaseStorage.getFigures(currentUser.id),
        MasterFiguresService.getAll()
      ]);
      setFigures(userFigures);
      setMasterFigures(allMasterFigures);
    } catch (error) {
      console.error('Failed to load collection data:', error);
    }
  };

  // Calculate stats
  const stats = useMemo(() => ReportingService.getReportStats(), [reports]);

  // Filter and search reports
  const filteredReports = useMemo(() => {
    let filtered = reports;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(r => r.category === filterCategory);
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.reportedUsername.toLowerCase().includes(query) ||
        r.reporterUsername.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [reports, filterStatus, filterCategory, searchQuery]);

  const handleUpdateStatus = (reportId: string, newStatus: ReportStatus) => {
    // Find the report before updating to get reporter info
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const success = ReportingService.updateReportStatus(reportId, newStatus, currentUser.username);
    if (success) {
      // Notify the reporter that their report was updated
      NotificationsService.notifyReportUpdate(
        report.reporterId,
        report.reportedUsername,
        newStatus,
        currentUser.username
      );

      // Show toast to admin
      const statusText = newStatus.replace('_', ' ');
      toastManager.success(`Report status updated to "${statusText}". Reporter has been notified.`);

      loadReports();
    }
  };

  const handleDeleteReport = (reportId: string) => {
    if (confirm('Delete this report? This action cannot be undone.')) {
      const success = ReportingService.deleteReport(reportId);
      if (success) {
        loadReports();
      }
    }
  };

  const getRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'reviewed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'dismissed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'action_taken': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      case 'reviewed': return <CheckCircle className="w-4 h-4" />;
      case 'dismissed': return <XCircle className="w-4 h-4" />;
      case 'action_taken': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category: ReportCategory) => {
    switch (category) {
      case 'spam': return 'Spam';
      case 'harassment': return 'Harassment';
      case 'inappropriate': return 'Inappropriate Content';
      case 'fake': return 'Fake Account';
      case 'other': return 'Other';
    }
  };

  // Check if user is admin (for User Reports tab)
  const isAdmin = currentUser.role && ['management', 'manager'].includes(currentUser.role);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-2">
          {onNavigateBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateBack}
              className="flex items-center gap-2"
              title="Back to Collection"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}
          <Flag className="w-6 h-6 text-red-600 dark:text-red-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Reports & Statistics
          </h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {currentTab === 'userReports'
            ? 'Review and manage user-submitted reports. Take appropriate action to maintain community standards.'
            : currentTab === 'summary'
            ? 'Quick overview of collection totals, product lines, and completion status'
            : 'Comprehensive statistics with trends, milestones, and detailed analytics'}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex">
          <button
            onClick={() => setCurrentTab('collectionStats')}
            className={`flex-1 pb-3 px-1 border-b-2 font-medium transition-colors ${
              currentTab === 'collectionStats'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Collection Statistics</span>
            </div>
          </button>
          <button
            onClick={() => setCurrentTab('summary')}
            className={`flex-1 pb-3 px-1 border-b-2 font-medium transition-colors ${
              currentTab === 'summary'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Package className="h-4 w-4" />
              <span>Collection Summary</span>
            </div>
          </button>
          <button
            onClick={() => setCurrentTab('userReports')}
            className={`flex-1 pb-3 px-1 border-b-2 font-medium transition-colors ${
              currentTab === 'userReports'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Flag className="h-4 w-4" />
              <span>User Reports</span>
            </div>
          </button>
        </nav>
      </div>

      {/* User Reports Tab */}
      {currentTab === 'userReports' && (
        <>
          {!isAdmin ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Access Denied
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                You must be an administrator to view user reports.
              </p>
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
              Pending
            </p>
          </div>
          <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
            {stats.byStatus.pending}
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Reviewed
            </p>
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {stats.byStatus.reviewed}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Dismissed
            </p>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {stats.byStatus.dismissed}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Action Taken
            </p>
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {stats.byStatus.action_taken}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by username or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ReportStatus | 'all')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
              <option value="action_taken">Action Taken</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-48">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as ReportCategory | 'all')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Categories</option>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="inappropriate">Inappropriate Content</option>
              <option value="fake">Fake Account</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {(searchQuery || filterStatus !== 'all' || filterCategory !== 'all') && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredReports.length} of {reports.length} report{reports.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Flag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Reports Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || filterStatus !== 'all' || filterCategory !== 'all'
              ? 'Try adjusting your filters'
              : 'No user reports have been submitted yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map(report => (
            <div
              key={report.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Report Details */}
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <Flag className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          @{report.reportedUsername}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">reported by</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          @{report.reporterUsername}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {getRelativeTime(report.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                          {getStatusIcon(report.status)}
                          {report.status.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                          {getCategoryLabel(report.category)}
                        </span>
                      </div>

                      {report.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {report.description}
                        </p>
                      )}

                      {report.reviewedAt && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Reviewed {getRelativeTime(report.reviewedAt)}
                          {report.reviewedBy && ` by ${report.reviewedBy}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {report.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(report.id, 'reviewed')}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(report.id, 'action_taken')}
                        className="text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950"
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Take Action
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                        className="text-gray-600 border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Dismiss
                      </Button>
                    </>
                  )}
                  {report.status !== 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(report.id, 'pending')}
                      className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:border-yellow-800 dark:hover:bg-yellow-950"
                    >
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Reopen
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteReport(report.id)}
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

              {/* Summary */}
              {reports.length > 0 && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  {reports.length} total report{reports.length !== 1 ? 's' : ''}
                  {stats.last7Days > 0 && ` • ${stats.last7Days} in last 7 days`}
                  {stats.last30Days > 0 && ` • ${stats.last30Days} in last 30 days`}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Collection Summary Tab */}
      {currentTab === 'summary' && (
        <CollectionSummaryContent figures={figures} masterFigures={masterFigures} />
      )}

      {/* Collection Statistics Tab */}
      {currentTab === 'collectionStats' && (
        <StatsView figures={figures} />
      )}
    </div>
  );
}

// Collection Summary Content Component
function CollectionSummaryContent({ figures, masterFigures }: { figures: ActionFigure[]; masterFigures: any[] }) {
  // Calculate total figures
  const totalOwned = figures.length;
  const totalKnown = masterFigures.length;
  const collectionPercentage = totalKnown > 0 ? Math.round((totalOwned / totalKnown) * 100) : 100;

  // Calculate total value
  const totalValue = figures.reduce((sum, f) => sum + (f.currentValue || 0), 0);
  const averageValue = totalOwned > 0 ? totalValue / totalOwned : 0;

  // Condition breakdown
  const conditionBreakdown = figures.reduce((acc, f) => {
    const condition = f.condition || 'Unknown';
    acc[condition] = (acc[condition] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Manufacturer breakdown
  const manufacturerBreakdown = figures.reduce((acc, f) => {
    const manufacturer = f.manufacturer || 'Unknown';
    acc[manufacturer] = (acc[manufacturer] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topManufacturers = Object.entries(manufacturerBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Product Line breakdown with master data
  const productLineStats = (() => {
    // Group user's figures by productLine + subProductLine
    const userLineGroups = figures.reduce((acc, figure) => {
      const productLine = figure.productLine || 'Unknown';
      const subLine = figure.subProductLine;
      const key = subLine ? `${productLine} - ${subLine}` : productLine;

      if (!acc[key]) {
        acc[key] = { owned: 0, productLine, subProductLine: subLine };
      }
      acc[key].owned++;
      return acc;
    }, {} as Record<string, { owned: number; productLine: string; subProductLine?: string }>);

    // Count total figures in master database for each group
    const lineStats = Object.entries(userLineGroups).map(([key, data]) => {
      const totalInMaster = masterFigures.filter(mf => {
        const matchesProductLine = (mf.productLine || 'Unknown') === data.productLine;
        const matchesSubLine = data.subProductLine
          ? mf.subProductLine === data.subProductLine
          : !mf.subProductLine;
        return matchesProductLine && matchesSubLine;
      }).length;

      const percentage = totalInMaster > 0 ? Math.round((data.owned / totalInMaster) * 100) : 100;

      return {
        key,
        label: key,
        owned: data.owned,
        total: totalInMaster > 0 ? totalInMaster : data.owned,
        percentage
      };
    }).sort((a, b) => b.owned - a.owned);

    return lineStats;
  })();

  // Completeness stats (for accessories)
  const completenessStats = (() => {
    const withAccessories = figures.filter(f =>
      f.condition !== 'MIB' && f.accessories && f.accessories.length > 0
    );

    const complete = withAccessories.filter(f => (f.completenessPercentage || 0) === 100).length;
    const incomplete = withAccessories.filter(f => (f.completenessPercentage || 0) < 100).length;

    return {
      total: withAccessories.length,
      complete,
      incomplete,
      percentage: withAccessories.length > 0 ? Math.round((complete / withAccessories.length) * 100) : 0
    };
  })();

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Figures */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 dark:bg-blue-500 text-white rounded-lg p-2">
              <Package className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Total Figures
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {totalOwned}
            {totalKnown > 0 && (
              <span className="text-lg text-blue-600 dark:text-blue-400">
                /{totalKnown}
              </span>
            )}
          </div>
          {totalKnown > 0 && (
            <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              {collectionPercentage}% of known figures
            </div>
          )}
        </div>

        {/* Total Value */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-600 dark:bg-green-500 text-white rounded-lg p-2">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium text-green-900 dark:text-green-200">
              Total Value
            </div>
          </div>
          <div className="text-3xl font-bold text-green-900 dark:text-green-100">
            ${totalValue.toLocaleString()}
          </div>
          <div className="text-xs text-green-700 dark:text-green-300 mt-1">
            Avg: ${averageValue.toFixed(2)} per figure
          </div>
        </div>

        {/* Completeness */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-600 dark:bg-purple-500 text-white rounded-lg p-2">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium text-purple-900 dark:text-purple-200">
              Completeness
            </div>
          </div>
          <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {completenessStats.complete}
            <span className="text-lg text-purple-600 dark:text-purple-400">
              /{completenessStats.total}
            </span>
          </div>
          <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
            {completenessStats.percentage}% complete with accessories
          </div>
        </div>
      </div>

      {/* Product Line Breakdown */}
      {productLineStats.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            By Product Line
          </h3>
          <div className="space-y-3">
            {productLineStats.map((stat) => (
              <div key={stat.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {stat.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {stat.owned}/{stat.total}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {stat.percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      stat.percentage === 100
                        ? 'bg-green-600'
                        : stat.percentage >= 75
                        ? 'bg-blue-600'
                        : stat.percentage >= 50
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Condition Breakdown */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            By Condition
          </h3>
          <div className="space-y-2">
            {Object.entries(conditionBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([condition, count]) => {
                const percentage = Math.round((count / totalOwned) * 100);
                return (
                  <div key={condition} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          condition === 'MIB'
                            ? 'bg-green-500'
                            : condition === 'Loose'
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {condition}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {count}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Top Manufacturers */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Manufacturers
          </h3>
          <div className="space-y-2">
            {topManufacturers.map(([manufacturer, count], index) => {
              const percentage = Math.round((count / totalOwned) * 100);
              return (
                <div key={manufacturer} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {manufacturer}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {count}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Completeness Details */}
      {completenessStats.total > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Accessory Completeness
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {completenessStats.complete}
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">
                  Complete (100%)
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              <div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {completenessStats.incomplete}
                </div>
                <div className="text-xs text-red-700 dark:text-red-300">
                  Incomplete (&lt;100%)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default AdminReportsPage;
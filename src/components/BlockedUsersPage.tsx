import { useState, useEffect, useMemo } from 'react';
import { BlockingService } from '../utils/blocking';
import { AuthService } from '../utils/auth';
import type { User } from '../types/user';
import { ShieldOff, UserX, AlertCircle, Search, Download, ChevronDown, ChevronUp, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

interface BlockedUserWithData extends User {
  blockedAt: number;
  reason?: string;
}

export function BlockedUsersPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserWithData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0);

    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    if (user) {
      loadBlockedUsers(user.id);
    }
  }, []);

  const loadBlockedUsers = (userId: string) => {
    const blockedData = BlockingService.getBlockedUsersWithData(userId);

    // Get user details for each blocked user with timestamp and reason
    const users = blockedData
      .map(data => {
        const user = AuthService.getUserById(data.userId);
        if (user) {
          return {
            ...user,
            blockedAt: data.blockedAt,
            reason: data.reason
          };
        }
        return null;
      })
      .filter(Boolean) as BlockedUserWithData[];

    setBlockedUsers(users);
  };

  // Helper function to format relative time
  const getRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  };

  // Calculate analytics
  const analytics = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    const last7Days = blockedUsers.filter(u => u.blockedAt >= sevenDaysAgo).length;
    const last30Days = blockedUsers.filter(u => u.blockedAt >= thirtyDaysAgo).length;

    // Count blocks by reason
    const reasonCounts = new Map<string, number>();
    blockedUsers.forEach(user => {
      const reason = user.reason || 'No reason provided';
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    });

    // Sort by count descending
    const reasonBreakdown = Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: blockedUsers.length > 0 ? Math.round((count / blockedUsers.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const mostCommonReason = reasonBreakdown[0];

    return {
      total: blockedUsers.length,
      last7Days,
      last30Days,
      mostCommonReason,
      reasonBreakdown
    };
  }, [blockedUsers]);

  // Filter blocked users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return blockedUsers;

    const query = searchQuery.toLowerCase();
    return blockedUsers.filter(user =>
      user.displayName.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    );
  }, [blockedUsers, searchQuery]);

  const handleUnblock = (userIdToUnblock: string, username: string) => {
    if (!currentUser) return;

    if (confirm(`Unblock ${username}?\n\nThey'll be able to see your public collection and contact you again.`)) {
      const success = BlockingService.unblockUser(currentUser.id, userIdToUnblock);

      if (success) {
        loadBlockedUsers(currentUser.id);
        // Remove from selection if it was selected
        setSelectedUserIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(userIdToUnblock);
          return newSet;
        });
      }
    }
  };

  const handleToggleSelect = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      // Deselect all
      setSelectedUserIds(new Set());
    } else {
      // Select all filtered users
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleBulkUnblock = () => {
    if (!currentUser || selectedUserIds.size === 0) return;

    const count = selectedUserIds.size;
    if (confirm(`Unblock ${count} user${count !== 1 ? 's' : ''}?\n\nThey'll be able to see your public collection and contact you again.`)) {
      let successCount = 0;
      selectedUserIds.forEach(userId => {
        const success = BlockingService.unblockUser(currentUser.id, userId);
        if (success) successCount++;
      });

      if (successCount > 0) {
        loadBlockedUsers(currentUser.id);
        setSelectedUserIds(new Set());
      }
    }
  };

  const exportToCSV = () => {
    if (blockedUsers.length === 0) return;

    // Create CSV header
    const headers = ['Username', 'Display Name', 'Blocked Date', 'Reason'];
    const csvRows = [headers.join(',')];

    // Add data rows
    blockedUsers.forEach(user => {
      const blockedDate = new Date(user.blockedAt).toLocaleString();
      const reason = user.reason || 'No reason provided';
      const row = [
        user.username,
        user.displayName,
        blockedDate,
        reason
      ].map(field => `"${field}"`); // Wrap in quotes to handle commas
      csvRows.push(row.join(','));
    });

    // Create and download file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blocked-users-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    if (blockedUsers.length === 0) return;

    // Format data for export
    const exportData = blockedUsers.map(user => ({
      username: user.username,
      displayName: user.displayName,
      blockedAt: user.blockedAt,
      blockedDate: new Date(user.blockedAt).toISOString(),
      reason: user.reason || null
    }));

    // Create and download file
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blocked-users-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Please login to manage blocked users
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-2">
          <ShieldOff className="w-6 h-6 text-red-600 dark:text-red-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Blocked Users
          </h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage users you have blocked. Blocked users cannot see your public figures, send you messages, or interact with your collection.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-semibold mb-1">When you block a user:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>They cannot see your public figures</li>
              <li>They cannot send you messages</li>
              <li>They cannot send you admirer requests</li>
              <li>You won't see their content in Browse or Feed</li>
              <li>Their reactions on your figures will be hidden</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {blockedUsers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Analytics
              </h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                ({analytics.total} blocked user{analytics.total !== 1 ? 's' : ''})
              </span>
            </div>
            {showAnalytics ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {showAnalytics && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Last 7 Days */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Last 7 Days
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {analytics.last7Days}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {analytics.total > 0 ? Math.round((analytics.last7Days / analytics.total) * 100) : 0}% of total
                  </p>
                </div>

                {/* Last 30 Days */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Last 30 Days
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {analytics.last30Days}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {analytics.total > 0 ? Math.round((analytics.last30Days / analytics.total) * 100) : 0}% of total
                  </p>
                </div>

                {/* Most Common Reason */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldOff className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Most Common
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                    {analytics.mostCommonReason?.reason || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {analytics.mostCommonReason?.count || 0} block{analytics.mostCommonReason?.count !== 1 ? 's' : ''} ({analytics.mostCommonReason?.percentage || 0}%)
                  </p>
                </div>
              </div>

              {/* Reason Breakdown */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Blocks by Reason
                </h3>
                <div className="space-y-2">
                  {analytics.reasonBreakdown.map(({ reason, count, percentage }) => (
                    <div key={reason}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">{reason}</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-red-600 dark:bg-red-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      {blockedUsers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Found {filteredUsers.length} of {blockedUsers.length} blocked user{blockedUsers.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Blocked Users List */}
      {filteredUsers.length === 0 && blockedUsers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <UserX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Blocked Users
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You haven't blocked any users yet.
          </p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Results Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            No blocked users match "{searchQuery}"
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="mt-4"
          >
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bulk Actions Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select All ({filteredUsers.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Export Buttons */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={blockedUsers.length === 0}
                  className="text-gray-700 dark:text-gray-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToJSON}
                  disabled={blockedUsers.length === 0}
                  className="text-gray-700 dark:text-gray-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  JSON
                </Button>
                {/* Bulk Unblock Button */}
                {selectedUserIds.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkUnblock}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Unblock Selected ({selectedUserIds.size})
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* User List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedUserIds.has(user.id)}
                      onCheckedChange={() => handleToggleSelect(user.id)}
                      className="flex-shrink-0"
                    />

                    {/* Profile Image */}
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {user.profileImage ? (
                        <img
                          src={user.profileImage}
                          alt={user.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                          {user.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {user.displayName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        @{user.username}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Blocked {getRelativeTime(user.blockedAt)}
                      </p>
                      {user.reason && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic line-clamp-2">
                          Reason: {user.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Unblock Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblock(user.id, user.username)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 flex-shrink-0 self-end sm:self-auto"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {blockedUsers.length > 0 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          {blockedUsers.length} {blockedUsers.length === 1 ? 'user' : 'users'} blocked
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { CommunityActivityService, type CommunityActivity } from '../utils/communityActivity';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import type { User } from '../types/user';
import {
  Activity,
  Plus,
  Award,
  Heart,
  MessageSquare,
  RefreshCw,
  Clock,
  TrendingUp,
  Users,
  Star,
  Package,
  Handshake
} from 'lucide-react';
import { Button } from './ui/button';
import { WatermarkedImage } from './ImageOverlay';

interface CommunityActivityFeedProps {
  currentUser: User;
  onNavigateToUser?: (userId: string) => void;
  onNavigateToFigure?: (figureId: string) => void;
  limit?: number;
  showHeader?: boolean;
  showRefresh?: boolean;
  mode?: 'recent' | 'trending' | 'user';
  targetUserId?: string;
}

export function CommunityActivityFeed({
  currentUser,
  onNavigateToUser,
  onNavigateToFigure,
  limit = 25,
  showHeader = true,
  showRefresh = false,
  mode = 'recent',
  targetUserId
}: CommunityActivityFeedProps) {
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalActivities: number;
    activeUsers: number;
  } | null>(null);

  useEffect(() => {
    loadActivities();
    loadStats();
  }, [mode, targetUserId, limit]);

  const loadActivities = async () => {
    try {
      setLoading(true);

      let loadedActivities: CommunityActivity[] = [];

      switch (mode) {
        case 'trending':
          loadedActivities = CommunityActivityService.getTrendingActivities(limit);
          break;
        case 'user':
          if (targetUserId) {
            loadedActivities = CommunityActivityService.getUserActivities(targetUserId, limit);
          }
          break;
        default: // recent
          loadedActivities = CommunityActivityService.getRecentActivities(limit);
      }

      setActivities(loadedActivities);
    } catch (error) {
      console.error('Error loading community activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const activityStats = CommunityActivityService.getActivityStats(7);
      setStats({
        totalActivities: activityStats.totalActivities,
        activeUsers: activityStats.activeUsers
      });
    } catch (error) {
      console.error('Error loading activity stats:', error);
    }
  };

  const getActivityIcon = (type: CommunityActivity['type']) => {
    switch (type) {
      case 'figure_added':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'figure_updated':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case 'collection_milestone':
        return <Award className="w-4 h-4 text-yellow-600" />;
      case 'trade_completed':
        return <Handshake className="w-4 h-4 text-purple-600" />;
      case 'user_joined':
        return <Users className="w-4 h-4 text-indigo-600" />;
      case 'figure_admired':
        return <Heart className="w-4 h-4 text-red-600" />;
      case 'figure_wanted':
        return <Star className="w-4 h-4 text-orange-600" />;
      case 'comment_added':
        return <MessageSquare className="w-4 h-4 text-gray-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityText = (activity: CommunityActivity): string => {
    switch (activity.type) {
      case 'figure_added':
        return `added ${activity.data.figureName || 'a new figure'} to their collection`;
      case 'figure_updated':
        return `updated ${activity.data.figureName || 'a figure'} in their collection`;
      case 'collection_milestone':
        return `reached ${activity.data.milestone}`;
      case 'trade_completed':
        return `completed a trade with ${activity.data.tradedWith}`;
      case 'user_joined':
        return `joined the community`;
      case 'figure_admired':
        return `admired ${activity.data.figureName || 'a figure'} from ${activity.data.targetUserName}`;
      case 'figure_wanted':
        return `added ${activity.data.figureName || 'a figure'} to their want list`;
      case 'comment_added':
        return `commented: "${activity.data.commentText}"`;
      default:
        return 'had activity in the community';
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  const handleUserClick = (userId: string) => {
    if (onNavigateToUser) {
      onNavigateToUser(userId);
    }
  };

  const handleFigureClick = (figureId: string) => {
    if (onNavigateToFigure && figureId) {
      onNavigateToFigure(figureId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Loading community activity...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">
              {mode === 'trending' && 'Trending Activity'}
              {mode === 'recent' && 'Recent Community Activity'}
              {mode === 'user' && 'User Activity'}
            </h3>
          </div>

          {showRefresh && (
            <Button
              onClick={() => {
                loadActivities();
                loadStats();
              }}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          )}
        </div>
      )}

      {stats && (mode === 'recent' || mode === 'trending') && (
        <div className="flex items-center space-x-6 text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-4 h-4" />
            <span>{stats.totalActivities} activities this week</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{stats.activeUsers} active users</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity to show</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow"
            >
              {/* Activity Icon */}
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm">
                      <button
                        onClick={() => handleUserClick(activity.userId)}
                        className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {activity.userDisplayName}
                      </button>
                      {' '}
                      <span className="text-gray-700 dark:text-gray-300">
                        {getActivityText(activity)}
                      </span>
                    </p>

                    <div className="flex items-center mt-1 space-x-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(activity.timestamp)}</span>
                    </div>
                  </div>

                  {/* Figure Image */}
                  {activity.data.figureImageUrl && activity.data.figureId && (
                    <div className="flex-shrink-0 ml-3">
                      <button
                        onClick={() => handleFigureClick(activity.data.figureId!)}
                        className="block"
                      >
                        <WatermarkedImage
                          src={activity.data.figureImageUrl}
                          alt={activity.data.figureName || 'Figure'}
                          className="w-12 h-12 rounded-md object-cover border border-gray-200 dark:border-gray-600"
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {activities.length >= limit && (
        <div className="text-center pt-4">
          <Button
            onClick={loadActivities}
            variant="outline"
            size="sm"
          >
            Load More Activity
          </Button>
        </div>
      )}
    </div>
  );
}
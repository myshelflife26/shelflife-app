import { useState, useEffect, useMemo } from 'react';
import { FirebaseStorage } from '../utils/firebaseStorage';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import { AdmirersService } from '../utils/admirers';
import { JealousyTrackingService } from '../utils/jealousyTracking';
import { ReactionsService } from '../utils/reactions';
import { BlockingService } from '../utils/blocking';
import { ReportingService } from '../utils/reporting';
import type { ReportCategory } from '../utils/reporting';
import { toastManager } from '../utils/toastManager';
import type { ActionFigure } from '../types/index';
import type { User } from '../types/user';
import { TrendingUp, Users, Sparkles, Flame, Heart, ThumbsUp, UserPlus, ShieldOff, Flag, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './ui/button';
import { FigureDetailModal } from './FigureDetailModal';
import { WatermarkedImage } from './ImageOverlay';
import { BlockReasonDialog } from './BlockReasonDialog';
import { ReportReasonDialog } from './ReportReasonDialog';
import { Pagination } from './Pagination';

interface FeedPageProps {
  currentUser: User;
  onNavigateToBrowse?: (userId: string) => void;
}

interface FigureWithOwner extends ActionFigure {
  ownerName: string;
  ownerUsername: string;
  ownerDisplayName: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function FeedPage({ currentUser, onNavigateToBrowse }: FeedPageProps) {
  const [topJealousyFigures, setTopJealousyFigures] = useState<Array<FigureWithOwner & { jealousyScore: number }>>([]);
  const [risingStars, setRisingStars] = useState<Array<FigureWithOwner & { increase: number; previousScore: number }>>([]);
  const [admiredFigures, setAdmiredFigures] = useState<FigureWithOwner[]>([]);
  const [recentPublicFigures, setRecentPublicFigures] = useState<FigureWithOwner[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [admiringUsers, setAdmiringUsers] = useState<string[]>([]);
  const [selectedFigure, setSelectedFigure] = useState<FigureWithOwner | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<{ id: string; username: string } | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [userToReport, setUserToReport] = useState<{ id: string; username: string } | null>(null);
  const [topJealousyPage, setTopJealousyPage] = useState(1);
  const [risingStarsPage, setRisingStarsPage] = useState(1);
  const [risingStarsPageSize, setRisingStarsPageSize] = useState(25);
  const [admiredFiguresPage, setAdmiredFiguresPage] = useState(1);
  const [admiredFiguresPageSize, setAdmiredFiguresPageSize] = useState(25);
  const [suggestedUsersPage, setSuggestedUsersPage] = useState(1);
  const [suggestedUsersPageSize, setSuggestedUsersPageSize] = useState(25);
  const [recentFiguresPage, setRecentFiguresPage] = useState(1);
  const [recentFiguresPageSize, setRecentFiguresPageSize] = useState(25);

  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0);
    loadFeedData();
  }, [currentUser.id]);

  const loadFeedData = async () => {
    try {
      // Get list of users current user is admiring
      const admiring = await AdmirersService.getAdmiring(currentUser.id);
      setAdmiringUsers(admiring);

      // Get all public figures from Firebase
      const publicFigures = await FirebaseStorage.getPublicFigures();
      const allUsers = await FirebaseAuthService.getAllUsers();

      // Add owner info to figures
      const publicFiguresWithOwners: FigureWithOwner[] = publicFigures
        .map(figure => {
          const owner = allUsers.find(u => u.id === figure.userId);
          if (!owner) return null;

          // Skip figures from blocked users
          if (BlockingService.isUserBlocked(currentUser.id, owner.id)) return null;

          return {
            ...figure,
            ownerName: owner.username,
            ownerUsername: owner.username,
            ownerDisplayName: owner.displayName || owner.username,
            userId: owner.id
          };
        })
        .filter(Boolean) as FigureWithOwner[];

    // Record current jealousy scores for tracking
    JealousyTrackingService.recordSnapshots(
      publicFiguresWithOwners.map(f => ({ id: f.id, userId: f.userId! }))
    );

    // Get top jealousy figures (by current score)
    const topJealousy = publicFiguresWithOwners
      .map(figure => {
        const score = ReactionsService.getJealousyScore(figure.id, figure.userId!);
        return { ...figure, jealousyScore: score };
      })
      .filter(f => f.jealousyScore > 0)
      .sort((a, b) => b.jealousyScore - a.jealousyScore);

    setTopJealousyFigures(topJealousy);

    // Get rising stars (top 10 with biggest jealousy increases)
    const rises = JealousyTrackingService.getRisingStars(
      publicFiguresWithOwners.map(f => ({ id: f.id, userId: f.userId! })),
      10
    );

    const risingFigures = rises
      .map(rise => {
        const figure = publicFiguresWithOwners.find(f => f.id === rise.figureId && f.userId === rise.ownerId);
        if (!figure) return null;
        return {
          ...figure,
          increase: rise.increase,
          previousScore: rise.previousScore
        };
      })
      .filter(Boolean) as Array<FigureWithOwner & { increase: number; previousScore: number }>;

    setRisingStars(risingFigures);

    // Get figures from admired users (last 7 days)
    const sevenDaysAgo = Date.now() - SEVEN_DAYS_MS;
    const admiredUsersFigures = publicFiguresWithOwners.filter(f => {
      if (!f.userId) return false;
      const isAdmired = admiring.includes(f.userId);
      if (!isAdmired || f.userId === currentUser.id) return false;

      // Check if created or made public in last 7 days
      const recentlyCreated = f.createdAt && f.createdAt > sevenDaysAgo;
      const recentlyPublic = f.updatedAt && f.updatedAt > sevenDaysAgo;

      return recentlyCreated || recentlyPublic;
    })
    // Sort by most recent first (createdAt or updatedAt)
    .sort((a, b) => {
      const aTime = Math.max(a.createdAt || 0, a.updatedAt || 0);
      const bTime = Math.max(b.createdAt || 0, b.updatedAt || 0);
      return bTime - aTime;
    });

    setAdmiredFigures(admiredUsersFigures);

    // Get recently made public (last 7 days, not from admired users)
    const recentPublic = publicFiguresWithOwners.filter(f => {
      if (!f.userId) return false;
      const isAdmired = admiring.includes(f.userId);
      if (isAdmired || f.userId === currentUser.id) return false;

      // Check if created or made public in last 7 days
      const recentlyCreated = f.createdAt && f.createdAt > sevenDaysAgo;
      const recentlyPublic = f.updatedAt && f.updatedAt > sevenDaysAgo;

      return recentlyCreated || recentlyPublic;
    })
    // Sort by most recent first (createdAt or updatedAt)
    .sort((a, b) => {
      const aTime = Math.max(a.createdAt || 0, a.updatedAt || 0);
      const bTime = Math.max(b.createdAt || 0, b.updatedAt || 0);
      return bTime - aTime;
    });

    setRecentPublicFigures(recentPublic);

    // If not admiring anyone, suggest users
    if (admiring.length === 0) {
      const suggestions = await getSuggestedUsers(allUsers, currentUser.id, publicFiguresWithOwners);
      setSuggestedUsers(suggestions);
    }
    } catch (error) {
      console.error('Failed to load feed data:', error);
    }
  };

  const getSuggestedUsers = async (
    allUsers: User[],
    currentUserId: string,
    publicFiguresWithOwners: FigureWithOwner[]
  ): Promise<User[]> => {
    try {
      const myFigures = await FirebaseStorage.getFigures(currentUserId);
      const myManufacturers = new Set(myFigures.map(f => f.manufacturer).filter(Boolean));
      const myCategories = new Set(myFigures.map(f => f.category).filter(Boolean));

      const userScores: Array<{ user: User; score: number }> = [];

      allUsers
        .filter(u => u.id !== currentUserId && !BlockingService.isUserBlocked(currentUserId, u.id))
        .forEach(user => {
          const userFigures = publicFiguresWithOwners.filter(f => f.userId === user.id);
          if (userFigures.length === 0) return;

          let score = 0;

          // Score based on matching manufacturers
          userFigures.forEach(figure => {
            if (figure.manufacturer && myManufacturers.has(figure.manufacturer)) {
              score += 2;
            }
            if (figure.category && myCategories.has(figure.category)) {
              score += 1;
            }
          });

          if (score > 0) {
            userScores.push({ user, score });
          }
        });

      return userScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(us => us.user);
    } catch (error) {
      console.error('Failed to get suggested users:', error);
      return [];
    }
  };

  const handleReaction = (figureId: string, ownerId: string, type: 'fire' | 'love' | 'appreciate') => {
    ReactionsService.toggleReaction(figureId, ownerId, currentUser.id, type);
    // Refresh feed data to update rising stars and scores
    loadFeedData();
  };

  // Paginate sections
  const paginatedTopJealousy = useMemo(() => {
    const pageSize = 5; // Fixed at 5
    const startIndex = (topJealousyPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return topJealousyFigures.slice(startIndex, endIndex);
  }, [topJealousyFigures, topJealousyPage]);

  const paginatedRisingStars = useMemo(() => {
    const startIndex = (risingStarsPage - 1) * risingStarsPageSize;
    const endIndex = startIndex + risingStarsPageSize;
    return risingStars.slice(startIndex, endIndex);
  }, [risingStars, risingStarsPage, risingStarsPageSize]);

  const paginatedAdmiredFigures = useMemo(() => {
    const startIndex = (admiredFiguresPage - 1) * admiredFiguresPageSize;
    const endIndex = startIndex + admiredFiguresPageSize;
    return admiredFigures.slice(startIndex, endIndex);
  }, [admiredFigures, admiredFiguresPage, admiredFiguresPageSize]);

  const paginatedSuggestedUsers = useMemo(() => {
    const startIndex = (suggestedUsersPage - 1) * suggestedUsersPageSize;
    const endIndex = startIndex + suggestedUsersPageSize;
    return suggestedUsers.slice(startIndex, endIndex);
  }, [suggestedUsers, suggestedUsersPage, suggestedUsersPageSize]);

  const paginatedRecentFigures = useMemo(() => {
    const startIndex = (recentFiguresPage - 1) * recentFiguresPageSize;
    const endIndex = startIndex + recentFiguresPageSize;
    return recentPublicFigures.slice(startIndex, endIndex);
  }, [recentPublicFigures, recentFiguresPage, recentFiguresPageSize]);

  const handleAdmire = async (userId: string) => {
    const result = await AdmirersService.requestToAdmire(currentUser.id, userId);
    if (result.success) {
      toastManager.success(result.message);
      await loadFeedData();
    } else {
      toastManager.error(result.message);
    }
  };

  const handleBlockUser = (userId: string, username: string) => {
    setUserToBlock({ id: userId, username: username });
    setBlockDialogOpen(true);
  };

  const confirmBlock = (reason?: string) => {
    if (!userToBlock) return;

    BlockingService.blockUser(currentUser.id, userToBlock.id, reason);
    toastManager.success(`Blocked ${userToBlock.username}`);
    loadFeedData(); // Refresh feed to remove blocked user's posts
    setBlockDialogOpen(false);
    setUserToBlock(null);
  };

  const cancelBlock = () => {
    setBlockDialogOpen(false);
    setUserToBlock(null);
  };

  const handleReportUser = (userId: string, username: string) => {
    setUserToReport({ id: userId, username: username });
    setReportDialogOpen(true);
  };

  const confirmReport = (category: ReportCategory, description?: string) => {
    if (!userToReport) return;

    const report = ReportingService.submitReport(
      currentUser.id,
      currentUser.username,
      userToReport.id,
      userToReport.username,
      category,
      description
    );

    if (report) {
      toastManager.success(`Reported ${userToReport.username}`);
    } else {
      toastManager.error('Unable to submit report. You may have already reported this user recently.');
    }

    setReportDialogOpen(false);
    setUserToReport(null);
  };

  const cancelReport = () => {
    setReportDialogOpen(false);
    setUserToReport(null);
  };

  const getMainImage = (figure: ActionFigure): string | null => {
    if (figure.images && figure.images.length > 0) {
      return figure.images[figure.mainImageIndex ?? 0];
    }
    return null;
  };

  const hasReacted = (figureId: string, ownerId: string, type: 'fire' | 'love' | 'appreciate'): boolean => {
    return ReactionsService.hasReacted(figureId, ownerId, currentUser.id, type);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feed</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Discover what's trending in the community
        </p>
      </div>

      {/* Top Jealousy Section */}
      {topJealousyFigures.length > 0 && (
        <div className="mb-8 bg-orange-100/70 dark:bg-orange-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-6 w-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Most Jealous</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">({topJealousyFigures.length})</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Figures with the highest current jealousy scores
          </p>

          {/* Simple pagination without page size selector */}
          <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mb-4">
            <span className="hidden sm:inline text-sm text-gray-700 dark:text-gray-300">
              Showing 5 per page
            </span>
            <div className="flex items-center gap-0.5 sm:gap-1 mx-auto sm:mx-0">
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">
                {Math.min((topJealousyPage - 1) * 5 + 1, topJealousyFigures.length)}-{Math.min(topJealousyPage * 5, topJealousyFigures.length)} of {topJealousyFigures.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTopJealousyPage(1)}
                disabled={topJealousyPage === 1}
                className="h-7 w-7 sm:h-8 sm:w-8"
                title="First page"
              >
                <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTopJealousyPage(topJealousyPage - 1)}
                disabled={topJealousyPage === 1}
                className="h-7 w-7 sm:h-8 sm:w-8"
                title="Previous page"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 px-1 sm:px-2">
                {topJealousyPage}/{Math.ceil(topJealousyFigures.length / 5)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTopJealousyPage(topJealousyPage + 1)}
                disabled={topJealousyPage >= Math.ceil(topJealousyFigures.length / 5)}
                className="h-7 w-7 sm:h-8 sm:w-8"
                title="Next page"
              >
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTopJealousyPage(Math.ceil(topJealousyFigures.length / 5))}
                disabled={topJealousyPage >= Math.ceil(topJealousyFigures.length / 5)}
                className="h-7 w-7 sm:h-8 sm:w-8"
                title="Last page"
              >
                <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
            {paginatedTopJealousy.map((figure, index) => {
              const mainImage = getMainImage(figure);
              const rank = (topJealousyPage - 1) * 5 + index + 1;

              return (
                <div
                  key={figure.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative"
                  onClick={() => setSelectedFigure(figure)}
                >
                  {/* Image */}
                  <div className="relative h-36 bg-gray-100 dark:bg-gray-700">
                    {mainImage ? (
                      <WatermarkedImage
                        src={mainImage}
                        alt={figure.name}
                        watermarkText="SAMPLE"
                        ownerId={figure.userId}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: figure.imagePosition || 'center center' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Flame className="h-12 w-12 text-gray-400" />
                      </div>
                    )}

                    {/* Rank badge */}
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                      #{rank}
                    </div>

                    {/* Version badge */}
                    {figure.version && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs font-semibold">
                        {figure.version}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                      {figure.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      by {figure.ownerDisplayName}
                    </p>

                    {/* Jealousy Meter */}
                    <div className="mb-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <Flame className="h-3 w-3 text-orange-500" />
                          Jealousy
                        </span>
                        <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                          {figure.jealousyScore}
                        </span>
                      </div>
                    </div>

                    {/* Quick reactions */}
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant={hasReacted(figure.id, figure.userId!, 'fire') ? 'default' : 'outline'}
                        onClick={() => handleReaction(figure.id, figure.userId!, 'fire')}
                        className="flex-1 h-7 px-1 text-xs"
                      >
                        <Flame className="h-3 w-3 mr-0.5" />
                        Fire
                      </Button>
                      <Button
                        size="sm"
                        variant={hasReacted(figure.id, figure.userId!, 'love') ? 'default' : 'outline'}
                        onClick={() => handleReaction(figure.id, figure.userId!, 'love')}
                        className="flex-1 h-7 px-1 text-xs"
                      >
                        <Heart className="h-3 w-3 mr-0.5" />
                        Love
                      </Button>
                      <Button
                        size="sm"
                        variant={hasReacted(figure.id, figure.userId!, 'appreciate') ? 'default' : 'outline'}
                        onClick={() => handleReaction(figure.id, figure.userId!, 'appreciate')}
                        className="flex-1 h-7 px-1 text-xs"
                      >
                        <ThumbsUp className="h-3 w-3 mr-0.5" />
                        Like
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rising Stars Section */}
      {risingStars.length > 0 && (
        <div className="mb-8 bg-pink-100/70 dark:bg-pink-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-6 w-6 text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Rising Stars</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">({risingStars.length})</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Figures with the biggest jealousy score increases
          </p>

          <Pagination
            currentPage={risingStarsPage}
            totalItems={risingStars.length}
            pageSize={risingStarsPageSize}
            onPageChange={setRisingStarsPage}
            onPageSizeChange={setRisingStarsPageSize}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
            {paginatedRisingStars.map(figure => {
              const mainImage = getMainImage(figure);
              const currentScore = ReactionsService.getJealousyScore(figure.id, figure.userId!);

              return (
                <div
                  key={figure.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedFigure(figure)}
                >
                  {/* Image */}
                  <div className="relative h-36 bg-gray-100 dark:bg-gray-700">
                    {mainImage ? (
                      <WatermarkedImage
                        src={mainImage}
                        alt={figure.name}
                        watermarkText="SAMPLE"
                        ownerId={figure.userId}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: figure.imagePosition || 'center center' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-12 w-12 text-gray-400" />
                      </div>
                    )}

                    {/* Trending badge */}
                    <div className="absolute top-1.5 left-1.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +{figure.increase}
                    </div>

                    {/* Version badge */}
                    {figure.version && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs font-semibold">
                        {figure.version}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                      {figure.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      by {figure.ownerDisplayName}
                    </p>

                    {/* Jealousy Meter */}
                    <div className="mb-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <Flame className="h-3 w-3 text-orange-500" />
                          Jealousy
                        </span>
                        <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                          {currentScore}
                        </span>
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        <TrendingUp className="h-3 w-3 inline mr-1" />
                        Was {figure.previousScore}
                      </div>
                    </div>

                    {/* Quick reactions */}
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant={hasReacted(figure.id, figure.userId!, 'fire') ? 'default' : 'outline'}
                        onClick={() => handleReaction(figure.id, figure.userId!, 'fire')}
                        className="flex-1 h-7 px-1 text-xs"
                      >
                        <Flame className="h-3 w-3 mr-0.5" />
                        Fire
                      </Button>
                      <Button
                        size="sm"
                        variant={hasReacted(figure.id, figure.userId!, 'love') ? 'default' : 'outline'}
                        onClick={() => handleReaction(figure.id, figure.userId!, 'love')}
                        className="flex-1 h-7 px-1 text-xs"
                      >
                        <Heart className="h-3 w-3 mr-0.5" />
                        Love
                      </Button>
                      <Button
                        size="sm"
                        variant={hasReacted(figure.id, figure.userId!, 'appreciate') ? 'default' : 'outline'}
                        onClick={() => handleReaction(figure.id, figure.userId!, 'appreciate')}
                        className="flex-1 h-7 px-1 text-xs"
                      >
                        <ThumbsUp className="h-3 w-3 mr-0.5" />
                        Like
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={risingStarsPage}
            totalItems={risingStars.length}
            pageSize={risingStarsPageSize}
            onPageChange={setRisingStarsPage}
            onPageSizeChange={setRisingStarsPageSize}
          />
        </div>
      )}

      {/* From People You Admire Section */}
      {admiringUsers.length > 0 && admiredFigures.length > 0 && (
        <div className="mb-8 bg-blue-100/70 dark:bg-blue-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">From People You Admire</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">({admiredFigures.length})</span>
          </div>

          <Pagination
            currentPage={admiredFiguresPage}
            totalItems={admiredFigures.length}
            pageSize={admiredFiguresPageSize}
            onPageChange={setAdmiredFiguresPage}
            onPageSizeChange={setAdmiredFiguresPageSize}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
            {paginatedAdmiredFigures.map(figure => {
              const mainImage = getMainImage(figure);

              return (
                <div
                  key={figure.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedFigure(figure)}
                >
                  {/* Image */}
                  <div className="relative h-36 bg-gray-100 dark:bg-gray-700">
                    {mainImage ? (
                      <WatermarkedImage
                        src={mainImage}
                        alt={figure.name}
                        watermarkText="SAMPLE"
                        ownerId={figure.userId}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: figure.imagePosition || 'center center' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-12 w-12 text-gray-400" />
                      </div>
                    )}

                    {/* Version badge */}
                    {figure.version && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs font-semibold">
                        {figure.version}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate">
                      {figure.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      by {figure.ownerDisplayName}
                    </p>

                    {/* Quick reactions */}
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant={hasReacted(figure.id, figure.userId!, 'fire') ? 'default' : 'outline'}
                        onClick={() => handleReaction(figure.id, figure.userId!, 'fire')}
                        className="flex-1 h-7 px-1 text-xs"
                      >
                        <Flame className="h-3 w-3 mr-0.5" />
                        Fire
                      </Button>
                      <Button
                        size="sm"
                        variant={hasReacted(figure.id, figure.userId!, 'love') ? 'default' : 'outline'}
                        onClick={() => handleReaction(figure.id, figure.userId!, 'love')}
                        className="flex-1 h-7 px-1 text-xs"
                      >
                        <Heart className="h-3 w-3 mr-0.5" />
                        Love
                      </Button>
                      <Button
                        size="sm"
                        variant={hasReacted(figure.id, figure.userId!, 'appreciate') ? 'default' : 'outline'}
                        onClick={() => handleReaction(figure.id, figure.userId!, 'appreciate')}
                        className="flex-1 h-7 px-1 text-xs"
                      >
                        <ThumbsUp className="h-3 w-3 mr-0.5" />
                        Like
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={admiredFiguresPage}
            totalItems={admiredFigures.length}
            pageSize={admiredFiguresPageSize}
            onPageChange={setAdmiredFiguresPage}
            onPageSizeChange={setAdmiredFiguresPageSize}
          />
        </div>
      )}

      {/* Suggested Users (if not admiring anyone) */}
      {admiringUsers.length === 0 && suggestedUsers.length > 0 && (
        <div className="mb-8 bg-purple-100/70 dark:bg-purple-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Suggested Collectors</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Users with similar figures to your collection
          </p>

          <Pagination
            currentPage={suggestedUsersPage}
            totalItems={suggestedUsers.length}
            pageSize={suggestedUsersPageSize}
            onPageChange={setSuggestedUsersPage}
            onPageSizeChange={setSuggestedUsersPageSize}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
            {paginatedSuggestedUsers.map(user => (
              <div
                key={user.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {user.displayName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      @{user.username}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleAdmire(user.id)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Admirer Request
                </Button>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={suggestedUsersPage}
            totalItems={suggestedUsers.length}
            pageSize={suggestedUsersPageSize}
            onPageChange={setSuggestedUsersPage}
            onPageSizeChange={setSuggestedUsersPageSize}
          />
        </div>
      )}

      {/* Recently Made Public Section */}
      {recentPublicFigures.length > 0 && (
        <div className="mb-8 bg-indigo-100/70 dark:bg-indigo-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recently Made Public</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">({recentPublicFigures.length})</span>
          </div>

          <Pagination
            currentPage={recentFiguresPage}
            totalItems={recentPublicFigures.length}
            pageSize={recentFiguresPageSize}
            onPageChange={setRecentFiguresPage}
            onPageSizeChange={setRecentFiguresPageSize}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
            {paginatedRecentFigures.map(figure => {
              const mainImage = getMainImage(figure);

              return (
                <div
                  key={figure.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedFigure(figure)}
                >
                  {/* Image */}
                  <div className="relative h-36 bg-gray-100 dark:bg-gray-700">
                    {mainImage ? (
                      <WatermarkedImage
                        src={mainImage}
                        alt={figure.name}
                        watermarkText="SAMPLE"
                        ownerId={figure.userId}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: figure.imagePosition || 'center center' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-12 w-12 text-gray-400" />
                      </div>
                    )}

                    {/* Version badge */}
                    {figure.version && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs font-semibold">
                        {figure.version}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate">
                      {figure.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      by {figure.ownerDisplayName}
                    </p>

                    {/* Quick reactions */}
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant={hasReacted(figure.id, figure.userId!, 'fire') ? 'default' : 'outline'}
                        onClick={() => handleReaction(figure.id, figure.userId!, 'fire')}
                        className="flex-1 h-7 px-1 text-xs"
                      >
                        <Flame className="h-3 w-3 mr-0.5" />
                        Fire
                      </Button>
                      <Button
                        size="sm"
                        variant={hasReacted(figure.id, figure.userId!, 'love') ? 'default' : 'outline'}
                        onClick={() => handleReaction(figure.id, figure.userId!, 'love')}
                        className="flex-1 h-7 px-1 text-xs"
                      >
                        <Heart className="h-3 w-3 mr-0.5" />
                        Love
                      </Button>
                      <Button
                        size="sm"
                        variant={hasReacted(figure.id, figure.userId!, 'appreciate') ? 'default' : 'outline'}
                        onClick={() => handleReaction(figure.id, figure.userId!, 'appreciate')}
                        className="flex-1 h-7 px-1 text-xs"
                      >
                        <ThumbsUp className="h-3 w-3 mr-0.5" />
                        Like
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={recentFiguresPage}
            totalItems={recentPublicFigures.length}
            pageSize={recentFiguresPageSize}
            onPageChange={setRecentFiguresPage}
            onPageSizeChange={setRecentFiguresPageSize}
          />
        </div>
      )}

      {/* Empty state */}
      {risingStars.length === 0 && admiredFigures.length === 0 && recentPublicFigures.length === 0 && suggestedUsers.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Activity Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Start by making some figures public or admiring other collectors!
          </p>
        </div>
      )}

      {/* Figure Detail Modal */}
      {selectedFigure && (
        <FigureDetailModal
          figure={selectedFigure}
          currentUserId={currentUser.id}
          onClose={() => setSelectedFigure(null)}
          onViewOwnerCollection={(ownerId) => {
            if (onNavigateToBrowse) {
              onNavigateToBrowse(ownerId);
            }
          }}
          onReactionChange={loadFeedData}
          onBlockUser={handleBlockUser}
          onReportUser={handleReportUser}
        />
      )}

      {/* Block Reason Dialog */}
      {userToBlock && (
        <BlockReasonDialog
          isOpen={blockDialogOpen}
          username={userToBlock.username}
          onConfirm={confirmBlock}
          onCancel={cancelBlock}
        />
      )}

      {/* Report Reason Dialog */}
      {userToReport && (
        <ReportReasonDialog
          isOpen={reportDialogOpen}
          username={userToReport.username}
          onConfirm={confirmReport}
          onCancel={cancelReport}
        />
      )}
    </div>
  );
}

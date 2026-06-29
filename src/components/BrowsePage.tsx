import { useState, useMemo, useEffect } from 'react';
import { FirebaseStorage } from '../utils/firebaseStorage';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import { FirebaseMessagesService } from '../utils/firebaseMessages';
import { FirebaseConversationsService } from '../utils/firebaseConversations';
import { ReactionsService } from '../utils/reactions';
import { FirebaseReactionsService } from '../utils/firebaseReactions';
import { AdmirersService } from '../utils/admirers';
import { BlockingService } from '../utils/blocking';
import { ReportingService } from '../utils/reporting';
import type { ReportCategory } from '../utils/reporting';
import { toastManager } from '../utils/toastManager';
import type { ActionFigure, Filters } from '../types/index';
import type { User, ReactionType } from '../types/user';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Search, User as UserIcon, Package, Eye, Mail, X, ThumbsUp, Heart, Flame, Star, UserPlus, UserMinus, Clock, ShieldOff, Flag, ChevronLeft, ChevronRight, Repeat, DollarSign, Shuffle, Bookmark, BookmarkCheck, Zap, Database } from 'lucide-react';
import { WatermarkedImage } from './ImageOverlay';
import { BlockReasonDialog } from './BlockReasonDialog';
import { ReportReasonDialog } from './ReportReasonDialog';
import { TradeRequestDialog } from './TradeRequestDialog';
import { UserRatingBadge } from './UserRatingBadge';
import { FilterSheet } from './FilterSheet';
import { ResponseTimeBadge } from './ResponseTimeBadge';
import { BookmarksService } from '../utils/bookmarks';
import { ViewTrackingService } from '../utils/viewTracking';
import { TrendingService } from '../utils/trending';
import { UserRecommendationsService } from '../utils/userRecommendations';
import { CommentsSection } from './CommentsSection';
import { ToyLineDatabaseTab } from './ToyLineDatabaseTab';
import { ToyLineDetail } from './ToyLineDetail';
import { FigureSuggestionModal } from './FigureSuggestionModal';
import type { ToyLine, ToyLineFigure } from '../types/toyLine';

interface BrowsePageProps {
  currentUser: User;
  setCurrentPage?: (page: 'collection' | 'feed' | 'settings' | 'users' | 'gallery' | 'browse' | 'messages' | 'blocked' | 'reports') => void;
  initialUserId?: string | null;
  onClearInitialUserId?: () => void;
}

type ViewMode = 'all' | 'users' | 'recent' | 'admiring' | 'bookmarks' | 'trending' | 'recommended' | 'toy-lines';

function BrowsePage({ currentUser, setCurrentPage, initialUserId, onClearInitialUserId }: BrowsePageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  // Debug: Track currentUser prop changes
  useEffect(() => {
    console.log('[BROWSE] BrowsePage rendered with currentUser:', currentUser ? {
      id: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName
    } : 'null');

    // Make currentUser available globally for debugging
    if (typeof window !== 'undefined') {
      window.currentUser = currentUser;
    }
  }, [currentUser]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    manufacturers: [],
    conditions: [],
    priceRange: [0, 10000],
    dateRange: ['', ''],
    categories: [],
    sizes: [],
    packaging: [],
    productLines: [],
    locations: [],
    years: [],
    versions: [],
    upc: undefined,
    isComplete: 'all',
    completenessRange: undefined,
    saleTradeStatuses: [],
    customFields: {},
    showFavoritesOnly: false,
    tags: [],
  });
  const [selectedFigure, setSelectedFigure] = useState<(ActionFigure & { ownerName: string; ownerUsername: string; ownerDisplayName: string }) | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: ''
  });
  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(null);
  const [reactionStats, setReactionStats] = useState({ appreciate: 0, love: 0, fire: 0, total: 0 });
  const [jealousyScore, setJealousyScore] = useState(0);
  const [jealousyStats, setJealousyStats] = useState({ appreciate: 0, love: 0, fire: 0, total: 0 });
  const [figureJealousyScores, setFigureJealousyScores] = useState<Map<string, number>>(new Map());
  const [figureJealousyStats, setFigureJealousyStats] = useState<Map<string, { appreciate: number; love: number; fire: number; total: number }>>(new Map());
  const [figureUserReactions, setFigureUserReactions] = useState<Map<string, ReactionType | null>>(new Map());
  const [refreshKey, setRefreshKey] = useState(0);

  // Toy line state
  const [selectedToyLine, setSelectedToyLine] = useState<ToyLine | null>(null);
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);

  // Debug: Monitor reactionStats changes
  useEffect(() => {
    console.log('[REACTION_STATS] State changed:', reactionStats);
  }, [reactionStats]);

  // Precompute jealousy scores, stats, and user reactions for all figures using hybrid data
  const updateFigureJealousyScores = async (figures: any[]) => {
    const scores = new Map<string, number>();
    const stats = new Map<string, { appreciate: number; love: number; fire: number; total: number }>();
    const userReactions = new Map<string, ReactionType | null>();

    for (const figure of figures) {
      if (figure.userId) {
        try {
          const score = await ReactionsService.getJealousyScoreHybrid(figure.id, figure.userId);
          const figureStats = await ReactionsService.getJealousyStatsHybrid(figure.id, figure.userId);
          const userReaction = await FirebaseReactionsService.getUserReaction(figure.id, currentUser.id);

          scores.set(figure.id, score);
          stats.set(figure.id, figureStats);
          userReactions.set(figure.id, userReaction?.reactionType || null);
        } catch (error) {
          // Fallback to localStorage
          const fallbackScore = ReactionsService.getJealousyScore(figure.id, figure.userId);
          const fallbackStats = ReactionsService.getJealousyStats(figure.id, figure.userId);
          const fallbackReaction = ReactionsService.getUserReaction(figure.id, currentUser.id);

          scores.set(figure.id, fallbackScore);
          stats.set(figure.id, fallbackStats);
          userReactions.set(figure.id, fallbackReaction?.reactionType || null);
        }
      }
    }

    console.log('[JEALOUSY_SCORES] Updated scores for', scores.size, 'figures');
    console.log('[JEALOUSY_STATS] Updated stats for', stats.size, 'figures');
    console.log('[USER_REACTIONS] Updated user reactions for', userReactions.size, 'figures');
    setFigureJealousyScores(scores);
    setFigureJealousyStats(stats);
    setFigureUserReactions(userReactions);
  };
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<{ id: string; username: string } | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [userToReport, setUserToReport] = useState<{ id: string; username: string } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allPublicFigures, setAllPublicFigures] = useState<Array<ActionFigure & { ownerName: string; ownerUsername: string; ownerDisplayName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [admiringUserIds, setAdmiringUserIds] = useState<string[]>([]);
  const [pendingRequestUserIds, setPendingRequestUserIds] = useState<string[]>([]);
  const [admirerCounts, setAdmirerCounts] = useState<Map<string, number>>(new Map());
  const [tradeRequestOpen, setTradeRequestOpen] = useState(false);
  const [tradeRequestMode, setTradeRequestMode] = useState<'trade' | 'sale'>('trade');
  const [bookmarkedFigureIds, setBookmarkedFigureIds] = useState<Set<string>>(new Set());
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [trendingFigures, setTrendingFigures] = useState<Array<ActionFigure & { ownerName: string; ownerUsername: string; ownerDisplayName: string }>>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<Array<{
    user: any;
    reason: string;
    score: number;
    sharedInterests?: string[];
    complementaryCount?: number;
    lastActive?: string;
  }>>([]);

  // Load bookmarks on mount
  useEffect(() => {
    const bookmarks = BookmarksService.getBookmarkedFigureIds();
    setBookmarkedFigureIds(new Set(bookmarks));
  }, []);

  // Calculate response time when figure is selected
  useEffect(() => {
    if (selectedFigure?.userId) {
      setResponseTime(null); // Reset while loading
      FirebaseConversationsService.calculateAverageResponseTime(selectedFigure.userId)
        .then(time => setResponseTime(time))
        .catch(err => {
          console.error('Failed to calculate response time:', err);
          setResponseTime(null);
        });
    }
  }, [selectedFigure?.userId]);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load admiring status
  useEffect(() => {
    const loadAdmiringStatus = async () => {
      try {
        const admiringIds = await AdmirersService.getAdmiring(currentUser.id);
        const pendingIds = await AdmirersService.getPendingRequestsSent(currentUser.id);

        setAdmiringUserIds(admiringIds);
        setPendingRequestUserIds(pendingIds.map(u => u.id));

        // Load admirer counts for all users
        const allUsers = await FirebaseAuthService.getAllUsers();
        const counts = new Map<string, number>();
        for (const user of allUsers) {
          const count = await AdmirersService.getAdmirerCount(user.id);
          counts.set(user.id, count);
        }
        setAdmirerCounts(counts);
      } catch (error) {
        console.error('Failed to load admiring status:', error);
      }
    };

    loadAdmiringStatus();
  }, [currentUser.id, refreshKey]);

  // Load public figures from Firebase
  useEffect(() => {
    const loadPublicFigures = async () => {
      setLoading(true);
      try {
        const figures = await FirebaseStorage.getPublicFigures();
        const allUsers = await FirebaseAuthService.getAllUsers();

        // Add owner info to figures
        const figuresWithOwners = figures
          .map(figure => {
            const owner = allUsers.find(u => u.id === figure.userId);
            if (!owner) return null;

            // Filter out figures from blocked users
            if (BlockingService.isUserBlocked(currentUser.id, figure.userId!)) return null;

            return {
              ...figure,
              ownerName: owner.username,
              ownerUsername: owner.username,
              ownerDisplayName: owner.displayName || owner.username
            };
          })
          .filter(Boolean) as Array<ActionFigure & { ownerName: string; ownerUsername: string; ownerDisplayName: string }>;

        setAllPublicFigures(figuresWithOwners);

        // Precompute jealousy scores for all figures
        await updateFigureJealousyScores(figuresWithOwners);
      } catch (error) {
        console.error('Failed to load public figures:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPublicFigures();
  }, [currentUser.id, refreshKey]);

  // Load trending figures when view mode is trending
  useEffect(() => {
    const loadTrendingFigures = async () => {
      if (viewMode !== 'trending') return;

      try {
        // For now, sort by viewCount (once trending scores are populated, this will use trending score)
        const sortedByViews = [...allPublicFigures]
          .filter(fig => (fig.viewCount || 0) > 0)
          .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
          .slice(0, 20); // Top 20 most viewed as trending

        setTrendingFigures(sortedByViews);

        // TODO: Replace with actual trending algorithm once trending scores are populated
        // const trendingFigures = await TrendingService.getTrendingFigures(20, 'hot');
      } catch (error) {
        console.error('Failed to load trending figures:', error);
        setTrendingFigures([]);
      }
    };

    loadTrendingFigures();
  }, [viewMode, allPublicFigures]);

  // Load recommended users when view mode is recommended
  useEffect(() => {
    const loadRecommendations = async () => {
      if (viewMode !== 'recommended') return;

      try {
        const recommendations = await UserRecommendationsService.getRecommendedCollectors(currentUser.id, 12);
        setRecommendedUsers(recommendations);
      } catch (error) {
        console.error('Failed to load recommendations:', error);
        setRecommendedUsers([]);
      }
    };

    loadRecommendations();
  }, [viewMode, currentUser.id]);

  // Handle initial user filter from feed
  useEffect(() => {
    if (initialUserId) {
      const loadUsers = async () => {
        const allUsers = await FirebaseAuthService.getAllUsers();
        const targetUser = allUsers.find(u => u.id === initialUserId);
        if (targetUser) {
          setViewMode('all');
          // Search by username since ownerName field uses username
          setSearchQuery(targetUser.username);
        }
        // Clear the initial user ID after using it
        if (onClearInitialUserId) {
          onClearInitialUserId();
        }
      };
      loadUsers();
    }
  }, [initialUserId, onClearInitialUserId]);

  // Get users with public collections
  const publicUsers = useMemo(() => {
    const uniqueUserIds = new Set<string>();
    const usersMap = new Map<string, any>();

    allPublicFigures.forEach(figure => {
      if (figure.userId && !uniqueUserIds.has(figure.userId)) {
        uniqueUserIds.add(figure.userId);
        usersMap.set(figure.userId, {
          id: figure.userId,
          username: figure.ownerUsername,
          displayName: figure.ownerDisplayName,
          figureCount: 0
        });
      }
      if (figure.userId) {
        const user = usersMap.get(figure.userId);
        if (user) {
          user.figureCount++;
        }
      }
    });

    return Array.from(usersMap.values());
  }, [allPublicFigures]);

  // Get collections you're admiring
  const admiringCollections = useMemo(() => {
    return publicUsers.filter(user => admiringUserIds.includes(user.id));
  }, [publicUsers, admiringUserIds]);

  // Get recent figures (last 20)
  const recentFigures = useMemo(() => {
    return allPublicFigures.slice(-20).reverse(); // Most recent first
  }, [allPublicFigures]);

  // Extract unique values for filters
  const uniqueManufacturers = useMemo(() => {
    const manufacturers = new Set<string>();
    allPublicFigures.forEach(fig => {
      if (fig.manufacturer) manufacturers.add(fig.manufacturer);
    });
    return Array.from(manufacturers).sort();
  }, [allPublicFigures]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    allPublicFigures.forEach(fig => {
      if (fig.category) categories.add(fig.category);
    });
    return Array.from(categories).sort();
  }, [allPublicFigures]);

  const uniqueConditions = useMemo(() => {
    const conditions = new Set<string>();
    allPublicFigures.forEach(fig => {
      if (fig.condition) conditions.add(fig.condition);
    });
    return Array.from(conditions).sort();
  }, [allPublicFigures]);

  const uniqueSizes = useMemo(() => {
    const sizes = new Set<string>();
    allPublicFigures.forEach(fig => {
      if (fig.size) sizes.add(fig.size);
    });
    return Array.from(sizes).sort();
  }, [allPublicFigures]);

  const uniquePackaging = useMemo(() => {
    const packaging = new Set<string>();
    allPublicFigures.forEach(fig => {
      if (fig.packaging) packaging.add(fig.packaging);
    });
    return Array.from(packaging).sort();
  }, [allPublicFigures]);

  const uniqueProductLines = useMemo(() => {
    const productLines = new Set<string>();
    allPublicFigures.forEach(fig => {
      if (fig.productLine) productLines.add(fig.productLine);
    });
    return Array.from(productLines).sort();
  }, [allPublicFigures]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    allPublicFigures.forEach(fig => {
      if (fig.location) locations.add(fig.location);
    });
    return Array.from(locations).sort();
  }, [allPublicFigures]);

  // Filter figures based on search and filters
  const filteredFigures = useMemo(() => {
    let figures = viewMode === 'recent'
      ? recentFigures
      : viewMode === 'bookmarks'
      ? allPublicFigures.filter(fig => bookmarkedFigureIds.has(fig.id))
      : viewMode === 'trending'
      ? trendingFigures
      : allPublicFigures;

    // Apply search query (advanced search)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      figures = figures.filter(figure => {
        // Basic fields
        if (figure.name.toLowerCase().includes(query)) return true;
        if (figure.manufacturer?.toLowerCase().includes(query)) return true;
        if (figure.category?.toLowerCase().includes(query)) return true;
        if (figure.ownerName.toLowerCase().includes(query)) return true;
        if (figure.ownerDisplayName?.toLowerCase().includes(query)) return true;

        // Notes content
        if (figure.notes?.toLowerCase().includes(query)) return true;

        // Custom fields
        if (figure.customFields) {
          const customFieldValues = Object.values(figure.customFields)
            .map(v => String(v).toLowerCase());
          if (customFieldValues.some(v => v.includes(query))) return true;
        }

        // Accessories
        if (figure.accessories) {
          const accessoryNames = figure.accessories
            .map(acc => acc.name.toLowerCase());
          if (accessoryNames.some(name => name.includes(query))) return true;
        }

        // Additional searchable fields
        if (figure.version?.toLowerCase().includes(query)) return true;
        if (figure.productLine?.toLowerCase().includes(query)) return true;
        if (figure.series?.toLowerCase().includes(query)) return true;
        if (figure.franchise?.toLowerCase().includes(query)) return true;
        if (figure.upc?.toLowerCase().includes(query)) return true;

        return false;
      });
    }

    // Apply filters
    if (filters.manufacturers.length > 0) {
      figures = figures.filter(fig =>
        fig.manufacturer && filters.manufacturers.includes(fig.manufacturer)
      );
    }

    if (filters.categories.length > 0) {
      figures = figures.filter(fig =>
        fig.category && filters.categories.includes(fig.category)
      );
    }

    if (filters.conditions.length > 0) {
      figures = figures.filter(fig =>
        fig.condition && filters.conditions.includes(fig.condition)
      );
    }

    if (filters.sizes.length > 0) {
      figures = figures.filter(fig =>
        fig.size && filters.sizes.includes(fig.size)
      );
    }

    if (filters.packaging.length > 0) {
      figures = figures.filter(fig =>
        fig.packaging && filters.packaging.includes(fig.packaging)
      );
    }

    if (filters.productLines.length > 0) {
      figures = figures.filter(fig =>
        fig.productLine && filters.productLines.includes(fig.productLine)
      );
    }

    if (filters.locations.length > 0) {
      figures = figures.filter(fig =>
        fig.location && filters.locations.includes(fig.location)
      );
    }

    if (filters.years.length > 0) {
      figures = figures.filter(fig =>
        fig.year && filters.years.includes(fig.year)
      );
    }

    if (filters.versions.length > 0) {
      figures = figures.filter(fig =>
        fig.version && filters.versions.includes(fig.version)
      );
    }

    if (filters.tags.length > 0) {
      figures = figures.filter(fig =>
        fig.tags && fig.tags.some(tag => filters.tags.includes(tag))
      );
    }

    // Price range filter
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) {
      figures = figures.filter(fig =>
        fig.currentValue >= filters.priceRange[0] &&
        fig.currentValue <= filters.priceRange[1]
      );
    }

    // Date range filter
    if (filters.dateRange[0] || filters.dateRange[1]) {
      figures = figures.filter(fig => {
        if (!fig.purchaseDate) return false;
        const purchaseDate = new Date(fig.purchaseDate);
        if (filters.dateRange[0] && purchaseDate < new Date(filters.dateRange[0])) return false;
        if (filters.dateRange[1] && purchaseDate > new Date(filters.dateRange[1])) return false;
        return true;
      });
    }

    // Completeness range filter
    if (filters.completenessRange) {
      figures = figures.filter(fig => {
        const completeness = fig.completenessPercentage ?? 100;
        return completeness >= filters.completenessRange![0] &&
               completeness <= filters.completenessRange![1];
      });
    }

    // Is complete filter (legacy)
    if (filters.isComplete && filters.isComplete !== 'all') {
      figures = figures.filter(fig => {
        if (filters.isComplete === 'yes') {
          return fig.isComplete === true || (fig.completenessPercentage ?? 100) === 100;
        } else {
          return fig.isComplete === false || (fig.completenessPercentage ?? 100) < 100;
        }
      });
    }

    // UPC filter
    if (filters.upc) {
      const upcQuery = filters.upc.toLowerCase();
      figures = figures.filter(fig =>
        fig.upc && fig.upc.toLowerCase().includes(upcQuery)
      );
    }

    // Sale/Trade status filter
    if (filters.saleTradeStatuses.length > 0) {
      figures = figures.filter(fig =>
        fig.availability && filters.saleTradeStatuses.some(status =>
          fig.availability!.includes(status)
        )
      );
    }

    // Custom fields filter
    if (filters.customFields && Object.keys(filters.customFields).length > 0) {
      figures = figures.filter(fig => {
        if (!fig.customFields) return false;
        return Object.entries(filters.customFields!).every(([fieldId, values]) => {
          if (values.length === 0) return true;
          const figValue = fig.customFields![fieldId];
          return figValue && values.includes(String(figValue));
        });
      });
    }

    return figures;
  }, [allPublicFigures, recentFigures, viewMode, searchQuery, filters, bookmarkedFigureIds]);

  // Handle figure click - open detail modal
  const handleFigureClick = async (figure: ActionFigure & { ownerName: string; ownerUsername: string; ownerDisplayName: string }) => {
    console.log('[BROWSE] Opening figure:', figure.id);
    // Reset reaction stats when opening new figure
    setReactionStats({ appreciate: 0, love: 0, fire: 0, total: 0 });
    setJealousyScore(0);
    setJealousyStats({ appreciate: 0, love: 0, fire: 0, total: 0 });
    setCurrentReaction(null);
    setSelectedFigure(figure);
    setCurrentImageIndex(figure.mainImageIndex ?? 0);

    // Track the view - figures clicked from browse page
    await ViewTrackingService.trackFigureView(
      figure.id,
      'browse',
      currentUser.id
    );

    // Load reaction data
    loadReactionData(figure.id).catch(err => console.error('Failed to load reaction data:', err));
  };

  // Handle close detail modal
  const handleCloseDetail = () => {
    console.log('[BROWSE] handleCloseDetail called - closing modal');
    setSelectedFigure(null);
    setCurrentReaction(null);
    // Don't reset reactionStats here - it causes UI issues when reactions are updated
  };

  // Handle random figure discovery
  const handleRandomFigure = () => {
    const figures = filteredFigures.length > 0 ? filteredFigures : allPublicFigures;
    if (figures.length === 0) {
      toastManager.error('No figures available');
      return;
    }
    const randomIndex = Math.floor(Math.random() * figures.length);
    const randomFigure = figures[randomIndex];
    handleFigureClick(randomFigure);
  };

  // Handle bookmark toggle
  const handleToggleBookmark = (e: React.MouseEvent, figureId: string, figureName: string, imageUrl?: string) => {
    e.stopPropagation(); // Prevent opening figure detail modal

    const isBookmarked = BookmarksService.toggleBookmark(figureId, figureName, imageUrl);

    // Update local state
    setBookmarkedFigureIds(prev => {
      const newSet = new Set(prev);
      if (isBookmarked) {
        newSet.add(figureId);
        toastManager.success(`Bookmarked "${figureName}"`);
      } else {
        newSet.delete(figureId);
        toastManager.info(`Removed bookmark`);
      }
      return newSet;
    });
  };

  // Load reaction data for a figure
  const loadReactionData = async (figureId: string) => {
    console.log(`[LOAD_REACTION] Starting loadReactionData for figure: ${figureId}`);
    try {
      // Try to get hybrid data (Firebase + localStorage)
      const reactions = await ReactionsService.getReactionsForFigureHybrid(figureId);
      console.log(`[LOAD_REACTION] Got ${reactions.length} total reactions:`, reactions);

      // Calculate stats from hybrid data
      const stats = {
        appreciate: reactions.filter(r => r.reactionType === 'appreciate').length,
        love: reactions.filter(r => r.reactionType === 'love').length,
        fire: reactions.filter(r => r.reactionType === 'fire').length,
        total: reactions.length
      };
      console.log(`[LOAD_REACTION] Calculated stats:`, stats);
      console.log(`[LOAD_REACTION] About to call setReactionStats with:`, stats);
      setReactionStats(stats);
      console.log(`[LOAD_REACTION] setReactionStats called successfully`);

      // Get current user's reaction from hybrid data
      const userReaction = reactions.find(r => r.userId === currentUser.id);
      console.log(`[LOAD_REACTION] Current user reaction:`, userReaction);
      setCurrentReaction(userReaction?.reactionType || null);

      // Calculate jealousy stats from hybrid data (exclude owner's own reactions)
      if (selectedFigure?.userId) {
        const othersReactions = reactions.filter(r => r.userId !== selectedFigure.userId);
        const jealousyStatsData = {
          appreciate: othersReactions.filter(r => r.reactionType === 'appreciate').length,
          love: othersReactions.filter(r => r.reactionType === 'love').length,
          fire: othersReactions.filter(r => r.reactionType === 'fire').length,
          total: othersReactions.length
        };
        const jealousyScoreData = jealousyStatsData.appreciate * 1 + jealousyStatsData.love * 3 + jealousyStatsData.fire * 5;

        console.log(`[LOAD_REACTION] Jealousy stats calculated:`, jealousyStatsData, 'score:', jealousyScoreData);
        setJealousyStats(jealousyStatsData);
        setJealousyScore(jealousyScoreData);
      }
    } catch (error) {
      console.error('Failed to load hybrid reaction data:', error);
      // Fallback to localStorage only
      const stats = ReactionsService.getStatsForFigure(figureId);
      console.log(`[LOAD_REACTION] Fallback stats:`, stats);
      setReactionStats(stats);

      const userReaction = ReactionsService.getUserReaction(figureId, currentUser.id);
      setCurrentReaction(userReaction?.reactionType || null);

      // Fallback jealousy calculation from localStorage
      if (selectedFigure?.userId) {
        const fallbackJealousyScore = ReactionsService.getJealousyScore(figureId, selectedFigure.userId);
        const fallbackJealousyStats = ReactionsService.getJealousyStats(figureId, selectedFigure.userId);
        console.log(`[LOAD_REACTION] Fallback jealousy:`, fallbackJealousyStats, 'score:', fallbackJealousyScore);
        setJealousyStats(fallbackJealousyStats);
        setJealousyScore(fallbackJealousyScore);
      }
    }
  };

  // Handle reaction
  const handleReact = async (reactionType: ReactionType) => {
    console.log('[BROWSE] handleReact called:', { reactionType, selectedFigure: selectedFigure?.id, currentUser: currentUser?.id });

    if (!selectedFigure) {
      console.log('[BROWSE] No selected figure, aborting reaction');
      return;
    }

    if (!currentUser) {
      console.log('[BROWSE] No current user, aborting reaction');
      return;
    }

    try {
      console.log('[BROWSE] Attempting Firebase reaction toggle...');
      // Use Firebase reactions service for cross-browser consistency
      await FirebaseReactionsService.toggleReaction(
        selectedFigure.id,
        selectedFigure.userId,
        currentUser.id,
        currentUser.displayName,
        reactionType
      );
      console.log('[BROWSE] Firebase reaction toggle successful');

      // Update local state
      const updatedReaction = await FirebaseReactionsService.getUserReaction(selectedFigure.id, currentUser.id);
      setCurrentReaction(updatedReaction?.reactionType || null);

      // Reload stats
      console.log('[BROWSE] About to reload reaction data after Firebase success');
      await loadReactionData(selectedFigure.id);

      // Update jealousy score, stats, and user reaction for this figure in the main list
      try {
        const updatedScore = await ReactionsService.getJealousyScoreHybrid(selectedFigure.id, selectedFigure.userId);
        const updatedStats = await ReactionsService.getJealousyStatsHybrid(selectedFigure.id, selectedFigure.userId);
        const updatedUserReaction = await FirebaseReactionsService.getUserReaction(selectedFigure.id, currentUser.id);

        setFigureJealousyScores(prev => new Map(prev.set(selectedFigure.id, updatedScore)));
        setFigureJealousyStats(prev => new Map(prev.set(selectedFigure.id, updatedStats)));
        setFigureUserReactions(prev => new Map(prev.set(selectedFigure.id, updatedUserReaction?.reactionType || null)));

        console.log('[BROWSE] Updated jealousy score for figure', selectedFigure.id, 'to', updatedScore);
        console.log('[BROWSE] Updated jealousy stats for figure', selectedFigure.id, 'to', updatedStats);
        console.log('[BROWSE] Updated user reaction for figure', selectedFigure.id, 'to', updatedUserReaction?.reactionType);
      } catch (error) {
        console.error('Failed to update figure jealousy score/stats/reaction:', error);
      }

      console.log('[BROWSE] Finished reloading reaction data after Firebase success');
    } catch (error) {
      console.error('Failed to update reaction:', error);
      // Fallback to localStorage
      ReactionsService.toggleReaction(selectedFigure.id, selectedFigure.userId, currentUser.id, reactionType);
      const fallbackReaction = ReactionsService.getUserReaction(selectedFigure.id, currentUser.id);
      setCurrentReaction(fallbackReaction?.reactionType || null);
      await loadReactionData(selectedFigure.id);

      // Update jealousy score for this figure (fallback)
      const fallbackScore = ReactionsService.getJealousyScore(selectedFigure.id, selectedFigure.userId);
      setFigureJealousyScores(prev => new Map(prev.set(selectedFigure.id, fallbackScore)));
      console.log('[BROWSE] Updated jealousy score (fallback) for figure', selectedFigure.id, 'to', fallbackScore);
    }
  };

  // Handle contact owner
  const handleContactOwner = () => {
    if (!selectedFigure) return;

    setMessageForm({
      subject: `Interested in: ${selectedFigure.name}`,
      message: `Hi ${selectedFigure.ownerName},\n\nI saw your ${selectedFigure.name} and I'm interested in learning more.\n\n`
    });
    setMessageDialogOpen(true);
  };

  // Handle request to admire
  const handleRequestToAdmire = async (targetUserId: string) => {
    const result = await AdmirersService.requestToAdmire(currentUser.id, targetUserId);
    if (result.success) {
      toastManager.success(result.message);
    } else {
      toastManager.error(result.message);
    }
    setRefreshKey(prev => prev + 1);
  };

  // Handle cancel admirer request
  const handleCancelRequest = async (targetUserId: string) => {
    if (confirm('Cancel your admirer request?')) {
      await AdmirersService.cancelRequest(currentUser.id, targetUserId);
      setRefreshKey(prev => prev + 1);
    }
  };

  // Handle stop admiring
  const handleStopAdmiring = async (targetUserId: string) => {
    if (confirm('Stop admiring this collection?')) {
      await AdmirersService.stopAdmiring(currentUser.id, targetUserId);
      setRefreshKey(prev => prev + 1);
    }
  };

  // Handle block user - open dialog
  const handleBlockUser = (targetUserId: string, targetUsername: string) => {
    setUserToBlock({ id: targetUserId, username: targetUsername });
    setBlockDialogOpen(true);
  };

  // Confirm block with optional reason
  const confirmBlock = (reason?: string) => {
    if (!userToBlock) return;

    BlockingService.blockUser(currentUser.id, userToBlock.id, reason);
    toastManager.success(`Blocked ${userToBlock.username}`);
    setRefreshKey(prev => prev + 1);
    setBlockDialogOpen(false);
    setUserToBlock(null);
  };

  // Handle adding figure from toy line to collection
  const handleAddFromToyLine = (toyLineFigure: ToyLineFigure) => {
    // This would typically navigate to the FigureForm with pre-populated data
    // For now, we'll implement a basic approach
    if (setCurrentPage) {
      // Navigate to collection page where user can add the figure
      // We could pass the toy line figure data via a callback or state management
      setCurrentPage('collection');
      toastManager.info(`Navigate to your collection to add ${toyLineFigure.name}`);
    }
  };

  // Cancel block
  const cancelBlock = () => {
    setBlockDialogOpen(false);
    setUserToBlock(null);
  };

  // Handle report user - open dialog
  const handleReportUser = (targetUserId: string, targetUsername: string) => {
    setUserToReport({ id: targetUserId, username: targetUsername });
    setReportDialogOpen(true);
  };

  // Confirm report with category and description
  const confirmReport = (category: ReportCategory, description?: string) => {
    if (!userToReport) return;

    console.log('Submitting report:', {
      reporterId: currentUser.id,
      reporterUsername: currentUser.username,
      reportedId: userToReport.id,
      reportedUsername: userToReport.username,
      category,
      description
    });

    const report = ReportingService.submitReport(
      currentUser.id,
      currentUser.username,
      userToReport.id,
      userToReport.username,
      category,
      description
    );

    console.log('Report result:', report);

    if (report) {
      toastManager.success(`Reported @${userToReport.username}`);
    } else {
      toastManager.error('Unable to submit report. You may have already reported this user recently.');
    }

    setReportDialogOpen(false);
    setUserToReport(null);
  };

  // Cancel report
  const cancelReport = () => {
    setReportDialogOpen(false);
    setUserToReport(null);
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!selectedFigure || !messageForm.subject || !messageForm.message) {
      toastManager.warning('Please fill in both subject and message');
      return;
    }

    const result = await FirebaseMessagesService.send(
      currentUser.id,
      currentUser.displayName,
      selectedFigure.userId!,
      messageForm.subject,
      messageForm.message,
      selectedFigure.id,
      selectedFigure.name
    );

    if (result) {
      toastManager.success('Message sent successfully!');
      setMessageDialogOpen(false);
      setMessageForm({ subject: '', message: '' });
    } else {
      toastManager.error('Failed to send message');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full box-border">
      {/* Header */}
      <div className="mb-6 text-left">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Browse Public Collections
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Discover figures from other collectors
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto mb-6">
        <button
          onClick={() => setViewMode('all')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            viewMode === 'all'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Search className="h-4 w-4 inline mr-2" />
          All Figures ({allPublicFigures.length})
        </button>
        <button
          onClick={() => setViewMode('users')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            viewMode === 'users'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <UserIcon className="h-4 w-4 inline mr-2" />
          Public Collections ({publicUsers.length})
        </button>
        <button
          onClick={() => setViewMode('admiring')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            viewMode === 'admiring'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Star className="h-4 w-4 inline mr-2" />
          Admiring ({admiringCollections.length})
        </button>
        <button
          onClick={() => setViewMode('recent')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            viewMode === 'recent'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Eye className="h-4 w-4 inline mr-2" />
          Recently Added
        </button>
        <button
          onClick={() => setViewMode('trending')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            viewMode === 'trending'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Flame className="h-4 w-4 inline mr-2" />
          Trending Now
        </button>
        <button
          onClick={() => setViewMode('recommended')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            viewMode === 'recommended'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Star className="h-4 w-4 inline mr-2" />
          Recommended
        </button>
        <button
          onClick={() => setViewMode('bookmarks')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            viewMode === 'bookmarks'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <BookmarkCheck className="h-4 w-4 inline mr-2" />
          Bookmarks ({bookmarkedFigureIds.size})
        </button>
        <button
          onClick={() => setViewMode('toy-lines')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            viewMode === 'toy-lines'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Database className="h-4 w-4 inline mr-2" />
          Toy Lines
        </button>
      </div>

      {/* Search and Filters */}
      {viewMode !== 'users' && viewMode !== 'admiring' && viewMode !== 'trending' && viewMode !== 'toy-lines' && (
        <div className="mb-6 flex gap-3 items-start flex-wrap">
          <Input
            placeholder="Search figures, accessories, notes, custom fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md flex-1"
          />
          <FilterSheet
            filters={filters}
            onFilterChange={setFilters}
            manufacturers={uniqueManufacturers}
            categories={uniqueCategories}
            conditions={uniqueConditions}
            sizes={uniqueSizes}
            packaging={uniquePackaging}
            productLines={uniqueProductLines}
            locations={uniqueLocations}
            figures={allPublicFigures}
          />
          <Button
            onClick={handleRandomFigure}
            variant="outline"
            title="Discover a random figure"
          >
            <Shuffle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Random Figure</span>
          </Button>
        </div>
      )}

      {/* Content */}
      {viewMode === 'users' || viewMode === 'admiring' || viewMode === 'recommended' ? (
        // Users List View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(() => {
            const usersToShow = viewMode === 'admiring'
              ? admiringCollections
              : viewMode === 'recommended'
              ? recommendedUsers.map(rec => ({...rec.user, figureCount: 0, recommendation: rec}))
              : publicUsers;

            if (usersToShow.length === 0) {
              return (
                <div className="col-span-full py-12">
                  <div className="flex flex-col items-start gap-3">
                    <UserIcon className="h-12 w-12 text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {viewMode === 'admiring'
                        ? "You're not admiring any collections yet"
                        : 'No public collections yet'}
                    </p>
                  </div>
                </div>
              );
            }

            return usersToShow.map((user: any) => {
              const userId = user.userId || user.id;
              const isAdmiring = admiringUserIds.includes(userId);
              const hasPending = pendingRequestUserIds.includes(userId);
              const admirerCount = admirerCounts.get(userId) || 0;
              const isSelf = userId === currentUser.id;

              return (
                <div
                  key={userId}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {user.profileImage ? (
                        <img
                          src={user.profileImage}
                          alt={user.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {user.displayName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        @{user.username}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {user.figureCount || user.count || 0} figure{(user.figureCount || user.count) !== 1 ? 's' : ''} in collection
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      {admirerCount} admirer{admirerCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        if (isSelf && setCurrentPage) {
                          // If viewing own collection, navigate to Gallery page
                          setCurrentPage('gallery');
                        } else {
                          // If viewing someone else's collection, filter browse page
                          setViewMode('all');
                          setSearchQuery(user.username); // Use username for filtering

                          // Track profile view when user clicks to view someone's collection
                          try {
                            await ViewTrackingService.trackProfileView(userId, currentUser.id);
                          } catch (error) {
                            console.error('Failed to track profile view:', error);
                          }
                        }
                      }}
                    >
                      View Collection
                    </Button>

                    {!isSelf && (
                      <div className="flex gap-2 justify-center">
                        {isAdmiring ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                            onClick={() => handleStopAdmiring(userId)}
                            title="Stop admiring"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        ) : hasPending ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                            onClick={() => handleCancelRequest(userId)}
                            title="Cancel request"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                            onClick={() => handleRequestToAdmire(userId)}
                            title="Request to admire"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                          onClick={() => handleReportUser(userId, user.username)}
                          title="Report user"
                        >
                          <Flag className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => handleBlockUser(userId, user.username)}
                          title="Block user"
                        >
                          <ShieldOff className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      ) : viewMode === 'toy-lines' ? (
        // Toy Lines View
        selectedToyLine ? (
          <ToyLineDetail
            toyLine={selectedToyLine}
            currentUser={currentUser}
            onBack={() => setSelectedToyLine(null)}
            onAddFigure={handleAddFromToyLine}
            onSuggestFigure={() => setSuggestionModalOpen(true)}
          />
        ) : (
          <ToyLineDatabaseTab
            currentUser={currentUser}
            onSelectToyLine={setSelectedToyLine}
          />
        )
      ) : (
        // Figures Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredFigures.length === 0 ? (
            <div className="col-span-full py-12">
              <div className="flex flex-col items-start gap-3">
                <Package className="h-12 w-12 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No figures found matching your search' : 'No public figures available'}
                </p>
              </div>
            </div>
          ) : (
            filteredFigures.map((figure) => {
              const mainImage = figure.images && figure.images.length > 0
                ? figure.images[figure.mainImageIndex ?? 0]
                : null;

              return (
                <div
                  key={figure.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex flex-col"
                  onClick={() => handleFigureClick(figure)}
                >
                  {/* Image */}
                  {mainImage ? (
                    <div className="relative w-full h-36 bg-gray-100 dark:bg-gray-700">
                      <WatermarkedImage
                        src={mainImage}
                        alt={figure.name}
                        watermarkText="SAMPLE"
                        ownerId={figure.userId}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: figure.imagePosition || 'center center' }}
                      />
                      {/* Bookmark button */}
                      <button
                        onClick={(e) => handleToggleBookmark(e, figure.id, figure.name, mainImage)}
                        className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10"
                        title={bookmarkedFigureIds.has(figure.id) ? 'Remove bookmark' : 'Bookmark this figure'}
                      >
                        {bookmarkedFigureIds.has(figure.id) ? (
                          <BookmarkCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Bookmark className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                      {figure.images && figure.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                          +{figure.images.length - 1} more
                        </div>
                      )}
                      {/* For Sale/For Trade badges */}
                      {figure.availability && figure.availability.length > 0 && (
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          {figure.availability.includes('for-sale') && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-600 text-white shadow">
                              For Sale
                            </span>
                          )}
                          {figure.availability.includes('for-trade') && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-600 text-white shadow">
                              For Trade
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative w-full h-36 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-400" />
                      {/* Bookmark button */}
                      <button
                        onClick={(e) => handleToggleBookmark(e, figure.id, figure.name)}
                        className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10"
                        title={bookmarkedFigureIds.has(figure.id) ? 'Remove bookmark' : 'Bookmark this figure'}
                      >
                        {bookmarkedFigureIds.has(figure.id) ? (
                          <BookmarkCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Bookmark className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                      {/* For Sale/For Trade badges */}
                      {figure.availability && figure.availability.length > 0 && (
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          {figure.availability.includes('for-sale') && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-600 text-white shadow">
                              For Sale
                            </span>
                          )}
                          {figure.availability.includes('for-trade') && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-600 text-white shadow">
                              For Trade
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate">
                      {figure.name}
                      {figure.version && (
                        <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">({figure.version})</span>
                      )}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-2">
                      {figure.manufacturer && <p className="truncate">Manufacturer: {figure.manufacturer}</p>}
                      {figure.category && <p className="truncate">Category: {figure.category}</p>}
                      <p className="truncate">Condition: {figure.condition === 'MIB' ? 'MIB (Mint in Box)' : figure.condition}</p>
                    </div>

                    {/* Push value to bottom */}
                    <div className="mt-auto mb-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Value: ${figure.currentValue.toFixed(2)}
                      </p>
                    </div>

                    {/* Owner & Availability */}
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {figure.ownerName}
                        </span>
                      </div>

                      {/* Jealousy Meter */}
                      {figure.userId && (() => {
                        const jealousyScore = figureJealousyScores.get(figure.id) || 0;
                        const stats = figureJealousyStats.get(figure.id) || { appreciate: 0, love: 0, fire: 0, total: 0 };
                        const userReaction = figureUserReactions.get(figure.id);
                        const showBox = jealousyScore > 0 || userReaction;

                        if (showBox) {
                          // Determine background color based on user's reaction
                          let bgClass = "bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-700";
                          if (userReaction === 'appreciate') {
                            bgClass = "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-700/50";
                          } else if (userReaction === 'love') {
                            bgClass = "bg-pink-50 dark:bg-pink-900/10 border-pink-200 dark:border-pink-700/50";
                          } else if (userReaction === 'fire') {
                            bgClass = "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-700/50";
                          }

                          return (
                            <div className={`mt-1 rounded p-1.5 border ${bgClass}`}>
                              <div className="flex items-center justify-between">
                                {/* Left side: Envious icon + total score + individual counts */}
                                <div className="flex items-center gap-1 text-[10px]">
                                  {jealousyScore > 0 && (
                                    <>
                                      <Eye className="h-2.5 w-2.5 text-green-500" />
                                      <span className="font-semibold text-green-700 dark:text-green-400">
                                        {jealousyScore}
                                      </span>
                                    </>
                                  )}
                                  {stats.fire > 0 && (
                                    <>
                                      <Flame className="h-2.5 w-2.5 text-orange-500 ml-1" />
                                      <span className="text-orange-600 dark:text-orange-400 font-medium">
                                        {stats.fire}
                                      </span>
                                    </>
                                  )}
                                  {stats.love > 0 && (
                                    <>
                                      <Heart className="h-2.5 w-2.5 text-pink-500 ml-1" />
                                      <span className="text-pink-600 dark:text-pink-400 font-medium">
                                        {stats.love}
                                      </span>
                                    </>
                                  )}
                                  {stats.appreciate > 0 && (
                                    <>
                                      <ThumbsUp className="h-2.5 w-2.5 text-blue-500 ml-1" />
                                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                                        {stats.appreciate}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {/* Right side: My reaction */}
                                {userReaction && (
                                  <div className="flex items-center">
                                    {userReaction === 'fire' && <Flame className="h-2.5 w-2.5 text-orange-600 dark:text-orange-400" />}
                                    {userReaction === 'love' && <Heart className="h-2.5 w-2.5 text-pink-600 dark:text-pink-400" />}
                                    {userReaction === 'appreciate' && <ThumbsUp className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Figure Detail Modal */}
      {selectedFigure && (
        <Dialog open={!!selectedFigure} onOpenChange={handleCloseDetail}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedFigure.name}</DialogTitle>
              <DialogDescription className="flex flex-col gap-2">
                <span>Owned by {selectedFigure.ownerName} (@{selectedFigure.ownerUsername})</span>
                <div className="flex flex-wrap gap-2">
                  {selectedFigure.userId && (
                    <UserRatingBadge userId={selectedFigure.userId} size="md" />
                  )}
                  <ResponseTimeBadge responseTimeHours={responseTime} />
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Images */}
              {selectedFigure.images && selectedFigure.images.length > 0 ? (
                <div className="relative">
                  {/* Main Image */}
                  <div className="relative h-96 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <WatermarkedImage
                      src={selectedFigure.images[currentImageIndex]}
                      alt={`${selectedFigure.name} - Image ${currentImageIndex + 1}`}
                      watermarkText="SAMPLE"
                      ownerId={selectedFigure.userId}
                      className="w-full h-full object-contain"
                    />
                    {currentImageIndex === (selectedFigure.mainImageIndex ?? 0) && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        Main Image
                      </div>
                    )}
                  </div>

                  {/* Image navigation */}
                  {selectedFigure.images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? selectedFigure.images!.length - 1 : prev - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => (prev === selectedFigure.images!.length - 1 ? 0 : prev + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs">
                        {currentImageIndex + 1} / {selectedFigure.images.length}
                      </div>
                    </>
                  )}

                  {/* Thumbnails */}
                  {selectedFigure.images.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {selectedFigure.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                            idx === currentImageIndex
                              ? 'border-blue-600'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <img
                            src={img}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-96 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400">No images available</p>
                </div>
              )}

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Manufacturer</Label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedFigure.manufacturer || '-'}</p>
                </div>
                <div>
                  <Label>Category</Label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedFigure.category || '-'}</p>
                </div>
                <div>
                  <Label>Condition</Label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedFigure.condition}</p>
                </div>
                <div>
                  <Label>Size</Label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedFigure.size || '-'}</p>
                </div>
                <div>
                  <Label>Packaging</Label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedFigure.packaging || '-'}</p>
                </div>
                <div>
                  <Label>Value</Label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ${selectedFigure.currentValue.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Product Line */}
              {selectedFigure.productLine && (
                <div>
                  <Label>Product Line</Label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedFigure.productLine}</p>
                </div>
              )}

              {/* Notes */}
              {selectedFigure.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{selectedFigure.notes}</p>
                </div>
              )}

              {/* Availability */}
              {selectedFigure.availability && selectedFigure.availability.length > 0 && (
                <div>
                  <Label>Availability</Label>
                  <div className="flex gap-2 mt-1">
                    {selectedFigure.availability.includes('for-sale') && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        For Sale
                      </span>
                    )}
                    {selectedFigure.availability.includes('for-trade') && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        For Trade
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Reactions */}
              <div className="border-t pt-4">
                <Label className="mb-3 block">React to this figure</Label>
                <div className="flex gap-3">
                  <Button
                    onClick={(e) => {
                      console.log('[BROWSE] Appreciate button clicked');
                      e.stopPropagation();
                      handleReact('appreciate');
                    }}
                    variant={currentReaction === 'appreciate' ? 'default' : 'outline'}
                    className={`flex-1 ${currentReaction === 'appreciate' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Appreciate
                    {jealousyStats.appreciate > 0 && (
                      <span className="ml-2 font-bold">{jealousyStats.appreciate}</span>
                    )}
                  </Button>
                  <Button
                    onClick={(e) => {
                      console.log('[BROWSE] Love button clicked');
                      e.stopPropagation();
                      handleReact('love');
                    }}
                    variant={currentReaction === 'love' ? 'default' : 'outline'}
                    className={`flex-1 ${currentReaction === 'love' ? 'bg-pink-600 hover:bg-pink-700' : ''}`}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Love
                    {jealousyStats.love > 0 && (
                      <span className="ml-2 font-bold">{jealousyStats.love}</span>
                    )}
                  </Button>
                  <Button
                    onClick={(e) => {
                      console.log('[BROWSE] Fire button clicked');
                      e.stopPropagation();
                      handleReact('fire');
                    }}
                    variant={currentReaction === 'fire' ? 'default' : 'outline'}
                    className={`flex-1 ${currentReaction === 'fire' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                  >
                    <Flame className="h-4 w-4 mr-2" />
                    Fire
                    {jealousyStats.fire > 0 && (
                      <span className="ml-2 font-bold">{jealousyStats.fire}</span>
                    )}
                  </Button>
                </div>
                {jealousyStats.total > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    {jealousyStats.total} {jealousyStats.total === 1 ? 'reaction' : 'reactions'} from others
                  </p>
                )}

                {/* Jealousy Meter */}
                {selectedFigure.userId && jealousyScore > 0 && (
                  <div className="mt-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Flame className="h-5 w-5 text-orange-500" />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Jealousy Meter
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                        {jealousyScore}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {jealousyStats.fire > 0 && (
                        <span className="flex items-center gap-1 text-orange-700 dark:text-orange-300 font-medium">
                          <Flame className="h-4 w-4" />
                          {jealousyStats.fire} × 5 = {jealousyStats.fire * 5}
                        </span>
                      )}
                      {jealousyStats.love > 0 && (
                        <span className="flex items-center gap-1 text-pink-700 dark:text-pink-300 font-medium">
                          <Heart className="h-4 w-4" />
                          {jealousyStats.love} × 3 = {jealousyStats.love * 3}
                        </span>
                      )}
                      {jealousyStats.appreciate > 0 && (
                        <span className="flex items-center gap-1 text-blue-700 dark:text-blue-300 font-medium">
                          <ThumbsUp className="h-4 w-4" />
                          {jealousyStats.appreciate} × 1 = {jealousyStats.appreciate * 1}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                      This figure makes others jealous! 🔥
                    </p>
                  </div>
                )}
              </div>

              {/* Trade/Sale Request Buttons */}
              {selectedFigure.userId && selectedFigure.userId !== currentUser.id && selectedFigure.availability && (
                <div className="border-t pt-4">
                  <div className="flex gap-2 mb-2">
                    {selectedFigure.availability.includes('for-trade') && (
                      <Button
                        onClick={() => {
                          setTradeRequestMode('trade');
                          setTradeRequestOpen(true);
                        }}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        <Repeat className="h-4 w-4 mr-2" />
                        Request Trade
                      </Button>
                    )}
                    {selectedFigure.availability.includes('for-sale') && (
                      <Button
                        onClick={() => {
                          setTradeRequestMode('sale');
                          setTradeRequestOpen(true);
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Make Offer
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="border-t pt-6 mt-6">
                <CommentsSection
                  figureId={selectedFigure.id}
                  currentUser={currentUser}
                  figureOwnerId={selectedFigure.userId!}
                  figure={selectedFigure}
                  onFigureUpdate={(updates) => {
                    // Update selected figure with new comment settings
                    setSelectedFigure(prev => prev ? { ...prev, ...updates } : null);
                  }}
                />
              </div>

              {/* Contact and Action Buttons */}
              <div className="border-t pt-4 mt-4 flex gap-2">
                {/* Show Admire button only if not your own figure */}
                {selectedFigure.userId && selectedFigure.userId !== currentUser.id && (() => {
                  const isAdmiring = admiringUserIds.includes(selectedFigure.userId);
                  const hasPendingRequest = pendingRequestUserIds.includes(selectedFigure.userId);

                  if (isAdmiring) {
                    return (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStopAdmiring(selectedFigure.userId!);
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Admiring
                      </Button>
                    );
                  } else if (hasPendingRequest) {
                    return (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelRequest(selectedFigure.userId!);
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Request Pending
                      </Button>
                    );
                  } else {
                    return (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestToAdmire(selectedFigure.userId!);
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Request to Admire
                      </Button>
                    );
                  }
                })()}
                {/* Show Contact button only if not your own figure */}
                {selectedFigure.userId && selectedFigure.userId !== currentUser.id && (
                  <Button onClick={handleContactOwner} className="flex-1">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact {selectedFigure.ownerName}
                  </Button>
                )}
                <Button onClick={handleCloseDetail} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>

              {/* Block and Report Buttons */}
              {selectedFigure.userId && selectedFigure.userId !== currentUser.id && (
                <div className="border-t pt-4 flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      handleCloseDetail();
                      handleReportUser(selectedFigure.userId!, selectedFigure.ownerName);
                    }}
                    variant="outline"
                    size="icon"
                    className="border-orange-200 dark:border-orange-800 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                    title="Report User"
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      handleCloseDetail();
                      handleBlockUser(selectedFigure.userId!, selectedFigure.ownerName);
                    }}
                    variant="outline"
                    size="icon"
                    className="border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    title="Block User"
                  >
                    <ShieldOff className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Send a message to {selectedFigure?.ownerName} about {selectedFigure?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={messageForm.subject}
                onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                placeholder="What's this about?"
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={messageForm.message}
                onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                placeholder="Your message..."
                rows={6}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSendMessage} className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button onClick={() => setMessageDialogOpen(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Trade Request Dialog */}
      {selectedFigure && (
        <TradeRequestDialog
          open={tradeRequestOpen}
          onClose={() => setTradeRequestOpen(false)}
          requestedFigure={selectedFigure}
          currentUser={currentUser}
          mode={tradeRequestMode}
        />
      )}

      {/* Figure Suggestion Modal */}
      {selectedToyLine && (
        <FigureSuggestionModal
          toyLine={selectedToyLine}
          currentUser={currentUser}
          open={suggestionModalOpen}
          onClose={() => setSuggestionModalOpen(false)}
          onSubmitted={() => {
            // Could refresh toy line data if needed
            toastManager.success('Suggestion submitted successfully!');
          }}
        />
      )}
    </div>
  );
}

export default BrowsePage;

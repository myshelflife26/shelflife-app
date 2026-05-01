import { useState, useMemo, useEffect } from 'react';
import { FirebaseStorage } from '../utils/firebaseStorage';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import { FirebaseMessagesService } from '../utils/firebaseMessages';
import { ReactionsService } from '../utils/reactions';
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
import { Search, User as UserIcon, Package, Eye, Mail, X, ThumbsUp, Heart, Flame, Star, UserPlus, UserMinus, Clock, ShieldOff, Flag, ChevronLeft, ChevronRight, Repeat, DollarSign, Shuffle, Bookmark, BookmarkCheck } from 'lucide-react';
import { WatermarkedImage } from './ImageOverlay';
import { BlockReasonDialog } from './BlockReasonDialog';
import { ReportReasonDialog } from './ReportReasonDialog';
import { TradeRequestDialog } from './TradeRequestDialog';
import { UserRatingBadge } from './UserRatingBadge';
import { FilterSheet } from './FilterSheet';
import { ResponseTimeBadge } from './ResponseTimeBadge';
import { BookmarksService } from '../utils/bookmarks';

interface BrowsePageProps {
  currentUser: User;
  setCurrentPage?: (page: 'collection' | 'feed' | 'settings' | 'users' | 'gallery' | 'browse' | 'messages' | 'blocked' | 'reports') => void;
  initialUserId?: string | null;
  onClearInitialUserId?: () => void;
}

type ViewMode = 'all' | 'users' | 'recent' | 'admiring' | 'bookmarks';

export function BrowsePage({ currentUser, setCurrentPage, initialUserId, onClearInitialUserId }: BrowsePageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
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
  const [refreshKey, setRefreshKey] = useState(0);
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

  // Load bookmarks on mount
  useEffect(() => {
    const bookmarks = BookmarksService.getBookmarkedFigureIds();
    setBookmarkedFigureIds(new Set(bookmarks));
  }, []);

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
      } catch (error) {
        console.error('Failed to load public figures:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPublicFigures();
  }, [currentUser.id, refreshKey]);

  // Handle initial user filter from feed
  useEffect(() => {
    if (initialUserId) {
      const loadUsers = async () => {
        const allUsers = await FirebaseAuthService.getAllUsers();
        const targetUser = allUsers.find(u => u.id === initialUserId);
        if (targetUser) {
          setViewMode('all');
          setSearchQuery(targetUser.displayName);
        }
        // Clear the initial user ID after using it
        if (onClearInitialUserId) {
          onClearInitialUserId();
        }
      };
      loadUsers();
    }
  }, [initialUserId, onClearInitialUserId]);

  // Get users with public collections (TODO: Update to use Firebase)
  const publicUsers = useMemo(() => {
    return [];
  }, [currentUser.id, refreshKey]);

  // Get collections you're admiring (TODO: Update to use Firebase)
  const admiringCollections = useMemo(() => {
    return [];
  }, [currentUser.id, refreshKey]);

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
  const handleFigureClick = (figure: ActionFigure & { ownerName: string; ownerUsername: string; ownerDisplayName: string }) => {
    setSelectedFigure(figure);
    setCurrentImageIndex(figure.mainImageIndex ?? 0);
    // Load reaction data
    loadReactionData(figure.id);
  };

  // Handle close detail modal
  const handleCloseDetail = () => {
    setSelectedFigure(null);
    setCurrentReaction(null);
    setReactionStats({ appreciate: 0, love: 0, fire: 0, total: 0 });
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
  const loadReactionData = (figureId: string) => {
    const stats = ReactionsService.getStatsForFigure(figureId);
    setReactionStats(stats);

    const userReaction = ReactionsService.getUserReaction(figureId, currentUser.id);
    setCurrentReaction(userReaction?.reactionType || null);
  };

  // Handle reaction
  const handleReact = (reactionType: ReactionType) => {
    if (!selectedFigure) return;

    if (currentReaction === reactionType) {
      // Remove reaction if clicking same one
      ReactionsService.removeReaction(selectedFigure.id, currentUser.id);
      setCurrentReaction(null);
    } else {
      // Add or update reaction
      ReactionsService.react(
        selectedFigure.id,
        currentUser.id,
        currentUser.displayName,
        reactionType
      );
      setCurrentReaction(reactionType);
    }

    // Reload stats
    loadReactionData(selectedFigure.id);
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
      </div>

      {/* Search and Filters */}
      {viewMode !== 'users' && viewMode !== 'admiring' && (
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
      {viewMode === 'users' || viewMode === 'admiring' ? (
        // Users List View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(() => {
            const usersToShow = viewMode === 'admiring' ? admiringCollections : publicUsers;

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
                      {user.count || user.admirerCount || 0} figure{(user.count || user.admirerCount) !== 1 ? 's' : ''} in collection
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
                      onClick={() => {
                        if (isSelf && setCurrentPage) {
                          // If viewing own collection, navigate to Gallery page
                          setCurrentPage('gallery');
                        } else {
                          // If viewing someone else's collection, filter browse page
                          setViewMode('all');
                          setSearchQuery(user.displayName);
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
                        const jealousyScore = ReactionsService.getJealousyScore(figure.id, figure.userId);
                        const stats = ReactionsService.getJealousyStats(figure.id, figure.userId);
                        const userHasReacted = {
                          fire: ReactionsService.hasReacted(figure.id, figure.userId, currentUser.id, 'fire'),
                          love: ReactionsService.hasReacted(figure.id, figure.userId, currentUser.id, 'love'),
                          appreciate: ReactionsService.hasReacted(figure.id, figure.userId, currentUser.id, 'appreciate')
                        };
                        const showBox = jealousyScore > 0 || userHasReacted.fire || userHasReacted.love || userHasReacted.appreciate;

                        if (showBox) {
                          return (
                            <div className="mt-1 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded p-1.5 border border-purple-200 dark:border-purple-800">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <Flame className="h-2.5 w-2.5 text-orange-500" />
                                  <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                                    {jealousyScore}
                                  </span>
                                  {stats.fire > 0 && (
                                    <span className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400">
                                      <Flame className="h-2.5 w-2.5" />
                                      {stats.fire}
                                    </span>
                                  )}
                                  {stats.love > 0 && (
                                    <span className="flex items-center gap-0.5 text-pink-600 dark:text-pink-400">
                                      <Heart className="h-2.5 w-2.5" />
                                      {stats.love}
                                    </span>
                                  )}
                                  {stats.appreciate > 0 && (
                                    <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                                      <ThumbsUp className="h-2.5 w-2.5" />
                                      {stats.appreciate}
                                    </span>
                                  )}
                                </div>
                                {(userHasReacted.fire || userHasReacted.love || userHasReacted.appreciate) && (
                                  <div className="flex items-center gap-0.5">
                                    {userHasReacted.fire && <Flame className="h-2.5 w-2.5 text-orange-600 dark:text-orange-400 fill-current" />}
                                    {userHasReacted.love && <Heart className="h-2.5 w-2.5 text-pink-600 dark:text-pink-400 fill-current" />}
                                    {userHasReacted.appreciate && <ThumbsUp className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400 fill-current" />}
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
                  {/* TODO: Calculate actual response time from message history */}
                  <ResponseTimeBadge responseTimeHours={null} />
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
                      e.stopPropagation();
                      handleReact('appreciate');
                    }}
                    variant={currentReaction === 'appreciate' ? 'default' : 'outline'}
                    className={`flex-1 ${currentReaction === 'appreciate' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Appreciate
                    {reactionStats.appreciate > 0 && (
                      <span className="ml-2 font-bold">{reactionStats.appreciate}</span>
                    )}
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReact('love');
                    }}
                    variant={currentReaction === 'love' ? 'default' : 'outline'}
                    className={`flex-1 ${currentReaction === 'love' ? 'bg-pink-600 hover:bg-pink-700' : ''}`}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Love
                    {reactionStats.love > 0 && (
                      <span className="ml-2 font-bold">{reactionStats.love}</span>
                    )}
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReact('fire');
                    }}
                    variant={currentReaction === 'fire' ? 'default' : 'outline'}
                    className={`flex-1 ${currentReaction === 'fire' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                  >
                    <Flame className="h-4 w-4 mr-2" />
                    Fire
                    {reactionStats.fire > 0 && (
                      <span className="ml-2 font-bold">{reactionStats.fire}</span>
                    )}
                  </Button>
                </div>
                {reactionStats.total > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    {reactionStats.total} {reactionStats.total === 1 ? 'reaction' : 'reactions'} total
                  </p>
                )}

                {/* Jealousy Meter */}
                {selectedFigure.userId && (() => {
                  const jealousyScore = ReactionsService.getJealousyScore(selectedFigure.id, selectedFigure.userId);
                  const jealousyStats = ReactionsService.getJealousyStats(selectedFigure.id, selectedFigure.userId);

                  if (jealousyScore > 0) {
                    return (
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
                              {jealousyStats.appreciate} × 1 = {jealousyStats.appreciate}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          This figure makes others jealous! 🔥
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
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

              {/* Contact and Action Buttons */}
              <div className="border-t pt-4 flex gap-2">
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
    </div>
  );
}

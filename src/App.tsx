import { useState, useMemo, useEffect } from 'react';
import type { ActionFigure, Filters } from './types/index';
import type { User } from './types/user';
import { Storage } from './utils/storage';
import { SettingsService } from './utils/settings';
import { FirebaseAuthService } from './utils/firebaseAuth';
import { FirebaseStorage } from './utils/firebaseStorage';
import { ReactionsService } from './utils/reactions';
import { MasterFiguresService } from './utils/masterFigures';
import { PendingDeletionsService } from './utils/pendingDeletions';
import { PendingCustomFieldDeletionsService } from './utils/pendingCustomFieldDeletions';
import { ValueTrackingService } from './utils/valueTracking';
import { JealousyTrackingService } from './utils/jealousyTracking';
import { MilestonesService } from './utils/milestones';
import { ShelfLifeValueService } from './utils/shelfLifeValue';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Checkbox } from './components/ui/checkbox';
import { Moon, Sun, Plus, Database, Pencil, Trash2, Settings, Home, User as UserIcon, Grid, List, BarChart3, Package, Check, Images, LogOut, Shield, Clock, Eye, EyeOff, Search, Mail, Flame, Heart, ThumbsUp, TrendingUp, Store } from 'lucide-react';
import { sampleFigures } from './data/sampleData';
import { FigureForm } from './components/FigureForm';
import { TabbedSettingsPage } from './components/TabbedSettingsPage';
import { BlockedUsersPage } from './components/BlockedUsersPage';
import { AdminReportsPage } from './components/AdminReportsPage';
import { UserManagementPage } from './components/UserManagementPage';
import { BrowsePage } from './components/BrowsePage';
import { MessagesPage } from './components/MessagesPage';
import { MarketplacePage } from './components/MarketplacePage';
import { FilterSheet } from './components/FilterSheet';
import { TableView } from './components/TableView';
import { StatsView } from './components/StatsView';
import { ExportImportMenu } from './components/ExportImportMenu';
import { GalleryPage } from './components/GalleryPage';
import { Pagination } from './components/Pagination';
import { LoginPage } from './components/LoginPage';
import { ProfileImageEditor } from './components/ProfileImageEditor';
import { FirebaseMessagesService } from './utils/firebaseMessages';
import { BlockingService } from './utils/blocking';
import { MarketplaceService } from './utils/marketplaceService';
import { Logo } from './components/Logo';
import { UserRatingBadge } from './components/UserRatingBadge';
import { BrandedFooter } from './components/BrandedFooter';
import { FeedPage } from './components/FeedPage';
import { BetaGuidePage } from './components/BetaGuidePage';
import ToastContainer from './components/ToastContainer';
import { toastManager } from './utils/toastManager';
import { NotificationsService } from './utils/notificationsService';

type PageType = 'collection' | 'feed' | 'settings' | 'browse' | 'messages' | 'blocked' | 'reports' | 'help' | 'marketplace';
type ViewMode = 'grid' | 'table' | 'stats' | 'images';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [figures, setFigures] = useState<ActionFigure[]>([]);
  const [masterFigures, setMasterFigures] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageType>('collection');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [profileImageEditorOpen, setProfileImageEditorOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [browseInitialUserId, setBrowseInitialUserId] = useState<string | null>(null);
  const [editingFigure, setEditingFigure] = useState<ActionFigure | undefined>(undefined);
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
    isComplete: 'all',
    completenessRange: undefined,
    saleTradeStatuses: [],
    customFields: {},
  });
  const [selectedFigureIds, setSelectedFigureIds] = useState<Set<string>>(new Set());
  const [adminViewingUserId, setAdminViewingUserId] = useState<string>(''); // Admin can view other users' collections
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [admirerRequestCount, setAdmirerRequestCount] = useState(0);
  const [blockedUserCount, setBlockedUserCount] = useState(0);
  const [activeTradeCount, setActiveTradeCount] = useState(0);
  const [paginationPage, setPaginationPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Check authentication on mount with Firebase
  useEffect(() => {
    const unsubscribe = FirebaseAuthService.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        // Load user's figures from Firebase
        const userFigures = await FirebaseStorage.getFigures(user.id);
        setFigures(userFigures);
      } else {
        setFigures([]);
      }
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  // Periodic session validation (check every minute)
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      if (!FirebaseAuthService.isAuthenticated()) {
        // Session expired, logout user
        setCurrentUser(null);
        setFigures([]);
        setSelectedFigureIds(new Set());
        setCurrentPage('collection');
        alert('Your session has expired. Please login again.');
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [currentUser]);

  // Load all users (for admin dropdown)
  useEffect(() => {
    if (currentUser?.role === 'management') {
      const loadUsers = async () => {
        const users = await FirebaseAuthService.getAllUsers();
        setAllUsers(users);
      };
      loadUsers();
    }
  }, [currentUser]);

  // Load figures when user changes
  useEffect(() => {
    if (currentUser) {
      loadFigures();
    }
  }, [currentUser]);

  // Load master figures database
  useEffect(() => {
    const loadMasterFigures = async () => {
      try {
        const masters = await MasterFiguresService.getAll();
        setMasterFigures(masters);
      } catch (error) {
        console.error('Failed to load master figures:', error);
      }
    };
    loadMasterFigures();
  }, []);

  // Record value tracking snapshots and check milestones when figures change
  useEffect(() => {
    if (currentUser && figures.length > 0) {
      const totalValue = figures.reduce((sum, f) => sum + f.currentValue, 0);
      ValueTrackingService.recordSnapshot(currentUser.id, totalValue, figures.length);

      // Also record jealousy snapshots for public figures
      const publicFigures = figures
        .filter(f => f.isPublic || currentUser.collectionPublic)
        .map(f => ({ id: f.id, userId: f.userId || currentUser.id }));

      if (publicFigures.length > 0) {
        JealousyTrackingService.recordSnapshots(publicFigures);
      }

      // Check for newly unlocked milestones
      const newlyUnlocked = MilestonesService.checkAndUnlock(currentUser.id, figures);

      // Show toast notifications for newly unlocked milestones
      newlyUnlocked.forEach(milestone => {
        toastManager.success(
          `Milestone Unlocked: ${milestone.name}`,
          `${milestone.description}`
        );
      });
    }
  }, [figures, currentUser]);

  // Load sample data
  const loadSampleData = async () => {
    if (!currentUser) return;

    try {
      // Import sample figures to Firebase
      await FirebaseStorage.importFigures(currentUser.id, sampleFigures);
      await loadFigures();
    } catch (error) {
      console.error('Failed to load sample data:', error);
      alert('Failed to load sample data. Please try again.');
    }
  };

  // Handle import completion
  const handleImportComplete = async (importedFigures: ActionFigure[]) => {
    if (!currentUser) return;

    try {
      // Import all figures to Firebase
      await FirebaseStorage.importFigures(currentUser.id, importedFigures);

      // Add each imported figure to master database
      for (const figure of importedFigures) {
        await MasterFiguresService.addFromUserFigure(
          {
            name: figure.name,
            version: figure.version,
            year: figure.year,
            series: figure.series,
            productLine: figure.productLine,
            subProductLine: figure.subProductLine,
            manufacturer: figure.manufacturer,
            category: figure.category,
            size: figure.size,
            packaging: figure.packaging,
            imageUrl: figure.images?.[figure.mainImageIndex || 0]
          },
          currentUser.id,
          currentUser.displayName,
          'import'
        );
      }

      toastManager.success(`Successfully imported ${importedFigures.length} figures!`);
      loadFigures();
    } catch (error) {
      console.error('Failed to import figures:', error);
      toastManager.error('Failed to import figures');
    }
  };

  // Handle save figure (add or edit)
  const handleSaveFigure = async (figure: Omit<ActionFigure, 'id'>) => {
    if (!currentUser) return;

    try {
      if (editingFigure) {
        await FirebaseStorage.updateFigure(editingFigure.id, figure);
      } else {
        await FirebaseStorage.addFigure(currentUser.id, figure);

        // Add to master database (only when creating new figure, not editing)
        await MasterFiguresService.addFromUserFigure(
          {
            name: figure.name,
            version: figure.version,
            year: figure.year,
            series: figure.series,
            productLine: figure.productLine,
            subProductLine: figure.subProductLine,
            manufacturer: figure.manufacturer,
            category: figure.category,
            size: figure.size,
            packaging: figure.packaging,
            imageUrl: figure.images?.[figure.mainImageIndex || 0]
          },
          currentUser.id,
          currentUser.displayName,
          'user'
        );
      }

      // Reload figures
      const userFigures = await FirebaseStorage.getFigures(currentUser.id);
      setFigures(userFigures);
      setEditingFigure(undefined);
    } catch (error) {
      console.error('Failed to save figure:', error);
      alert('Failed to save figure. Please try again.');
    }
  };

  // Open add figure form
  const handleAddFigure = () => {
    setEditingFigure(undefined);
    setFormOpen(true);
  };

  // Open edit figure form
  const handleEditFigure = (figure: ActionFigure) => {
    // Prevent editing when admin is viewing another user's collection
    // (Button should be disabled, but this is a safety check)
    if (currentUser?.role === 'management' && adminViewingUserId) {
      return;
    }
    setEditingFigure(figure);
    setFormOpen(true);
  };

  // Close form
  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingFigure(undefined);
  };

  // Login handler
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Migration happens in useEffect after user is set
    loadFigures();
  };

  // Logout handler
  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await FirebaseAuthService.logout();
      setCurrentUser(null);
      setFigures([]);
      setSelectedFigureIds(new Set());
      setCurrentPage('collection');
    }
  };

  // Profile image handler
  const handleProfileImageSave = async (imageData: string | null) => {
    if (!currentUser) return;

    await FirebaseAuthService.updateProfileImage(currentUser.id, imageData);

    // Update current user state
    const updatedUser = { ...currentUser, profileImage: imageData || undefined };
    setCurrentUser(updatedUser);
  };

  // Load figures (handles admin viewing other users)
  const loadFigures = async () => {
    if (!currentUser) return;

    try {
      const userId = (currentUser.role === 'management' && adminViewingUserId)
        ? adminViewingUserId
        : currentUser.id;

      const userFigures = await FirebaseStorage.getFigures(userId);
      setFigures(userFigures);
    } catch (error) {
      console.error('Failed to load figures:', error);
    }
  };

  // Reload figures when admin changes viewed user
  useEffect(() => {
    if (currentUser) {
      loadFigures();
    }
  }, [adminViewingUserId, currentUser]);

  // Delete figure
  const handleDeleteFigure = async (figure: ActionFigure) => {
    if (!currentUser) return;

    const isAdmin = currentUser.role === 'management';
    const isDeletingOtherUser = isAdmin && adminViewingUserId && adminViewingUserId !== currentUser.id;

    const confirmMessage = isDeletingOtherUser
      ? `[ADMIN ACTION] Delete "${figure.name}" from another user's collection? This action cannot be undone.`
      : `Are you sure you want to delete "${figure.name}"?`;

    if (confirm(confirmMessage)) {
      try {
        await FirebaseStorage.deleteFigure(figure.id);

        // Reload figures
        const userId = adminViewingUserId || currentUser.id;
        const userFigures = await FirebaseStorage.getFigures(userId);
        setFigures(userFigures);
      } catch (error) {
        console.error('Failed to delete figure:', error);
        alert('Failed to delete figure. Please try again.');
      }
    }
  };

  // Delayed delete (Admin only)
  const handleDelayedDelete = (figure: ActionFigure) => {
    const isAdmin = currentUser?.role === 'management';
    if (!isAdmin || !adminViewingUserId) return;

    const reason = prompt(`Schedule "${figure.name}" for deletion in 2 hours?\n\nEnter reason (optional):`);

    if (reason !== null) { // User clicked OK (even if empty string)
      const userId = adminViewingUserId;
      PendingDeletionsService.scheduleDeletion(figure, userId, reason || undefined);
      alert(`Figure "${figure.name}" has been scheduled for deletion in 2 hours.\n\nThe user will be notified via email.`);
    }
  };

  // Periodic check for executing scheduled deletions
  useEffect(() => {
    // Execute immediately on load
    PendingDeletionsService.executeScheduledDeletions();
    PendingCustomFieldDeletionsService.executeScheduledDeletions();

    // Then check every minute
    const interval = setInterval(() => {
      const executed = PendingDeletionsService.executeScheduledDeletions();
      const executedFields = PendingCustomFieldDeletionsService.executeScheduledDeletions();

      if (executed > 0) {
        console.log(`Executed ${executed} scheduled figure deletion(s)`);
        loadFigures(); // Refresh the list
      }
      if (executedFields > 0) {
        console.log(`Executed ${executedFields} scheduled custom field deletion(s)`);
        // Custom fields will be refreshed automatically when settings page is viewed
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Check for unread messages
  useEffect(() => {
    if (!currentUser) return;

    const updateUnreadCount = async () => {
      const count = await FirebaseMessagesService.getUnreadCount(currentUser.id);
      setUnreadMessageCount(count);
    };

    // Update immediately
    updateUnreadCount();

    // Then check every 30 seconds
    const interval = setInterval(updateUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Check for new notifications and update admirer request count
  useEffect(() => {
    if (!currentUser) return;

    const checkNotifications = async () => {
      // Update admirer request badge count
      const count = await NotificationsService.getPendingAdmirerRequestCount(currentUser.id);
      setAdmirerRequestCount(count);

      // Update blocked user count
      setBlockedUserCount(BlockingService.getBlockedCount(currentUser.id));

      // Check for new notifications
      const notifications = await NotificationsService.detectAllNewNotifications(currentUser.id);

      // Show toast for each new notification
      notifications.forEach(notification => {
        switch (notification.type) {
          case 'admirerRequest':
            toastManager.info(notification.message);
            break;
          case 'reaction':
            toastManager.success(notification.message);
            break;
          case 'newFigure':
            toastManager.info(notification.message);
            break;
        }
      });
    };

    // Check immediately
    checkNotifications();

    // Then check every 30 seconds (matching message polling)
    const interval = setInterval(checkNotifications, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle tab visibility to prevent stale notifications
  useEffect(() => {
    if (!currentUser) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible - update last-seen timestamps to prevent flood
        NotificationsService.updateLastSeen(currentUser.id, 'admirerRequests');
        NotificationsService.updateLastSeen(currentUser.id, 'reactions');
        NotificationsService.updateLastSeen(currentUser.id, 'figures');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  // Check for active trades
  useEffect(() => {
    if (!currentUser) return;

    const updateActiveTradeCount = async () => {
      const trades = await MarketplaceService.getUserTrades(currentUser.id);
      // Count trades where user needs to respond (pending or countered status)
      const activeTrades = trades.filter(trade =>
        trade.status === 'pending' || trade.status === 'countered'
      );
      setActiveTradeCount(activeTrades.length);
    };

    // Update immediately
    updateActiveTradeCount();

    // Then check every 30 seconds (matching message and notification polling)
    const interval = setInterval(updateActiveTradeCount, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Selection handlers
  const handleToggleSelect = (figureId: string) => {
    setSelectedFigureIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(figureId)) {
        newSet.delete(figureId);
      } else {
        newSet.add(figureId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allFilteredIds = new Set(filteredFigures.map(f => f.id));
    setSelectedFigureIds(allFilteredIds);
  };

  const handleDeselectAll = () => {
    setSelectedFigureIds(new Set());
  };

  // Bulk privacy actions
  const handleMakePublic = async () => {
    if (selectedFigureIds.size === 0) return;

    const confirmMessage = `Make ${selectedFigureIds.size} selected figure${selectedFigureIds.size > 1 ? 's' : ''} public?\n\nThese figures will be visible to all users in the Browse section.`;

    if (confirm(confirmMessage)) {
      await FirebaseStorage.setPublicMany(Array.from(selectedFigureIds), true);
      loadFigures();
      setSelectedFigureIds(new Set());
    }
  };

  const handleMakePrivate = async () => {
    if (selectedFigureIds.size === 0) return;

    const confirmMessage = `Make ${selectedFigureIds.size} selected figure${selectedFigureIds.size > 1 ? 's' : ''} private?\n\nThese figures will no longer be visible to other users.`;

    if (confirm(confirmMessage)) {
      await FirebaseStorage.setPublicMany(Array.from(selectedFigureIds), false);
      loadFigures();
      setSelectedFigureIds(new Set());
    }
  };

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Filter figures
  const filteredFigures = useMemo(() => {
    return figures.filter(figure => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const customFormulaParts = figure.customFormula ? Object.values(figure.customFormula).filter(Boolean).join(' ') : '';
        const searchableText = [
          figure.name,
          figure.manufacturer,
          figure.category,
          figure.location,
          figure.notes,
          customFormulaParts,
        ].join(' ').toLowerCase();

        if (!searchableText.includes(searchLower)) {
          return false;
        }
      }

      // Other filters
      if (filters.manufacturers.length > 0 && !filters.manufacturers.includes(figure.manufacturer)) {
        return false;
      }
      if (filters.categories.length > 0 && !filters.categories.includes(figure.category)) {
        return false;
      }
      if (filters.conditions.length > 0 && !filters.conditions.includes(figure.condition)) {
        return false;
      }
      if (figure.currentValue < filters.priceRange[0] || figure.currentValue > filters.priceRange[1]) {
        return false;
      }
      if (filters.dateRange[0] && figure.purchaseDate < filters.dateRange[0]) {
        return false;
      }
      if (filters.dateRange[1] && figure.purchaseDate > filters.dateRange[1]) {
        return false;
      }
      if (filters.sizes.length > 0 && !filters.sizes.includes(figure.size || '')) {
        return false;
      }
      if (filters.packaging.length > 0 && !filters.packaging.includes(figure.packaging || '')) {
        return false;
      }
      if (filters.productLines.length > 0 && !filters.productLines.includes(figure.productLine || '')) {
        return false;
      }
      if (filters.locations.length > 0 && !filters.locations.includes(figure.location || '')) {
        return false;
      }
      if (filters.isComplete && filters.isComplete !== 'all') {
        if (filters.isComplete === 'yes' && !figure.isComplete) {
          return false;
        }
        if (filters.isComplete === 'no' && figure.isComplete) {
          return false;
        }
      }
      // Completeness percentage filter (for accessories)
      if (filters.completenessRange) {
        const completeness = figure.completenessPercentage ?? 100;
        if (completeness < filters.completenessRange[0] || completeness > filters.completenessRange[1]) {
          return false;
        }
      }
      if (filters.saleTradeStatuses.length > 0) {
        const figureAvailability = figure.availability || [];
        // Check if figure has any of the filtered statuses
        const hasMatch = filters.saleTradeStatuses.some(status => figureAvailability.includes(status));
        if (!hasMatch) {
          return false;
        }
      }
      // Custom field filters
      if (filters.customFields) {
        for (const [fieldId, selectedValues] of Object.entries(filters.customFields)) {
          if (selectedValues.length > 0) {
            const figureValue = figure.customFields?.[fieldId];
            const figureValueStr = figureValue !== undefined && figureValue !== null ? String(figureValue) : '';
            if (!selectedValues.includes(figureValueStr)) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }, [figures, filters]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPaginationPage(1);
  }, [filters, figures]);

  // Paginate filtered figures
  const paginatedFigures = useMemo(() => {
    const startIndex = (paginationPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredFigures.slice(startIndex, endIndex);
  }, [filteredFigures, paginationPage, pageSize]);

  // Get selected figures
  const selectedFigures = useMemo(() => {
    return figures.filter(f => selectedFigureIds.has(f.id));
  }, [figures, selectedFigureIds]);

  // Extract unique values for filtering
  const uniqueManufacturers = useMemo(() =>
    [...new Set(figures.map(f => f.manufacturer))].filter(Boolean).sort(),
    [figures]
  );

  const uniqueCategories = useMemo(() =>
    [...new Set(figures.map(f => f.category))].filter(Boolean).sort(),
    [figures]
  );

  const uniqueConditions = useMemo(() =>
    SettingsService.getSettings().conditionOptions,
    []
  );

  const uniqueSizes = useMemo(() =>
    [...new Set(figures.map(f => f.size))].filter(Boolean).sort(),
    [figures]
  );

  const uniquePackaging = useMemo(() =>
    [...new Set(figures.map(f => f.packaging))].filter(Boolean).sort(),
    [figures]
  );

  const uniqueProductLines = useMemo(() =>
    [...new Set(figures.map(f => f.productLine))].filter(Boolean).sort(),
    [figures]
  );

  const uniqueLocations = useMemo(() =>
    [...new Set(figures.map(f => f.location))].filter(Boolean).sort(),
    [figures]
  );

  // Show login page if not authenticated
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Desktop Header - Single Row */}
          <div className="hidden sm:flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentPage('collection')}
                className="hover:opacity-80 transition-opacity"
                title="Go to My Collection"
              >
                <Logo size="md" />
              </button>
              <div className="hidden md:block border-l border-gray-300 dark:border-gray-600 h-8"></div>
              <h1 className="hidden md:block text-xl font-semibold text-gray-900 dark:text-white">
                {currentPage === 'collection' && 'My Collection'}
                {currentPage === 'feed' && 'Feed'}
                {currentPage === 'browse' && 'Browse Collections'}
                {currentPage === 'marketplace' && 'Marketplace'}
                {currentPage === 'messages' && 'Messages'}
                {currentPage === 'settings' && 'Settings'}
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant={currentPage === 'collection' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setCurrentPage('collection')}
                title="My Collection"
              >
                <Home className="h-5 w-5" />
              </Button>
              <Button
                variant={currentPage === 'feed' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setCurrentPage('feed')}
                title="Feed"
              >
                <TrendingUp className="h-5 w-5" />
              </Button>
              <Button
                variant={currentPage === 'browse' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setCurrentPage('browse')}
                title="Browse Public Collections"
              >
                <Search className="h-5 w-5" />
              </Button>
              <Button
                variant={currentPage === 'marketplace' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setCurrentPage('marketplace')}
                title="Marketplace"
                className="relative"
              >
                <Store className="h-5 w-5" />
                {activeTradeCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {activeTradeCount}
                  </span>
                )}
              </Button>
              <Button
                variant={currentPage === 'messages' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setCurrentPage('messages')}
                title="Messages"
                className="relative"
              >
                <Mail className="h-5 w-5" />
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {unreadMessageCount}
                  </span>
                )}
              </Button>
              <Button
                variant={currentPage === 'settings' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setCurrentPage('settings')}
                title="Settings"
                className="relative"
              >
                <Settings className="h-5 w-5" />
                {admirerRequestCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {admirerRequestCount}
                  </span>
                )}
                {blockedUserCount > 0 && (
                  <span className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {blockedUserCount}
                  </span>
                )}
              </Button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-8 mx-2"></div>
              <div className="flex items-center gap-2">
                {/* Profile Image */}
                <button
                  onClick={() => setProfileImageEditorOpen(true)}
                  className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
                  title="Edit profile image"
                >
                  {currentUser.profileImage ? (
                    <img
                      src={currentUser.profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {currentUser.displayName}
                    </span>
                    {currentUser.role === 'management' && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                    {currentUser.role === 'manager' && (
                      <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
                        Manager
                      </span>
                    )}
                  </div>
                  <UserRatingBadge userId={currentUser.id} size="sm" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Header - Two Rows */}
          <div className="sm:hidden space-y-2 mb-3">
            {/* Row 1: Logo and Page Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage('collection')}
                className="hover:opacity-80 transition-opacity"
                title="Go to My Collection"
              >
                <Logo size="sm" />
              </button>
              <div className="flex gap-0.5">
                <Button
                  variant={currentPage === 'collection' ? 'default' : 'ghost'}
                  className="h-7 w-7 p-0"
                  onClick={() => setCurrentPage('collection')}
                  title="My Collection"
                >
                  <Home className="h-3 w-3" />
                </Button>
                <Button
                  variant={currentPage === 'feed' ? 'default' : 'ghost'}
                  className="h-7 w-7 p-0"
                  onClick={() => setCurrentPage('feed')}
                  title="Feed"
                >
                  <TrendingUp className="h-3 w-3" />
                </Button>
                <Button
                  variant={currentPage === 'browse' ? 'default' : 'ghost'}
                  className="h-7 w-7 p-0"
                  onClick={() => setCurrentPage('browse')}
                  title="Browse"
                >
                  <Search className="h-3 w-3" />
                </Button>
                <Button
                  variant={currentPage === 'marketplace' ? 'default' : 'ghost'}
                  className="relative h-7 w-7 p-0"
                  onClick={() => setCurrentPage('marketplace')}
                  title="Marketplace"
                >
                  <Store className="h-3 w-3" />
                  {activeTradeCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1 py-0.5 rounded-full min-w-[1rem] text-center">
                      {activeTradeCount}
                    </span>
                  )}
                </Button>
                <Button
                  variant={currentPage === 'messages' ? 'default' : 'ghost'}
                  className="relative h-7 w-7 p-0"
                  onClick={() => setCurrentPage('messages')}
                  title="Messages"
                >
                  <Mail className="h-3 w-3" />
                  {unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1 py-0.5 rounded-full min-w-[1rem] text-center">
                      {unreadMessageCount}
                    </span>
                  )}
                </Button>
                <Button
                  variant={currentPage === 'settings' ? 'default' : 'ghost'}
                  className="relative h-7 w-7 p-0"
                  onClick={() => setCurrentPage('settings')}
                  title="Settings"
                >
                  <Settings className="h-3 w-3" />
                  {(admirerRequestCount > 0 || blockedUserCount > 0) && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold px-1 py-0.5 rounded-full min-w-[1rem] text-center">
                      {admirerRequestCount + blockedUserCount}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Row 2: User Account */}
            <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={() => setProfileImageEditorOpen(true)}
                  className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
                  title="Edit profile"
                >
                  {currentUser.profileImage ? (
                    <img
                      src={currentUser.profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-3 h-3 text-gray-400" />
                  )}
                </button>
                <div className="flex flex-col items-start">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {currentUser.displayName}
                  </span>
                  <UserRatingBadge userId={currentUser.id} size="sm" />
                </div>
                <Button
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={handleLogout}
                  title="Logout"
                >
                  <LogOut className="h-3 w-3" />
                </Button>
            </div>
          </div>

          {currentPage === 'collection' && (
            <>
              {/* Row 1: Search and View Controls */}
              <div className="flex flex-wrap gap-3 items-center">
                {/* Admin: View other users' collections */}
                {currentUser.role === 'management' && (
                  <div className="w-32 sm:min-w-[200px]">
                    <select
                      value={adminViewingUserId}
                      onChange={(e) => setAdminViewingUserId(e.target.value)}
                      className="w-full px-1 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">My Collection</option>
                      {allUsers.filter(u => u.id !== currentUser.id).map(user => (
                        <option key={user.id} value={user.id}>
                          {user.displayName} ({user.username})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="relative flex-1 min-w-[150px] sm:min-w-[200px]">
                  <Input
                    placeholder="Search..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>

                <div className="flex gap-1 border border-gray-300 dark:border-gray-600 rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                    title="Grid View"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="rounded-none"
                    title="Table View"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'stats' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('stats')}
                    className="rounded-none"
                    title="Statistics View"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'images' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('images')}
                    className="rounded-l-none"
                    title="Image Gallery"
                  >
                    <Images className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  onClick={handleAddFigure}
                  disabled={currentUser.role === 'management' && !!adminViewingUserId}
                  title={currentUser.role === 'management' && adminViewingUserId ? "Cannot add figures to another user's collection" : "Add a new figure"}
                  className="whitespace-nowrap"
                >
                  + Figure
                </Button>
              </div>

              {/* Row 2: Filter, Export, and Selection Controls */}
              <div className="flex flex-wrap gap-3 items-center">
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
                  figures={figures}
                />

                <ExportImportMenu
                  onImport={handleImportComplete}
                  selectedFigures={selectedFigures}
                  allFigures={figures}
                />

                {selectedFigureIds.size > 0 ? (
                  <>
                    <Button onClick={handleDeselectAll} variant="outline" size="sm" className="whitespace-nowrap">
                      <span className="hidden sm:inline">Deselect All ({selectedFigureIds.size})</span>
                      <span className="sm:hidden">({selectedFigureIds.size})</span>
                    </Button>
                    <div className="border-l border-gray-300 dark:border-gray-600 h-8 mx-1"></div>
                    <Button
                      onClick={handleMakePublic}
                      variant="outline"
                      size="sm"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                      title="Make selected figures visible to other users"
                    >
                      <Eye className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Make Public</span>
                    </Button>
                    <Button
                      onClick={handleMakePrivate}
                      variant="outline"
                      size="sm"
                      className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                      title="Make selected figures private (only you can see)"
                    >
                      <EyeOff className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Make Private</span>
                    </Button>
                  </>
                ) : filteredFigures.length > 0 && (
                  <Button onClick={handleSelectAll} variant="outline" size="sm" className="whitespace-nowrap">
                    <span className="hidden sm:inline">Select All</span>
                    <span className="sm:hidden">Select</span>
                  </Button>
                )}
              </div>

              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredFigures.length} of {figures.length} figures
                {selectedFigureIds.size > 0 && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                    • {selectedFigureIds.size} selected
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {currentPage === 'settings' ? (
        <TabbedSettingsPage currentUser={currentUser} setCurrentPage={setCurrentPage} darkMode={darkMode} setDarkMode={setDarkMode} />
      ) : currentPage === 'blocked' ? (
        <BlockedUsersPage />
      ) : currentPage === 'reports' ? (
        <AdminReportsPage
          currentUser={currentUser}
          onNavigateBack={() => setCurrentPage('collection')}
        />
      ) : currentPage === 'help' ? (
        <BetaGuidePage />
      ) : currentPage === 'feed' ? (
        <FeedPage
          currentUser={currentUser}
          onNavigateToBrowse={(userId) => {
            setBrowseInitialUserId(userId);
            setCurrentPage('browse');
          }}
        />
      ) : currentPage === 'browse' ? (
        <BrowsePage
          currentUser={currentUser}
          setCurrentPage={setCurrentPage}
          initialUserId={browseInitialUserId}
          onClearInitialUserId={() => setBrowseInitialUserId(null)}
        />
      ) : currentPage === 'messages' ? (
        <MessagesPage currentUser={currentUser} />
      ) : currentPage === 'marketplace' ? (
        <MarketplacePage currentUser={currentUser} />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Admin viewing another user's collection notification */}
        {currentUser.role === 'management' && adminViewingUserId && (
          <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
                  Admin View Mode: Viewing {allUsers.find(u => u.id === adminViewingUserId)?.displayName}'s Collection
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  You can delete inappropriate figures but cannot add or edit figures in other users' collections.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top 5 Jealousy Section - Only show if user has figures with jealousy scores */}
        {figures.length > 0 && (() => {
          const topJealousyFigures = figures
            .filter(f => f.isPublic)
            .map(figure => {
              const userId = currentUser.role === 'management' && adminViewingUserId ? adminViewingUserId : currentUser.id;
              const score = ReactionsService.getJealousyScore(figure.id, userId);
              return { figure, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

          if (topJealousyFigures.length === 0) return null;

          return (
            <div className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border-2 border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 flex-shrink-0" />
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white whitespace-nowrap">Your Top 5 Most Jealous Figures</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                These are your most envied figures based on community reactions
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {topJealousyFigures.map(({ figure, score }, index) => {
                  const mainImage = figure.images && figure.images.length > 0
                    ? figure.images[figure.mainImageIndex ?? 0]
                    : null;

                  return (
                    <div
                      key={figure.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative"
                      onClick={() => {
                        setEditingFigure(figure);
                        setFormOpen(true);
                      }}
                    >
                      {/* Image */}
                      {mainImage ? (
                        <div className="relative h-36 bg-gray-100 dark:bg-gray-700">
                          <img
                            src={mainImage}
                            alt={figure.name}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: figure.imagePosition || 'center center' }}
                          />
                          {/* Rank badge */}
                          <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                            #{index + 1}
                          </div>
                          {/* Jealousy badge */}
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                            <Flame className="h-3 w-3" />
                            {score}
                          </div>
                        </div>
                      ) : (
                        <div className="relative h-36 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <Package className="h-12 w-12 text-gray-400" />
                          {/* Rank badge */}
                          <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                            #{index + 1}
                          </div>
                          {/* Jealousy badge */}
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                            <Flame className="h-3 w-3" />
                            {score}
                          </div>
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                          {figure.name}
                        </h3>
                        {figure.year && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                            {figure.year}
                          </p>
                        )}
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                          <p className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-gray-500">My Value:</span>
                            <span className="font-medium">${figure.currentValue.toFixed(2)}</span>
                          </p>
                          {(() => {
                            const slValue = ShelfLifeValueService.calculateShelfLifeValue(figure);
                            if (slValue !== null) {
                              return (
                                <p className="flex items-center justify-between">
                                  <span className="text-blue-600 dark:text-blue-400">SL Value:</span>
                                  <span className="font-medium text-blue-600 dark:text-blue-400">${slValue.toFixed(2)}</span>
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                            {score} jealousy pts
                          </span>
                          {(() => {
                            const userId = currentUser.role === 'management' && adminViewingUserId ? adminViewingUserId : currentUser.id;
                            const stats = ReactionsService.getJealousyStats(figure.id, userId);
                            return (
                              <div className="flex items-center gap-1">
                                {stats.fire > 0 && (
                                  <span className="flex items-center gap-0.5 text-xs text-orange-600 dark:text-orange-400">
                                    <Flame className="h-3 w-3" />
                                    {stats.fire}
                                  </span>
                                )}
                                {stats.love > 0 && (
                                  <span className="flex items-center gap-0.5 text-xs text-pink-600 dark:text-pink-400">
                                    <Heart className="h-3 w-3" />
                                    {stats.love}
                                  </span>
                                )}
                                {stats.appreciate > 0 && (
                                  <span className="flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400">
                                    <ThumbsUp className="h-3 w-3" />
                                    {stats.appreciate}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {figures.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <Logo size="lg" showTagline={true} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Welcome to your collection!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start building your collection by adding your first figure, or explore with sample data
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleAddFigure}
                disabled={currentUser.role === 'management' && !!adminViewingUserId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Figure
              </Button>
              <Button
                onClick={loadSampleData}
                variant="outline"
                disabled={currentUser.role === 'management' && !!adminViewingUserId}
              >
                <Database className="h-4 w-4 mr-2" />
                Load Sample Data
              </Button>
            </div>
          </div>
        ) : viewMode === 'stats' ? (
          <StatsView figures={filteredFigures} />
        ) : viewMode === 'images' ? (
          <GalleryPage
            figures={filteredFigures}
            filters={filters}
            onFilterChange={setFilters}
            manufacturers={uniqueManufacturers}
            categories={uniqueCategories}
            conditions={uniqueConditions}
            sizes={uniqueSizes}
            packaging={uniquePackaging}
            productLines={uniqueProductLines}
            locations={uniqueLocations}
          />
        ) : viewMode === 'grid' ? (
          <>
            <Pagination
              currentPage={paginationPage}
              totalItems={filteredFigures.length}
              pageSize={pageSize}
              onPageChange={setPaginationPage}
              onPageSizeChange={setPageSize}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
              {paginatedFigures.map((figure) => {
              const mainImage = figure.images && figure.images.length > 0
                ? figure.images[figure.mainImageIndex ?? 0]
                : null;

              return (
                <div
                  key={figure.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex flex-col"
                  onClick={() => handleEditFigure(figure)}
                >
                  {/* Image Section */}
                  {mainImage ? (
                    <div className="relative w-full h-36 bg-gray-100 dark:bg-gray-700">
                      <img
                        src={mainImage}
                        alt={figure.name}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: figure.imagePosition || 'center center' }}
                      />
                      {/* Checkbox overlay */}
                      <div className="absolute top-2 left-2 bg-white dark:bg-gray-800 rounded p-1 shadow">
                        <Checkbox
                          checked={selectedFigureIds.has(figure.id)}
                          onCheckedChange={() => handleToggleSelect(figure.id)}
                          aria-label={`Select ${figure.name}`}
                        />
                      </div>
                      {/* Privacy badge */}
                      {figure.isPublic && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 shadow">
                          <Eye className="h-3 w-3" />
                          Public
                        </div>
                      )}
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
                      {/* Checkbox overlay */}
                      <div className="absolute top-2 left-2 bg-white dark:bg-gray-800 rounded p-1 shadow">
                        <Checkbox
                          checked={selectedFigureIds.has(figure.id)}
                          onCheckedChange={() => handleToggleSelect(figure.id)}
                          aria-label={`Select ${figure.name}`}
                        />
                      </div>
                      {/* Privacy badge */}
                      {figure.isPublic && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 shadow">
                          <Eye className="h-3 w-3" />
                          Public
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
                  )}

                  {/* Content Section */}
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-2">
                      {figure.name}
                      {figure.version && (
                        <span className="ml-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {figure.version}
                        </span>
                      )}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-2">
                      {figure.productLine && <p>Product Line: {figure.productLine}</p>}
                      {figure.year && <p>Year: {figure.year}</p>}
                      <p>Condition: {figure.condition}</p>
                      {figure.size && <p>Size: {figure.size}</p>}
                    </div>

                    {/* Bottom section - always at bottom */}
                    <div className="mt-auto space-y-1">
                      <div className="text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-500">My Value:</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            ${figure.currentValue.toFixed(2)}
                          </p>
                        </div>
                        {(() => {
                          const slValue = ShelfLifeValueService.calculateShelfLifeValue(figure);
                          if (slValue !== null) {
                            return (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-blue-600 dark:text-blue-400">SL Value:</span>
                                <p className="font-medium text-blue-600 dark:text-blue-400">
                                  ${slValue.toFixed(2)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="flex items-center justify-end pt-1">
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditFigure(figure);
                            }}
                            disabled={currentUser.role === 'management' && !!adminViewingUserId}
                            title={currentUser.role === 'management' && adminViewingUserId ? "Cannot edit other users' figures" : "Edit figure"}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {/* Show delayed delete button for admin viewing other user's collection */}
                          {currentUser.role === 'management' && adminViewingUserId && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelayedDelete(figure);
                              }}
                              title="Schedule deletion (2 hours + email warning)"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFigure(figure);
                            }}
                            title={currentUser.role === 'management' && adminViewingUserId ? "Delete immediately (sensitive content)" : "Delete figure"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Jealousy Meter */}
                      {figure.isPublic && (() => {
                        const jealousyScore = ReactionsService.getJealousyScore(figure.id, currentUser.id);
                        const stats = ReactionsService.getJealousyStats(figure.id, currentUser.id);

                        if (jealousyScore > 0) {
                          return (
                            <div className="mt-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-800">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                  <Flame className="h-3 w-3 text-orange-500" />
                                  Jealousy
                                </span>
                                <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                                  {jealousyScore}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                {stats.fire > 0 && (
                                  <span className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400">
                                    <Flame className="h-3 w-3" />
                                    {stats.fire}
                                  </span>
                                )}
                                {stats.love > 0 && (
                                  <span className="flex items-center gap-0.5 text-pink-600 dark:text-pink-400">
                                    <Heart className="h-3 w-3" />
                                    {stats.love}
                                  </span>
                                )}
                                {stats.appreciate > 0 && (
                                  <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                                    <ThumbsUp className="h-3 w-3" />
                                    {stats.appreciate}
                                  </span>
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
            })}
            </div>
            <Pagination
              currentPage={paginationPage}
              totalItems={filteredFigures.length}
              pageSize={pageSize}
              onPageChange={setPaginationPage}
              onPageSizeChange={setPageSize}
            />
          </>
        ) : (
          <>
            <Pagination
              currentPage={paginationPage}
              totalItems={filteredFigures.length}
              pageSize={pageSize}
              onPageChange={setPaginationPage}
              onPageSizeChange={setPageSize}
            />
            <div className="mt-4">
              <TableView
              figures={paginatedFigures}
            onEdit={handleEditFigure}
            onDelete={handleDeleteFigure}
            onDelayedDelete={currentUser.role === 'management' && adminViewingUserId ? handleDelayedDelete : undefined}
            selectedIds={selectedFigureIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
            </div>
            <Pagination
              currentPage={paginationPage}
              totalItems={filteredFigures.length}
              pageSize={pageSize}
              onPageChange={setPaginationPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
        </main>
      )}

      {/* Figure Form Dialog */}
      <FigureForm
        open={formOpen}
        onClose={handleCloseForm}
        onSave={handleSaveFigure}
        figure={editingFigure}
        currentUser={currentUser}
      />

      {/* Profile Image Editor Dialog */}
      <ProfileImageEditor
        user={currentUser}
        open={profileImageEditorOpen}
        onClose={() => setProfileImageEditorOpen(false)}
        onSave={handleProfileImageSave}
      />

      {/* Branded Footer */}
      <BrandedFooter />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default App;

import { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import type { ActionFigure, Filters } from './types/index';
import type { User } from './types/user';
import { ArrayDebugger } from './utils/arrayDebugger';
import './utils/globalErrorHandler'; // Import for side effects
import { Storage } from './utils/storage';
import { SettingsService } from './utils/settings';
import { FirebaseAuthService } from './utils/firebaseAuth';
import { FirebaseStorage } from './utils/firebaseStorage';
import { ImageUploadService } from './utils/imageUploadService';
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
import { Moon, Sun, Plus, Database, Pencil, Trash2, Settings, Home, User as UserIcon, Grid, List, BarChart3, Package, Check, Images, LogOut, Shield, Clock, Eye, EyeOff, Search, Mail, Flame, Heart, ThumbsUp, TrendingUp, Store, Activity, Share2, Star, Upload, Bell, Flag } from 'lucide-react';
import { sampleFigures } from './data/sampleData';
import { FigureForm } from './components/FigureForm_Fixed';
import { OfflineNotification } from './components/OfflineNotification';
import { PrivacyConsentBanner } from './components/PrivacyConsentBanner';
// Service Worker import removed - completely disabled
import { privacyAnalytics, trackPageView, trackFeatureUsage, trackUserAction } from './utils/privacyAnalytics';
// Lazy load large page components
const TabbedSettingsPage = lazy(() => import('./components/TabbedSettingsPage'));
const BlockedUsersPage = lazy(() => import('./components/BlockedUsersPage'));
const AdminReportsPage = lazy(() => import('./components/AdminReportsPage'));
const UserManagementPage = lazy(() => import('./components/UserManagementPage'));
const MigrateReactionsButton = lazy(() => import('./components/MigrateReactionsButton'));
const BrowsePage = lazy(() => import('./components/BrowsePage'));
const MessagesPageNew = lazy(() => import('./components/MessagesPageNew'));
const MarketplacePage = lazy(() => import('./components/MarketplacePage'));
import { FilterSheet } from './components/FilterSheet';
import { TableView } from './components/TableView';
const StatsView = lazy(() => import('./components/StatsView'));
const ExportImportMenu = lazy(() => import('./components/ExportImportMenu'));
const GalleryPage = lazy(() => import('./components/GalleryPage'));
import { Pagination } from './components/Pagination';
import { LoginPage } from './components/LoginPage';
import { ProfileImageEditor } from './components/ProfileImageEditor';
import { FirebaseMessagesService } from './utils/firebaseMessages';
import { FirebaseConversationsService } from './utils/firebaseConversations';
import { BlockingService } from './utils/blocking';
import { MarketplaceService } from './utils/marketplaceService';
import { Logo } from './components/Logo';
import { UserRatingBadge } from './components/UserRatingBadge';
import { BrandedFooter } from './components/BrandedFooter';
const FeedPage = lazy(() => import('./components/FeedPage'));
const BetaGuidePage = lazy(() => import('./components/BetaGuidePage'));
const GlobalStatisticsPage = lazy(() => import('./components/GlobalStatisticsPage'));
const WishlistPage = lazy(() => import('./components/WishlistPage'));
const ShareCollectionDialog = lazy(() => import('./components/ShareCollectionDialog'));
const PriceTrend = lazy(() => import('./components/PriceTrend'));
const PriceAlertsPage = lazy(() => import('./components/PriceAlertsPage'));
import ToastContainer from './components/ToastContainer';
import { toastManager } from './utils/toastManager';
import { NotificationsService } from './utils/notificationsService';
const ShelvesPage = lazy(() => import('./components/ShelvesPage'));
const ShelfViewPage = lazy(() => import('./components/ShelfViewPage'));
const CollectionGrowthPage = lazy(() => import('./components/CollectionGrowthPage'));
const TopJealousFigures = lazy(() => import('./components/TopJealousFigures'));
const PublicProfilePage = lazy(() => import('./components/PublicProfilePage'));
const NotificationBell = lazy(() => import('./components/NotificationBell'));
const CommentReportsPage = lazy(() => import('./components/CommentReportsPage'));
import { CommentReportsService } from './utils/commentReports';
import { Grid3x3 } from 'lucide-react';
import { parseCSV, type ParsedFigure, type ParseResult } from './utils/csvParser';
import { OnboardingTour, useOnboardingTour, type TourStep } from './components/OnboardingTour';
import ErrorBoundary from './components/ErrorBoundary';
import './utils/errorHandler'; // Initialize global error handling

type PageType = 'collection' | 'feed' | 'settings' | 'browse' | 'messages' | 'blocked' | 'reports' | 'help' | 'marketplace';
type CollectionTab = 'collection' | 'table' | 'stats' | 'gallery' | 'alerts' | 'growth' | 'wishlist' | 'shelves' | 'import';

// Loading component for lazy-loaded components
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading...</span>
  </div>
);

function MainApp() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // Add loading state for auth
  const [error, setError] = useState<string>(''); // Add error state for login issues
  const [figures, setFigures] = useState<ActionFigure[]>([]);

  // Expose figures to window for debugging
  useEffect(() => {
    (window as any).currentFigures = figures;
  }, [figures]);
  const [masterFigures, setMasterFigures] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageType>('collection');
  const [collectionTab, setCollectionTab] = useState<CollectionTab>('collection');
  const [profileImageEditorOpen, setProfileImageEditorOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
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
  const [selectedFigureIds, setSelectedFigureIds] = useState<Set<string>>(new Set());
  const [adminViewingUserId, setAdminViewingUserId] = useState<string>(''); // Admin can view other users' collections
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [admirerRequestCount, setAdmirerRequestCount] = useState(0);
  const [blockedUserCount, setBlockedUserCount] = useState(0);
  const [activeTradeCount, setActiveTradeCount] = useState(0);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [commentReportsOpen, setCommentReportsOpen] = useState(false);
  const [paginationPage, setPaginationPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [viewingShelfId, setViewingShelfId] = useState<string | null>(null);
  const [wishlistDialogTrigger, setWishlistDialogTrigger] = useState(0);
  const [wishlistDialogOpen, setWishlistDialogOpen] = useState(false);
  const [importCsvData, setImportCsvData] = useState('');
  const [parsedImportData, setParsedImportData] = useState<ParseResult | null>(null);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [conditionOptions, setConditionOptions] = useState<string[]>([]);

  // Onboarding tour
  const [showOnboarding, markOnboardingComplete, resetOnboarding] = useOnboardingTour();

  const tourSteps: TourStep[] = [
    {
      target: '[data-tour="add-figure"]',
      title: 'Add Your First Figure',
      description: 'Click here to add action figures to your collection. You can add photos, details, and custom fields!',
      placement: 'bottom',
    },
    {
      target: '[data-tour="filters"]',
      title: 'Filter Your Collection',
      description: 'Use filters to quickly find figures by manufacturer, condition, price range, and more.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="stats"]',
      title: 'View Statistics',
      description: 'Check your collection stats including total value, completeness tracking, and trends.',
      placement: 'left',
    },
    {
      target: '[data-tour="browse"]',
      title: 'Browse Public Collections',
      description: 'Discover figures from other collectors, connect with the community, and find trades.',
      placement: 'left',
    },
    {
      target: '[data-tour="marketplace"]',
      title: 'Buy & Sell Figures',
      description: 'List your figures for sale or trade, and browse the marketplace for new additions.',
      placement: 'left',
    },
  ];

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await SettingsService.getSettings();
      setConditionOptions(settings.conditionOptions);
    };
    loadSettings();
  }, [currentUser?.id]);

  // Check authentication on mount with Firebase
  useEffect(() => {
    const unsubscribe = FirebaseAuthService.onAuthStateChanged((user) => {
      // Ultra-defensive auth state handler to prevent React crashes
      setTimeout(() => {
        try {
          console.log('[APP] Auth state changed, user:', user ? `${user.username} (${user.id})` : 'null');
          console.log('[APP] VERSION CHECK - This should be DJeF7smG or newer, not BZNzOWD7');

          // Detect user switching and force state reset
          if (user && currentUser && user.id !== currentUser.id) {
            console.log('[APP] User switch detected, forcing state reset');
            console.log(`[APP] Previous user: ${currentUser.username} (${currentUser.id})`);
            console.log(`[APP] New user: ${user.username} (${user.id})`);

            // Force complete state reset on user switch
            setCurrentUser(null);
            setFigures([]);
            setSelectedFigureIds(new Set());

            // Small delay to ensure React re-renders
            setTimeout(() => {
              setCurrentUser(user);
            }, 100);
            return;
          }

          // Extreme validation: check for any falsy or malformed values
          if (user !== null && user !== undefined) {
            // Validate all required user properties
            if (!user ||
                !user.id ||
                typeof user.id !== 'string' ||
                user.id.trim().length === 0 ||
                !user.username ||
                typeof user.username !== 'string' ||
                user.username.trim().length === 0 ||
                !user.displayName ||
                typeof user.displayName !== 'string') {

              console.error('[APP] Received malformed user object, treating as null:', JSON.stringify(user, null, 2));
              setCurrentUser(null);
              setFigures([]);
              setAuthLoading(false);
              return;
            }
          }

          // Set user state with extra safety
          try {
            console.log('[APP] Setting currentUser in React state:', user ? `${user.username} (${user.id})` : 'null');
            setCurrentUser(user);

            // Also set global for debugging
            if (typeof window !== 'undefined') {
              window.currentUser = user;
              console.log('[APP] Set window.currentUser for debugging:', window.currentUser ? window.currentUser.username : 'null');
            }
          } catch (setUserError) {
            console.error('[APP] Error setting current user:', setUserError instanceof Error ? setUserError.message : String(setUserError));
            setCurrentUser(null);
            setFigures([]);
            setAuthLoading(false);
            return;
          }

          if (user && user.id) {
            // Load user's figures from Firebase with timeout
            (async () => {
              try {
                console.log('[APP] Loading figures for user:', user.id);

                // Add timeout to prevent hanging
                const getFiguresPromise = FirebaseStorage.getFigures(user.id);
                const timeoutPromise = new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('getFigures timeout')), 15000)
                );

                const userFigures = await Promise.race([getFiguresPromise, timeoutPromise]);

                if (Array.isArray(userFigures)) {
                  setFigures(userFigures);
                } else {
                  console.warn('[APP] getFigures returned non-array:', userFigures);
                  setFigures([]);
                }
              } catch (figureError) {
                console.error('[APP] Failed to load user figures:', figureError instanceof Error ? figureError.message : String(figureError));
                setFigures([]); // Set empty array on error to prevent crashes
              }
            })();
          } else {
            console.log('[APP] No user, clearing figures');
            try {
              setFigures([]);
            } catch (setFiguresError) {
              console.error('[APP] Error clearing figures:', setFiguresError instanceof Error ? setFiguresError.message : String(setFiguresError));
            }
          }
        } catch (authError) {
          console.error('[APP] Critical error in auth state change handler:', authError instanceof Error ? authError.message : String(authError));
          try {
            setCurrentUser(null);
            setFigures([]);
          } catch (cleanupError) {
            console.error('[APP] Error during cleanup:', cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
          }
        } finally {
          // Always clear loading state once auth check is complete
          setAuthLoading(false);
        }
      }, 0); // Defer to next tick
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
        setAuthLoading(false);
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

  // Load master figures database (only when user is authenticated)
  useEffect(() => {
    if (!currentUser) return;

    const loadMasterFigures = async () => {
      try {
        const masters = await MasterFiguresService.getAll();
        setMasterFigures(masters);
      } catch (error) {
        console.error('Failed to load master figures:', error instanceof Error ? error.message : String(error));
      }
    };
    loadMasterFigures();
  }, [currentUser]);

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
      console.error('Failed to load sample data:', error instanceof Error ? error.message : String(error));
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
      console.error('Failed to import figures:', error instanceof Error ? error.message : String(error));
      toastManager.error('Failed to import figures');
    }
  };

  // Handle CSV parsing for preview
  const handleParseCSV = () => {
    if (!importCsvData.trim()) {
      toastManager.error('Please paste CSV data first');
      return;
    }

    const result = parseCSV(importCsvData);
    setParsedImportData(result);
    setShowImportPreview(true);

    if (result.success) {
      toastManager.success(`Parsed ${result.figures.length} figures successfully`);
    } else {
      toastManager.error(`Parse failed: ${result.errors.join(', ')}`);
    }
  };

  // Handle CSV import to user collection
  const handleImportCSV = async () => {
    if (!currentUser) return;
    if (!parsedImportData || !parsedImportData.success) {
      toastManager.error('Please parse CSV data first');
      return;
    }

    try {
      const figureCount = parsedImportData.figures.length;
      const confirm = window.confirm(
        `Import ${figureCount} figure${figureCount > 1 ? 's' : ''} to your collection?`
      );

      if (!confirm) return;

      // Convert parsed figures to ActionFigure format
      const importedFigures: Omit<ActionFigure, 'id'>[] = parsedImportData.figures.map(pf => ({
        name: pf.name,
        manufacturer: pf.manufacturer || 'Unknown',
        franchise: pf.franchise,
        series: pf.series || 'Unknown Series',
        category: pf.category || 'Action Figure',
        condition: 'Loose', // Default condition
        currentValue: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        location: '',
        notes: '',
        year: pf.year,
        version: pf.version,
        size: pf.size,
        productLine: pf.series, // Use series as productLine for compatibility
        subProductLine: pf.subProductLine,
        packaging: pf.packaging
      }));

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
            packaging: figure.packaging
          },
          currentUser.id,
          currentUser.displayName,
          'import'
        );
      }

      toastManager.success(`Successfully imported ${figureCount} figures!`);

      // Reset import state
      setImportCsvData('');
      setParsedImportData(null);
      setShowImportPreview(false);

      // Switch to collection view and reload
      setCollectionTab('collection');
      loadFigures();
    } catch (error) {
      console.error('Failed to import CSV:', error instanceof Error ? error.message : String(error));
      toastManager.error('Failed to import figures');
    }
  };

  // Handle save figure (add or edit)
  const handleSaveFigure = async (figure: Omit<ActionFigure, 'id'>) => {
    if (!currentUser) return;

    const isEditing = !!editingFigure;
    trackUserAction(isEditing ? 'figure_edited' : 'figure_created', 'form_submit', {
      hasImages: (figure.images && figure.images.length > 0),
      hasStoragePhoto: !!figure.storagePhoto,
      manufacturer: figure.manufacturer,
      condition: figure.condition,
    });

    try {
      // Upload images to Firebase Storage if they are base64 strings
      let imageUrls = figure.images || [];
      let storagePhotoUrl = figure.storagePhoto || '';
      const figureId = editingFigure?.id || `temp_${Date.now()}`;

      // Handle main images
      if (imageUrls.length > 0) {
        // Check if any images are base64 (not already URLs)
        const hasBase64Images = imageUrls.some(img => !ImageUploadService.isStorageUrl(img));

        if (hasBase64Images) {
          console.log('Uploading images to Firebase Storage...');
          // Upload base64 images and get URLs
          imageUrls = await ImageUploadService.migrateImagesToStorage(
            imageUrls,
            currentUser.id,
            figureId
          );
          console.log('Images uploaded successfully');
        }
      }

      // Handle storage photo
      if (storagePhotoUrl && !ImageUploadService.isStorageUrl(storagePhotoUrl)) {
        console.log('Uploading storage photo to Firebase Storage...');
        storagePhotoUrl = await ImageUploadService.uploadImage(
          storagePhotoUrl,
          currentUser.id,
          figureId,
          999 // Special index for storage photo
        );
        console.log('Storage photo uploaded successfully');
      }

      // Create figure object with URLs instead of base64
      const figureWithUrls = {
        ...figure,
        images: imageUrls,
        storagePhoto: storagePhotoUrl
      };

      if (editingFigure) {
        await FirebaseStorage.updateFigure(editingFigure.id, figureWithUrls);
      } else {
        await FirebaseStorage.addFigure(currentUser.id, figureWithUrls);

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
            imageUrl: imageUrls[figure.mainImageIndex || 0]
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
      console.error('Failed to save figure:', error instanceof Error ? error.message : String(error));
      alert('Failed to save figure. Please try again.');
    }
  };

  // Open add figure form
  const handleAddFigure = () => {
    trackUserAction('add_figure_clicked', 'fab_button');
    setEditingFigure(undefined);
    setFormOpen(true);
  };

  // Handle context-aware FAB click
  const handleFABClick = () => {
    if (collectionTab === 'wishlist') {
      // Trigger wishlist dialog
      setWishlistDialogTrigger(prev => prev + 1);
    } else {
      // Default: add figure
      handleAddFigure();
    }
  };

  // Get FAB button text based on context
  const getFABText = () => {
    if (collectionTab === 'wishlist') return 'Add to Wishlist';
    return 'Add Figure';
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

  // Login handler - Ultra defensive to prevent React crashes
  const handleLogin = (user: User) => {
    try {
      // Validate user object before setting state
      if (!user ||
          typeof user !== 'object' ||
          !user.id ||
          typeof user.id !== 'string' ||
          !user.username ||
          typeof user.username !== 'string' ||
          !user.displayName ||
          typeof user.displayName !== 'string') {

        console.error('[APP] handleLogin received invalid user object:', JSON.stringify(user, null, 2));
        setError('Login failed: Invalid user data received');
        setAuthLoading(false);
        return;
      }

      console.log('[APP] handleLogin: Setting valid user:', user.id);
      setCurrentUser(user);

      // Also set global for debugging
      if (typeof window !== 'undefined') {
        window.currentUser = user;
        console.log('[APP] handleLogin: Set window.currentUser for debugging:', window.currentUser.username);
      }

      setAuthLoading(false); // Ensure loading is cleared on manual login
      // Migration happens in useEffect after user is set
      loadFigures();
    } catch (loginError) {
      console.error('[APP] handleLogin error:', loginError instanceof Error ? loginError.message : String(loginError));
      setCurrentUser(null);
      setAuthLoading(false);
      setError('Login failed: Please try again');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await FirebaseAuthService.logout();
      setCurrentUser(null);
      setFigures([]);
      setSelectedFigureIds(new Set());
      setCurrentPage('collection');
      setAuthLoading(false); // Ensure loading is cleared on logout
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
      console.error('Failed to load figures:', error instanceof Error ? error.message : String(error));
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
        console.error('Failed to delete figure:', error instanceof Error ? error.message : String(error));
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
      const count = await FirebaseConversationsService.getTotalUnreadCount(currentUser.id);
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

      // Update pending comment reports count
      const reportsCount = await CommentReportsService.getPendingReportCount(currentUser.id);
      setPendingReportsCount(reportsCount);

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
          case 'priceAlert':
            // Show green for price increase, red for decrease
            if (notification.data?.changeAmount > 0) {
              toastManager.success(`📈 ${notification.message}`);
            } else {
              toastManager.error(`📉 ${notification.message}`);
            }
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

  const handleToggleFavorite = async (figureId: string) => {
    const figure = figures.find(f => f.id === figureId);
    if (!figure) return;

    await FirebaseStorage.updateFigure(figureId, {
      isFavorite: !figure.isFavorite
    });
    loadFigures();
  };

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Service Worker completely disabled - no cleanup needed
  useEffect(() => {
    // No service worker functionality
  }, []);

  // Analytics page tracking
  useEffect(() => {
    const pageTitle = `${currentPage === 'collection' ? 'My Collection' :
                       currentPage === 'feed' ? 'Feed' :
                       currentPage === 'browse' ? 'Browse Collections' :
                       currentPage === 'messages' ? 'Messages' :
                       currentPage === 'marketplace' ? 'Marketplace' :
                       currentPage === 'settings' ? 'Settings' : 'ShelfLife'}`;

    trackPageView(currentPage, pageTitle);
  }, [currentPage, collectionTab]);

  // Navigation wrapper with analytics
  const navigateToPage = (page: PageType, source?: string) => {
    trackUserAction('navigate', `${page}_page`, { from: currentPage, source });
    setCurrentPage(page);
  };

  // Dark mode toggle with analytics
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    trackFeatureUsage('theme', 'toggle_dark_mode', { enabled: newDarkMode });
    setDarkMode(newDarkMode);
  };

  // Collection tab change with analytics
  const changeCollectionTab = (tab: CollectionTab) => {
    trackFeatureUsage('collection', 'tab_change', { tab, from: collectionTab });
    setCollectionTab(tab);
  };

  // Filter figures
  const filteredFigures = useMemo(() => {
    try {
      console.log('🔍 Starting filteredFigures calculation with filters:', filters);
      console.log('🔍 Processing', figures.length, 'figures');

      return figures.filter(figure => {
        try {
          // Search filter
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const customFormulaParts = figure.customFormula ? Object.values(figure.customFormula).filter(Boolean).join(' ') : '';
            const searchableText = [
              figure.name || '',
              figure.manufacturer || '',
              figure.category || '',
              figure.location || '',
              figure.notes || '',
              customFormulaParts || '',
            ].join(' ').toLowerCase();

            if (!searchableText.includes(searchLower)) {
              return false;
            }
          }

          // Other filters with array safety
          if ((filters.manufacturers || []).length > 0 && figure.manufacturer && !(filters.manufacturers || []).includes(figure.manufacturer)) {
            return false;
          }
          if ((filters.categories || []).length > 0 && figure.category && !(filters.categories || []).includes(figure.category)) {
            return false;
          }
          if ((filters.conditions || []).length > 0 && figure.condition && !(filters.conditions || []).includes(figure.condition)) {
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
      if ((filters.sizes || []).length > 0 && !(filters.sizes || []).includes(figure.size || '')) {
        return false;
      }
      if ((filters.packaging || []).length > 0 && !(filters.packaging || []).includes(figure.packaging || '')) {
        return false;
      }
      if ((filters.productLines || []).length > 0 && !(filters.productLines || []).includes(figure.productLine || '')) {
        return false;
      }
      if ((filters.locations || []).length > 0 && !(filters.locations || []).includes(figure.location || '')) {
        return false;
      }
      // Advanced filters
      if ((filters.years || []).length > 0 && figure.year && !(filters.years || []).includes(figure.year)) {
        return false;
      }
      if ((filters.versions || []).length > 0 && !(filters.versions || []).includes(figure.version || '')) {
        return false;
      }
      if (filters.upc && figure.upc && !figure.upc.includes(filters.upc)) {
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
      if ((filters.saleTradeStatuses || []).length > 0) {
        const figureAvailability = Array.isArray(figure.availability) ? figure.availability : [];
        // Check if figure has any of the filtered statuses
        const hasMatch = (filters.saleTradeStatuses || []).some(status => figureAvailability.includes(status));
        if (!hasMatch) {
          return false;
        }
      }
      // Custom field filters
      if (filters.customFields) {
        for (const [fieldId, selectedValues] of Object.entries(filters.customFields)) {
          if ((selectedValues || []).length > 0) {
            const figureValue = figure.customFields?.[fieldId];
            const figureValueStr = figureValue !== undefined && figureValue !== null ?
              (typeof figureValue === 'object' ? JSON.stringify(figureValue) : String(figureValue)) : '';
            if (!(selectedValues || []).includes(figureValueStr)) {
              return false;
            }
          }
        }
      }
      // Favorites filter
      if (filters.showFavoritesOnly && !figure.isFavorite) {
        return false;
      }
      // Tags filter
      if ((filters.tags || []).length > 0) {
        const figureTags = Array.isArray(figure.tags) ? figure.tags : [];
        // Figure must have at least one of the selected tags
        const hasMatchingTag = (filters.tags || []).some(tag => figureTags.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

          return true;
        } catch (figureError) {
          console.error('❌ Error processing figure in filter:', figure.name, figureError);
          console.error('❌ Figure data:', {
            name: figure.name,
            availability: figure.availability,
            tags: figure.tags,
            accessories: figure.accessories
          });
          return false; // Skip figures that cause errors
        }
      });
    } catch (filterError) {
      console.error('❌ Error in filteredFigures useMemo:', filterError);
      console.error('❌ Filters state:', filters);
      return []; // Return empty array on error
    }
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
    conditionOptions,
    [conditionOptions]
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

  // Show loading screen during auth check to prevent React crashes
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!currentUser) {
    return (
      <ErrorBoundary>
        <div>
          {error && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
              {error}
            </div>
          )}
          <LoginPage onLogin={handleLogin} />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full box-border">
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
                data-tour="browse"
                variant={currentPage === 'browse' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setCurrentPage('browse')}
                title="Browse Public Collections"
              >
                <Search className="h-5 w-5" />
              </Button>
              <Button
                data-tour="marketplace"
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
              <NotificationBell currentUser={currentUser} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCommentReportsOpen(true)}
                title="Comment Reports"
                className="relative"
              >
                <Flag className="h-5 w-5" />
                {pendingReportsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {pendingReportsCount}
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
                  <div className="w-full sm:w-auto sm:min-w-[200px]">
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

                <div className="relative flex-1 min-w-0">
                  <Input
                    placeholder="Search..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="text-xs sm:text-sm w-full"
                  />
                </div>
              </div>

              {/* Top Jealous Figures */}
              <TopJealousFigures
                figures={filteredFigures}
                userId={currentUser.id}
                currentUser={currentUser}
                onFigureClick={handleEditFigure}
              />

              {/* Collection Tabs */}
              <div className="flex gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto mb-4">
                <button
                  onClick={() => setCollectionTab('collection')}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    collectionTab === 'collection'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <Grid className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                  Collection
                </button>
                <button
                  onClick={() => setCollectionTab('table')}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    collectionTab === 'table'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <List className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                  Table
                </button>
                <button
                  data-tour="stats"
                  onClick={() => setCollectionTab('stats')}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    collectionTab === 'stats'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                  Stats
                </button>
                <button
                  onClick={() => setCollectionTab('gallery')}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    collectionTab === 'gallery'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <Images className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                  Gallery
                </button>
                <button
                  onClick={() => setCollectionTab('alerts')}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    collectionTab === 'alerts'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                  Alerts
                </button>
                <button
                  onClick={() => setCollectionTab('growth')}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    collectionTab === 'growth'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                  Growth
                </button>
                <button
                  onClick={() => setCollectionTab('wishlist')}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    collectionTab === 'wishlist'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                  Wishlist
                </button>
                <button
                  onClick={() => setCollectionTab('shelves')}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    collectionTab === 'shelves'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <Grid3x3 className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                  Shelves
                </button>
                <button
                  onClick={() => setCollectionTab('import')}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    collectionTab === 'import'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <Upload className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                  Import
                </button>
              </div>

              {/* Row 2: Filter, Export, and Selection Controls */}
              <div className="flex flex-wrap gap-3 items-center">
                <div data-tour="filters">
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
                </div>

                <Button
                  variant={filters.showFavoritesOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, showFavoritesOnly: !prev.showFavoritesOnly }))}
                  title={filters.showFavoritesOnly ? 'Show all figures' : 'Show only favorites'}
                  className={filters.showFavoritesOnly ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                >
                  <Star className={`h-4 w-4 sm:mr-2 ${filters.showFavoritesOnly ? 'fill-current' : ''}`} />
                  <span className="hidden sm:inline">{filters.showFavoritesOnly ? 'Favorites' : 'Favorites'}</span>
                </Button>

                <ExportImportMenu
                  onImport={handleImportComplete}
                  selectedFigures={selectedFigures}
                  allFigures={figures}
                />

                <Button
                  onClick={() => setShareDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                  title="Share your collection"
                >
                  <Share2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Share Collection</span>
                </Button>

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
        <ErrorBoundary level="page">
          <Suspense fallback={<PageLoader />}>
            <BrowsePage
              currentUser={currentUser}
              setCurrentPage={setCurrentPage}
              initialUserId={browseInitialUserId}
              onClearInitialUserId={() => setBrowseInitialUserId(null)}
            />
          </Suspense>
        </ErrorBoundary>
      ) : currentPage === 'messages' ? (
        <ErrorBoundary level="page">
          <Suspense fallback={<PageLoader />}>
            <MessagesPageNew currentUser={currentUser} />
          </Suspense>
        </ErrorBoundary>
      ) : currentPage === 'marketplace' ? (
        <ErrorBoundary level="page">
          <Suspense fallback={<PageLoader />}>
            <MarketplacePage currentUser={currentUser} />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full box-border">
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
                data-tour="add-figure"
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
        ) : collectionTab === 'stats' ? (
          <ErrorBoundary level="component">
            <Suspense fallback={<PageLoader />}>
              <StatsView figures={filteredFigures} />
            </Suspense>
          </ErrorBoundary>
        ) : collectionTab === 'gallery' ? (
          <ErrorBoundary level="component">
            <Suspense fallback={<PageLoader />}>
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
                onToggleFavorite={handleToggleFavorite}
              />
            </Suspense>
          </ErrorBoundary>
        ) : collectionTab === 'alerts' ? (
          <PriceAlertsPage currentUser={currentUser} />
        ) : collectionTab === 'growth' ? (
          <CollectionGrowthPage figures={filteredFigures} />
        ) : collectionTab === 'wishlist' ? (
          <WishlistPage
            currentUser={currentUser}
            addItemTrigger={wishlistDialogTrigger}
            onDialogStateChange={setWishlistDialogOpen}
          />
        ) : collectionTab === 'shelves' ? (
          viewingShelfId ? (
            <ShelfViewPage
              shelfId={viewingShelfId}
              userId={currentUser.id}
              currentUserId={currentUser.id}
              figures={figures}
              onBack={() => setViewingShelfId(null)}
            />
          ) : (
            <ShelvesPage
              userId={currentUser.id}
              figures={figures}
              onNavigateToShelf={(shelfId) => setViewingShelfId(shelfId)}
            />
          )
        ) : collectionTab === 'import' ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Import Figures to Your Collection
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Import action figures from CSV or TSV format. Paste your data below or use the scraper to fetch from websites.
              </p>

              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  CSV Format
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                  Expected columns: name, manufacturer, franchise, series, year, version, size, category, packaging, subProductLine (optional)
                </p>
                <code className="text-xs text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded block overflow-x-auto">
                  name,manufacturer,franchise,series,year,version,size,category,packaging
                </code>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CSV/TSV Data
                  </label>
                  <textarea
                    value={importCsvData}
                    onChange={(e) => setImportCsvData(e.target.value)}
                    className="w-full h-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                    placeholder="name,manufacturer,franchise,series,year,version,size,category,packaging&#10;Snake Eyes,Hasbro,G.I. Joe,A Real American Hero,1982,V1,3.75&quot;,Action Figure,Individual&#10;Scarlett,Hasbro,G.I. Joe,A Real American Hero,1982,V1,3.75&quot;,Action Figure,Individual"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleParseCSV}
                    disabled={!importCsvData.trim()}
                  >
                    Parse & Preview
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleImportCSV}
                    disabled={!parsedImportData || !parsedImportData.success}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import to My Collection
                  </Button>
                </div>

                {/* Preview Section */}
                {showImportPreview && parsedImportData && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Import Preview
                    </h3>

                    {/* Errors */}
                    {parsedImportData.errors.length > 0 && (
                      <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <h4 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
                          Errors ({parsedImportData.errors.length})
                        </h4>
                        <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-300 space-y-1">
                          {parsedImportData.errors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Warnings */}
                    {parsedImportData.warnings.length > 0 && (
                      <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                          Warnings ({parsedImportData.warnings.length})
                        </h4>
                        <ul className="list-disc list-inside text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                          {parsedImportData.warnings.slice(0, 5).map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                          {parsedImportData.warnings.length > 5 && (
                            <li>... and {parsedImportData.warnings.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Success Preview */}
                    {parsedImportData.success && parsedImportData.figures.length > 0 && (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <p className="text-sm font-semibold text-green-900 dark:text-green-200">
                            Ready to import {parsedImportData.figures.length} figure{parsedImportData.figures.length > 1 ? 's' : ''}
                          </p>
                        </div>

                        <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Manufacturer</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Series</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Year</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {parsedImportData.figures.slice(0, 10).map((figure, i) => (
                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                                  <td className="px-4 py-2 text-gray-900 dark:text-white">{figure.name}</td>
                                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{figure.manufacturer || '-'}</td>
                                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{figure.series || '-'}</td>
                                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{figure.year || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {parsedImportData.figures.length > 10 && (
                            <div className="p-2 text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                              ... and {parsedImportData.figures.length - 10} more figures
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Sample Data Files
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Try importing one of our sample CSV files located in the <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">sample-data/</code> folder.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    <li><strong>action-figures-starter.csv</strong> - 107 figures across 9 franchises</li>
                    <li><strong>gijoe-arah-1982-1986.csv</strong> - 72 G.I. Joe figures from 1982-1986</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : collectionTab === 'collection' ? (
          <>
            <Pagination
              currentPage={paginationPage}
              totalItems={filteredFigures.length}
              pageSize={pageSize}
              onPageChange={setPaginationPage}
              onPageSizeChange={setPageSize}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
              {paginatedFigures.map((figure) => {
              const mainImage = figure.images && figure.images.length > 0
                ? figure.images[figure.mainImageIndex ?? 0]
                : figure.imageUrl || null;

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
                        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 shadow">
                          <Share2 className="h-3 w-3" />
                          Public
                        </div>
                      )}
                      {figure.images && figure.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                          +{figure.images.length - 1} more
                        </div>
                      )}
                      {/* For Sale/For Trade badges */}
                      {Array.isArray(figure.availability) && figure.availability.length > 0 && (
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
                        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 shadow">
                          <Share2 className="h-3 w-3" />
                          Public
                        </div>
                      )}
                      {/* For Sale/For Trade badges */}
                      {Array.isArray(figure.availability) && figure.availability.length > 0 && (
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white">
                              ${figure.currentValue.toFixed(2)}
                            </p>
                            <PriceTrend
                              priceHistory={figure.priceHistory}
                              currentValue={figure.currentValue}
                              size="sm"
                            />
                          </div>
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

                      {/* Envious Meter - consistent with Browse page */}
                      {figure.isPublic && (() => {
                        const jealousyScore = ReactionsService.getJealousyScore(figure.id, currentUser.id);
                        const stats = ReactionsService.getJealousyStats(figure.id, currentUser.id);
                        const userReaction = ReactionsService.getUserReaction(figure.id, currentUser.id);
                        const showBox = jealousyScore > 0 || userReaction;

                        if (!showBox) return null;

                        // Determine background color based on user's reaction
                        let bgClass = "bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-700";
                        if (userReaction?.reactionType === 'appreciate') {
                          bgClass = "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-700/50";
                        } else if (userReaction?.reactionType === 'love') {
                          bgClass = "bg-pink-50 dark:bg-pink-900/10 border-pink-200 dark:border-pink-700/50";
                        } else if (userReaction?.reactionType === 'fire') {
                          bgClass = "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-700/50";
                        }

                        return (
                          <div className={`mt-2 rounded-lg p-2 border ${bgClass}`}>
                            <div className="flex items-center justify-between text-xs">
                              {/* Left side: Green eye + score + individual counts */}
                              <div className="flex items-center gap-1">
                                {jealousyScore > 0 && (
                                  <>
                                    <Eye className="h-3 w-3 text-green-500" />
                                    <span className="font-semibold text-green-700 dark:text-green-400 mr-1">
                                      {jealousyScore}
                                    </span>
                                  </>
                                )}
                                {stats.fire > 0 && (
                                  <>
                                    <Flame className="h-3 w-3 text-orange-500" />
                                    <span className="text-orange-600 dark:text-orange-400 font-medium mr-1">
                                      {stats.fire}
                                    </span>
                                  </>
                                )}
                                {stats.love > 0 && (
                                  <>
                                    <Heart className="h-3 w-3 text-pink-500" />
                                    <span className="text-pink-600 dark:text-pink-400 font-medium mr-1">
                                      {stats.love}
                                    </span>
                                  </>
                                )}
                                {stats.appreciate > 0 && (
                                  <>
                                    <ThumbsUp className="h-3 w-3 text-blue-500" />
                                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                                      {stats.appreciate}
                                    </span>
                                  </>
                                )}
                              </div>
                              {/* Right side: My reaction */}
                              {userReaction && (
                                <div className="flex items-center">
                                  {userReaction.reactionType === 'fire' && <Flame className="h-3 w-3 text-orange-600 dark:text-orange-400" />}
                                  {userReaction.reactionType === 'love' && <Heart className="h-3 w-3 text-pink-600 dark:text-pink-400" />}
                                  {userReaction.reactionType === 'appreciate' && <ThumbsUp className="h-3 w-3 text-blue-600 dark:text-blue-400" />}
                                </div>
                              )}
                            </div>
                          </div>
                        );
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
        ) : collectionTab === 'table' ? (
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
            onToggleFavorite={handleToggleFavorite}
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
        ) : null}
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

      {/* Comment Reports Modal */}
      {commentReportsOpen && (
        <CommentReportsPage
          currentUser={currentUser}
          onClose={() => setCommentReportsOpen(false)}
        />
      )}

      {/* Share Collection Dialog */}
      <ShareCollectionDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        currentUser={currentUser}
        collectionStats={(() => {
          // Only count public figures that visitors will actually see
          const publicFigures = figures.filter(f => f.isPublic || currentUser.collectionPublic);
          const manufacturerCounts = new Map<string, number>();
          publicFigures.forEach(fig => {
            const count = manufacturerCounts.get(fig.manufacturer) || 0;
            manufacturerCounts.set(fig.manufacturer, count + 1);
          });
          let topManufacturer = '';
          let maxCount = 0;
          manufacturerCounts.forEach((count, manufacturer) => {
            if (count > maxCount) {
              maxCount = count;
              topManufacturer = manufacturer;
            }
          });
          return {
            totalFigures: publicFigures.length,
            totalValue: publicFigures.reduce((sum, fig) => sum + fig.currentValue, 0),
            topManufacturer
          };
        })()}
      />

      {/* Branded Footer */}
      <BrandedFooter />

      {/* Floating Action Button - Context-Aware */}
      {currentPage === 'collection' && !formOpen && !wishlistDialogOpen && (
        <button
          onClick={handleFABClick}
          disabled={currentUser.role === 'management' && !!adminViewingUserId && collectionTab !== 'wishlist'}
          title={collectionTab === 'wishlist' ? 'Add to Wishlist' : (currentUser.role === 'management' && adminViewingUserId ? "Cannot add figures to another user's collection" : "Add a new figure")}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all z-50 flex items-center justify-center group"
        >
          <Plus className="h-6 w-6" />
          <span className="hidden group-hover:inline-block ml-2 whitespace-nowrap">{getFABText()}</span>
        </button>
      )}

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Onboarding Tour */}
      {showOnboarding && currentUser && figures.length === 0 && (
        <OnboardingTour
          steps={tourSteps}
          onComplete={markOnboardingComplete}
          onSkip={markOnboardingComplete}
        />
      )}

      {/* Offline notifications and service worker UI */}
      <OfflineNotification />

      {/* Privacy consent banner */}
      <PrivacyConsentBanner />
    </div>
  );
}

// Routing wrapper
function App() {
  return (
    <ErrorBoundary level="critical">
      <BrowserRouter basename={import.meta.env.PROD ? '/shelflife-app' : ''}>
        <Routes>
          <Route
            path="/profile/:username"
            element={
              <ErrorBoundary level="page">
                <PublicProfilePage />
              </ErrorBoundary>
            }
          />
          <Route
            path="*"
            element={
              <ErrorBoundary level="page">
                <MainApp />
              </ErrorBoundary>
            }
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

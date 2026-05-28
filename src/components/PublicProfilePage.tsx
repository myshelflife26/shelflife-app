import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import { FirebaseStorage } from '../utils/firebaseStorage';
import { ReactionsService } from '../utils/reactions';
import { ViewTrackingService } from '../utils/viewTracking';
import type { User } from '../types/user';
import type { ActionFigure } from '../types/index';
import { Package, TrendingUp, DollarSign, Star, ArrowLeft, Flame, Heart, ThumbsUp } from 'lucide-react';
import { WatermarkedImage } from './ImageOverlay';
import { Button } from './ui/button';

interface PublicProfilePageProps {
  onNavigateBack?: () => void;
}

function PublicProfilePage({ onNavigateBack }: PublicProfilePageProps) {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [figures, setFigures] = useState<ActionFigure[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [reactionData, setReactionData] = useState<Map<string, { score: number; stats: any }>>(new Map());

  const handleSignUpClick = () => {
    navigate('/');
  };

  // Get current authenticated user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const auth = FirebaseAuthService.getCurrentUser();
        if (auth) {
          setCurrentUser(auth);
        }
      } catch (error) {
        console.error('Failed to get current user:', error);
      }
    };

    getCurrentUser();
  }, []);

  // Load hybrid reaction data when figures change
  useEffect(() => {
    const loadReactionData = async () => {
      if (!user || figures.length === 0) return;

      const reactionMap = new Map();

      // Load reactions for all figures in parallel
      await Promise.all(
        figures.map(async (figure) => {
          try {
            const jealousyScore = await ReactionsService.getJealousyScoreHybrid(figure.id, user.id);
            const stats = await ReactionsService.getJealousyStatsHybrid(figure.id, user.id);
            reactionMap.set(figure.id, { score: jealousyScore, stats });

            // Debug logging for reactions
            console.log(`Figure ${figure.name}: jealousyScore=${jealousyScore}, stats=`, stats);
          } catch (error) {
            console.error(`Failed to load reactions for figure ${figure.id}:`, error);
            // Fallback to localStorage-only
            const jealousyScore = ReactionsService.getJealousyScore(figure.id, user.id);
            const stats = ReactionsService.getJealousyStats(figure.id, user.id);
            reactionMap.set(figure.id, { score: jealousyScore, stats });
          }
        })
      );

      setReactionData(reactionMap);
    };

    loadReactionData();
  }, [user, figures]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Find user by username
        const allUsers = await FirebaseAuthService.getAllUsers();
        const targetUser = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());

        if (!targetUser) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setUser(targetUser);

        // Load user's public figures
        console.log('=== PUBLIC PROFILE DEBUG ===');
        console.log('Target user:', targetUser.username, targetUser.id);
        console.log('Collection public:', targetUser.collectionPublic);

        let publicFigures: ActionFigure[] = [];

        // If entire collection is public, get all figures
        if (targetUser.collectionPublic) {
          publicFigures = await FirebaseStorage.getFigures(targetUser.id);
          console.log('Loading all figures (collection is public):', publicFigures.length);
        } else {
          // Otherwise only get figures marked as public
          publicFigures = await FirebaseStorage.getPublicFiguresByUser(targetUser.id);
          console.log('Loading only public figures:', publicFigures.length);
        }

        console.log('Figures:', publicFigures.map(f => ({ name: f.name, isPublic: f.isPublic })));
        setFigures(publicFigures);

        // Track profile view (after successful profile load)
        try {
          const auth = FirebaseAuthService.getCurrentUser();
          await ViewTrackingService.trackProfileView(targetUser.id, auth?.id);
        } catch (error) {
          console.error('Failed to track profile view:', error);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Package className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Profile Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't find a user with the username "@{username}"
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalValue = figures.reduce((sum, f) => sum + f.currentValue, 0);
  const avgValue = figures.length > 0 ? totalValue / figures.length : 0;

  // Get reaction stats for public figures from preloaded data
  const reactionStats = {
    appreciate: 0,
    love: 0,
    fire: 0,
    total: 0
  };

  // Sum up all the reaction stats from the preloaded data
  reactionData.forEach((reactionInfo) => {
    reactionStats.appreciate += reactionInfo.stats.appreciate || 0;
    reactionStats.love += reactionInfo.stats.love || 0;
    reactionStats.fire += reactionInfo.stats.fire || 0;
    reactionStats.total += reactionInfo.stats.total || 0;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/')}
            className="mb-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{user.displayName}</h1>
              <p className="text-white/80">@{user.username}</p>
              {user.bio && (
                <p className="text-white/90 mt-2">{user.bio}</p>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-5 w-5" />
                <p className="text-sm text-white/80">Figures</p>
              </div>
              <p className="text-2xl font-bold">{figures.length}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-5 w-5" />
                <p className="text-sm text-white/80">Total Value</p>
              </div>
              <p className="text-2xl font-bold">${totalValue.toFixed(0)}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5" />
                <p className="text-sm text-white/80">Avg Value</p>
              </div>
              <p className="text-2xl font-bold">${avgValue.toFixed(0)}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-5 w-5" />
                <p className="text-sm text-white/80">Reactions</p>
              </div>
              <p className="text-2xl font-bold">{reactionStats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Collection Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Call to Action Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                Like what you see?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Join ShelfLife to track your own collection and connect with other collectors
              </p>
            </div>
            <Button
              onClick={handleSignUpClick}
              className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
            >
              Sign Up / Log In
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Public Collection
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {figures.length === 0
              ? 'No public figures yet'
              : `Showing ${figures.length} public figure${figures.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {figures.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Public Figures Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This collector hasn't made any figures public yet
            </p>
            <Button
              onClick={handleSignUpClick}
              variant="outline"
            >
              Sign Up to Start Your Own Collection
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {figures.map((figure) => {
              const mainImage = figure.images && figure.images.length > 0
                ? figure.images[figure.mainImageIndex ?? 0]
                : null;

              // Get reaction data from preloaded map
              const reactionInfo = reactionData.get(figure.id) || { score: 0, stats: { appreciate: 0, love: 0, fire: 0, total: 0 } };
              const jealousyScore = reactionInfo.score;
              const stats = reactionInfo.stats;

              return (
                <div
                  key={figure.id}
                  onClick={handleSignUpClick}
                  className="relative rounded-lg overflow-hidden shadow hover:shadow-lg transition-all cursor-pointer group aspect-square"
                >
                  {/* Main Image */}
                  {mainImage ? (
                    <img
                      src={mainImage}
                      alt={figure.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}

                  {/* Text overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
                    {/* Figure name at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <h3 className="text-white font-semibold text-sm mb-1 truncate shadow-text">
                        {figure.name}
                      </h3>
                      <p className="text-white/90 font-bold text-lg shadow-text">
                        ${figure.currentValue.toFixed(0)}
                      </p>
                    </div>

                    {/* Jealousy Score Badge */}
                    {jealousyScore > 0 && (
                      <div className="absolute top-2 right-2 bg-purple-600/90 text-white px-2 py-1 rounded-full text-xs font-bold shadow">
                        ❤️ {jealousyScore}
                      </div>
                    )}

                    {/* Click to view overlay */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                        Click to join ShelfLife
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


export default PublicProfilePage;
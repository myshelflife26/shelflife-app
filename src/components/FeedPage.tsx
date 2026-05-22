import { useState, useEffect, useMemo } from 'react';
import { FirebaseStorage } from '../utils/firebaseStorage';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import { AdmirersService } from '../utils/admirers';
import { FirebaseJealousyTrackingService } from '../utils/firebaseJealousyTracking';
import { FirebaseReactionsService } from '../utils/firebaseReactions';
import { ReactionsService } from '../utils/reactions';
import { BlockingService } from '../utils/blocking';
import { ReportingService } from '../utils/reporting';
import type { ReportCategory } from '../utils/reporting';
import { toastManager } from '../utils/toastManager';
import type { ActionFigure } from '../types/index';
import type { User } from '../types/user';
import { TrendingUp, Users, Sparkles, Flame, Heart, ThumbsUp, UserPlus, ShieldOff, Flag, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Activity, Clock, Package, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FigureDetailModal } from './FigureDetailModal';
import { WatermarkedImage } from './ImageOverlay';
import { BlockReasonDialog } from './BlockReasonDialog';
import { ReportReasonDialog } from './ReportReasonDialog';
import { Pagination } from './Pagination';
import { GlobalStatisticsPage } from './GlobalStatisticsPage';
import { CommunityActivityFeed } from './CommunityActivityFeed';

type FeedTab = 'rising' | 'jealous' | 'collectors' | 'recent' | 'activity' | 'stats';

interface FeedPageProps {
  currentUser: User;
  onNavigateToBrowse?: (userId: string) => void;
}

interface FigureWithOwner extends ActionFigure {
  ownerName: string;
  ownerUsername: string;
  ownerDisplayName: string;
}

interface SuggestedUser extends User {
  suggestionScore: number;
  matchedManufacturers: string[];
  matchedCategories: string[];
  matchReason: string; // Human-readable explanation of why suggested
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function FeedPage({ currentUser, onNavigateToBrowse }: FeedPageProps) {
  const [feedTab, setFeedTab] = useState<FeedTab>('rising');
  const [topJealousyFigures, setTopJealousyFigures] = useState<Array<FigureWithOwner & { jealousyScore: number }>>([]);
  const [risingStars7Days, setRisingStars7Days] = useState<Array<FigureWithOwner & { increase: number; previousScore: number }>>([]);
  const [risingStars30Days, setRisingStars30Days] = useState<Array<FigureWithOwner & { increase: number; previousScore: number }>>([]);
  const [risingStarsCustom, setRisingStarsCustom] = useState<Array<FigureWithOwner & { increase: number; previousScore: number }>>([]);
  const [customDaysBack, setCustomDaysBack] = useState(365);
  const [recentCustomDaysBack, setRecentCustomDaysBack] = useState(365);
  const [admiredFigures, setAdmiredFigures] = useState<FigureWithOwner[]>([]);
  const [recentFigures7Days, setRecentFigures7Days] = useState<FigureWithOwner[]>([]);
  const [recentFigures30Days, setRecentFigures30Days] = useState<FigureWithOwner[]>([]);
  const [recentFiguresCustom, setRecentFiguresCustom] = useState<FigureWithOwner[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [risingSuggestedUsers, setRisingSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [jealousSuggestedUsers, setJealousSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [randomCollectors, setRandomCollectors] = useState<Array<User & { sampleFigures: FigureWithOwner[] }>>([]);
  const [admiringUsers, setAdmiringUsers] = useState<string[]>([]);
  const [selectedFigure, setSelectedFigure] = useState<FigureWithOwner | null>(null);
  const [activityMode, setActivityMode] = useState<'trending' | 'recent'>('trending');
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<{ id: string; username: string } | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [userToReport, setUserToReport] = useState<{ id: string; username: string } | null>(null);
  const [topJealousyPage, setTopJealousyPage] = useState(1);
  const [rising7DaysPage, setRising7DaysPage] = useState(1);
  const [rising7DaysPageSize, setRising7DaysPageSize] = useState(25);
  const [rising30DaysPage, setRising30DaysPage] = useState(1);
  const [rising30DaysPageSize, setRising30DaysPageSize] = useState(25);
  const [risingCustomPage, setRisingCustomPage] = useState(1);
  const [risingCustomPageSize, setRisingCustomPageSize] = useState(25);
  const [admiredFiguresPage, setAdmiredFiguresPage] = useState(1);
  const [admiredFiguresPageSize, setAdmiredFiguresPageSize] = useState(25);
  const [suggestedUsersPage, setSuggestedUsersPage] = useState(1);
  const [suggestedUsersPageSize, setSuggestedUsersPageSize] = useState(25);
  const [risingSuggestedPage, setRisingSuggestedPage] = useState(1);
  const [risingSuggestedPageSize, setRisingSuggestedPageSize] = useState(25);
  const [jealousSuggestedPage, setJealousSuggestedPage] = useState(1);
  const [jealousSuggestedPageSize, setJealousSuggestedPageSize] = useState(25);
  const [randomCollectorsPage, setRandomCollectorsPage] = useState(1);
  const [randomCollectorsPageSize, setRandomCollectorsPageSize] = useState(25);
  const [recent7DaysPage, setRecent7DaysPage] = useState(1);
  const [recent7DaysPageSize, setRecent7DaysPageSize] = useState(25);
  const [recent30DaysPage, setRecent30DaysPage] = useState(1);
  const [recent30DaysPageSize, setRecent30DaysPageSize] = useState(25);
  const [recentCustomPage, setRecentCustomPage] = useState(1);
  const [recentCustomPageSize, setRecentCustomPageSize] = useState(25);

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

    // Get top jealousy figures using Firebase (by current score)
    const topJealousyData = await FirebaseJealousyTrackingService.getTopJealousyFigures(
      publicFiguresWithOwners.map(f => ({ id: f.id, userId: f.userId! })),
      100
    );

    const topJealousy = topJealousyData
      .map(item => {
        const figure = publicFiguresWithOwners.find(f => f.id === item.figureId && f.userId === item.ownerId);
        if (!figure) return null;
        return { ...figure, jealousyScore: item.jealousyScore };
      })
      .filter(Boolean) as Array<FigureWithOwner & { jealousyScore: number }>;

    setTopJealousyFigures(topJealousy);

    // Get rising stars for 7 days using Firebase - no limit, show all with positive increases
    const rises7Days = await FirebaseJealousyTrackingService.getRisingStars(
      publicFiguresWithOwners.map(f => ({ id: f.id, userId: f.userId! })),
      7
    );

    let risingFigures7Days = rises7Days
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

    // Show all figures with positive increases, sorted max to min (already sorted by getRisingStars)
    setRisingStars7Days(risingFigures7Days);

    // Get rising stars for 30 days using Firebase - no limit, show all with positive increases
    const rises30Days = await FirebaseJealousyTrackingService.getRisingStars(
      publicFiguresWithOwners.map(f => ({ id: f.id, userId: f.userId! })),
      30
    );

    let risingFigures30Days = rises30Days
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

    // Show all figures with positive increases, sorted max to min (already sorted by getRisingStars)
    setRisingStars30Days(risingFigures30Days);

    // Get rising stars for custom period using Firebase (default 365 days) - no limit, show all with positive increases
    const risesCustom = await FirebaseJealousyTrackingService.getRisingStars(
      publicFiguresWithOwners.map(f => ({ id: f.id, userId: f.userId! })),
      customDaysBack
    );

    let risingFiguresCustom = risesCustom
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

    // Show all figures with positive increases, sorted max to min (already sorted by getRisingStars)
    setRisingStarsCustom(risingFiguresCustom);

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

    // Get recently added figures (7 days, 30 days, custom)
    const blockedUserIds = BlockingService.getBlockedUserIds(currentUser.id);

    const sevenDaysAgoTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const customDaysAgoTime = Date.now() - (recentCustomDaysBack * 24 * 60 * 60 * 1000);

    const getRecentFigures = (cutoffTime: number) => {
      return publicFiguresWithOwners.filter(f => {
        if (!f.userId) return false;
        if (blockedUserIds.includes(f.userId)) return false;

        const recentlyCreated = f.createdAt && f.createdAt > cutoffTime;
        const recentlyPublic = f.updatedAt && f.updatedAt > cutoffTime;

        return recentlyCreated || recentlyPublic;
      })
      .sort((a, b) => {
        const aTime = Math.max(a.createdAt || 0, a.updatedAt || 0);
        const bTime = Math.max(b.createdAt || 0, b.updatedAt || 0);
        return bTime - aTime;
      });
    };

    setRecentFigures7Days(getRecentFigures(sevenDaysAgoTime));
    setRecentFigures30Days(getRecentFigures(thirtyDaysAgoTime));
    setRecentFiguresCustom(getRecentFigures(customDaysAgoTime));

    // Get suggested users based on matching figures
    console.log('Getting suggestions:', { totalUsers: allUsers.length, publicFigures: publicFiguresWithOwners.length, admiring: admiring.length });
    const suggestions = await getSuggestedUsers(allUsers, currentUser.id, publicFiguresWithOwners, admiring);
    console.log('Suggested users result:', suggestions.length);
    setSuggestedUsers(suggestions);

    // Get rising suggested users (users with rising star figures)
    const allRisingFigures = [...risingFigures7Days, ...risingFigures30Days, ...risingFiguresCustom];
    console.log('Rising figures for suggestions:', allRisingFigures.length);
    const risingSuggestions = await getRisingSuggestedUsers(
      allUsers,
      currentUser.id,
      publicFiguresWithOwners,
      admiring,
      allRisingFigures
    );
    console.log('Rising suggested users result:', risingSuggestions.length);
    setRisingSuggestedUsers(risingSuggestions);

    // Get jealous suggested users (users with high jealousy figures)
    console.log('Getting jealous suggestions from', publicFiguresWithOwners.length, 'public figures');
    const jealousSuggestions = await getJealousSuggestedUsers(
      allUsers,
      currentUser.id,
      publicFiguresWithOwners,
      admiring
    );
    console.log('Jealous suggested users result:', jealousSuggestions.length);
    setJealousSuggestedUsers(jealousSuggestions);

    // Get random collectors with sample figures
    const randomUsers = await getRandomCollectors(allUsers, currentUser.id, publicFiguresWithOwners, admiring);
    setRandomCollectors(randomUsers);
    } catch (error) {
      console.error('Failed to load feed data:', error);
    }
  };

  const getSuggestedUsers = async (
    allUsers: User[],
    currentUserId: string,
    publicFiguresWithOwners: FigureWithOwner[],
    admiringUserIds: string[]
  ): Promise<SuggestedUser[]> => {
    try {
      const myFigures = await FirebaseStorage.getFigures(currentUserId);
      console.log('getSuggestedUsers: myFigures count:', myFigures.length);
      if (myFigures.length === 0) {
        console.log('getSuggestedUsers: No figures, returning empty');
        return [];
      }

      const userScores: Array<{
        user: User;
        score: number;
        matchedManufacturers: Set<string>;
        matchedCategories: Set<string>;
        matchReason: string;
      }> = [];

      // Calculate my collection breakdowns
      const myTotal = myFigures.length;
      const myFranchises = new Map<string, number>();
      const myYears = new Map<number, number>();
      const mySizes = new Map<string, number>();
      const myManufacturers = new Set<string>();
      const myCategories = new Set<string>();

      myFigures.forEach(f => {
        if (f.franchise) myFranchises.set(f.franchise, (myFranchises.get(f.franchise) || 0) + 1);
        if (f.year) myYears.set(f.year, (myYears.get(f.year) || 0) + 1);
        if (f.size) mySizes.set(f.size, (mySizes.get(f.size) || 0) + 1);
        if (f.manufacturer) myManufacturers.add(f.manufacturer);
        if (f.category) myCategories.add(f.category);
      });

      console.log('My collection breakdown:', {
        franchises: Array.from(myFranchises.keys()),
        years: Array.from(myYears.keys()),
        sizes: Array.from(mySizes.keys()),
        manufacturers: Array.from(myManufacturers),
        categories: Array.from(myCategories)
      });

      const eligibleUsers = allUsers
        .filter(u =>
          u.id !== currentUserId &&
          !BlockingService.isUserBlocked(currentUserId, u.id) &&
          !admiringUserIds.includes(u.id)
        );
      console.log('Eligible users for suggestions:', eligibleUsers.length, 'out of', allUsers.length);
      console.log('Eligible user IDs:', eligibleUsers.map(u => `${u.username}:${u.id}`));

      const publicFigureOwners = new Set(publicFiguresWithOwners.map(f => f.userId));
      console.log('Public figure owner IDs:', Array.from(publicFigureOwners));

      eligibleUsers
        .forEach(user => {
          const userFigures = publicFiguresWithOwners.filter(f => f.userId === user.id);
          console.log(`User ${user.username} (${user.id}): ${userFigures.length} public figures`);
          if (userFigures.length === 0) {
            console.log(`  Skipping ${user.username} - no public figures`);
            return;
          }

          const theirTotal = userFigures.length;
          let score = 0;
          const matchedManufacturers = new Set<string>();
          const matchedCategories = new Set<string>();
          const reasons: string[] = [];

          // Calculate their collection breakdowns
          const theirFranchises = new Map<string, number>();
          const theirYears = new Map<number, number>();
          const theirSizes = new Map<string, number>();

          userFigures.forEach(f => {
            if (f.franchise) theirFranchises.set(f.franchise, (theirFranchises.get(f.franchise) || 0) + 1);
            if (f.year) theirYears.set(f.year, (theirYears.get(f.year) || 0) + 1);
            if (f.size) theirSizes.set(f.size, (theirSizes.get(f.size) || 0) + 1);
            if (f.manufacturer) matchedManufacturers.add(f.manufacturer);
            if (f.category) matchedCategories.add(f.category);
          });

          console.log(`Checking user ${user.username}:`, {
            figures: theirTotal,
            franchises: Array.from(theirFranchises.keys()),
            years: Array.from(theirYears.keys()),
            sizes: Array.from(theirSizes.keys())
          });

          // FRANCHISE/IP MATCHING (bidirectional high %/count)
          myFranchises.forEach((myCount, franchise) => {
            const myPercent = (myCount / myTotal) * 100;
            const theirCount = theirFranchises.get(franchise) || 0;
            const theirPercent = theirCount > 0 ? (theirCount / theirTotal) * 100 : 0;

            if (theirCount === 0) return;

            // High % in my collection + high count in theirs
            if (myPercent >= 30 && theirCount >= 15) {
              score += 50;
              reasons.push(`${Math.round(myPercent)}% of your collection is ${franchise} (${theirCount} in theirs)`);
            }
            // High count in my collection + high % in theirs
            else if (myCount >= 15 && theirPercent >= 30) {
              score += 50;
              reasons.push(`${myCount} ${franchise} figures in yours (${Math.round(theirPercent)}% of theirs)`);
            }
            // Both have high percentages
            else if (myPercent >= 25 && theirPercent >= 25) {
              score += 40;
              reasons.push(`${Math.round(myPercent)}% yours, ${Math.round(theirPercent)}% theirs: ${franchise}`);
            }
            // Moderate matching (lowered thresholds for smaller collections)
            else if (myPercent >= 15 || theirPercent >= 15 || myCount >= 5 || theirCount >= 5) {
              score += 15;
            }
            // Small collection matching - any shared franchise
            else if (myCount >= 2 || theirCount >= 2) {
              score += 10;
              if (myPercent >= 20 || theirPercent >= 20) {
                score += 5; // Bonus if significant portion
                reasons.push(`Both collect ${franchise}`);
              }
            }
            // Even single figure matches count for small collections
            else {
              score += 5;
            }
          });

          // YEAR MATCHING (bidirectional high %/count)
          myYears.forEach((myCount, year) => {
            const myPercent = (myCount / myTotal) * 100;
            const theirCount = theirYears.get(year) || 0;
            const theirPercent = theirCount > 0 ? (theirCount / theirTotal) * 100 : 0;

            if (theirCount === 0) return;

            if (myPercent >= 20 && theirCount >= 10) {
              score += 25;
              reasons.push(`${Math.round(myPercent)}% of yours from ${year} (${theirCount} in theirs)`);
            } else if (myCount >= 10 && theirPercent >= 20) {
              score += 25;
              reasons.push(`${myCount} from ${year} in yours (${Math.round(theirPercent)}% of theirs)`);
            } else if (myPercent >= 15 && theirPercent >= 15) {
              score += 20;
            } else if (myCount >= 3 && theirCount >= 3) {
              score += 8;
            } else if (myCount >= 2 || theirCount >= 2) {
              score += 5;
            } else {
              score += 2; // Even single year matches
            }
          });

          // SIZE MATCHING (bidirectional high %/count)
          mySizes.forEach((myCount, size) => {
            const myPercent = (myCount / myTotal) * 100;
            const theirCount = theirSizes.get(size) || 0;
            const theirPercent = theirCount > 0 ? (theirCount / theirTotal) * 100 : 0;

            if (theirCount === 0) return;

            if (myPercent >= 30 && theirCount >= 15) {
              score += 30;
              reasons.push(`${Math.round(myPercent)}% of yours are ${size} (${theirCount} in theirs)`);
            } else if (myCount >= 15 && theirPercent >= 30) {
              score += 30;
              reasons.push(`${myCount} ${size} figures in yours (${Math.round(theirPercent)}% of theirs)`);
            } else if (myPercent >= 20 && theirPercent >= 20) {
              score += 25;
            } else if (myCount >= 5 && theirCount >= 5) {
              score += 10;
            } else if (myCount >= 3 || theirCount >= 3) {
              score += 6;
            } else if (myCount >= 2 || theirCount >= 2) {
              score += 4;
            } else {
              score += 2; // Even single size matches
            }
          });

          // COLLECTION OVERLAP (figures matching on multiple attributes)
          let overlapCount = 0;
          myFigures.forEach(myFig => {
            const hasMatch = userFigures.some(theirFig => {
              let matches = 0;
              if (myFig.franchise && myFig.franchise === theirFig.franchise) matches++;
              if (myFig.year && myFig.year === theirFig.year) matches++;
              if (myFig.size && myFig.size === theirFig.size) matches++;
              return matches >= 2; // Match on at least 2 attributes
            });
            if (hasMatch) overlapCount++;
          });

          const myOverlapPercent = (overlapCount / myTotal) * 100;
          const theirOverlapPercent = (overlapCount / theirTotal) * 100;

          // High overlap bonus
          if (myOverlapPercent >= 40 && theirOverlapPercent >= 40) {
            score += 60;
            reasons.push(`${Math.round(myOverlapPercent)}% of your collection overlaps with ${Math.round(theirOverlapPercent)}% of theirs`);
          } else if (myOverlapPercent >= 30 || theirOverlapPercent >= 30) {
            score += 30;
          } else if (myOverlapPercent >= 20 || theirOverlapPercent >= 20) {
            score += 15;
          } else if (myOverlapPercent >= 10 || theirOverlapPercent >= 10) {
            score += 10;
          } else if (overlapCount >= 2) {
            score += 5; // At least 2 figures with multi-attribute match
          } else if (overlapCount >= 1) {
            score += 3; // At least 1 figure with multi-attribute match
          }

          console.log(`User ${user.username} final score:`, score, 'reasons:', reasons);

          if (score > 0) {
            userScores.push({
              user,
              score,
              matchedManufacturers,
              matchedCategories,
              matchReason: reasons.slice(0, 2).join('; ') || 'Similar collection interests'
            });
          } else {
            console.log(`User ${user.username} scored 0 - no matching franchises/years/sizes`);
          }
        });

      console.log('User scores found:', userScores.length);
      if (userScores.length > 0) {
        console.log('Top 3 scores:', userScores.slice(0, 3).map(us => ({ user: us.user.username, score: us.score, reason: us.matchReason })));
      }

      // If no matches found, include users with most public figures (even if already admiring)
      if (userScores.length === 0) {
        console.log('No matches found, falling back to top collectors by figure count');
        const usersWithFigures = allUsers
          .filter(u => u.id !== currentUserId && !BlockingService.isUserBlocked(currentUserId, u.id))
          .map(user => {
            const userFigures = publicFiguresWithOwners.filter(f => f.userId === user.id);
            return { user, figureCount: userFigures.length };
          })
          .filter(uf => uf.figureCount > 0)
          .sort((a, b) => b.figureCount - a.figureCount)
          .slice(0, 10);

        return usersWithFigures.map(uf => ({
          ...uf.user,
          suggestionScore: uf.figureCount,
          matchedManufacturers: [],
          matchedCategories: [],
          matchReason: admiringUserIds.includes(uf.user.id)
            ? `Already admiring - ${uf.figureCount} public figures`
            : `Active collector with ${uf.figureCount} public figures`
        }));
      }

      return userScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(us => ({
          ...us.user,
          suggestionScore: us.score,
          matchedManufacturers: Array.from(us.matchedManufacturers),
          matchedCategories: Array.from(us.matchedCategories),
          matchReason: us.matchReason
        }));
    } catch (error) {
      console.error('Failed to get suggested users:', error);
      return [];
    }
  };

  const getRisingSuggestedUsers = async (
    allUsers: User[],
    currentUserId: string,
    publicFiguresWithOwners: FigureWithOwner[],
    admiringUserIds: string[],
    risingFigures: Array<FigureWithOwner & { increase: number }>
  ): Promise<SuggestedUser[]> => {
    try {
      console.log('getRisingSuggestedUsers: rising figures count:', risingFigures.length);
      // Get users who own rising star figures (include users you're already following)
      const userRisingScores = new Map<string, { user: User; totalIncrease: number; risingCount: number }>();

      risingFigures.forEach(figure => {
        if (!figure.userId) return;
        const user = allUsers.find(u => u.id === figure.userId);
        if (!user) return;
        if (figure.userId === currentUserId) return;
        if (BlockingService.isUserBlocked(currentUserId, figure.userId)) return;

        if (!userRisingScores.has(figure.userId)) {
          userRisingScores.set(figure.userId, { user, totalIncrease: 0, risingCount: 0 });
        }
        const entry = userRisingScores.get(figure.userId)!;
        entry.totalIncrease += figure.increase;
        entry.risingCount++;
      });

      console.log('getRisingSuggestedUsers: userRisingScores size:', userRisingScores.size);
      if (userRisingScores.size > 0) {
        const topUsers = Array.from(userRisingScores.values()).slice(0, 3);
        console.log('Top 3 rising users:', topUsers.map(u => ({ user: u.user.username, total: u.totalIncrease, count: u.risingCount })));
      }

      return Array.from(userRisingScores.values())
        .sort((a, b) => b.totalIncrease - a.totalIncrease)
        .slice(0, 10)
        .map(entry => ({
          ...entry.user,
          suggestionScore: entry.totalIncrease,
          matchedManufacturers: [],
          matchedCategories: [],
          matchReason: `${entry.risingCount} rising star figure${entry.risingCount !== 1 ? 's' : ''} (+${entry.totalIncrease} total momentum)`
        }));
    } catch (error) {
      console.error('Failed to get rising suggested users:', error);
      return [];
    }
  };

  const getJealousSuggestedUsers = async (
    allUsers: User[],
    currentUserId: string,
    publicFiguresWithOwners: FigureWithOwner[],
    admiringUserIds: string[]
  ): Promise<SuggestedUser[]> => {
    try {
      console.log('getJealousSuggestedUsers: public figures count:', publicFiguresWithOwners.length);
      // Get users with highest jealousy scores (include users you're already following)
      const userJealousyScores = new Map<string, { user: User; totalJealousy: number; jealousCount: number }>();

      publicFiguresWithOwners.forEach(figure => {
        if (!figure.userId) return;
        if (figure.userId === currentUserId) return;
        if (BlockingService.isUserBlocked(currentUserId, figure.userId)) return;

        const jealousyScore = ReactionsService.getJealousyScore(figure.id, figure.userId);
        if (jealousyScore === 0) return;

        const user = allUsers.find(u => u.id === figure.userId);
        if (!user) return;

        if (!userJealousyScores.has(figure.userId)) {
          userJealousyScores.set(figure.userId, { user, totalJealousy: 0, jealousCount: 0 });
        }
        const entry = userJealousyScores.get(figure.userId)!;
        entry.totalJealousy += jealousyScore;
        entry.jealousCount++;
      });

      console.log('getJealousSuggestedUsers: userJealousyScores size:', userJealousyScores.size);
      if (userJealousyScores.size > 0) {
        const topUsers = Array.from(userJealousyScores.values()).slice(0, 3);
        console.log('Top 3 jealous users:', topUsers.map(u => ({ user: u.user.username, total: u.totalJealousy, count: u.jealousCount })));
      }

      return Array.from(userJealousyScores.values())
        .sort((a, b) => b.totalJealousy - a.totalJealousy)
        .slice(0, 10)
        .map(entry => ({
          ...entry.user,
          suggestionScore: entry.totalJealousy,
          matchedManufacturers: [],
          matchedCategories: [],
          matchReason: `${entry.jealousCount} figure${entry.jealousCount !== 1 ? 's' : ''} with ${entry.totalJealousy} total jealousy points`
        }));
    } catch (error) {
      console.error('Failed to get jealous suggested users:', error);
      return [];
    }
  };

  const getRandomCollectors = async (
    allUsers: User[],
    currentUserId: string,
    publicFiguresWithOwners: FigureWithOwner[],
    admiringUserIds: string[]
  ): Promise<Array<User & { sampleFigures: FigureWithOwner[] }>> => {
    try {
      // Get users with public figures, excluding current user, blocked users, and already following
      const eligibleUsers = allUsers.filter(u =>
        u.id !== currentUserId &&
        !BlockingService.isUserBlocked(currentUserId, u.id) &&
        !admiringUserIds.includes(u.id) &&
        publicFiguresWithOwners.some(f => f.userId === u.id)
      );

      // Shuffle and take 10 random users
      const shuffled = eligibleUsers.sort(() => Math.random() - 0.5).slice(0, 10);

      // For each user, get 4 random figures
      return shuffled.map(user => {
        const userFigures = publicFiguresWithOwners.filter(f => f.userId === user.id);
        const sampleFigures = userFigures.sort(() => Math.random() - 0.5).slice(0, 4);
        return {
          ...user,
          sampleFigures
        };
      });
    } catch (error) {
      console.error('Failed to get random collectors:', error);
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

  const paginatedRising7Days = useMemo(() => {
    const startIndex = (rising7DaysPage - 1) * rising7DaysPageSize;
    const endIndex = startIndex + rising7DaysPageSize;
    return risingStars7Days.slice(startIndex, endIndex);
  }, [risingStars7Days, rising7DaysPage, rising7DaysPageSize]);

  const paginatedRising30Days = useMemo(() => {
    const startIndex = (rising30DaysPage - 1) * rising30DaysPageSize;
    const endIndex = startIndex + rising30DaysPageSize;
    return risingStars30Days.slice(startIndex, endIndex);
  }, [risingStars30Days, rising30DaysPage, rising30DaysPageSize]);

  const paginatedRisingCustom = useMemo(() => {
    const startIndex = (risingCustomPage - 1) * risingCustomPageSize;
    const endIndex = startIndex + risingCustomPageSize;
    return risingStarsCustom.slice(startIndex, endIndex);
  }, [risingStarsCustom, risingCustomPage, risingCustomPageSize]);

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

  const paginatedRisingSuggested = useMemo(() => {
    const startIndex = (risingSuggestedPage - 1) * risingSuggestedPageSize;
    const endIndex = startIndex + risingSuggestedPageSize;
    return risingSuggestedUsers.slice(startIndex, endIndex);
  }, [risingSuggestedUsers, risingSuggestedPage, risingSuggestedPageSize]);

  const paginatedJealousSuggested = useMemo(() => {
    const startIndex = (jealousSuggestedPage - 1) * jealousSuggestedPageSize;
    const endIndex = startIndex + jealousSuggestedPageSize;
    return jealousSuggestedUsers.slice(startIndex, endIndex);
  }, [jealousSuggestedUsers, jealousSuggestedPage, jealousSuggestedPageSize]);

  const paginatedRandomCollectors = useMemo(() => {
    const startIndex = (randomCollectorsPage - 1) * randomCollectorsPageSize;
    const endIndex = startIndex + randomCollectorsPageSize;
    return randomCollectors.slice(startIndex, endIndex);
  }, [randomCollectors, randomCollectorsPage, randomCollectorsPageSize]);

  const paginatedRecent7Days = useMemo(() => {
    const startIndex = (recent7DaysPage - 1) * recent7DaysPageSize;
    const endIndex = startIndex + recent7DaysPageSize;
    return recentFigures7Days.slice(startIndex, endIndex);
  }, [recentFigures7Days, recent7DaysPage, recent7DaysPageSize]);

  const paginatedRecent30Days = useMemo(() => {
    const startIndex = (recent30DaysPage - 1) * recent30DaysPageSize;
    const endIndex = startIndex + recent30DaysPageSize;
    return recentFigures30Days.slice(startIndex, endIndex);
  }, [recentFigures30Days, recent30DaysPage, recent30DaysPageSize]);

  const paginatedRecentCustom = useMemo(() => {
    const startIndex = (recentCustomPage - 1) * recentCustomPageSize;
    const endIndex = startIndex + recentCustomPageSize;
    return recentFiguresCustom.slice(startIndex, endIndex);
  }, [recentFiguresCustom, recentCustomPage, recentCustomPageSize]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full box-border">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feed</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Discover what's trending in the community
        </p>
      </div>

      {/* Feed Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto mb-6">
        <button
          onClick={() => setFeedTab('rising')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            feedTab === 'rising'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <TrendingUp className="h-4 w-4 inline mr-2" />
          Rising Jealous
        </button>
        <button
          onClick={() => setFeedTab('jealous')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            feedTab === 'jealous'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Flame className="h-4 w-4 inline mr-2" />
          Most Jealous
        </button>
        <button
          onClick={() => setFeedTab('collectors')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            feedTab === 'collectors'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Suggested Collectors
        </button>
        <button
          onClick={() => setFeedTab('recent')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            feedTab === 'recent'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Clock className="h-4 w-4 inline mr-2" />
          Recently Added
        </button>
        <button
          onClick={() => setFeedTab('activity')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            feedTab === 'activity'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Activity className="h-4 w-4 inline mr-2" />
          Community Activity
        </button>
        <button
          onClick={() => setFeedTab('stats')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            feedTab === 'stats'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Package className="h-4 w-4 inline mr-2" />
          Global Statistics
        </button>
      </div>

      {/* Most Jealous Tab */}
      {feedTab === 'jealous' && (
        <div className="mb-8 bg-orange-100/70 dark:bg-orange-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-6 w-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Most Jealous</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">({topJealousyFigures.length})</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Figures with the highest current jealousy scores
          </p>

          {topJealousyFigures.length === 0 ? (
            <div className="text-center py-12">
              <Flame className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No jealous figures yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Start reacting to figures to see what makes collectors jealous!
              </p>
            </div>
          ) : (
            <>

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
          </>
          )}
        </div>
      )}

      {/* Rising Stars Tab */}
      {feedTab === 'rising' && (
        <>
        {/* 7 Days Section */}
        <div className="mb-8 bg-pink-100/70 dark:bg-pink-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-6 w-6 text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Rising Stars - Last 7 Days</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">({risingStars7Days.length})</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Figures with the biggest jealousy score increases over the past week
          </p>

          {risingStars7Days.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No rising stars in the past 7 days</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Check back later as collectors react to figures!
              </p>
            </div>
          ) : (
            <>

          <Pagination
            currentPage={rising7DaysPage}
            totalItems={risingStars7Days.length}
            pageSize={rising7DaysPageSize}
            onPageChange={setRising7DaysPage}
            onPageSizeChange={setRising7DaysPageSize}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
            {paginatedRising7Days.map(figure => {
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
            currentPage={rising7DaysPage}
            totalItems={risingStars7Days.length}
            pageSize={rising7DaysPageSize}
            onPageChange={setRising7DaysPage}
            onPageSizeChange={setRising7DaysPageSize}
          />
          </>
          )}
        </div>

        {/* 30 Days Section */}
        <div className="mb-8 bg-blue-100/70 dark:bg-blue-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Rising Stars - Last Month</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">({risingStars30Days.length})</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Figures with the biggest jealousy score increases over the past 30 days
          </p>

          {risingStars30Days.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No rising stars in the past 30 days</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Check back later as collectors react to figures!
              </p>
            </div>
          ) : (
            <>
          <Pagination
            currentPage={rising30DaysPage}
            totalItems={risingStars30Days.length}
            pageSize={rising30DaysPageSize}
            onPageChange={setRising30DaysPage}
            onPageSizeChange={setRising30DaysPageSize}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
            {paginatedRising30Days.map(figure => {
              const mainImage = getMainImage(figure);
              const currentScore = ReactionsService.getJealousyScore(figure.id, figure.userId!);

              return (
                <div
                  key={figure.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedFigure(figure)}
                >
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

                    <div className="absolute top-1.5 left-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +{figure.increase}
                    </div>

                    {figure.version && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs font-semibold">
                        {figure.version}
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                      {figure.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      by {figure.ownerDisplayName}
                    </p>

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
            currentPage={rising30DaysPage}
            totalItems={risingStars30Days.length}
            pageSize={rising30DaysPageSize}
            onPageChange={setRising30DaysPage}
            onPageSizeChange={setRising30DaysPageSize}
          />
          </>
          )}
        </div>

        {/* Custom Period Section */}
        <div className="mb-8 bg-green-100/70 dark:bg-green-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Rising Stars - Custom Period</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">({risingStarsCustom.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="custom-days" className="text-sm text-gray-700 dark:text-gray-300">Days back:</label>
              <Input
                id="custom-days"
                type="number"
                min="1"
                max="365"
                value={customDaysBack}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value > 0 && value <= 365) {
                    setCustomDaysBack(value);
                  }
                }}
                onBlur={loadFeedData}
                className="w-20"
              />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Figures with the biggest jealousy score increases over the past {customDaysBack} days
          </p>

          {risingStarsCustom.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No rising stars in the past {customDaysBack} days</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Try a different time period or check back later!
              </p>
            </div>
          ) : (
            <>
          <Pagination
            currentPage={risingCustomPage}
            totalItems={risingStarsCustom.length}
            pageSize={risingCustomPageSize}
            onPageChange={setRisingCustomPage}
            onPageSizeChange={setRisingCustomPageSize}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
            {paginatedRisingCustom.map(figure => {
              const mainImage = getMainImage(figure);
              const currentScore = ReactionsService.getJealousyScore(figure.id, figure.userId!);

              return (
                <div
                  key={figure.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedFigure(figure)}
                >
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

                    <div className="absolute top-1.5 left-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +{figure.increase}
                    </div>

                    {figure.version && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs font-semibold">
                        {figure.version}
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                      {figure.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      by {figure.ownerDisplayName}
                    </p>

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
            currentPage={risingCustomPage}
            totalItems={risingStarsCustom.length}
            pageSize={risingCustomPageSize}
            onPageChange={setRisingCustomPage}
            onPageSizeChange={setRisingCustomPageSize}
          />
          </>
          )}
        </div>
        </>
      )}

      {/* Suggested Collectors Tab */}
      {feedTab === 'collectors' && (
        <>
        <div className="mb-8 bg-purple-100/70 dark:bg-purple-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Suggested Collectors</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Collectors matched based on franchise/IP, release years, figure sizes, and collection overlap
          </p>

          {suggestedUsers.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No suggested collectors yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Add figures to your collection to get personalized suggestions!
              </p>
            </div>
          ) : (
            <>
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
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onNavigateToBrowse && onNavigateToBrowse(user.id)}
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

                {/* Match Reason */}
                <div className="mb-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-purple-600 dark:text-purple-400" />
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {user.matchReason}
                    </p>
                  </div>
                  <div className="mt-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                    Match Score: {user.suggestionScore}
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdmire(user.id);
                  }}
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
          </>
          )}
        </div>

        {/* High Rising Suggested Collectors Section */}
        <div className="mb-8 bg-orange-100/70 dark:bg-orange-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-6 w-6 text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">High Rising Suggested Collectors</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Collectors with the most rising star figures gaining momentum
          </p>

          {risingSuggestedUsers.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No rising collectors found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Collectors with trending figures will appear here!
              </p>
            </div>
          ) : (
            <>
          <Pagination
            currentPage={risingSuggestedPage}
            totalItems={risingSuggestedUsers.length}
            pageSize={risingSuggestedPageSize}
            onPageChange={setRisingSuggestedPage}
            onPageSizeChange={setRisingSuggestedPageSize}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
            {paginatedRisingSuggested.map(user => (
              <div
                key={user.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onNavigateToBrowse && onNavigateToBrowse(user.id)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-lg">
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

                {/* Match Reason */}
                <div className="mb-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 border border-orange-200 dark:border-orange-700">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-orange-600 dark:text-orange-400" />
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {user.matchReason}
                    </p>
                  </div>
                  <div className="mt-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                    Momentum Score: {user.suggestionScore}
                  </div>
                </div>

                {admiringUsers.includes(user.id) ? (
                  <Button
                    size="sm"
                    className="w-full bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                    disabled
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Already Following
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdmire(user.id);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Send Admirer Request
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Pagination
            currentPage={risingSuggestedPage}
            totalItems={risingSuggestedUsers.length}
            pageSize={risingSuggestedPageSize}
            onPageChange={setRisingSuggestedPage}
            onPageSizeChange={setRisingSuggestedPageSize}
          />
          </>
          )}
        </div>

        {/* Most Jealous Suggested Collectors Section */}
        <div className="mb-8 bg-red-100/70 dark:bg-red-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-6 w-6 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Most Jealous Suggested Collectors</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Collectors with figures generating the most jealousy from the community
          </p>

          {jealousSuggestedUsers.length === 0 ? (
            <div className="text-center py-12">
              <Flame className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No jealous collectors found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Collectors with highly jealousy-inducing figures will appear here!
              </p>
            </div>
          ) : (
            <>
          <Pagination
            currentPage={jealousSuggestedPage}
            totalItems={jealousSuggestedUsers.length}
            pageSize={jealousSuggestedPageSize}
            onPageChange={setJealousSuggestedPage}
            onPageSizeChange={setJealousSuggestedPageSize}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
            {paginatedJealousSuggested.map(user => (
              <div
                key={user.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onNavigateToBrowse && onNavigateToBrowse(user.id)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
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

                {/* Match Reason */}
                <div className="mb-3 bg-red-50 dark:bg-red-900/20 rounded-lg p-2 border border-red-200 dark:border-red-700">
                  <div className="flex items-start gap-2">
                    <Flame className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {user.matchReason}
                    </p>
                  </div>
                  <div className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                    Jealousy Score: {user.suggestionScore}
                  </div>
                </div>

                {admiringUsers.includes(user.id) ? (
                  <Button
                    size="sm"
                    className="w-full bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                    disabled
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Already Following
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdmire(user.id);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Send Admirer Request
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Pagination
            currentPage={jealousSuggestedPage}
            totalItems={jealousSuggestedUsers.length}
            pageSize={jealousSuggestedPageSize}
            onPageChange={setJealousSuggestedPage}
            onPageSizeChange={setJealousSuggestedPageSize}
          />
          </>
          )}
        </div>

        {/* Random Collectors Section */}
        <div className="mb-8 bg-teal-100/70 dark:bg-teal-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-6 w-6 text-teal-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Random Collectors</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">({randomCollectors.length})</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Discover collectors from the community
          </p>

          {randomCollectors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No collectors found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Check back later to discover new collectors!
              </p>
            </div>
          ) : (
            <>
          <Pagination
            currentPage={randomCollectorsPage}
            totalItems={randomCollectors.length}
            pageSize={randomCollectorsPageSize}
            onPageChange={setRandomCollectorsPage}
            onPageSizeChange={setRandomCollectorsPageSize}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {paginatedRandomCollectors.map(collector => (
              <div
                key={collector.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onNavigateToBrowse && onNavigateToBrowse(collector.id)}
              >
                {/* User info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                    {collector.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {collector.displayName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      @{collector.username}
                    </p>
                  </div>
                </div>

                {/* Sample figures - 4 small thumbnails in a grid */}
                {collector.sampleFigures.length > 0 && (
                  <div className="grid grid-cols-4 gap-1 mb-3">
                    {collector.sampleFigures.map(fig => {
                      const img = fig.imageUrl || fig.customImageUrl;
                      return (
                        <div key={fig.id} className="aspect-square bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                          {img ? (
                            <img src={img} alt={fig.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAdmire(collector.id)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Send Request
                  </Button>
                  {onNavigateToBrowse && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onNavigateToBrowse(collector.id)}
                    >
                      View
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={randomCollectorsPage}
            totalItems={randomCollectors.length}
            pageSize={randomCollectorsPageSize}
            onPageChange={setRandomCollectorsPage}
            onPageSizeChange={setRandomCollectorsPageSize}
          />
          </>
          )}
        </div>
        </>
      )}

      {/* Recently Added Tab */}
      {feedTab === 'recent' && (
        <>
        {/* 7 Days Section */}
        <div className="mb-8 bg-pink-100/70 dark:bg-pink-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-pink-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recently Added - Last 7 Days</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">({recentFigures7Days.length})</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Figures added or made public in the past week
          </p>

          {recentFigures7Days.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No recently added figures in the past 7 days</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Check back later as collectors add new figures!
              </p>
            </div>
          ) : (
            <>
          <Pagination
            currentPage={recent7DaysPage}
            totalItems={recentFigures7Days.length}
            pageSize={recent7DaysPageSize}
            onPageChange={setRecent7DaysPage}
            onPageSizeChange={setRecent7DaysPageSize}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
            {paginatedRecent7Days.map(figure => {
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
            currentPage={recent7DaysPage}
            totalItems={recentFigures7Days.length}
            pageSize={recent7DaysPageSize}
            onPageChange={setRecent7DaysPage}
            onPageSizeChange={setRecent7DaysPageSize}
          />
          </>
          )}
        </div>

        {/* 30 Days Section */}
        <div className="mb-8 bg-blue-100/70 dark:bg-blue-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recently Added - Last Month</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">({recentFigures30Days.length})</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Figures added or made public in the past 30 days
          </p>

          {recentFigures30Days.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No recently added figures in the past 30 days</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Check back later as collectors add new figures!
              </p>
            </div>
          ) : (
            <>
          <Pagination
            currentPage={recent30DaysPage}
            totalItems={recentFigures30Days.length}
            pageSize={recent30DaysPageSize}
            onPageChange={setRecent30DaysPage}
            onPageSizeChange={setRecent30DaysPageSize}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
            {paginatedRecent30Days.map(figure => {
              const mainImage = getMainImage(figure);

              return (
                <div
                  key={figure.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedFigure(figure)}
                >
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
                    {figure.version && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs font-semibold">
                        {figure.version}
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate">
                      {figure.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      by {figure.ownerDisplayName}
                    </p>

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
            currentPage={recent30DaysPage}
            totalItems={recentFigures30Days.length}
            pageSize={recent30DaysPageSize}
            onPageChange={setRecent30DaysPage}
            onPageSizeChange={setRecent30DaysPageSize}
          />
          </>
          )}
        </div>

        {/* Custom Period Section */}
        <div className="mb-8 bg-green-100/70 dark:bg-green-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recently Added - Custom Period</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">({recentFiguresCustom.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="recent-custom-days" className="text-sm text-gray-700 dark:text-gray-300">Days back:</label>
              <Input
                id="recent-custom-days"
                type="number"
                min="1"
                max="365"
                value={recentCustomDaysBack}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value > 0 && value <= 365) {
                    setRecentCustomDaysBack(value);
                  }
                }}
                onBlur={loadFeedData}
                className="w-20"
              />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Figures added or made public in the past {recentCustomDaysBack} days
          </p>

          {recentFiguresCustom.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No recently added figures in the past {recentCustomDaysBack} days</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Try a different time period or check back later!
              </p>
            </div>
          ) : (
            <>
          <Pagination
            currentPage={recentCustomPage}
            totalItems={recentFiguresCustom.length}
            pageSize={recentCustomPageSize}
            onPageChange={setRecentCustomPage}
            onPageSizeChange={setRecentCustomPageSize}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
            {paginatedRecentCustom.map(figure => {
              const mainImage = getMainImage(figure);

              return (
                <div
                  key={figure.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedFigure(figure)}
                >
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
                    {figure.version && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs font-semibold">
                        {figure.version}
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate">
                      {figure.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      by {figure.ownerDisplayName}
                    </p>

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
            currentPage={recentCustomPage}
            totalItems={recentFiguresCustom.length}
            pageSize={recentCustomPageSize}
            onPageChange={setRecentCustomPage}
            onPageSizeChange={setRecentCustomPageSize}
          />
          </>
          )}
        </div>
        </>
      )}

      {/* Community Activity Tab */}
      {feedTab === 'activity' && (
        <div className="mb-8 bg-blue-100/70 dark:bg-blue-900/20 rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Community Activity</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            See what's happening in the community - recent additions, trades, milestones, and more!
          </p>

          {/* Activity Feed Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              onClick={() => setActivityMode('trending')}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activityMode === 'trending'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              <TrendingUp className="h-4 w-4 inline mr-1" />
              Trending
            </button>
            <button
              onClick={() => setActivityMode('recent')}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activityMode === 'recent'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              <Clock className="h-4 w-4 inline mr-1" />
              Recent
            </button>
          </div>

          <CommunityActivityFeed
            currentUser={currentUser}
            onNavigateToUser={(userId) => {
              if (onNavigateToBrowse) {
                onNavigateToBrowse(userId);
              }
            }}
            onNavigateToFigure={(figureId) => {
              // Look for the figure in the current data and show modal
              const allFigures = [
                ...risingStars7Days,
                ...risingStars30Days,
                ...risingStarsCustom,
                ...topJealousyFigures,
                ...admiredFigures,
                ...recentFigures7Days,
                ...recentFigures30Days,
                ...recentFiguresCustom
              ];
              const figure = allFigures.find(f => f.id === figureId);
              if (figure) {
                setSelectedFigure(figure);
              }
            }}
            mode={activityMode}
            limit={50}
            showHeader={false}
            showRefresh={true}
          />
        </div>
      )}

      {/* Global Statistics Tab */}
      {feedTab === 'stats' && (
        <GlobalStatisticsPage />
      )}

      {/* Empty state */}
      {risingStars7Days.length === 0 && risingStars30Days.length === 0 && risingStarsCustom.length === 0 && recentFigures7Days.length === 0 && recentFigures30Days.length === 0 && recentFiguresCustom.length === 0 && suggestedUsers.length === 0 && randomCollectors.length === 0 && topJealousyFigures.length === 0 && (
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
          currentUser={currentUser}
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

export default FeedPage;

import type { ActionFigure, Milestone, UnlockedMilestone, MilestoneCategory } from '../types/index';
import { ReactionsService } from './reactions';
import { SeriesSetsService } from './seriesSets';

const STORAGE_KEY = 'unlocked-milestones';

// Define all milestones
const MILESTONES: Milestone[] = [
  // Value Milestones
  {
    id: 'first-figure',
    name: 'First Figure',
    description: 'Add your first action figure to your collection',
    category: 'value',
    threshold: 1,
    icon: 'Package',
  },
  {
    id: '10-figures',
    name: 'Collector',
    description: 'Reach 10 figures in your collection',
    category: 'value',
    threshold: 10,
    icon: 'Box',
  },
  {
    id: '50-figures',
    name: 'Serious Collector',
    description: 'Reach 50 figures in your collection',
    category: 'value',
    threshold: 50,
    icon: 'Boxes',
  },
  {
    id: '100-figures',
    name: 'Centurion',
    description: 'Reach 100 figures in your collection',
    category: 'value',
    threshold: 100,
    icon: 'Trophy',
  },
  {
    id: '500-figures',
    name: 'Master Collector',
    description: 'Reach 500 figures in your collection',
    category: 'value',
    threshold: 500,
    icon: 'Crown',
  },
  {
    id: 'value-500',
    name: 'Getting Started',
    description: 'Reach $500 total collection value',
    category: 'value',
    threshold: 500,
    icon: 'DollarSign',
  },
  {
    id: 'value-1000',
    name: 'Investor',
    description: 'Reach $1,000 total collection value',
    category: 'value',
    threshold: 1000,
    icon: 'TrendingUp',
  },
  {
    id: 'value-5000',
    name: 'Big Spender',
    description: 'Reach $5,000 total collection value',
    category: 'value',
    threshold: 5000,
    icon: 'Coins',
  },
  {
    id: 'value-10000',
    name: 'High Roller',
    description: 'Reach $10,000 total collection value',
    category: 'value',
    threshold: 10000,
    icon: 'Banknote',
  },
  {
    id: 'value-25000',
    name: 'Serious Investment',
    description: 'Reach $25,000 total collection value',
    category: 'value',
    threshold: 25000,
    icon: 'Gem',
  },

  // Social Milestones
  {
    id: 'first-reaction',
    name: 'First Reaction',
    description: 'Receive your first reaction on a figure',
    category: 'social',
    threshold: 1,
    icon: 'Heart',
  },
  {
    id: '10-reactions',
    name: 'Getting Popular',
    description: 'Receive 10 total reactions across all figures',
    category: 'social',
    threshold: 10,
    icon: 'ThumbsUp',
  },
  {
    id: '50-reactions',
    name: 'Community Favorite',
    description: 'Receive 50 total reactions across all figures',
    category: 'social',
    threshold: 50,
    icon: 'Star',
  },
  {
    id: '100-reactions',
    name: 'Celebrity Collector',
    description: 'Receive 100 total reactions across all figures',
    category: 'social',
    threshold: 100,
    icon: 'Award',
  },
  {
    id: '500-reactions',
    name: 'Influencer',
    description: 'Receive 500 total reactions across all figures',
    category: 'social',
    threshold: 500,
    icon: 'TrendingUp',
  },
  {
    id: 'jealousy-10',
    name: 'Envy Starter',
    description: 'Receive 10 jealousy reactions',
    category: 'social',
    threshold: 10,
    icon: 'Flame',
  },
  {
    id: 'jealousy-50',
    name: 'Envy King',
    description: 'Receive 50 jealousy reactions',
    category: 'social',
    threshold: 50,
    icon: 'Zap',
  },
  {
    id: 'jealousy-100',
    name: 'Jealousy Legend',
    description: 'Receive 100 jealousy reactions',
    category: 'social',
    threshold: 100,
    icon: 'Sparkles',
  },
  {
    id: 'love-25',
    name: 'Beloved Collection',
    description: 'Receive 25 love reactions',
    category: 'social',
    threshold: 25,
    icon: 'Heart',
  },
  {
    id: 'fire-25',
    name: 'Hot Collection',
    description: 'Receive 25 fire reactions',
    category: 'social',
    threshold: 25,
    icon: 'Flame',
  },

  // Completeness Milestones
  {
    id: 'first-complete-set',
    name: 'Completionist',
    description: 'Complete your first series or set',
    category: 'completeness',
    threshold: 1,
    icon: 'CheckCircle',
  },
  {
    id: '3-complete-sets',
    name: 'Set Master',
    description: 'Complete 3 different series or sets',
    category: 'completeness',
    threshold: 3,
    icon: 'CheckCircle2',
  },
  {
    id: '5-complete-sets',
    name: 'Collection Perfectionist',
    description: 'Complete 5 different series or sets',
    category: 'completeness',
    threshold: 5,
    icon: 'Target',
  },
  {
    id: '10-complete-sets',
    name: 'Ultimate Completionist',
    description: 'Complete 10 different series or sets',
    category: 'completeness',
    threshold: 10,
    icon: 'Medal',
  },

  // Diversity Milestones
  {
    id: '3-manufacturers',
    name: 'Brand Explorer',
    description: 'Collect figures from 3 different manufacturers',
    category: 'diversity',
    threshold: 3,
    icon: 'Factory',
  },
  {
    id: '5-manufacturers',
    name: 'Multi-Brand Collector',
    description: 'Collect figures from 5 different manufacturers',
    category: 'diversity',
    threshold: 5,
    icon: 'Building2',
  },
  {
    id: '10-manufacturers',
    name: 'Manufacturer Expert',
    description: 'Collect figures from 10 different manufacturers',
    category: 'diversity',
    threshold: 10,
    icon: 'Building',
  },
  {
    id: '5-categories',
    name: 'Versatile Collector',
    description: 'Collect figures from 5 different categories',
    category: 'diversity',
    threshold: 5,
    icon: 'Grid',
  },
  {
    id: '10-categories',
    name: 'Category Master',
    description: 'Collect figures from 10 different categories',
    category: 'diversity',
    threshold: 10,
    icon: 'Grid3x3',
  },
  {
    id: 'all-conditions',
    name: 'Condition Connoisseur',
    description: 'Own figures in MIB, Loose, and Custom conditions',
    category: 'diversity',
    threshold: 3,
    icon: 'Package',
  },
  {
    id: 'vintage-collector',
    name: 'Vintage Collector',
    description: 'Own at least 10 figures released before 2000',
    category: 'diversity',
    threshold: 10,
    icon: 'Clock',
  },
  {
    id: 'modern-collector',
    name: 'Modern Collector',
    description: 'Own at least 25 figures released after 2010',
    category: 'diversity',
    threshold: 25,
    icon: 'Sparkles',
  },
];

export class MilestonesService {
  // Get all milestone definitions
  static getAllMilestones(): Milestone[] {
    return MILESTONES;
  }

  // Get milestones by category
  static getMilestonesByCategory(category: MilestoneCategory): Milestone[] {
    return MILESTONES.filter(m => m.category === category);
  }

  // Get unlocked milestones for user
  private static getUnlockedMilestones(userId: string): UnlockedMilestone[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY}-${userId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading unlocked milestones:', error);
      return [];
    }
  }

  // Save unlocked milestones for user
  private static saveUnlockedMilestones(userId: string, milestones: UnlockedMilestone[]): void {
    try {
      localStorage.setItem(`${STORAGE_KEY}-${userId}`, JSON.stringify(milestones));
    } catch (error) {
      console.error('Error saving unlocked milestones:', error);
    }
  }

  // Check if milestone is unlocked
  static isMilestoneUnlocked(userId: string, milestoneId: string): boolean {
    const unlocked = this.getUnlockedMilestones(userId);
    return unlocked.some(m => m.id === milestoneId);
  }

  // Get all unlocked milestones with full details
  static getUnlockedMilestonesWithDetails(userId: string): UnlockedMilestone[] {
    return this.getUnlockedMilestones(userId);
  }

  // Get progress for a specific milestone
  static getMilestoneProgress(
    milestone: Milestone,
    userId: string,
    figures: ActionFigure[]
  ): {
    current: number;
    target: number;
    percentage: number;
  } {
    const current = this.getCurrentValue(milestone, userId, figures);
    const target = milestone.threshold;
    const percentage = Math.min((current / target) * 100, 100);

    return { current, target, percentage };
  }

  // Get current value for milestone check
  private static getCurrentValue(
    milestone: Milestone,
    userId: string,
    figures: ActionFigure[]
  ): number {
    switch (milestone.id) {
      // Figure count milestones
      case 'first-figure':
      case '10-figures':
      case '50-figures':
      case '100-figures':
      case '500-figures':
        return figures.length;

      // Value milestones
      case 'value-500':
      case 'value-1000':
      case 'value-5000':
      case 'value-10000':
      case 'value-25000':
        return figures.reduce((sum, f) => sum + f.currentValue, 0);

      // Reaction milestones
      case 'first-reaction':
      case '10-reactions':
      case '50-reactions':
      case '100-reactions':
      case '500-reactions': {
        const publicFigureIds = figures.filter(f => f.isPublic).map(f => f.id);
        const stats = ReactionsService.getCollectionStats(userId, publicFigureIds);
        return stats ? stats.totalReactions : 0;
      }

      // Jealousy milestones
      case 'jealousy-10':
      case 'jealousy-50':
      case 'jealousy-100': {
        const publicFigureIds = figures.filter(f => f.isPublic).map(f => f.id);
        const stats = ReactionsService.getCollectionStats(userId, publicFigureIds);
        return stats ? stats.jealousyCount : 0;
      }

      // Love milestones
      case 'love-25': {
        const publicFigureIds = figures.filter(f => f.isPublic).map(f => f.id);
        const stats = ReactionsService.getCollectionStats(userId, publicFigureIds);
        return stats ? stats.loveCount : 0;
      }

      // Fire milestones
      case 'fire-25': {
        const publicFigureIds = figures.filter(f => f.isPublic).map(f => f.id);
        const stats = ReactionsService.getCollectionStats(userId, publicFigureIds);
        return stats ? stats.fireCount : 0;
      }

      // Manufacturer diversity
      case '3-manufacturers':
      case '5-manufacturers':
      case '10-manufacturers':
        return new Set(figures.map(f => f.manufacturer)).size;

      // Category diversity
      case '5-categories':
      case '10-categories':
        return new Set(figures.map(f => f.category)).size;

      // Condition diversity
      case 'all-conditions': {
        const conditions = new Set(figures.map(f => f.condition));
        const hasBasicConditions = ['MIB', 'Loose', 'Custom'].filter(c => conditions.has(c)).length;
        return hasBasicConditions;
      }

      // Vintage collector
      case 'vintage-collector': {
        return figures.filter(f => {
          try {
            const year = new Date(f.purchaseDate).getFullYear();
            return year > 1900 && year < 2000;
          } catch {
            return false;
          }
        }).length;
      }

      // Modern collector
      case 'modern-collector': {
        return figures.filter(f => {
          try {
            const year = new Date(f.purchaseDate).getFullYear();
            return year >= 2010;
          } catch {
            return false;
          }
        }).length;
      }

      // Completeness milestones
      case 'first-complete-set':
      case '3-complete-sets':
      case '5-complete-sets':
      case '10-complete-sets':
        return SeriesSetsService.getCompletedSetsCount(userId, figures);

      default:
        return 0;
    }
  }

  // Check all milestones and return newly unlocked ones
  static checkAndUnlock(userId: string, figures: ActionFigure[]): UnlockedMilestone[] {
    const unlockedMilestones = this.getUnlockedMilestones(userId);
    const newlyUnlocked: UnlockedMilestone[] = [];

    MILESTONES.forEach(milestone => {
      // Skip if already unlocked
      if (unlockedMilestones.some(m => m.id === milestone.id)) {
        return;
      }

      const currentValue = this.getCurrentValue(milestone, userId, figures);

      if (currentValue >= milestone.threshold) {
        const unlockedMilestone: UnlockedMilestone = {
          ...milestone,
          unlockedAt: Date.now(),
        };

        unlockedMilestones.push(unlockedMilestone);
        newlyUnlocked.push(unlockedMilestone);
      }
    });

    // Save updated milestones
    if (newlyUnlocked.length > 0) {
      this.saveUnlockedMilestones(userId, unlockedMilestones);
    }

    return newlyUnlocked;
  }

  // Get count of unlocked milestones
  static getUnlockedCount(userId: string): number {
    return this.getUnlockedMilestones(userId).length;
  }

  // Get count of unlocked milestones by category
  static getUnlockedCountByCategory(userId: string, category: MilestoneCategory): number {
    const unlocked = this.getUnlockedMilestones(userId);
    return unlocked.filter(m => m.category === category).length;
  }

  // Get next milestone to unlock (closest to completion)
  static getNextMilestone(userId: string, figures: ActionFigure[]): {
    milestone: Milestone;
    progress: { current: number; target: number; percentage: number };
  } | null {
    const unlockedIds = new Set(this.getUnlockedMilestones(userId).map(m => m.id));
    const locked = MILESTONES.filter(m => !unlockedIds.has(m.id));

    if (locked.length === 0) return null;

    let closestMilestone: Milestone | null = null;
    let highestPercentage = 0;

    locked.forEach(milestone => {
      const progress = this.getMilestoneProgress(milestone, userId, figures);
      if (progress.percentage > highestPercentage) {
        highestPercentage = progress.percentage;
        closestMilestone = milestone;
      }
    });

    if (!closestMilestone) return null;

    return {
      milestone: closestMilestone,
      progress: this.getMilestoneProgress(closestMilestone, userId, figures),
    };
  }

  // Clear all milestones for user (for testing)
  static clearMilestones(userId: string): void {
    localStorage.removeItem(`${STORAGE_KEY}-${userId}`);
  }
}

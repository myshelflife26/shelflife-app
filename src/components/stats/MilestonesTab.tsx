import { useMemo, useState } from 'react';
import type { ActionFigure, Milestone, MilestoneCategory } from '../../types/index';
import { MilestonesService } from '../../utils/milestones';
import { AuthService } from '../../utils/auth';
import {
  Package,
  DollarSign,
  TrendingUp,
  Heart,
  Flame,
  ThumbsUp,
  Star,
  Award,
  CheckCircle,
  Target,
  Factory,
  Grid,
  Clock,
  Sparkles,
  Trophy,
  Crown,
  Zap,
  Medal,
  Box,
  Coins,
  Gem,
  Banknote,
} from 'lucide-react';

interface MilestonesTabProps {
  figures: ActionFigure[];
}

// Icon mapping
const ICON_MAP: Record<string, any> = {
  Package,
  DollarSign,
  TrendingUp,
  Heart,
  Flame,
  ThumbsUp,
  Star,
  Award,
  CheckCircle,
  Target,
  Factory,
  Grid,
  Clock,
  Sparkles,
  Trophy,
  Crown,
  Zap,
  Medal,
  Box,
  Coins,
  Gem,
  Banknote,
  CheckCircle2: CheckCircle,
  Building: Factory,
  Building2: Factory,
  Grid3x3: Grid,
  Boxes: Box,
};

const CATEGORY_LABELS: Record<MilestoneCategory, string> = {
  value: 'Value',
  social: 'Social',
  completeness: 'Completeness',
  diversity: 'Diversity',
};

const CATEGORY_COLORS: Record<MilestoneCategory, { bg: string; text: string; border: string }> = {
  value: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  social: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  completeness: {
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  diversity: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
};

export function MilestonesTab({ figures }: MilestonesTabProps) {
  const currentUser = AuthService.getCurrentUser();
  const [selectedCategory, setSelectedCategory] = useState<MilestoneCategory | 'all'>('all');

  const milestonesData = useMemo(() => {
    if (!currentUser) return { unlocked: [], inProgress: [], locked: [] };

    const allMilestones = MilestonesService.getAllMilestones();
    const unlockedMilestones = MilestonesService.getUnlockedMilestonesWithDetails(currentUser.id);
    const unlockedIds = new Set(unlockedMilestones.map(m => m.id));

    const unlocked = unlockedMilestones.map(m => ({
      milestone: m,
      progress: { current: m.threshold, target: m.threshold, percentage: 100 },
    }));

    const remaining = allMilestones.filter(m => !unlockedIds.has(m.id));

    const inProgress: Array<{
      milestone: Milestone;
      progress: { current: number; target: number; percentage: number };
    }> = [];

    const locked: Array<{
      milestone: Milestone;
      progress: { current: number; target: number; percentage: number };
    }> = [];

    remaining.forEach(milestone => {
      const progress = MilestonesService.getMilestoneProgress(milestone, currentUser.id, figures);

      if (progress.percentage > 0 && progress.percentage < 100) {
        inProgress.push({ milestone, progress });
      } else {
        locked.push({ milestone, progress });
      }
    });

    // Sort in progress by completion percentage (descending)
    inProgress.sort((a, b) => b.progress.percentage - a.progress.percentage);

    return { unlocked, inProgress, locked };
  }, [figures, currentUser]);

  // Filter by category
  const filteredData = useMemo(() => {
    if (selectedCategory === 'all') {
      return milestonesData;
    }

    return {
      unlocked: milestonesData.unlocked.filter(m => m.milestone.category === selectedCategory),
      inProgress: milestonesData.inProgress.filter(m => m.milestone.category === selectedCategory),
      locked: milestonesData.locked.filter(m => m.milestone.category === selectedCategory),
    };
  }, [milestonesData, selectedCategory]);

  const totalCount = MilestonesService.getAllMilestones().length;
  const unlockedCount = milestonesData.unlocked.length;

  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Login to track your milestones
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Milestones
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {unlockedCount} of {totalCount} unlocked
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round((unlockedCount / totalCount) * 100)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Complete</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all"
            style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          All ({totalCount})
        </button>
        {(['value', 'social', 'completeness', 'diversity'] as MilestoneCategory[]).map(category => {
          const count = MilestonesService.getMilestonesByCategory(category).length;
          const unlockedInCategory = MilestonesService.getUnlockedCountByCategory(currentUser.id, category);

          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category
                  ? `${CATEGORY_COLORS[category].bg} ${CATEGORY_COLORS[category].text} ${CATEGORY_COLORS[category].border} border-2`
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {CATEGORY_LABELS[category]} ({unlockedInCategory}/{count})
            </button>
          );
        })}
      </div>

      {/* Unlocked Milestones */}
      {filteredData.unlocked.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Unlocked ({filteredData.unlocked.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.unlocked.map(({ milestone }) => {
              const Icon = ICON_MAP[milestone.icon] || Package;
              const colors = CATEGORY_COLORS[milestone.category];

              return (
                <div
                  key={milestone.id}
                  className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4 transition-transform hover:scale-105`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`${colors.text} p-2 rounded-lg ${colors.bg}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-semibold ${colors.text}`}>
                          {milestone.name}
                        </h4>
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {milestone.description}
                      </p>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Unlocked {new Date(milestone.unlockedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* In Progress Milestones */}
      {filteredData.inProgress.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            In Progress ({filteredData.inProgress.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.inProgress.map(({ milestone, progress }) => {
              const Icon = ICON_MAP[milestone.icon] || Package;
              const colors = CATEGORY_COLORS[milestone.category];

              return (
                <div
                  key={milestone.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`${colors.text} p-2 rounded-lg ${colors.bg}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {milestone.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {progress.current} / {progress.target}
                      </span>
                      <span className={`font-semibold ${colors.text}`}>
                        {progress.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${colors.bg.replace('50', '500').replace('950', '500')}`}
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked Milestones */}
      {filteredData.locked.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Locked ({filteredData.locked.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.locked.map(({ milestone, progress }) => {
              const Icon = ICON_MAP[milestone.icon] || Package;

              return (
                <div
                  key={milestone.id}
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800">
                      <Icon className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        {milestone.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {milestone.description}
                      </p>
                      <div className="text-xs text-gray-400 dark:text-gray-600 mt-2">
                        Requirement: {progress.target}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

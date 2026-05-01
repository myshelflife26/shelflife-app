import { useMemo, useState, useEffect } from 'react';
import type { ActionFigure, AppSettings } from '../types/index';
import { ReactionsService } from '../utils/reactions';
import { AuthService } from '../utils/auth';
import { Storage } from '../utils/storage';
import { SettingsService } from '../utils/settings';
import { TrendingUp, DollarSign, Package, Calendar, ThumbsUp, Heart, Flame, Award, Trophy, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { Select } from './ui/select';
import { Button } from './ui/button';
import { StatsTabNavigation, type StatsTab } from './stats/StatsTabNavigation';
import { TrendsTab } from './stats/TrendsTab';
import { MilestonesTab } from './stats/MilestonesTab';
import { CompletenessTab } from './stats/CompletenessTab';
import { ComparativeTab } from './stats/ComparativeTab';

interface StatsViewProps {
  figures: ActionFigure[];
}

export function StatsView({ figures }: StatsViewProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');
  const [topTenScope, setTopTenScope] = useState<'my-collection' | 'global'>('my-collection');
  const [topTenPages, setTopTenPages] = useState({
    mostValuable: 1,
    jealousy: 1,
    mostReacted: 1,
    appreciate: 1,
    love: 1,
    fire: 1,
  });
  const [topTenFilters, setTopTenFilters] = useState<{
    manufacturer?: string;
    category?: string;
    size?: string;
    condition?: string;
    packaging?: string;
    minValue?: number;
    maxValue?: number;
    customField?: string;
    customFieldValue?: string;
  }>({});

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const loadSettings = async () => {
      const loadedSettings = await SettingsService.getSettings();
      setSettings(loadedSettings);
    };
    loadSettings();
  }, []);

  if (!settings) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  // Reset all pages when filters or scope changes
  const resetPages = () => {
    setTopTenPages({
      mostValuable: 1,
      jealousy: 1,
      mostReacted: 1,
      appreciate: 1,
      love: 1,
      fire: 1,
    });
  };

  // Calculate actual rank for pagination
  const getRank = (index: number, page: number) => {
    return (page - 1) * ITEMS_PER_PAGE + index + 1;
  };

  const stats = useMemo(() => {
    const totalFigures = figures.length;
    const totalValue = figures.reduce((sum, f) => sum + f.currentValue, 0);
    const averageValue = totalFigures > 0 ? totalValue / totalFigures : 0;

    // Condition breakdown
    const conditionCounts = figures.reduce((acc, f) => {
      acc[f.condition] = (acc[f.condition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Manufacturer breakdown
    const manufacturerCounts = figures.reduce((acc, f) => {
      const mfg = f.manufacturer || 'Unknown';
      acc[mfg] = (acc[mfg] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Category breakdown
    const categoryCounts = figures.reduce((acc, f) => {
      const cat = f.category || 'Unknown';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Value by condition
    const valueByCondition = figures.reduce((acc, f) => {
      acc[f.condition] = (acc[f.condition] || 0) + f.currentValue;
      return acc;
    }, {} as Record<string, number>);

    // Recent additions (last 5 by purchase date)
    const recentFigures = [...figures]
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      .slice(0, 5);

    // Reactions stats (only for public figures)
    const currentUser = AuthService.getCurrentUser();
    const publicFigureIds = figures.filter(f => f.isPublic || currentUser?.collectionPublic).map(f => f.id);
    const reactionStats = currentUser ? ReactionsService.getCollectionStats(currentUser.id, publicFigureIds) : null;
    const topReactedFigures = currentUser ? ReactionsService.getTopFigures(currentUser.id, publicFigureIds, 5) : [];

    // Jealousy meter - figures ranked by how much others envy them
    const topJealousyFigures = currentUser ? ReactionsService.getTopFiguresByJealousy(currentUser.id, publicFigureIds, 5) : [];

    return {
      totalFigures,
      totalValue,
      averageValue,
      conditionCounts,
      manufacturerCounts,
      categoryCounts,
      valueByCondition,
      recentFigures,
      reactionStats,
      topReactedFigures,
      topJealousyFigures,
    };
  }, [figures.length]);

  // Extract filter options based on scope
  const filterOptions = useMemo(() => {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) return null;

    if (topTenScope === 'my-collection') {
      // My collection: all fields including custom
      const manufacturers = [...new Set(figures.map(f => f.manufacturer).filter(Boolean))].sort();
      const categories = [...new Set(figures.map(f => f.category).filter(Boolean))].sort();
      const sizes = [...new Set(figures.map(f => f.size).filter(Boolean))].sort();
      const conditions = [...new Set(figures.map(f => f.condition).filter(Boolean))].sort();
      const packaging = [...new Set(figures.map(f => f.packaging).filter(Boolean))].sort();

      // Get value range
      const values = figures.map(f => f.currentValue).filter(v => v > 0);
      const minValue = values.length > 0 ? Math.min(...values) : 0;
      const maxValue = values.length > 0 ? Math.max(...values) : 0;

      // Get custom field IDs that are actually used in figures
      const customFieldIds = new Set<string>();
      figures.forEach(f => {
        if (f.customFields) {
          Object.keys(f.customFields).forEach(key => customFieldIds.add(key));
        }
      });

      // Get custom field definitions from settings to map ID to name
      const customFieldOptions = settings ? Array.from(customFieldIds)
        .map(id => {
          const fieldDef = settings.customFields.find(cf => cf.id === id);
          return fieldDef ? { id: fieldDef.id, name: fieldDef.name } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a!.name.localeCompare(b!.name)) as Array<{ id: string; name: string }> : [];

      return {
        manufacturers,
        categories,
        sizes,
        conditions,
        packaging,
        minValue,
        maxValue,
        customFieldOptions
      };
    } else {
      // Global: only standard fields
      const allPublicFigures = Storage.getAllPublicFigures();
      const manufacturers = [...new Set(allPublicFigures.map(f => f.manufacturer).filter(Boolean))].sort();
      const categories = [...new Set(allPublicFigures.map(f => f.category).filter(Boolean))].sort();
      const sizes = [...new Set(allPublicFigures.map(f => f.size).filter(Boolean))].sort();
      const conditions = [...new Set(allPublicFigures.map(f => f.condition).filter(Boolean))].sort();
      const packaging = [...new Set(allPublicFigures.map(f => f.packaging).filter(Boolean))].sort();

      // Get value range
      const values = allPublicFigures.map(f => f.currentValue).filter(v => v > 0);
      const minValue = values.length > 0 ? Math.min(...values) : 0;
      const maxValue = values.length > 0 ? Math.max(...values) : 0;

      return {
        manufacturers,
        categories,
        sizes,
        conditions,
        packaging,
        minValue,
        maxValue,
        customFieldOptions: []
      };
    }
  }, [figures.length, topTenScope, settings]);

  // Top Ten calculations - depends on scope filter and filters (not pagination - handled per category)
  const topTenData = useMemo(() => {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) return null;

    // Helper function to apply filters
    const applyFilters = (figs: ActionFigure[]) => {
      let filtered = [...figs];

      if (topTenFilters.manufacturer) {
        filtered = filtered.filter(f => f.manufacturer === topTenFilters.manufacturer);
      }
      if (topTenFilters.category) {
        filtered = filtered.filter(f => f.category === topTenFilters.category);
      }
      if (topTenFilters.size) {
        filtered = filtered.filter(f => f.size === topTenFilters.size);
      }
      if (topTenFilters.condition) {
        filtered = filtered.filter(f => f.condition === topTenFilters.condition);
      }
      if (topTenFilters.packaging) {
        filtered = filtered.filter(f => f.packaging === topTenFilters.packaging);
      }
      if (topTenFilters.minValue !== undefined) {
        filtered = filtered.filter(f => f.currentValue >= topTenFilters.minValue!);
      }
      if (topTenFilters.maxValue !== undefined) {
        filtered = filtered.filter(f => f.currentValue <= topTenFilters.maxValue!);
      }
      if (topTenFilters.customField && topTenFilters.customFieldValue) {
        filtered = filtered.filter(f =>
          f.customFields?.[topTenFilters.customField!] === topTenFilters.customFieldValue
        );
      }

      return filtered;
    };

    // Helper to paginate a list
    const paginate = <T,>(list: T[], page: number): { items: T[]; total: number } => {
      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      return {
        items: list.slice(startIndex, endIndex),
        total: list.length
      };
    };

    if (topTenScope === 'my-collection') {
      // My Collection: Filter to user's figures
      const myFigures = applyFilters(figures);
      const myPublicFigureIds = applyFilters(
        figures.filter(f => f.isPublic || currentUser.collectionPublic)
      ).map(f => f.id);

      // Most valuable - uses all figures (public and private) after filtering
      const allValuableSorted = [...myFigures]
        .sort((a, b) => b.currentValue - a.currentValue)
        .map(f => ({ figureId: f.id, value: f.currentValue }));
      const mostValuableData = paginate(allValuableSorted, topTenPages.mostValuable);

      // Reactions - get ALL
      const allJealousy = ReactionsService.getTopFiguresByJealousy(currentUser.id, myPublicFigureIds, 1000);
      const allMostReacted = ReactionsService.getTopFigures(currentUser.id, myPublicFigureIds, 1000);
      const allAppreciate = ReactionsService.getTopFiguresByReactionType(myPublicFigureIds, 'appreciate', 1000);
      const allLove = ReactionsService.getTopFiguresByReactionType(myPublicFigureIds, 'love', 1000);
      const allFire = ReactionsService.getTopFiguresByReactionType(myPublicFigureIds, 'fire', 1000);

      return {
        mostValuable: mostValuableData.items,
        mostValuableTotal: mostValuableData.total,
        jealousy: paginate(allJealousy, topTenPages.jealousy).items,
        jealousyTotal: allJealousy.length,
        mostReacted: paginate(allMostReacted, topTenPages.mostReacted).items,
        mostReactedTotal: allMostReacted.length,
        appreciate: paginate(allAppreciate, topTenPages.appreciate).items,
        appreciateTotal: allAppreciate.length,
        love: paginate(allLove, topTenPages.love).items,
        loveTotal: allLove.length,
        fire: paginate(allFire, topTenPages.fire).items,
        fireTotal: allFire.length,
      };
    } else {
      // Global: All public figures from all users
      const allPublicFigures = Storage.getAllPublicFigures();
      const filteredPublicFigures = applyFilters(allPublicFigures);
      if (filteredPublicFigures.length === 0) return null;

      const filteredPublicFigureIds = filteredPublicFigures.map(f => f.id);
      const figureIdsWithOwners = filteredPublicFigures.map(f => ({
        figureId: f.id,
        ownerId: f.userId || 'unknown'
      }));

      // Most valuable - global public figures after filtering
      const allValuableSorted = [...filteredPublicFigures]
        .sort((a, b) => b.currentValue - a.currentValue)
        .map(f => ({ figureId: f.id, value: f.currentValue }));
      const mostValuableData = paginate(allValuableSorted, topTenPages.mostValuable);

      // Reactions - get ALL
      const allJealousy = ReactionsService.getTopGlobalFiguresByJealousy(figureIdsWithOwners, 1000);
      const allReactions = filteredPublicFigureIds.map(figureId => ({
        figureId,
        stats: ReactionsService.getStatsForFigure(figureId)
      })).sort((a, b) => b.stats.total - a.stats.total);
      const allAppreciate = ReactionsService.getTopGlobalFiguresByReactionType(filteredPublicFigureIds, 'appreciate', 1000);
      const allLove = ReactionsService.getTopGlobalFiguresByReactionType(filteredPublicFigureIds, 'love', 1000);
      const allFire = ReactionsService.getTopGlobalFiguresByReactionType(filteredPublicFigureIds, 'fire', 1000);

      return {
        mostValuable: mostValuableData.items,
        mostValuableTotal: mostValuableData.total,
        jealousy: paginate(allJealousy, topTenPages.jealousy).items,
        jealousyTotal: allJealousy.length,
        mostReacted: paginate(allReactions, topTenPages.mostReacted).items,
        mostReactedTotal: allReactions.length,
        appreciate: paginate(allAppreciate, topTenPages.appreciate).items,
        appreciateTotal: allAppreciate.length,
        love: paginate(allLove, topTenPages.love).items,
        loveTotal: allLove.length,
        fire: paginate(allFire, topTenPages.fire).items,
        fireTotal: allFire.length,
      };
    }
  }, [figures.length, topTenScope, topTenFilters, topTenPages]);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    subValue,
  }: {
    icon: any;
    label: string;
    value: string;
    subValue?: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subValue && <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{subValue}</p>}
        </div>
        <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
          <Icon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
        </div>
      </div>
    </div>
  );

  const BarChart = ({
    data,
    title,
    valuePrefix = '',
  }: {
    data: Record<string, number>;
    title: string;
    valuePrefix?: string;
  }) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const maxValue = Math.max(...entries.map(([, v]) => v));

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="space-y-3">
          {entries.map(([label, value]) => {
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
            return (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {valuePrefix}
                    {valuePrefix === '$' ? value.toFixed(2) : value}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const TopFiguresTable = ({
    figures,
    title,
  }: {
    figures: ActionFigure[];
    title: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="space-y-3">
        {figures.map((figure, index) => (
          <div
            key={figure.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full font-semibold text-sm">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {figure.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {figure.manufacturer} • {figure.condition}
                </p>
              </div>
            </div>
            <div className="text-right ml-4">
              <p className="font-semibold text-gray-900 dark:text-white">
                ${figure.currentValue.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const RecentAdditionsTable = ({
    figures,
    title,
  }: {
    figures: ActionFigure[];
    title: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="space-y-3">
        {figures.map((figure) => (
          <div
            key={figure.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{figure.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {figure.manufacturer} • {figure.condition}
              </p>
            </div>
            <div className="text-right ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(figure.purchaseDate).toLocaleDateString()}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                ${figure.currentValue.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (figures.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No data to display. Add some figures to see statistics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <StatsTabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Total Figures"
          value={stats.totalFigures.toString()}
        />
        <StatCard
          icon={DollarSign}
          label="Total Value"
          value={`$${stats.totalValue.toFixed(2)}`}
        />
        <StatCard
          icon={TrendingUp}
          label="Average Value"
          value={`$${stats.averageValue.toFixed(2)}`}
        />
        <StatCard
          icon={Calendar}
          label="Latest Addition"
          value={stats.recentFigures[0]?.name || 'N/A'}
          subValue={
            stats.recentFigures[0]
              ? new Date(stats.recentFigures[0].purchaseDate).toLocaleDateString()
              : undefined
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart
          data={stats.conditionCounts}
          title="Figures by Condition"
        />
        <BarChart
          data={stats.valueByCondition}
          title="Total Value by Condition"
          valuePrefix="$"
        />
      </div>

      {/* Manufacturer and Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart
          data={stats.manufacturerCounts}
          title="Figures by Manufacturer"
        />
        <BarChart
          data={stats.categoryCounts}
          title="Figures by Category"
        />
      </div>

      {/* Recent Additions */}
      <div className="grid grid-cols-1 gap-6">
        <RecentAdditionsTable
          figures={stats.recentFigures}
          title="Recent Additions"
        />
      </div>

      {/* Reactions Stats - Only shown if there are reactions */}
      {stats.reactionStats && stats.reactionStats.total > 0 && (
        <>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="h-6 w-6 text-yellow-600" />
              Community Reactions
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              See how others are reacting to your public figures
            </p>
          </div>

          {/* Reaction Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Reactions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.reactionStats.total}
                  </p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
                  <Award className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Appreciates</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.reactionStats.appreciate}
                  </p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                  <ThumbsUp className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Loves</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.reactionStats.love}
                  </p>
                </div>
                <div className="bg-pink-100 dark:bg-pink-900 p-3 rounded-lg">
                  <Heart className="h-6 w-6 text-pink-600 dark:text-pink-300" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Fire</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.reactionStats.fire}
                  </p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg">
                  <Flame className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                </div>
              </div>
            </div>
          </div>

          {/* Jealousy Meter and Most Reacted Figures moved to Top Five Rankings section below */}

          {/* Old standalone sections removed - now integrated in Top Five Rankings */}
        </>
      )}

      {/* Top Ten Section */}
      {topTenData && (
        <>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Top Ten Rankings
                </h2>
              </div>
              {/* Scope Filter Toggle */}
              <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => {
                    setTopTenScope('my-collection');
                    resetPages();
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    topTenScope === 'my-collection'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  My Collection
                </button>
                <button
                  onClick={() => {
                    setTopTenScope('global');
                    resetPages();
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    topTenScope === 'global'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Global
                </button>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {topTenScope === 'my-collection'
                ? 'Top 10 ranked figures from your collection'
                : 'Top 10 ranked figures across all public collections'}
            </p>

            {/* Filters */}
            {filterOptions && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
                  {(topTenFilters.manufacturer || topTenFilters.category || topTenFilters.size ||
                    topTenFilters.condition || topTenFilters.packaging || topTenFilters.minValue !== undefined ||
                    topTenFilters.maxValue !== undefined || topTenFilters.customField) && (
                    <button
                      onClick={() => {
                        setTopTenFilters({});
                        resetPages();
                      }}
                      className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Clear All
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {/* Manufacturer Filter */}
                  {filterOptions.manufacturers.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Manufacturer</label>
                      <Select
                        value={topTenFilters.manufacturer || ''}
                        onChange={(e) => {
                          setTopTenFilters({ ...topTenFilters, manufacturer: e.target.value || undefined });
                          resetPages();
                        }}
                      >
                        <option value="">All</option>
                        {filterOptions.manufacturers.map(mfg => (
                          <option key={mfg} value={mfg}>{mfg}</option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Category Filter */}
                  {filterOptions.categories.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Category</label>
                      <Select
                        value={topTenFilters.category || ''}
                        onChange={(e) => {
                          setTopTenFilters({ ...topTenFilters, category: e.target.value || undefined });
                          resetPages();
                        }}
                      >
                        <option value="">All</option>
                        {filterOptions.categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Size Filter */}
                  {filterOptions.sizes.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Size</label>
                      <Select
                        value={topTenFilters.size || ''}
                        onChange={(e) => {
                          setTopTenFilters({ ...topTenFilters, size: e.target.value || undefined });
                          resetPages();
                        }}
                      >
                        <option value="">All</option>
                        {filterOptions.sizes.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Condition Filter */}
                  {filterOptions.conditions.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Condition</label>
                      <Select
                        value={topTenFilters.condition || ''}
                        onChange={(e) => {
                          setTopTenFilters({ ...topTenFilters, condition: e.target.value || undefined });
                          resetPages();
                        }}
                      >
                        <option value="">All</option>
                        {filterOptions.conditions.map(cond => (
                          <option key={cond} value={cond}>{cond}</option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Packaging Filter */}
                  {filterOptions.packaging.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Packaging</label>
                      <Select
                        value={topTenFilters.packaging || ''}
                        onChange={(e) => {
                          setTopTenFilters({ ...topTenFilters, packaging: e.target.value || undefined });
                          resetPages();
                        }}
                      >
                        <option value="">All</option>
                        {filterOptions.packaging.map(pkg => (
                          <option key={pkg} value={pkg}>{pkg}</option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Custom Field Filter (My Collection only) */}
                  {topTenScope === 'my-collection' && filterOptions.customFieldOptions.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Custom Field</label>
                      <Select
                        value={topTenFilters.customField || ''}
                        onChange={(e) => {
                          setTopTenFilters({
                            ...topTenFilters,
                            customField: e.target.value || undefined,
                            customFieldValue: undefined
                          });
                          resetPages();
                        }}
                      >
                        <option value="">None</option>
                        {filterOptions.customFieldOptions.map(field => (
                          <option key={field.id} value={field.id}>{field.name}</option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>

                {/* Value Range Filters */}
                {filterOptions.maxValue > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                        Min Value ($)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={filterOptions.maxValue}
                        step={1}
                        value={topTenFilters.minValue ?? ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : undefined;
                          setTopTenFilters({ ...topTenFilters, minValue: value });
                          resetPages();
                        }}
                        placeholder={`${filterOptions.minValue.toFixed(0)}`}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                        Max Value ($)
                      </label>
                      <input
                        type="number"
                        min={topTenFilters.minValue ?? 0}
                        max={filterOptions.maxValue}
                        step={1}
                        value={topTenFilters.maxValue ?? ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : undefined;
                          setTopTenFilters({ ...topTenFilters, maxValue: value });
                          resetPages();
                        }}
                        placeholder={`${filterOptions.maxValue.toFixed(0)}`}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Custom Field Value Filter */}
                {topTenFilters.customField && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                      {(() => {
                        if (!settings) return topTenFilters.customField;
                        const fieldDef = settings.customFields.find(cf => cf.id === topTenFilters.customField);
                        return fieldDef ? fieldDef.name : topTenFilters.customField;
                      })()} Value
                    </label>
                    <Select
                      value={topTenFilters.customFieldValue || ''}
                      onChange={(e) => {
                        setTopTenFilters({ ...topTenFilters, customFieldValue: e.target.value || undefined });
                        setTopTenPage(1);
                      }}
                    >
                      <option value="">All</option>
                      {[...new Set(
                        figures
                          .filter(f => f.customFields?.[topTenFilters.customField!])
                          .map(f => String(f.customFields![topTenFilters.customField!]))
                      )].sort().map(value => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top Ten Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Valuable */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg shadow p-6 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-2 rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  💰 Most Valuable
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Highest valued figures by current market price
              </p>
              {topTenData.mostValuable.length > 0 ? (
                <div className="space-y-2">
                  {topTenData.mostValuable.map((item, index) => {
                    const figure = topTenScope === 'my-collection'
                      ? figures.find(f => f.id === item.figureId)
                      : Storage.getAllPublicFigures().find(f => f.id === item.figureId);
                    if (!figure) return null;

                    return (
                      <div
                        key={item.figureId}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-7 h-7 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full font-bold text-sm flex-shrink-0">
                            {getRank(index, topTenPages.mostValuable)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                              {figure.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {figure.manufacturer}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-lg font-bold text-green-700 dark:text-green-300">
                            ${item.value.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                  No figures yet
                </p>
              )}

              {/* Pagination for Most Valuable */}
              {topTenData.mostValuableTotal > ITEMS_PER_PAGE && (
                <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800 flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Page {topTenPages.mostValuable} of {Math.ceil(topTenData.mostValuableTotal / ITEMS_PER_PAGE)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTopTenPages(prev => ({ ...prev, mostValuable: Math.max(1, prev.mostValuable - 1) }))}
                      disabled={topTenPages.mostValuable === 1}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTopTenPages(prev => ({ ...prev, mostValuable: prev.mostValuable + 1 }))}
                      disabled={topTenPages.mostValuable >= Math.ceil(topTenData.mostValuableTotal / ITEMS_PER_PAGE)}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Overall Jealousy Score */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg shadow p-6 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  🔥 Jealousy Meter
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Figures that make others most jealous • Weighted score: 🔥 Fire=5pts • ❤️ Love=3pts • 👍 Appreciate=1pt
              </p>
              {topTenData.jealousy.length > 0 ? (
                <div className="space-y-2">
                  {topTenData.jealousy.map((item, index) => {
                    const figure = topTenScope === 'my-collection'
                      ? figures.find(f => f.id === item.figureId)
                      : Storage.getAllPublicFigures().find(f => f.id === item.figureId);
                    if (!figure) return null;

                    return (
                      <div
                        key={item.figureId}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-7 h-7 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full font-bold text-sm flex-shrink-0">
                            {getRank(index, topTenPages.jealousy)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                              {figure.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {figure.manufacturer}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                            {item.jealousyScore}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                  No reactions yet
                </p>
              )}

              {/* Pagination for Jealousy */}
              {topTenData.jealousyTotal > ITEMS_PER_PAGE && (
                <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800 flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Page {topTenPages.jealousy} of {Math.ceil(topTenData.jealousyTotal / ITEMS_PER_PAGE)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTopTenPages(prev => ({ ...prev, jealousy: Math.max(1, prev.jealousy - 1) }))}
                      disabled={topTenPages.jealousy === 1}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTopTenPages(prev => ({ ...prev, jealousy: prev.jealousy + 1 }))}
                      disabled={topTenPages.jealousy >= Math.ceil(topTenData.jealousyTotal / ITEMS_PER_PAGE)}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Most Reacted Figures (Total Reactions) */}
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg shadow p-6 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-gradient-to-br from-yellow-600 to-amber-600 p-2 rounded-lg">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Most Reacted
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Figures with the most total reactions of any type
              </p>
              {topTenData.mostReacted.length > 0 ? (
                <div className="space-y-2">
                  {topTenData.mostReacted.map((item, index) => {
                    const figure = topTenScope === 'my-collection'
                      ? figures.find(f => f.id === item.figureId)
                      : Storage.getAllPublicFigures().find(f => f.id === item.figureId);
                    if (!figure) return null;

                    return (
                      <div
                        key={item.figureId}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-7 h-7 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full font-bold text-sm flex-shrink-0">
                            {getRank(index, topTenPages.mostReacted)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                              {figure.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {figure.manufacturer}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <div className="flex items-center gap-1 text-xs">
                            {item.stats.fire > 0 && (
                              <span className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400">
                                <Flame className="h-3 w-3" />
                                {item.stats.fire}
                              </span>
                            )}
                            {item.stats.love > 0 && (
                              <span className="flex items-center gap-0.5 text-pink-600 dark:text-pink-400">
                                <Heart className="h-3 w-3" />
                                {item.stats.love}
                              </span>
                            )}
                            {item.stats.appreciate > 0 && (
                              <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                                <ThumbsUp className="h-3 w-3" />
                                {item.stats.appreciate}
                              </span>
                            )}
                          </div>
                          <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                            {item.stats.total}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                  No reactions yet
                </p>
              )}

              {/* Pagination for Most Reacted */}
              {topTenData.mostReactedTotal > ITEMS_PER_PAGE && (
                <div className="mt-4 pt-4 border-t border-yellow-200 dark:border-yellow-800 flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Page {topTenPages.mostReacted} of {Math.ceil(topTenData.mostReactedTotal / ITEMS_PER_PAGE)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTopTenPages(prev => ({ ...prev, mostReacted: Math.max(1, prev.mostReacted - 1) }))}
                      disabled={topTenPages.mostReacted === 1}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTopTenPages(prev => ({ ...prev, mostReacted: prev.mostReacted + 1 }))}
                      disabled={topTenPages.mostReacted >= Math.ceil(topTenData.mostReactedTotal / ITEMS_PER_PAGE)}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Top Appreciate */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <ThumbsUp className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  👍 Most Appreciated
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Figures collectors appreciate most
              </p>
              {topTenData.appreciate.length > 0 ? (
                <div className="space-y-2">
                  {topTenData.appreciate.map((item, index) => {
                    const figure = topTenScope === 'my-collection'
                      ? figures.find(f => f.id === item.figureId)
                      : Storage.getAllPublicFigures().find(f => f.id === item.figureId);
                    if (!figure) return null;

                    return (
                      <div
                        key={item.figureId}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-7 h-7 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full font-bold text-sm flex-shrink-0">
                            {getRank(index, topTenPages.appreciate)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                              {figure.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {figure.manufacturer}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <ThumbsUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                            {item.count}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                  No appreciates yet
                </p>
              )}

              {/* Pagination for Appreciate */}
              {topTenData.appreciateTotal > ITEMS_PER_PAGE && (
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800 flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Page {topTenPages.appreciate} of {Math.ceil(topTenData.appreciateTotal / ITEMS_PER_PAGE)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTopTenPages(prev => ({ ...prev, appreciate: Math.max(1, prev.appreciate - 1) }))}
                      disabled={topTenPages.appreciate === 1}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTopTenPages(prev => ({ ...prev, appreciate: prev.appreciate + 1 }))}
                      disabled={topTenPages.appreciate >= Math.ceil(topTenData.appreciateTotal / ITEMS_PER_PAGE)}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Top Love */}
            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg shadow p-6 border border-pink-200 dark:border-pink-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-pink-600 p-2 rounded-lg">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  ❤️ Most Loved
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Figures collectors absolutely love
              </p>
              {topTenData.love.length > 0 ? (
                <div className="space-y-2">
                  {topTenData.love.map((item, index) => {
                    const figure = topTenScope === 'my-collection'
                      ? figures.find(f => f.id === item.figureId)
                      : Storage.getAllPublicFigures().find(f => f.id === item.figureId);
                    if (!figure) return null;

                    return (
                      <div
                        key={item.figureId}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-7 h-7 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full font-bold text-sm flex-shrink-0">
                            {getRank(index, topTenPages.love)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                              {figure.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {figure.manufacturer}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <Heart className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                          <p className="text-lg font-bold text-pink-700 dark:text-pink-300">
                            {item.count}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                  No loves yet
                </p>
              )}

              {/* Pagination for Love */}
              {topTenData.loveTotal > ITEMS_PER_PAGE && (
                <div className="mt-4 pt-4 border-t border-pink-200 dark:border-pink-800 flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Page {topTenPages.love} of {Math.ceil(topTenData.loveTotal / ITEMS_PER_PAGE)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTopTenPages(prev => ({ ...prev, love: Math.max(1, prev.love - 1) }))}
                      disabled={topTenPages.love === 1}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTopTenPages(prev => ({ ...prev, love: prev.love + 1 }))}
                      disabled={topTenPages.love >= Math.ceil(topTenData.loveTotal / ITEMS_PER_PAGE)}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Top Fire */}
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow p-6 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-orange-600 p-2 rounded-lg">
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  🔥 Most Fire
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                The hottest, most coveted figures
              </p>
              {topTenData.fire.length > 0 ? (
                <div className="space-y-2">
                  {topTenData.fire.map((item, index) => {
                    const figure = topTenScope === 'my-collection'
                      ? figures.find(f => f.id === item.figureId)
                      : Storage.getAllPublicFigures().find(f => f.id === item.figureId);
                    if (!figure) return null;

                    return (
                      <div
                        key={item.figureId}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-7 h-7 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full font-bold text-sm flex-shrink-0">
                            {getRank(index, topTenPages.fire)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                              {figure.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {figure.manufacturer}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                            {item.count}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                  No fire reactions yet
                </p>
              )}

              {/* Pagination for Fire */}
              {topTenData.fireTotal > ITEMS_PER_PAGE && (
                <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800 flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Page {topTenPages.fire} of {Math.ceil(topTenData.fireTotal / ITEMS_PER_PAGE)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTopTenPages(prev => ({ ...prev, fire: Math.max(1, prev.fire - 1) }))}
                      disabled={topTenPages.fire === 1}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTopTenPages(prev => ({ ...prev, fire: prev.fire + 1 }))}
                      disabled={topTenPages.fire >= Math.ceil(topTenData.fireTotal / ITEMS_PER_PAGE)}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      </>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <TrendsTab figures={figures} />
      )}

      {/* Milestones Tab */}
      {activeTab === 'milestones' && (
        <MilestonesTab figures={figures} />
      )}

      {/* Completeness Tab */}
      {activeTab === 'completeness' && (
        <CompletenessTab figures={figures} />
      )}

      {/* Comparative Tab */}
      {activeTab === 'comparative' && (
        <ComparativeTab figures={figures} />
      )}
    </div>
  );
}

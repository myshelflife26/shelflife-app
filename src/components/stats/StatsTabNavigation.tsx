import { BarChart3, TrendingUp, Award, CheckCircle } from 'lucide-react';

export type StatsTab = 'overview' | 'trends' | 'milestones' | 'completeness';

interface StatsTabNavigationProps {
  activeTab: StatsTab;
  onTabChange: (tab: StatsTab) => void;
  newMilestonesCount?: number;
}

export function StatsTabNavigation({
  activeTab,
  onTabChange,
  newMilestonesCount = 0,
}: StatsTabNavigationProps) {
  const tabs: Array<{
    id: StatsTab;
    label: string;
    icon: typeof BarChart3;
    badge?: number;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
    },
    {
      id: 'trends',
      label: 'Trends',
      icon: TrendingUp,
    },
    {
      id: 'milestones',
      label: 'Milestones',
      icon: Award,
      badge: newMilestonesCount,
    },
    {
      id: 'completeness',
      label: 'Completeness',
      icon: CheckCircle,
    },
  ];

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
      <nav className="flex space-x-4 overflow-x-auto" aria-label="Stats tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                border-b-2 transition-colors
                ${
                  isActive
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { PriceAlertsService, type PriceAlert } from '../utils/priceAlertsService';
import type { User } from '../types/user';
import { TrendingUp, TrendingDown, Bell, BellOff, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { toastManager } from '../utils/toastManager';

interface PriceAlertsPageProps {
  currentUser: User;
}

export function PriceAlertsPage({ currentUser }: PriceAlertsPageProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showOnlyUnseen, setShowOnlyUnseen] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [currentUser.id]);

  const loadAlerts = () => {
    const allAlerts = PriceAlertsService.getAlerts(currentUser.id);
    setAlerts(allAlerts);
  };

  const handleMarkAllAsSeen = () => {
    PriceAlertsService.markAllAsSeen(currentUser.id);
    loadAlerts();
    toastManager.success('All price alerts marked as seen');
  };

  const handleClearOldAlerts = () => {
    PriceAlertsService.clearOldAlerts(currentUser.id);
    loadAlerts();
    toastManager.success('Old price alerts cleared');
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredAlerts = showOnlyUnseen
    ? alerts.filter(a => !a.seen)
    : alerts;

  const unseenCount = alerts.filter(a => !a.seen).length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Price Alerts
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track significant value changes in your collection
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{alerts.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Alerts</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <BellOff className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{unseenCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unseen Alerts</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {alerts.filter(a => a.changeAmount > 0).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Price Increases</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={showOnlyUnseen}
              onChange={(e) => setShowOnlyUnseen(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 dark:border-gray-600"
            />
            <span className="ml-2 text-gray-700 dark:text-gray-300">Show only unseen</span>
          </label>
        </div>

        <div className="flex gap-2">
          {unseenCount > 0 && (
            <Button onClick={handleMarkAllAsSeen} variant="outline" size="sm">
              Mark All as Seen
            </Button>
          )}
          {alerts.length > 0 && (
            <Button
              onClick={handleClearOldAlerts}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Old Alerts
            </Button>
          )}
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {showOnlyUnseen ? 'No unseen alerts' : 'No price alerts yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {showOnlyUnseen
              ? "You've seen all your price alerts. Change filter to see all alerts."
              : "We'll notify you when your figures have significant value changes (>$20 or >10%)."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white dark:bg-gray-800 rounded-lg p-4 border ${
                alert.seen
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Icon and Content */}
                <div className="flex items-start gap-3 flex-1">
                  {alert.changeAmount > 0 ? (
                    <TrendingUp className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600 mt-1 flex-shrink-0" />
                  )}

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {alert.figureName}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        ${alert.oldValue.toFixed(2)} → ${alert.newValue.toFixed(2)}
                      </span>

                      <span className={`font-semibold ${
                        alert.changeAmount > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {alert.changeAmount > 0 ? '+' : ''}${alert.changeAmount.toFixed(2)}
                        ({alert.changePercentage > 0 ? '+' : ''}{alert.changePercentage.toFixed(1)}%)
                      </span>

                      <span className="text-gray-500 dark:text-gray-400">
                        {formatDate(alert.timestamp)}
                      </span>
                    </div>

                    {!alert.seen && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          New
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
          About Price Alerts
        </h4>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li>• You'll receive an alert when a figure's value changes by $20 or more</li>
          <li>• Or when the value changes by 10% or more</li>
          <li>• Alerts are kept for 30 days, then automatically removed</li>
          <li>• Green trends indicate price increases, red indicates decreases</li>
        </ul>
      </div>
    </div>
  );
}

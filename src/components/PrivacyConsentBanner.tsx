import React, { useState, useEffect } from 'react';
import { Shield, X, Settings, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { privacyAnalytics } from '../utils/privacyAnalytics';

interface PrivacyConsentBannerProps {
  onConsentChange?: (consent: boolean) => void;
}

export function PrivacyConsentBanner({ onConsentChange }: PrivacyConsentBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [consent, setConsent] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    // Check if user has made a consent decision
    const storedConsent = localStorage.getItem('shelflife_analytics_consent');
    const hasDecided = localStorage.getItem('shelflife_analytics_decided');

    if (!hasDecided) {
      setShowBanner(true);
    } else {
      setConsent(storedConsent !== 'false');
    }
  }, []);

  useEffect(() => {
    // Load analytics summary for the settings dialog
    if (showSettings) {
      const summary = privacyAnalytics.getAnalyticsSummary();
      setAnalyticsData(summary);
    }
  }, [showSettings]);

  const handleAccept = () => {
    setConsent(true);
    privacyAnalytics.setConsent(true);
    localStorage.setItem('shelflife_analytics_decided', 'true');
    setShowBanner(false);
    onConsentChange?.(true);
  };

  const handleDecline = () => {
    setConsent(false);
    privacyAnalytics.setConsent(false);
    localStorage.setItem('shelflife_analytics_decided', 'true');
    setShowBanner(false);
    onConsentChange?.(false);
  };

  const handleConsentToggle = (newConsent: boolean) => {
    setConsent(newConsent);
    privacyAnalytics.setConsent(newConsent);
    onConsentChange?.(newConsent);
  };

  const clearAnalyticsData = () => {
    localStorage.removeItem('shelflife_analytics_data');
    localStorage.removeItem('shelflife_analytics_consent');
    localStorage.removeItem('shelflife_analytics_decided');
    setAnalyticsData(null);
    setConsent(true);
    privacyAnalytics.setConsent(true);
  };

  // Don't show anything if user hasn't seen the banner and consent is already handled
  if (!showBanner && localStorage.getItem('shelflife_analytics_decided')) {
    return (
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="fixed bottom-20 right-4 z-40 bg-white dark:bg-gray-800 shadow-lg border"
            title="Privacy Settings"
          >
            <Shield className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              Privacy & Analytics
            </DialogTitle>
            <DialogDescription>
              Manage your privacy preferences and view analytics data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Consent Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2 text-blue-600" />
                  <span className="font-medium">Usage Analytics</span>
                  <Badge variant={consent ? 'default' : 'secondary'} className="ml-2">
                    {consent ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Help improve ShelfLife with anonymous usage data
                </p>
              </div>
              <Switch
                checked={consent}
                onCheckedChange={handleConsentToggle}
              />
            </div>

            {/* Privacy Features */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                Privacy Features
              </h4>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                  <span>No personal data collection</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                  <span>Respects Do Not Track</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                  <span>Data stays on your device</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                  <span>Anonymous session tracking only</span>
                </div>
              </div>
            </div>

            {/* Analytics Summary */}
            {analyticsData && consent && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  Your Usage Data
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Events:</span>
                      <span className="font-medium ml-2">{analyticsData.totalEvents}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Page views:</span>
                      <span className="font-medium ml-2">{analyticsData.totalPageViews}</span>
                    </div>
                  </div>
                  {analyticsData.topEvents.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs text-gray-500">Most used features:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analyticsData.topEvents.slice(0, 3).map((event: any) => (
                          <Badge key={event.event} variant="outline" className="text-xs">
                            {event.event}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Clear Data */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAnalyticsData}
                className="w-full"
              >
                Clear All Analytics Data
              </Button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                This will reset your preferences and clear stored data
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <Card className="shadow-lg border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <Shield className="h-5 w-5 mr-2 text-blue-600" />
            Privacy & Analytics
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBanner(false)}
              className="ml-auto h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription className="text-sm">
            We respect your privacy. Our analytics are anonymous and help improve the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Privacy highlights */}
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center">
                <EyeOff className="h-3 w-3 mr-1 text-green-600" />
                <span>No personal data</span>
              </div>
              <div className="flex items-center">
                <Shield className="h-3 w-3 mr-1 text-green-600" />
                <span>Local storage only</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleAccept} className="flex-1">
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={handleDecline} className="flex-1">
                Decline
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettings(true)}
                className="px-3"
                title="View Details"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              You can change this anytime in Settings
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Privacy & Analytics Details</DialogTitle>
            <DialogDescription>
              Learn more about how we handle your data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">What We Collect</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                  <span>Page visits and navigation patterns</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                  <span>Feature usage and interactions</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                  <span>Error reports and performance metrics</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                  <span>Basic browser information (Chrome, Firefox, etc.)</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">What We Don't Collect</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3" />
                  <span>Email addresses or personal information</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3" />
                  <span>IP addresses or location data</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3" />
                  <span>Collection contents or personal figures</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3" />
                  <span>Cross-site tracking or advertising data</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <div className="flex items-center mb-2">
                <Shield className="h-4 w-4 text-green-600 mr-2" />
                <span className="font-medium text-green-900 dark:text-green-100">
                  Privacy First
                </span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                All analytics data is processed locally on your device and never sent to external servers.
                We respect Do Not Track headers and GDPR requirements.
              </p>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button onClick={handleAccept} className="flex-1">
                Accept & Continue
              </Button>
              <Button variant="outline" onClick={handleDecline} className="flex-1">
                Decline
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Hook for using analytics consent state
export const useAnalyticsConsent = () => {
  const [consent, setConsent] = useState(true);
  const [hasDecided, setHasDecided] = useState(false);

  useEffect(() => {
    const storedConsent = localStorage.getItem('shelflife_analytics_consent');
    const decided = localStorage.getItem('shelflife_analytics_decided');

    setConsent(storedConsent !== 'false');
    setHasDecided(decided === 'true');
  }, []);

  const updateConsent = (newConsent: boolean) => {
    setConsent(newConsent);
    setHasDecided(true);
    privacyAnalytics.setConsent(newConsent);
    localStorage.setItem('shelflife_analytics_decided', 'true');
  };

  return {
    consent,
    hasDecided,
    updateConsent,
  };
};

export default PrivacyConsentBanner;
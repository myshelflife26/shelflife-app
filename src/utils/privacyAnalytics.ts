// Privacy-focused analytics system
// No personal data collection, respects DNT, GDPR compliant

interface AnalyticsEvent {
  event: string;
  category?: string;
  data?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  referrer?: string;
}

interface PageViewEvent {
  path: string;
  title?: string;
  timestamp: number;
  sessionId: string;
  viewport?: {
    width: number;
    height: number;
  };
  referrer?: string;
}

interface AnalyticsConfig {
  enabled: boolean;
  respectDNT: boolean; // Respect Do Not Track header
  batchSize: number;
  flushInterval: number; // milliseconds
  endpoint?: string; // Optional external endpoint
  debug: boolean;
}

class PrivacyAnalyticsService {
  private config: AnalyticsConfig = {
    enabled: true,
    respectDNT: true,
    batchSize: 10,
    flushInterval: 30000, // 30 seconds
    debug: process.env.NODE_ENV === 'development',
  };

  private sessionId: string;
  private eventQueue: AnalyticsEvent[] = [];
  private pageViewQueue: PageViewEvent[] = [];
  private flushTimer: number | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  private initialize() {
    // Check if analytics should be enabled
    this.isEnabled = this.shouldEnableAnalytics();

    if (!this.isEnabled) {
      if (this.config.debug) {
        console.log('Privacy Analytics: Disabled (DNT or user preference)');
      }
      return;
    }

    // Start the flush timer
    this.startFlushTimer();

    // Track initial page view
    this.trackPageView(window.location.pathname, document.title);

    if (this.config.debug) {
      console.log('Privacy Analytics: Initialized with session', this.sessionId);
    }
  }

  private shouldEnableAnalytics(): boolean {
    // Respect Do Not Track
    if (this.config.respectDNT && navigator.doNotTrack === '1') {
      return false;
    }

    // Check user consent (stored in localStorage)
    const consent = localStorage.getItem('shelflife_analytics_consent');
    if (consent === 'false') {
      return false;
    }

    // Check global configuration
    return this.config.enabled;
  }

  private generateSessionId(): string {
    // Generate a random session ID (no personal data)
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  private getViewport() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  private getSafeReferrer(): string {
    // Only include referrer if it's from the same origin or a safe domain
    try {
      const referrer = document.referrer;
      if (!referrer) return '';

      const referrerUrl = new URL(referrer);
      const currentUrl = new URL(window.location.href);

      // Same origin is safe
      if (referrerUrl.origin === currentUrl.origin) {
        return referrer;
      }

      // Only return the domain for external referrers
      return referrerUrl.hostname;
    } catch {
      return '';
    }
  }

  // Public API
  trackEvent(
    event: string,
    category?: string,
    data?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      category,
      data: this.sanitizeData(data),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userAgent: this.getSafeUserAgent(),
      viewport: this.getViewport(),
      referrer: this.getSafeReferrer(),
    };

    this.eventQueue.push(analyticsEvent);

    if (this.config.debug) {
      console.log('Privacy Analytics: Event tracked', analyticsEvent);
    }

    // Flush if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  trackPageView(path: string, title?: string): void {
    if (!this.isEnabled) return;

    const pageView: PageViewEvent = {
      path,
      title,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      viewport: this.getViewport(),
      referrer: this.getSafeReferrer(),
    };

    this.pageViewQueue.push(pageView);

    if (this.config.debug) {
      console.log('Privacy Analytics: Page view tracked', pageView);
    }
  }

  // High-level tracking methods for common events
  trackFeatureUsage(feature: string, action: string, metadata?: Record<string, any>): void {
    this.trackEvent(action, 'feature', {
      feature,
      ...metadata,
    });
  }

  trackUserAction(action: string, target?: string, metadata?: Record<string, any>): void {
    this.trackEvent(action, 'user_action', {
      target,
      ...metadata,
    });
  }

  trackPerformance(metric: string, value: number, metadata?: Record<string, any>): void {
    this.trackEvent('performance_metric', 'performance', {
      metric,
      value,
      ...metadata,
    });
  }

  trackError(error: string, severity: 'low' | 'medium' | 'high', metadata?: Record<string, any>): void {
    this.trackEvent('error', 'error', {
      error,
      severity,
      ...metadata,
    });
  }

  // Privacy controls
  setConsent(consent: boolean): void {
    localStorage.setItem('shelflife_analytics_consent', consent.toString());

    if (!consent) {
      this.disable();
    } else {
      this.enable();
    }
  }

  getConsent(): boolean {
    const consent = localStorage.getItem('shelflife_analytics_consent');
    return consent !== 'false'; // Default to true if not set
  }

  enable(): void {
    this.config.enabled = true;
    this.isEnabled = this.shouldEnableAnalytics();

    if (this.isEnabled) {
      this.startFlushTimer();
      if (this.config.debug) {
        console.log('Privacy Analytics: Enabled');
      }
    }
  }

  disable(): void {
    this.isEnabled = false;
    this.stopFlushTimer();
    this.clearQueues();

    if (this.config.debug) {
      console.log('Privacy Analytics: Disabled');
    }
  }

  // Data management
  private sanitizeData(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data) return undefined;

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      // Skip potentially sensitive keys
      if (this.isSensitiveKey(key)) {
        continue;
      }

      // Sanitize values
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.length; // Only store array length
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[Object]'; // Don't include object data
      }
    }

    return sanitized;
  }

  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      'email', 'password', 'token', 'auth', 'key', 'secret',
      'personal', 'private', 'ssn', 'credit', 'card'
    ];

    return sensitivePatterns.some(pattern =>
      key.toLowerCase().includes(pattern)
    );
  }

  private sanitizeString(str: string): string {
    // Remove potential PII patterns
    return str
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
      .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[ssn]')
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[card]')
      .substring(0, 100); // Limit length
  }

  private getSafeUserAgent(): string {
    // Return only basic browser info, no detailed version
    const ua = navigator.userAgent;

    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';

    return 'Unknown';
  }

  // Flushing and persistence
  private startFlushTimer(): void {
    if (this.flushTimer) return;

    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      window.clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0 && this.pageViewQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    const pageViews = [...this.pageViewQueue];

    // Clear queues
    this.eventQueue = [];
    this.pageViewQueue = [];

    if (this.config.debug) {
      console.log('Privacy Analytics: Flushing', {
        events: events.length,
        pageViews: pageViews.length,
      });
    }

    // Store locally for now (in a real implementation, you might send to a server)
    this.storeLocally(events, pageViews);

    // If you have a privacy-compliant endpoint, send data there
    if (this.config.endpoint) {
      await this.sendToEndpoint(events, pageViews);
    }
  }

  private storeLocally(events: AnalyticsEvent[], pageViews: PageViewEvent[]): void {
    try {
      // Store in localStorage for debugging or offline analysis
      const stored = {
        events,
        pageViews,
        timestamp: Date.now(),
      };

      const existingData = JSON.parse(localStorage.getItem('shelflife_analytics_data') || '[]');
      existingData.push(stored);

      // Keep only the last 10 batches
      const recentData = existingData.slice(-10);
      localStorage.setItem('shelflife_analytics_data', JSON.stringify(recentData));
    } catch (error) {
      if (this.config.debug) {
        console.error('Privacy Analytics: Failed to store locally', error);
      }
    }
  }

  private async sendToEndpoint(events: AnalyticsEvent[], pageViews: PageViewEvent[]): Promise<void> {
    try {
      if (!this.config.endpoint) return;

      const payload = {
        events,
        pageViews,
        timestamp: Date.now(),
      };

      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (this.config.debug) {
        console.log('Privacy Analytics: Data sent to endpoint');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Privacy Analytics: Failed to send to endpoint', error);
      }

      // Re-queue the data for retry (optional)
      this.eventQueue.unshift(...events);
      this.pageViewQueue.unshift(...pageViews);
    }
  }

  private clearQueues(): void {
    this.eventQueue = [];
    this.pageViewQueue = [];
  }

  // Analytics insights (for local development)
  getAnalyticsSummary(): {
    totalEvents: number;
    totalPageViews: number;
    topEvents: Array<{ event: string; count: number }>;
    topPages: Array<{ path: string; count: number }>;
  } {
    try {
      const storedData = JSON.parse(localStorage.getItem('shelflife_analytics_data') || '[]');

      let allEvents: AnalyticsEvent[] = [];
      let allPageViews: PageViewEvent[] = [];

      storedData.forEach((batch: any) => {
        allEvents.push(...(batch.events || []));
        allPageViews.push(...(batch.pageViews || []));
      });

      // Count events
      const eventCounts: Record<string, number> = {};
      allEvents.forEach(event => {
        eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
      });

      // Count page views
      const pageCounts: Record<string, number> = {};
      allPageViews.forEach(page => {
        pageCounts[page.path] = (pageCounts[page.path] || 0) + 1;
      });

      return {
        totalEvents: allEvents.length,
        totalPageViews: allPageViews.length,
        topEvents: Object.entries(eventCounts)
          .map(([event, count]) => ({ event, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        topPages: Object.entries(pageCounts)
          .map(([path, count]) => ({ path, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      };
    } catch (error) {
      return {
        totalEvents: 0,
        totalPageViews: 0,
        topEvents: [],
        topPages: [],
      };
    }
  }
}

// Create singleton instance
export const privacyAnalytics = new PrivacyAnalyticsService();

// Convenience functions
export const trackEvent = (event: string, category?: string, data?: Record<string, any>) => {
  privacyAnalytics.trackEvent(event, category, data);
};

export const trackPageView = (path: string, title?: string) => {
  privacyAnalytics.trackPageView(path, title);
};

export const trackFeatureUsage = (feature: string, action: string, metadata?: Record<string, any>) => {
  privacyAnalytics.trackFeatureUsage(feature, action, metadata);
};

export const trackUserAction = (action: string, target?: string, metadata?: Record<string, any>) => {
  privacyAnalytics.trackUserAction(action, target, metadata);
};

export const trackPerformance = (metric: string, value: number, metadata?: Record<string, any>) => {
  privacyAnalytics.trackPerformance(metric, value, metadata);
};

export const trackError = (error: string, severity: 'low' | 'medium' | 'high', metadata?: Record<string, any>) => {
  privacyAnalytics.trackError(error, severity, metadata);
};

export default privacyAnalytics;
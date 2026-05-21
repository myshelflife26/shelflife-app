// Global error handling utilities

interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  userId?: string;
  type: 'javascript' | 'unhandled-promise' | 'component' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorHandlerService {
  private maxStoredErrors = 20;
  private errorQueue: ErrorReport[] = [];

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers() {
    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        type: 'javascript',
        severity: 'high',
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        type: 'unhandled-promise',
        severity: 'medium',
      });

      // Prevent the error from showing in console for known recoverable errors
      if (this.isRecoverableError(event.reason)) {
        event.preventDefault();
      }
    });
  }

  private isRecoverableError(reason: any): boolean {
    const recoverablePatterns = [
      'Network request failed',
      'Failed to fetch',
      'AbortError',
      'The operation was aborted',
    ];

    const reasonStr = String(reason);
    return recoverablePatterns.some(pattern => reasonStr.includes(pattern));
  }

  public logError(errorReport: Partial<ErrorReport>) {
    const fullReport: ErrorReport = {
      message: errorReport.message || 'Unknown error',
      stack: errorReport.stack,
      url: errorReport.url || window.location.href,
      timestamp: errorReport.timestamp || new Date().toISOString(),
      userAgent: errorReport.userAgent || navigator.userAgent,
      type: errorReport.type || 'javascript',
      severity: errorReport.severity || 'medium',
    };

    // Add to queue
    this.errorQueue.push(fullReport);

    // Store in localStorage for debugging
    this.storeErrorLocally(fullReport);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ShelfLife Error:', fullReport);
    }

    // In production, you could send to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorService(fullReport);
    }
  }

  private storeErrorLocally(error: ErrorReport) {
    try {
      const existingErrors = JSON.parse(localStorage.getItem('shelflife_errors') || '[]');
      existingErrors.push(error);

      // Keep only the most recent errors
      const recentErrors = existingErrors.slice(-this.maxStoredErrors);
      localStorage.setItem('shelflife_errors', JSON.stringify(recentErrors));
    } catch {
      // Ignore localStorage errors
    }
  }

  private async sendToErrorService(error: ErrorReport) {
    // Here you could integrate with services like:
    // - Sentry: https://sentry.io
    // - LogRocket: https://logrocket.com
    // - Bugsnag: https://bugsnag.com

    // Check if we're online
    if (!navigator.onLine) {
      // Queue error for offline sync
      this.queueErrorForOfflineSync(error);
      return;
    }

    // For now, we'll just queue them for potential batch sending
    if (this.errorQueue.length >= 5) {
      // Could batch send multiple errors
      console.log('Would send batch of errors to service:', this.errorQueue.slice(0, 5));
      this.errorQueue = this.errorQueue.slice(5);
    }
  }

  private queueErrorForOfflineSync(error: ErrorReport) {
    try {
      const pendingErrors = JSON.parse(localStorage.getItem('shelflife_pending_errors') || '[]');
      pendingErrors.push(error);

      // Keep only the most recent pending errors
      const recentPendingErrors = pendingErrors.slice(-10);
      localStorage.setItem('shelflife_pending_errors', JSON.stringify(recentPendingErrors));

      // Request background sync if service worker is available
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
          return registration.sync.register('background-sync');
        }).catch((error) => {
          console.log('Background sync registration failed:', error);
        });
      }
    } catch (error) {
      console.error('Failed to queue error for offline sync:', error);
    }
  }

  public getStoredErrors(): ErrorReport[] {
    try {
      return JSON.parse(localStorage.getItem('shelflife_errors') || '[]');
    } catch {
      return [];
    }
  }

  public clearStoredErrors() {
    localStorage.removeItem('shelflife_errors');
    this.errorQueue = [];
  }

  // Method to manually report errors from components
  public reportError(error: Error, context?: string, severity?: ErrorReport['severity']) {
    this.logError({
      message: `${context ? `[${context}] ` : ''}${error.message}`,
      stack: error.stack,
      type: 'component',
      severity: severity || 'medium',
    });
  }

  // Method to report network errors
  public reportNetworkError(url: string, status?: number, message?: string) {
    this.logError({
      message: `Network Error: ${status ? `${status} ` : ''}${message || 'Request failed'} - ${url}`,
      type: 'network',
      severity: 'low',
    });
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandlerService();

// Utility function for components to easily report errors
export const reportError = (error: Error, context?: string, severity?: ErrorReport['severity']) => {
  errorHandler.reportError(error, context, severity);
};

// Utility function for network error reporting
export const reportNetworkError = (url: string, status?: number, message?: string) => {
  errorHandler.reportNetworkError(url, status, message);
};

export default errorHandler;
// Global Error Handler for Debugging Array Access Issues

export class GlobalErrorHandler {
  private static originalConsoleError = console.error;
  private static enabled = false;

  static enable() {
    if (this.enabled) return;

    console.log('🔍 GlobalErrorHandler: Enabling enhanced error tracking...');

    // Override console.error to catch all errors
    console.error = (...args: any[]) => {
      // Call original console.error first
      this.originalConsoleError.apply(console, args);

      // Check if this is our target error
      const errorMessage = args.join(' ');
      if (errorMessage.includes('Cannot read properties of undefined') && errorMessage.includes('includes')) {
        console.log('🚨🚨🚨 ARRAY INCLUDES ERROR DETECTED! 🚨🚨🚨');
        console.log('🔍 Full error arguments:', args);

        // Get stack trace
        const stack = new Error().stack;
        console.log('🔍 Current stack trace:', stack);

        // Try to get more context from the call stack
        if (stack) {
          const lines = stack.split('\n');
          console.log('🔍 Stack analysis:');
          lines.forEach((line, index) => {
            if (line.includes('BrowsePage') || line.includes('FeedPage') || line.includes('FilterSheet') ||
                line.includes('CommentItem') || line.includes('CommentsSection') || line.includes('FigureForm')) {
              console.log(`🎯 RELEVANT STACK LINE ${index}: ${line}`);
            }
          });
        }

        // Log current component states if available
        if ((window as any).currentFigures) {
          console.log('🔍 Current figures count:', (window as any).currentFigures.length);
        }
        if ((window as any).React) {
          console.log('🔍 React dev tools available');
        }
      }
    };

    // Enhanced window error handler
    window.addEventListener('error', (event) => {
      if (event.message.includes('Cannot read properties of undefined') && event.message.includes('includes')) {
        console.log('🚨 WINDOW ERROR CAUGHT - INCLUDES ISSUE!');
        console.log('🔍 Error object:', event.error);
        console.log('🔍 Message:', event.message);
        console.log('🔍 Filename:', event.filename);
        console.log('🔍 Line number:', event.lineno);
        console.log('🔍 Column number:', event.colno);
        console.log('🔍 Stack trace:', event.error?.stack);

        // Try to identify which component
        if (event.filename) {
          if (event.filename.includes('BrowsePage')) console.log('🎯 ERROR IN: BrowsePage');
          if (event.filename.includes('FeedPage')) console.log('🎯 ERROR IN: FeedPage');
          if (event.filename.includes('FilterSheet')) console.log('🎯 ERROR IN: FilterSheet');
          if (event.filename.includes('CommentItem')) console.log('🎯 ERROR IN: CommentItem');
          if (event.filename.includes('CommentsSection')) console.log('🎯 ERROR IN: CommentsSection');
          if (event.filename.includes('FigureForm')) console.log('🎯 ERROR IN: FigureForm');
        }

        // Don't prevent default - let React error boundary handle it
        return false;
      }
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      if (reason?.message?.includes('Cannot read properties of undefined') && reason?.message?.includes('includes')) {
        console.log('🚨 PROMISE REJECTION - INCLUDES ERROR!');
        console.log('🔍 Rejection reason:', reason);
        console.log('🔍 Promise:', event.promise);
        console.log('🔍 Stack:', reason.stack);
      }
    });

    this.enabled = true;
    console.log('✅ GlobalErrorHandler: Enhanced error tracking enabled');
  }

  static disable() {
    if (!this.enabled) return;

    console.error = this.originalConsoleError;
    this.enabled = false;
    console.log('🔍 GlobalErrorHandler: Disabled');
  }

  static logComponentState(componentName: string, state: any) {
    console.log(`🔍 ${componentName} state:`, {
      timestamp: new Date().toISOString(),
      state: state,
      stateType: typeof state,
      isArray: Array.isArray(state),
      length: state?.length
    });
  }

  static interceptReactErrors() {
    // Store original React error handler if available
    const originalReactError = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.onCommitFiberRoot;

    if (originalReactError) {
      console.log('🔍 React DevTools detected, hooking into error reporting');
    }
  }
}

// Auto-enable in production and development
GlobalErrorHandler.enable();
GlobalErrorHandler.interceptReactErrors();
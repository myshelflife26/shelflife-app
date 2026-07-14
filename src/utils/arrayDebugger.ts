// Array Debugging Utility
// This will help us catch the exact location of unsafe array access

export class ArrayDebugger {
  private static originalArrayPrototype = Array.prototype;
  private static isEnabled = false;

  static enable() {
    if (this.isEnabled) return;

    console.log('🔍 ArrayDebugger: Enabling comprehensive array method monitoring...');

    // Override Array.prototype.includes
    const originalIncludes = Array.prototype.includes;
    Array.prototype.includes = function(searchElement, fromIndex?) {
      if (this == null) {
        console.error('🚨 ArrayDebugger: includes() called on null/undefined!');
        console.error('🚨 Stack trace:', new Error().stack);
        console.error('🚨 Arguments:', { searchElement, fromIndex });
        throw new TypeError('Cannot read properties of null/undefined (reading \'includes\')');
      }

      return originalIncludes.call(this, searchElement, fromIndex);
    };

    // Override Array.prototype.some
    const originalSome = Array.prototype.some;
    Array.prototype.some = function(callback, thisArg?) {
      if (this == null) {
        console.error('🚨 ArrayDebugger: some() called on null/undefined!');
        console.error('🚨 Stack trace:', new Error().stack);
        console.error('🚨 Arguments:', { callback: callback.toString(), thisArg });
        throw new TypeError('Cannot read properties of null/undefined (reading \'some\')');
      }

      return originalSome.call(this, callback, thisArg);
    };

    // Override Array.prototype.filter
    const originalFilter = Array.prototype.filter;
    Array.prototype.filter = function(callback, thisArg?) {
      if (this == null) {
        console.error('🚨 ArrayDebugger: filter() called on null/undefined!');
        console.error('🚨 Stack trace:', new Error().stack);
        console.error('🚨 Arguments:', { callback: callback.toString(), thisArg });
        throw new TypeError('Cannot read properties of null/undefined (reading \'filter\')');
      }

      return originalFilter.call(this, callback, thisArg);
    };

    // Override Array.prototype.map
    const originalMap = Array.prototype.map;
    Array.prototype.map = function(callback, thisArg?) {
      if (this == null) {
        console.error('🚨 ArrayDebugger: map() called on null/undefined!');
        console.error('🚨 Stack trace:', new Error().stack);
        console.error('🚨 Arguments:', { callback: callback.toString(), thisArg });
        throw new TypeError('Cannot read properties of null/undefined (reading \'map\')');
      }

      return originalMap.call(this, callback, thisArg);
    };

    this.isEnabled = true;
    console.log('✅ ArrayDebugger: All array methods are now monitored');
  }

  static disable() {
    if (!this.isEnabled) return;

    Array.prototype.includes = this.originalArrayPrototype.includes;
    Array.prototype.some = this.originalArrayPrototype.some;
    Array.prototype.filter = this.originalArrayPrototype.filter;
    Array.prototype.map = this.originalArrayPrototype.map;

    this.isEnabled = false;
    console.log('🔍 ArrayDebugger: Disabled array method monitoring');
  }

  static interceptPropertyAccess() {
    // This will catch ANY property access that might lead to includes()
    console.log('🔍 ArrayDebugger: Setting up property access interception...');

    window.addEventListener('error', (event) => {
      if (event.error?.message?.includes('includes')) {
        console.error('🚨 CAUGHT INCLUDES ERROR!');
        console.error('🚨 Error:', event.error);
        console.error('🚨 Stack:', event.error.stack);
        console.error('🚨 Filename:', event.filename);
        console.error('🚨 Line:', event.lineno);
        console.error('🚨 Column:', event.colno);
      }
    });

    // Also catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('includes')) {
        console.error('🚨 CAUGHT INCLUDES ERROR IN PROMISE!');
        console.error('🚨 Reason:', event.reason);
        console.error('🚨 Promise:', event.promise);
      }
    });
  }
}

// Auto-enable in development
if (process.env.NODE_ENV === 'development' || window.location.hostname === 'myshelflife26.github.io') {
  ArrayDebugger.enable();
  ArrayDebugger.interceptPropertyAccess();
}
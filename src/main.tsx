import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Override console.error to prevent "Cannot convert object to primitive value" errors
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const safeArgs = args.map(arg => {
    if (arg instanceof Error) {
      return arg.message;
    } else if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
      return arg;
    } else if (arg && typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return '[Object could not be serialized]';
      }
    } else {
      return String(arg);
    }
  });
  originalConsoleError(...safeArgs);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

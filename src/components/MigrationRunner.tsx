import { useState } from 'react';
import { Button } from './ui/button';
import { migrateIsListedField } from '../utils/migrateIsListed';
import { Database, CheckCircle, AlertCircle, Loader } from 'lucide-react';

/**
 * Admin component to run database migrations
 * Add this temporarily to your app to run migrations, then remove it
 */
export function MigrationRunner() {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState<{ total: number; updated: number; errors: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    setRunning(true);
    setError(null);
    setCompleted(false);

    try {
      const result = await migrateIsListedField();
      setStats(result);
      setCompleted(true);
    } catch (err) {
      console.error('Migration error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg p-4 shadow-xl max-w-md">
      <div className="flex items-center gap-3 mb-3">
        <Database className="h-6 w-6 text-blue-600" />
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Database Migration</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">Add isListed field to figures</p>
        </div>
      </div>

      {!running && !completed && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will add the <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">isListed</code> field
            to all figures for faster marketplace queries.
          </p>
          <Button onClick={runMigration} className="w-full">
            <Database className="h-4 w-4 mr-2" />
            Run Migration
          </Button>
        </div>
      )}

      {running && (
        <div className="flex items-center gap-3 text-blue-600">
          <Loader className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Running migration...</span>
        </div>
      )}

      {completed && stats && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Migration Complete!</span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 space-y-1 text-sm">
            <p className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Total figures:</span> {stats.total}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Updated:</span> {stats.updated}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Errors:</span> {stats.errors}
            </p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            You can now remove the MigrationRunner component from your app.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Migration failed</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

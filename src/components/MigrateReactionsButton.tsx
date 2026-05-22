import { useState } from 'react';
import { Button } from './ui/button';
import { FirebaseReactionsService } from '../utils/firebaseReactions';
import { toastManager } from '../utils/toastManager';
import { Database, AlertCircle, CheckCircle } from 'lucide-react';
import type { User } from '../types/user';

interface MigrateReactionsButtonProps {
  currentUser: User;
}

function MigrateReactionsButton({ currentUser }: MigrateReactionsButtonProps) {
  const [migrating, setMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);

  const handleMigration = async () => {
    if (migrating || migrationComplete) return;

    const confirmed = window.confirm(
      'This will migrate YOUR reactions from localStorage to Firestore. This process cannot be undone. Continue?'
    );

    if (!confirmed) return;

    setMigrating(true);
    toastManager.info('Starting migration...');

    try {
      const result = await FirebaseReactionsService.migrateFromLocalStorage(currentUser.id);

      if (result.success > 0) {
        toastManager.success(
          `Migration complete! ${result.success} reactions migrated${
            result.failed > 0 ? `, ${result.failed} failed` : ''
          }`
        );
        setMigrationComplete(true);
      } else if (result.failed > 0) {
        toastManager.error(`Migration failed: ${result.failed} reactions could not be migrated`);
      } else {
        toastManager.info('No reactions found to migrate');
        setMigrationComplete(true);
      }
    } catch (error) {
      console.error('Migration error:', error);
      toastManager.error('Migration failed. Check console for details.');
    } finally {
      setMigrating(false);
    }
  };

  if (migrationComplete) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        <span className="text-sm text-green-800 dark:text-green-200">
          Reactions migrated successfully
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-semibold mb-1">Migrate Reactions to Firestore</p>
          <p>
            This will move all reactions from browser localStorage to Firestore database.
            This enables cross-device sync and accurate rising stars tracking.
          </p>
        </div>
      </div>

      <Button
        onClick={handleMigration}
        disabled={migrating}
        className="w-full"
      >
        <Database className="h-4 w-4 mr-2" />
        {migrating ? 'Migrating...' : 'Migrate Reactions to Firestore'}
      </Button>
    </div>
  );
}


export default MigrateReactionsButton;
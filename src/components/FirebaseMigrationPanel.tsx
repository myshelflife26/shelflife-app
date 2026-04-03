import { useState } from 'react';
import { Button } from './ui/button';
import { FirebaseMigration } from '../utils/firebaseMigration';
import { Cloud, Database, ArrowRight, Check, AlertCircle } from 'lucide-react';
import type { User } from '../types/user';

interface FirebaseMigrationPanelProps {
  currentUser: User;
}

export function FirebaseMigrationPanel({ currentUser }: FirebaseMigrationPanelProps) {
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializingUsers, setInitializingUsers] = useState(false);
  const [usersInitialized, setUsersInitialized] = useState(false);

  const localFigureCount = FirebaseMigration.getLocalFigureCount();
  const hasLocalData = FirebaseMigration.hasLocalData();

  const handleInitializeUsers = async () => {
    if (!confirm('Initialize default Firebase test users?\n\nThis creates:\n- ackpack34 (Management)\n- ackpack342 (User)\n\nBoth with password: 1234')) {
      return;
    }

    setInitializingUsers(true);
    setError(null);

    try {
      await FirebaseMigration.initializeDefaultUsers();
      setUsersInitialized(true);
      alert('✅ Test users created!\n\nYou can now log in with:\n- ackpack34 / 1234\n- ackpack342 / 1234');
    } catch (err: any) {
      setError('Failed to initialize users: ' + err.message);
    } finally {
      setInitializingUsers(false);
    }
  };

  const handleMigration = async () => {
    if (!confirm(`Migrate ${localFigureCount} figures from localStorage to Firebase?\n\nThis will upload your collection to the cloud.`)) {
      return;
    }

    setMigrating(true);
    setError(null);

    try {
      const result = await FirebaseMigration.migrateUserData(currentUser.id);

      if (result.success) {
        setMigrated(true);
        alert(`✅ Successfully migrated ${result.figureCount} figures to Firebase!\n\nYour collection is now in the cloud.`);
      } else {
        setError(result.error || 'Migration failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMigrating(false);
    }
  };

  const handleClearLocal = () => {
    FirebaseMigration.clearLocalData();
  };

  if (!hasLocalData && !migrated) {
    return (
      <div className="space-y-4">
        {/* Initialize Firebase Users Button */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                First Time Setup
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                Initialize test users in Firebase to test the cloud features. This creates two accounts you can use to test public browsing.
              </p>
              <Button
                onClick={handleInitializeUsers}
                disabled={initializingUsers || usersInitialized}
                size="sm"
              >
                {initializingUsers ? 'Creating Users...' : usersInitialized ? 'Users Created ✓' : 'Initialize Test Users'}
              </Button>
            </div>
          </div>
        </div>

        {/* Active Status */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Check className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Firebase Active
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                Your collection is stored in Firebase. No local data needs migration.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Initialize Firebase Users Button */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              First Time Setup
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
              Initialize test users in Firebase before migrating. This creates accounts for ackpack34 and ackpack342.
            </p>
            <Button
              onClick={handleInitializeUsers}
              disabled={initializingUsers || usersInitialized}
              size="sm"
            >
              {initializingUsers ? 'Creating Users...' : usersInitialized ? 'Users Created ✓' : 'Initialize Test Users'}
            </Button>
          </div>
        </div>
      </div>

      {/* Migration Panel */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <Cloud className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Migrate to Firebase Cloud Storage
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
              You have <strong>{localFigureCount} figures</strong> stored locally in your browser.
              Migrate them to Firebase so you can access them from any device and share with other users.
            </p>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  localStorage ({localFigureCount} figures)
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div className="flex items-center gap-2 text-sm">
                <Cloud className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-900 dark:text-blue-100 font-medium">
                  Firebase Cloud
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            )}

            {migrated && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Migration complete! Your figures are now in Firebase.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleMigration}
                disabled={migrating || migrated}
                className="flex-1"
              >
                {migrating ? 'Migrating...' : migrated ? 'Migrated' : 'Migrate to Firebase'}
              </Button>

              {migrated && (
                <Button
                  onClick={handleClearLocal}
                  variant="outline"
                >
                  Clear Local Data
                </Button>
              )}
            </div>

            <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
              ⚠️ This is a one-time migration. Your local data will remain until you manually clear it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

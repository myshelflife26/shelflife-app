import { useState } from 'react';
import { Button } from './ui/button';
import { Database, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { User } from '../types/user';
import { migrateFiguresToStorage, checkMigrationStatus } from '../utils/migrateFiguresToStorage';
import MigrateReactionsButton from './MigrateReactionsButton';

interface SystemMaintenanceProps {
  currentUser: User;
}

export function SystemMaintenance({ currentUser }: SystemMaintenanceProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    total: number;
    needsMigration: number;
    alreadyMigrated: number;
  } | null>(null);
  const [migrationResults, setMigrationResults] = useState<{
    total: number;
    migrated: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setMigrationResults(null);
    try {
      const status = await checkMigrationStatus(currentUser.id);
      setMigrationStatus(status);
    } catch (error) {
      console.error('Failed to check migration status:', error);
      alert('Failed to check migration status. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleMigrate = async () => {
    if (!confirm('This will migrate all your figures with base64 images to Firebase Storage. Continue?')) {
      return;
    }

    setIsMigrating(true);
    setMigrationResults(null);
    try {
      const results = await migrateFiguresToStorage(currentUser.id);
      setMigrationResults(results);

      // Refresh status after migration
      const status = await checkMigrationStatus(currentUser.id);
      setMigrationStatus(status);

      if (results.errors.length === 0) {
        alert(`Migration complete! ${results.migrated} figures migrated successfully.`);
      } else {
        alert(`Migration complete with some errors. ${results.migrated} figures migrated, ${results.errors.length} errors.`);
      }
    } catch (error) {
      console.error('Failed to migrate figures:', error);
      alert('Migration failed. Please try again.');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          System Maintenance
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Tools for maintaining and optimizing your collection data
        </p>
      </div>

      {/* Image Storage Migration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3 mb-4">
          <Database className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Image Storage Migration
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Migrate your figure images from base64 storage to Firebase Storage. This will:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 mb-4">
              <li>Fix "Request payload size exceeds limit" errors</li>
              <li>Improve page load performance</li>
              <li>Allow you to upload more images per figure</li>
              <li>Reduce database storage costs</li>
            </ul>

            {/* Status Display */}
            {migrationStatus && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Migration Status</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Figures:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{migrationStatus.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Needs Migration:</span>
                    <span className="font-medium text-orange-600">{migrationStatus.needsMigration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Already Migrated:</span>
                    <span className="font-medium text-green-600">{migrationStatus.alreadyMigrated}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Migration Results */}
            {migrationResults && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  {migrationResults.errors.length === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  )}
                  Migration Results
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Processed:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{migrationResults.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Migrated:</span>
                    <span className="font-medium text-green-600">{migrationResults.migrated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Skipped:</span>
                    <span className="font-medium text-gray-600">{migrationResults.skipped}</span>
                  </div>
                  {migrationResults.errors.length > 0 && (
                    <div className="mt-2">
                      <span className="text-red-600 font-medium">Errors: {migrationResults.errors.length}</span>
                      <ul className="mt-1 space-y-1">
                        {migrationResults.errors.map((error, index) => (
                          <li key={index} className="text-xs text-red-600">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleCheckStatus}
                disabled={isChecking || isMigrating}
                variant="outline"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Check Status
                  </>
                )}
              </Button>

              <Button
                onClick={handleMigrate}
                disabled={isChecking || isMigrating || (migrationStatus && migrationStatus.needsMigration === 0)}
              >
                {isMigrating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Migrate Images
                  </>
                )}
              </Button>
            </div>

            {migrationStatus && migrationStatus.needsMigration === 0 && (
              <p className="text-sm text-green-600 mt-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                All figures are already using Firebase Storage!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reactions Migration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <Database className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Reactions Database Migration
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Migrate reactions from browser localStorage to Firestore. This will:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 mb-4">
              <li>Enable cross-device reaction syncing</li>
              <li>Enable accurate rising stars tracking with historical data</li>
              <li>Persist reactions across browsers and devices</li>
              <li>Calculate jealousy score changes over time</li>
            </ul>

            <MigrateReactionsButton currentUser={currentUser} />
          </div>
        </div>
      </div>
    </div>
  );
}

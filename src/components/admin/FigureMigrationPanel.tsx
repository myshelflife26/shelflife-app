import React, { useState } from 'react';
import { Upload, Database, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { FigureMigrationService } from '../../utils/figureMigration';

interface MigrationStatus {
  totalUserFigures: number;
  uniqueUserFigures: number;
  alreadyInMaster: number;
  needingMigration: number;
  missingFigures: Array<{
    name: string;
    manufacturer: string;
    productLine?: string;
    userCount: number;
  }>;
}

interface MigrationResults {
  processed: number;
  added: number;
  skipped: number;
  errors: string[];
}

const FigureMigrationPanel: React.FC = () => {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [migrationResults, setMigrationResults] = useState<MigrationResults | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [showMissingDetails, setShowMissingDetails] = useState(false);

  const checkMigrationStatus = async () => {
    setIsChecking(true);
    try {
      const status = await FigureMigrationService.checkMigrationStatus();
      setMigrationStatus(status);
    } catch (error) {
      console.error('Error checking migration status:', error);
      alert('Failed to check migration status: ' + error.message);
    } finally {
      setIsChecking(false);
    }
  };

  const runMigration = async () => {
    if (!confirm('This will migrate all user figures to the master database. This may take several minutes. Continue?')) {
      return;
    }

    setIsMigrating(true);
    try {
      const results = await FigureMigrationService.migrateUserFiguresToMaster();
      setMigrationResults(results);

      // Refresh status after migration
      await checkMigrationStatus();

      alert(`Migration completed! Added ${results.added} figures, skipped ${results.skipped} duplicates.`);
    } catch (error) {
      console.error('Migration error:', error);
      alert('Migration failed: ' + error.message);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Figure Migration</h2>
        </div>

        <p className="text-gray-600 mb-6">
          Migrate user collection figures to the master database. This ensures all figures in user collections
          are also available in the master database for toy line generation and data consistency.
        </p>

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={checkMigrationStatus}
            disabled={isChecking}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isChecking ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Check Status
          </button>

          {migrationStatus && migrationStatus.needingMigration > 0 && (
            <button
              onClick={runMigration}
              disabled={isMigrating}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isMigrating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Run Migration
            </button>
          )}
        </div>

        {/* Migration Status Display */}
        {migrationStatus && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-900 mb-3">Migration Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{migrationStatus.totalUserFigures}</div>
                <div className="text-gray-600">Total User Figures</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{migrationStatus.uniqueUserFigures}</div>
                <div className="text-gray-600">Unique Figures</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{migrationStatus.alreadyInMaster}</div>
                <div className="text-gray-600">Already in Master</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{migrationStatus.needingMigration}</div>
                <div className="text-gray-600">Need Migration</div>
              </div>
            </div>

            {migrationStatus.needingMigration > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowMissingDetails(!showMissingDetails)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showMissingDetails ? 'Hide' : 'Show'} Missing Figures ({migrationStatus.missingFigures.length})
                </button>

                {showMissingDetails && (
                  <div className="mt-3 max-h-60 overflow-y-auto">
                    <div className="text-xs text-gray-500 mb-2">
                      Figures not yet in master database (sorted by popularity):
                    </div>
                    <div className="space-y-1">
                      {migrationStatus.missingFigures.slice(0, 50).map((figure, index) => (
                        <div key={index} className="flex justify-between items-center py-1 px-2 bg-white rounded text-xs">
                          <span className="font-medium">
                            {figure.name}
                          </span>
                          <span className="text-gray-500">
                            {figure.manufacturer} • {figure.productLine || 'No Series'} • {figure.userCount} users
                          </span>
                        </div>
                      ))}
                      {migrationStatus.missingFigures.length > 50 && (
                        <div className="text-xs text-gray-500 text-center py-2">
                          ... and {migrationStatus.missingFigures.length - 50} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Migration Results */}
        {migrationResults && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-medium text-green-800">Migration Results</h3>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm mb-3">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{migrationResults.processed}</div>
                <div className="text-green-700">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{migrationResults.added}</div>
                <div className="text-green-700">Added</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-600">{migrationResults.skipped}</div>
                <div className="text-green-700">Skipped</div>
              </div>
            </div>

            {migrationResults.errors.length > 0 && (
              <div className="border-t border-green-200 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">
                    {migrationResults.errors.length} Errors
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {migrationResults.errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-600 py-1">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Migration Progress */}
        {isMigrating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              <span className="font-medium text-blue-800">Migration in Progress</span>
            </div>
            <p className="text-sm text-blue-700">
              This may take several minutes depending on the number of figures to migrate.
              Please don't close this page.
            </p>
          </div>
        )}

        {/* Information Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h4 className="font-medium text-blue-800 mb-2">What this migration does:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Finds all figures in user collections that don't exist in the master database</li>
            <li>• Creates master database entries for these figures</li>
            <li>• Preserves original figure details (name, manufacturer, series, etc.)</li>
            <li>• Uses the first available image from the user's figure</li>
            <li>• Enables these figures to appear in toy line listings</li>
            <li>• Skips figures that already exist in the master database</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FigureMigrationPanel;
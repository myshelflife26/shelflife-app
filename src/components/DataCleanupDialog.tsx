import { useState } from 'react';
import { Button } from './ui/button';
import { X, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { cleanupContaminatedSizeFields, type CleanupResult } from '../utils/dataCleanup';
import { toastManager } from '../utils/toastManager';

interface DataCleanupDialogProps {
  onClose: () => void;
  onCleanupComplete: () => void;
}

type CleanupStage = 'preview' | 'scanning' | 'applying' | 'complete';

export function DataCleanupDialog({ onClose, onCleanupComplete }: DataCleanupDialogProps) {
  const [stage, setStage] = useState<CleanupStage>('preview');
  const [scanResult, setScanResult] = useState<CleanupResult | null>(null);
  const [applyResult, setApplyResult] = useState<CleanupResult | null>(null);

  const handleScan = async () => {
    setStage('scanning');
    try {
      const result = await cleanupContaminatedSizeFields(true); // Dry run
      setScanResult(result);
      setStage('preview');
    } catch (error) {
      console.error('Scan failed:', error);
      toastManager.error('Failed to scan data');
      setStage('preview');
    }
  };

  const handleApply = async () => {
    if (!scanResult || scanResult.issuesFound === 0) {
      return;
    }

    const confirmMessage = `Apply cleanup to ${scanResult.issuesFound} figure(s)?\n\n` +
      `This will update the size field and may populate empty category, packaging, or sub product line fields.\n\n` +
      `This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setStage('applying');
    try {
      const result = await cleanupContaminatedSizeFields(false); // Actually apply
      setApplyResult(result);
      setStage('complete');
      toastManager.success(`Successfully cleaned up ${result.fixed} figure(s)`);
      onCleanupComplete();
    } catch (error) {
      console.error('Cleanup failed:', error);
      toastManager.error('Failed to apply cleanup');
      setStage('preview');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Data Cleanup Tool
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Fix contaminated size fields from CSV imports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Info banner */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900 dark:text-blue-200">
                <p className="font-semibold mb-1">What this fixes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Size fields containing multiple comma-separated values (e.g., "3.75,Action Figure,Individual")</li>
                  <li>Automatically extracts and populates category, packaging, and sub product line from contaminated data</li>
                  <li>Only updates empty fields - won't overwrite existing data</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Stage-specific content */}
          {stage === 'preview' && !scanResult && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Click "Scan Database" to preview what will be fixed
              </p>
              <Button onClick={handleScan} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Scan Database
              </Button>
            </div>
          )}

          {stage === 'scanning' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Scanning database...</p>
            </div>
          )}

          {stage === 'preview' && scanResult && (
            <>
              {/* Summary */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {scanResult.totalScanned}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Figures</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {scanResult.issuesFound}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Issues Found</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {scanResult.fixed}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Will Be Fixed</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              {scanResult.details.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Preview Changes ({scanResult.details.length})
                  </h3>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                            Figure
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                            Current Value
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                            Will Become
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {scanResult.details.map((detail, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              {detail.figureName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              <span className="text-red-600 dark:text-red-400 font-mono text-xs">
                                {detail.oldValue}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="space-y-1">
                                <div>
                                  <span className="text-xs text-gray-500">Size: </span>
                                  <span className="text-green-600 dark:text-green-400 font-mono text-xs">
                                    {detail.newValue}
                                  </span>
                                </div>
                                {detail.additionalUpdates && (
                                  <>
                                    {Object.entries(detail.additionalUpdates).map(([key, value]) => (
                                      <div key={key}>
                                        <span className="text-xs text-gray-500 capitalize">{key}: </span>
                                        <span className="text-green-600 dark:text-green-400 font-mono text-xs">
                                          {value}
                                        </span>
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Errors */}
              {scanResult.errors.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
                    Errors during scan:
                  </p>
                  <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
                    {scanResult.errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {stage === 'applying' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 dark:border-green-400"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Applying cleanup...</p>
            </div>
          )}

          {stage === 'complete' && applyResult && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Cleanup Complete!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Successfully cleaned up {applyResult.fixed} figure(s)
              </p>
              {applyResult.errors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-left">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
                    {applyResult.errors.length} error(s) occurred:
                  </p>
                  <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
                    {applyResult.errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {stage === 'preview' && scanResult && (
            <>
              <Button variant="outline" onClick={handleScan}>
                Re-scan
              </Button>
              <Button
                onClick={handleApply}
                disabled={scanResult.issuesFound === 0}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Apply Cleanup ({scanResult.issuesFound})
              </Button>
            </>
          )}
          {stage === 'complete' && (
            <Button onClick={onClose}>
              Close
            </Button>
          )}
          {(stage === 'preview' && !scanResult) && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

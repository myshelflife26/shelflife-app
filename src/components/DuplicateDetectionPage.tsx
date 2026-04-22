import { useState, useEffect, useMemo } from 'react';
import { DuplicateDetectionService, type DuplicateMatch } from '../utils/duplicateDetection';
import { MasterFiguresService, type MasterFigure } from '../utils/masterFigures';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { Search, AlertTriangle, CheckCircle, X, Clock, CalendarClock } from 'lucide-react';
import { toastManager } from '../utils/toastManager';
import { MergeDialog } from './MergeDialog';
import { Pagination } from './Pagination';

interface DuplicateDetectionPageProps {
  onClose: () => void;
}

export function DuplicateDetectionPage({ onClose }: DuplicateDetectionPageProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [filteredDuplicates, setFilteredDuplicates] = useState<DuplicateMatch[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'likely' | 'possible'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Bulk merge
  const [isBulkMerging, setIsBulkMerging] = useState(false);

  // Manual comparison
  const [allFigures, setAllFigures] = useState<MasterFigure[]>([]);
  const [manualFigure1, setManualFigure1] = useState<string>('');
  const [manualFigure2, setManualFigure2] = useState<string>('');

  // Merge dialog
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeFigure1, setMergeFigure1] = useState<MasterFigure | null>(null);
  const [mergeFigure2, setMergeFigure2] = useState<MasterFigure | null>(null);

  // Load all figures for manual selection
  useEffect(() => {
    loadAllFigures();
  }, []);

  // Filter duplicates when filter type changes
  useEffect(() => {
    if (filterType === 'all') {
      setFilteredDuplicates(duplicates);
    } else {
      setFilteredDuplicates(duplicates.filter(d => d.matchType === filterType));
    }
    // Reset to page 1 when filter changes
    setCurrentPage(1);
  }, [filterType, duplicates]);

  // Paginate filtered duplicates
  const paginatedDuplicates = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredDuplicates.slice(startIndex, endIndex);
  }, [filteredDuplicates, currentPage, pageSize]);

  const loadAllFigures = async () => {
    const figures = await MasterFiguresService.getAll();
    setAllFigures(figures);
  };

  const handleScan = async () => {
    setIsScanning(true);
    toastManager.info('Scanning for duplicates...');

    try {
      const matches = await DuplicateDetectionService.detectAllDuplicates();
      setDuplicates(matches);
      setFilteredDuplicates(matches);

      if (matches.length === 0) {
        toastManager.success('No duplicates found!');
      } else {
        const likely = matches.filter(m => m.matchType === 'likely').length;
        const possible = matches.filter(m => m.matchType === 'possible').length;
        toastManager.success(
          `Found ${matches.length} potential duplicates (${likely} likely, ${possible} possible)`
        );
      }
    } catch (error) {
      console.error('Failed to scan for duplicates:', error);
      toastManager.error('Failed to scan for duplicates');
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualCompare = () => {
    if (!manualFigure1 || !manualFigure2) {
      toastManager.error('Please select two figures to compare');
      return;
    }

    if (manualFigure1 === manualFigure2) {
      toastManager.error('Please select two different figures');
      return;
    }

    const fig1 = allFigures.find(f => f.id === manualFigure1);
    const fig2 = allFigures.find(f => f.id === manualFigure2);

    if (fig1 && fig2) {
      setMergeFigure1(fig1);
      setMergeFigure2(fig2);
      setShowMergeDialog(true);
    }
  };

  const handleCompareClick = (match: DuplicateMatch) => {
    setMergeFigure1(match.figure1);
    setMergeFigure2(match.figure2);
    setShowMergeDialog(true);
  };

  const handleMergeComplete = () => {
    setShowMergeDialog(false);
    setMergeFigure1(null);
    setMergeFigure2(null);

    // Refresh duplicates list
    handleScan();

    // Reload figures for manual selection
    loadAllFigures();
  };

  const handleBulkMerge = async () => {
    if (paginatedDuplicates.length === 0) {
      toastManager.error('No duplicates on this page to merge');
      return;
    }

    const confirmMessage = `Are you sure you want to merge all ${paginatedDuplicates.length} duplicate pair(s) on this page?\n\n` +
      `For each pair:\n` +
      `- The OLDER figure will be kept\n` +
      `- The NEWER figure will be deleted\n` +
      `- All fields from the OLDER figure will be preserved\n\n` +
      `This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsBulkMerging(true);
    let successCount = 0;
    let failCount = 0;
    let totalUpdatedUserFigures = 0;

    for (const match of paginatedDuplicates) {
      try {
        // Determine which is older
        const olderFigure = DuplicateDetectionService.getOlderFigure(match.figure1, match.figure2);
        const keepFigure = olderFigure === 1 ? match.figure1 : match.figure2;
        const deleteFigure = olderFigure === 1 ? match.figure2 : match.figure1;

        // Merge using all fields from the keep figure (older one)
        const result = await MasterFiguresService.mergeFigures(
          keepFigure.id,
          deleteFigure.id,
          keepFigure // Use all fields from older figure
        );

        if (result.success) {
          successCount++;
          totalUpdatedUserFigures += result.updatedUserFigures;
        } else {
          failCount++;
          console.error(`Failed to merge ${deleteFigure.name}:`, result.error);
        }
      } catch (error) {
        failCount++;
        console.error('Error during bulk merge:', error);
      }
    }

    setIsBulkMerging(false);

    // Show results
    if (successCount > 0) {
      toastManager.success(
        `Successfully merged ${successCount} pair(s)! ` +
        `Updated ${totalUpdatedUserFigures} user figure(s). ` +
        (failCount > 0 ? `${failCount} failed.` : '')
      );
    } else {
      toastManager.error(`Failed to merge duplicates. ${failCount} errors.`);
    }

    // Refresh duplicates list
    handleScan();
    loadAllFigures();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Duplicate Detection
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Find and merge duplicate figures in the master database
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Section 1: Automatic Detection */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Automatic Detection
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Scan the entire database for potential duplicates based on matching fields.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleScan}
                disabled={isScanning}
                variant="default"
              >
                <Search className="h-4 w-4 mr-2" />
                {isScanning ? 'Scanning...' : 'Scan for Duplicates'}
              </Button>

              {duplicates.length > 0 && (
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'likely' | 'possible')}
                  className="w-48"
                >
                  <option value="all">All ({duplicates.length})</option>
                  <option value="likely">
                    Likely ({duplicates.filter(d => d.matchType === 'likely').length})
                  </option>
                  <option value="possible">
                    Possible ({duplicates.filter(d => d.matchType === 'possible').length})
                  </option>
                </Select>
              )}
            </div>
          </div>

          {/* Results Table */}
          {filteredDuplicates.length > 0 && (
            <div className="space-y-4">
              {/* Pagination and Bulk Actions */}
              <div className="flex items-center justify-between">
                <div>
                  <Pagination
                    currentPage={currentPage}
                    totalItems={filteredDuplicates.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
                <Button
                  onClick={handleBulkMerge}
                  disabled={isBulkMerging || paginatedDuplicates.length === 0}
                  variant="default"
                >
                  {isBulkMerging ? 'Merging...' : `Merge All on Page (${paginatedDuplicates.length})`}
                </Button>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                          Older Figure (Keep)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                          Newer Figure (Delete)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                          Match Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                          Matched Fields
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedDuplicates.map((match, index) => {
                        const olderFigure = DuplicateDetectionService.getOlderFigure(match.figure1, match.figure2);
                        const keepFigure = olderFigure === 1 ? match.figure1 : match.figure2;
                        const deleteFigure = olderFigure === 1 ? match.figure2 : match.figure1;

                        return (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="px-4 py-3 bg-green-50 dark:bg-green-900/10">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-3 w-3 text-green-600 dark:text-green-400" />
                                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                  {new Date(keepFigure.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {keepFigure.name}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {keepFigure.manufacturer}
                                {keepFigure.year && ` (${keepFigure.year})`}
                                {keepFigure.version && ` - ${keepFigure.version}`}
                              </div>
                            </td>
                            <td className="px-4 py-3 bg-red-50 dark:bg-red-900/10">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-3 w-3 text-red-600 dark:text-red-400" />
                                <span className="text-xs font-medium text-red-700 dark:text-red-300">
                                  {new Date(deleteFigure.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {deleteFigure.name}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {deleteFigure.manufacturer}
                                {deleteFigure.year && ` (${deleteFigure.year})`}
                                {deleteFigure.version && ` - ${deleteFigure.version}`}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {match.matchType === 'likely' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Likely
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Possible
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {match.matchedFields.join(', ')}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {match.matchScore} fields match
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                onClick={() => handleCompareClick(match)}
                                size="sm"
                                variant="outline"
                              >
                                Compare & Merge
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Pagination */}
              <div className="flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredDuplicates.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </div>
          )}

          {/* Section 2: Manual Comparison */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Manual Comparison
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Manually select two figures to compare and merge.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Figure 1
                </label>
                <Select
                  value={manualFigure1}
                  onChange={(e) => setManualFigure1(e.target.value)}
                >
                  <option value="">Select figure...</option>
                  {allFigures.map(fig => (
                    <option key={fig.id} value={fig.id}>
                      {DuplicateDetectionService.getFigureDisplayName(fig)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Figure 2
                </label>
                <Select
                  value={manualFigure2}
                  onChange={(e) => setManualFigure2(e.target.value)}
                >
                  <option value="">Select figure...</option>
                  {allFigures.map(fig => (
                    <option key={fig.id} value={fig.id}>
                      {DuplicateDetectionService.getFigureDisplayName(fig)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleManualCompare}
                  disabled={!manualFigure1 || !manualFigure2}
                  variant="default"
                  className="w-full"
                >
                  Compare
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Merge Dialog */}
      {showMergeDialog && mergeFigure1 && mergeFigure2 && (
        <MergeDialog
          figure1={mergeFigure1}
          figure2={mergeFigure2}
          onClose={() => {
            setShowMergeDialog(false);
            setMergeFigure1(null);
            setMergeFigure2(null);
          }}
          onMergeComplete={handleMergeComplete}
        />
      )}
    </div>
  );
}

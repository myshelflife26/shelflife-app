import { useState, useEffect } from 'react';
import { DuplicateDetectionService } from '../utils/duplicateDetection';
import { MasterFiguresService, type MasterFigure } from '../utils/masterFigures';
import { RejectedDuplicatesService } from '../utils/rejectedDuplicates';
import { Button } from './ui/button';
import { X, AlertCircle, XCircle } from 'lucide-react';
import { toastManager } from '../utils/toastManager';
import type { User } from '../types/user';

interface MergeDialogProps {
  figure1: MasterFigure;
  figure2: MasterFigure;
  onClose: () => void;
  onMergeComplete: () => void;
  currentUser: User;
}

type FieldSelection = {
  [fieldName: string]: 1 | 2 | 'custom'; // 1 = use figure1's value, 2 = use figure2's value, 'custom' = use custom value
};

type CustomValues = {
  [fieldName: string]: string;
};

type UserUpdateStrategy = 'soft' | 'full';

export function MergeDialog({ figure1, figure2, onClose, onMergeComplete, currentUser }: MergeDialogProps) {
  // Determine which figure is older
  const olderFigureNum = DuplicateDetectionService.getOlderFigure(figure1, figure2);
  const olderFigure = olderFigureNum === 1 ? figure1 : figure2;
  const newerFigure = olderFigureNum === 1 ? figure2 : figure1;

  // State to track which figure user wants to keep (1=older, 2=newer)
  const [figureToKeep, setFigureToKeep] = useState<1 | 2>(1); // Default to keeping older figure

  // State to track how to update user collections
  const [userUpdateStrategy, setUserUpdateStrategy] = useState<UserUpdateStrategy>('soft');

  // State to track custom values for fields
  const [customValues, setCustomValues] = useState<CustomValues>({});

  // Compute keepFigure and deleteFigure based on user's selection
  const keepFigure = figureToKeep === 1 ? olderFigure : newerFigure;
  const deleteFigure = figureToKeep === 1 ? newerFigure : olderFigure;

  // Fields to compare and merge
  const mergeableFields: Array<{
    key: keyof MasterFigure;
    label: string;
  }> = [
    { key: 'name', label: 'Name' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'year', label: 'Year' },
    { key: 'version', label: 'Version' },
    { key: 'franchise', label: 'Franchise/IP' },
    { key: 'productLine', label: 'Product Line' },
    { key: 'productLineNumber', label: 'Product Line Number' },
    { key: 'subProductLine', label: 'Sub Product Line' },
    { key: 'category', label: 'Category' },
    { key: 'size', label: 'Size' },
    { key: 'packaging', label: 'Packaging' },
    { key: 'upc', label: 'UPC' },
    { key: 'imageUrl', label: 'Image URL' },
    { key: 'notes', label: 'Notes' }
  ];

  const [fieldSelections, setFieldSelections] = useState<FieldSelection>({});
  const [isMerging, setIsMerging] = useState(false);

  // Auto-select most complete figure on mount or when figureToKeep changes
  useEffect(() => {
    autoSelectMostComplete();
  }, [figureToKeep]);

  const autoSelectMostComplete = () => {
    const selections: FieldSelection = {};

    for (const field of mergeableFields) {
      const valOlder = olderFigure[field.key];
      const valNewer = newerFigure[field.key];

      // If only one has a value, select that one
      if (valOlder && !valNewer) {
        selections[field.key] = 1; // Use older
      } else if (!valOlder && valNewer) {
        selections[field.key] = 2; // Use newer
      } else if (valOlder && valNewer) {
        // Both have values, prefer the figure we're keeping
        selections[field.key] = figureToKeep;
      } else {
        // Neither has value, default to figure we're keeping
        selections[field.key] = figureToKeep;
      }
    }

    setFieldSelections(selections);
  };

  const handleFieldSelect = (fieldKey: string, selection: 1 | 2 | 'custom') => {
    setFieldSelections(prev => ({
      ...prev,
      [fieldKey]: selection
    }));
  };

  const handleCustomValueChange = (fieldKey: string, value: string) => {
    setCustomValues(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const buildMergedData = (): Partial<MasterFigure> => {
    const merged: any = {};

    for (const field of mergeableFields) {
      const selection = fieldSelections[field.key];
      // Selection 1 = older figure, Selection 2 = newer figure, 'custom' = custom value
      if (selection === 1) {
        merged[field.key] = olderFigure[field.key];
      } else if (selection === 2) {
        merged[field.key] = newerFigure[field.key];
      } else if (selection === 'custom') {
        // Use custom value, convert to number for year field
        const customVal = customValues[field.key] || '';
        merged[field.key] = field.key === 'year' && customVal ? Number(customVal) : customVal;
      }
    }

    return merged;
  };

  const handleReject = async () => {
    const confirmMessage = `Mark these as NOT duplicates?\n\n` +
      `${figure1.name}\n` +
      `${figure2.name}\n\n` +
      `This pair will not appear in future duplicate scans.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsMerging(true);

    try {
      const success = await RejectedDuplicatesService.reject(
        figure1.id,
        figure2.id,
        figure1.name,
        figure2.name,
        currentUser.id,
        currentUser.username
      );

      if (success) {
        toastManager.success('Marked as not a duplicate. This pair will not appear in future scans.');
        onMergeComplete(); // Close dialog and refresh list
      } else {
        toastManager.error('Failed to mark as not a duplicate');
      }
    } catch (error) {
      console.error('Failed to reject duplicate:', error);
      toastManager.error('Failed to mark as not a duplicate');
    } finally {
      setIsMerging(false);
    }
  };

  const handleMerge = async () => {
    const keepLabel = figureToKeep === 1 ? 'Older' : 'Newer';
    const deleteLabel = figureToKeep === 1 ? 'Newer' : 'Older';

    const confirmMessage = `Are you sure you want to merge these figures?\n\n` +
      `Keep (${keepLabel}): ${keepFigure.name} (${new Date(keepFigure.createdAt).toLocaleDateString()})\n` +
      `Delete (${deleteLabel}): ${deleteFigure.name} (${new Date(deleteFigure.createdAt).toLocaleDateString()})\n\n` +
      `This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsMerging(true);

    try {
      const mergedData = buildMergedData();
      const result = await MasterFiguresService.mergeFigures(
        keepFigure.id,
        deleteFigure.id,
        mergedData,
        userUpdateStrategy
      );

      if (result.success) {
        const strategyLabel = userUpdateStrategy === 'soft' ? 'soft-updated' : 'fully-updated';
        toastManager.success(
          `Successfully merged figures! ${strategyLabel} ${result.updatedUserFigures} user figure(s) and notified ${result.notifiedUsers} user(s).`
        );
        onMergeComplete();
      } else {
        toastManager.error(`Failed to merge figures: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to merge figures:', error);
      toastManager.error('Failed to merge figures');
    } finally {
      setIsMerging(false);
    }
  };

  const getFieldValue = (figure: MasterFigure, fieldKey: keyof MasterFigure): string => {
    const value = figure[fieldKey];
    if (value === undefined || value === null || value === '') {
      return '(empty)';
    }
    return String(value);
  };

  const hasValueDifference = (fieldKey: keyof MasterFigure): boolean => {
    const valOlder = olderFigure[fieldKey];
    const valNewer = newerFigure[fieldKey];

    // Both empty
    if ((!valOlder || valOlder === '') && (!valNewer || valNewer === '')) {
      return false;
    }

    // One empty, one has value
    if ((!valOlder || valOlder === '') !== (!valNewer || valNewer === '')) {
      return true;
    }

    // Compare values
    return String(valOlder).toLowerCase() !== String(valNewer).toLowerCase();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Merge Duplicate Figures
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Select which fields to keep for the merged figure
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
        <div className="p-6">
          {/* Info banner */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-200">
                <p className="font-semibold mb-1">Merge Strategy:</p>
                <p>
                  Select which figure to keep below. The selected figure will be updated with your
                  chosen field values. The other figure will be deleted. Any user collections
                  referencing the deleted figure will be updated with merge metadata.
                </p>
              </div>
            </div>
          </div>

          {/* Figure selection - which one to keep */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Which figure do you want to keep?
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="figureToKeep"
                  checked={figureToKeep === 1}
                  onChange={() => setFigureToKeep(1)}
                  className="w-5 h-5 text-green-600"
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  Keep Older Figure (Created {new Date(olderFigure.createdAt).toLocaleDateString()})
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="figureToKeep"
                  checked={figureToKeep === 2}
                  onChange={() => setFigureToKeep(2)}
                  className="w-5 h-5 text-green-600"
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  Keep Newer Figure (Created {new Date(newerFigure.createdAt).toLocaleDateString()})
                </span>
              </label>
            </div>
          </div>

          {/* User collection update strategy */}
          <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              How should user collections be updated?
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Users who own the deleted figure will have their collection updated and receive a notification.
            </p>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="userUpdateStrategy"
                  checked={userUpdateStrategy === 'soft'}
                  onChange={() => setUserUpdateStrategy('soft')}
                  className="w-5 h-5 text-purple-600 mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Soft Update (Recommended)
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Only update empty fields in user collections. Preserves any custom data users have entered.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="userUpdateStrategy"
                  checked={userUpdateStrategy === 'full'}
                  onChange={() => setUserUpdateStrategy('full')}
                  className="w-5 h-5 text-purple-600 mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Full Update
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Update all fields to match the merged master figure. User ownership data (condition, location, price) is preserved.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Figure headers */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={`p-4 border rounded-lg ${
              figureToKeep === 1
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${figureToKeep === 1 ? 'bg-green-600' : 'bg-red-600'}`}></div>
                <span className={`text-sm font-semibold ${
                  figureToKeep === 1
                    ? 'text-green-900 dark:text-green-200'
                    : 'text-red-900 dark:text-red-200'
                }`}>
                  Older Figure {figureToKeep === 1 ? '(Keep)' : '(Delete)'}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {olderFigure.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Created: {new Date(olderFigure.createdAt).toLocaleDateString()}
                {olderFigure.createdByName && ` by ${olderFigure.createdByName}`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Completeness: {DuplicateDetectionService.getCompletenessScore(olderFigure)}/13 fields
              </p>
            </div>

            <div className={`p-4 border rounded-lg ${
              figureToKeep === 2
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${figureToKeep === 2 ? 'bg-green-600' : 'bg-red-600'}`}></div>
                <span className={`text-sm font-semibold ${
                  figureToKeep === 2
                    ? 'text-green-900 dark:text-green-200'
                    : 'text-red-900 dark:text-red-200'
                }`}>
                  Newer Figure {figureToKeep === 2 ? '(Keep)' : '(Delete)'}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {newerFigure.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Created: {new Date(newerFigure.createdAt).toLocaleDateString()}
                {newerFigure.createdByName && ` by ${newerFigure.createdByName}`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Completeness: {DuplicateDetectionService.getCompletenessScore(newerFigure)}/13 fields
              </p>
            </div>
          </div>

          {/* Field selection instructions */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Select field values:</strong> For each field below, choose which value to use in the final merged figure.
              You can mix and match - for example, keep the name from the older figure but use the year from the newer figure.
              If neither value is correct, select "Custom" to enter your own value.
            </p>
          </div>

          {/* Field comparison table */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Field
                  </th>
                  <th className={`w-1/4 px-4 py-3 text-left text-xs font-medium uppercase border-l-2 ${
                    figureToKeep === 1
                      ? 'text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                      : 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                  }`}>
                    Older Figure
                  </th>
                  <th className={`w-1/4 px-4 py-3 text-left text-xs font-medium uppercase border-l-2 ${
                    figureToKeep === 2
                      ? 'text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                      : 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                  }`}>
                    Newer Figure
                  </th>
                  <th className="w-1/3 px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase border-l-2 border-gray-200 dark:border-gray-700">
                    Neither - Custom Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {mergeableFields.map(field => {
                  const isDifferent = hasValueDifference(field.key);
                  const valOlder = getFieldValue(olderFigure, field.key);
                  const valNewer = getFieldValue(newerFigure, field.key);
                  const selection = fieldSelections[field.key];

                  return (
                    <tr
                      key={field.key}
                      className={isDifferent ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {field.label}
                      </td>
                      <td className={`px-4 py-3 border-l-2 ${
                        selection === 1
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={field.key}
                            checked={selection === 1}
                            onChange={() => handleFieldSelect(field.key, 1)}
                            className="w-4 h-4 text-green-600"
                          />
                          <span className={`text-sm break-words ${
                            valOlder === '(empty)'
                              ? 'text-gray-400 italic'
                              : selection === 1
                                ? 'text-gray-900 dark:text-white font-medium'
                                : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {valOlder}
                          </span>
                        </label>
                      </td>
                      <td className={`px-4 py-3 border-l-2 ${
                        selection === 2
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={field.key}
                            checked={selection === 2}
                            onChange={() => handleFieldSelect(field.key, 2)}
                            className="w-4 h-4 text-green-600"
                          />
                          <span className={`text-sm break-words ${
                            valNewer === '(empty)'
                              ? 'text-gray-400 italic'
                              : selection === 2
                                ? 'text-gray-900 dark:text-white font-medium'
                                : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {valNewer}
                          </span>
                        </label>
                      </td>
                      <td className={`px-4 py-3 border-l-2 ${
                        selection === 'custom'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}>
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                          <input
                            type="radio"
                            name={field.key}
                            checked={selection === 'custom'}
                            onChange={() => handleFieldSelect(field.key, 'custom')}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Use custom value
                          </span>
                        </label>
                        {selection === 'custom' && (
                          <input
                            type="text"
                            value={customValues[field.key] || ''}
                            onChange={(e) => handleCustomValueChange(field.key, e.target.value)}
                            placeholder="Enter custom value"
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            autoFocus
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Auto-select button */}
          <div className="mb-4">
            <Button
              onClick={autoSelectMostComplete}
              variant="outline"
              size="sm"
            >
              Auto-Select Most Complete
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            onClick={handleReject}
            disabled={isMerging}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Neither - Not a Duplicate
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isMerging}>
              Cancel
            </Button>
            <Button onClick={handleMerge} disabled={isMerging}>
              {isMerging ? 'Merging...' : 'Merge Figures'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

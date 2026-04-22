import { useState, useEffect } from 'react';
import { DuplicateDetectionService } from '../utils/duplicateDetection';
import { MasterFiguresService, type MasterFigure } from '../utils/masterFigures';
import { Button } from './ui/button';
import { X, AlertCircle } from 'lucide-react';
import { toastManager } from '../utils/toastManager';

interface MergeDialogProps {
  figure1: MasterFigure;
  figure2: MasterFigure;
  onClose: () => void;
  onMergeComplete: () => void;
}

type FieldSelection = {
  [fieldName: string]: 1 | 2; // 1 = use figure1's value, 2 = use figure2's value
};

export function MergeDialog({ figure1, figure2, onClose, onMergeComplete }: MergeDialogProps) {
  // Determine which figure to keep (older one) and which to delete
  const olderFigure = DuplicateDetectionService.getOlderFigure(figure1, figure2);
  const keepFigure = olderFigure === 1 ? figure1 : figure2;
  const deleteFigure = olderFigure === 1 ? figure2 : figure1;

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
    { key: 'subProductLine', label: 'Sub Product Line' },
    { key: 'series', label: 'Series (Legacy)' },
    { key: 'category', label: 'Category' },
    { key: 'size', label: 'Size' },
    { key: 'packaging', label: 'Packaging' },
    { key: 'upc', label: 'UPC' },
    { key: 'imageUrl', label: 'Image URL' },
    { key: 'notes', label: 'Notes' }
  ];

  const [fieldSelections, setFieldSelections] = useState<FieldSelection>({});
  const [isMerging, setIsMerging] = useState(false);

  // Auto-select most complete figure on mount
  useEffect(() => {
    autoSelectMostComplete();
  }, []);

  const autoSelectMostComplete = () => {
    const selections: FieldSelection = {};

    for (const field of mergeableFields) {
      const val1 = keepFigure[field.key];
      const val2 = deleteFigure[field.key];

      // If only one has a value, select that one
      if (val1 && !val2) {
        selections[field.key] = 1;
      } else if (!val1 && val2) {
        selections[field.key] = 2;
      } else if (val1 && val2) {
        // Both have values, prefer keep figure (older one)
        selections[field.key] = 1;
      } else {
        // Neither has value, default to keep figure
        selections[field.key] = 1;
      }
    }

    setFieldSelections(selections);
  };

  const handleFieldSelect = (fieldKey: string, selection: 1 | 2) => {
    setFieldSelections(prev => ({
      ...prev,
      [fieldKey]: selection
    }));
  };

  const buildMergedData = (): Partial<MasterFigure> => {
    const merged: any = {};

    for (const field of mergeableFields) {
      const selection = fieldSelections[field.key];
      if (selection === 1) {
        merged[field.key] = keepFigure[field.key];
      } else {
        merged[field.key] = deleteFigure[field.key];
      }
    }

    return merged;
  };

  const handleMerge = async () => {
    const confirmMessage = `Are you sure you want to merge these figures?\n\n` +
      `Keep: ${keepFigure.name} (${new Date(keepFigure.createdAt).toLocaleDateString()})\n` +
      `Delete: ${deleteFigure.name} (${new Date(deleteFigure.createdAt).toLocaleDateString()})\n\n` +
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
        mergedData
      );

      if (result.success) {
        toastManager.success(
          `Successfully merged figures! Updated ${result.updatedUserFigures} user figure(s).`
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
    const val1 = keepFigure[fieldKey];
    const val2 = deleteFigure[fieldKey];

    // Both empty
    if ((!val1 || val1 === '') && (!val2 || val2 === '')) {
      return false;
    }

    // One empty, one has value
    if ((!val1 || val1 === '') !== (!val2 || val2 === '')) {
      return true;
    }

    // Compare values
    return String(val1).toLowerCase() !== String(val2).toLowerCase();
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
                  The <strong>older figure</strong> will be kept and updated with your selected fields.
                  The newer figure will be deleted. Any user collections referencing the deleted figure
                  will be updated with merge metadata.
                </p>
              </div>
            </div>
          </div>

          {/* Figure headers */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                <span className="text-sm font-semibold text-green-900 dark:text-green-200">
                  Figure to Keep (Older)
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {keepFigure.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Created: {new Date(keepFigure.createdAt).toLocaleDateString()}
                {keepFigure.createdByName && ` by ${keepFigure.createdByName}`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Completeness: {DuplicateDetectionService.getCompletenessScore(keepFigure)}/13 fields
              </p>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                <span className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Figure to Delete (Newer)
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {deleteFigure.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Created: {new Date(deleteFigure.createdAt).toLocaleDateString()}
                {deleteFigure.createdByName && ` by ${deleteFigure.createdByName}`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Completeness: {DuplicateDetectionService.getCompletenessScore(deleteFigure)}/13 fields
              </p>
            </div>
          </div>

          {/* Field comparison table */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Field
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Keep (Older)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Delete (Newer)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {mergeableFields.map(field => {
                  const isDifferent = hasValueDifference(field.key);
                  const val1 = getFieldValue(keepFigure, field.key);
                  const val2 = getFieldValue(deleteFigure, field.key);
                  const selection = fieldSelections[field.key];

                  return (
                    <tr
                      key={field.key}
                      className={isDifferent ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {field.label}
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={field.key}
                            checked={selection === 1}
                            onChange={() => handleFieldSelect(field.key, 1)}
                            className="w-4 h-4 text-green-600"
                          />
                          <span className={`text-sm ${val1 === '(empty)' ? 'text-gray-400 italic' : 'text-gray-900 dark:text-white'}`}>
                            {val1}
                          </span>
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={field.key}
                            checked={selection === 2}
                            onChange={() => handleFieldSelect(field.key, 2)}
                            className="w-4 h-4 text-red-600"
                          />
                          <span className={`text-sm ${val2 === '(empty)' ? 'text-gray-400 italic' : 'text-gray-900 dark:text-white'}`}>
                            {val2}
                          </span>
                        </label>
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
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={isMerging}>
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={isMerging}>
            {isMerging ? 'Merging...' : 'Merge Figures'}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { CustomFieldUsageService, type CustomFieldUsage } from '../utils/customFieldUsage';
import { Button } from './ui/button';
import { X, AlertTriangle, Package, Trash2 } from 'lucide-react';

interface CustomFieldUsageDialogProps {
  userId: string;
  fieldId: string;
  fieldName: string;
  username: string;
  onClose: () => void;
  onConfirmDelete: () => void;
}

export function CustomFieldUsageDialog({
  userId,
  fieldId,
  fieldName,
  username,
  onClose,
  onConfirmDelete
}: CustomFieldUsageDialogProps) {
  const [usage, setUsage] = useState<CustomFieldUsage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const usageInfo = CustomFieldUsageService.getFieldUsage(userId, fieldId, fieldName);
    setUsage(usageInfo);
  }, [userId, fieldId, fieldName]);

  const handleDelete = () => {
    if (!usage) return;

    const confirmMessage = usage.count > 0
      ? `Delete custom field "${fieldName}" from user ${username}?\n\n${usage.count} figure(s) will lose this field data.\n\nThis action cannot be undone.`
      : `Delete custom field "${fieldName}" from user ${username}?`;

    if (confirm(confirmMessage)) {
      setIsProcessing(true);

      // Remove field from all figures
      if (usage.count > 0) {
        CustomFieldUsageService.removeFieldFromAllFigures(userId, fieldId);
      }

      // Call the parent's delete handler (which will delete the field definition)
      onConfirmDelete();
    }
  };

  if (!usage) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Delete Custom Field
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Review usage before deletion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isProcessing}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Field Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-200">
                  Field: "{fieldName}"
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                  Owner: {username}
                </p>
              </div>
            </div>
          </div>

          {/* Usage Info */}
          {usage.count > 0 ? (
            <>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-900 dark:text-orange-200">
                      Field is currently in use
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-300 mt-1">
                      This custom field is used by <strong>{usage.count}</strong> figure{usage.count !== 1 ? 's' : ''}. Deleting will remove the field and its data from all figures.
                    </p>
                  </div>
                </div>
              </div>

              {/* Affected Figures */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Affected Figures ({usage.count})
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 max-h-64 overflow-y-auto">
                  <ul className="space-y-3">
                    {usage.figures.slice(0, 20).map((figure, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {figure.name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            Value: {figure.value}
                          </p>
                        </div>
                      </li>
                    ))}
                    {usage.count > 20 && (
                      <li className="text-sm text-gray-500 dark:text-gray-400 italic">
                        ...and {usage.count - 20} more
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-200">
                    Field is not in use
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                    This custom field is not used by any figures. Safe to delete.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* What Will Happen */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              What happens when you delete:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>Custom field definition will be removed from user settings</li>
              {usage.count > 0 && (
                <>
                  <li>Field data will be removed from {usage.count} figure{usage.count !== 1 ? 's' : ''}</li>
                  <li>All values stored in this field will be permanently deleted</li>
                </>
              )}
              <li>This action cannot be undone</li>
              <li>Other figure data will remain unchanged</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleDelete}
            disabled={isProcessing}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isProcessing ? 'Deleting...' : usage.count > 0 ? `Delete Field & Remove from ${usage.count} Figure${usage.count !== 1 ? 's' : ''}` : 'Delete Field'}
          </Button>
        </div>
      </div>
    </div>
  );
}

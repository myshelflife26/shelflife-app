import { useState, useEffect } from 'react';
import { FieldUsageService, type FieldUsage } from '../utils/fieldUsage';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { X, AlertTriangle, ArrowRight, Package, Check } from 'lucide-react';
import type { ActionFigure } from '../types/index';

interface ValueMigrationDialogProps {
  field: keyof ActionFigure;
  fieldLabel: string;
  valueToRemove: string;
  availableValues: string[];
  onClose: () => void;
  onMigrate: (oldValue: string, newValue: string) => void;
}

export function ValueMigrationDialog({
  field,
  fieldLabel,
  valueToRemove,
  availableValues,
  onClose,
  onMigrate
}: ValueMigrationDialogProps) {
  const [usage, setUsage] = useState<FieldUsage | null>(null);
  const [selectedNewValue, setSelectedNewValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const usageInfo = FieldUsageService.getValueUsage(field, valueToRemove);
    setUsage(usageInfo);
  }, [field, valueToRemove]);

  const handleMigrate = () => {
    if (!selectedNewValue) {
      alert('Please select a value to migrate to');
      return;
    }

    if (selectedNewValue === valueToRemove) {
      alert('Cannot migrate to the same value');
      return;
    }

    if (confirm(`Migrate ${usage?.count} figure(s) from "${valueToRemove}" to "${selectedNewValue}"?\n\nThis cannot be undone.`)) {
      setIsProcessing(true);
      onMigrate(valueToRemove, selectedNewValue);
    }
  };

  if (!usage) {
    return null;
  }

  // Filter out the value being removed from available options
  const migrationOptions = availableValues.filter(v => v !== valueToRemove);

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
                Value In Use
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Migrate before deleting
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Warning */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900 dark:text-orange-200">
                  Cannot delete "{valueToRemove}"
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-300 mt-1">
                  This {fieldLabel.toLowerCase()} is currently used by <strong>{usage.count}</strong> figure{usage.count !== 1 ? 's' : ''}.
                </p>
              </div>
            </div>
          </div>

          {/* Affected Figures */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Affected Figures ({usage.count})
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 max-h-48 overflow-y-auto">
              <ul className="space-y-2">
                {usage.figureNames.slice(0, 10).map((name, index) => (
                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                    {name}
                  </li>
                ))}
                {usage.count > 10 && (
                  <li className="text-sm text-gray-500 dark:text-gray-400 italic">
                    ...and {usage.count - 10} more
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Migration Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Migrate to Different Value
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Choose a value to replace "{valueToRemove}" in all affected figures.
            </p>

            {/* Migration Flow Visualization */}
            <div className="flex items-center gap-4 mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex-1">
                <div className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">FROM</div>
                <div className="font-semibold text-gray-900 dark:text-white">"{valueToRemove}"</div>
              </div>
              <ArrowRight className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">TO</div>
                {selectedNewValue ? (
                  <div className="font-semibold text-gray-900 dark:text-white">"{selectedNewValue}"</div>
                ) : (
                  <div className="text-gray-400 italic">Select value...</div>
                )}
              </div>
            </div>

            {/* Value Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select replacement value:
              </label>
              <Select
                value={selectedNewValue}
                onChange={(e) => setSelectedNewValue(e.target.value)}
                disabled={isProcessing}
              >
                <option value="">-- Select a value --</option>
                {migrationOptions.map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              What happens when you migrate:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>All {usage.count} figure(s) will be updated to use the new value</li>
              <li>"{valueToRemove}" will be removed from the options list</li>
              <li>This action cannot be undone</li>
              <li>Figures will maintain all other properties unchanged</li>
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
            onClick={handleMigrate}
            disabled={!selectedNewValue || isProcessing}
          >
            <Check className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processing...' : `Migrate ${usage.count} Figure${usage.count !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

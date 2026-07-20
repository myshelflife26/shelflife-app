import { useState, useEffect } from 'react';
import type { ActionFigure } from '../types/index';
import { Button } from './ui/button';
import { X, Package } from 'lucide-react';
import { Checkbox } from './ui/checkbox';

interface FigureSettings {
  figureId: string;
  isPublic: boolean;
  forSale: boolean;
  forTrade: boolean;
}

interface ConfigureReceivedFiguresModalProps {
  figures: ActionFigure[];
  onConfirm: (settings: FigureSettings[]) => void;
  onCancel: () => void;
}

export function ConfigureReceivedFiguresModal({
  figures,
  onConfirm,
  onCancel
}: ConfigureReceivedFiguresModalProps) {
  const [applyToAll, setApplyToAll] = useState(true);
  const [bulkSettings, setBulkSettings] = useState({
    isPublic: false,
    forSale: false,
    forTrade: false
  });
  const [individualSettings, setIndividualSettings] = useState<Record<string, FigureSettings>>({});

  // Initialize individual settings
  useEffect(() => {
    const initial: Record<string, FigureSettings> = {};
    figures.forEach(fig => {
      initial[fig.id] = {
        figureId: fig.id,
        isPublic: false,
        forSale: false,
        forTrade: false
      };
    });
    setIndividualSettings(initial);
  }, [figures]);

  const handleConfirm = () => {
    if (applyToAll) {
      // Apply bulk settings to all figures
      const settings: FigureSettings[] = figures.map(fig => ({
        figureId: fig.id,
        isPublic: bulkSettings.isPublic,
        forSale: bulkSettings.forSale,
        forTrade: bulkSettings.forTrade
      }));
      onConfirm(settings);
    } else {
      // Use individual settings
      const settings = figures.map(fig => individualSettings[fig.id]);
      onConfirm(settings);
    }
  };

  const updateIndividualSetting = (figureId: string, field: keyof Omit<FigureSettings, 'figureId'>, value: boolean) => {
    setIndividualSettings(prev => ({
      ...prev,
      [figureId]: {
        ...prev[figureId],
        [field]: value
      }
    }));
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Configure Received Figures
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Set visibility and marketplace options for the figures you're receiving
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Apply to All Toggle */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                id="applyToAll"
                checked={applyToAll}
                onCheckedChange={(checked) => setApplyToAll(checked as boolean)}
              />
              <label
                htmlFor="applyToAll"
                className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              >
                Apply same settings to all figures
              </label>
            </div>
          </div>

          {applyToAll ? (
            // Bulk Settings
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Settings for All Figures ({figures.length})
              </h3>
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="bulk-public"
                    checked={bulkSettings.isPublic}
                    onCheckedChange={(checked) => setBulkSettings(prev => ({ ...prev, isPublic: checked as boolean }))}
                  />
                  <label htmlFor="bulk-public" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                    Make Public (visible to other users)
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="bulk-sale"
                    checked={bulkSettings.forSale}
                    onCheckedChange={(checked) => setBulkSettings(prev => ({ ...prev, forSale: checked as boolean }))}
                  />
                  <label htmlFor="bulk-sale" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                    List for Sale
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="bulk-trade"
                    checked={bulkSettings.forTrade}
                    onCheckedChange={(checked) => setBulkSettings(prev => ({ ...prev, forTrade: checked as boolean }))}
                  />
                  <label htmlFor="bulk-trade" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                    List for Trade
                  </label>
                </div>
              </div>
            </div>
          ) : (
            // Individual Settings
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Configure Each Figure
              </h3>
              {figures.map(figure => (
                <div key={figure.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {(figure.images && figure.images.length > 0) || figure.imageUrl ? (
                      <img
                        src={(figure.images && figure.images.length > 0)
                          ? figure.images[figure.mainImageIndex || 0]
                          : figure.imageUrl}
                        alt={figure.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{figure.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {figure.manufacturer} • {figure.condition}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 ml-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`${figure.id}-public`}
                        checked={individualSettings[figure.id]?.isPublic || false}
                        onCheckedChange={(checked) => updateIndividualSetting(figure.id, 'isPublic', checked as boolean)}
                      />
                      <label htmlFor={`${figure.id}-public`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        Make Public
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`${figure.id}-sale`}
                        checked={individualSettings[figure.id]?.forSale || false}
                        onCheckedChange={(checked) => updateIndividualSetting(figure.id, 'forSale', checked as boolean)}
                      />
                      <label htmlFor={`${figure.id}-sale`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        List for Sale
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`${figure.id}-trade`}
                        checked={individualSettings[figure.id]?.forTrade || false}
                        onCheckedChange={(checked) => updateIndividualSetting(figure.id, 'forTrade', checked as boolean)}
                      />
                      <label htmlFor={`${figure.id}-trade`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        List for Trade
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Receipt
          </Button>
        </div>
      </div>
    </div>
  );
}

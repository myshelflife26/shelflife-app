import type { ActionFigure, Accessory, UserAccessory } from '../types/index';
import { AccessoryService } from '../utils/accessoryService';
import { AlertCircle, Package, X } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface MissingAccessoriesReportProps {
  open: boolean;
  onClose: () => void;
  figures: ActionFigure[];
  masterFigures: any[]; // MasterFigure[]
}

interface FigureMissingAccessories {
  figure: ActionFigure;
  missingAccessories: Accessory[];
  completeness: number;
}

export function MissingAccessoriesReport({
  open,
  onClose,
  figures,
  masterFigures
}: MissingAccessoriesReportProps) {
  // Build list of figures with missing accessories
  const figuresWithMissing: FigureMissingAccessories[] = figures
    .filter(f => f.condition !== 'MIB') // Skip MIB figures
    .map(figure => {
      // Find master figure to get accessory list
      const masterFigure = masterFigures.find(mf =>
        mf.name.toLowerCase() === figure.name.toLowerCase() &&
        mf.manufacturer.toLowerCase() === figure.manufacturer.toLowerCase() &&
        (mf.productLine || '').toLowerCase() === (figure.productLine || '').toLowerCase()
      );

      if (!masterFigure || !masterFigure.accessories || masterFigure.accessories.length === 0) {
        return null;
      }

      const missingAccessories = AccessoryService.getMissingAccessories(
        masterFigure.accessories,
        figure.accessories || []
      );

      const completeness = figure.completenessPercentage || 100;

      return {
        figure,
        missingAccessories,
        completeness
      };
    })
    .filter((item): item is FigureMissingAccessories => item !== null && item.missingAccessories.length > 0)
    .sort((a, b) => a.completeness - b.completeness); // Sort by least complete first

  const totalMissing = figuresWithMissing.reduce(
    (sum, item) => sum + item.missingAccessories.length,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Missing Accessories Report
          </DialogTitle>
          <DialogDescription>
            Figures with incomplete accessories - hunt for these to complete your collection!
          </DialogDescription>
        </DialogHeader>

        {figuresWithMissing.length === 0 ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full p-3">
                <Package className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-200 text-lg">
                  All Complete!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  All your loose figures have their accessories tracked and marked as complete.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                    {totalMissing} accessories missing across {figuresWithMissing.length} figures
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Track down these items to complete your collection!
                  </p>
                </div>
              </div>
            </div>

            {/* List of incomplete figures */}
            <div className="space-y-3">
              {figuresWithMissing.map(({ figure, missingAccessories, completeness }) => (
                <div
                  key={figure.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {figure.name}
                      </h4>
                      {figure.version && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {figure.version}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        completeness >= 75
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {completeness}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        complete
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Missing Required Accessories:
                    </p>
                    {missingAccessories.map(accessory => (
                      <div
                        key={accessory.id}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1"
                      >
                        <X className="h-3 w-3 text-red-500" />
                        <span>{accessory.name}</span>
                        {accessory.description && (
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            ({accessory.description})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {figure.completenessNotes && (
                    <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-1.5">
                      <strong>Notes:</strong> {figure.completenessNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

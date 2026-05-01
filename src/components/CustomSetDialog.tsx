import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Plus, X, Check } from 'lucide-react';
import type { ActionFigure } from '../types/index';
import { toastManager } from '../utils/toastManager';

interface CustomSetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSet: (setData: {
    name: string;
    series: string;
    manufacturer?: string;
    releaseYear?: number;
    figureNames: string[];
  }) => void;
  availableFigures: ActionFigure[];
}

export function CustomSetDialog({ isOpen, onClose, onCreateSet, availableFigures }: CustomSetDialogProps) {
  const [name, setName] = useState('');
  const [series, setSeries] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [figureInput, setFigureInput] = useState('');
  const [selectedFigures, setSelectedFigures] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Get figure name suggestions based on input
  const figureSuggestions = figureInput.trim().length > 0
    ? availableFigures
        .filter(f =>
          f.name.toLowerCase().includes(figureInput.toLowerCase()) &&
          !selectedFigures.includes(f.name)
        )
        .slice(0, 10)
    : [];

  const handleAddFigure = (figureName: string) => {
    if (!selectedFigures.includes(figureName)) {
      setSelectedFigures([...selectedFigures, figureName]);
    }
    setFigureInput('');
    setShowSuggestions(false);
  };

  const handleRemoveFigure = (figureName: string) => {
    setSelectedFigures(selectedFigures.filter(f => f !== figureName));
  };

  const handleSubmit = () => {
    // Validation
    if (!name.trim()) {
      toastManager.error('Please enter a set name');
      return;
    }
    if (!series.trim()) {
      toastManager.error('Please enter a series name');
      return;
    }
    if (selectedFigures.length === 0) {
      toastManager.error('Please add at least one figure to the set');
      return;
    }

    onCreateSet({
      name: name.trim(),
      series: series.trim(),
      manufacturer: manufacturer.trim() || undefined,
      releaseYear: releaseYear ? parseInt(releaseYear) : undefined,
      figureNames: selectedFigures,
    });

    // Reset form
    setName('');
    setSeries('');
    setManufacturer('');
    setReleaseYear('');
    setSelectedFigures([]);
    setFigureInput('');
    onClose();
  };

  const handleCancel = () => {
    setName('');
    setSeries('');
    setManufacturer('');
    setReleaseYear('');
    setSelectedFigures([]);
    setFigureInput('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Set</DialogTitle>
          <DialogDescription>
            Create a custom set to track specific figures in your collection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Set Name */}
          <div>
            <Label htmlFor="set-name">Set Name *</Label>
            <Input
              id="set-name"
              placeholder="e.g., My Custom Wave 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Series */}
          <div>
            <Label htmlFor="series">Series *</Label>
            <Input
              id="series"
              placeholder="e.g., Classified, Vintage, Retro"
              value={series}
              onChange={(e) => setSeries(e.target.value)}
            />
          </div>

          {/* Manufacturer */}
          <div>
            <Label htmlFor="manufacturer">Manufacturer (Optional)</Label>
            <Input
              id="manufacturer"
              placeholder="e.g., Hasbro, Mattel"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
            />
          </div>

          {/* Release Year */}
          <div>
            <Label htmlFor="release-year">Release Year (Optional)</Label>
            <Input
              id="release-year"
              type="number"
              placeholder="e.g., 2024"
              value={releaseYear}
              onChange={(e) => setReleaseYear(e.target.value)}
              min="1900"
              max="2100"
            />
          </div>

          {/* Figures */}
          <div>
            <Label htmlFor="figures">Figures in Set * ({selectedFigures.length})</Label>
            <div className="relative">
              <div className="flex gap-2">
                <Input
                  id="figures"
                  placeholder="Type figure name..."
                  value={figureInput}
                  onChange={(e) => {
                    setFigureInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && figureInput.trim()) {
                      e.preventDefault();
                      handleAddFigure(figureInput.trim());
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => figureInput.trim() && handleAddFigure(figureInput.trim())}
                  disabled={!figureInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Figure suggestions dropdown */}
              {showSuggestions && figureSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {figureSuggestions.map((figure) => (
                    <button
                      key={figure.id}
                      type="button"
                      onClick={() => handleAddFigure(figure.name)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{figure.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {figure.manufacturer} • {figure.category}
                        </div>
                      </div>
                      <Check className="h-4 w-4 text-green-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Type to search your collection, or enter custom figure names
            </p>
          </div>

          {/* Selected Figures */}
          {selectedFigures.length > 0 && (
            <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
              <Label>Selected Figures:</Label>
              <div className="space-y-1">
                {selectedFigures.map((figureName) => (
                  <div
                    key={figureName}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100">{figureName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFigure(figureName)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Plus className="h-4 w-4 mr-2" />
              Create Set
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

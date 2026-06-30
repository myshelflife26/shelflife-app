import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ActionFigure, CustomFormula, AppSettings } from '../types/index';
import { SettingsService } from '../utils/settings';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select } from './ui/select';
import { Combobox } from './ui/combobox';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { ImageManager } from './ImageManager';
import { FigureSearchModal } from './FigureSearchModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { AccessoryManager } from './AccessoryManager';
import { FigureSearchService, type FigureSearchResult } from '../utils/figureSearch';
import { MasterFiguresService } from '../utils/masterFigures';
import { AccessoryService } from '../utils/accessoryService';
import type { User } from '../types/user';
import type { UserAccessory } from '../types/index';
import { Search, X, Scan, Tag, Plus, Database, CheckCircle, AlertCircle, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

interface FigureFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (figure: Omit<ActionFigure, 'id'>) => void;
  figure?: ActionFigure;
  currentUser: User;
}

interface DatabaseMatch {
  id: string;
  name: string;
  manufacturer: string;
  productLine?: string;
  year?: number;
  imageUrl?: string;
  confidence: number;
}

export function FigureForm({ open, onClose, onSave, figure, currentUser }: FigureFormProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [masterFigureAccessories, setMasterFigureAccessories] = useState<any[]>([]);
  const [masterFigures, setMasterFigures] = useState<any[]>([]);
  const [figureNames, setFigureNames] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showDatabaseMatches, setShowDatabaseMatches] = useState(false);
  const [databaseMatches, setDatabaseMatches] = useState<DatabaseMatch[]>([]);
  const [searchingDatabase, setSearchingDatabase] = useState(false);
  const [formData, setFormData] = useState<Omit<ActionFigure, 'id'>>({
    name: '',
    franchise: '',
    series: '',
    manufacturer: '',
    category: '',
    condition: 'MIB',
    currentValue: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    location: '',
    notes: '',
    tags: [],
    imageUrl: '',
    size: '',
    productLine: '',
    productLineNumber: '',
    subProductLine: '',
    packaging: '',
    upc: '',
    accessories: [],
    completenessPercentage: 100,
    isComplete: true,
    completenessNotes: '',
    customFormula: {},
    customFields: {},
    images: [],
    mainImageIndex: 0,
    imagePosition: 'center center',
    storagePhoto: '',
    availability: [],
    isPublic: false
  });

  // Debounced search function for real-time database matching
  const debouncedSearch = useCallback(
    debounce(async (searchTerm: string) => {
      if (!searchTerm.trim() || searchTerm.length < 3) {
        setDatabaseMatches([]);
        return;
      }

      setSearchingDatabase(true);
      try {
        const results = await MasterFiguresService.search(searchTerm);
        const matches: DatabaseMatch[] = results.slice(0, 5).map(result => ({
          id: result.id,
          name: result.name,
          manufacturer: result.manufacturer,
          productLine: result.productLine,
          year: result.year,
          imageUrl: result.imageUrl,
          confidence: calculateMatchConfidence(searchTerm, result)
        }));

        setDatabaseMatches(matches);
        if (matches.length > 0 && !showDatabaseMatches) {
          setShowDatabaseMatches(true);
        }
      } catch (error) {
        console.error('Database search failed:', error);
      } finally {
        setSearchingDatabase(false);
      }
    }, 300),
    []
  );

  // Calculate match confidence score
  const calculateMatchConfidence = (searchTerm: string, figure: any): number => {
    const term = searchTerm.toLowerCase();
    const name = figure.name.toLowerCase();

    if (name === term) return 100;
    if (name.startsWith(term)) return 90;
    if (name.includes(term)) return 70;

    const words = term.split(' ');
    const nameWords = name.split(' ');
    const matchingWords = words.filter(word =>
      nameWords.some(nameWord => nameWord.includes(word))
    );

    return Math.round((matchingWords.length / words.length) * 60);
  };

  // Auto-search database when name changes
  useEffect(() => {
    if (formData.name) {
      debouncedSearch(formData.name);
    } else {
      setDatabaseMatches([]);
      setShowDatabaseMatches(false);
    }
  }, [formData.name, debouncedSearch]);

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      const loadedSettings = await SettingsService.getSettings();
      setSettings(loadedSettings);
    };
    loadSettings();
  }, []);

  // Load master figures for autocomplete
  useEffect(() => {
    const loadMasterFigures = async () => {
      try {
        const figures = await MasterFiguresService.getAll();
        setMasterFigures(figures);
        const names = Array.from(new Set(figures.map((f: any) => f.name))).sort();
        setFigureNames(names);
      } catch (error) {
        console.error('Failed to load master figures:', error);
      }
    };
    loadMasterFigures();
  }, []);

  // Load figure data when editing
  useEffect(() => {
    if (figure) {
      const { id, ...rest } = figure;
      setFormData(rest);
    } else {
      // Reset form when adding new
      setFormData({
        name: '',
        franchise: '',
        series: '',
        manufacturer: '',
        category: '',
        condition: 'MIB',
        currentValue: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        location: '',
        notes: '',
        tags: [],
        imageUrl: '',
        size: '',
        productLine: '',
        productLineNumber: '',
        subProductLine: '',
        packaging: '',
        upc: '',
        accessories: [],
        completenessPercentage: 100,
        isComplete: true,
        completenessNotes: '',
        customFormula: {},
        customFields: {},
        images: [],
        mainImageIndex: 0,
        imagePosition: 'center center',
        storagePhoto: '',
        availability: [],
        isPublic: false
      });
      setMasterFigureAccessories([]);
      setDatabaseMatches([]);
      setShowDatabaseMatches(false);
    }
  }, [figure, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Create marketplace listing if availability is set
    const hasAvailability = (formData.availability || []).length > 0;

    // Clean up the form data - remove undefined values that Firebase doesn't like
    const cleanFormData = { ...formData };

    if (hasAvailability) {
      // Build custom build details for custom figures
      let customBuildDetails = undefined;
      if (formData.condition === 'Custom' && formData.customFormula) {
        const parts = Object.entries(formData.customFormula)
          .filter(([_, value]) => value)
          .map(([key, value]) => `${key}: ${value}`);
        if (parts.length > 0) {
          customBuildDetails = parts.join('\n');
        }
      }

      cleanFormData.marketplaceListing = {
        figureId: '', // Will be set by the parent component after save
        forSale: formData.availability?.includes('for-sale') || false,
        forTrade: formData.availability?.includes('for-trade') || false,
        ...(formData.currentValue && { askingPrice: formData.currentValue }),
        ...(formData.notes && { marketplaceDescription: formData.notes }),
        ...(customBuildDetails && { customBuildDetails }),
        listedAt: Date.now()
      };
    } else {
      // Remove marketplace listing if no availability set
      delete cleanFormData.marketplaceListing;
    }

    onSave(cleanFormData);
    onClose();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleImportFromDatabase = async (match: DatabaseMatch) => {
    try {
      const masterFigure = await MasterFiguresService.getById(match.id);
      if (!masterFigure) return;

      // Auto-populate form with master figure data
      const masterAccessories = (masterFigure as any).accessories || [];
      const userAccessories = AccessoryService.initializeUserAccessories(masterAccessories);
      const completeness = AccessoryService.calculateCompleteness(masterAccessories, userAccessories);

      setMasterFigureAccessories(masterAccessories);
      setFormData(prev => ({
        ...prev,
        name: masterFigure.name,
        manufacturer: masterFigure.manufacturer,
        franchise: masterFigure.franchise || prev.franchise,
        series: masterFigure.series || prev.series,
        productLine: masterFigure.productLine || prev.productLine,
        productLineNumber: masterFigure.productLineNumber || prev.productLineNumber,
        subProductLine: masterFigure.subProductLine || prev.subProductLine,
        year: masterFigure.year || prev.year,
        version: masterFigure.version || prev.version,
        size: masterFigure.size || prev.size,
        packaging: masterFigure.packaging || prev.packaging,
        category: masterFigure.category || prev.category,
        upc: masterFigure.upc || prev.upc,
        imageUrl: masterFigure.imageUrl || prev.imageUrl,
        accessories: userAccessories,
        completenessPercentage: completeness,
      }));

      // Hide matches after selection
      setShowDatabaseMatches(false);
      setDatabaseMatches([]);

      // Show success feedback
      console.log('✅ Figure imported from database:', masterFigure.name);
    } catch (error) {
      console.error('Failed to import figure:', error);
    }
  };

  const handleImagesChange = (images: string[], mainImageIndex: number) => {
    setFormData(prev => ({
      ...prev,
      images,
      mainImageIndex
    }));
  };

  // Enhanced database match display
  const DatabaseMatchesSection = () => {
    if (!showDatabaseMatches && databaseMatches.length === 0) return null;

    return (
      <div className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden bg-blue-50 dark:bg-blue-950/50">
        <button
          type="button"
          onClick={() => setShowDatabaseMatches(!showDatabaseMatches)}
          className="w-full px-4 py-3 flex items-center justify-between bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="text-left">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                {databaseMatches.length > 0
                  ? `Found ${databaseMatches.length} matches in database`
                  : searchingDatabase
                    ? 'Searching database...'
                    : 'No matches found'
                }
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Click to {showDatabaseMatches ? 'hide' : 'view'} matches and auto-fill data
              </p>
            </div>
          </div>
          {databaseMatches.length > 0 && (
            showDatabaseMatches ? <ChevronUp className="h-5 w-5 text-blue-600" /> : <ChevronDown className="h-5 w-5 text-blue-600" />
          )}
        </button>

        {showDatabaseMatches && databaseMatches.length > 0 && (
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {databaseMatches.map((match) => (
              <div
                key={match.id}
                onClick={() => handleImportFromDatabase(match)}
                className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-all hover:shadow-sm"
              >
                {match.imageUrl && (
                  <img
                    src={match.imageUrl}
                    alt={match.name}
                    className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-700"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {match.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {match.manufacturer}
                    {match.productLine && ` • ${match.productLine}`}
                    {match.year && ` • ${match.year}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        match.confidence >= 90 ? 'bg-green-500' :
                        match.confidence >= 70 ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {match.confidence}% match
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
                    >
                      Use This
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showDatabaseMatches && databaseMatches.length === 0 && !searchingDatabase && (
          <div className="p-4 text-center">
            <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              No matches found in our database
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSearchModalOpen(true)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Lightbulb className="h-4 w-4 mr-1" />
              Suggest New Figure
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (!settings) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3">Loading...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Helper function to ensure current value is in options list
  const ensureValueInOptions = (options: string[], currentValue?: string): string[] => {
    if (!currentValue || options.includes(currentValue)) {
      return options;
    }
    return [...options, currentValue].sort();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {figure ? 'Edit Figure' : 'Add New Figure'}
          </DialogTitle>
          <DialogDescription>
            {figure ? 'Update the details of your action figure' : 'Add a new action figure to your collection'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Enhanced Name Field with Real-time Database Search */}
          <div className="space-y-2">
            <Label htmlFor="name">Figure Name *</Label>
            <div className="relative">
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter figure name (e.g., Snake Eyes, Luke Skywalker)"
                required
                className={databaseMatches.length > 0 ? "border-blue-300 dark:border-blue-700" : ""}
              />
              {searchingDatabase && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>

          {/* Database Matches Section */}
          <DatabaseMatchesSection />

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setScannerModalOpen(true)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Scan className="h-4 w-4 mr-2" />
              Scan Barcode
            </Button>
            <Button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Search className="h-4 w-4 mr-2" />
              Advanced Search
            </Button>
          </div>

          {/* Rest of the form continues with existing fields... */}
          {/* Basic Information Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Combobox
                name="manufacturer"
                value={formData.manufacturer}
                onChange={(value) => setFormData(prev => ({ ...prev, manufacturer: value }))}
                options={ensureValueInOptions(settings.manufacturerOptions, formData.manufacturer)}
                placeholder="Select or enter manufacturer"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Combobox
                name="category"
                value={formData.category}
                onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                options={ensureValueInOptions(settings.categoryOptions, formData.category)}
                placeholder="Select or enter category"
              />
            </div>
          </div>

          {/* Product Line Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="productLine">Product Line</Label>
              <Combobox
                name="productLine"
                value={formData.productLine}
                onChange={(value) => setFormData(prev => ({ ...prev, productLine: value }))}
                options={ensureValueInOptions(settings.productLineOptions, formData.productLine)}
                placeholder="e.g., Classified Series, Black Series"
              />
            </div>
            <div>
              <Label htmlFor="subProductLine">Sub Product Line</Label>
              <Input
                id="subProductLine"
                name="subProductLine"
                value={formData.subProductLine}
                onChange={handleChange}
                placeholder="e.g., Wave 1, Deluxe"
              />
            </div>
          </div>

          {/* Condition and Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
              >
                {settings.conditionOptions.map(condition => (
                  <option key={condition} value={condition}>
                    {condition}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="currentValue">Current Value ($)</Label>
              <Input
                id="currentValue"
                name="currentValue"
                type="number"
                value={formData.currentValue}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Images */}
          <div>
            <Label>Images</Label>
            <ImageManager
              images={formData.images || []}
              mainImageIndex={formData.mainImageIndex || 0}
              onImagesChange={handleImagesChange}
              onImagePositionChange={(position) => setFormData(prev => ({ ...prev, imagePosition: position }))}
              imagePosition={formData.imagePosition || 'center center'}
              storagePhoto={formData.storagePhoto}
              onStoragePhotoChange={(photo) => setFormData(prev => ({ ...prev, storagePhoto: photo }))}
            />
          </div>

          {/* Accessories (if master figure has accessories defined) */}
          {masterFigureAccessories.length > 0 && (
            <div>
              <Label>Accessories & Completeness</Label>
              <AccessoryManager
                masterAccessories={masterFigureAccessories}
                userAccessories={formData.accessories || []}
                onAccessoriesChange={(accessories) => {
                  const completeness = AccessoryService.calculateCompleteness(
                    masterFigureAccessories,
                    accessories
                  );
                  setFormData(prev => ({
                    ...prev,
                    accessories,
                    completenessPercentage: completeness
                  }));
                }}
              />
            </div>
          )}

          {/* Additional Details */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any additional notes about this figure..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {figure ? 'Update Figure' : 'Add Figure'}
            </Button>
          </DialogFooter>
        </form>

        {/* Figure Search Modal */}
        <FigureSearchModal
          open={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onSelect={(result) => {
            // Handle advanced search result
            setFormData(prev => ({
              ...prev,
              name: result.name,
              manufacturer: result.manufacturer || prev.manufacturer,
              // ... other fields
            }));
            setSearchModalOpen(false);
          }}
          currentUser={currentUser}
        />

        {/* Barcode Scanner Modal */}
        <BarcodeScannerModal
          open={scannerModalOpen}
          onClose={() => setScannerModalOpen(false)}
          onScan={async (barcode: string) => {
            // Handle barcode scan
            setFormData(prev => ({ ...prev, upc: barcode }));

            try {
              const masterFigure = await MasterFiguresService.findByUPC(barcode);
              if (masterFigure) {
                await handleImportFromDatabase({
                  id: masterFigure.id,
                  name: masterFigure.name,
                  manufacturer: masterFigure.manufacturer,
                  productLine: masterFigure.productLine,
                  year: masterFigure.year,
                  imageUrl: masterFigure.imageUrl,
                  confidence: 100
                });
              }
            } catch (error) {
              console.error('Error looking up UPC:', error);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
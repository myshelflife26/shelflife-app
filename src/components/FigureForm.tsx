import { useState, useEffect } from 'react';
import type { ActionFigure, CustomFormula } from '../types/index';
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
import { Search, X, Scan, Tag, Plus } from 'lucide-react';

interface FigureFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (figure: Omit<ActionFigure, 'id'>) => void;
  figure?: ActionFigure;
  currentUser: User;
}

export function FigureForm({ open, onClose, onSave, figure, currentUser }: FigureFormProps) {
  const settings = SettingsService.getSettings();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [masterFigureAccessories, setMasterFigureAccessories] = useState<any[]>([]);
  const [masterFigures, setMasterFigures] = useState<any[]>([]);
  const [figureNames, setFigureNames] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [formData, setFormData] = useState<Omit<ActionFigure, 'id'>>({
    name: '',
    series: '',
    manufacturer: '',
    category: '',
    condition: settings.conditionOptions[0] || 'MIB',
    currentValue: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    location: '',
    notes: '',
    tags: [],
    imageUrl: '',
    size: '',
    productLine: '',
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

  // Helper function to ensure current value is in options list
  const ensureValueInOptions = (options: string[], currentValue?: string): string[] => {
    if (!currentValue || options.includes(currentValue)) {
      return options;
    }
    return [...options, currentValue].sort();
  };

  // Load master figures for autocomplete on custom parts
  useEffect(() => {
    const loadMasterFigures = async () => {
      try {
        const figures = await MasterFiguresService.getAll();
        setMasterFigures(figures);
        // Extract unique figure names for autocomplete
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

  const handleImagesChange = (images: string[], mainImageIndex: number) => {
    setFormData(prev => ({
      ...prev,
      images,
      mainImageIndex
    }));
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !formData.tags?.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), trimmedTag]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleImagePositionChange = (position: string) => {
    setFormData(prev => ({
      ...prev,
      imagePosition: position
    }));
  };

  const handleImportFigure = (result: FigureSearchResult) => {
    // Pre-fill form with search result data
    setFormData(prev => ({
      ...prev,
      name: result.name,
      manufacturer: result.manufacturer || prev.manufacturer,
      year: result.year ? parseInt(result.year, 10) : prev.year,
      productLine: result.productLine || prev.productLine,
      subProductLine: result.subProductLine || prev.subProductLine,
      category: result.category || prev.category,
      currentValue: result.estimatedValue || prev.currentValue,
      images: result.images.length > 0 ? result.images : prev.images,
      condition: result.condition || prev.condition,
    }));

    // Save to community database
    FigureSearchService.saveToDatabase(result, currentUser.id, currentUser.displayName);

    // Close search modal
    setSearchModalOpen(false);

    // Show success message
    console.log('✅ Figure imported from search:', result.name);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    console.log('Scanned barcode:', barcode);

    // Set UPC in form
    setFormData(prev => ({ ...prev, upc: barcode }));

    // Look up figure in master database by UPC
    try {
      const masterFigure = await MasterFiguresService.findByUPC(barcode);

      if (masterFigure) {
        // Found a match! Auto-populate the form
        const masterAccessories = (masterFigure as any).accessories || [];
        const userAccessories = AccessoryService.initializeUserAccessories(masterAccessories);
        const completeness = AccessoryService.calculateCompleteness(masterAccessories, userAccessories);

        setMasterFigureAccessories(masterAccessories);
        setFormData(prev => ({
          ...prev,
          name: masterFigure.name,
          manufacturer: masterFigure.manufacturer,
          series: masterFigure.series || prev.series,
          productLine: masterFigure.productLine || prev.productLine,
          subProductLine: masterFigure.subProductLine || prev.subProductLine,
          year: masterFigure.year || prev.year,
          version: masterFigure.version || prev.version,
          size: masterFigure.size || prev.size,
          packaging: masterFigure.packaging || prev.packaging,
          category: masterFigure.category || prev.category,
          upc: barcode,
          imageUrl: masterFigure.imageUrl || prev.imageUrl,
          accessories: userAccessories,
          completenessPercentage: completeness,
        }));

        console.log('✅ Figure found in database:', masterFigure.name);
        alert(`✅ Found: ${masterFigure.name}\n\nForm has been auto-populated with figure details!`);
      } else {
        // Not found - just set the UPC
        console.log('ℹ️ UPC not found in database. You can add details manually.');
        alert(`Barcode scanned: ${barcode}\n\nThis UPC is not in our database yet. Please fill in the details manually.`);
      }
    } catch (error) {
      console.error('Error looking up UPC:', error);
      alert(`Barcode scanned: ${barcode}\n\nCouldn't check our database. Please fill in details manually.`);
    }
  };

  const handleCustomFormulaChange = (field: keyof CustomFormula, value: string) => {
    setFormData(prev => ({
      ...prev,
      customFormula: {
        ...prev.customFormula,
        [field]: value
      }
    }));
  };

  const handleAccessoriesChange = (accessories: UserAccessory[]) => {
    // Calculate completeness percentage
    const completeness = AccessoryService.calculateCompleteness(
      masterFigureAccessories,
      accessories
    );

    setFormData(prev => ({
      ...prev,
      accessories,
      completenessPercentage: completeness
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{figure ? 'Edit Figure' : 'Add New Figure'}</DialogTitle>
          <DialogDescription>
            {figure ? 'Update the details of your action figure' : 'Add a new action figure to your collection'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search Database Banner - Only show when adding new figures */}
          {!figure && (
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-4 shadow-lg mb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Search className="h-8 w-8 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg">Save Time! Auto-Fill This Form</h3>
                    <p className="text-sm text-blue-100">Search our database or scan a barcode to auto-populate details</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    type="button"
                    onClick={() => setScannerModalOpen(true)}
                    variant="outline"
                    className="bg-white text-purple-600 hover:bg-gray-100 border-white"
                    title="Scan UPC barcode"
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    Scan Barcode
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setSearchModalOpen(true)}
                    variant="outline"
                    className="bg-white text-blue-600 hover:bg-gray-100 border-white"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search Database
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Images */}
            <div className="md:col-span-2 border-b pb-4 mb-2">
              <ImageManager
                images={formData.images || []}
                mainImageIndex={formData.mainImageIndex ?? 0}
                imagePosition={formData.imagePosition}
                onChange={handleImagesChange}
                onPositionChange={handleImagePositionChange}
              />
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Snake Eyes"
                required
              />
            </div>

            {/* Version */}
            <div>
              <Label htmlFor="version">Version</Label>
              <Combobox
                id="version"
                name="version"
                value={formData.version || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, version: value }))}
                options={ensureValueInOptions(settings.versionOptions, formData.version)}
                placeholder="Type or select..."
                emptyMessage="No version found. Type to add new."
              />
            </div>

            {/* Year */}
            <div>
              <Label htmlFor="year">Release Year</Label>
              <Input
                id="year"
                name="year"
                type="number"
                min="1900"
                max="2100"
                value={formData.year || ''}
                onChange={handleChange}
                placeholder="e.g., 1984"
              />
            </div>

            {/* Manufacturer */}
            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Combobox
                id="manufacturer"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={(value) => setFormData(prev => ({ ...prev, manufacturer: value }))}
                options={ensureValueInOptions(settings.manufacturerOptions, formData.manufacturer)}
                placeholder="Type or select manufacturer..."
                emptyMessage="No manufacturer found. Type to add new."
              />
            </div>

            {/* Product Line */}
            <div className="md:col-span-2">
              <Label htmlFor="productLine">Action Figure Product Line</Label>
              <Input
                id="productLine"
                name="productLine"
                value={formData.productLine}
                onChange={handleChange}
                placeholder="e.g., G.I. Joe Classic Collection"
              />
            </div>

            {/* Sub-Product Line */}
            <div className="md:col-span-2">
              <Label htmlFor="subProductLine">Action Figure Sub-Product Line</Label>
              <Input
                id="subProductLine"
                name="subProductLine"
                value={formData.subProductLine}
                onChange={handleChange}
                placeholder="e.g., Original 13"
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
              <Combobox
                id="category"
                name="category"
                value={formData.category}
                onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                options={ensureValueInOptions(settings.categoryOptions, formData.category)}
                placeholder="Type or select category..."
                emptyMessage="No category found. Type to add new."
              />
            </div>

            {/* Condition */}
            <div>
              <Label htmlFor="condition">Condition *</Label>
              <Select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                required
              >
                {ensureValueInOptions(settings.conditionOptions, formData.condition).map((option) => (
                  <option key={option} value={option}>
                    {option === 'MIB' ? 'MIB (Mint in Box)' : option}
                  </option>
                ))}
              </Select>
            </div>

            {/* Custom Formula - only show for Custom condition */}
            {formData.condition === 'Custom' && (
              <>
                <div className="md:col-span-2 border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Custom Figure Parts
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Specify which figure each part came from (searchable)
                  </p>
                </div>

                {/* Head */}
                <div>
                  <Label htmlFor="cf-head">Head</Label>
                  <Combobox
                    id="cf-head"
                    value={formData.customFormula?.head || ''}
                    onChange={(value) => handleCustomFormulaChange('head', value)}
                    options={ensureValueInOptions(figureNames, formData.customFormula?.head)}
                    placeholder="e.g., Duke v2"
                    emptyMessage="No figure found. Type to add new."
                  />
                </div>

                {/* Torso */}
                <div>
                  <Label htmlFor="cf-torso">Torso</Label>
                  <Combobox
                    id="cf-torso"
                    value={formData.customFormula?.torso || ''}
                    onChange={(value) => handleCustomFormulaChange('torso', value)}
                    options={ensureValueInOptions(figureNames, formData.customFormula?.torso)}
                    placeholder="e.g., Snake Eyes v1"
                    emptyMessage="No figure found. Type to add new."
                  />
                </div>

                {/* Waist */}
                <div>
                  <Label htmlFor="cf-waist">Waist</Label>
                  <Combobox
                    id="cf-waist"
                    value={formData.customFormula?.waist || ''}
                    onChange={(value) => handleCustomFormulaChange('waist', value)}
                    options={ensureValueInOptions(figureNames, formData.customFormula?.waist)}
                    placeholder="e.g., Roadblock"
                    emptyMessage="No figure found. Type to add new."
                  />
                </div>

                {/* Right Arm */}
                <div>
                  <Label htmlFor="cf-rightArm">Right Arm</Label>
                  <Combobox
                    id="cf-rightArm"
                    value={formData.customFormula?.rightArm || ''}
                    onChange={(value) => handleCustomFormulaChange('rightArm', value)}
                    options={ensureValueInOptions(figureNames, formData.customFormula?.rightArm)}
                    placeholder="e.g., Gung-Ho"
                    emptyMessage="No figure found. Type to add new."
                  />
                </div>

                {/* Left Arm */}
                <div>
                  <Label htmlFor="cf-leftArm">Left Arm</Label>
                  <Combobox
                    id="cf-leftArm"
                    value={formData.customFormula?.leftArm || ''}
                    onChange={(value) => handleCustomFormulaChange('leftArm', value)}
                    options={ensureValueInOptions(figureNames, formData.customFormula?.leftArm)}
                    placeholder="e.g., Flint"
                    emptyMessage="No figure found. Type to add new."
                  />
                </div>

                {/* Right Leg */}
                <div>
                  <Label htmlFor="cf-rightLeg">Right Leg</Label>
                  <Combobox
                    id="cf-rightLeg"
                    value={formData.customFormula?.rightLeg || ''}
                    onChange={(value) => handleCustomFormulaChange('rightLeg', value)}
                    options={ensureValueInOptions(figureNames, formData.customFormula?.rightLeg)}
                    placeholder="e.g., Stalker"
                    emptyMessage="No figure found. Type to add new."
                  />
                </div>

                {/* Left Leg */}
                <div>
                  <Label htmlFor="cf-leftLeg">Left Leg</Label>
                  <Combobox
                    id="cf-leftLeg"
                    value={formData.customFormula?.leftLeg || ''}
                    onChange={(value) => handleCustomFormulaChange('leftLeg', value)}
                    options={ensureValueInOptions(figureNames, formData.customFormula?.leftLeg)}
                    placeholder="e.g., Heavy Duty"
                    emptyMessage="No figure found. Type to add new."
                  />
                </div>

                {/* Other Notes */}
                <div className="md:col-span-2">
                  <Label htmlFor="cf-other">Other Notes</Label>
                  <Textarea
                    id="cf-other"
                    value={formData.customFormula?.other || ''}
                    onChange={(e) => handleCustomFormulaChange('other', e.target.value)}
                    placeholder="Any additional notes about this custom figure"
                    rows={2}
                  />
                </div>
              </>
            )}

            {/* Current Value */}
            <div>
              <Label htmlFor="currentValue">Current Value ($)</Label>
              <Input
                id="currentValue"
                name="currentValue"
                type="number"
                step="0.01"
                min="0"
                value={formData.currentValue || ''}
                onChange={handleChange}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
              />
            </div>

            {/* Purchase Date */}
            <div>
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                value={formData.purchaseDate}
                onChange={handleChange}
              />
            </div>

            {/* Size */}
            <div>
              <Label htmlFor="size">Size</Label>
              <Select
                id="size"
                name="size"
                value={formData.size}
                onChange={handleChange}
              >
                <option value="">Select size...</option>
                {ensureValueInOptions(settings.sizeOptions, formData.size).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>

            {/* Packaging */}
            <div>
              <Label htmlFor="packaging">Packaging</Label>
              <Select
                id="packaging"
                name="packaging"
                value={formData.packaging}
                onChange={handleChange}
              >
                <option value="">Select packaging...</option>
                {ensureValueInOptions(settings.packagingOptions, formData.packaging).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>

            {/* UPC/Barcode */}
            <div>
              <Label htmlFor="upc">UPC/Barcode</Label>
              <Input
                id="upc"
                name="upc"
                value={formData.upc || ''}
                onChange={handleChange}
                placeholder="e.g., 630509123456"
              />
            </div>

            {/* Availability - Multi-select */}
            <div className="md:col-span-2">
              <Label>Marketplace Availability</Label>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Mark this figure as available for sale or trade in the marketplace
              </p>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="availability-sale"
                    checked={formData.availability?.includes('for-sale') || false}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({
                        ...prev,
                        availability: checked
                          ? [...(prev.availability || []), 'for-sale']
                          : (prev.availability || []).filter(a => a !== 'for-sale')
                      }));
                    }}
                  />
                  <Label htmlFor="availability-sale" className="cursor-pointer font-normal">
                    For Sale
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="availability-trade"
                    checked={formData.availability?.includes('for-trade') || false}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({
                        ...prev,
                        availability: checked
                          ? [...(prev.availability || []), 'for-trade']
                          : (prev.availability || []).filter(a => a !== 'for-trade')
                      }));
                    }}
                  />
                  <Label htmlFor="availability-trade" className="cursor-pointer font-normal">
                    For Trade
                  </Label>
                </div>
              </div>

              {/* Show info if availability is set but figure isn't public */}
              {(formData.availability || []).length > 0 && !formData.isPublic && (
                <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2 text-xs text-yellow-800 dark:text-yellow-200">
                  ⚠️ Make this figure public below to list it in the marketplace
                </div>
              )}
            </div>

            {/* Public/Private Toggle */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                <Checkbox
                  id="isPublic"
                  checked={formData.isPublic || false}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ ...prev, isPublic: checked === true }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="isPublic" className="cursor-pointer font-semibold text-blue-900 dark:text-blue-200">
                    Make this figure public
                  </Label>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Public figures can be viewed by other users in the Browse section. Your name and availability will be visible.
                  </p>
                </div>
              </div>
            </div>

            {/* Accessories tracking - show for Loose and Custom condition */}
            {(formData.condition === 'Loose' || formData.condition === 'Custom') && (
              <div className="md:col-span-2 border-t pt-4">
                <AccessoryManager
                  masterAccessories={masterFigureAccessories}
                  userAccessories={formData.accessories || []}
                  onChange={handleAccessoriesChange}
                  condition={formData.condition}
                  figureId={figure?.id}
                  figureName={formData.name}
                  currentUser={currentUser}
                />
              </div>
            )}

            {/* Additional completeness notes */}
            {(formData.condition === 'Loose' || formData.condition === 'Custom') && (formData.completenessPercentage || 0) < 100 && (
              <div className="md:col-span-2">
                <Label htmlFor="completenessNotes">Additional Notes</Label>
                <Textarea
                  id="completenessNotes"
                  name="completenessNotes"
                  value={formData.completenessNotes}
                  onChange={handleChange}
                  placeholder="Additional details about condition, damage, or missing items..."
                  rows={2}
                />
              </div>
            )}

            {/* Storage Location */}
            <div className="md:col-span-2">
              <Label htmlFor="location">Storage Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Display Cabinet - Top Shelf"
              />
            </div>

            {/* Storage Location/Display Photo */}
            <div className="md:col-span-2">
              <Label htmlFor="storagePhoto">Storage Location/Display Photo</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Upload a photo showing where this figure is stored or displayed (private - not shown in public gallery)
              </p>
              <div className="flex gap-3 items-start">
                {formData.storagePhoto && (
                  <div className="relative w-32 h-32 border-2 border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                    <img
                      src={formData.storagePhoto}
                      alt="Storage location"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, storagePhoto: '' }))}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                      title="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    id="storagePhoto"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData(prev => ({ ...prev, storagePhoto: reader.result as string }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Accepted formats: JPG, PNG, GIF (Max 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional details, condition notes, accessories, etc."
                rows={4}
              />
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Add tags (press Enter)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    variant="outline"
                    size="sm"
                    disabled={!tagInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Custom Fields */}
            {settings.customFields.length > 0 && (
              <>
                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Custom Fields
                  </h3>
                </div>
                {settings.customFields.map((field) => (
                  <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <Label htmlFor={`custom-${field.id}`}>
                      {field.name}
                      {field.required && <span className="text-red-600 ml-1">*</span>}
                    </Label>
                    {field.type === 'text' && (
                      <Input
                        id={`custom-${field.id}`}
                        value={formData.customFields?.[field.id] || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            customFields: { ...prev.customFields, [field.id]: e.target.value }
                          }))
                        }
                        required={field.required}
                      />
                    )}
                    {field.type === 'textarea' && (
                      <Textarea
                        id={`custom-${field.id}`}
                        value={formData.customFields?.[field.id] || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            customFields: { ...prev.customFields, [field.id]: e.target.value }
                          }))
                        }
                        rows={3}
                        required={field.required}
                      />
                    )}
                    {field.type === 'number' && (
                      <Input
                        id={`custom-${field.id}`}
                        type="number"
                        value={formData.customFields?.[field.id] || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            customFields: { ...prev.customFields, [field.id]: parseFloat(e.target.value) || '' }
                          }))
                        }
                        required={field.required}
                      />
                    )}
                    {field.type === 'date' && (
                      <Input
                        id={`custom-${field.id}`}
                        type="date"
                        value={formData.customFields?.[field.id] || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            customFields: { ...prev.customFields, [field.id]: e.target.value }
                          }))
                        }
                        required={field.required}
                      />
                    )}
                    {field.type === 'select' && field.options && (
                      <Select
                        id={`custom-${field.id}`}
                        value={formData.customFields?.[field.id] || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            customFields: { ...prev.customFields, [field.id]: e.target.value }
                          }))
                        }
                        required={field.required}
                      >
                        <option value="">Select {field.name}...</option>
                        {ensureValueInOptions(field.options, String(formData.customFields?.[field.id] || '')).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>
                ))}
              </>
            )}
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
          onSelect={handleImportFigure}
          currentUser={currentUser}
        />

        {/* Barcode Scanner Modal */}
        <BarcodeScannerModal
          open={scannerModalOpen}
          onClose={() => setScannerModalOpen(false)}
          onScan={handleBarcodeScanned}
        />
      </DialogContent>
    </Dialog>
  );
}

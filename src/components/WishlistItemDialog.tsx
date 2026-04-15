import { useState, useEffect, useMemo } from 'react';
import { FirebaseWishlistService } from '../utils/firebaseWishlist';
import { MasterFiguresService } from '../utils/masterFigures';
import type { WishlistItem, WishlistPriority, WishlistStatus } from '../types/wishlist';
import type { User } from '../types/user';
import { X, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toastManager } from '../utils/toastManager';

interface WishlistItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  currentUser: User;
  editingItem?: WishlistItem;
}

export function WishlistItemDialog({
  open,
  onClose,
  onSave,
  currentUser,
  editingItem
}: WishlistItemDialogProps) {
  const [figureName, setFigureName] = useState('');
  const [franchise, setFranchise] = useState('');
  const [series, setSeries] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [version, setVersion] = useState('');
  const [year, setYear] = useState('');
  const [priority, setPriority] = useState<WishlistPriority>('medium');
  const [status, setStatus] = useState<WishlistStatus>('wanted');
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [masterFigures, setMasterFigures] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Load master figures database
  useEffect(() => {
    const loadMasterFigures = async () => {
      try {
        const figures = await MasterFiguresService.getAll();
        setMasterFigures(figures);
      } catch (error) {
        console.error('Failed to load master figures:', error);
      }
    };
    loadMasterFigures();
  }, []);

  useEffect(() => {
    if (editingItem) {
      setFigureName(editingItem.figureName);
      setFranchise(editingItem.franchise || '');
      setSeries(editingItem.series || '');
      setManufacturer(editingItem.manufacturer || '');
      setVersion(editingItem.version || '');
      setYear(editingItem.year?.toString() || '');
      setPriority(editingItem.priority);
      setStatus(editingItem.status);
      setTargetPrice(editingItem.targetPrice?.toString() || '');
      setNotes(editingItem.notes || '');
    } else {
      // Reset form for new item
      setFigureName('');
      setFranchise('');
      setSeries('');
      setManufacturer('');
      setVersion('');
      setYear('');
      setPriority('medium');
      setStatus('wanted');
      setTargetPrice('');
      setNotes('');
      setSearchTerm('');
    }
  }, [editingItem, open]);

  // Filter search results
  const searchResults = useMemo(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) return [];

    const term = searchTerm.toLowerCase();
    return masterFigures
      .filter(fig =>
        fig.name?.toLowerCase().includes(term) ||
        fig.series?.toLowerCase().includes(term) ||
        fig.manufacturer?.toLowerCase().includes(term)
      )
      .slice(0, 10); // Limit to 10 results
  }, [searchTerm, masterFigures]);

  // Get unique options for dropdowns
  const uniqueSeries = useMemo(() => {
    const series = masterFigures
      .map(f => f.series)
      .filter(Boolean);
    return [...new Set(series)].sort();
  }, [masterFigures]);

  const uniqueManufacturers = useMemo(() => {
    const manufacturers = masterFigures
      .map(f => f.manufacturer)
      .filter(Boolean);
    return [...new Set(manufacturers)].sort();
  }, [masterFigures]);

  const handleSelectFigure = (figure: any) => {
    setFigureName(figure.name || '');
    setFranchise(figure.franchise || '');
    setSeries(figure.series || '');
    setManufacturer(figure.manufacturer || '');
    setVersion(figure.version || '');
    setYear(figure.year?.toString() || '');
    setSearchTerm('');
    setShowSearchResults(false);
  };

  const handleSave = async () => {
    if (!figureName.trim()) {
      toastManager.error('Figure name is required');
      return;
    }

    setSaving(true);
    try {
      const itemData = {
        figureName: figureName.trim(),
        franchise: franchise.trim() || undefined,
        series: series.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        version: version.trim() || undefined,
        year: year ? parseInt(year) : undefined,
        priority,
        status,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        notes: notes.trim() || undefined
      };

      if (editingItem) {
        await FirebaseWishlistService.updateItem(editingItem.id, itemData);
        toastManager.success('Wishlist item updated');
      } else {
        await FirebaseWishlistService.addItem(currentUser.id, itemData);
        toastManager.success('Added to wishlist');
      }

      onSave();
    } catch (error) {
      console.error('Failed to save wishlist item:', error);
      toastManager.error('Failed to save wishlist item');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {editingItem ? 'Edit Wishlist Item' : 'Add to Wishlist'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Search for Figure in Database */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Search className="h-4 w-4 inline mr-1" />
              Search Figure Database
            </label>
            <div className="relative">
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Search for a figure to auto-fill fields..."
              />
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((fig, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectFigure(fig)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{fig.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {fig.series && `${fig.series} • `}{fig.manufacturer} {fig.year && `• ${fig.year}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Start typing to search our database and auto-fill fields
            </p>
          </div>

          {/* Figure Name (Required) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Figure Name *
            </label>
            <Input
              value={figureName}
              onChange={(e) => setFigureName(e.target.value)}
              placeholder="Enter figure name"
              required
            />
          </div>

          {/* Franchise/IP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Franchise/IP
            </label>
            <Input
              value={franchise}
              onChange={(e) => setFranchise(e.target.value)}
              placeholder="e.g., G.I. Joe, Star Wars, Masters of the Universe"
            />
          </div>

          {/* Action Figure Product Line and Manufacturer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Action Figure Product Line
              </label>
              <input
                list="series-options"
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                placeholder="Select or type..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <datalist id="series-options">
                {uniqueSeries.map((s, i) => (
                  <option key={i} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Manufacturer
              </label>
              <input
                list="manufacturer-options"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="Select or type..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <datalist id="manufacturer-options">
                {uniqueManufacturers.map((m, i) => (
                  <option key={i} value={m} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Version and Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Version
              </label>
              <Input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g., V1, 25th Anniversary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year
              </label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g., 1984"
              />
            </div>
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WishlistPriority)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WishlistStatus)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="wanted">Actively Seeking</option>
                <option value="watching">Watching Prices</option>
                <option value="considering">Considering</option>
              </select>
            </div>
          </div>

          {/* Target Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Price (Max you're willing to pay)
            </label>
            <Input
              type="number"
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="e.g., 50.00"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this figure..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editingItem ? 'Update' : 'Add to Wishlist'}
          </Button>
        </div>
      </div>
    </div>
  );
}

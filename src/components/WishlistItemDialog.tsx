import { useState, useEffect } from 'react';
import { FirebaseWishlistService } from '../utils/firebaseWishlist';
import type { WishlistItem, WishlistPriority, WishlistStatus } from '../types/wishlist';
import type { User } from '../types/user';
import { X } from 'lucide-react';
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
  const [series, setSeries] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [version, setVersion] = useState('');
  const [year, setYear] = useState('');
  const [priority, setPriority] = useState<WishlistPriority>('medium');
  const [status, setStatus] = useState<WishlistStatus>('wanted');
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFigureName(editingItem.figureName);
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
      setSeries('');
      setManufacturer('');
      setVersion('');
      setYear('');
      setPriority('medium');
      setStatus('wanted');
      setTargetPrice('');
      setNotes('');
    }
  }, [editingItem, open]);

  const handleSave = async () => {
    if (!figureName.trim()) {
      toastManager.error('Figure name is required');
      return;
    }

    setSaving(true);
    try {
      const itemData = {
        figureName: figureName.trim(),
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

          {/* Series and Manufacturer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Series
              </label>
              <Input
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                placeholder="e.g., A Real American Hero"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Manufacturer
              </label>
              <Input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g., Hasbro"
              />
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

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Lightbulb, Check } from 'lucide-react';
import { CommunityDatabaseService } from '../utils/communityDatabase';
import type { User } from '../types/user';

interface SuggestFigureModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: User;
}

export function SuggestFigureModal({ open, onClose, currentUser }: SuggestFigureModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    year: '',
    productLine: '',
    subProductLine: '',
    category: 'Loose',
    imageUrl: '',
    averageValue: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.manufacturer || !formData.year) {
      alert('Please fill in at least Name, Manufacturer, and Year');
      return;
    }

    setSubmitting(true);

    try {
      // Add to community database
      const newFigure = CommunityDatabaseService.add({
        name: formData.name,
        manufacturer: formData.manufacturer,
        year: formData.year,
        productLine: formData.productLine || undefined,
        subProductLine: formData.subProductLine || undefined,
        category: formData.category || undefined,
        images: formData.imageUrl ? [formData.imageUrl] : [],
        averageValue: formData.averageValue ? parseFloat(formData.averageValue) : undefined,
        contributorId: currentUser.id,
        contributorName: currentUser.displayName,
        verified: false, // Needs verification
      });

      console.log('✅ Figure suggested:', newFigure);

      setSuccess(true);

      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          name: '',
          manufacturer: '',
          year: '',
          productLine: '',
          subProductLine: '',
          category: 'Loose',
          imageUrl: '',
          averageValue: '',
        });
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to suggest figure:', error);
      alert('Failed to submit suggestion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Suggest a Figure for the Database
          </DialogTitle>
          <DialogDescription>
            Help build our community database by suggesting figures that others can discover. Your contribution will help fellow collectors!
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Thank You!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your suggestion has been added to the community database.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (Required) */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Figure Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Storm Shadow, Iron Man, Optimus Prime"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Manufacturer (Required) */}
            <div className="space-y-2">
              <Label htmlFor="manufacturer" className="text-sm font-medium">
                Manufacturer <span className="text-red-500">*</span>
              </Label>
              <Input
                id="manufacturer"
                placeholder="e.g., Hasbro, Mattel, McFarlane Toys"
                value={formData.manufacturer}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                required
              />
            </div>

            {/* Year (Required) */}
            <div className="space-y-2">
              <Label htmlFor="year" className="text-sm font-medium">
                Year <span className="text-red-500">*</span>
              </Label>
              <Input
                id="year"
                type="text"
                placeholder="e.g., 1984, 2020"
                value={formData.year}
                onChange={(e) => handleChange('year', e.target.value)}
                required
              />
            </div>

            {/* Product Line (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="productLine" className="text-sm font-medium">
                Product Line (Optional)
              </Label>
              <Input
                id="productLine"
                placeholder="e.g., G.I. Joe: A Real American Hero, Marvel Legends"
                value={formData.productLine}
                onChange={(e) => handleChange('productLine', e.target.value)}
              />
            </div>

            {/* Sub-Product Line (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="subProductLine" className="text-sm font-medium">
                Sub-Product Line (Optional)
              </Label>
              <Input
                id="subProductLine"
                placeholder="e.g., Original 13, Wave 1"
                value={formData.subProductLine}
                onChange={(e) => handleChange('subProductLine', e.target.value)}
              />
            </div>

            {/* Category (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Typical Condition (Optional)
              </Label>
              <select
                id="category"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
              >
                <option value="Loose">Loose</option>
                <option value="MOC">MOC (Mint on Card)</option>
                <option value="MIB">MIB (Mint in Box)</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            {/* Image URL (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-sm font-medium">
                Image URL (Optional)
              </Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => handleChange('imageUrl', e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Direct link to an image of the figure (optional)
              </p>
            </div>

            {/* Average Value (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="averageValue" className="text-sm font-medium">
                Typical Market Value (Optional)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="averageValue"
                  type="number"
                  step="0.01"
                  placeholder="25.00"
                  className="pl-7"
                  value={formData.averageValue}
                  onChange={(e) => handleChange('averageValue', e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Approximate market value in USD
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <p className="font-medium">Your contribution helps everyone!</p>
                  <p className="text-xs">
                    Suggested figures will be added to the community database where other collectors can find and import them. An admin may verify your submission for quality.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting || !formData.name || !formData.manufacturer || !formData.year}
              >
                {submitting ? 'Submitting...' : 'Submit Suggestion'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

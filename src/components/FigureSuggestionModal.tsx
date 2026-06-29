import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Upload, X, AlertCircle } from 'lucide-react';
import { ToyLineSuggestionsService } from '../utils/toyLineSuggestionsService';
import { toastManager } from '../utils/toastManager';
import type { ToyLine, ToyLineSuggestion } from '../types/toyLine';
import type { User } from '../types/user';

interface FigureSuggestionModalProps {
  toyLine: ToyLine;
  currentUser: User;
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

interface SuggestionFormData {
  figureName: string;
  figureNumber: string;
  year: string;
  subLine: string;
  reason: string;
  imageUrl: string;
}

const initialFormData: SuggestionFormData = {
  figureName: '',
  figureNumber: '',
  year: '',
  subLine: '',
  reason: '',
  imageUrl: ''
};

export function FigureSuggestionModal({
  toyLine,
  currentUser,
  open,
  onClose,
  onSubmitted
}: FigureSuggestionModalProps) {
  const [formData, setFormData] = useState<SuggestionFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<SuggestionFormData>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const handleInputChange = (field: keyof SuggestionFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toastManager.error('Image must be smaller than 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toastManager.error('Please select an image file');
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      setFormData(prev => ({ ...prev, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<SuggestionFormData> = {};

    if (!formData.figureName.trim()) {
      newErrors.figureName = 'Figure name is required';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Please explain why this figure belongs in this toy line';
    } else if (formData.reason.trim().length < 10) {
      newErrors.reason = 'Please provide a more detailed explanation (at least 10 characters)';
    }

    if (formData.year && (isNaN(parseInt(formData.year)) || parseInt(formData.year) < 1900 || parseInt(formData.year) > new Date().getFullYear() + 2)) {
      newErrors.year = 'Please enter a valid year';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Check if user already suggested this figure
      const alreadySuggested = await ToyLineSuggestionsService.hasUserSuggestedFigure(
        currentUser.id,
        toyLine.id,
        formData.figureName.trim()
      );

      if (alreadySuggested) {
        toastManager.error('You have already suggested this figure or a similar suggestion is pending');
        return;
      }

      const suggestionData: Partial<ToyLineSuggestion> = {
        toyLineId: toyLine.id,
        figureName: formData.figureName.trim(),
        figureNumber: formData.figureNumber.trim() || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        subLine: formData.subLine.trim() || undefined,
        reason: formData.reason.trim(),
        imageUrl: formData.imageUrl || undefined,
        userId: currentUser.id,
        userName: currentUser.displayName || currentUser.username
      };

      await ToyLineSuggestionsService.submitFigureSuggestion(suggestionData);

      toastManager.success('Figure suggestion submitted successfully! Admins will review it soon.');

      // Reset form
      setFormData(initialFormData);
      setImageFile(null);
      setImagePreview('');
      setErrors({});

      onSubmitted?.();
      onClose();
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      toastManager.error('Failed to submit suggestion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setFormData(initialFormData);
      setImageFile(null);
      setImagePreview('');
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suggest Missing Figure</DialogTitle>
          <DialogDescription>
            Suggest a figure that's missing from <strong>{toyLine.name}</strong>.
            Admins will review your suggestion and add it if appropriate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Figure Name */}
          <div>
            <Label htmlFor="figureName">
              Figure Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="figureName"
              value={formData.figureName}
              onChange={handleInputChange('figureName')}
              placeholder="e.g., Cobra Eel"
              className={errors.figureName ? 'border-red-500' : ''}
            />
            {errors.figureName && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.figureName}
              </p>
            )}
          </div>

          {/* Figure Number */}
          <div>
            <Label htmlFor="figureNumber">Figure Number (optional)</Label>
            <Input
              id="figureNumber"
              value={formData.figureNumber}
              onChange={handleInputChange('figureNumber')}
              placeholder="e.g., #34 or 1234"
            />
          </div>

          {/* Year and Sub-line */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="year">Year (optional)</Label>
              <Input
                id="year"
                value={formData.year}
                onChange={handleInputChange('year')}
                placeholder="2024"
                className={errors.year ? 'border-red-500' : ''}
              />
              {errors.year && (
                <p className="text-red-500 text-xs mt-1">{errors.year}</p>
              )}
            </div>
            <div>
              <Label htmlFor="subLine">Sub-line (optional)</Label>
              <Input
                id="subLine"
                value={formData.subLine}
                onChange={handleInputChange('subLine')}
                placeholder="e.g., Tiger Force"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason">
              Why does this figure belong in {toyLine.name}? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={handleInputChange('reason')}
              placeholder="Explain why this figure should be part of this toy line. Include details like release information, character background, or other relevant context..."
              rows={3}
              className={errors.reason ? 'border-red-500' : ''}
            />
            {errors.reason && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.reason}
              </p>
            )}
          </div>

          {/* Image Upload */}
          <div>
            <Label htmlFor="image">Supporting Image (optional)</Label>
            <div className="mt-1">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-md border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center text-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  >
                    <Upload className="h-8 w-8 mb-2" />
                    <span className="text-sm">Click to upload image</span>
                    <span className="text-xs">PNG, JPG up to 2MB</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.figureName.trim() || !formData.reason.trim()}
              className="flex-1"
            >
              {submitting ? 'Submitting...' : 'Submit Suggestion'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import type { ReportCategory } from '../utils/reporting';

interface ReportReasonDialogProps {
  isOpen: boolean;
  username: string;
  onConfirm: (category: ReportCategory, description?: string) => void;
  onCancel: () => void;
}

const REPORT_CATEGORIES: { value: ReportCategory; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Unwanted promotional content or repetitive posts' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying, threats, or unwanted contact' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Adult content or offensive material' },
  { value: 'fake', label: 'Fake Account', description: 'Impersonation or fraudulent profile' },
  { value: 'other', label: 'Other', description: 'Something else that violates community guidelines' }
];

export function ReportReasonDialog({ isOpen, username, onConfirm, onCancel }: ReportReasonDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | ''>('');
  const [description, setDescription] = useState('');

  const handleConfirm = () => {
    if (!selectedCategory) return;

    onConfirm(selectedCategory, description.trim() || undefined);

    // Reset state
    setSelectedCategory('');
    setDescription('');
  };

  const handleCancel = () => {
    onCancel();

    // Reset state
    setSelectedCategory('');
    setDescription('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {username}</DialogTitle>
          <DialogDescription>
            Help us understand what's wrong. Reports are reviewed by moderators.
            <br />
            <span className="text-xs mt-2 block text-gray-500 dark:text-gray-400">
              You can only report the same user once per 30 days.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Why are you reporting this user? <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {REPORT_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedCategory === cat.value
                      ? 'border-red-500 bg-red-50 dark:bg-red-950'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {cat.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {cat.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Additional details (optional)
            </label>
            <Textarea
              placeholder="Provide more context about this report..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description.length}/500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirm}
              disabled={!selectedCategory}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              Submit Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

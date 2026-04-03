import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';

interface BlockReasonDialogProps {
  isOpen: boolean;
  username: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

const QUICK_REASONS = [
  'Spam',
  'Harassment',
  'Inappropriate Content',
  'Other'
];

export function BlockReasonDialog({ isOpen, username, onConfirm, onCancel }: BlockReasonDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    // Use custom reason if provided, otherwise use selected quick reason
    const finalReason = customReason.trim() || selectedReason || undefined;
    onConfirm(finalReason);

    // Reset state
    setSelectedReason('');
    setCustomReason('');
  };

  const handleSkip = () => {
    onConfirm(undefined);

    // Reset state
    setSelectedReason('');
    setCustomReason('');
  };

  const handleCancel = () => {
    onCancel();

    // Reset state
    setSelectedReason('');
    setCustomReason('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Block {username}?</DialogTitle>
          <DialogDescription>
            They won't be able to see your collection or contact you.
            <br />
            <span className="text-xs mt-2 block text-gray-500 dark:text-gray-400">
              Adding a reason is optional and helps you remember why.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Reason Buttons */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Quick reasons (optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_REASONS.map((reason) => (
                <Button
                  key={reason}
                  variant={selectedReason === reason ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedReason(selectedReason === reason ? '' : reason);
                    setCustomReason(''); // Clear custom if selecting quick reason
                  }}
                  className="text-xs"
                >
                  {reason}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Reason Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Or write your own (optional)
            </label>
            <Textarea
              placeholder="e.g., Repeated unwanted messages"
              value={customReason}
              onChange={(e) => {
                setCustomReason(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedReason(''); // Clear quick reason if typing custom
                }
              }}
              rows={2}
              maxLength={100}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {customReason.length}/100 characters
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
              variant="outline"
              onClick={handleSkip}
            >
              Skip & Block
            </Button>
            <Button
              variant="default"
              onClick={handleConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Block
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

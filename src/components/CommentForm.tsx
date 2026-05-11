import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface CommentFormProps {
  onSubmit: (text: string) => Promise<void>;
  onCancel?: () => void;
  initialText?: string;
  placeholder?: string;
  submitLabel?: string;
  isEditing?: boolean;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  onCancel,
  initialText = '',
  placeholder = 'Add a comment...',
  submitLabel = 'Post Comment',
  isEditing = false,
}) => {
  const [text, setText] = useState(initialText);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MIN_LENGTH = 10;
  const MAX_LENGTH = 1000;

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (text.trim().length < MIN_LENGTH) {
      setError(`Comment must be at least ${MIN_LENGTH} characters`);
      return;
    }

    if (text.trim().length > MAX_LENGTH) {
      setError(`Comment must be less than ${MAX_LENGTH} characters`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText('');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setText(initialText);
    setError(null);
    onCancel?.();
  };

  const remainingChars = MAX_LENGTH - text.length;
  const isValid = text.trim().length >= MIN_LENGTH && text.trim().length <= MAX_LENGTH;

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[100px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                   resize-y"
          disabled={isSubmitting}
        />
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm space-y-1">
          <div className={`${remainingChars < 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
            {remainingChars} characters remaining
          </div>
          {text.length > 0 && text.trim().length < MIN_LENGTH && (
            <div className="text-yellow-600 dark:text-yellow-400">
              {MIN_LENGTH - text.trim().length} more characters needed
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Posting...' : submitLabel}
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-500 dark:text-red-400">
          {error}
        </div>
      )}
    </form>
  );
};

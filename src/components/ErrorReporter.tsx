import React, { useState } from 'react';
import { Bug, Send, X } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { errorHandler } from '../utils/errorHandler';

interface ErrorReporterProps {
  isOpen: boolean;
  onClose: () => void;
  error?: Error;
  context?: string;
}

export function ErrorReporter({ isOpen, onClose, error, context }: ErrorReporterProps) {
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const errorData = {
        error: error?.message,
        stack: error?.stack,
        context,
        description,
        email,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        storedErrors: errorHandler.getStoredErrors().slice(-3), // Last 3 errors for context
      };

      // Create email report
      const subject = encodeURIComponent(
        `ShelfLife Error Report${context ? ` - ${context}` : ''}`
      );

      const body = encodeURIComponent(`
Error Report for ShelfLife

Description from user:
${description}

Contact Email: ${email}

Technical Details:
${JSON.stringify(errorData, null, 2)}
      `.trim());

      // Open email client
      const mailtoLink = `mailto:support@shelflife.app?subject=${subject}&body=${body}`;
      window.open(mailtoLink);

      // Mark as submitted
      setSubmitted(true);

      // Log the report
      errorHandler.logError({
        message: `User reported error: ${description}`,
        type: 'component',
        severity: 'medium',
      });

      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setDescription('');
        setEmail('');
      }, 2000);

    } catch (reportError) {
      console.error('Failed to submit error report:', reportError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSubmitted(false);
    setDescription('');
    setEmail('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bug className="h-5 w-5 mr-2 text-orange-500" />
            Report Error
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-8">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Report Sent!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Thank you for helping us improve ShelfLife.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="description">What happened?</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe what you were doing when the error occurred..."
                rows={4}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">
                Email (optional)
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll only use this to follow up on your report
              </p>
            </div>

            {error && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
                <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Error Details:
                </p>
                <p className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                  {error.message}
                </p>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Report
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ErrorReporter;
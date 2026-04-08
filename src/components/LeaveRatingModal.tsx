import { useState } from 'react';
import type { TradeProposal } from '../types/index';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { X, Star } from 'lucide-react';
import { MarketplaceService } from '../utils/marketplaceService';

interface LeaveRatingModalProps {
  trade: TradeProposal;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onRatingSubmitted?: () => void;
}

export function LeaveRatingModal({
  trade,
  currentUserId,
  currentUserName,
  onClose,
  onRatingSubmitted
}: LeaveRatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const otherUserId = trade.fromUserId === currentUserId ? trade.toUserId : trade.fromUserId;
  const otherUserName = trade.fromUserId === currentUserId ? trade.toUserName : trade.fromUserName;

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a star rating');
      return;
    }

    if (feedback.trim() === '') {
      alert('Please provide feedback');
      return;
    }

    setSubmitting(true);
    try {
      const success = await MarketplaceService.leaveRating(
        trade.id!,
        currentUserId,
        currentUserName,
        otherUserId,
        rating,
        feedback
      );

      if (success) {
        alert('Rating submitted successfully!');
        if (onRatingSubmitted) onRatingSubmitted();
        onClose();
      } else {
        alert('Failed to submit rating');
      }
    } catch (error) {
      console.error('Failed to submit rating:', error);
      alert('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Rate Your Experience
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              How was your trade with {otherUserName}?
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Star Rating */}
          <div>
            <Label className="block mb-3 text-center">Rate this trader</Label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {rating === 1 && '😞 Poor'}
                {rating === 2 && '😐 Fair'}
                {rating === 3 && '🙂 Good'}
                {rating === 4 && '😊 Very Good'}
                {rating === 5 && '🌟 Excellent'}
              </p>
            )}
          </div>

          {/* Feedback */}
          <div>
            <Label htmlFor="feedback">Your Feedback *</Label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
              placeholder="Describe your experience with this trader. Was communication good? Did items arrive as described? Would you trade with them again?"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {feedback.length}/500 characters
            </p>
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-gray-700 dark:text-gray-300">
              <strong>Rating Guidelines:</strong> Be honest and fair. Focus on communication, packaging, shipping speed, and item condition. Avoid personal attacks or off-topic comments.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { User } from '../types/user';
import { Share2, Copy, Check, Download, Facebook, Twitter, Link as LinkIcon } from 'lucide-react';
import { Button } from './ui/button';
import { toastManager } from '../utils/toastManager';

interface ShareCollectionDialogProps {
  open: boolean;
  onClose: () => void;
  currentUser: User;
  collectionStats: {
    totalFigures: number;
    totalValue: number;
    topManufacturer?: string;
  };
}

export function ShareCollectionDialog({
  open,
  onClose,
  currentUser,
  collectionStats
}: ShareCollectionDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  // Generate shareable URL - points to public profile page
  const shareUrl = `${window.location.origin}/profile/${currentUser.username}`;

  // Generate share text
  const shareText = `Check out my action figure collection on ShelfLife! ${collectionStats.totalFigures} figures worth $${collectionStats.totalValue.toFixed(0)}.`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toastManager.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toastManager.error('Failed to copy link');
    }
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleDownloadImage = () => {
    // This would generate a shareable image card
    toastManager.info('Image export coming soon!');
    // TODO: Implement canvas-based image generation
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Share2 className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Share Collection
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Collection Preview */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                {currentUser.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{currentUser.displayName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">@{currentUser.username}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{collectionStats.totalFigures}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Figures</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${collectionStats.totalValue.toFixed(0)}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Value</p>
              </div>
            </div>
          </div>

          {/* Shareable Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Shareable Link
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-white truncate">
                {shareUrl}
              </div>
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="flex-shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Share this link to show your public collection
            </p>
          </div>

          {/* Share Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Share To
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleShareFacebook}
                variant="outline"
                className="w-full"
              >
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </Button>
              <Button
                onClick={handleShareTwitter}
                variant="outline"
                className="w-full"
              >
                <Twitter className="h-4 w-4 mr-2" />
                Twitter
              </Button>
            </div>
          </div>

          {/* Export Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Export
            </label>
            <Button
              onClick={handleDownloadImage}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Share Card (Coming Soon)
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Generate a shareable image card of your collection
            </p>
          </div>

          {/* Privacy Note / Warning */}
          {collectionStats.totalFigures === 0 ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-xs text-red-800 dark:text-red-200">
                <strong>No Public Figures:</strong> You don't have any figures marked as "Public" yet.
                Visitors won't see any figures when they view this link. Go to your collection, select figures,
                and click "Make Public" to share them.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Privacy:</strong> Only figures marked as "Public" will be visible to others.
                Currently sharing {collectionStats.totalFigures} public figure{collectionStats.totalFigures !== 1 ? 's' : ''}.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

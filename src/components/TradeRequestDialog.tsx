import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import type { ActionFigure } from '../types/index';
import type { User } from '../types/user';
import { FirebaseStorage } from '../utils/firebaseStorage';
import { MarketplaceService } from '../utils/marketplaceService';
import { toastManager } from '../utils/toastManager';
import { Package, DollarSign, X, Plus } from 'lucide-react';

interface TradeRequestDialogProps {
  open: boolean;
  onClose: () => void;
  requestedFigure: ActionFigure & { ownerName: string; ownerUsername: string; ownerDisplayName: string; userId: string };
  currentUser: User;
  mode: 'trade' | 'sale';
}

export function TradeRequestDialog({ open, onClose, requestedFigure, currentUser, mode }: TradeRequestDialogProps) {
  const [myFigures, setMyFigures] = useState<ActionFigure[]>([]);
  const [selectedFigureIds, setSelectedFigureIds] = useState<Set<string>>(new Set());
  const [offeredCash, setOfferedCash] = useState<number>(0);
  const [requestedCash, setRequestedCash] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load user's figures (including private ones)
  useEffect(() => {
    const loadMyFigures = async () => {
      setLoading(true);
      try {
        const figures = await FirebaseStorage.getFigures(currentUser.id);
        // Sort by name
        figures.sort((a, b) => a.name.localeCompare(b.name));
        setMyFigures(figures);
      } catch (error) {
        console.error('Failed to load figures:', error);
        toastManager.error('Failed to load your collection');
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadMyFigures();
      // Reset form
      setSelectedFigureIds(new Set());
      setOfferedCash(0);
      setRequestedCash(0);
      setMessage(mode === 'trade'
        ? `Hi! I'm interested in trading for your ${requestedFigure.name}.`
        : `Hi! I'm interested in purchasing your ${requestedFigure.name}.`
      );
    }
  }, [open, currentUser.id, requestedFigure, mode]);

  const handleToggleFigure = (figureId: string) => {
    const newSet = new Set(selectedFigureIds);
    if (newSet.has(figureId)) {
      newSet.delete(figureId);
    } else {
      newSet.add(figureId);
    }
    setSelectedFigureIds(newSet);
  };

  const handleSubmit = async () => {
    // Validation
    if (mode === 'trade' && selectedFigureIds.size === 0 && offeredCash === 0) {
      toastManager.warning('Please select at least one figure or offer cash');
      return;
    }

    if (mode === 'sale' && offeredCash === 0) {
      toastManager.warning('Please enter an offer amount');
      return;
    }

    setSubmitting(true);
    try {
      const result = await MarketplaceService.createTradeProposal(
        currentUser.id,
        currentUser.displayName,
        requestedFigure.userId,
        requestedFigure.ownerDisplayName,
        Array.from(selectedFigureIds),
        [requestedFigure.id],
        offeredCash,
        requestedCash
      );

      if (result) {
        toastManager.success(mode === 'trade' ? 'Trade request sent!' : 'Offer sent!');
        onClose();
      } else {
        toastManager.error('Failed to send request');
      }
    } catch (error) {
      console.error('Failed to create trade proposal:', error);
      toastManager.error('Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedFigures = myFigures.filter(f => selectedFigureIds.has(f.id));
  const totalOfferedValue = selectedFigures.reduce((sum, f) => sum + f.currentValue, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'trade' ? 'Request Trade' : 'Make Offer'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'trade'
              ? `Propose a trade with ${requestedFigure.ownerName}`
              : `Make a purchase offer to ${requestedFigure.ownerName}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* What They're Offering */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">They Offer:</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {requestedFigure.images && requestedFigure.images.length > 0 ? (
                  <img
                    src={requestedFigure.images[requestedFigure.mainImageIndex ?? 0]}
                    alt={requestedFigure.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{requestedFigure.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{requestedFigure.manufacturer} • {requestedFigure.condition}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">Value: ${requestedFigure.currentValue.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* What You're Offering */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">You Offer:</h3>

            {mode === 'trade' && (
              <>
                {/* Figure Selection */}
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">Loading your collection...</p>
                  </div>
                ) : myFigures.length === 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">You don't have any figures in your collection yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    {myFigures.map((figure) => (
                      <label
                        key={figure.id}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          selectedFigureIds.has(figure.id) ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'border border-transparent'
                        }`}
                      >
                        <Checkbox
                          checked={selectedFigureIds.has(figure.id)}
                          onCheckedChange={() => handleToggleFigure(figure.id)}
                        />
                        {figure.images && figure.images.length > 0 ? (
                          <img
                            src={figure.images[figure.mainImageIndex ?? 0]}
                            alt={figure.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{figure.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {figure.manufacturer} • ${figure.currentValue.toFixed(2)}
                            {!figure.isPublic && <span className="ml-2 text-gray-500">(Private)</span>}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Selected Figures Summary */}
                {selectedFigureIds.size > 0 && (
                  <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedFigureIds.size} figure{selectedFigureIds.size !== 1 ? 's' : ''} selected
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total value: ${totalOfferedValue.toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Cash Offer (Optional for trade) */}
                <div className="mt-3">
                  <Label htmlFor="offeredCash">+ Cash (Optional)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="offeredCash"
                      type="number"
                      min="0"
                      step="0.01"
                      value={offeredCash}
                      onChange={(e) => setOfferedCash(parseFloat(e.target.value) || 0)}
                      className="pl-9"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </>
            )}

            {mode === 'sale' && (
              <>
                {/* Cash Offer (Required for sale) */}
                <div>
                  <Label htmlFor="offeredCash">Your Offer *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="offeredCash"
                      type="number"
                      min="0"
                      step="0.01"
                      value={offeredCash}
                      onChange={(e) => setOfferedCash(parseFloat(e.target.value) || 0)}
                      className="pl-9"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Owner's asking price: ${requestedFigure.marketplaceListing?.askingPrice?.toFixed(2) || requestedFigure.currentValue.toFixed(2)}
                  </p>
                </div>
              </>
            )}

            {/* Cash Request (Optional) */}
            {mode === 'trade' && (
              <div className="mt-3">
                <Label htmlFor="requestedCash">+ Cash from them (Optional)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="requestedCash"
                    type="number"
                    min="0"
                    step="0.01"
                    value={requestedCash}
                    onChange={(e) => setRequestedCash(parseFloat(e.target.value) || 0)}
                    className="pl-9"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Request cash to balance the trade if needed
                </p>
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message">Message (Optional)</Label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
              placeholder="Add a message to your request..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Sending...' : mode === 'trade' ? 'Send Trade Request' : 'Send Offer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

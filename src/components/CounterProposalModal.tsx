import { useState, useEffect } from 'react';
import type { ActionFigure, TradeProposal } from '../types/index';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, Search, DollarSign, Check, Repeat } from 'lucide-react';
import { FirebaseStorage } from '../utils/firebaseStorage';
import { MarketplaceService } from '../utils/marketplaceService';

interface CounterProposalModalProps {
  trade: TradeProposal;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onCounterCreated?: () => void;
}

export function CounterProposalModal({
  trade,
  currentUserId,
  currentUserName,
  onClose,
  onCounterCreated
}: CounterProposalModalProps) {
  // User's figures (left side)
  const [myFigures, setMyFigures] = useState<ActionFigure[]>([]);
  const [mySearch, setMySearch] = useState('');
  const [mySelectedFigures, setMySelectedFigures] = useState<Set<string>>(new Set());

  // Other user's figures (right side)
  const [theirFigures, setTheirFigures] = useState<ActionFigure[]>([]);
  const [theirSearch, setTheirSearch] = useState('');
  const [theirSelectedFigures, setTheirSelectedFigures] = useState<Set<string>>(new Set());

  // Money
  const [myMoneyAmount, setMyMoneyAmount] = useState('');
  const [theirMoneyAmount, setTheirMoneyAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');

  // Loading
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isRecipient = trade.toUserId === currentUserId;
  const otherUserId = isRecipient ? trade.fromUserId : trade.toUserId;
  const otherUserName = isRecipient ? trade.fromUserName : trade.toUserName;

  // Check counter limit
  const currentCounterCount = trade.counterCount || 0;
  const isLastCounter = currentCounterCount === 2; // This will be the 3rd counter (last one)

  // Load figures and set initial selections based on current trade
  useEffect(() => {
    const loadFigures = async () => {
      try {
        // Load my figures
        const myFigs = await FirebaseStorage.getFigures(currentUserId);
        setMyFigures(myFigs);

        // Load their public figures
        const theirFigs = await FirebaseStorage.getPublicFiguresForUser(otherUserId);
        setTheirFigures(theirFigs);

        // Pre-select current trade figures
        if (isRecipient) {
          // I'm the recipient, so what they offered is what I want, what they requested is what I offer
          setTheirSelectedFigures(new Set(trade.offeredFigureIds));
          setMySelectedFigures(new Set(trade.requestedFigureIds));
          setTheirMoneyAmount(trade.offeredCash > 0 ? trade.offeredCash.toString() : '');
          setMyMoneyAmount(trade.requestedCash > 0 ? trade.requestedCash.toString() : '');
        } else {
          // I'm the sender, perspective stays the same
          setMySelectedFigures(new Set(trade.offeredFigureIds));
          setTheirSelectedFigures(new Set(trade.requestedFigureIds));
          setMyMoneyAmount(trade.offeredCash > 0 ? trade.offeredCash.toString() : '');
          setTheirMoneyAmount(trade.requestedCash > 0 ? trade.requestedCash.toString() : '');
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to load figures:', error);
        setLoading(false);
      }
    };
    loadFigures();
  }, [currentUserId, otherUserId, trade, isRecipient]);

  // Filter figures
  const filteredMyFigures = myFigures.filter(fig =>
    fig.name.toLowerCase().includes(mySearch.toLowerCase()) ||
    fig.manufacturer.toLowerCase().includes(mySearch.toLowerCase())
  );

  const filteredTheirFigures = theirFigures.filter(fig =>
    fig.name.toLowerCase().includes(theirSearch.toLowerCase()) ||
    fig.manufacturer.toLowerCase().includes(theirSearch.toLowerCase())
  );

  // Toggle figure selection
  const toggleMyFigure = (figureId: string) => {
    const newSet = new Set(mySelectedFigures);
    if (newSet.has(figureId)) {
      newSet.delete(figureId);
    } else {
      newSet.add(figureId);
    }
    setMySelectedFigures(newSet);
  };

  const toggleTheirFigure = (figureId: string) => {
    const newSet = new Set(theirSelectedFigures);
    if (newSet.has(figureId)) {
      newSet.delete(figureId);
    } else {
      newSet.add(figureId);
    }
    setTheirSelectedFigures(newSet);
  };

  // Submit counter-proposal
  const handleSubmit = async () => {
    if (mySelectedFigures.size === 0 && !myMoneyAmount) {
      alert('Please select at least one figure or offer money');
      return;
    }
    if (theirSelectedFigures.size === 0 && !theirMoneyAmount) {
      alert('Please select at least one of their figures or request money');
      return;
    }

    setSubmitting(true);
    try {
      const success = await MarketplaceService.counterTradeProposal(
        trade.id!,
        currentUserId,
        currentUserName,
        Array.from(mySelectedFigures),
        Array.from(theirSelectedFigures),
        parseFloat(myMoneyAmount) || 0,
        parseFloat(theirMoneyAmount) || 0,
        counterMessage || undefined
      );

      if (success) {
        alert('Counter-proposal sent!');
        if (onCounterCreated) onCounterCreated();
        onClose();
      } else {
        alert('Failed to send counter-proposal');
      }
    } catch (error) {
      console.error('Failed to counter trade:', error);
      alert('Failed to send counter-proposal');
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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Repeat className="h-6 w-6" />
              Counter Proposal to {otherUserName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Modify the trade terms and send back
            </p>
            {isLastCounter && (
              <div className="mt-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded px-3 py-2">
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                  ⚠️ Final Counter - This is your last chance to negotiate!
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Loading figures...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* LEFT SIDE - My Figures */}
              <div className="border-r border-gray-200 dark:border-gray-700 pr-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  I Offer
                </h3>

                {/* Selected Summary */}
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Selected: {mySelectedFigures.size} figure(s)
                    {parseFloat(myMoneyAmount) > 0 && ` + $${parseFloat(myMoneyAmount).toFixed(2)}`}
                  </p>
                  <Label htmlFor="myMoney" className="text-xs">Add Money</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="myMoney"
                      type="number"
                      placeholder="0.00"
                      value={myMoneyAmount}
                      onChange={(e) => setMyMoneyAmount(e.target.value)}
                      className="pl-8 h-8"
                    />
                  </div>
                </div>

                {/* Search */}
                <div className="mb-3 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search my figures..."
                    value={mySearch}
                    onChange={(e) => setMySearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Figure list */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredMyFigures.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No figures found
                    </p>
                  ) : (
                    filteredMyFigures.map(figure => (
                      <div
                        key={figure.id}
                        onClick={() => toggleMyFigure(figure.id)}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                          mySelectedFigures.has(figure.id)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          mySelectedFigures.has(figure.id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {mySelectedFigures.has(figure.id) && <Check className="h-3 w-3 text-white" />}
                        </div>
                        {((figure.images && figure.images.length > 0) || figure.imageUrl) && (
                          <img
                            src={(figure.images && figure.images.length > 0)
                              ? figure.images[figure.mainImageIndex || 0]
                              : figure.imageUrl}
                            alt={figure.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {figure.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ${figure.currentValue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RIGHT SIDE - Their Figures */}
              <div className="pl-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  I Want
                </h3>

                {/* Selected Summary */}
                <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Selected: {theirSelectedFigures.size} figure(s)
                    {parseFloat(theirMoneyAmount) > 0 && ` + $${parseFloat(theirMoneyAmount).toFixed(2)}`}
                  </p>
                  <Label htmlFor="theirMoney" className="text-xs">Request Money</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="theirMoney"
                      type="number"
                      placeholder="0.00"
                      value={theirMoneyAmount}
                      onChange={(e) => setTheirMoneyAmount(e.target.value)}
                      className="pl-8 h-8"
                    />
                  </div>
                </div>

                {/* Search */}
                <div className="mb-3 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search their figures..."
                    value={theirSearch}
                    onChange={(e) => setTheirSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Figure list */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredTheirFigures.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No figures found
                    </p>
                  ) : (
                    filteredTheirFigures.map(figure => (
                      <div
                        key={figure.id}
                        onClick={() => toggleTheirFigure(figure.id)}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                          theirSelectedFigures.has(figure.id)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          theirSelectedFigures.has(figure.id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {theirSelectedFigures.has(figure.id) && <Check className="h-3 w-3 text-white" />}
                        </div>
                        {((figure.images && figure.images.length > 0) || figure.imageUrl) && (
                          <img
                            src={(figure.images && figure.images.length > 0)
                              ? figure.images[figure.mainImageIndex || 0]
                              : figure.imageUrl}
                            alt={figure.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {figure.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ${figure.currentValue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Message */}
          <div className="mt-4">
            <Label htmlFor="message">Message (Optional)</Label>
            <textarea
              id="message"
              value={counterMessage}
              onChange={(e) => setCounterMessage(e.target.value)}
              rows={2}
              className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
              placeholder="Add a message explaining your counter-proposal..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Offering: {mySelectedFigures.size} figure(s)
            {myMoneyAmount && ` + $${parseFloat(myMoneyAmount).toFixed(2)}`}
            {' '}for{' '}
            {theirSelectedFigures.size} figure(s)
            {theirMoneyAmount && ` + $${parseFloat(theirMoneyAmount).toFixed(2)}`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              <Repeat className="h-4 w-4 mr-2" />
              {submitting ? 'Sending...' : 'Send Counter-Proposal'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

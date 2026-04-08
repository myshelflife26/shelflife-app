import { useState, useEffect } from 'react';
import type { TradeProposal, ActionFigure, FigureSettings } from '../types/index';
import { Button } from './ui/button';
import { X, CheckCircle, XCircle, Repeat, Package, Clock } from 'lucide-react';
import { FirebaseStorage } from '../utils/firebaseStorage';
import { MarketplaceService } from '../utils/marketplaceService';
import { ConfigureReceivedFiguresModal } from './ConfigureReceivedFiguresModal';

interface TradeDetailModalProps {
  trade: TradeProposal;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onCounter?: () => void;
  onUpdate?: () => void;
}

export function TradeDetailModal({
  trade,
  currentUserId,
  currentUserName,
  onClose,
  onAccept,
  onDecline,
  onCounter,
  onUpdate
}: TradeDetailModalProps) {
  const [offeredFigures, setOfferedFigures] = useState<ActionFigure[]>([]);
  const [requestedFigures, setRequestedFigures] = useState<ActionFigure[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [hasConfirmedReceipt, setHasConfirmedReceipt] = useState(false);

  const isRecipient = trade.toUserId === currentUserId;
  const isSender = trade.fromUserId === currentUserId;

  // Determine whose turn it is
  const counterCount = trade.counterCount || 0;
  const lastCounteredBy = trade.lastCounteredBy;
  const isMyTurn = trade.status === 'pending'
    ? isRecipient // Initial proposal - recipient's turn
    : trade.status === 'countered'
      ? lastCounteredBy !== currentUserId // Counter - other person's turn
      : false; // Accepted/declined/etc - nobody's turn

  const counterLimitReached = counterCount >= 3;

  useEffect(() => {
    loadFigures();
    // Check if user has already confirmed receipt
    if (isRecipient && trade.toUserShippingStatus === 'received') {
      setHasConfirmedReceipt(true);
    } else if (isSender && trade.fromUserShippingStatus === 'received') {
      setHasConfirmedReceipt(true);
    }
  }, [trade]);

  const loadFigures = async () => {
    try {
      // Load offered figures
      const offeredFigs = await Promise.all(
        trade.offeredFigureIds.map(async (id) => {
          const fig = await FirebaseStorage.getFigure(id, trade.fromUserId);
          return fig;
        })
      );
      setOfferedFigures(offeredFigs.filter(f => f !== null) as ActionFigure[]);

      // Load requested figures
      const requestedFigs = await Promise.all(
        trade.requestedFigureIds.map(async (id) => {
          const fig = await FirebaseStorage.getFigure(id, trade.toUserId);
          return fig;
        })
      );
      setRequestedFigures(requestedFigs.filter(f => f !== null) as ActionFigure[]);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load figures:', error);
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!trade.id) return;
    setProcessing(true);
    try {
      await MarketplaceService.acceptTradeProposal(trade.id, currentUserId);
      alert('Trade accepted! Please coordinate shipping with the other party.');
      if (onAccept) onAccept();
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to accept trade:', error);
      alert('Failed to accept trade');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!trade.id) return;

    const reason = prompt('Please provide a reason for declining this trade:');

    // User must provide a reason (not null/cancelled and not empty)
    if (reason === null) return; // User cancelled
    if (reason.trim() === '') {
      alert('You must provide a reason for declining the trade.');
      return;
    }

    setProcessing(true);
    try {
      await MarketplaceService.declineTradeProposal(trade.id, currentUserId, currentUserName, reason);
      alert('Trade declined');
      if (onDecline) onDecline();
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to decline trade:', error);
      alert('Failed to decline trade');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!trade.id) return;
    if (!confirm('Are you sure you want to cancel this trade?')) return;

    setProcessing(true);
    try {
      await MarketplaceService.cancelTradeProposal(trade.id);
      alert('Trade cancelled');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to cancel trade:', error);
      alert('Failed to cancel trade');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmReceived = () => {
    // Mark as confirmed immediately to prevent double-clicks
    setHasConfirmedReceipt(true);
    // Show configure modal to set figure settings
    setShowConfigureModal(true);
  };

  const handleConfigureComplete = async (settings: FigureSettings[]) => {
    if (!trade.id) return;

    setShowConfigureModal(false);
    setProcessing(true);

    try {
      await MarketplaceService.updateShippingStatus(trade.id, currentUserId, 'received', settings);
      alert('Receipt confirmed! The trade will be marked as completed once both parties confirm.');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to confirm receipt:', error);
      alert('Failed to confirm receipt');
    } finally {
      setProcessing(false);
    }
  };

  // Get the figures the current user is receiving
  const figuresReceiving = isRecipient ? offeredFigures : requestedFigures;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Trade Proposal Details
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isRecipient ? `From: ${trade.fromUserName}` : `To: ${trade.toUserName}`}
            </p>
            {isMyTurn && (trade.status === 'pending' || trade.status === 'countered') && (
              <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded px-3 py-1">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Your turn to respond
                </p>
              </div>
            )}
            {!isMyTurn && (trade.status === 'pending' || trade.status === 'countered') && (
              <div className="mt-2 inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-1">
                <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Waiting for {isRecipient ? trade.fromUserName : trade.toUserName} to respond
                </p>
              </div>
            )}
            {counterCount > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Counter {counterCount}/3 {counterLimitReached && '(Max reached)'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded text-sm font-semibold ${
              trade.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
              trade.status === 'countered' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
              trade.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
              trade.status === 'declined' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
              'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
            }`}>
              {trade.status.toUpperCase()}
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Loading trade details...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side - Offered */}
              <div className="border-r border-gray-200 dark:border-gray-700 pr-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {isSender ? 'You Offer' : 'They Offer'}
                </h3>

                {/* Figures */}
                {offeredFigures.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Figures ({offeredFigures.length})
                    </h4>
                    <div className="space-y-2">
                      {offeredFigures.map(figure => (
                        <div key={figure.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          {figure.images && figure.images.length > 0 && (
                            <img
                              src={figure.images[figure.mainImageIndex || 0]}
                              alt={figure.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {figure.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              ${figure.currentValue.toFixed(2)} • {figure.condition}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Money */}
                {trade.offeredCash > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Cash: ${trade.offeredCash.toFixed(2)}
                    </p>
                    {trade.messages && trade.messages.length > 0 && trade.messages[0].message.includes('Payment method:') && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {trade.messages[0].message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Side - Requested */}
              <div className="pl-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {isSender ? 'You Want' : 'They Want'}
                </h3>

                {/* Figures */}
                {requestedFigures.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Figures ({requestedFigures.length})
                    </h4>
                    <div className="space-y-2">
                      {requestedFigures.map(figure => (
                        <div key={figure.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          {figure.images && figure.images.length > 0 && (
                            <img
                              src={figure.images[figure.mainImageIndex || 0]}
                              alt={figure.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {figure.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              ${figure.currentValue.toFixed(2)} • {figure.condition}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Money */}
                {trade.requestedCash > 0 && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Cash: ${trade.requestedCash.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trade Info */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Created: {new Date(trade.createdAt).toLocaleString()}
            </p>
            {trade.updatedAt && trade.updatedAt !== trade.createdAt && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Updated: {new Date(trade.updatedAt).toLocaleString()}
              </p>
            )}
            {trade.acceptedAt && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Accepted: {new Date(trade.acceptedAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Receipt Confirmation Status - Show for accepted trades */}
          {trade.status === 'accepted' && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Confirmation Status
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {trade.fromUserName}:
                  </span>
                  <div className="flex items-center gap-2">
                    {trade.fromUserShippingStatus === 'received' ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          Confirmed receipt
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Pending confirmation
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {trade.toUserName}:
                  </span>
                  <div className="flex items-center gap-2">
                    {trade.toUserShippingStatus === 'received' ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          Confirmed receipt
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Pending confirmation
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {trade.fromUserShippingStatus === 'received' && trade.toUserShippingStatus === 'received' && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                  Both parties confirmed - trade will be marked complete!
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            {/* Recipient's turn (pending or they received a counter) */}
            {isMyTurn && isRecipient && (trade.status === 'pending' || trade.status === 'countered') && (
              <>
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  disabled={processing}
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline
                </Button>
                <Button
                  variant="outline"
                  onClick={onCounter}
                  disabled={processing || counterLimitReached}
                  title={counterLimitReached ? 'Counter limit reached (3 max)' : 'Send counter-proposal'}
                >
                  <Repeat className="h-4 w-4 mr-1" />
                  Counter {counterLimitReached && '(Max)'}
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={processing}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept Trade
                </Button>
              </>
            )}

            {/* Sender's turn (they received a counter) */}
            {isMyTurn && isSender && trade.status === 'countered' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  disabled={processing}
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline
                </Button>
                <Button
                  variant="outline"
                  onClick={onCounter}
                  disabled={processing || counterLimitReached}
                  title={counterLimitReached ? 'Counter limit reached (3 max)' : 'Send counter-proposal'}
                >
                  <Repeat className="h-4 w-4 mr-1" />
                  Counter {counterLimitReached && '(Max)'}
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={processing}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept Trade
                </Button>
              </>
            )}

            {/* Sender's turn (original pending) - can only cancel */}
            {!isMyTurn && isSender && trade.status === 'pending' && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={processing}
                className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel Trade
              </Button>
            )}

            {/* Accepted trade - confirm receipt buttons */}
            {trade.status === 'accepted' && (
              <>
                {/* Show confirmation button if user hasn't confirmed yet */}
                {!hasConfirmedReceipt &&
                  ((isRecipient && trade.toUserShippingStatus !== 'received') ||
                  (isSender && trade.fromUserShippingStatus !== 'received')) && (
                  <Button
                    onClick={handleConfirmReceived}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    I Received the Items
                  </Button>
                )}

                {/* Show status if user already confirmed */}
                {(hasConfirmedReceipt ||
                  (isRecipient && trade.toUserShippingStatus === 'received') ||
                  (isSender && trade.fromUserShippingStatus === 'received')) && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                    <CheckCircle className="h-5 w-5" />
                    You confirmed receipt
                  </div>
                )}

                {/* Show waiting message if other party hasn't confirmed */}
                {((isRecipient && trade.toUserShippingStatus === 'received' && trade.fromUserShippingStatus !== 'received') ||
                  (isSender && trade.fromUserShippingStatus === 'received' && trade.toUserShippingStatus !== 'received')) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Waiting for {isRecipient ? trade.fromUserName : trade.toUserName} to confirm receipt
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Configure Received Figures Modal */}
      {showConfigureModal && (
        <ConfigureReceivedFiguresModal
          figures={figuresReceiving}
          onConfirm={handleConfigureComplete}
          onCancel={() => setShowConfigureModal(false)}
        />
      )}
    </div>
  );
}

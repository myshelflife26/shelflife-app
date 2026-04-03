import { useState, useEffect } from 'react';
import type { ActionFigure, TradeProposal } from '../types/index';
import type { User } from '../types/user';
import { MarketplaceService } from '../utils/marketplaceService';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Store,
  DollarSign,
  Repeat,
  Filter,
  Search,
  TrendingUp,
  Package,
  MessageSquare,
  Check,
  X,
  Clock,
  CheckCircle
} from 'lucide-react';
import { CompletenessBadge } from './CompletenessBadge';
import { FigureDetailModal } from './FigureDetailModal';
import { TradeProposalModal } from './TradeProposalModal';
import { TradeDetailModal } from './TradeDetailModal';

interface MarketplacePageProps {
  currentUser: User;
}

type MarketplaceTab = 'browse' | 'myListings' | 'myTrades' | 'completed';

export function MarketplacePage({ currentUser }: MarketplacePageProps) {
  const [currentTab, setCurrentTab] = useState<MarketplaceTab>('browse');
  const [allListings, setAllListings] = useState<ActionFigure[]>([]);
  const [myListings, setMyListings] = useState<ActionFigure[]>([]);
  const [trades, setTrades] = useState<TradeProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'sale' | 'trade'>('all');
  const [selectedFigure, setSelectedFigure] = useState<(ActionFigure & { ownerName: string; ownerDisplayName: string; ownerUsername: string }) | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [tradeModalFigure, setTradeModalFigure] = useState<ActionFigure | null>(null);
  const [tradeModalTargetUser, setTradeModalTargetUser] = useState<{ displayName: string; username: string } | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<TradeProposal | null>(null);

  const LISTINGS_PER_PAGE = 24;

  // Load marketplace data
  useEffect(() => {
    loadMarketplaceData();
  }, [currentUser]);

  const loadMarketplaceData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel - getAllListings uses caching for performance
      const [listings, userListings, userTrades] = await Promise.all([
        MarketplaceService.getAllListings(), // Uses 5-minute cache
        MarketplaceService.getUserListings(currentUser.id),
        MarketplaceService.getUserTrades(currentUser.id)
      ]);

      setAllListings(listings);
      setMyListings(userListings);
      setTrades(userTrades);
      setHasMore(false); // For future pagination implementation
    } catch (error) {
      console.error('Failed to load marketplace:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter listings
  const filteredListings = allListings.filter(figure => {
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !figure.name.toLowerCase().includes(term) &&
        !figure.manufacturer.toLowerCase().includes(term) &&
        !(figure.productLine || '').toLowerCase().includes(term)
      ) {
        return false;
      }
    }

    // Check if for sale (new way or legacy way)
    const isForSale = figure.marketplaceListing?.forSale || figure.availability?.includes('for-sale');
    const isForTrade = figure.marketplaceListing?.forTrade || figure.availability?.includes('for-trade');

    // Mode filter
    if (filterMode === 'sale' && !isForSale) {
      return false;
    }
    if (filterMode === 'trade' && !isForTrade) {
      return false;
    }

    // Don't show own listings in browse
    if (figure.userId === currentUser.id) {
      return false;
    }

    return true;
  });

  const getFigureValue = (figure: ActionFigure): string => {
    const listing = figure.marketplaceListing;
    const isForSale = listing?.forSale || figure.availability?.includes('for-sale');
    const isForTrade = listing?.forTrade || figure.availability?.includes('for-trade');

    const parts = [];
    if (isForSale) {
      const price = listing?.askingPrice || figure.currentValue;
      if (price) {
        parts.push(`$${price}`);
      } else {
        parts.push('For Sale');
      }
    }
    if (isForTrade) {
      parts.push('Trade');
    }

    return parts.length > 0 ? parts.join(' or ') : 'N/A';
  };

  const handleViewDetails = async (figure: ActionFigure) => {
    // Fetch owner information
    if (!figure.userId) return;

    try {
      const owner = await FirebaseAuthService.getUserById(figure.userId);
      if (owner) {
        setSelectedFigure({
          ...figure,
          ownerName: owner.name,
          ownerDisplayName: owner.displayName,
          ownerUsername: owner.username
        });
        setDetailModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to load owner info:', error);
    }
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedFigure(null);
  };

  const handleOpenTrade = async (figure: ActionFigure) => {
    if (!figure.userId) return;

    try {
      const owner = await FirebaseAuthService.getUserById(figure.userId);
      if (owner) {
        setTradeModalTargetUser({
          displayName: owner.displayName,
          username: owner.username
        });
        setTradeModalFigure(figure);
      }
    } catch (error) {
      console.error('Failed to load owner info:', error);
    }
  };

  const handleCloseTrade = () => {
    setTradeModalFigure(null);
    setTradeModalTargetUser(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Store className="h-8 w-8" />
          Marketplace
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Buy, sell, and trade action figures with other collectors
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex">
          <button
            onClick={() => setCurrentTab('browse')}
            className={`flex-1 pb-2 px-0.5 sm:px-1 border-b-2 font-medium text-[10px] sm:text-sm transition-colors ${
              currentTab === 'browse'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2">
              <Search className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Browse</span>
            </div>
          </button>
          <button
            onClick={() => setCurrentTab('myListings')}
            className={`flex-1 pb-2 px-0.5 sm:px-1 border-b-2 font-medium text-[10px] sm:text-sm transition-colors ${
              currentTab === 'myListings'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2">
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">My Listings ({myListings.length})</span>
              <span className="sm:hidden">Listings</span>
            </div>
          </button>
          <button
            onClick={() => setCurrentTab('myTrades')}
            className={`flex-1 pb-2 px-0.5 sm:px-1 border-b-2 font-medium text-[10px] sm:text-sm transition-colors ${
              currentTab === 'myTrades'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2">
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Transactions In Progress</span>
              <span className="sm:hidden">Transactions</span>
            </div>
          </button>
          <button
            onClick={() => setCurrentTab('completed')}
            className={`flex-1 pb-2 px-0.5 sm:px-1 border-b-2 font-medium text-[10px] sm:text-sm transition-colors ${
              currentTab === 'completed'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2">
              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Completed</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Browse Tab */}
      {currentTab === 'browse' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search figures..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={filterMode === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterMode('all')}
                >
                  All
                </Button>
                <Button
                  variant={filterMode === 'sale' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterMode('sale')}
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  For Sale
                </Button>
                <Button
                  variant={filterMode === 'trade' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterMode('trade')}
                >
                  <Repeat className="h-4 w-4 mr-1" />
                  For Trade
                </Button>
              </div>
            </div>
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Loading marketplace...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
              <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No listings found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm || filterMode !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Be the first to list a figure for sale or trade!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredListings.map((figure) => (
                <div
                  key={figure.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                >
                  {/* Image */}
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                    {figure.images && figure.images.length > 0 ? (
                      <img
                        src={figure.images[figure.mainImageIndex || 0]}
                        alt={figure.name}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: figure.imagePosition || 'center center' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="h-16 w-16" />
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                      {(figure.marketplaceListing?.forSale || figure.availability?.includes('for-sale')) && (
                        <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                          FOR SALE
                        </div>
                      )}
                      {(figure.marketplaceListing?.forTrade || figure.availability?.includes('for-trade')) && (
                        <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                          FOR TRADE
                        </div>
                      )}
                    </div>

                    {/* Completeness badge */}
                    {figure.condition === 'Loose' && figure.completenessPercentage !== undefined && (
                      <div className="absolute bottom-2 left-2">
                        <CompletenessBadge
                          percentage={figure.completenessPercentage}
                          size="sm"
                          condition={figure.condition}
                        />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                      {figure.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {figure.manufacturer} • {figure.condition}
                    </p>

                    {/* Price/Trade */}
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-3">
                      {getFigureValue(figure)}
                    </div>

                    {/* Description */}
                    {figure.marketplaceListing?.marketplaceDescription && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {figure.marketplaceListing.marketplaceDescription}
                      </p>
                    )}

                    {/* Custom build details - only show if public */}
                    {figure.condition === 'Custom' &&
                     figure.marketplaceListing?.customBuildDetails &&
                     figure.customFormulaPrivacy === 'public' && (
                      <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs">
                        <strong className="text-purple-700 dark:text-purple-300">Custom Build:</strong>
                        <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                          {figure.marketplaceListing.customBuildDetails}
                        </p>
                      </div>
                    )}
                    {figure.condition === 'Custom' &&
                     figure.customFormulaPrivacy !== 'public' && (
                      <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs flex items-center gap-2 text-purple-700 dark:text-purple-300">
                        <span className="text-xs">🔒 Custom Build - Click View Details</span>
                      </div>
                    )}

                    {/* Action Buttons - pinned to bottom */}
                    <div className="flex gap-2 mt-auto">
                      <Button size="sm" className="flex-1" onClick={() => handleViewDetails(figure)}>
                        View Details
                      </Button>
                      {(figure.marketplaceListing?.forTrade || figure.availability?.includes('for-trade')) && (
                        <Button size="sm" variant="outline" onClick={() => handleOpenTrade(figure)}>
                          <Repeat className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Listings Tab */}
      {currentTab === 'myListings' && (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              To list a figure, edit it in your collection and mark it as "For Sale" or "For Trade" in the Availability section.
            </p>
          </div>

          {myListings.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No active listings
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Mark figures in your collection as "For Sale" or "For Trade" to list them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {myListings.map((figure) => (
                <div
                  key={figure.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                    {figure.images && figure.images.length > 0 ? (
                      <img
                        src={figure.images[figure.mainImageIndex || 0]}
                        alt={figure.name}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: figure.imagePosition || 'center center' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="h-8 w-8" />
                      </div>
                    )}

                    {/* Status badges */}
                    <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                      {(figure.marketplaceListing?.forSale || figure.availability?.includes('for-sale')) && (
                        <div className="bg-green-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                          SALE
                        </div>
                      )}
                      {(figure.marketplaceListing?.forTrade || figure.availability?.includes('for-trade')) && (
                        <div className="bg-blue-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                          TRADE
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    <h3 className="font-semibold text-xs text-gray-900 dark:text-white mb-1 line-clamp-2">
                      {figure.name}
                    </h3>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-2">
                      {getFigureValue(figure)}
                    </p>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" className="w-full h-7 text-[10px] px-1">
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="w-full h-7 text-[10px] px-1">
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Trades Tab */}
      {currentTab === 'myTrades' && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Loading trades...</p>
            </div>
          ) : trades.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No active trades
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Trade proposals you send or receive will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Incoming Trades */}
              {trades.filter(t => t.toUserId === currentUser.id && t.status !== 'completed' && t.status !== 'declined' && t.status !== 'cancelled').length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Incoming Trade Offers ({trades.filter(t => t.toUserId === currentUser.id && t.status !== 'completed' && t.status !== 'declined' && t.status !== 'cancelled').length})
                  </h3>
                  <div className="space-y-3">
                    {trades.filter(t => t.toUserId === currentUser.id && t.status !== 'completed' && t.status !== 'declined' && t.status !== 'cancelled').map(trade => (
                      <div key={trade.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              From: {trade.fromUserName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(trade.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            trade.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            trade.status === 'countered' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            trade.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}>
                            {trade.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">They Offer:</p>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              {trade.offeredFigureIds.length > 0 && (
                                <li>• {trade.offeredFigureIds.length} figure(s)</li>
                              )}
                              {trade.offeredCash > 0 && (
                                <li>• ${trade.offeredCash}</li>
                              )}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">They Want:</p>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              {trade.requestedFigureIds.length > 0 && (
                                <li>• {trade.requestedFigureIds.length} figure(s)</li>
                              )}
                              {trade.requestedCash > 0 && (
                                <li>• ${trade.requestedCash}</li>
                              )}
                            </ul>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" onClick={() => setSelectedTrade(trade)}>
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outgoing Trades */}
              {trades.filter(t => t.fromUserId === currentUser.id && t.status !== 'completed' && t.status !== 'declined' && t.status !== 'cancelled').length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Outgoing Trade Offers ({trades.filter(t => t.fromUserId === currentUser.id && t.status !== 'completed' && t.status !== 'declined' && t.status !== 'cancelled').length})
                  </h3>
                  <div className="space-y-3">
                    {trades.filter(t => t.fromUserId === currentUser.id && t.status !== 'completed' && t.status !== 'declined' && t.status !== 'cancelled').map(trade => (
                      <div key={trade.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              To: {trade.toUserName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(trade.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            trade.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            trade.status === 'countered' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            trade.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}>
                            {trade.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">You Offer:</p>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              {trade.offeredFigureIds.length > 0 && (
                                <li>• {trade.offeredFigureIds.length} figure(s)</li>
                              )}
                              {trade.offeredCash > 0 && (
                                <li>• ${trade.offeredCash}</li>
                              )}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">You Want:</p>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              {trade.requestedFigureIds.length > 0 && (
                                <li>• {trade.requestedFigureIds.length} figure(s)</li>
                              )}
                              {trade.requestedCash > 0 && (
                                <li>• ${trade.requestedCash}</li>
                              )}
                            </ul>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" onClick={() => setSelectedTrade(trade)}>
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Completed Transactions Tab */}
      {currentTab === 'completed' && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <Check className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No completed transactions yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your completed sales and trades will appear here once the trade system is active
          </p>
        </div>
      )}

      {/* Figure Detail Modal */}
      {selectedFigure && (
        <FigureDetailModal
          figure={selectedFigure}
          currentUserId={currentUser.id}
          onClose={handleCloseDetailModal}
          onViewOwnerCollection={(ownerId) => {
            // Could navigate to owner's collection, for now just close
            handleCloseDetailModal();
          }}
        />
      )}

      {/* Trade Proposal Modal */}
      {tradeModalFigure && tradeModalTargetUser && (
        <TradeProposalModal
          targetFigure={tradeModalFigure}
          targetUserId={tradeModalFigure.userId!}
          targetUserName={tradeModalTargetUser.displayName}
          currentUserId={currentUser.id}
          currentUserName={currentUser.displayName}
          onClose={handleCloseTrade}
          onTradeCreated={() => {
            loadMarketplaceData();
          }}
        />
      )}

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          currentUserId={currentUser.id}
          currentUserName={currentUser.displayName}
          onClose={() => setSelectedTrade(null)}
          onUpdate={() => loadMarketplaceData()}
          onCounter={() => {
            // TODO: Open counter-proposal modal
            setSelectedTrade(null);
            alert('Counter-proposal feature coming soon!');
          }}
        />
      )}
    </div>
  );
}

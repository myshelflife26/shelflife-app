import { useState, useEffect } from 'react';
import type { ActionFigure } from '../types/index';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, Search, DollarSign, Check, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { FirebaseStorage } from '../utils/firebaseStorage';
import { MarketplaceService } from '../utils/marketplaceService';
import { FirebaseAuthService } from '../utils/firebaseAuth';

interface TradeProposalModalProps {
  targetFigure: ActionFigure; // The figure the user clicked trade on
  targetUserId: string;
  targetUserName: string;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onTradeCreated?: () => void;
}

export function TradeProposalModal({
  targetFigure,
  targetUserId,
  targetUserName,
  currentUserId,
  currentUserName,
  onClose,
  onTradeCreated
}: TradeProposalModalProps) {
  // User's figures (left side)
  const [myFigures, setMyFigures] = useState<ActionFigure[]>([]);
  const [mySearch, setMySearch] = useState('');
  const [mySelectedFigures, setMySelectedFigures] = useState<Set<string>>(new Set());
  const [mySortBy, setMySortBy] = useState<'name' | 'cost'>('name');
  const [myMinCost, setMyMinCost] = useState('');
  const [myMaxCost, setMyMaxCost] = useState('');
  const [myFilterLine, setMyFilterLine] = useState('');
  const [myFilterYear, setMyFilterYear] = useState('');
  const [myFilterManufacturer, setMyFilterManufacturer] = useState('');
  const [myFilterSize, setMyFilterSize] = useState('');
  const [myFilterCustom, setMyFilterCustom] = useState(false);
  const [myFilterHasImages, setMyFilterHasImages] = useState(false);

  // Target user's figures (right side)
  const [theirFigures, setTheirFigures] = useState<ActionFigure[]>([]);
  const [theirSearch, setTheirSearch] = useState('');
  const [theirSelectedFigures, setTheirSelectedFigures] = useState<Set<string>>(new Set([targetFigure.id]));
  const [theirSortBy, setTheirSortBy] = useState<'name' | 'cost'>('name');
  const [theirMinCost, setTheirMinCost] = useState('');
  const [theirMaxCost, setTheirMaxCost] = useState('');
  const [theirFilterLine, setTheirFilterLine] = useState('');
  const [theirFilterYear, setTheirFilterYear] = useState('');
  const [theirFilterManufacturer, setTheirFilterManufacturer] = useState('');
  const [theirFilterSize, setTheirFilterSize] = useState('');
  const [theirFilterCustom, setTheirFilterCustom] = useState(false);
  const [theirFilterHasImages, setTheirFilterHasImages] = useState(false);

  // Money
  const [myMoneyAmount, setMyMoneyAmount] = useState('');
  const [theirMoneyAmount, setTheirMoneyAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  // Loading
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter visibility
  const [myFiltersOpen, setMyFiltersOpen] = useState(false);
  const [theirFiltersOpen, setTheirFiltersOpen] = useState(false);

  // Load figures
  useEffect(() => {
    const loadFigures = async () => {
      try {
        console.log('TradeProposalModal - currentUserId:', currentUserId);
        console.log('TradeProposalModal - targetUserId:', targetUserId);
        console.log('TradeProposalModal - targetFigure.userId:', targetFigure.userId);

        // Load my figures (all my figures, public or private)
        const myFigs = await FirebaseStorage.getFigures(currentUserId);
        console.log('Loaded my figures:', myFigs.length);
        setMyFigures(myFigs);

        // Load their public figures using the special method
        const publicFigs = await FirebaseStorage.getPublicFiguresForUser(targetUserId);
        console.log('Loaded their public figures:', publicFigs.length);
        setTheirFigures(publicFigs);

        setLoading(false);
      } catch (error) {
        console.error('Failed to load figures:', error);
        setLoading(false);
      }
    };
    loadFigures();
  }, [currentUserId, targetUserId]);

  // Get unique values for dropdowns from my figures
  const myUniqueLines = Array.from(new Set(myFigures.map(f => f.productLine).filter(Boolean))).sort();
  const myUniqueManufacturers = Array.from(new Set(myFigures.map(f => f.manufacturer).filter(Boolean))).sort();
  const myUniqueSizes = Array.from(new Set(myFigures.map(f => f.size).filter(Boolean))).sort();

  // Get unique values for dropdowns from their figures
  const theirUniqueLines = Array.from(new Set(theirFigures.map(f => f.productLine).filter(Boolean))).sort();
  const theirUniqueManufacturers = Array.from(new Set(theirFigures.map(f => f.manufacturer).filter(Boolean))).sort();
  const theirUniqueSizes = Array.from(new Set(theirFigures.map(f => f.size).filter(Boolean))).sort();

  // Filter and sort my figures
  const filteredMyFigures = myFigures
    .filter(fig => {
      // Search filter
      const matchesSearch = fig.name.toLowerCase().includes(mySearch.toLowerCase()) ||
                           fig.manufacturer.toLowerCase().includes(mySearch.toLowerCase());

      // Cost filter
      const minCost = myMinCost ? parseFloat(myMinCost) : 0;
      const maxCost = myMaxCost ? parseFloat(myMaxCost) : Infinity;
      const matchesCost = fig.currentValue >= minCost && fig.currentValue <= maxCost;

      // Line filter
      const matchesLine = !myFilterLine || fig.productLine === myFilterLine;

      // Year filter
      const matchesYear = !myFilterYear || (fig.year && fig.year.toString() === myFilterYear);

      // Manufacturer filter
      const matchesManufacturer = !myFilterManufacturer || fig.manufacturer === myFilterManufacturer;

      // Size filter
      const matchesSize = !myFilterSize || fig.size === myFilterSize;

      // Custom filter
      const matchesCustom = !myFilterCustom || fig.condition === 'Custom';

      // Has images filter
      const matchesImages = !myFilterHasImages || (fig.images && fig.images.length > 0);

      return matchesSearch && matchesCost && matchesLine && matchesYear && matchesManufacturer && matchesSize && matchesCustom && matchesImages;
    })
    .sort((a, b) => {
      if (mySortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return a.currentValue - b.currentValue;
      }
    });

  // Filter and sort their figures
  const filteredTheirFigures = theirFigures
    .filter(fig => {
      // Search filter
      const matchesSearch = fig.name.toLowerCase().includes(theirSearch.toLowerCase()) ||
                           fig.manufacturer.toLowerCase().includes(theirSearch.toLowerCase());

      // Cost filter
      const minCost = theirMinCost ? parseFloat(theirMinCost) : 0;
      const maxCost = theirMaxCost ? parseFloat(theirMaxCost) : Infinity;
      const matchesCost = fig.currentValue >= minCost && fig.currentValue <= maxCost;

      // Line filter
      const matchesLine = !theirFilterLine || fig.productLine === theirFilterLine;

      // Year filter
      const matchesYear = !theirFilterYear || (fig.year && fig.year.toString() === theirFilterYear);

      // Manufacturer filter
      const matchesManufacturer = !theirFilterManufacturer || fig.manufacturer === theirFilterManufacturer;

      // Size filter
      const matchesSize = !theirFilterSize || fig.size === theirFilterSize;

      // Custom filter
      const matchesCustom = !theirFilterCustom || fig.condition === 'Custom';

      // Has images filter
      const matchesImages = !theirFilterHasImages || (fig.images && fig.images.length > 0);

      return matchesSearch && matchesCost && matchesLine && matchesYear && matchesManufacturer && matchesSize && matchesCustom && matchesImages;
    })
    .sort((a, b) => {
      if (theirSortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return a.currentValue - b.currentValue;
      }
    });

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

  // Submit trade proposal
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
      // Fetch users to get usernames
      const currentUser = await FirebaseAuthService.getUserById(currentUserId);
      const targetUser = await FirebaseAuthService.getUserById(targetUserId);

      const tradeId = await MarketplaceService.createTradeProposal(
        currentUserId,
        currentUserName,
        currentUser?.username || '',
        targetUserId,
        targetUserName,
        targetUser?.username || '',
        Array.from(mySelectedFigures),
        Array.from(theirSelectedFigures),
        parseFloat(myMoneyAmount) || 0,
        parseFloat(theirMoneyAmount) || 0,
        paymentMethod ? `Payment method: ${paymentMethod}` : undefined
      );

      if (tradeId) {
        alert('Trade proposal sent!');
        if (onTradeCreated) onTradeCreated();
        onClose();
      } else {
        alert('Failed to create trade proposal');
      }
    } catch (error) {
      console.error('Failed to create trade:', error);
      alert('Failed to create trade proposal');
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Trade Proposal with {targetUserName}
          </h2>
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
                  My Figures (Offering)
                </h3>

                {/* Proposed Trade Section */}
                <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Proposed Trade
                  </h4>
                  {mySelectedFigures.size === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      No figures selected yet
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {myFigures
                        .filter(fig => mySelectedFigures.has(fig.id))
                        .map(figure => (
                          <div key={figure.id} className="flex items-center gap-2">
                            {figure.images && figure.images.length > 0 && (
                              <img
                                src={figure.images[figure.mainImageIndex || 0]}
                                alt={figure.name}
                                className="w-8 h-8 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                {figure.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                ${figure.currentValue.toFixed(2)}
                              </p>
                            </div>
                            <button
                              onClick={() => toggleMyFigure(figure.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Money section */}
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <Label className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Add Money to Offer
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={myMoneyAmount}
                    onChange={(e) => setMyMoneyAmount(e.target.value)}
                    className="mb-2"
                  />
                  {parseFloat(myMoneyAmount) > 0 && (
                    <div>
                      <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1">Payment Method</Label>
                      <div className="flex flex-wrap gap-2">
                        {['CashApp', 'Venmo', 'PayPal', 'Zelle', 'Other'].map(method => (
                          <button
                            key={method}
                            onClick={() => setPaymentMethod(method)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              paymentMethod === method
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sort & Filter Bar */}
                <div className="mb-3 flex items-center gap-2">
                  <select
                    value={mySortBy}
                    onChange={(e) => setMySortBy(e.target.value as 'name' | 'cost')}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="name">Sort: Name</option>
                    <option value="cost">Sort: Cost</option>
                  </select>
                  <button
                    onClick={() => setMyFiltersOpen(!myFiltersOpen)}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Filter className="h-3 w-3" />
                    Filters
                    {myFiltersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>

                {/* Collapsible Filters */}
                {myFiltersOpen && (
                  <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min $"
                        value={myMinCost}
                        onChange={(e) => setMyMinCost(e.target.value)}
                        className="h-7 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Max $"
                        value={myMaxCost}
                        onChange={(e) => setMyMaxCost(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={myFilterLine}
                        onChange={(e) => setMyFilterLine(e.target.value)}
                        className="h-7 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">All Product Lines</option>
                        {myUniqueLines.map(line => (
                          <option key={line} value={line}>{line}</option>
                        ))}
                      </select>
                      <Input
                        placeholder="Year"
                        value={myFilterYear}
                        onChange={(e) => setMyFilterYear(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={myFilterManufacturer}
                        onChange={(e) => setMyFilterManufacturer(e.target.value)}
                        className="h-7 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">All Manufacturers</option>
                        {myUniqueManufacturers.map(mfr => (
                          <option key={mfr} value={mfr}>{mfr}</option>
                        ))}
                      </select>
                      <select
                        value={myFilterSize}
                        onChange={(e) => setMyFilterSize(e.target.value)}
                        className="h-7 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">All Sizes</option>
                        {myUniqueSizes.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={myFilterCustom}
                          onChange={(e) => setMyFilterCustom(e.target.checked)}
                          className="rounded"
                        />
                        <span>Custom</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={myFilterHasImages}
                          onChange={(e) => setMyFilterHasImages(e.target.checked)}
                          className="rounded"
                        />
                        <span>Has Images</span>
                      </label>
                    </div>
                  </div>
                )}

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
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          mySelectedFigures.has(figure.id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {mySelectedFigures.has(figure.id) && <Check className="h-3 w-3 text-white" />}
                        </div>
                        {figure.images && figure.images.length > 0 && (
                          <img
                            src={figure.images[figure.mainImageIndex || 0]}
                            alt={figure.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {figure.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ${figure.currentValue.toFixed(2)} • {figure.condition}
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
                  {targetUserName}'s Figures (Requesting)
                </h3>

                {/* Proposed Trade Section */}
                <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Proposed Trade
                  </h4>
                  {theirSelectedFigures.size === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      No figures selected yet
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {theirFigures
                        .filter(fig => theirSelectedFigures.has(fig.id))
                        .map(figure => (
                          <div key={figure.id} className="flex items-center gap-2">
                            {figure.images && figure.images.length > 0 && (
                              <img
                                src={figure.images[figure.mainImageIndex || 0]}
                                alt={figure.name}
                                className="w-8 h-8 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                {figure.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                ${figure.currentValue.toFixed(2)}
                              </p>
                            </div>
                            <button
                              onClick={() => toggleTheirFigure(figure.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Money section */}
                <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <Label className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Request Money
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={theirMoneyAmount}
                    onChange={(e) => setTheirMoneyAmount(e.target.value)}
                  />
                </div>

                {/* Sort & Filter Bar */}
                <div className="mb-3 flex items-center gap-2">
                  <select
                    value={theirSortBy}
                    onChange={(e) => setTheirSortBy(e.target.value as 'name' | 'cost')}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="name">Sort: Name</option>
                    <option value="cost">Sort: Cost</option>
                  </select>
                  <button
                    onClick={() => setTheirFiltersOpen(!theirFiltersOpen)}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Filter className="h-3 w-3" />
                    Filters
                    {theirFiltersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>

                {/* Collapsible Filters */}
                {theirFiltersOpen && (
                  <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min $"
                        value={theirMinCost}
                        onChange={(e) => setTheirMinCost(e.target.value)}
                        className="h-7 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Max $"
                        value={theirMaxCost}
                        onChange={(e) => setTheirMaxCost(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={theirFilterLine}
                        onChange={(e) => setTheirFilterLine(e.target.value)}
                        className="h-7 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">All Product Lines</option>
                        {theirUniqueLines.map(line => (
                          <option key={line} value={line}>{line}</option>
                        ))}
                      </select>
                      <Input
                        placeholder="Year"
                        value={theirFilterYear}
                        onChange={(e) => setTheirFilterYear(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={theirFilterManufacturer}
                        onChange={(e) => setTheirFilterManufacturer(e.target.value)}
                        className="h-7 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">All Manufacturers</option>
                        {theirUniqueManufacturers.map(mfr => (
                          <option key={mfr} value={mfr}>{mfr}</option>
                        ))}
                      </select>
                      <select
                        value={theirFilterSize}
                        onChange={(e) => setTheirFilterSize(e.target.value)}
                        className="h-7 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">All Sizes</option>
                        {theirUniqueSizes.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={theirFilterCustom}
                          onChange={(e) => setTheirFilterCustom(e.target.checked)}
                          className="rounded"
                        />
                        <span>Custom</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={theirFilterHasImages}
                          onChange={(e) => setTheirFilterHasImages(e.target.checked)}
                          className="rounded"
                        />
                        <span>Has Images</span>
                      </label>
                    </div>
                  </div>
                )}

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
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          theirSelectedFigures.has(figure.id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {theirSelectedFigures.has(figure.id) && <Check className="h-3 w-3 text-white" />}
                        </div>
                        {figure.images && figure.images.length > 0 && (
                          <img
                            src={figure.images[figure.mainImageIndex || 0]}
                            alt={figure.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {figure.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ${figure.currentValue.toFixed(2)} • {figure.condition}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
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
              {submitting ? 'Sending...' : 'Send Trade Proposal'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

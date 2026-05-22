import { useState, useEffect, useMemo } from 'react';
import { FirebaseWishlistService } from '../utils/firebaseWishlist';
import type { WishlistItem, WishlistPriority, WishlistStatus } from '../types/wishlist';
import type { User } from '../types/user';
import { Heart, Plus, Trash2, Edit, Search, Filter, Star, TrendingUp, DollarSign, Package } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { WishlistItemDialog } from './WishlistItemDialog';
import { toastManager } from '../utils/toastManager';

interface WishlistPageProps {
  currentUser: User;
  addItemTrigger?: number; // Trigger from parent FAB
  onDialogStateChange?: (isOpen: boolean) => void; // Notify parent when dialog opens/closes
}

function WishlistPage({ currentUser, addItemTrigger, onDialogStateChange }: WishlistPageProps) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<WishlistPriority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<WishlistStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'dateAdded' | 'priority' | 'targetPrice' | 'figureName'>('dateAdded');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | undefined>(undefined);

  useEffect(() => {
    loadWishlist();
  }, [currentUser.id]);

  // Listen for add item trigger from parent FAB
  useEffect(() => {
    if (addItemTrigger && addItemTrigger > 0) {
      handleAddItem();
    }
  }, [addItemTrigger]);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const wishlistItems = await FirebaseWishlistService.getItems(currentUser.id);
      setItems(wishlistItems);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      toastManager.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem(undefined);
    setDialogOpen(true);
    onDialogStateChange?.(true);
  };

  const handleEditItem = (item: WishlistItem) => {
    setEditingItem(item);
    setDialogOpen(true);
    onDialogStateChange?.(true);
  };

  const handleDeleteItem = async (item: WishlistItem) => {
    if (confirm(`Remove "${item.figureName}" from wishlist?`)) {
      try {
        await FirebaseWishlistService.deleteItem(item.id);
        toastManager.success('Removed from wishlist');
        loadWishlist();
      } catch (error) {
        toastManager.error('Failed to remove item');
      }
    }
  };

  const handleMarkAcquired = async (item: WishlistItem) => {
    if (confirm(`Mark "${item.figureName}" as acquired? This will remove it from your wishlist.`)) {
      try {
        await FirebaseWishlistService.markAsAcquired(item.id);
        toastManager.success('Marked as acquired!');
        loadWishlist();
      } catch (error) {
        toastManager.error('Failed to mark as acquired');
      }
    }
  };

  const handleSaveItem = async () => {
    await loadWishlist();
    setDialogOpen(false);
    onDialogStateChange?.(false);
    setEditingItem(undefined);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    onDialogStateChange?.(false);
  };

  // Apply filters and sorting
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Search filter
    if (searchTerm) {
      filtered = FirebaseWishlistService.searchItems(filtered, searchTerm);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = FirebaseWishlistService.filterByPriority(filtered, priorityFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = FirebaseWishlistService.filterByStatus(filtered, statusFilter);
    }

    // Sort
    return FirebaseWishlistService.sortItems(filtered, sortBy);
  }, [items, searchTerm, priorityFilter, statusFilter, sortBy]);

  const stats = FirebaseWishlistService.calculateStats(items);

  const getPriorityColor = (priority: WishlistPriority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getStatusLabel = (status: WishlistStatus) => {
    switch (status) {
      case 'wanted':
        return 'Actively Seeking';
      case 'watching':
        return 'Watching Prices';
      case 'considering':
        return 'Considering';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="h-8 w-8 text-pink-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Wishlist</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">Track figures you want to acquire</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Star className="h-6 w-6 text-red-600" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">High Priority</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.highPriority}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Medium Priority</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.mediumPriority}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Target Budget</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.estimatedTotalCost.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search wishlist..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as WishlistPriority | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WishlistStatus | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="wanted">Actively Seeking</option>
            <option value="watching">Watching Prices</option>
            <option value="considering">Considering</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="dateAdded">Date Added</option>
            <option value="priority">Priority</option>
            <option value="targetPrice">Target Price</option>
            <option value="figureName">Name</option>
          </select>
        </div>
      </div>

      {/* Wishlist Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {items.length === 0 ? 'Your wishlist is empty' : 'No items match your filters'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {items.length === 0
              ? 'Start adding figures you want to acquire'
              : 'Try adjusting your search or filters'}
          </p>
          {items.length === 0 && (
            <Button onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Image */}
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.figureName}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                )}

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.figureName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {item.manufacturer && (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {item.manufacturer}
                          </span>
                        )}
                        {item.series && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {item.series}
                            </span>
                          </>
                        )}
                        {item.year && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {item.year}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Priority Badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                        item.priority
                      )}`}
                    >
                      {item.priority.toUpperCase()}
                    </span>
                  </div>

                  {/* Status and Price */}
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Status: <span className="font-medium">{getStatusLabel(item.status)}</span>
                    </span>
                    {item.targetPrice && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Target: <span className="font-medium text-green-600 dark:text-green-400">${item.targetPrice.toFixed(2)}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {item.notes}
                    </p>
                  )}

                  {/* Date Added */}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Added {new Date(item.dateAdded).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditItem(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkAcquired(item)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                  >
                    <Package className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteItem(item)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Wishlist Item Dialog */}
      <WishlistItemDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveItem}
        currentUser={currentUser}
        editingItem={editingItem}
      />
    </div>
  );
}


export default WishlistPage;
import { useState, useEffect, useMemo } from 'react';
import { WantListService, type WantListItem, type WantListAlert } from '../utils/wantList';
import { AuthService } from '../utils/auth';
import { FirebaseStorage } from '../utils/firebaseStorage';
import { toastManager } from '../utils/toastManager';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Heart, Plus, Trash2, Edit, Bell, BellOff, AlertCircle, Star, Package, TrendingUp, X, Check } from 'lucide-react';
import { FigureDetailModal } from './FigureDetailModal';
import type { ActionFigure } from '../types/index';

export function WantListPage() {
  const currentUser = AuthService.getCurrentUser();
  const [wantList, setWantList] = useState<WantListItem[]>([]);
  const [alerts, setAlerts] = useState<WantListAlert[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WantListItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'alerts'>('list');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedFigure, setSelectedFigure] = useState<ActionFigure | null>(null);
  const [loadingFigure, setLoadingFigure] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    series: '',
    category: '',
    version: '',
    notes: '',
    maxPrice: '',
    condition: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    notificationEnabled: true,
  });

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = () => {
    if (!currentUser) return;

    const list = WantListService.getWantList(currentUser.id);
    const alertsList = WantListService.getAlerts(currentUser.id);

    setWantList(list);
    setAlerts(alertsList);
  };

  const stats = useMemo(() => {
    if (!currentUser) return null;
    return WantListService.getStats(currentUser.id);
  }, [wantList, currentUser]);

  const filteredWantList = useMemo(() => {
    let filtered = wantList;

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(item => item.priority === priorityFilter);
    }

    // Sort by priority (high -> medium -> low) then by date (newest first)
    return filtered.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.addedAt - a.addedAt;
    });
  }, [wantList, priorityFilter]);

  const unviewedAlerts = useMemo(() => {
    return alerts.filter(a => !a.viewed && !a.dismissed);
  }, [alerts]);

  const handleOpenDialog = (item?: WantListItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        manufacturer: item.manufacturer || '',
        series: item.series || '',
        category: item.category || '',
        version: item.version || '',
        notes: item.notes || '',
        maxPrice: item.maxPrice?.toString() || '',
        condition: item.condition || '',
        priority: item.priority,
        notificationEnabled: item.notificationEnabled,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        manufacturer: '',
        series: '',
        category: '',
        version: '',
        notes: '',
        maxPrice: '',
        condition: '',
        priority: 'medium',
        notificationEnabled: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = () => {
    if (!currentUser) return;

    if (!formData.name.trim()) {
      toastManager.error('Figure name is required');
      return;
    }

    try {
      if (editingItem) {
        // Update existing item
        WantListService.updateWantListItem(currentUser.id, editingItem.id, {
          name: formData.name.trim(),
          manufacturer: formData.manufacturer.trim() || undefined,
          series: formData.series.trim() || undefined,
          category: formData.category.trim() || undefined,
          version: formData.version.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          maxPrice: formData.maxPrice ? parseFloat(formData.maxPrice) : undefined,
          condition: formData.condition || undefined,
          priority: formData.priority,
          notificationEnabled: formData.notificationEnabled,
        });
        toastManager.success('Want list item updated');
      } else {
        // Add new item
        WantListService.addWantListItem(currentUser.id, {
          name: formData.name.trim(),
          manufacturer: formData.manufacturer.trim() || undefined,
          series: formData.series.trim() || undefined,
          category: formData.category.trim() || undefined,
          version: formData.version.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          maxPrice: formData.maxPrice ? parseFloat(formData.maxPrice) : undefined,
          condition: formData.condition || undefined,
          priority: formData.priority,
          notificationEnabled: formData.notificationEnabled,
          source: 'manual',
        });
        toastManager.success('Added to want list');
      }

      loadData();
      handleCloseDialog();
    } catch (error) {
      if (error instanceof Error) {
        toastManager.error(error.message);
      }
    }
  };

  const handleDelete = (itemId: string) => {
    if (!currentUser) return;

    if (!confirm('Remove this item from your want list?')) return;

    WantListService.removeWantListItem(currentUser.id, itemId);
    toastManager.success('Removed from want list');
    loadData();
  };

  const handleToggleNotifications = (item: WantListItem) => {
    if (!currentUser) return;

    WantListService.updateWantListItem(currentUser.id, item.id, {
      notificationEnabled: !item.notificationEnabled,
    });

    toastManager.success(
      item.notificationEnabled ? 'Alerts disabled for this item' : 'Alerts enabled for this item'
    );
    loadData();
  };

  const handleDismissAlert = (alertId: string) => {
    if (!currentUser) return;

    WantListService.dismissAlert(currentUser.id, alertId);
    loadData();
  };

  const handleViewAlert = async (alert: WantListAlert) => {
    if (!currentUser) return;

    WantListService.markAlertViewed(currentUser.id, alert.id);
    loadData();

    // Fetch and display the figure
    setLoadingFigure(true);
    try {
      const figure = await FirebaseStorage.getFigure(alert.figureId);
      if (figure) {
        setSelectedFigure(figure);
      } else {
        toastManager.error('Figure not found or no longer available');
      }
    } catch (error) {
      console.error('Failed to load figure:', error);
      toastManager.error('Failed to load figure details');
    } finally {
      setLoadingFigure(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950';
      case 'low':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-4 h-4" />;
      case 'medium':
        return <Star className="w-4 h-4" />;
      case 'low':
        return <Package className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Login to create and manage your want list
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Heart className="w-8 h-8 text-red-500" />
              Want List
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track figures you want and get alerts when they're listed
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Stats */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.total}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Items</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.byPriority.high}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">High Priority</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.byPriority.medium}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Medium Priority</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {unviewedAlerts.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">New Alerts</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.withAlerts}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">With Alerts</div>
            </div>
          </div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            viewMode === 'list'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Package className="h-4 w-4 inline mr-2" />
          Want List ({wantList.length})
        </button>
        <button
          onClick={() => setViewMode('alerts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
            viewMode === 'alerts'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Bell className="h-4 w-4 inline mr-2" />
          Alerts ({alerts.length})
          {unviewedAlerts.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unviewedAlerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Want List View */}
      {viewMode === 'list' && (
        <>
          {/* Priority Filter */}
          {wantList.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-sm">Filter by priority:</Label>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="w-40"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </Select>
            </div>
          )}

          {/* Want List Items */}
          {filteredWantList.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {priorityFilter !== 'all'
                  ? `No ${priorityFilter} priority items`
                  : 'Your want list is empty'}
              </p>
              <Button onClick={() => handleOpenDialog()} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Item
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWantList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.name}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {getPriorityIcon(item.priority)}
                          {item.priority}
                        </span>
                        {item.source === 'set-completion' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                            From Set
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {item.manufacturer && <p>Manufacturer: {item.manufacturer}</p>}
                        {item.series && <p>Series: {item.series}</p>}
                        {item.version && <p>Version: {item.version}</p>}
                        {item.condition && <p>Condition: {item.condition}</p>}
                        {item.maxPrice && <p>Max Price: ${item.maxPrice.toFixed(2)}</p>}
                        {item.notes && (
                          <p className="text-xs italic mt-2">{item.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          Added {new Date(item.addedAt).toLocaleDateString()}
                        </span>
                        {item.matchedListingIds.length > 0 && (
                          <span className="text-green-600 dark:text-green-400">
                            {item.matchedListingIds.length} match{item.matchedListingIds.length !== 1 ? 'es' : ''} found
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleToggleNotifications(item)}
                        className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          item.notificationEnabled
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-400'
                        }`}
                        title={item.notificationEnabled ? 'Alerts enabled' : 'Alerts disabled'}
                      >
                        {item.notificationEnabled ? (
                          <Bell className="h-4 w-4" />
                        ) : (
                          <BellOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenDialog(item)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Alerts View */}
      {viewMode === 'alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No alerts yet. We'll notify you when wanted figures are listed!
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-4 hover:shadow-md transition-shadow ${
                  alert.dismissed
                    ? 'border-gray-200 dark:border-gray-700 opacity-50'
                    : alert.viewed
                    ? 'border-gray-300 dark:border-gray-600'
                    : 'border-blue-500 dark:border-blue-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {!alert.viewed && !alert.dismissed && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {alert.figureName}
                      </h3>
                      {!alert.viewed && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          New
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        Listed for ${alert.listingPrice.toFixed(2)}
                      </p>
                      <p>Seller: {alert.sellerName}</p>
                      <p className="text-xs">
                        Listed {new Date(alert.listedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleViewAlert(alert)}
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        View Listing
                      </Button>
                      {!alert.dismissed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDismissAlert(alert.id)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Want List Item' : 'Add to Want List'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <Label>Figure Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Snake Eyes v2"
              />
            </div>

            {/* Row 1: Manufacturer, Series */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Manufacturer</Label>
                <Input
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="e.g., Hasbro"
                />
              </div>
              <div>
                <Label>Series</Label>
                <Input
                  value={formData.series}
                  onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                  placeholder="e.g., G.I. Joe Classified"
                />
              </div>
            </div>

            {/* Row 2: Category, Version */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Action Figure"
                />
              </div>
              <div>
                <Label>Version</Label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="e.g., Retro"
                />
              </div>
            </div>

            {/* Row 3: Condition, Max Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preferred Condition</Label>
                <Select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                >
                  <option value="">Any Condition</option>
                  <option value="MIB">MIB (Mint in Box)</option>
                  <option value="NRFB">NRFB (Never Removed)</option>
                  <option value="Loose">Loose</option>
                  <option value="Used">Used</option>
                </Select>
              </div>
              <div>
                <Label>Max Price (Alert Threshold)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.maxPrice}
                  onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Priority */}
            <div>
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <option value="high">High - Must Have</option>
                <option value="medium">Medium - Want</option>
                <option value="low">Low - Nice to Have</option>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes or specific requirements..."
                rows={3}
              />
            </div>

            {/* Notifications Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notifications"
                checked={formData.notificationEnabled}
                onChange={(e) => setFormData({ ...formData, notificationEnabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <Label htmlFor="notifications" className="cursor-pointer">
                Send me alerts when this figure is listed
              </Label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                <Check className="h-4 w-4 mr-2" />
                {editingItem ? 'Update' : 'Add to Want List'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Figure Detail Modal */}
      {selectedFigure && currentUser && (
        <FigureDetailModal
          figure={selectedFigure}
          currentUser={currentUser}
          onClose={() => setSelectedFigure(null)}
          onEdit={() => {}}
          onDelete={() => {}}
          onUpdate={() => {}}
        />
      )}
    </div>
  );
}

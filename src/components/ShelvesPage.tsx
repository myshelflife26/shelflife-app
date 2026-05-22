import { useState, useEffect } from 'react';
import type { Shelf } from '../types/shelf';
import type { ActionFigure } from '../types/index';
import { FirebaseShelvesService } from '../utils/firebaseShelves';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { toastManager } from '../utils/toastManager';
import { Plus, Grid3x3, Trash2, Edit2, Eye, EyeOff, X } from 'lucide-react';

interface ShelvesPageProps {
  userId: string;
  figures: ActionFigure[];
  onNavigateToShelf: (shelfId: string) => void;
}

function ShelvesPage({ userId, figures, onNavigateToShelf }: ShelvesPageProps) {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
  });

  useEffect(() => {
    loadShelves();
  }, [userId]);

  const loadShelves = async () => {
    setLoading(true);
    try {
      const userShelves = await FirebaseShelvesService.getUserShelves(userId);
      setShelves(userShelves);
    } catch (error) {
      console.error('Failed to load shelves:', error);
      toastManager.error('Failed to load shelves');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShelf = async () => {
    if (!formData.name.trim()) {
      toastManager.error('Shelf name is required');
      return;
    }

    try {
      await FirebaseShelvesService.createShelf(
        userId,
        formData.name.trim(),
        formData.description.trim() || undefined,
        formData.isPublic
      );
      toastManager.success('Shelf created');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', isPublic: false });
      await loadShelves();
    } catch (error) {
      console.error('Failed to create shelf:', error);
      toastManager.error('Failed to create shelf');
    }
  };

  const handleUpdateShelf = async () => {
    if (!editingShelf || !formData.name.trim()) {
      toastManager.error('Shelf name is required');
      return;
    }

    try {
      await FirebaseShelvesService.updateShelf(editingShelf.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isPublic: formData.isPublic,
      });
      toastManager.success('Shelf updated');
      setEditingShelf(null);
      setFormData({ name: '', description: '', isPublic: false });
      await loadShelves();
    } catch (error) {
      console.error('Failed to update shelf:', error);
      toastManager.error('Failed to update shelf');
    }
  };

  const handleDeleteShelf = async (shelfId: string, shelfName: string) => {
    if (!confirm(`Delete shelf "${shelfName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await FirebaseShelvesService.deleteShelf(shelfId);
      toastManager.success('Shelf deleted');
      await loadShelves();
    } catch (error) {
      console.error('Failed to delete shelf:', error);
      toastManager.error('Failed to delete shelf');
    }
  };

  const startEdit = (shelf: Shelf) => {
    setEditingShelf(shelf);
    setFormData({
      name: shelf.name,
      description: shelf.description || '',
      isPublic: shelf.isPublic || false,
    });
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingShelf(null);
    setFormData({ name: '', description: '', isPublic: false });
  };

  const getShelfThumbnails = (shelf: Shelf): string[] => {
    const thumbnails: string[] = [];
    for (const figureId of shelf.figureIds) {
      const figure = figures.find(f => f.id === figureId);
      if (figure && figure.images && figure.images.length > 0) {
        const mainImageIndex = figure.mainImageIndex ?? 0;
        thumbnails.push(figure.images[mainImageIndex]);
      }
      if (thumbnails.length >= 4) break;
    }
    return thumbnails;
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            My Shelves
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Organize your collection into virtual display shelves
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex-shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          New Shelf
        </Button>
      </div>

      {/* Shelves Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading shelves...
        </div>
      ) : shelves.length === 0 ? (
        <div className="text-center py-12">
          <Grid3x3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            You haven't created any shelves yet.
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Shelf
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shelves.map((shelf) => {
            const thumbnails = getShelfThumbnails(shelf);
            const figureCount = shelf.figureIds.length;

            return (
              <div
                key={shelf.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
                onClick={() => onNavigateToShelf(shelf.id)}
              >
                {/* Thumbnail Grid */}
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 grid grid-cols-2 gap-1 p-1">
                  {thumbnails.length === 0 ? (
                    <div className="col-span-2 flex items-center justify-center text-gray-400">
                      <Grid3x3 className="h-12 w-12" />
                    </div>
                  ) : (
                    <>
                      {thumbnails.map((url, idx) => (
                        <div key={idx} className="aspect-square bg-gray-200 dark:bg-gray-600 rounded overflow-hidden">
                          <img
                            src={url}
                            alt={`Figure ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {/* Fill empty slots */}
                      {Array.from({ length: 4 - thumbnails.length }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="aspect-square bg-gray-200 dark:bg-gray-600 rounded" />
                      ))}
                    </>
                  )}
                </div>

                {/* Shelf Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex-1 truncate">
                      {shelf.name}
                    </h3>
                    <div className="flex items-center gap-1 ml-2">
                      {shelf.isPublic ? (
                        <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" title="Public" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" title="Private" />
                      )}
                    </div>
                  </div>

                  {shelf.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {shelf.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span>{figureCount} {figureCount === 1 ? 'figure' : 'figures'}</span>
                    <span>{new Date(shelf.updatedAt).toLocaleDateString()}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(shelf);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteShelf(shelf.id, shelf.name);
                      }}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingShelf) && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingShelf ? 'Edit Shelf' : 'Create New Shelf'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="shelf-name">Shelf Name *</Label>
                <Input
                  id="shelf-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., My Favorite Figures"
                  maxLength={50}
                />
              </div>

              <div>
                <Label htmlFor="shelf-description">Description (optional)</Label>
                <Textarea
                  id="shelf-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your shelf..."
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shelf-public"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="shelf-public" className="cursor-pointer">
                  Make this shelf public
                </Label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={closeModal} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={editingShelf ? handleUpdateShelf : handleCreateShelf}
                  disabled={!formData.name.trim()}
                  className="flex-1"
                >
                  {editingShelf ? 'Save Changes' : 'Create Shelf'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default ShelvesPage;
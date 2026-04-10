import { useState, useEffect, useMemo } from 'react';
import type { Shelf } from '../types/shelf';
import type { ActionFigure } from '../types/index';
import { FirebaseShelvesService } from '../utils/firebaseShelves';
import { Button } from './ui/button';
import { toastManager } from '../utils/toastManager';
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Grid3x3, Search, X } from 'lucide-react';
import { WatermarkedImage } from './ImageOverlay';
import { Input } from './ui/input';

interface ShelfViewPageProps {
  shelfId: string;
  userId: string;
  currentUserId: string;
  figures: ActionFigure[];
  onBack: () => void;
}

export function ShelfViewPage({ shelfId, userId, currentUserId, figures, onBack }: ShelfViewPageProps) {
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isOwner = userId === currentUserId;

  useEffect(() => {
    loadShelf();
  }, [shelfId]);

  const loadShelf = async () => {
    setLoading(true);
    try {
      const loadedShelf = await FirebaseShelvesService.getShelf(shelfId);
      if (loadedShelf) {
        setShelf(loadedShelf);
      } else {
        toastManager.error('Shelf not found');
        onBack();
      }
    } catch (error) {
      console.error('Failed to load shelf:', error);
      toastManager.error('Failed to load shelf');
    } finally {
      setLoading(false);
    }
  };

  const shelfFigures = useMemo(() => {
    if (!shelf) return [];
    // Maintain the order from shelf.figureIds
    return shelf.figureIds
      .map(figureId => figures.find(f => f.id === figureId))
      .filter(Boolean) as ActionFigure[];
  }, [shelf, figures]);

  const availableFigures = useMemo(() => {
    if (!shelf) return [];
    const shelfFigureIds = new Set(shelf.figureIds);
    return figures
      .filter(f => !shelfFigureIds.has(f.id))
      .filter(f => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          f.name.toLowerCase().includes(query) ||
          f.manufacturer?.toLowerCase().includes(query) ||
          f.category?.toLowerCase().includes(query)
        );
      });
  }, [shelf, figures, searchQuery]);

  const handleAddFigure = async (figureId: string) => {
    if (!shelf) return;
    try {
      await FirebaseShelvesService.addFigureToShelf(shelf.id, figureId);
      toastManager.success('Figure added to shelf');
      await loadShelf();
    } catch (error) {
      console.error('Failed to add figure:', error);
      toastManager.error('Failed to add figure');
    }
  };

  const handleRemoveFigure = async (figureId: string) => {
    if (!shelf) return;
    try {
      await FirebaseShelvesService.removeFigureFromShelf(shelf.id, figureId);
      toastManager.success('Figure removed from shelf');
      await loadShelf();
    } catch (error) {
      console.error('Failed to remove figure:', error);
      toastManager.error('Failed to remove figure');
    }
  };

  const handleMoveFigure = async (figureId: string, direction: 'up' | 'down') => {
    if (!shelf) return;
    const currentIndex = shelf.figureIds.indexOf(figureId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= shelf.figureIds.length) return;

    const newFigureIds = [...shelf.figureIds];
    [newFigureIds[currentIndex], newFigureIds[newIndex]] = [newFigureIds[newIndex], newFigureIds[currentIndex]];

    try {
      await FirebaseShelvesService.reorderShelfFigures(shelf.id, newFigureIds);
      await loadShelf();
    } catch (error) {
      console.error('Failed to reorder figures:', error);
      toastManager.error('Failed to reorder figures');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading shelf...
        </div>
      </div>
    );
  }

  if (!shelf) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="outline" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shelves
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {shelf.name}
            </h1>
            {shelf.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {shelf.description}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {shelfFigures.length} {shelfFigures.length === 1 ? 'figure' : 'figures'}
            </p>
          </div>

          {isOwner && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Figures
            </Button>
          )}
        </div>
      </div>

      {/* Shelf Display */}
      {shelfFigures.length === 0 ? (
        <div className="text-center py-12">
          <Grid3x3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            This shelf is empty.
          </p>
          {isOwner && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Figures
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {shelfFigures.map((figure, index) => {
            const mainImageIndex = figure.mainImageIndex ?? 0;
            const imageUrl = figure.images?.[mainImageIndex];

            return (
              <div key={figure.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {/* Image */}
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                  {imageUrl ? (
                    <WatermarkedImage
                      src={imageUrl}
                      alt={figure.name}
                      watermarkText="SAMPLE"
                      ownerId={userId}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                    {figure.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {figure.manufacturer}
                  </p>

                  {/* Controls */}
                  {isOwner && (
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => handleMoveFigure(figure.id, 'up')}
                        disabled={index === 0}
                        className="flex-1 p-1 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => handleMoveFigure(figure.id, 'down')}
                        disabled={index === shelfFigures.length - 1}
                        className="flex-1 p-1 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => handleRemoveFigure(figure.id)}
                        className="flex-1 p-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        title="Remove from shelf"
                      >
                        <Trash2 className="h-4 w-4 mx-auto" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Figures Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Add Figures to Shelf
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search figures..."
                  className="pl-9"
                />
              </div>
            </div>

            {/* Available Figures */}
            <div className="flex-1 overflow-y-auto p-4">
              {availableFigures.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No figures found matching your search.' : 'All figures are already on this shelf.'}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableFigures.map((figure) => {
                    const mainImageIndex = figure.mainImageIndex ?? 0;
                    const imageUrl = figure.images?.[mainImageIndex];

                    return (
                      <div
                        key={figure.id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        onClick={() => {
                          handleAddFigure(figure.id);
                          setSearchQuery('');
                        }}
                      >
                        <div className="aspect-square bg-gray-100 dark:bg-gray-600">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={figure.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {figure.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {figure.manufacturer}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

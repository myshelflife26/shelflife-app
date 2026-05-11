import { useState, useMemo, useEffect } from 'react';
import type { ActionFigure, Filters } from '../types/index';
import { FilterSheet } from './FilterSheet';
import { Select } from './ui/select';
import { Label } from './ui/label';
import { Package, ArrowUpDown, ChevronLeft, ChevronRight, X, Star, Tag, MessageSquare } from 'lucide-react';
import { WatermarkedImage } from './ImageOverlay';
import { AuthService } from '../utils/auth';

interface GalleryPageProps {
  figures: ActionFigure[];
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  manufacturers: string[];
  categories: string[];
  conditions: string[];
  sizes: string[];
  packaging: string[];
  productLines: string[];
  locations: string[];
  onToggleFavorite?: (figureId: string) => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'value-asc' | 'value-desc';

export function GalleryPage({
  figures,
  filters,
  onFilterChange,
  manufacturers,
  categories,
  conditions,
  sizes,
  packaging,
  productLines,
  locations,
  onToggleFavorite,
}: GalleryPageProps) {
  const currentUser = AuthService.getCurrentUser();
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [selectedImage, setSelectedImage] = useState<{ figure: ActionFigure; imageIndex: number } | null>(null);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Sort figures
  const sortedFigures = useMemo(() => {
    const sorted = [...figures];

    switch (sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'date-asc':
        sorted.sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
        break;
      case 'date-desc':
        sorted.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
        break;
      case 'value-asc':
        sorted.sort((a, b) => a.currentValue - b.currentValue);
        break;
      case 'value-desc':
        sorted.sort((a, b) => b.currentValue - a.currentValue);
        break;
    }

    return sorted;
  }, [figures, sortBy]);

  // Collect only main images (one per figure)
  const imageGallery = useMemo(() => {
    const items: { figure: ActionFigure; imageUrl: string }[] = [];

    sortedFigures.forEach(figure => {
      if (figure.images && figure.images.length > 0) {
        const mainImageIndex = figure.mainImageIndex ?? 0;
        items.push({
          figure,
          imageUrl: figure.images[mainImageIndex]
        });
      }
    });

    return items;
  }, [sortedFigures]);

  const handleImageClick = (figure: ActionFigure) => {
    // Start with the main image
    const mainImageIndex = figure.mainImageIndex ?? 0;
    setSelectedImage({ figure, imageIndex: mainImageIndex });
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const handleNextImage = () => {
    if (!selectedImage || !selectedImage.figure.images) return;
    const totalImages = selectedImage.figure.images.length;
    const nextIndex = (selectedImage.imageIndex + 1) % totalImages;
    setSelectedImage({ ...selectedImage, imageIndex: nextIndex });
  };

  const handlePrevImage = () => {
    if (!selectedImage || !selectedImage.figure.images) return;
    const totalImages = selectedImage.figure.images.length;
    const prevIndex = (selectedImage.imageIndex - 1 + totalImages) % totalImages;
    setSelectedImage({ ...selectedImage, imageIndex: prevIndex });
  };

  // Keyboard navigation
  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextImage();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-3 sm:gap-4 items-center justify-between">
        <div className="flex gap-2 sm:gap-3 items-center">
          <FilterSheet
            filters={filters}
            onFilterChange={onFilterChange}
            manufacturers={manufacturers}
            categories={categories}
            conditions={conditions}
            sizes={sizes}
            packaging={packaging}
            productLines={productLines}
            locations={locations}
            figures={figures}
          />

          <div className="flex items-center gap-1 sm:gap-2">
            <Label htmlFor="sort" className="text-xs sm:text-sm whitespace-nowrap">
              <ArrowUpDown className="h-4 w-4 inline mr-1" />
              Sort by:
            </Label>
            <Select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-32 sm:w-40 text-xs sm:text-sm"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="date-asc">Date (Oldest)</option>
              <option value="date-desc">Date (Newest)</option>
              <option value="value-asc">Value (Low-High)</option>
              <option value="value-desc">Value (High-Low)</option>
            </Select>
          </div>
        </div>

        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          {imageGallery.length} figures with images
        </div>
      </div>

      {/* Image Gallery */}
      {imageGallery.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No images found. Add images to your figures to see them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {imageGallery.map((item) => {
            const imageCount = item.figure.images?.length || 0;
            const hasMultipleImages = imageCount > 1;

            return (
              <div
                key={item.figure.id}
                className="group relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer shadow hover:shadow-lg transition-shadow"
                onClick={() => handleImageClick(item.figure)}
              >
                <WatermarkedImage
                  src={item.imageUrl}
                  alt={`${item.figure.name}`}
                  watermarkText="SAMPLE"
                  ownerId={currentUser?.id}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: item.figure.imagePosition || 'center center' }}
                />

                {/* Sale/Trade Badge */}
                {item.figure.availability && item.figure.availability.length > 0 && (
                  <div className="absolute top-2 left-2 flex gap-1">
                    {item.figure.availability.includes('for-sale') && (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-green-600 text-white">
                        For Sale
                      </span>
                    )}
                    {item.figure.availability.includes('for-trade') && (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-600 text-white">
                        For Trade
                      </span>
                    )}
                  </div>
                )}

                {/* Favorite Star Button */}
                {onToggleFavorite && (
                  <button
                    className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${
                      hasMultipleImages ? 'right-20' : 'right-2'
                    } ${
                      item.figure.isFavorite
                        ? 'bg-yellow-500 text-white'
                        : 'bg-black bg-opacity-50 text-white hover:bg-opacity-70'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(item.figure.id);
                    }}
                    title={item.figure.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star className={`h-4 w-4 ${item.figure.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                )}

                {/* Multiple images indicator */}
                {hasMultipleImages && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
                    +{imageCount - 1} more
                  </div>
                )}

                {/* Comment Count Badge (for owners) */}
                {item.figure.commentCount !== undefined && item.figure.commentCount > 0 && (
                  <div
                    className="absolute bottom-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 hover:bg-blue-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImageClick(item.figure);
                    }}
                    title="View comments"
                  >
                    <MessageSquare className="h-3 w-3" />
                    {item.figure.commentCount}
                  </div>
                )}

                {/* Version Badge */}
                {item.figure.version && (
                  <div className="absolute bottom-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                    {item.figure.version}
                  </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity flex items-end">
                  <div className="w-full p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform">
                    <div className="flex items-baseline gap-2 mb-1">
                      <p className="font-semibold text-sm truncate flex-1">
                        {item.figure.name}
                      </p>
                      {item.figure.version && (
                        <span className="text-xs font-semibold bg-blue-600 px-2 py-0.5 rounded flex-shrink-0">
                          {item.figure.version}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>{item.figure.manufacturer}</span>
                      {hasMultipleImages && (
                        <span className="bg-white/20 px-2 py-0.5 rounded text-white">
                          {imageCount} images
                        </span>
                      )}
                    </div>
                    {item.figure.tags && item.figure.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.figure.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/80 text-white"
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {tag}
                          </span>
                        ))}
                        {item.figure.tags.length > 3 && (
                          <span className="text-xs text-white/70">+{item.figure.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div className="relative max-w-6xl max-h-full flex items-center">
            {/* Previous Button */}
            {selectedImage.figure.images && selectedImage.figure.images.length > 1 && (
              <button
                className="absolute left-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-3 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevImage();
                }}
                title="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Image */}
            <div className="relative">
              <WatermarkedImage
                src={selectedImage.figure.images![selectedImage.imageIndex]}
                alt={`${selectedImage.figure.name} - Image ${selectedImage.imageIndex + 1}`}
                watermarkText="SAMPLE"
                ownerId={currentUser?.id}
                className="max-w-full max-h-[85vh] object-contain rounded"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Image Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent text-white p-6">
                <h3 className="font-semibold text-xl mb-2">
                  {selectedImage.figure.name}
                  {selectedImage.figure.version && (
                    <span className="ml-2 text-base font-normal opacity-90">({selectedImage.figure.version})</span>
                  )}
                </h3>
                <div className="text-sm space-y-1 opacity-90">
                  <p>Manufacturer: {selectedImage.figure.manufacturer || 'N/A'}</p>
                  <p>Condition: {selectedImage.figure.condition}</p>
                  <p>Value: ${selectedImage.figure.currentValue.toFixed(2)}</p>
                  <p className="font-medium mt-2">
                    Image {selectedImage.imageIndex + 1} of {selectedImage.figure.images!.length}
                    {selectedImage.imageIndex === (selectedImage.figure.mainImageIndex ?? 0) && (
                      <span className="ml-2 bg-blue-600 px-2 py-1 rounded text-xs font-semibold">Main Image</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Next Button */}
            {selectedImage.figure.images && selectedImage.figure.images.length > 1 && (
              <button
                className="absolute right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-3 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextImage();
                }}
                title="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Close button */}
            <button
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-3"
              onClick={handleCloseModal}
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Keyboard hint */}
            {selectedImage.figure.images && selectedImage.figure.images.length > 1 && (
              <div className="absolute top-4 left-4 text-white text-xs bg-black bg-opacity-50 px-3 py-2 rounded">
                Use ← → arrow keys to navigate
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

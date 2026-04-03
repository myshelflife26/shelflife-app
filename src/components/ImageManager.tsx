import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Upload, X, Star } from 'lucide-react';
import { ImageCompressionService } from '../utils/imageCompression';
import { ImagePositionAdjuster } from './ImagePositionAdjuster';

interface ImageManagerProps {
  images: string[];
  mainImageIndex: number;
  imagePosition?: string;
  onChange: (images: string[], mainImageIndex: number) => void;
  onPositionChange?: (position: string) => void;
}

export function ImageManager({ images, mainImageIndex, imagePosition = 'center center', onChange, onPositionChange }: ImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - images.length;
    if (remainingSlots === 0) {
      alert('Maximum of 5 images allowed. Please remove an image first.');
      return;
    }

    setIsUploading(true);

    try {
      const newImages: string[] = [];
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      for (const file of filesToProcess) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert(`Skipping ${file.name}: Not an image file`);
          continue;
        }

        // Convert to base64
        let base64 = await fileToBase64(file);

        // Get original size
        const originalSize = ImageCompressionService.getBase64Size(base64);
        const originalSizeKB = originalSize / 1024;

        // Compress if needed (target 500KB max)
        if (ImageCompressionService.needsCompression(base64, 500)) {
          try {
            base64 = await ImageCompressionService.compressImage(base64, {
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 0.85,
              targetSizeKB: 500
            });

            const compressedSize = ImageCompressionService.getBase64Size(base64);
            const compressedSizeKB = compressedSize / 1024;

            console.log(
              `Compressed ${file.name}: ${originalSizeKB.toFixed(0)}KB → ${compressedSizeKB.toFixed(0)}KB ` +
              `(${((1 - compressedSize / originalSize) * 100).toFixed(0)}% reduction)`
            );
          } catch (error) {
            console.error('Error compressing image:', error);
            alert(`Warning: Could not compress ${file.name}. Using original.`);
          }
        }

        // Final size check (after compression)
        const finalSize = ImageCompressionService.getBase64Size(base64);
        const finalSizeKB = finalSize / 1024;
        const maxSizeKB = 800; // 800KB absolute max after compression

        if (finalSizeKB > maxSizeKB) {
          alert(
            `Skipping ${file.name}: Still too large after compression (${finalSizeKB.toFixed(0)}KB)\n\n` +
            `Maximum size is ${maxSizeKB}KB to prevent storage issues.\n` +
            `Please use a smaller image or lower resolution.`
          );
          continue;
        }

        newImages.push(base64);
      }

      const updatedImages = [...images, ...newImages];
      // If this is the first image, make it the main image
      const newMainIndex = images.length === 0 && newImages.length > 0 ? 0 : mainImageIndex;
      onChange(updatedImages, newMainIndex);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload one or more images. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    let newMainIndex = mainImageIndex;

    // Adjust main image index if needed
    if (index === mainImageIndex) {
      // Removed the main image, set first image as main
      newMainIndex = updatedImages.length > 0 ? 0 : -1;
    } else if (index < mainImageIndex) {
      // Removed an image before the main image, adjust index
      newMainIndex = mainImageIndex - 1;
    }

    onChange(updatedImages, newMainIndex);
  };

  const handleSetMainImage = (index: number) => {
    onChange(images, index);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Images (up to 5)</Label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Upload images of your figure. Images are automatically compressed to save storage space.
        </p>
        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
          ✓ Auto-compression enabled (target: 500KB per image)
        </p>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((imageUrl, index) => (
            <div
              key={index}
              className="relative group border-2 rounded-lg overflow-hidden"
              style={{
                borderColor: index === mainImageIndex ? '#3b82f6' : 'transparent',
              }}
            >
              <img
                src={imageUrl}
                alt={`Figure image ${index + 1}`}
                className="w-full h-40 object-cover"
              />

              {/* Main Image Badge */}
              {index === mainImageIndex && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Main
                </div>
              )}

              {/* Overlay with controls */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg">
                    <Checkbox
                      id={`main-${index}`}
                      checked={index === mainImageIndex}
                      onCheckedChange={() => handleSetMainImage(index)}
                    />
                    <Label
                      htmlFor={`main-${index}`}
                      className="text-xs cursor-pointer whitespace-nowrap"
                    >
                      Main Image
                    </Label>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Image Position Adjustment */}
      {images.length > 0 && mainImageIndex >= 0 && onPositionChange && (
        <ImagePositionAdjuster
          imageUrl={images[mainImageIndex]}
          position={imagePosition}
          onPositionChange={onPositionChange}
        />
      )}

      {/* Upload Button */}
      {images.length < 5 && (
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={handleUploadClick}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : `Upload Images (${images.length}/5)`}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {images.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            No images uploaded yet
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            JPG, PNG, GIF - images will be automatically compressed
          </p>
        </div>
      )}
    </div>
  );
}

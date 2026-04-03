import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Upload, X, User as UserIcon } from 'lucide-react';
import type { User } from '../types/user';

interface ProfileImageEditorProps {
  user: User;
  open: boolean;
  onClose: () => void;
  onSave: (imageData: string | null) => void;
}

export function ProfileImageEditor({ user, open, onClose, onSave }: ProfileImageEditorProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState({ x: 0.25, y: 0.25, size: 0.5 }); // Percentages (0-1)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragStart({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / rect.width;
    const mouseY = (e.clientY - rect.top) / rect.height;

    const deltaX = mouseX - dragStart.x;
    const deltaY = mouseY - dragStart.y;

    const newX = Math.max(0, Math.min(cropArea.x + deltaX, 1 - cropArea.size));
    const newY = Math.max(0, Math.min(cropArea.y + deltaY, 1 - cropArea.size));

    setCropArea({ x: newX, y: newY, size: cropArea.size });
    setDragStart({ x: mouseX, y: mouseY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getCroppedImage = (): string => {
    if (!selectedImage || !canvasRef.current || !imageRef.current) return '';

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const img = imageRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // Calculate crop dimensions in pixels
    const cropX = cropArea.x * naturalWidth;
    const cropY = cropArea.y * naturalHeight;
    const cropSize = cropArea.size * Math.min(naturalWidth, naturalHeight);

    // Set canvas to 128x128 (profile image size)
    canvas.width = 128;
    canvas.height = 128;

    // Draw the cropped portion
    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropSize,
      cropSize,
      0,
      0,
      128,
      128
    );

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleSave = () => {
    if (selectedImage) {
      const croppedImage = getCroppedImage();
      onSave(croppedImage);
    }
    onClose();
  };

  const handleRemove = () => {
    onSave(null);
    onClose();
  };

  const handleCancel = () => {
    setSelectedImage(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Profile Image</DialogTitle>
          <DialogDescription>
            Upload an image and adjust the crop area. The image will be resized to a square.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedImage ? (
            <div className="space-y-4">
              {/* Current Image Preview */}
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {user.profileImage ? 'Current profile image' : 'No profile image set'}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => fileInputRef.current?.click()} size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      {user.profileImage ? 'Change Image' : 'Upload Image'}
                    </Button>
                    {user.profileImage && (
                      <Button onClick={handleRemove} variant="outline" size="sm">
                        <X className="h-4 w-4 mr-2" />
                        Remove Image
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Crop Editor */}
              <div
                ref={containerRef}
                className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img
                  ref={imageRef}
                  src={selectedImage}
                  alt="Preview"
                  className="max-w-full max-h-96 mx-auto block"
                />
                <div
                  className="absolute border-4 border-blue-500 cursor-move"
                  style={{
                    left: `${cropArea.x * 100}%`,
                    top: `${cropArea.y * 100}%`,
                    width: `${cropArea.size * 100}%`,
                    height: `${cropArea.size * 100}%`,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                  }}
                  onMouseDown={handleMouseDown}
                />
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Drag the blue square to adjust the crop area
              </p>

              {/* Preview */}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                    {selectedImage && (
                      <img
                        src={getCroppedImage()}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Hidden canvas for cropping */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button onClick={handleCancel} variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save Profile Image
                </Button>
              </div>
            </div>
          )}

          {/* Close button if no image selected */}
          {!selectedImage && (
            <div className="flex justify-end">
              <Button onClick={handleCancel} variant="outline">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

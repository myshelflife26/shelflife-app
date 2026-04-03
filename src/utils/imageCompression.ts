/**
 * Image compression utilities to reduce storage usage
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0
  targetSizeKB?: number; // Target size in kilobytes
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.85,
  targetSizeKB: 500 // Target 500KB per image
};

export class ImageCompressionService {
  /**
   * Compress an image to reduce storage size
   * @param base64Image Base64 encoded image string
   * @param options Compression options
   * @returns Compressed base64 image string
   */
  static async compressImage(
    base64Image: string,
    options: CompressionOptions = {}
  ): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img;
          const maxWidth = opts.maxWidth || width;
          const maxHeight = opts.maxHeight || height;

          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;

            if (width > height) {
              width = maxWidth;
              height = width / aspectRatio;
            } else {
              height = maxHeight;
              width = height * aspectRatio;
            }
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Try different quality levels if targetSizeKB is specified
          let quality = opts.quality || 0.85;
          let compressed = canvas.toDataURL('image/jpeg', quality);

          if (opts.targetSizeKB) {
            const targetBytes = opts.targetSizeKB * 1024;
            let attempts = 0;
            const maxAttempts = 5;

            while (this.getBase64Size(compressed) > targetBytes && attempts < maxAttempts) {
              quality -= 0.1;
              if (quality < 0.3) break; // Don't go below 30% quality
              compressed = canvas.toDataURL('image/jpeg', quality);
              attempts++;
            }
          }

          resolve(compressed);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = base64Image;
    });
  }

  /**
   * Get the size of a base64 encoded string in bytes
   */
  static getBase64Size(base64: string): number {
    // Remove data URL prefix if present
    const base64Data = base64.split(',')[1] || base64;

    // Calculate size (base64 is ~4/3 the size of original)
    const padding = (base64Data.match(/=/g) || []).length;
    return (base64Data.length * 3) / 4 - padding;
  }

  /**
   * Get human-readable size from base64 string
   */
  static getReadableSize(base64: string): string {
    const bytes = this.getBase64Size(base64);
    const kb = bytes / 1024;
    const mb = kb / 1024;

    if (mb >= 1) {
      return `${mb.toFixed(2)}MB`;
    } else {
      return `${kb.toFixed(2)}KB`;
    }
  }

  /**
   * Compress multiple images
   */
  static async compressImages(
    images: string[],
    options: CompressionOptions = {}
  ): Promise<string[]> {
    const compressed: string[] = [];

    for (const image of images) {
      try {
        const compressedImage = await this.compressImage(image, options);
        compressed.push(compressedImage);
      } catch (error) {
        console.error('Error compressing image:', error);
        // Keep original if compression fails
        compressed.push(image);
      }
    }

    return compressed;
  }

  /**
   * Check if an image needs compression
   */
  static needsCompression(base64: string, maxSizeKB: number = 500): boolean {
    const sizeKB = this.getBase64Size(base64) / 1024;
    return sizeKB > maxSizeKB;
  }
}

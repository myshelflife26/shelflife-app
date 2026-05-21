// Image optimization and compression utilities

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'jpeg' | 'webp' | 'png' | 'auto';
  maintainAspectRatio?: boolean;
  enableProgressive?: boolean;
}

export interface OptimizedImage {
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
  format: string;
}

class ImageOptimizationService {
  private readonly DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85,
    format: 'auto',
    maintainAspectRatio: true,
    enableProgressive: true,
  };

  // Browser capabilities cache
  private supportsWebP: boolean | null = null;
  private supportsAVIF: boolean | null = null;

  async optimizeImage(
    file: File | Blob,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    // Check if optimization is needed
    if (file.size < 50 * 1024) { // Skip files smaller than 50KB
      const dataUrl = await this.blobToDataUrl(file);
      const dimensions = await this.getImageDimensions(file);

      return {
        blob: file,
        dataUrl,
        originalSize: file.size,
        optimizedSize: file.size,
        compressionRatio: 1,
        width: dimensions.width,
        height: dimensions.height,
        format: file.type,
      };
    }

    try {
      // Create image element
      const img = await this.createImageFromBlob(file);

      // Calculate optimal dimensions
      const { width, height } = this.calculateDimensions(
        img.naturalWidth,
        img.naturalHeight,
        opts
      );

      // Determine optimal format
      const outputFormat = await this.determineOptimalFormat(file.type, opts.format);

      // Create canvas and draw image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      canvas.width = width;
      canvas.height = height;

      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob with compression
      const optimizedBlob = await this.canvasToBlob(canvas, outputFormat, opts.quality);
      const dataUrl = await this.blobToDataUrl(optimizedBlob);

      // Calculate compression ratio
      const compressionRatio = file.size / optimizedBlob.size;

      return {
        blob: optimizedBlob,
        dataUrl,
        originalSize: file.size,
        optimizedSize: optimizedBlob.size,
        compressionRatio,
        width,
        height,
        format: outputFormat,
      };

    } catch (error) {
      console.error('Image optimization failed:', error);

      // Fallback: return original file
      const dataUrl = await this.blobToDataUrl(file);
      const dimensions = await this.getImageDimensions(file);

      return {
        blob: file,
        dataUrl,
        originalSize: file.size,
        optimizedSize: file.size,
        compressionRatio: 1,
        width: dimensions.width,
        height: dimensions.height,
        format: file.type,
      };
    }
  }

  async optimizeMultipleImages(
    files: (File | Blob)[],
    options: ImageOptimizationOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<OptimizedImage[]> {
    const results: OptimizedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const optimized = await this.optimizeImage(files[i], options);
      results.push(optimized);

      if (onProgress) {
        onProgress((i + 1) / files.length);
      }
    }

    return results;
  }

  // Create responsive image variants
  async createResponsiveVariants(
    file: File | Blob,
    breakpoints: number[] = [320, 640, 768, 1024, 1280, 1920]
  ): Promise<{ [key: string]: OptimizedImage }> {
    const variants: { [key: string]: OptimizedImage } = {};

    for (const width of breakpoints) {
      const optimized = await this.optimizeImage(file, {
        maxWidth: width,
        quality: this.getQualityForBreakpoint(width),
        format: 'auto',
      });

      variants[`w${width}`] = optimized;
    }

    return variants;
  }

  // Get optimal quality based on breakpoint
  private getQualityForBreakpoint(width: number): number {
    if (width <= 320) return 0.75;
    if (width <= 640) return 0.80;
    if (width <= 1024) return 0.85;
    return 0.90;
  }

  private async createImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    options: Required<ImageOptimizationOptions>
  ): { width: number; height: number } {
    const { maxWidth, maxHeight, maintainAspectRatio } = options;

    if (!maintainAspectRatio) {
      return {
        width: Math.min(originalWidth, maxWidth),
        height: Math.min(originalHeight, maxHeight),
      };
    }

    const aspectRatio = originalWidth / originalHeight;

    let width = originalWidth;
    let height = originalHeight;

    // Scale down if needed
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  private async determineOptimalFormat(
    originalFormat: string,
    preferredFormat: string
  ): Promise<string> {
    if (preferredFormat !== 'auto') {
      return `image/${preferredFormat}`;
    }

    // Check browser support for modern formats
    const supportsWebP = await this.checkWebPSupport();
    const supportsAVIF = await this.checkAVIFSupport();

    // Prefer modern formats for better compression
    if (supportsAVIF) {
      return 'image/avif';
    }

    if (supportsWebP) {
      return 'image/webp';
    }

    // Fallback based on original format
    if (originalFormat === 'image/png' && this.hasTransparency()) {
      return 'image/png';
    }

    return 'image/jpeg';
  }

  private async checkWebPSupport(): Promise<boolean> {
    if (this.supportsWebP !== null) {
      return this.supportsWebP;
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;

      canvas.toBlob((blob) => {
        this.supportsWebP = blob !== null;
        resolve(this.supportsWebP);
      }, 'image/webp');
    });
  }

  private async checkAVIFSupport(): Promise<boolean> {
    if (this.supportsAVIF !== null) {
      return this.supportsAVIF;
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;

      try {
        canvas.toBlob((blob) => {
          this.supportsAVIF = blob !== null;
          resolve(this.supportsAVIF);
        }, 'image/avif');
      } catch {
        this.supportsAVIF = false;
        resolve(false);
      }
    });
  }

  private hasTransparency(): boolean {
    // This would need more sophisticated detection in a real implementation
    // For now, assume PNG files might have transparency
    return true;
  }

  private async canvasToBlob(
    canvas: HTMLCanvasElement,
    format: string,
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        format,
        quality
      );
    });
  }

  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
    const img = await this.createImageFromBlob(blob);
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  }

  // Utility method to estimate file size after compression
  estimateCompressedSize(
    originalSize: number,
    format: string,
    quality: number
  ): number {
    const baseCompressionRatio = this.getBaseCompressionRatio(format);
    const qualityFactor = Math.pow(quality, 1.5);

    return Math.round(originalSize * baseCompressionRatio * qualityFactor);
  }

  private getBaseCompressionRatio(format: string): number {
    switch (format) {
      case 'image/avif':
        return 0.15; // AVIF typically achieves ~85% reduction
      case 'image/webp':
        return 0.25; // WebP typically achieves ~75% reduction
      case 'image/jpeg':
        return 0.40; // JPEG typically achieves ~60% reduction
      case 'image/png':
        return 0.60; // PNG typically achieves ~40% reduction
      default:
        return 0.50;
    }
  }

  // Check if image needs optimization based on size and dimensions
  shouldOptimize(file: File, maxSizeKB: number = 500): boolean {
    const sizeKB = file.size / 1024;
    return sizeKB > maxSizeKB || !this.isOptimalFormat(file.type);
  }

  private isOptimalFormat(mimeType: string): boolean {
    const optimalFormats = ['image/webp', 'image/avif'];
    return optimalFormats.includes(mimeType);
  }

  // Progressive loading placeholder generator
  async generatePlaceholder(
    file: File | Blob,
    size: number = 20
  ): Promise<string> {
    const placeholder = await this.optimizeImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality: 0.3,
      format: 'jpeg',
    });

    return placeholder.dataUrl;
  }

  // Create a blurred thumbnail for progressive loading
  async createBlurredThumbnail(
    file: File | Blob,
    blurAmount: number = 10
  ): Promise<string> {
    const img = await this.createImageFromBlob(file);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Create small thumbnail
    canvas.width = 40;
    canvas.height = 40;

    // Apply blur filter
    ctx.filter = `blur(${blurAmount}px)`;
    ctx.drawImage(img, 0, 0, 40, 40);

    return canvas.toDataURL('image/jpeg', 0.3);
  }
}

// Create singleton instance
export const imageOptimization = new ImageOptimizationService();

// React hook for image optimization
export const useImageOptimization = () => {
  const [isOptimizing, setIsOptimizing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const optimizeImage = React.useCallback(
    async (file: File | Blob, options?: ImageOptimizationOptions) => {
      setIsOptimizing(true);
      setProgress(0);

      try {
        const result = await imageOptimization.optimizeImage(file, options);
        setProgress(100);
        return result;
      } finally {
        setTimeout(() => {
          setIsOptimizing(false);
          setProgress(0);
        }, 500);
      }
    },
    []
  );

  const optimizeMultiple = React.useCallback(
    async (files: (File | Blob)[], options?: ImageOptimizationOptions) => {
      setIsOptimizing(true);
      setProgress(0);

      try {
        return await imageOptimization.optimizeMultipleImages(
          files,
          options,
          setProgress
        );
      } finally {
        setTimeout(() => {
          setIsOptimizing(false);
          setProgress(0);
        }, 500);
      }
    },
    []
  );

  return {
    optimizeImage,
    optimizeMultiple,
    isOptimizing,
    progress,
  };
};

import React from 'react';

export default imageOptimization;
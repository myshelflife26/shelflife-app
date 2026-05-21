import { ref, uploadString, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage';
import { storage } from '../config/firebase';
import { ImageCompressionService } from './imageCompression';
import { imageOptimization, type ImageOptimizationOptions } from './imageOptimization';

export class ImageUploadService {
  /**
   * Upload an image to Firebase Storage and return the download URL
   * @param base64Image Base64 encoded image string
   * @param userId User ID for organizing storage
   * @param figureId Figure ID for organizing storage
   * @param imageIndex Index of the image (0-4)
   * @returns Download URL for the uploaded image
   */
  static async uploadImage(
    base64Image: string,
    userId: string,
    figureId: string,
    imageIndex: number
  ): Promise<string> {
    try {
      // Generate a unique path for the image
      const timestamp = Date.now();
      const imagePath = `figures/${userId}/${figureId}/image_${imageIndex}_${timestamp}.jpg`;
      const storageRef = ref(storage, imagePath);

      // Upload the base64 string to Firebase Storage
      await uploadString(storageRef, base64Image, 'data_url');

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    } catch (error) {
      console.error('Error uploading image to Firebase Storage:', error);
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Upload multiple images to Firebase Storage
   * @param base64Images Array of base64 encoded image strings
   * @param userId User ID for organizing storage
   * @param figureId Figure ID for organizing storage
   * @returns Array of download URLs
   */
  static async uploadImages(
    base64Images: string[],
    userId: string,
    figureId: string
  ): Promise<string[]> {
    const uploadPromises = base64Images.map((base64Image, index) =>
      this.uploadImage(base64Image, userId, figureId, index)
    );

    return await Promise.all(uploadPromises);
  }

  /**
   * Delete an image from Firebase Storage
   * @param imageUrl Download URL or storage path
   */
  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      // If it's a Firebase Storage URL, extract the path
      if (imageUrl.includes('firebasestorage.googleapis.com')) {
        // Extract the path from the URL
        const url = new URL(imageUrl);
        const pathMatch = url.pathname.match(/\/o\/(.+)\?/);

        if (pathMatch && pathMatch[1]) {
          const path = decodeURIComponent(pathMatch[1]);
          const storageRef = ref(storage, path);
          await deleteObject(storageRef);
          console.log(`Deleted image from Firebase Storage: ${path}`);
        }
      }
      // If it's a base64 string or data URL, no deletion needed (not in Storage)
    } catch (error) {
      console.error('Error deleting image from Firebase Storage:', error);
      // Don't throw - failing to delete an image shouldn't break the flow
    }
  }

  /**
   * Delete multiple images from Firebase Storage
   * @param imageUrls Array of download URLs or storage paths
   */
  static async deleteImages(imageUrls: string[]): Promise<void> {
    const deletePromises = imageUrls.map(url => this.deleteImage(url));
    await Promise.all(deletePromises);
  }

  /**
   * Check if a string is a Firebase Storage URL (not base64)
   * @param imageString Image string to check
   * @returns True if it's a Storage URL, false if it's base64
   */
  static isStorageUrl(imageString: string): boolean {
    return imageString.startsWith('http://') || imageString.startsWith('https://');
  }

  /**
   * Migrate base64 images to Firebase Storage
   * Used for converting existing figures from base64 to Storage URLs
   * @param base64Images Array of base64 encoded images
   * @param userId User ID
   * @param figureId Figure ID
   * @returns Array of download URLs
   */
  static async migrateImagesToStorage(
    base64Images: string[],
    userId: string,
    figureId: string
  ): Promise<string[]> {
    // Filter out any that are already URLs
    const imagesToMigrate = base64Images.filter(img => !this.isStorageUrl(img));

    if (imagesToMigrate.length === 0) {
      // All images are already URLs
      return base64Images;
    }

    // Keep track of which were already URLs
    const migratedUrls: string[] = [];
    let uploadIndex = 0;

    for (const image of base64Images) {
      if (this.isStorageUrl(image)) {
        // Already a URL, keep it
        migratedUrls.push(image);
      } else {
        // Upload to Storage
        const url = await this.uploadImage(image, userId, figureId, uploadIndex);
        migratedUrls.push(url);
        uploadIndex++;
      }
    }

    return migratedUrls;
  }

  /**
   * Upload an optimized image file to Firebase Storage
   * @param file Image file to optimize and upload
   * @param userId User ID for organizing storage
   * @param figureId Figure ID for organizing storage
   * @param imageIndex Index of the image (0-4)
   * @param options Optimization options
   * @returns Object containing download URL and optimization stats
   */
  static async uploadOptimizedImage(
    file: File,
    userId: string,
    figureId: string,
    imageIndex: number,
    options: ImageOptimizationOptions = {}
  ): Promise<{
    downloadUrl: string;
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    format: string;
  }> {
    try {
      // Optimize the image
      const optimized = await imageOptimization.optimizeImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        format: 'auto',
        ...options,
      });

      // Generate a unique path for the image
      const timestamp = Date.now();
      const extension = this.getExtensionFromMimeType(optimized.format);
      const imagePath = `figures/${userId}/${figureId}/image_${imageIndex}_${timestamp}.${extension}`;
      const storageRef = ref(storage, imagePath);

      // Upload the optimized blob
      await uploadBytes(storageRef, optimized.blob);

      // Get the download URL
      const downloadUrl = await getDownloadURL(storageRef);

      console.log(`Image optimized: ${optimized.originalSize} → ${optimized.optimizedSize} bytes (${Math.round(optimized.compressionRatio * 100) / 100}x compression)`);

      return {
        downloadUrl,
        originalSize: optimized.originalSize,
        optimizedSize: optimized.optimizedSize,
        compressionRatio: optimized.compressionRatio,
        format: optimized.format,
      };
    } catch (error) {
      console.error('Error uploading optimized image:', error);
      throw new Error('Failed to upload optimized image');
    }
  }

  /**
   * Upload multiple optimized images with progress tracking
   * @param files Array of image files to optimize and upload
   * @param userId User ID for organizing storage
   * @param figureId Figure ID for organizing storage
   * @param options Optimization options
   * @param onProgress Progress callback (0-1)
   * @returns Array of upload results
   */
  static async uploadOptimizedImages(
    files: File[],
    userId: string,
    figureId: string,
    options: ImageOptimizationOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<Array<{
    downloadUrl: string;
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    format: string;
  }>> {
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const result = await this.uploadOptimizedImage(files[i], userId, figureId, i, options);
      results.push(result);

      if (onProgress) {
        onProgress((i + 1) / files.length);
      }
    }

    return results;
  }

  /**
   * Create responsive image variants for better performance
   * @param file Original image file
   * @param userId User ID for organizing storage
   * @param figureId Figure ID for organizing storage
   * @param imageIndex Index of the image
   * @returns Object with different sized variants
   */
  static async uploadResponsiveVariants(
    file: File,
    userId: string,
    figureId: string,
    imageIndex: number
  ): Promise<{
    original: string;
    large: string;
    medium: string;
    small: string;
    thumbnail: string;
  }> {
    try {
      const timestamp = Date.now();
      const baseImagePath = `figures/${userId}/${figureId}/image_${imageIndex}_${timestamp}`;

      // Define variants
      const variants = [
        { name: 'original', maxWidth: 1920, quality: 0.90 },
        { name: 'large', maxWidth: 1200, quality: 0.85 },
        { name: 'medium', maxWidth: 800, quality: 0.80 },
        { name: 'small', maxWidth: 400, quality: 0.75 },
        { name: 'thumbnail', maxWidth: 150, quality: 0.70 },
      ];

      const uploadPromises = variants.map(async (variant) => {
        const optimized = await imageOptimization.optimizeImage(file, {
          maxWidth: variant.maxWidth,
          quality: variant.quality,
          format: 'auto',
        });

        const extension = this.getExtensionFromMimeType(optimized.format);
        const imagePath = `${baseImagePath}_${variant.name}.${extension}`;
        const storageRef = ref(storage, imagePath);

        await uploadBytes(storageRef, optimized.blob);
        return await getDownloadURL(storageRef);
      });

      const [original, large, medium, small, thumbnail] = await Promise.all(uploadPromises);

      return {
        original,
        large,
        medium,
        small,
        thumbnail,
      };
    } catch (error) {
      console.error('Error uploading responsive variants:', error);
      throw new Error('Failed to upload responsive variants');
    }
  }

  /**
   * Convert base64 image to optimized upload
   * @param base64Image Base64 encoded image
   * @param userId User ID
   * @param figureId Figure ID
   * @param imageIndex Index of the image
   * @param options Optimization options
   * @returns Upload result with optimization stats
   */
  static async uploadBase64WithOptimization(
    base64Image: string,
    userId: string,
    figureId: string,
    imageIndex: number,
    options: ImageOptimizationOptions = {}
  ): Promise<{
    downloadUrl: string;
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    format: string;
  }> {
    try {
      // Convert base64 to blob
      const response = await fetch(base64Image);
      const blob = await response.blob();

      // Create a File object from the blob
      const file = new File([blob], `image_${imageIndex}.jpg`, { type: blob.type });

      // Use the optimized upload method
      return await this.uploadOptimizedImage(file, userId, figureId, imageIndex, options);
    } catch (error) {
      console.error('Error converting and uploading base64 image:', error);
      throw new Error('Failed to upload base64 image with optimization');
    }
  }

  /**
   * Get file extension from MIME type
   * @param mimeType MIME type string
   * @returns File extension
   */
  private static getExtensionFromMimeType(mimeType: string): string {
    const mimeToExtension: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/avif': 'avif',
    };

    return mimeToExtension[mimeType] || 'jpg';
  }

  /**
   * Batch optimize and migrate existing images
   * @param userId User ID
   * @param figureId Figure ID
   * @param imageUrls Current image URLs
   * @returns Optimized image URLs
   */
  static async optimizeExistingImages(
    userId: string,
    figureId: string,
    imageUrls: string[]
  ): Promise<string[]> {
    const optimizedUrls: string[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];

      try {
        if (this.isStorageUrl(imageUrl)) {
          // Download, optimize, and re-upload
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const file = new File([blob], `existing_image_${i}.jpg`, { type: blob.type });

          const result = await this.uploadOptimizedImage(file, userId, figureId, i);
          optimizedUrls.push(result.downloadUrl);

          // Delete the old image (optional)
          await this.deleteImage(imageUrl);
        } else {
          // Base64 image - convert and optimize
          const result = await this.uploadBase64WithOptimization(imageUrl, userId, figureId, i);
          optimizedUrls.push(result.downloadUrl);
        }
      } catch (error) {
        console.error(`Failed to optimize image ${i}:`, error);
        // Keep the original URL if optimization fails
        optimizedUrls.push(imageUrl);
      }
    }

    return optimizedUrls;
  }
}

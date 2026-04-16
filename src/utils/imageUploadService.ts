import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';
import { ImageCompressionService } from './imageCompression';

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
}

import type { AppSettings, CustomField } from '../types/index';
import { FirebaseAuthService } from './firebaseAuth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const SYSTEM_SETTINGS_KEY = 'app-settings-system';
const USER_SETTINGS_KEY_PREFIX = 'app-settings-user';
const USERS_COLLECTION = 'users';

const DEFAULT_SYSTEM_SETTINGS = {
  conditionOptions: ['MIB', 'Loose', 'Custom'],
  categoryOptions: ['Action Figure', 'Vehicle', 'Playset', 'Accessory Pack'],
  manufacturerOptions: ['Hasbro', 'Mattel', 'Kenner', 'Toy Biz', 'McFarlane Toys'],
  franchiseOptions: ['G.I. Joe', 'Star Wars', 'Masters of the Universe', 'Transformers', 'Marvel', 'DC Comics'],
  seriesOptions: ['A Real American Hero', 'Sigma 6', 'Classified', '25th Anniversary', 'Vintage Collection'],
  versionOptions: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'V18', 'V19', 'V20', 'V21', 'V22', 'V23', 'V24', 'V25', 'V26', 'V27', 'V28', 'V29', 'V30'],
  sizeOptions: ['3.75"', '6"', '7"', '12"'],
  packagingOptions: ['Individual', 'with Vehicle', 'Multi-pack']
};

const DEFAULT_USER_SETTINGS = {
  customFields: [],
  visibleColumns: {
    image: true,
    name: true,
    manufacturer: true,
    category: true,
    condition: true,
    size: true,
    packaging: true,
    currentValue: true,
    purchaseDate: true,
    location: true,
    availability: true,
    completeness: true
  }
};

export class SettingsService {
  private static getUserSettingsKey(userId?: string): string {
    const id = userId || FirebaseAuthService.getCurrentUserId() || 'default';
    return `${USER_SETTINGS_KEY_PREFIX}-${id}`;
  }

  private static getSystemSettings() {
    try {
      const data = localStorage.getItem(SYSTEM_SETTINGS_KEY);
      if (data) {
        const settings = JSON.parse(data);
        return {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...settings
        };
      }
      return DEFAULT_SYSTEM_SETTINGS;
    } catch (error) {
      console.error('Error reading system settings:', error);
      return DEFAULT_SYSTEM_SETTINGS;
    }
  }

  private static saveSystemSettings(settings: typeof DEFAULT_SYSTEM_SETTINGS): void {
    try {
      localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving system settings:', error);
    }
  }

  private static async getUserSettings(userId?: string) {
    try {
      const id = userId || FirebaseAuthService.getCurrentUserId();
      if (!id) {
        console.log(`[GET_USER_SETTINGS] No user ID, returning defaults`);
        return JSON.parse(JSON.stringify(DEFAULT_USER_SETTINGS));
      }

      console.log(`[GET_USER_SETTINGS] Getting settings from Firestore for userId: ${id}`);

      const userDoc = await getDoc(doc(db, USERS_COLLECTION, id));
      if (!userDoc.exists()) {
        console.log(`[GET_USER_SETTINGS] User doc not found, returning defaults`);
        return JSON.parse(JSON.stringify(DEFAULT_USER_SETTINGS));
      }

      const data = userDoc.data();
      const settings = {
        customFields: data.customFields || [],
        visibleColumns: data.visibleColumns || DEFAULT_USER_SETTINGS.visibleColumns
      };

      console.log(`[GET_USER_SETTINGS] Found settings, customFields count: ${settings.customFields.length}`);
      return settings;
    } catch (error) {
      console.error('Error reading user settings from Firestore:', error);
      return JSON.parse(JSON.stringify(DEFAULT_USER_SETTINGS));
    }
  }

  private static async saveUserSettings(settings: typeof DEFAULT_USER_SETTINGS, userId?: string): Promise<void> {
    try {
      const id = userId || FirebaseAuthService.getCurrentUserId();
      if (!id) {
        console.error('[SAVE_USER_SETTINGS] No user ID');
        return;
      }

      console.log(`[SAVE_USER_SETTINGS] Saving to Firestore for userId: ${id}, customFields count: ${settings.customFields.length}`);

      // Helper function to remove undefined properties from an object
      const removeUndefined = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(item => removeUndefined(item));
        }
        if (obj !== null && typeof obj === 'object') {
          return Object.keys(obj).reduce((acc, key) => {
            if (obj[key] !== undefined) {
              acc[key] = removeUndefined(obj[key]);
            }
            return acc;
          }, {} as any);
        }
        return obj;
      };

      // Clean data - remove undefined values (Firebase doesn't accept them)
      const dataToSave: any = {
        customFields: removeUndefined(settings.customFields || [])
      };

      // Only add visibleColumns if it's defined
      if (settings.visibleColumns !== undefined) {
        dataToSave.visibleColumns = settings.visibleColumns;
      } else {
        dataToSave.visibleColumns = DEFAULT_USER_SETTINGS.visibleColumns;
      }

      // Use setDoc with merge: true to create the document if it doesn't exist
      await setDoc(doc(db, USERS_COLLECTION, id), dataToSave, { merge: true });

      console.log(`[SAVE_USER_SETTINGS] Saved successfully`);
    } catch (error) {
      console.error('Error saving user settings to Firestore:', error);
      throw error; // Re-throw so caller knows it failed
    }
  }

  static async getSettings(userId?: string): Promise<AppSettings> {
    const systemSettings = this.getSystemSettings();
    const userSettings = await this.getUserSettings(userId);
    return {
      ...systemSettings,
      ...userSettings
    };
  }

  // System settings (Management only)
  static addConditionOption(option: string): void {
    const settings = this.getSystemSettings();
    if (!settings.conditionOptions.includes(option)) {
      settings.conditionOptions.push(option);
      this.saveSystemSettings(settings);
    }
  }

  static removeConditionOption(option: string): void {
    const settings = this.getSystemSettings();
    settings.conditionOptions = settings.conditionOptions.filter(o => o !== option);
    this.saveSystemSettings(settings);
  }

  static addCategoryOption(option: string): void {
    const settings = this.getSystemSettings();
    if (!settings.categoryOptions.includes(option)) {
      settings.categoryOptions.push(option);
      this.saveSystemSettings(settings);
    }
  }

  static removeCategoryOption(option: string): void {
    const settings = this.getSystemSettings();
    settings.categoryOptions = settings.categoryOptions.filter(o => o !== option);
    this.saveSystemSettings(settings);
  }

  static addManufacturerOption(option: string): void {
    const settings = this.getSystemSettings();
    if (!settings.manufacturerOptions.includes(option)) {
      settings.manufacturerOptions.push(option);
      this.saveSystemSettings(settings);
    }
  }

  static removeManufacturerOption(option: string): void {
    const settings = this.getSystemSettings();
    settings.manufacturerOptions = settings.manufacturerOptions.filter(o => o !== option);
    this.saveSystemSettings(settings);
  }

  static addFranchiseOption(option: string): void {
    const settings = this.getSystemSettings();
    if (!settings.franchiseOptions.includes(option)) {
      settings.franchiseOptions.push(option);
      this.saveSystemSettings(settings);
    }
  }

  static removeFranchiseOption(option: string): void {
    const settings = this.getSystemSettings();
    settings.franchiseOptions = settings.franchiseOptions.filter(o => o !== option);
    this.saveSystemSettings(settings);
  }

  static addSeriesOption(option: string): void {
    const settings = this.getSystemSettings();
    if (!settings.seriesOptions.includes(option)) {
      settings.seriesOptions.push(option);
      this.saveSystemSettings(settings);
    }
  }

  static removeSeriesOption(option: string): void {
    const settings = this.getSystemSettings();
    settings.seriesOptions = settings.seriesOptions.filter(o => o !== option);
    this.saveSystemSettings(settings);
  }

  static addVersionOption(option: string): void {
    const settings = this.getSystemSettings();
    if (!settings.versionOptions.includes(option)) {
      settings.versionOptions.push(option);
      this.saveSystemSettings(settings);
    }
  }

  static removeVersionOption(option: string): void {
    const settings = this.getSystemSettings();
    settings.versionOptions = settings.versionOptions.filter(o => o !== option);
    this.saveSystemSettings(settings);
  }

  static addSizeOption(option: string): void {
    const settings = this.getSystemSettings();
    if (!settings.sizeOptions.includes(option)) {
      settings.sizeOptions.push(option);
      this.saveSystemSettings(settings);
    }
  }

  static removeSizeOption(option: string): void {
    const settings = this.getSystemSettings();
    settings.sizeOptions = settings.sizeOptions.filter(o => o !== option);
    this.saveSystemSettings(settings);
  }

  static addPackagingOption(option: string): void {
    const settings = this.getSystemSettings();
    if (!settings.packagingOptions.includes(option)) {
      settings.packagingOptions.push(option);
      this.saveSystemSettings(settings);
    }
  }

  static removePackagingOption(option: string): void {
    const settings = this.getSystemSettings();
    settings.packagingOptions = settings.packagingOptions.filter(o => o !== option);
    this.saveSystemSettings(settings);
  }

  // Custom Fields Management (User-specific)
  static async addCustomField(field: Omit<CustomField, 'id'>, userId?: string): Promise<CustomField> {
    const actualUserId = userId || FirebaseAuthService.getCurrentUserId();

    console.log('[ADD_CUSTOM_FIELD] Adding field:', field.name);
    console.log('[ADD_CUSTOM_FIELD] User ID:', actualUserId);
    console.log('[ADD_CUSTOM_FIELD] Will save to Firestore');

    const settings = await this.getUserSettings(userId);
    const newField: CustomField = {
      ...field,
      id: crypto.randomUUID()
    };
    settings.customFields.push(newField);
    await this.saveUserSettings(settings, userId);

    console.log('[ADD_CUSTOM_FIELD] Saved successfully');
    return newField;
  }

  static async updateCustomField(id: string, field: Partial<Omit<CustomField, 'id'>>, userId?: string): Promise<void> {
    const settings = await this.getUserSettings(userId);
    const index = settings.customFields.findIndex(f => f.id === id);
    if (index !== -1) {
      settings.customFields[index] = {
        ...settings.customFields[index],
        ...field
      };
      await this.saveUserSettings(settings, userId);
    }
  }

  static async removeCustomField(id: string, userId?: string): Promise<void> {
    const settings = await this.getUserSettings(userId);
    settings.customFields = settings.customFields.filter(f => f.id !== id);
    await this.saveUserSettings(settings, userId);
  }

  // Admin-only: Get all custom fields from all users
  static async getAllUsersCustomFields(): Promise<Array<{ userId: string; username: string; displayName: string; fields: CustomField[] }>> {
    try {
      // Get all users from Firebase
      const users = await FirebaseAuthService.getAllUsers();

      console.log('[GET_ALL_USERS_FIELDS] Found users:', users.map(u => u.username));

      const results = await Promise.all(users.map(async (user) => {
        const key = `${USER_SETTINGS_KEY_PREFIX}-${user.id}`;
        console.log(`[GET_ALL_USERS_FIELDS] Getting settings for ${user.username} (${user.id}) from key: ${key}`);

        const userSettings = await this.getUserSettings(user.id);
        console.log(`[GET_ALL_USERS_FIELDS] ${user.username} has ${userSettings.customFields.length} fields:`, userSettings.customFields.map(f => f.name));

        return {
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          fields: userSettings.customFields
        };
      }));

      return results;
    } catch (error) {
      console.error('Error loading all users custom fields:', error);
      return [];
    }
  }

  // Admin-only: Delete custom field from specific user
  static async deleteCustomFieldForUser(userId: string, fieldId: string): Promise<void> {
    const settings = await this.getUserSettings(userId);
    settings.customFields = settings.customFields.filter(f => f.id !== fieldId);
    await this.saveUserSettings(settings, userId);
  }

  // Column Visibility Management (User-specific)
  static async updateColumnVisibility(columnId: string, visible: boolean, userId?: string): Promise<void> {
    const settings = await this.getUserSettings(userId);
    if (!settings.visibleColumns) {
      settings.visibleColumns = { ...DEFAULT_USER_SETTINGS.visibleColumns };
    }
    settings.visibleColumns[columnId] = visible;
    await this.saveUserSettings(settings, userId);
  }

  static async getColumnVisibility(userId?: string): Promise<Record<string, boolean>> {
    const settings = await this.getUserSettings(userId);
    return settings.visibleColumns || DEFAULT_USER_SETTINGS.visibleColumns;
  }

  static resetToDefaults(): void {
    this.saveSystemSettings(DEFAULT_SYSTEM_SETTINGS);
  }

  // Bulk update all system settings at once
  static updateAllSystemSettings(settings: {
    conditionOptions: string[];
    categoryOptions: string[];
    manufacturerOptions: string[];
    franchiseOptions: string[];
    seriesOptions: string[];
    versionOptions: string[];
    sizeOptions: string[];
    packagingOptions: string[];
  }): void {
    // Validate that no array is empty
    if (settings.conditionOptions.length === 0) throw new Error('Condition options cannot be empty');
    if (settings.categoryOptions.length === 0) throw new Error('Category options cannot be empty');
    if (settings.manufacturerOptions.length === 0) throw new Error('Manufacturer options cannot be empty');
    if (settings.franchiseOptions.length === 0) throw new Error('Franchise options cannot be empty');
    if (settings.seriesOptions.length === 0) throw new Error('Series options cannot be empty');
    if (settings.versionOptions.length === 0) throw new Error('Version options cannot be empty');
    if (settings.sizeOptions.length === 0) throw new Error('Size options cannot be empty');
    if (settings.packagingOptions.length === 0) throw new Error('Packaging options cannot be empty');

    this.saveSystemSettings(settings);
  }

  // Get just the system settings (for management UI)
  static getSystemSettingsOnly() {
    return this.getSystemSettings();
  }

  // Migrate localStorage settings to Firestore
  static async migrateLocalStorageToFirestore(firebaseUid: string): Promise<void> {
    try {
      console.log(`[MIGRATION_FIRESTORE] Starting migration for user: ${firebaseUid}`);

      // Check if user already has settings in Firestore
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUid));
      if (!userDoc.exists()) {
        console.log('[MIGRATION_FIRESTORE] User doc not found');
        return;
      }

      const userData = userDoc.data();
      if (userData.customFields && userData.customFields.length > 0) {
        console.log('[MIGRATION_FIRESTORE] User already has custom fields in Firestore, skipping migration');
        return;
      }

      // Try to find localStorage settings
      const possibleKeys = [
        `${USER_SETTINGS_KEY_PREFIX}-${firebaseUid}`,
        `${USER_SETTINGS_KEY_PREFIX}-default`
      ];

      let localSettings = null;
      let foundKey = null;

      for (const key of possibleKeys) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            localSettings = JSON.parse(data);
            foundKey = key;
            break;
          } catch (e) {
            console.error(`[MIGRATION_FIRESTORE] Failed to parse ${key}:`, e);
          }
        }
      }

      if (!localSettings || !localSettings.customFields || localSettings.customFields.length === 0) {
        console.log('[MIGRATION_FIRESTORE] No localStorage custom fields to migrate');
        return;
      }

      console.log(`[MIGRATION_FIRESTORE] Found ${localSettings.customFields.length} custom fields in ${foundKey}`);
      console.log(`[MIGRATION_FIRESTORE] Migrating to Firestore...`);

      // Migrate to Firestore
      await updateDoc(doc(db, USERS_COLLECTION, firebaseUid), {
        customFields: localSettings.customFields,
        visibleColumns: localSettings.visibleColumns || DEFAULT_USER_SETTINGS.visibleColumns
      });

      console.log(`[MIGRATION_FIRESTORE] ✅ Successfully migrated to Firestore`);

      // Mark as migrated (optional - keep localStorage for now as backup)
      localStorage.setItem(`${foundKey}-migrated-to-firestore`, 'true');
    } catch (error) {
      console.error('[MIGRATION_FIRESTORE] Error during migration:', error);
    }
  }

}

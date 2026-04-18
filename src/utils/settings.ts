import type { AppSettings, CustomField } from '../types/index';
import { FirebaseAuthService } from './firebaseAuth';

const SYSTEM_SETTINGS_KEY = 'app-settings-system';
const USER_SETTINGS_KEY_PREFIX = 'app-settings-user';

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

  private static getUserSettings(userId?: string) {
    try {
      const data = localStorage.getItem(this.getUserSettingsKey(userId));
      if (data) {
        const settings = JSON.parse(data);
        return {
          ...DEFAULT_USER_SETTINGS,
          ...settings
        };
      }
      return DEFAULT_USER_SETTINGS;
    } catch (error) {
      console.error('Error reading user settings:', error);
      return DEFAULT_USER_SETTINGS;
    }
  }

  private static saveUserSettings(settings: typeof DEFAULT_USER_SETTINGS, userId?: string): void {
    try {
      localStorage.setItem(this.getUserSettingsKey(userId), JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving user settings:', error);
    }
  }

  static getSettings(userId?: string): AppSettings {
    const systemSettings = this.getSystemSettings();
    const userSettings = this.getUserSettings(userId);
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
  static addCustomField(field: Omit<CustomField, 'id'>, userId?: string): CustomField {
    const settings = this.getUserSettings(userId);
    const newField: CustomField = {
      ...field,
      id: crypto.randomUUID()
    };
    settings.customFields.push(newField);
    this.saveUserSettings(settings, userId);
    return newField;
  }

  static updateCustomField(id: string, field: Partial<Omit<CustomField, 'id'>>, userId?: string): void {
    const settings = this.getUserSettings(userId);
    const index = settings.customFields.findIndex(f => f.id === id);
    if (index !== -1) {
      settings.customFields[index] = {
        ...settings.customFields[index],
        ...field
      };
      this.saveUserSettings(settings, userId);
    }
  }

  static removeCustomField(id: string, userId?: string): void {
    const settings = this.getUserSettings(userId);
    settings.customFields = settings.customFields.filter(f => f.id !== id);
    this.saveUserSettings(settings, userId);
  }

  // Admin-only: Get all custom fields from all users
  static async getAllUsersCustomFields(): Promise<Array<{ userId: string; username: string; displayName: string; fields: CustomField[] }>> {
    try {
      // Get all users from Firebase
      const users = await FirebaseAuthService.getAllUsers();

      return users.map((user) => {
        const userSettings = this.getUserSettings(user.id);
        return {
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          fields: userSettings.customFields
        };
      });
    } catch (error) {
      console.error('Error loading all users custom fields:', error);
      return [];
    }
  }

  // Admin-only: Delete custom field from specific user
  static deleteCustomFieldForUser(userId: string, fieldId: string): void {
    const settings = this.getUserSettings(userId);
    settings.customFields = settings.customFields.filter(f => f.id !== fieldId);
    this.saveUserSettings(settings, userId);
  }

  // Column Visibility Management (User-specific)
  static updateColumnVisibility(columnId: string, visible: boolean, userId?: string): void {
    const settings = this.getUserSettings(userId);
    if (!settings.visibleColumns) {
      settings.visibleColumns = { ...DEFAULT_USER_SETTINGS.visibleColumns };
    }
    settings.visibleColumns[columnId] = visible;
    this.saveUserSettings(settings, userId);
  }

  static getColumnVisibility(userId?: string): Record<string, boolean> {
    const settings = this.getUserSettings(userId);
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

  // Migrate old user settings from old user IDs to new Firebase UIDs
  static migrateUserSettingsToFirebase(firebaseUid: string, oldUserId: string) {
    try {
      const oldKey = `${USER_SETTINGS_KEY_PREFIX}-${oldUserId}`;
      const newKey = `${USER_SETTINGS_KEY_PREFIX}-${firebaseUid}`;

      console.log(`[MIGRATION] Attempting to migrate from "${oldKey}" to "${newKey}"`);

      // Check if new key already has data
      const existingNewSettings = localStorage.getItem(newKey);
      if (existingNewSettings) {
        console.log('[MIGRATION] User settings already exist for Firebase UID, skipping migration');
        console.log('[MIGRATION] Existing data:', existingNewSettings);
        return;
      }

      // Get old settings
      const oldSettings = localStorage.getItem(oldKey);
      if (!oldSettings) {
        console.log('[MIGRATION] No old settings found for key:', oldKey);
        console.log('[MIGRATION] Available keys:', Object.keys(localStorage).filter(k => k.includes('app-settings')));
        return;
      }

      console.log('[MIGRATION] Found old settings:', oldSettings);

      // Copy to new key
      localStorage.setItem(newKey, oldSettings);
      console.log(`[MIGRATION] ✅ Successfully migrated user settings from ${oldUserId} to ${firebaseUid}`);

      // Optionally remove old key (commented out to be safe)
      // localStorage.removeItem(oldKey);
    } catch (error) {
      console.error('[MIGRATION] Error migrating user settings:', error);
    }
  }

  // Migrate old settings to new structure
  static migrateOldSettings() {
    try {
      const OLD_SETTINGS_KEY = 'app-settings';

      // Check if migration is already complete
      const existingSystemSettings = localStorage.getItem(SYSTEM_SETTINGS_KEY);
      if (existingSystemSettings) {
        // Already migrated, clean up old key
        localStorage.removeItem(OLD_SETTINGS_KEY);
        return;
      }

      const oldSettings = localStorage.getItem(OLD_SETTINGS_KEY);
      if (!oldSettings) {
        return; // No old settings to migrate
      }

      const parsed = JSON.parse(oldSettings);
      const currentUserId = FirebaseAuthService.getCurrentUserId();

      // Migrate system settings
      const systemSettings = {
        conditionOptions: parsed.conditionOptions || DEFAULT_SYSTEM_SETTINGS.conditionOptions,
        categoryOptions: parsed.categoryOptions || DEFAULT_SYSTEM_SETTINGS.categoryOptions,
        manufacturerOptions: parsed.manufacturerOptions || DEFAULT_SYSTEM_SETTINGS.manufacturerOptions,
        franchiseOptions: parsed.franchiseOptions || DEFAULT_SYSTEM_SETTINGS.franchiseOptions,
        seriesOptions: parsed.seriesOptions || DEFAULT_SYSTEM_SETTINGS.seriesOptions,
        versionOptions: parsed.versionOptions || DEFAULT_SYSTEM_SETTINGS.versionOptions,
        sizeOptions: parsed.sizeOptions || DEFAULT_SYSTEM_SETTINGS.sizeOptions,
        packagingOptions: parsed.packagingOptions || DEFAULT_SYSTEM_SETTINGS.packagingOptions
      };

      this.saveSystemSettings(systemSettings);
      console.log('Migrated system settings');

      // Migrate custom fields to user settings for current user
      if (currentUserId && parsed.customFields) {
        const userSettings = {
          customFields: parsed.customFields,
          visibleColumns: DEFAULT_USER_SETTINGS.visibleColumns
        };

        const userKey = this.getUserSettingsKey(currentUserId);
        const existingUserSettings = localStorage.getItem(userKey);

        if (!existingUserSettings) {
          this.saveUserSettings(userSettings, currentUserId);
          console.log('Migrated custom fields to user settings for user:', currentUserId);
        }
      }

      // Remove old settings after successful migration
      localStorage.removeItem(OLD_SETTINGS_KEY);

    } catch (error) {
      console.error('Error migrating old settings:', error);
    }
  }
}

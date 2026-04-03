import type { Accessory, UserAccessory } from '../types/index';

export class AccessoryService {
  /**
   * Calculate completeness percentage based on owned accessories
   * Only counts required accessories in the calculation
   */
  static calculateCompleteness(
    masterAccessories: Accessory[],
    userAccessories: UserAccessory[]
  ): number {
    if (!masterAccessories || masterAccessories.length === 0) {
      return 100; // No accessories = 100% complete
    }

    const requiredAccessories = masterAccessories.filter(acc => acc.required);

    if (requiredAccessories.length === 0) {
      return 100; // No required accessories
    }

    const ownedRequired = requiredAccessories.filter(masterAcc => {
      const userAcc = userAccessories.find(ua => ua.id === masterAcc.id);
      return userAcc?.owned === true;
    });

    return Math.round((ownedRequired.length / requiredAccessories.length) * 100);
  }

  /**
   * Get list of missing required accessories
   */
  static getMissingAccessories(
    masterAccessories: Accessory[],
    userAccessories: UserAccessory[]
  ): Accessory[] {
    if (!masterAccessories) return [];

    return masterAccessories.filter(masterAcc => {
      if (!masterAcc.required) return false; // Only check required items

      const userAcc = userAccessories.find(ua => ua.id === masterAcc.id);
      return !userAcc || !userAcc.owned;
    });
  }

  /**
   * Get list of owned accessories
   */
  static getOwnedAccessories(
    masterAccessories: Accessory[],
    userAccessories: UserAccessory[]
  ): Accessory[] {
    if (!masterAccessories) return [];

    return masterAccessories.filter(masterAcc => {
      const userAcc = userAccessories.find(ua => ua.id === masterAcc.id);
      return userAcc?.owned === true;
    });
  }

  /**
   * Initialize user accessories from master list
   * Used when adding a new figure - sets all to not owned by default
   */
  static initializeUserAccessories(masterAccessories?: Accessory[]): UserAccessory[] {
    if (!masterAccessories || masterAccessories.length === 0) {
      return [];
    }

    return masterAccessories.map(acc => ({
      id: acc.id,
      name: acc.name,
      owned: false,
      condition: undefined,
      notes: undefined
    }));
  }

  /**
   * Merge master accessories with user's owned status
   * Handles cases where master list has changed
   */
  static mergeAccessories(
    masterAccessories: Accessory[],
    userAccessories: UserAccessory[]
  ): UserAccessory[] {
    if (!masterAccessories || masterAccessories.length === 0) {
      return [];
    }

    return masterAccessories.map(masterAcc => {
      const existing = userAccessories.find(ua => ua.id === masterAcc.id);

      if (existing) {
        // Keep user's data but update name in case it changed
        return {
          ...existing,
          name: masterAcc.name
        };
      } else {
        // New accessory added to master list
        return {
          id: masterAcc.id,
          name: masterAcc.name,
          owned: false
        };
      }
    });
  }

  /**
   * Add an individual accessory (not in master list)
   */
  static addCustomAccessory(
    userAccessories: UserAccessory[],
    name: string,
    owned: boolean = true,
    imageUrl?: string
  ): UserAccessory[] {
    const customId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return [
      ...userAccessories,
      {
        id: customId,
        name: name,
        owned: owned,
        isCustom: true,
        imageUrl,
        condition: undefined,
        notes: undefined
      }
    ];
  }

  /**
   * Remove a custom accessory
   */
  static removeCustomAccessory(
    userAccessories: UserAccessory[],
    accessoryId: string
  ): UserAccessory[] {
    return userAccessories.filter(acc => acc.id !== accessoryId);
  }

  /**
   * Update accessory owned status
   */
  static updateAccessoryOwned(
    userAccessories: UserAccessory[],
    accessoryId: string,
    owned: boolean
  ): UserAccessory[] {
    return userAccessories.map(acc =>
      acc.id === accessoryId ? { ...acc, owned } : acc
    );
  }

  /**
   * Update accessory details (condition, notes, imageUrl)
   */
  static updateAccessoryDetails(
    userAccessories: UserAccessory[],
    accessoryId: string,
    updates: Partial<Omit<UserAccessory, 'id'>>
  ): UserAccessory[] {
    return userAccessories.map(acc =>
      acc.id === accessoryId ? { ...acc, ...updates } : acc
    );
  }

  /**
   * Update accessory name (for custom accessories)
   */
  static updateAccessoryName(
    userAccessories: UserAccessory[],
    accessoryId: string,
    newName: string
  ): UserAccessory[] {
    return userAccessories.map(acc =>
      acc.id === accessoryId ? { ...acc, name: newName } : acc
    );
  }

  /**
   * Update accessory image
   */
  static updateAccessoryImage(
    userAccessories: UserAccessory[],
    accessoryId: string,
    imageUrl: string
  ): UserAccessory[] {
    return userAccessories.map(acc =>
      acc.id === accessoryId ? { ...acc, imageUrl } : acc
    );
  }

  /**
   * Get completeness badge info (color, label)
   */
  static getCompletenessBadge(percentage: number): {
    color: string;
    label: string;
    icon: 'check' | 'alert' | 'x';
  } {
    if (percentage === 100) {
      return {
        color: 'green',
        label: 'Complete',
        icon: 'check'
      };
    } else if (percentage >= 75) {
      return {
        color: 'yellow',
        label: 'Mostly Complete',
        icon: 'alert'
      };
    } else if (percentage > 0) {
      return {
        color: 'red',
        label: 'Incomplete',
        icon: 'x'
      };
    } else {
      return {
        color: 'gray',
        label: 'No Accessories',
        icon: 'x'
      };
    }
  }

  /**
   * Get summary statistics for a collection
   */
  static getCollectionStats(figures: Array<{
    accessories?: UserAccessory[];
    completenessPercentage?: number;
  }>): {
    totalFigures: number;
    figuresWithAccessories: number;
    completeCount: number;
    incompleteCount: number;
    averageCompleteness: number;
  } {
    const figuresWithAccessories = figures.filter(
      f => f.accessories && f.accessories.length > 0
    );

    const complete = figuresWithAccessories.filter(
      f => (f.completenessPercentage || 0) === 100
    );

    const incomplete = figuresWithAccessories.filter(
      f => (f.completenessPercentage || 0) < 100
    );

    const totalCompleteness = figuresWithAccessories.reduce(
      (sum, f) => sum + (f.completenessPercentage || 0),
      0
    );

    const averageCompleteness = figuresWithAccessories.length > 0
      ? Math.round(totalCompleteness / figuresWithAccessories.length)
      : 0;

    return {
      totalFigures: figures.length,
      figuresWithAccessories: figuresWithAccessories.length,
      completeCount: complete.length,
      incompleteCount: incomplete.length,
      averageCompleteness
    };
  }
}

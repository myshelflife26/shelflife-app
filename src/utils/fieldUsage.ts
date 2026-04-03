import { Storage } from './storage';
import type { ActionFigure } from '../types/index';

export interface FieldUsage {
  value: string;
  count: number;
  figureIds: string[];
  figureNames: string[];
}

export class FieldUsageService {
  // Get all figures from all users
  private static getAllFigures(): ActionFigure[] {
    const allUsersFigures = Storage.getAllUsersFigures();
    const figures: ActionFigure[] = [];

    allUsersFigures.forEach(userFigures => {
      figures.push(...userFigures.figures);
    });

    return figures;
  }

  // Check if a field value is used by any figures
  static isValueInUse(field: keyof ActionFigure, value: string): boolean {
    const allFigures = this.getAllFigures();
    return allFigures.some(figure => figure[field] === value);
  }

  // Get detailed usage information for a field value
  static getValueUsage(field: keyof ActionFigure, value: string): FieldUsage {
    const allFigures = this.getAllFigures();
    const matchingFigures = allFigures.filter(figure => figure[field] === value);

    return {
      value,
      count: matchingFigures.length,
      figureIds: matchingFigures.map(f => f.id),
      figureNames: matchingFigures.map(f => f.name)
    };
  }

  // Get usage statistics for all values of a field
  static getFieldValueUsages(field: keyof ActionFigure, values: string[]): FieldUsage[] {
    return values.map(value => this.getValueUsage(field, value));
  }

  // Migrate all figures from one value to another
  static migrateValue(
    field: keyof ActionFigure,
    oldValue: string,
    newValue: string
  ): { success: boolean; count: number; error?: string } {
    try {
      const allUsersFigures = Storage.getAllUsersFigures();
      let migratedCount = 0;

      allUsersFigures.forEach(userFigures => {
        userFigures.figures.forEach(figure => {
          if (figure[field] === oldValue) {
            const updatedFigure = { ...figure, [field]: newValue } as ActionFigure;
            Storage.save(updatedFigure, userFigures.userId);
            migratedCount++;
          }
        });
      });

      return { success: true, count: migratedCount };
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Migration failed'
      };
    }
  }

  // Get all values currently in use for a field (not from settings, but from actual figures)
  static getActiveValues(field: keyof ActionFigure): string[] {
    const allFigures = this.getAllFigures();
    const values = new Set<string>();

    allFigures.forEach(figure => {
      const value = figure[field];
      if (value && typeof value === 'string') {
        values.add(value);
      }
    });

    return Array.from(values).sort();
  }

  // Check if any value in a list is being used
  static getUsedValues(field: keyof ActionFigure, values: string[]): string[] {
    return values.filter(value => this.isValueInUse(field, value));
  }
}

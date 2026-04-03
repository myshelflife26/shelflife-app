import { Storage } from './storage';
import type { ActionFigure } from '../types/index';

export interface CustomFieldUsage {
  fieldId: string;
  fieldName: string;
  count: number;
  figures: Array<{
    id: string;
    name: string;
    value: string;
  }>;
}

export class CustomFieldUsageService {
  // Check if a custom field is used by any figures for a specific user
  static isFieldInUse(userId: string, fieldId: string): boolean {
    const figures = Storage.getAll(userId);
    return figures.some(figure =>
      figure.customFields &&
      fieldId in figure.customFields &&
      figure.customFields[fieldId] !== undefined &&
      figure.customFields[fieldId] !== ''
    );
  }

  // Get detailed usage information for a custom field
  static getFieldUsage(userId: string, fieldId: string, fieldName: string): CustomFieldUsage {
    const figures = Storage.getAll(userId);
    const usingFigures: Array<{ id: string; name: string; value: string }> = [];

    figures.forEach(figure => {
      if (figure.customFields && fieldId in figure.customFields) {
        const value = figure.customFields[fieldId];
        if (value !== undefined && value !== '') {
          usingFigures.push({
            id: figure.id,
            name: figure.name,
            value: value
          });
        }
      }
    });

    return {
      fieldId,
      fieldName,
      count: usingFigures.length,
      figures: usingFigures
    };
  }

  // Remove a custom field from all figures for a specific user
  static removeFieldFromAllFigures(userId: string, fieldId: string): number {
    const figures = Storage.getAll(userId);
    let removedCount = 0;

    figures.forEach(figure => {
      if (figure.customFields && fieldId in figure.customFields) {
        // Create a new customFields object without the field
        const { [fieldId]: _, ...remainingFields } = figure.customFields;
        const updatedFigure: ActionFigure = {
          ...figure,
          customFields: remainingFields
        };
        Storage.save(updatedFigure, userId);
        removedCount++;
      }
    });

    return removedCount;
  }
}

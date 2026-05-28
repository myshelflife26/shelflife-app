import { MarketplaceService } from './marketplaceService';
import { SmartPricingService } from './smartPricing';
import { Storage } from './storage';
import type { ActionFigure, MarketplaceListing } from '../types/index';
import { privacyAnalytics } from './privacyAnalytics';

/**
 * BulkMarketplaceOperationsService - Efficient bulk operations for marketplace management
 *
 * Features:
 * - Bulk listing creation with smart pricing
 * - Batch price updates with market analysis
 * - Bulk status changes (list/unlist)
 * - Template-based listing creation
 * - Mass editing of listing details
 * - Progress tracking for long operations
 * - Rollback capabilities for failed operations
 */

export interface BulkOperation {
  id: string;
  type: 'list' | 'unlist' | 'price_update' | 'edit_details' | 'status_change';
  figureIds: string[];
  parameters: { [key: string]: any };
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  progress: number; // 0-100
  results: BulkOperationResult[];
  createdAt: number;
  completedAt?: number;
  errorMessage?: string;
}

export interface BulkOperationResult {
  figureId: string;
  figureName: string;
  success: boolean;
  error?: string;
  oldValue?: any;
  newValue?: any;
}

export interface ListingTemplate {
  id: string;
  name: string;
  description: string;
  defaultPricing: 'current' | 'smart' | 'fixed' | 'percentage';
  priceMultiplier?: number; // For percentage pricing
  fixedPrice?: number;
  includeInDescription?: string;
  tags?: string[];
  visibility: 'public' | 'private';
}

export interface BulkListingOptions {
  templateId?: string;
  pricingStrategy: 'current' | 'smart' | 'fixed' | 'percentage';
  priceMultiplier?: number;
  fixedPrice?: number;
  forSale: boolean;
  forTrade: boolean;
  includeDescription?: string;
  overwriteExisting?: boolean;
}

export interface BulkPriceUpdateOptions {
  strategy: 'smart' | 'percentage' | 'fixed' | 'market_competitive';
  percentage?: number; // +/- percentage change
  fixedPrice?: number;
  competitiveMargin?: number; // Percentage below market average
  respectMinimum?: number; // Don't go below this price
  respectMaximum?: number; // Don't go above this price
}

export class BulkMarketplaceOperationsService {
  private static operations = new Map<string, BulkOperation>();
  private static templates = new Map<string, ListingTemplate>();

  /**
   * Bulk list figures in marketplace
   */
  static async bulkListFigures(
    userId: string,
    figureIds: string[],
    options: BulkListingOptions,
    onProgress?: (progress: number) => void
  ): Promise<BulkOperation> {
    const operationId = this.generateOperationId();
    const operation: BulkOperation = {
      id: operationId,
      type: 'list',
      figureIds,
      parameters: options,
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: Date.now()
    };

    this.operations.set(operationId, operation);

    try {
      operation.status = 'in_progress';
      this.operations.set(operationId, operation);

      const userFigures = Storage.getAll(userId);
      const figuresToProcess = userFigures.filter(f => figureIds.includes(f.id));

      for (let i = 0; i < figuresToProcess.length; i++) {
        const figure = figuresToProcess[i];

        try {
          // Calculate price based on strategy
          let price = figure.currentValue;

          switch (options.pricingStrategy) {
            case 'smart':
              const priceSuggestion = await SmartPricingService.getPriceSuggestion(figure);
              price = priceSuggestion.suggestedPrice;
              break;

            case 'fixed':
              price = options.fixedPrice || figure.currentValue;
              break;

            case 'percentage':
              price = figure.currentValue * (options.priceMultiplier || 1);
              break;

            case 'current':
            default:
              price = figure.currentValue;
              break;
          }

          // Create marketplace listing
          const listing: MarketplaceListing = {
            figureId: figure.id,
            forSale: options.forSale,
            forTrade: options.forTrade,
            askingPrice: price,
            marketplaceDescription: options.includeDescription || figure.notes,
            listedAt: Date.now()
          };

          // Update figure with marketplace listing
          const updatedFigure = {
            ...figure,
            marketplaceListing: listing,
            isListed: true,
            currentValue: price
          };

          Storage.save(userId, updatedFigure);

          // Record success
          operation.results.push({
            figureId: figure.id,
            figureName: figure.name,
            success: true,
            oldValue: figure.currentValue,
            newValue: price
          });

        } catch (error) {
          // Record failure
          operation.results.push({
            figureId: figure.id,
            figureName: figure.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Update progress
        operation.progress = Math.round(((i + 1) / figuresToProcess.length) * 100);
        this.operations.set(operationId, operation);

        if (onProgress) {
          onProgress(operation.progress);
        }

        // Small delay to prevent overwhelming the system
        if (i < figuresToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      operation.status = 'completed';
      operation.completedAt = Date.now();

      // Track analytics
      privacyAnalytics.trackEvent('bulk_listing_operation', {
        figureCount: figureIds.length,
        pricingStrategy: options.pricingStrategy,
        successRate: operation.results.filter(r => r.success).length / operation.results.length
      });

    } catch (error) {
      operation.status = 'failed';
      operation.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    this.operations.set(operationId, operation);
    return operation;
  }

  /**
   * Bulk update prices for listed figures
   */
  static async bulkUpdatePrices(
    userId: string,
    figureIds: string[],
    options: BulkPriceUpdateOptions,
    onProgress?: (progress: number) => void
  ): Promise<BulkOperation> {
    const operationId = this.generateOperationId();
    const operation: BulkOperation = {
      id: operationId,
      type: 'price_update',
      figureIds,
      parameters: options,
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: Date.now()
    };

    this.operations.set(operationId, operation);

    try {
      operation.status = 'in_progress';
      this.operations.set(operationId, operation);

      const userFigures = Storage.getAll(userId);
      const figuresToProcess = userFigures.filter(f => figureIds.includes(f.id) && f.isListed);

      for (let i = 0; i < figuresToProcess.length; i++) {
        const figure = figuresToProcess[i];
        const oldPrice = figure.currentValue;

        try {
          let newPrice = oldPrice;

          switch (options.strategy) {
            case 'smart':
              const priceSuggestion = await SmartPricingService.getPriceSuggestion(figure);
              newPrice = priceSuggestion.suggestedPrice;
              break;

            case 'percentage':
              newPrice = oldPrice * (1 + (options.percentage || 0) / 100);
              break;

            case 'fixed':
              newPrice = options.fixedPrice || oldPrice;
              break;

            case 'market_competitive':
              // Get market average and price competitively
              const suggestion = await SmartPricingService.getPriceSuggestion(figure);
              const margin = options.competitiveMargin || 5;
              newPrice = suggestion.priceRange.median * (1 - margin / 100);
              break;
          }

          // Apply min/max constraints
          if (options.respectMinimum && newPrice < options.respectMinimum) {
            newPrice = options.respectMinimum;
          }
          if (options.respectMaximum && newPrice > options.respectMaximum) {
            newPrice = options.respectMaximum;
          }

          // Round to reasonable precision
          newPrice = Math.round(newPrice);

          // Update figure
          const updatedFigure = {
            ...figure,
            currentValue: newPrice,
            marketplaceListing: {
              ...figure.marketplaceListing!,
              askingPrice: newPrice
            }
          };

          Storage.save(userId, updatedFigure);

          // Record success
          operation.results.push({
            figureId: figure.id,
            figureName: figure.name,
            success: true,
            oldValue: oldPrice,
            newValue: newPrice
          });

        } catch (error) {
          operation.results.push({
            figureId: figure.id,
            figureName: figure.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            oldValue: oldPrice
          });
        }

        // Update progress
        operation.progress = Math.round(((i + 1) / figuresToProcess.length) * 100);
        this.operations.set(operationId, operation);

        if (onProgress) {
          onProgress(operation.progress);
        }

        // Small delay
        if (i < figuresToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      operation.status = 'completed';
      operation.completedAt = Date.now();

      // Track analytics
      privacyAnalytics.trackEvent('bulk_price_update', {
        figureCount: figureIds.length,
        strategy: options.strategy,
        averagePriceChange: this.calculateAveragePriceChange(operation.results)
      });

    } catch (error) {
      operation.status = 'failed';
      operation.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    this.operations.set(operationId, operation);
    return operation;
  }

  /**
   * Bulk unlist figures from marketplace
   */
  static async bulkUnlistFigures(
    userId: string,
    figureIds: string[],
    onProgress?: (progress: number) => void
  ): Promise<BulkOperation> {
    const operationId = this.generateOperationId();
    const operation: BulkOperation = {
      id: operationId,
      type: 'unlist',
      figureIds,
      parameters: {},
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: Date.now()
    };

    this.operations.set(operationId, operation);

    try {
      operation.status = 'in_progress';
      this.operations.set(operationId, operation);

      const userFigures = Storage.getAll(userId);
      const figuresToProcess = userFigures.filter(f => figureIds.includes(f.id));

      for (let i = 0; i < figuresToProcess.length; i++) {
        const figure = figuresToProcess[i];

        try {
          // Remove marketplace listing
          const updatedFigure = {
            ...figure,
            marketplaceListing: undefined,
            isListed: false
          };

          Storage.save(userId, updatedFigure);

          operation.results.push({
            figureId: figure.id,
            figureName: figure.name,
            success: true
          });

        } catch (error) {
          operation.results.push({
            figureId: figure.id,
            figureName: figure.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Update progress
        operation.progress = Math.round(((i + 1) / figuresToProcess.length) * 100);
        this.operations.set(operationId, operation);

        if (onProgress) {
          onProgress(operation.progress);
        }
      }

      operation.status = 'completed';
      operation.completedAt = Date.now();

      // Track analytics
      privacyAnalytics.trackEvent('bulk_unlisting_operation', {
        figureCount: figureIds.length,
        successRate: operation.results.filter(r => r.success).length / operation.results.length
      });

    } catch (error) {
      operation.status = 'failed';
      operation.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    this.operations.set(operationId, operation);
    return operation;
  }

  /**
   * Get operation status
   */
  static getOperation(operationId: string): BulkOperation | null {
    return this.operations.get(operationId) || null;
  }

  /**
   * Get all operations for a user
   */
  static getUserOperations(userId: string): BulkOperation[] {
    // In a real implementation, this would filter by userId
    return Array.from(this.operations.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20); // Return last 20 operations
  }

  /**
   * Rollback a completed operation (if possible)
   */
  static async rollbackOperation(
    userId: string,
    operationId: string
  ): Promise<{ success: boolean; message: string }> {
    const operation = this.operations.get(operationId);

    if (!operation) {
      return { success: false, message: 'Operation not found' };
    }

    if (operation.status !== 'completed') {
      return { success: false, message: 'Can only rollback completed operations' };
    }

    if (operation.type === 'unlist') {
      return { success: false, message: 'Cannot rollback unlist operations' };
    }

    try {
      const userFigures = Storage.getAll(userId);

      for (const result of operation.results) {
        if (!result.success) continue;

        const figure = userFigures.find(f => f.id === result.figureId);
        if (!figure) continue;

        if (operation.type === 'list') {
          // Remove marketplace listing
          const updatedFigure = {
            ...figure,
            marketplaceListing: undefined,
            isListed: false,
            currentValue: result.oldValue || figure.currentValue
          };
          Storage.save(userId, updatedFigure);

        } else if (operation.type === 'price_update') {
          // Restore old price
          const updatedFigure = {
            ...figure,
            currentValue: result.oldValue || figure.currentValue,
            marketplaceListing: figure.marketplaceListing ? {
              ...figure.marketplaceListing,
              askingPrice: result.oldValue || figure.currentValue
            } : undefined
          };
          Storage.save(userId, updatedFigure);
        }
      }

      operation.status = 'rolled_back';
      this.operations.set(operationId, operation);

      return { success: true, message: 'Operation rolled back successfully' };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Rollback failed'
      };
    }
  }

  /**
   * Create a listing template
   */
  static createListingTemplate(template: Omit<ListingTemplate, 'id'>): ListingTemplate {
    const id = this.generateTemplateId();
    const fullTemplate: ListingTemplate = { ...template, id };

    this.templates.set(id, fullTemplate);
    return fullTemplate;
  }

  /**
   * Get all listing templates
   */
  static getListingTemplates(): ListingTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Apply template to bulk listing options
   */
  static applyTemplate(templateId: string): Partial<BulkListingOptions> | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    return {
      pricingStrategy: template.defaultPricing,
      priceMultiplier: template.priceMultiplier,
      fixedPrice: template.fixedPrice,
      includeDescription: template.includeInDescription,
      forSale: true,
      forTrade: false
    };
  }

  /**
   * Generate smart listing recommendations
   */
  static async generateListingRecommendations(
    userId: string,
    figureIds: string[]
  ): Promise<{
    figureId: string;
    recommendations: {
      type: 'pricing' | 'timing' | 'description' | 'categories';
      suggestion: string;
      impact: 'low' | 'medium' | 'high';
    }[];
  }[]> {
    try {
      const userFigures = Storage.getAll(userId);
      const figuresToAnalyze = userFigures.filter(f => figureIds.includes(f.id));
      const recommendations: any[] = [];

      for (const figure of figuresToAnalyze.slice(0, 5)) { // Limit for performance
        const figureRecommendations: any[] = [];

        // Pricing recommendations
        const priceSuggestion = await SmartPricingService.getPriceSuggestion(figure);
        if (priceSuggestion.confidence > 0.7) {
          if (priceSuggestion.suggestedPrice > figure.currentValue * 1.1) {
            figureRecommendations.push({
              type: 'pricing',
              suggestion: `Consider pricing at $${priceSuggestion.suggestedPrice} (${Math.round((priceSuggestion.suggestedPrice / figure.currentValue - 1) * 100)}% increase)`,
              impact: 'high'
            });
          }
        }

        // Description recommendations
        if (!figure.notes || figure.notes.length < 20) {
          figureRecommendations.push({
            type: 'description',
            suggestion: 'Add detailed description to increase buyer confidence',
            impact: 'medium'
          });
        }

        recommendations.push({
          figureId: figure.id,
          recommendations: figureRecommendations
        });
      }

      return recommendations;

    } catch (error) {
      console.error('Failed to generate listing recommendations:', error);
      return [];
    }
  }

  /**
   * Calculate success rate for operations
   */
  static getOperationStats(): {
    totalOperations: number;
    successRate: number;
    averageProcessingTime: number;
    popularOperations: { type: string; count: number }[];
  } {
    const operations = Array.from(this.operations.values());

    if (operations.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageProcessingTime: 0,
        popularOperations: []
      };
    }

    const completed = operations.filter(op => op.status === 'completed');
    const successRate = completed.length / operations.length;

    const processingTimes = completed
      .filter(op => op.completedAt)
      .map(op => op.completedAt! - op.createdAt);

    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    const typeCount = new Map<string, number>();
    for (const op of operations) {
      typeCount.set(op.type, (typeCount.get(op.type) || 0) + 1);
    }

    const popularOperations = Array.from(typeCount.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalOperations: operations.length,
      successRate,
      averageProcessingTime,
      popularOperations
    };
  }

  /**
   * Generate operation ID
   */
  private static generateOperationId(): string {
    return `bulk_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate template ID
   */
  private static generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate average price change from results
   */
  private static calculateAveragePriceChange(results: BulkOperationResult[]): number {
    const successful = results.filter(r => r.success && r.oldValue && r.newValue);

    if (successful.length === 0) return 0;

    const changes = successful.map(r =>
      ((r.newValue - r.oldValue) / r.oldValue) * 100
    );

    return changes.reduce((sum, change) => sum + change, 0) / changes.length;
  }
}
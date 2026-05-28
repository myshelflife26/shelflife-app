import type { User } from '../types/user';
import type { ActionFigure } from '../types/index';
import { ViewTrackingService } from './viewTracking';
import { TrendingService } from './trending';

/**
 * ShareCardGenerator - Generate shareable image cards for collections and figures
 *
 * Features:
 * - Collection overview cards with stats and top figures
 * - Individual figure cards with details and engagement metrics
 * - Trending figure cards with trending indicators
 * - Consistent branding and design
 * - High-resolution output optimized for social sharing
 */
export class ShareCardGenerator {
  private static readonly CARD_WIDTH = 800;
  private static readonly CARD_HEIGHT = 600;
  private static readonly BRAND_COLOR = '#2563eb';
  private static readonly BACKGROUND_COLOR = '#f9fafb';
  private static readonly TEXT_COLOR = '#111827';
  private static readonly ACCENT_COLOR = '#6b7280';

  /**
   * Generate a collection overview card
   */
  static async generateCollectionCard(
    user: User,
    collectionStats: {
      totalFigures: number;
      totalValue: number;
      topManufacturer?: string;
    },
    topFigures: ActionFigure[] = []
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = this.CARD_WIDTH;
    canvas.height = this.CARD_HEIGHT;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = this.BACKGROUND_COLOR;
    ctx.fillRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);

    // Brand header
    ctx.fillStyle = this.BRAND_COLOR;
    ctx.fillRect(0, 0, this.CARD_WIDTH, 80);

    // ShelfLife logo/title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText('ShelfLife', 40, 50);

    // User info section
    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText(user.displayName, 40, 140);

    ctx.fillStyle = this.ACCENT_COLOR;
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText(`@${user.username}`, 40, 170);

    // Stats section
    const statsY = 240;
    const statSpacing = 250;

    // Total figures
    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillText(collectionStats.totalFigures.toString(), 40, statsY);
    ctx.fillStyle = this.ACCENT_COLOR;
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('Figures', 40, statsY + 30);

    // Total value
    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = 'bold 48px Arial, sans-serif';
    const valueText = `$${collectionStats.totalValue.toLocaleString()}`;
    ctx.fillText(valueText, 40 + statSpacing, statsY);
    ctx.fillStyle = this.ACCENT_COLOR;
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('Total Value', 40 + statSpacing, statsY + 30);

    // Top manufacturer (if available)
    if (collectionStats.topManufacturer) {
      ctx.fillStyle = this.TEXT_COLOR;
      ctx.font = 'bold 36px Arial, sans-serif';
      const manufacturerText = this.truncateText(ctx, collectionStats.topManufacturer, 200);
      ctx.fillText(manufacturerText, 40 + (statSpacing * 2), statsY);
      ctx.fillStyle = this.ACCENT_COLOR;
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText('Top Brand', 40 + (statSpacing * 2), statsY + 30);
    }

    // Top figures section
    if (topFigures.length > 0) {
      ctx.fillStyle = this.TEXT_COLOR;
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText('Featured Figures', 40, 360);

      let figureX = 40;
      const figureY = 390;
      const figureSpacing = 180;

      for (let i = 0; i < Math.min(topFigures.length, 4); i++) {
        const figure = topFigures[i];

        // Figure placeholder/thumbnail
        ctx.fillStyle = this.ACCENT_COLOR;
        ctx.fillRect(figureX, figureY, 60, 80);

        // Figure name
        ctx.fillStyle = this.TEXT_COLOR;
        ctx.font = '16px Arial, sans-serif';
        const figureName = this.truncateText(ctx, figure.name, 160);
        ctx.fillText(figureName, figureX, figureY + 100);

        // Figure value
        ctx.fillStyle = this.ACCENT_COLOR;
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText(`$${figure.currentValue}`, figureX, figureY + 120);

        figureX += figureSpacing;
      }
    }

    // Footer with website
    ctx.fillStyle = this.ACCENT_COLOR;
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText('Track your collection at shelflife.app', 40, this.CARD_HEIGHT - 40);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png', 0.9);
    });
  }

  /**
   * Generate an individual figure card
   */
  static async generateFigureCard(
    figure: ActionFigure,
    ownerName: string,
    includeEngagementMetrics: boolean = true
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = this.CARD_WIDTH;
    canvas.height = this.CARD_HEIGHT;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = this.BACKGROUND_COLOR;
    ctx.fillRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);

    // Brand header
    ctx.fillStyle = this.BRAND_COLOR;
    ctx.fillRect(0, 0, this.CARD_WIDTH, 80);

    // ShelfLife logo
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText('ShelfLife', 40, 50);

    // Figure image placeholder (would load actual image in full implementation)
    ctx.fillStyle = this.ACCENT_COLOR;
    ctx.fillRect(40, 120, 300, 400);
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText('Figure Image', 120, 320);

    // Figure details
    const detailsX = 380;
    let detailsY = 140;

    // Figure name
    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = 'bold 32px Arial, sans-serif';
    const figureName = this.truncateText(ctx, figure.name, 380);
    ctx.fillText(figureName, detailsX, detailsY);
    detailsY += 50;

    // Series and manufacturer
    ctx.fillStyle = this.ACCENT_COLOR;
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText(figure.series, detailsX, detailsY);
    detailsY += 30;
    ctx.fillText(figure.manufacturer, detailsX, detailsY);
    detailsY += 50;

    // Value and condition
    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText(`$${figure.currentValue}`, detailsX, detailsY);
    detailsY += 40;

    ctx.fillStyle = this.ACCENT_COLOR;
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText(`Condition: ${figure.condition}`, detailsX, detailsY);
    detailsY += 40;

    // Engagement metrics (if enabled)
    if (includeEngagementMetrics) {
      try {
        const viewStats = await ViewTrackingService.getViewStats(figure.id);
        if (viewStats && viewStats.total > 0) {
          ctx.fillStyle = this.BRAND_COLOR;
          ctx.font = '18px Arial, sans-serif';
          ctx.fillText(`${viewStats.total} views`, detailsX, detailsY);
          detailsY += 30;
        }

        const trendingMetrics = await TrendingService.getTrendingMetrics(figure.id);
        if (trendingMetrics && trendingMetrics.score > 0.5) {
          ctx.fillStyle = '#f59e0b'; // Orange for trending
          ctx.font = 'bold 18px Arial, sans-serif';
          ctx.fillText('🔥 TRENDING', detailsX, detailsY);
          detailsY += 30;
        }
      } catch (error) {
        console.error('Failed to load engagement metrics for card:', error);
      }
    }

    // Owner attribution
    ctx.fillStyle = this.ACCENT_COLOR;
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText(`Owned by ${ownerName}`, detailsX, this.CARD_HEIGHT - 100);

    // Footer
    ctx.fillText('Discover more collections at shelflife.app', 40, this.CARD_HEIGHT - 40);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png', 0.9);
    });
  }

  /**
   * Generate a trending figure card with special trending indicators
   */
  static async generateTrendingCard(
    figure: ActionFigure,
    ownerName: string,
    trendingRank: number
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = this.CARD_WIDTH;
    canvas.height = this.CARD_HEIGHT;
    const ctx = canvas.getContext('2d')!;

    // Trending gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, this.CARD_HEIGHT);
    gradient.addColorStop(0, '#f59e0b');
    gradient.addColorStop(1, '#dc2626');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, 80, this.CARD_WIDTH, this.CARD_HEIGHT - 80);

    // Brand header with trending indicator
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, this.CARD_WIDTH, 80);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText('🔥 TRENDING ON SHELFLIFE', 40, 50);

    // Trending rank
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillText(`#${trendingRank}`, 40, 160);

    ctx.fillStyle = this.ACCENT_COLOR;
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('Trending Rank', 40, 185);

    // Figure details (similar to regular figure card but with trending styling)
    const detailsX = 40;
    let detailsY = 240;

    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = 'bold 36px Arial, sans-serif';
    const figureName = this.truncateText(ctx, figure.name, 700);
    ctx.fillText(figureName, detailsX, detailsY);
    detailsY += 50;

    ctx.fillStyle = this.ACCENT_COLOR;
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText(`${figure.manufacturer} • ${figure.series}`, detailsX, detailsY);
    detailsY += 50;

    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillText(`$${figure.currentValue} • ${figure.condition}`, detailsX, detailsY);
    detailsY += 80;

    // Engagement stats
    try {
      const viewStats = await ViewTrackingService.getViewStats(figure.id);
      const trendingMetrics = await TrendingService.getTrendingMetrics(figure.id);

      if (viewStats) {
        ctx.fillStyle = this.BRAND_COLOR;
        ctx.font = '20px Arial, sans-serif';
        ctx.fillText(`${viewStats.total} total views • ${viewStats.recent24h} views today`, detailsX, detailsY);
        detailsY += 35;
      }

      if (trendingMetrics) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = '20px Arial, sans-serif';
        ctx.fillText(`Trending score: ${trendingMetrics.score}`, detailsX, detailsY);
        detailsY += 35;
      }
    } catch (error) {
      console.error('Failed to load metrics for trending card:', error);
    }

    // Owner attribution
    ctx.fillStyle = this.ACCENT_COLOR;
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText(`Owned by ${ownerName}`, detailsX, this.CARD_HEIGHT - 80);

    // CTA
    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText('See what\'s trending at shelflife.app', detailsX, this.CARD_HEIGHT - 40);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png', 0.9);
    });
  }

  /**
   * Helper function to truncate text to fit within a given width
   */
  private static truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    let truncated = text;
    while (ctx.measureText(truncated).width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }

    if (truncated.length < text.length) {
      truncated = truncated.slice(0, -3) + '...';
    }

    return truncated;
  }

  /**
   * Download a blob as a file
   */
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate and download a collection card
   */
  static async generateAndDownloadCollectionCard(
    user: User,
    collectionStats: {
      totalFigures: number;
      totalValue: number;
      topManufacturer?: string;
    },
    topFigures: ActionFigure[] = []
  ): Promise<void> {
    try {
      const blob = await this.generateCollectionCard(user, collectionStats, topFigures);
      const filename = `${user.username}-collection-${Date.now()}.png`;
      this.downloadBlob(blob, filename);
    } catch (error) {
      console.error('Failed to generate collection card:', error);
      throw new Error('Failed to generate share card');
    }
  }

  /**
   * Generate and download a figure card
   */
  static async generateAndDownloadFigureCard(
    figure: ActionFigure,
    ownerName: string,
    includeEngagementMetrics: boolean = true
  ): Promise<void> {
    try {
      const blob = await this.generateFigureCard(figure, ownerName, includeEngagementMetrics);
      const filename = `${figure.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.png`;
      this.downloadBlob(blob, filename);
    } catch (error) {
      console.error('Failed to generate figure card:', error);
      throw new Error('Failed to generate share card');
    }
  }
}
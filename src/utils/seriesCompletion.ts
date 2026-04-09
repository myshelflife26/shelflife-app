import type { ActionFigure } from '../types';
import { MasterFiguresService, type MasterFigure } from './masterFigures';

export interface SeriesCompletion {
  series: string;
  productLine: string;
  totalInSeries: number;
  owned: number;
  completionPercent: number;
  ownedFigures: ActionFigure[];
  missingCount: number;
}

export class SeriesCompletionService {
  /**
   * Calculate completion percentage for each series/product line
   */
  static async calculateSeriesCompletion(userFigures: ActionFigure[]): Promise<SeriesCompletion[]> {
    try {
      // Get all master figures
      const masterFigures = await MasterFiguresService.getAllMasterFigures();

      // Group master figures by series and product line
      const seriesMap = new Map<string, MasterFigure[]>();

      masterFigures.forEach(masterFig => {
        const key = this.getSeriesKey(masterFig.series, masterFig.productLine);
        if (!seriesMap.has(key)) {
          seriesMap.set(key, []);
        }
        seriesMap.get(key)!.push(masterFig);
      });

      // Calculate completion for each series
      const completions: SeriesCompletion[] = [];

      seriesMap.forEach((masterFigs, key) => {
        const [series, productLine] = key.split(':::');

        // Find user figures in this series/product line
        const ownedFigures = userFigures.filter(fig =>
          this.matchesSeries(fig, series, productLine)
        );

        const totalInSeries = masterFigs.length;
        const owned = ownedFigures.length;
        const completionPercent = totalInSeries > 0 ? (owned / totalInSeries) * 100 : 0;

        if (totalInSeries > 0) { // Only include series that have figures in master database
          completions.push({
            series,
            productLine,
            totalInSeries,
            owned,
            completionPercent,
            ownedFigures,
            missingCount: totalInSeries - owned
          });
        }
      });

      // Sort by completion percentage (descending) then by series name
      return completions.sort((a, b) => {
        if (b.completionPercent !== a.completionPercent) {
          return b.completionPercent - a.completionPercent;
        }
        return a.series.localeCompare(b.series);
      });

    } catch (error) {
      console.error('Failed to calculate series completion:', error);
      return [];
    }
  }

  /**
   * Get series completion for a specific series/product line
   */
  static async getSeriesCompletion(
    userFigures: ActionFigure[],
    series: string,
    productLine: string
  ): Promise<SeriesCompletion | null> {
    const allCompletions = await this.calculateSeriesCompletion(userFigures);
    return allCompletions.find(c =>
      c.series === series && c.productLine === productLine
    ) || null;
  }

  /**
   * Get all unique series/product lines from user's collection
   */
  static getUserSeries(userFigures: ActionFigure[]): Array<{ series: string; productLine: string }> {
    const seriesSet = new Set<string>();

    userFigures.forEach(fig => {
      const key = this.getSeriesKey(fig.series, fig.productLine || '');
      seriesSet.add(key);
    });

    return Array.from(seriesSet).map(key => {
      const [series, productLine] = key.split(':::');
      return { series, productLine };
    });
  }

  private static getSeriesKey(series: string, productLine?: string): string {
    return `${series}:::${productLine || 'N/A'}`;
  }

  private static matchesSeries(figure: ActionFigure, series: string, productLine: string): boolean {
    const figProductLine = figure.productLine || 'N/A';
    return figure.series === series && figProductLine === productLine;
  }
}

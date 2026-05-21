// Generic HTML table scraper - works with structured table data

import { BaseScraper, type ScraperConfig, type ScrapeResult, type ScrapedFigure } from './types';

export class GenericTableScraper extends BaseScraper {
  config: ScraperConfig = {
    id: 'generic-table',
    name: 'Generic Table Scraper',
    description: 'Scrape figures from HTML tables (checklist sites)',
    baseUrl: '',
    requiresInput: true,
    inputPlaceholder: 'Enter URL to page with table of figures...'
  };

  async scrape(input?: string): Promise<ScrapeResult> {
    const result: ScrapeResult = {
      success: false,
      figures: [],
      errors: [],
      skipped: 0
    };

    if (!input) {
      result.errors.push('No URL provided');
      return result;
    }

    try {
      // Fetch the page
      const html = await this.fetchPage(input);
      const doc = this.parseHTML(html);

      // Find all tables
      const tables = doc.querySelectorAll('table');

      if (tables.length === 0) {
        result.errors.push('No tables found on page');
        return result;
      }

      // Try to find the best table (usually the largest one with data)
      let bestTable: HTMLTableElement | null = null;
      let maxRows = 0;

      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        if (rows.length > maxRows) {
          maxRows = rows.length;
          bestTable = table as HTMLTableElement;
        }
      });

      if (!bestTable || maxRows < 2) {
        result.errors.push('No suitable data table found');
        return result;
      }

      // Parse the table
      const figures = this.parseTable(bestTable);
      result.figures = figures;
      result.success = figures.length > 0;

      if (figures.length === 0) {
        result.errors.push('No figures extracted from table');
      }

    } catch (error: any) {
      result.errors.push(`Scrape error: ${error.message}`);
    }

    return result;
  }

  private parseTable(table: HTMLTableElement): ScrapedFigure[] {
    const figures: ScrapedFigure[] = [];
    const rows = Array.from(table.querySelectorAll('tr'));

    if (rows.length < 2) {
      return figures;
    }

    // Get header row (first row)
    const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
    const headers = headerCells.map(cell =>
      this.cleanText(cell.textContent || '').toLowerCase()
    );

    // Parse data rows
    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td'));

      if (cells.length === 0) continue;

      const figure: ScrapedFigure = {
        name: '',
      };

      // Map cells to figure properties based on header
      cells.forEach((cell, index) => {
        const header = headers[index] || '';
        const text = this.cleanText(cell.textContent || '');

        if (!text) return;

        // Check for images in the cell
        const img = cell.querySelector('img');
        if (img && img.src && !figure.imageUrl) {
          figure.imageUrl = img.src;
        }

        // Map based on header text
        if (header.includes('name') || header.includes('figure') || header.includes('title') || header === 'character') {
          figure.name = text;
        } else if (header.includes('manufacturer') || header.includes('brand') || header === 'maker') {
          figure.manufacturer = text;
        } else if (header.includes('line') && !header.includes('sub')) {
          figure.productLine = text;
        } else if (header.includes('sub') || header.includes('wave') || header.includes('series')) {
          figure.subProductLine = text;
        } else if (header.includes('year') || header.includes('released') || header.includes('date')) {
          const year = parseInt(text);
          if (!isNaN(year) && year > 1900 && year < 2100) {
            figure.year = year;
          }
        } else if (header.includes('version') || header.includes('variant') || header === 'ver') {
          figure.version = text;
        } else if (header.includes('category') || header === 'type') {
          figure.category = text;
        } else if (header.includes('size') || header.includes('scale')) {
          figure.size = text;
        } else if (header.includes('number') || header === '#' || header === 'no' || header === 'sku') {
          if (!figure.notes) {
            figure.notes = `Number: ${text}`;
          }
        }
      });

      // Only add if we have at least a name
      if (figure.name && figure.name.length > 1) {
        // Set default manufacturer if not found
        if (!figure.manufacturer) {
          figure.manufacturer = 'Unknown';
        }

        figures.push(figure);
      }
    }

    return figures;
  }
}

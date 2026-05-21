// CSV/TSV data scraper - for importing from paste data or URLs

import { BaseScraper, type ScraperConfig, type ScrapeResult, type ScrapedFigure } from './types';

export class CSVScraper extends BaseScraper {
  config: ScraperConfig = {
    id: 'csv',
    name: 'CSV/TSV Import',
    description: 'Import from CSV or TSV data (paste or URL)',
    baseUrl: '',
    requiresInput: true,
    inputPlaceholder: 'Paste CSV data or enter URL to CSV file...'
  };

  async scrape(input?: string): Promise<ScrapeResult> {
    const result: ScrapeResult = {
      success: false,
      figures: [],
      errors: [],
      skipped: 0
    };

    if (!input) {
      result.errors.push('No input provided');
      return result;
    }

    try {
      let csvData = input;

      // If input looks like a URL, fetch it
      if (input.startsWith('http://') || input.startsWith('https://')) {
        try {
          csvData = await this.fetchPage(input);
        } catch (error: any) {
          result.errors.push(`Failed to fetch URL: ${error.message}`);
          return result;
        }
      }

      // Parse CSV/TSV
      const figures = this.parseCSV(csvData);
      result.figures = figures;
      result.success = true;

    } catch (error: any) {
      result.errors.push(`Parse error: ${error.message}`);
    }

    return result;
  }

  private parseCSV(data: string): ScrapedFigure[] {
    const figures: ScrapedFigure[] = [];
    const lines = data.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return figures;
    }

    // Detect delimiter (comma or tab)
    const delimiter = lines[0].includes('\t') ? '\t' : ',';

    // Parse header
    const headers = this.parseLine(lines[0], delimiter).map(h => h.toLowerCase().trim());

    // Parse rows
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseLine(lines[i], delimiter);

      if (values.length === 0 || values.every(v => !v)) {
        continue; // Skip empty rows
      }

      const figure: ScrapedFigure = {
        name: '',
      };

      // Map columns to figure properties
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';

        if (!value) return;

        // Map common column names to figure properties
        if (header.includes('name') || header === 'figure' || header === 'title') {
          figure.name = value;
        } else if (header.includes('manufacturer') || header === 'brand' || header === 'maker') {
          figure.manufacturer = value;
        } else if (header.includes('product line') || header === 'productline' || header === 'line') {
          figure.productLine = value;
        } else if (header.includes('sub') && header.includes('line')) {
          figure.subProductLine = value;
        } else if (header.includes('year') || header === 'released' || header === 'date') {
          const year = parseInt(value);
          if (!isNaN(year) && year > 1900 && year < 2100) {
            figure.year = year;
          }
        } else if (header.includes('version') || header === 'ver' || header === 'variant') {
          figure.version = value;
        } else if (header.includes('category') || header === 'type') {
          figure.category = value;
        } else if (header.includes('size')) {
          figure.size = value;
        } else if (header.includes('packaging') || header === 'package') {
          figure.packaging = value;
        } else if (header.includes('image') || header === 'photo' || header.includes('url')) {
          figure.imageUrl = value;
        } else if (header.includes('source') && header.includes('name')) {
          figure.sourceName = value;
        } else if (header.includes('source') && header.includes('url')) {
          figure.sourceUrl = value;
        } else if (header.includes('link') || header === 'url' || header === 'href') {
          figure.sourceUrl = value;
        } else if (header.includes('note') || header === 'description' || header === 'desc') {
          figure.notes = value;
        } else if (header.includes('series')) {
          figure.series = value;
        }
      });

      // Only add if we have at least a name
      if (figure.name) {
        figures.push(figure);
      }
    }

    return figures;
  }

  private parseLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result.map(s => s.replace(/^"|"$/g, '').trim());
  }
}

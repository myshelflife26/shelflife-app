// YoJoe.com scraper for G.I. Joe figures

import { BaseScraper, type ScraperConfig, type ScrapeResult, type ScrapedFigure } from './types';

export class YoJoeScraper extends BaseScraper {
  config: ScraperConfig = {
    id: 'yojoe',
    name: 'YoJoe.com',
    description: 'Scrape G.I. Joe figures from YoJoe.com by year',
    baseUrl: 'https://www.yojoe.com',
    requiresInput: true,
    inputPlaceholder: 'Enter year URL (e.g., https://www.yojoe.com/action/82/ for 1982 figures)'
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
      // Validate URL
      if (!input.includes('yojoe.com')) {
        result.errors.push('Please provide a YoJoe.com URL');
        return result;
      }

      // Fetch the page
      const html = await this.fetchPage(input);
      const doc = this.parseHTML(html);

      // Extract year from URL (e.g., /action/82/ -> 1982)
      const yearMatch = input.match(/\/action\/(\d+)\//);
      let year: number | undefined;
      if (yearMatch) {
        const shortYear = parseInt(yearMatch[1]);
        // Convert 2-digit year to 4-digit (82 -> 1982, 20 -> 2020)
        year = shortYear < 50 ? 2000 + shortYear : 1900 + shortYear;
      }

      // Method 1: Try to find figure links from thumbnail images
      const figureLinks = doc.querySelectorAll('a[href*=".shtml"]');

      if (figureLinks.length === 0) {
        result.errors.push('No figure links found on page. Make sure this is a YoJoe figure listing page.');
        return result;
      }

      const seenNames = new Set<string>();

      for (const link of Array.from(figureLinks)) {
        const href = (link as HTMLAnchorElement).href;
        const title = (link as HTMLAnchorElement).title || '';
        const img = link.querySelector('img');
        const alt = img?.alt || '';

        // Extract figure name from title or alt text
        let figureName = title || alt;

        if (!figureName) {
          // Try to extract from href
          const nameMatch = href.match(/\/([^\/]+)\.shtml/);
          if (nameMatch) {
            figureName = nameMatch[1].replace(/-/g, ' ');
            // Capitalize first letter of each word
            figureName = figureName
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
        }

        if (!figureName) continue;

        // Remove version info like "(v1)" for cleaner names
        const cleanName = figureName.replace(/\s*\(v\d+\)\s*/gi, '').trim();

        // Skip if we've already seen this figure
        if (seenNames.has(cleanName.toLowerCase())) {
          continue;
        }
        seenNames.add(cleanName.toLowerCase());

        // Extract version number
        let version: string | undefined;
        const versionMatch = figureName.match(/\(v(\d+)\)/i);
        if (versionMatch) {
          version = `V${versionMatch[1]}`;
        }

        // Get image URL
        let imageUrl: string | undefined;
        if (img?.src) {
          imageUrl = img.src.startsWith('http') ? img.src : `https://www.yojoe.com${img.src}`;
        }

        const figure: ScrapedFigure = {
          name: cleanName,
          manufacturer: 'Hasbro',
          productLine: 'G.I. Joe',
          subProductLine: year ? `${year}` : undefined,
          year: year,
          version: version,
          category: 'Action Figure',
          size: '3.75"',
          imageUrl: imageUrl,
          sourceName: 'YoJoe.com',
          sourceUrl: href,
          notes: `Imported from YoJoe.com`
        };

        result.figures.push(figure);
      }

      if (result.figures.length > 0) {
        result.success = true;
      } else {
        result.errors.push('No figures extracted. The page structure may have changed.');
      }

    } catch (error: any) {
      result.errors.push(`Scraping failed: ${error.message}`);
    }

    return result;
  }

  // Helper method to scrape a range of years
  async scrapeYearRange(startYear: number, endYear: number): Promise<ScrapeResult> {
    const result: ScrapeResult = {
      success: false,
      figures: [],
      errors: [],
      skipped: 0
    };

    for (let year = startYear; year <= endYear; year++) {
      // Convert to 2-digit format (1982 -> 82, 2020 -> 20)
      const shortYear = year % 100;
      const url = `https://www.yojoe.com/action/${shortYear}/`;

      try {
        const yearResult = await this.scrape(url);
        result.figures.push(...yearResult.figures);
        result.errors.push(...yearResult.errors);

        // Be nice to the server
        await this.delay(1000);
      } catch (error: any) {
        result.errors.push(`Failed to scrape ${year}: ${error.message}`);
      }
    }

    result.success = result.figures.length > 0;
    return result;
  }
}

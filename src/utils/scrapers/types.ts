// Scraper types and interfaces

export interface ScrapedFigure {
  name: string;
  manufacturer?: string;
  productLine?: string;
  subProductLine?: string;
  year?: number;
  version?: string;
  category?: string;
  size?: string;
  packaging?: string;
  imageUrl?: string;
  notes?: string;
  series?: string;
  sourceName?: string; // Human-readable source (e.g., "YoJoe.com", "Hasbro Pulse")
  sourceUrl?: string; // URL to original figure page
}

export interface ScraperConfig {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  requiresInput?: boolean;
  inputPlaceholder?: string;
}

export interface ScrapeResult {
  success: boolean;
  figures: ScrapedFigure[];
  errors: string[];
  skipped: number;
}

export abstract class BaseScraper {
  abstract config: ScraperConfig;

  abstract scrape(input?: string): Promise<ScrapeResult>;

  // Helper to fetch with CORS handling
  protected async fetchPage(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    } catch (error: any) {
      throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
  }

  // Helper to parse HTML
  protected parseHTML(html: string): Document {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }

  // Helper to delay between requests (be nice to servers)
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper to clean text
  protected cleanText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }
}

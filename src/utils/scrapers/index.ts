// Scraper manager - central registry of all scrapers

import { BaseScraper } from './types';
import { CSVScraper } from './csvScraper';
import { GenericTableScraper } from './genericTableScraper';
import { YoJoeScraper } from './yojoeScraper';

// Registry of all available scrapers
export const SCRAPERS: BaseScraper[] = [
  new CSVScraper(),
  new GenericTableScraper(),
  new YoJoeScraper(),
  // Add more scrapers here as you build them:
  // new HasbroPulseScraper(),
  // new FigureRealmScraper(),
];

// Get scraper by ID
export function getScraperById(id: string): BaseScraper | undefined {
  return SCRAPERS.find(s => s.config.id === id);
}

// Get all scraper configs (for UI dropdown)
export function getScraperConfigs() {
  return SCRAPERS.map(s => s.config);
}

// Export types for use in components
export type { ScrapedFigure, ScrapeResult, ScraperConfig } from './types';

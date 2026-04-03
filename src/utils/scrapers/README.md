# Figure Scraper System

This directory contains the web scraping infrastructure for importing figure data into the master database.

## Overview

The scraper system allows admins to automatically extract figure data from:
- CSV/TSV files (paste or URL)
- HTML tables (checklist websites)
- Custom scrapers for specific sites

## Architecture

```
scrapers/
├── types.ts                  # Base interfaces and abstract class
├── csvScraper.ts            # CSV/TSV data parser
├── genericTableScraper.ts   # HTML table scraper
├── index.ts                 # Scraper registry
└── README.md                # This file
```

## Built-in Scrapers

### 1. CSV/TSV Import
**ID:** `csv`
**Use case:** Import from spreadsheets, database exports, or pasteboard data

**Input format:**
```csv
name,manufacturer,product line,year
Snake Eyes,Hasbro,Classified Series,2020
Storm Shadow,Hasbro,Classified Series,2020
```

Supports both comma (CSV) and tab (TSV) delimited data. Headers are auto-detected and mapped to figure properties.

**Supported column names:**
- **Name:** name, figure, title
- **Manufacturer:** manufacturer, brand, maker
- **Product Line:** product line, productline, line
- **Sub Product Line:** sub product line, subline, wave, series
- **Year:** year, released, date
- **Version:** version, ver, variant
- **Category:** category, type
- **Size:** size, scale
- **Packaging:** packaging, package
- **Image:** image, photo, url
- **Notes:** note, notes, description, desc

### 2. Generic Table Scraper
**ID:** `generic-table`
**Use case:** Scrape data from HTML tables on checklist sites

**How it works:**
1. Fetches the provided URL
2. Finds the largest table on the page
3. Extracts headers from first row
4. Maps data cells to figure properties
5. Looks for images in table cells

**Example URLs:**
- Action figure checklist sites
- Collector database pages
- Product listing pages with tables

**Note:** This scraper works best with simple, structured tables. Complex JavaScript-rendered sites may not work.

## How to Use (Admin Only)

1. Go to **Settings → Figure Database**
2. Click **"Scrape Figures"** button
3. Select a scraper from dropdown
4. Enter input (URL or paste data)
5. Click **"Run Scraper"**
6. Preview results
7. Click **"Import All"** to add to database

**Features:**
- Automatic duplicate detection (figures already in database are skipped)
- Preview data before importing
- Batch import with progress feedback
- Error handling and reporting

## Creating Custom Scrapers

Want to add a scraper for a specific site? Here's how:

### Step 1: Create a new scraper file

```typescript
// src/utils/scrapers/yojoeScraper.ts
import { BaseScraper, ScraperConfig, ScrapeResult, ScrapedFigure } from './types';

export class YoJoeScraper extends BaseScraper {
  config: ScraperConfig = {
    id: 'yojoe',
    name: 'YoJoe.com',
    description: 'Scrape G.I. Joe figures from YoJoe.com',
    baseUrl: 'https://www.yojoe.com',
    requiresInput: true,
    inputPlaceholder: 'Enter YoJoe product line URL (e.g., https://yojoe.com/classified/)'
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

      // Extract figures (customize based on site structure)
      const figureElements = doc.querySelectorAll('.figure-item');

      for (const el of Array.from(figureElements)) {
        const name = this.cleanText(el.querySelector('.name')?.textContent || '');
        const year = parseInt(el.querySelector('.year')?.textContent || '0');
        const img = el.querySelector('img');

        if (name) {
          result.figures.push({
            name,
            manufacturer: 'Hasbro',
            productLine: 'G.I. Joe',
            year: year || undefined,
            imageUrl: img?.src,
          });
        }
      }

      result.success = result.figures.length > 0;
      if (result.figures.length === 0) {
        result.errors.push('No figures found on page');
      }

    } catch (error: any) {
      result.errors.push(`Scraping failed: ${error.message}`);
    }

    return result;
  }
}
```

### Step 2: Register the scraper

Add it to `src/utils/scrapers/index.ts`:

```typescript
import { YoJoeScraper } from './yojoeScraper';

export const SCRAPERS: BaseScraper[] = [
  new CSVScraper(),
  new GenericTableScraper(),
  new YoJoeScraper(), // Add your scraper here
];
```

### Step 3: Test it

1. Build the app: `npm run build`
2. Go to Settings → Figure Database
3. Click "Scrape Figures"
4. Select your new scraper
5. Test with a URL

## Helper Methods

The `BaseScraper` class provides useful helpers:

```typescript
// Fetch a page (handles errors)
const html = await this.fetchPage(url);

// Parse HTML to DOM
const doc = this.parseHTML(html);

// Delay between requests (be nice to servers)
await this.delay(1000); // 1 second

// Clean text (trim, normalize whitespace)
const clean = this.cleanText(dirtyText);
```

## Best Practices

### 1. Be Respectful
- Add delays between requests (`await this.delay(1000)`)
- Check robots.txt before scraping
- Don't hammer servers with rapid requests
- Consider reaching out to site owners for permission

### 2. Error Handling
- Always return a `ScrapeResult` even on error
- Add descriptive error messages
- Don't throw unhandled exceptions

### 3. Data Quality
- Clean and normalize text
- Validate required fields (at minimum: name)
- Set sensible defaults (e.g., manufacturer)
- Handle missing data gracefully

### 4. Testing
- Test with multiple pages/products
- Verify image URLs are valid
- Check for edge cases (missing data, malformed HTML)
- Test duplicate detection works

## CORS Limitations

**Important:** Browser-based scrapers are limited by CORS (Cross-Origin Resource Sharing). Many sites block cross-origin requests.

**Solutions:**
1. Use a CORS proxy (not recommended for production)
2. Run scraper server-side (requires backend)
3. Use the CSV import method for bulk data
4. Build scrapers that work with CORS-enabled APIs

**For most cases:** The CSV scraper is the most reliable. Export data from source, paste into scraper.

## Future Enhancements

- [ ] Add more site-specific scrapers (YoJoe, Figure Realm, etc.)
- [ ] Support pagination (scrape multiple pages)
- [ ] Image download and upload to Firebase Storage
- [ ] Scheduled scraping (auto-update database)
- [ ] Community-submitted scrapers
- [ ] Scraper marketplace/library

## Troubleshooting

**"No figures found"**
- Check if the URL is correct
- Verify the site structure hasn't changed
- Try the Generic Table Scraper if site uses tables

**"Failed to fetch"**
- CORS issue - site blocks cross-origin requests
- Use CSV import instead
- Or contact site owner for API access

**"Scraping failed"**
- Check browser console for errors
- Verify input format is correct
- Try with a different URL/data

## Examples

### Example 1: CSV Import

```csv
name,manufacturer,product line,sub product line,year,version
Snake Eyes,Hasbro,Classified Series,Wave 1,2020,V1
Scarlett,Hasbro,Classified Series,Wave 1,2020,V1
Destro,Hasbro,Classified Series,Wave 2,2020,V1
```

### Example 2: TSV Import

```tsv
name	manufacturer	product line	year
Snake Eyes	Hasbro	Classified	2020
Storm Shadow	Hasbro	Classified	2020
```

### Example 3: Table Scraper

Just paste a URL to a page with a table of figures, e.g.:
- Product checklists
- Collector databases
- Wikipedia tables

## Support

For questions or issues:
1. Check this README
2. Review existing scrapers for examples
3. Test with CSV scraper first (most reliable)
4. File an issue if you find bugs

## License

Part of the ShelfLife app. For internal use only.

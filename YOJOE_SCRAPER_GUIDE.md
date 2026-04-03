# YoJoe.com Scraper Guide

## ⚠️ CORS Issue - Use Bookmarklet Instead!

**The built-in YoJoe scraper is blocked by browser CORS security.** This is a browser limitation that blocks cross-origin requests.

**✅ Solution: Use the Bookmarklet Method** (see below)

## 🚀 Bookmarklet Method (RECOMMENDED)

**This works perfectly and bypasses CORS!**

1. Open `yojoe-bookmarklet.html` in your browser
2. Drag the "Scrape YoJoe" button to your bookmarks bar
3. Visit any YoJoe year page (e.g., https://www.yojoe.com/action/82/)
4. Click the bookmarklet
5. CSV file downloads automatically
6. Import CSV into ShelfLife via "CSV/TSV Import" scraper

**Why this works:** The bookmarklet runs directly on YoJoe's site, so there's no cross-origin request.

---

## ~~Quick Start~~ (CORS Blocked - Use Bookmarklet Above)

~~1. Go to **Settings → Figure Database**~~
~~2. Click **"Scrape Figures"**~~
~~3. Select **"YoJoe.com"** from dropdown~~
~~4. Enter a YoJoe year URL~~
~~5. Click **"Run Scraper"**~~
~~6. Preview results~~
~~7. Click **"Import All"**~~

## How to Use

### Finding YoJoe URLs

YoJoe organizes figures by year. The URL format is:
```
https://www.yojoe.com/action/{YY}/
```

Where `{YY}` is the 2-digit year:
- **1982**: https://www.yojoe.com/action/82/
- **1983**: https://www.yojoe.com/action/83/
- **1984**: https://www.yojoe.com/action/84/
- **1985**: https://www.yojoe.com/action/85/
- **2020**: https://www.yojoe.com/action/20/
- **2021**: https://www.yojoe.com/action/21/

### Step-by-Step Example

**To import all 1982 G.I. Joe figures:**

1. Open YoJoe: https://www.yojoe.com/action/82/
2. Copy the URL
3. In ShelfLife Settings → Scrape Figures
4. Select "YoJoe.com"
5. Paste: `https://www.yojoe.com/action/82/`
6. Click "Run Scraper"
7. Wait for results (typically 10-30 figures per year)
8. Review the list
9. Click "Import All"

## What Data Is Extracted

For each figure, the scraper pulls:

- **Name**: Figure name (e.g., "Snake Eyes")
- **Manufacturer**: Always "Hasbro"
- **Product Line**: "G.I. Joe"
- **Sub Product Line**: Year (e.g., "1982")
- **Year**: 4-digit year
- **Version**: Version number (e.g., "V1", "V2")
- **Category**: "Action Figure"
- **Size**: "3.75""
- **Image**: Thumbnail from YoJoe
- **Notes**: Source URL for reference

## Tips & Tricks

### Import Multiple Years

Want to import several years at once?

**Option 1: Run scraper multiple times**
1. Import 1982: `/action/82/`
2. Import 1983: `/action/83/`
3. Import 1984: `/action/84/`
4. etc.

**Option 2: Use different product lines**
- Vintage figures: `/action/{YY}/`
- 12" figures: `/12inch/{YY}/`
- Sgt. Savage: `/sgtsavage/`

### Handling Duplicates

Don't worry about re-importing! The system automatically:
- ✅ Detects duplicates
- ✅ Skips figures already in database
- ✅ Shows count: "Imported 25 figures (3 duplicates skipped)"

### Best Practices

1. **Start with one year** - Test with a single year first
2. **Check results** - Always preview before importing
3. **Import systematically** - Go year by year for vintage line
4. **Note the version** - YoJoe marks figure versions (v1, v2, v3)

## Popular Years to Import

### Vintage G.I. Joe (1982-1994)
- **1982**: The original 13 figures
- **1983**: Expanded line with vehicles
- **1984**: Classic characters (Storm Shadow, Zartan)
- **1985**: Peak popularity year
- **1986-1994**: Continued releases

### Modern Era (2000s+)
- **2020-2022**: Classified Series (if available)
- Other modern releases

## Troubleshooting

### "No figure links found"

**Problem**: Scraper can't find figures on the page

**Solutions**:
- ✅ Verify URL is a year listing page (e.g., `/action/82/`)
- ✅ Don't use individual figure pages (e.g., `/breaker.shtml`)
- ✅ Check if year exists on YoJoe (not all years have figures)

### "CORS error" or "Failed to fetch"

**Problem**: Browser blocks cross-origin requests

**Solutions**:
- ❌ Can't fix browser CORS policy
- ✅ Use CSV Import instead (export from YoJoe, paste into CSV scraper)
- ✅ Try Generic Table Scraper if page has tables

### "Scraping failed"

**Problem**: Unexpected error

**Solutions**:
- ✅ Check internet connection
- ✅ Verify YoJoe.com is accessible
- ✅ Try again (temporary server issue)
- ✅ Report error if it persists

### Classified Series Not Working

**Problem**: Can't find Classified Series on YoJoe

**Reason**: YoJoe may not have comprehensive Classified data yet (newer line)

**Solution**: Use CSV Import with sample data:
1. Open `src/utils/scrapers/sample-data.csv`
2. Copy the Classified figures
3. Use CSV scraper to import

## Example Workflow: Import Vintage Line

**Goal**: Import all vintage G.I. Joe figures (1982-1994)

**Steps**:
1. Start with 1982: `/action/82/` → Import
2. Continue with 1983: `/action/83/` → Import
3. Continue with 1984: `/action/84/` → Import
4. Repeat for each year through 1994
5. Result: ~500+ vintage figures in database!

**Time**: ~2-3 minutes per year (including preview)

## Advanced: Year Range Scraping

The YoJoe scraper has a `scrapeYearRange()` method built-in, but it's not exposed in the UI yet. If you want to import multiple years at once, you could:

1. Request a feature to add "Year Range" input
2. Or just run the scraper multiple times manually

## Data Quality Notes

### Pros:
✅ Comprehensive vintage figure database
✅ High-quality images
✅ Accurate names and versions
✅ Well-maintained by YoJoe team

### Cons:
⚠️ May not have newest Classified Series figures
⚠️ Images are thumbnails (not high-res)
⚠️ Limited to what YoJoe has cataloged

## Alternative: CSV Method

If scraping doesn't work due to CORS:

1. Visit YoJoe year page
2. Copy figure names manually
3. Create CSV:
```csv
name,manufacturer,product line,year
Snake Eyes,Hasbro,G.I. Joe,1982
Scarlett,Hasbro,G.I. Joe,1982
```
4. Use CSV scraper

## Need Help?

- Check browser console for errors
- Verify URL format is correct
- Try with a different year
- Use CSV import as fallback
- Report persistent issues

## Feedback

Have ideas for improving the YoJoe scraper?
- Add support for other YoJoe sections?
- Scrape detailed figure info (accessories, filecard)?
- Better image handling?
- Year range bulk import?

Let us know!

# Sample Action Figure Data

This folder contains sample CSV files that can be imported into the Master Figures Database.

## Files

### `action-figures-starter.csv`
**107 action figures** across multiple franchises:

### `gijoe-arah-1982-1986.csv`
**72 G.I. Joe A Real American Hero figures** from the early years (1982-1986):
- Complete 1982 Wave 1 lineup (13 figures)
- Complete 1983 Wave 2 lineup (13 figures)
- Complete 1984 Wave 3 lineup (12 figures)
- Complete 1985 Wave 4 lineup (14 figures)
- Complete 1986 Wave 5 lineup (16 figures)
- Includes Cobra villains from each year
- Organized by wave and year
- Has subProductLine field for wave identification

---

### All Franchises in `action-figures-starter.csv`

**G.I. Joe** (29 figures)
- A Real American Hero (1982-1986) - 18 figures
- 25th Anniversary (2007) - 4 figures  
- Classified Series (2020-2021) - 7 figures

**Star Wars** (12 figures)
- Power of the Force (1995) - 5 figures
- The Black Series (2013-2020) - 7 figures

**Marvel** (13 figures)
- Spider-Man Animated Series (1994) - 3 figures
- Marvel Legends (2002-2016) - 10 figures

**DC Comics** (12 figures)
- Batman: The Animated Series (1992) - 4 figures
- DC Universe Classics (2008-2009) - 5 figures
- DC Multiverse (2020) - 3 figures

**Transformers** (8 figures)
- Generation 1 (1984) - 5 figures
- Masterpiece (2011-2014) - 3 figures

**Masters of the Universe** (8 figures)
- Vintage (1982-1983) - 3 figures
- Origins (2020) - 5 figures

**TMNT** (8 figures)
- Original (1988) - 4 figures
- Classic Collection (2020) - 4 figures

**Other Franchises**
- Spawn (4 figures)
- Power Rangers (5 figures)
- Mega Man (2 figures)

## How to Import

1. **Open Your App**
   - Go to Settings → Database → Master Figures Database

2. **Use Scrape Feature**
   - Click "Scrape Data" button
   - Select "CSV/TSV Import" from the dropdown

3. **Import the File**
   - Option A: Open the CSV in a text editor, copy all content, and paste into the scraper
   - Option B: Host the file somewhere and provide the URL to the scraper

4. **Review and Import**
   - Review the parsed figures
   - Click "Add All to Database"
   - Figures will be added to the master database

## CSV Format

The CSV uses these columns:
- `name` - Figure name (required)
- `manufacturer` - Who made it (Hasbro, Mattel, etc.)
- `franchise` - IP/franchise (G.I. Joe, Star Wars, etc.)
- `series` - Product line (A Real American Hero, Black Series, etc.)
- `year` - Release year
- `version` - Version identifier (V1, V2, etc.)
- `size` - Figure size (3.75", 6", 7", etc.)
- `category` - Type (Action Figure, Vehicle, etc.)
- `packaging` - How it's packaged (Individual, Multi-pack, etc.)

## Customizing

You can:
1. **Edit the CSV** - Add your own figures, modify existing ones
2. **Create new CSV files** - Use this format for other franchises
3. **Export from Excel** - Create lists in Excel and export as CSV

## Tips

- Use Excel or Google Sheets to manage large lists
- Keep one figure per row
- Year should be 4 digits (1982, not 82)
- Size should include quotes (3.75")
- Version helps identify variants (V1, V2, Retro, etc.)

## Need More Figures?

Resources for building your own CSV:
- YoJoe.com - G.I. Joe reference
- Rebelscum.com - Star Wars reference
- 3DJoes.com - Visual G.I. Joe database
- Action figure wikis for other franchises

Copy the data manually into a spreadsheet, then export as CSV and import!

---

**Created**: April 21, 2026  
**Total Figures**: 107  
**Franchises**: 9

/**
 * CSV/TSV Parser Utility
 * Parses CSV or TSV data into structured figure objects
 */

export interface ParsedFigure {
  name: string;
  manufacturer: string;
  franchise?: string;
  series?: string;
  year?: number;
  version?: string;
  size?: string;
  category?: string;
  packaging?: string;
  subProductLine?: string;
}

export interface ParseResult {
  success: boolean;
  figures: ParsedFigure[];
  errors: string[];
  warnings: string[];
}

/**
 * Detect delimiter (comma or tab)
 */
function detectDelimiter(data: string): ',' | '\t' {
  const firstLine = data.split('\n')[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  return tabCount > commaCount ? '\t' : ',';
}

/**
 * Parse CSV/TSV line respecting quoted fields
 */
function parseLine(line: string, delimiter: ',' | '\t'): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field separator
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Add last field
  fields.push(currentField.trim());

  return fields;
}

/**
 * Normalize header names to standard field names
 */
function normalizeHeader(header: string): string {
  const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  // Map common variations to standard names
  const mappings: Record<string, string> = {
    'name': 'name',
    'figurename': 'name',
    'actionfigure': 'name',
    'title': 'name',

    'manufacturer': 'manufacturer',
    'maker': 'manufacturer',
    'company': 'manufacturer',
    'brand': 'manufacturer',

    'franchise': 'franchise',
    'ip': 'franchise',
    'property': 'franchise',

    'series': 'series',
    'line': 'series',
    'productline': 'series',

    'year': 'year',
    'releaseyear': 'year',
    'released': 'year',

    'version': 'version',
    'variant': 'version',
    'ver': 'version',

    'size': 'size',
    'scale': 'size',
    'height': 'size',

    'category': 'category',
    'type': 'category',
    'kind': 'category',

    'packaging': 'packaging',
    'package': 'packaging',

    'subproductline': 'subProductLine',
    'subline': 'subProductLine',
    'wave': 'subProductLine',
  };

  return mappings[normalized] || normalized;
}

/**
 * Parse CSV/TSV data into figure objects
 */
export function parseCSV(data: string): ParseResult {
  const result: ParseResult = {
    success: false,
    figures: [],
    errors: [],
    warnings: []
  };

  if (!data || !data.trim()) {
    result.errors.push('No data provided');
    return result;
  }

  try {
    const delimiter = detectDelimiter(data);
    const lines = data.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      result.errors.push('CSV must contain at least a header row and one data row');
      return result;
    }

    // Parse header
    const headers = parseLine(lines[0], delimiter).map(normalizeHeader);

    // Check for required fields
    if (!headers.includes('name')) {
      result.errors.push('CSV must contain a "name" column');
      return result;
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i].trim();

      if (!line) continue; // Skip empty lines

      const fields = parseLine(line, delimiter);

      if (fields.length !== headers.length) {
        result.warnings.push(`Line ${lineNumber}: Field count mismatch (expected ${headers.length}, got ${fields.length})`);
      }

      const figure: ParsedFigure = {
        name: '',
        manufacturer: ''
      };

      // Map fields to figure properties
      for (let j = 0; j < Math.min(headers.length, fields.length); j++) {
        const header = headers[j];
        const value = fields[j];

        if (!value) continue;

        switch (header) {
          case 'name':
            figure.name = value;
            break;
          case 'manufacturer':
            figure.manufacturer = value;
            break;
          case 'franchise':
            figure.franchise = value;
            break;
          case 'series':
            figure.series = value;
            break;
          case 'year':
            const yearNum = parseInt(value);
            if (!isNaN(yearNum)) {
              figure.year = yearNum;
            } else {
              result.warnings.push(`Line ${lineNumber}: Invalid year "${value}"`);
            }
            break;
          case 'version':
            figure.version = value;
            break;
          case 'size':
            figure.size = value;
            break;
          case 'category':
            figure.category = value;
            break;
          case 'packaging':
            figure.packaging = value;
            break;
          case 'subproductline':
            figure.subProductLine = value;
            break;
        }
      }

      // Validate required fields
      if (!figure.name) {
        result.errors.push(`Line ${lineNumber}: Missing required field "name"`);
        continue;
      }

      // Set default manufacturer if missing
      if (!figure.manufacturer) {
        figure.manufacturer = 'Unknown';
        result.warnings.push(`Line ${lineNumber}: Missing manufacturer, using "Unknown"`);
      }

      result.figures.push(figure);
    }

    if (result.figures.length === 0) {
      result.errors.push('No valid figures found in CSV');
      return result;
    }

    result.success = true;

  } catch (error) {
    result.errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Validate figure data before import
 */
export function validateFigure(figure: ParsedFigure): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!figure.name || !figure.name.trim()) {
    errors.push('Name is required');
  }

  if (figure.year && (figure.year < 1900 || figure.year > new Date().getFullYear() + 1)) {
    errors.push(`Invalid year: ${figure.year}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

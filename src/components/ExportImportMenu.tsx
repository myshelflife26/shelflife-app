import { useRef, useMemo, useState, useEffect } from 'react';
import { Storage } from '../utils/storage';
import { SettingsService } from '../utils/settings';
import type { ActionFigure, CustomField } from '../types/index';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import { Download, Upload, FileJson, FileSpreadsheet, FileText } from 'lucide-react';

interface ExportImportMenuProps {
  onImport: (figures: ActionFigure[]) => void;
  selectedFigures: ActionFigure[];
  allFigures: ActionFigure[];
}

export function ExportImportMenu({ onImport, selectedFigures, allFigures }: ExportImportMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Load custom fields from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await SettingsService.getSettings();
      setCustomFields(settings.customFields);
    };
    loadSettings();
  }, []);

  const handleExportJSON = () => {
    // If figures are selected, export only those; otherwise export all
    const figuresToExport = selectedFigures.length > 0 ? selectedFigures : allFigures;
    const json = JSON.stringify(figuresToExport, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = selectedFigures.length > 0 ? `-selected-${selectedFigures.length}` : '';
    a.download = `action-figures${suffix}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    // If figures are selected, export only those; otherwise export all
    const figuresToExport = selectedFigures.length > 0 ? selectedFigures : allFigures;

    if (figuresToExport.length === 0) {
      alert('No figures to export.');
      return;
    }

    // Generate CSV headers including custom fields
    const baseHeaders = [
      'Name', 'Version', 'Year', 'Manufacturer', 'Category', 'Condition',
      'CF Head', 'CF Torso', 'CF Waist', 'CF Right Arm', 'CF Left Arm',
      'CF Right Leg', 'CF Left Leg', 'CF Accessories', 'CF Other',
      'Size', 'Packaging', 'Product Line', 'Sub Product Line', 'Current Value',
      'Purchase Date', 'Location', 'Is Complete', 'Completeness Notes',
      'Is Public', 'Availability (For Sale)', 'Availability (For Trade)', 'Notes'
    ];
    const customFieldHeaders = customFields.map(f => f.name);
    const headers = [...baseHeaders, ...customFieldHeaders];

    const rows = figuresToExport.map(figure => {
      const baseRow = [
        figure.name,
        figure.version || '',
        figure.year?.toString() || '',
        figure.manufacturer || '',
        figure.category || '',
        figure.condition,
        figure.customFormula?.head || '',
        figure.customFormula?.torso || '',
        figure.customFormula?.waist || '',
        figure.customFormula?.rightArm || '',
        figure.customFormula?.leftArm || '',
        figure.customFormula?.rightLeg || '',
        figure.customFormula?.leftLeg || '',
        figure.customFormula?.accessories || '',
        figure.customFormula?.other || '',
        figure.size || '',
        figure.packaging || '',
        figure.productLine || '',
        figure.subProductLine || '',
        figure.currentValue.toString(),
        figure.purchaseDate,
        figure.location || '',
        figure.isComplete !== undefined ? (figure.isComplete ? 'Yes' : 'No') : '',
        figure.completenessNotes || '',
        figure.isPublic ? 'Yes' : 'No',
        figure.availability?.includes('for-sale') ? 'Yes' : 'No',
        figure.availability?.includes('for-trade') ? 'Yes' : 'No',
        figure.notes || ''
      ];

      // Add custom field values
      const customFieldValues = customFields.map(field => {
        const value = figure.customFields?.[field.id];
        return value !== undefined && value !== null ? String(value) : '';
      });

      return [...baseRow, ...customFieldValues];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = selectedFigures.length > 0 ? `-selected-${selectedFigures.length}` : '';
    a.download = `action-figures${suffix}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSONTemplate = () => {
    const template: Partial<ActionFigure> = {
      name: 'Example Figure Name',
      version: 'V1',
      year: 2024,
      manufacturer: 'Example Manufacturer',
      category: 'Example Category',
      condition: 'Custom',
      customFormula: {
        head: 'Duke v2',
        torso: 'Snake Eyes v1',
        waist: 'Roadblock',
        rightArm: 'Gung-Ho',
        leftArm: 'Flint',
        rightLeg: 'Stalker',
        leftLeg: 'Heavy Duty',
        accessories: 'Storm Shadow sword, Destro pistol',
        other: 'Custom painted'
      },
      size: '3.75"',
      packaging: 'Individual',
      productLine: 'Example Product Line',
      subProductLine: 'Example Sub Line',
      currentValue: 25.00,
      purchaseDate: '2024-01-01',
      location: 'Display Shelf A',
      isComplete: true,
      completenessNotes: '',
      isPublic: false,
      availability: ['for-sale'],
      notes: 'Example notes about this figure',
      customFields: {}
    };

    // Add custom field examples
    customFields.forEach(field => {
      if (template.customFields) {
        switch (field.type) {
          case 'text':
          case 'textarea':
            template.customFields[field.id] = 'Example text';
            break;
          case 'number':
            template.customFields[field.id] = 0;
            break;
          case 'date':
            template.customFields[field.id] = '2024-01-01';
            break;
          case 'select':
            template.customFields[field.id] = field.options?.[0] || 'Option 1';
            break;
        }
      }
    });

    const json = JSON.stringify([template], null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `action-figures-template-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSVTemplate = () => {
    const baseHeaders = [
      'Name', 'Version', 'Year', 'Manufacturer', 'Category', 'Condition',
      'CF Head', 'CF Torso', 'CF Waist', 'CF Right Arm', 'CF Left Arm',
      'CF Right Leg', 'CF Left Leg', 'CF Accessories', 'CF Other',
      'Size', 'Packaging', 'Product Line', 'Sub Product Line', 'Current Value',
      'Purchase Date (YYYY-MM-DD)', 'Location', 'Is Complete', 'Completeness Notes',
      'Is Public', 'Availability (For Sale)', 'Availability (For Trade)', 'Notes'
    ];
    const customFieldHeaders = customFields.map(f => f.name);
    const headers = [...baseHeaders, ...customFieldHeaders];

    // Just headers, no example row to avoid importing it
    const csv = headers.join(',');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `action-figures-template-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const parseCSV = (text: string): ActionFigure[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file is empty or missing headers');
    }

    // Parse headers
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.replace(/^"|"$/g, '').trim());

    // Parse data rows
    const figures: ActionFigure[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Simple CSV parser (handles quoted fields)
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          if (inQuotes && line[j + 1] === '"') {
            current += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      // Map values to figure object
      const figure: Partial<ActionFigure> = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        customFields: {}
      };

      headers.forEach((header, index) => {
        const value = values[index] || '';

        switch (header) {
          case 'Name':
            figure.name = value;
            break;
          case 'Version':
            figure.version = value;
            break;
          case 'Year':
            if (value) {
              const yearNum = parseInt(value);
              if (!isNaN(yearNum)) {
                figure.year = yearNum;
              }
            }
            break;
          case 'Manufacturer':
            figure.manufacturer = value;
            break;
          case 'Category':
            figure.category = value;
            break;
          case 'Condition':
            // Normalize condition value - handle "MIB (Mint in Box)" → "MIB"
            let normalizedCondition = value.trim();
            if (normalizedCondition.startsWith('MIB')) {
              normalizedCondition = 'MIB';
            }
            figure.condition = normalizedCondition;
            break;
          case 'CF Head':
            if (!figure.customFormula) figure.customFormula = {};
            if (value) figure.customFormula.head = value;
            break;
          case 'CF Torso':
            if (!figure.customFormula) figure.customFormula = {};
            if (value) figure.customFormula.torso = value;
            break;
          case 'CF Waist':
            if (!figure.customFormula) figure.customFormula = {};
            if (value) figure.customFormula.waist = value;
            break;
          case 'CF Right Arm':
            if (!figure.customFormula) figure.customFormula = {};
            if (value) figure.customFormula.rightArm = value;
            break;
          case 'CF Left Arm':
            if (!figure.customFormula) figure.customFormula = {};
            if (value) figure.customFormula.leftArm = value;
            break;
          case 'CF Right Leg':
            if (!figure.customFormula) figure.customFormula = {};
            if (value) figure.customFormula.rightLeg = value;
            break;
          case 'CF Left Leg':
            if (!figure.customFormula) figure.customFormula = {};
            if (value) figure.customFormula.leftLeg = value;
            break;
          case 'CF Accessories':
            if (!figure.customFormula) figure.customFormula = {};
            if (value) figure.customFormula.accessories = value;
            break;
          case 'CF Other':
            if (!figure.customFormula) figure.customFormula = {};
            if (value) figure.customFormula.other = value;
            break;
          case 'Size':
            figure.size = value;
            break;
          case 'Packaging':
            figure.packaging = value;
            break;
          case 'Product Line':
            figure.productLine = value;
            break;
          case 'Sub Product Line':
            figure.subProductLine = value;
            break;
          case 'Current Value':
            figure.currentValue = parseFloat(value) || 0;
            break;
          case 'Purchase Date':
          case 'Purchase Date (YYYY-MM-DD)':
            figure.purchaseDate = value;
            break;
          case 'Location':
            figure.location = value;
            break;
          case 'Is Complete':
            if (value) {
              figure.isComplete = value.toLowerCase() === 'yes';
            }
            break;
          case 'Completeness Notes':
            figure.completenessNotes = value;
            break;
          case 'Is Public':
            if (value) {
              figure.isPublic = value.toLowerCase() === 'yes';
            }
            break;
          case 'Availability (For Sale)':
            if (!figure.availability) figure.availability = [];
            if (value.toLowerCase() === 'yes') {
              figure.availability.push('for-sale');
            }
            break;
          case 'Availability (For Trade)':
            if (!figure.availability) figure.availability = [];
            if (value.toLowerCase() === 'yes') {
              figure.availability.push('for-trade');
            }
            break;
          case 'Notes':
            figure.notes = value;
            break;
          default:
            // Check if it's a custom field
            const customField = customFields.find(f => f.name === header);
            if (customField && figure.customFields) {
              // Convert value based on field type
              let convertedValue: any = value;
              if (customField.type === 'number') {
                convertedValue = parseFloat(value) || 0;
              }
              figure.customFields[customField.id] = convertedValue;
            }
        }
      });

      // Apply business logic for isComplete and completeness notes
      if (figure.condition === 'MIB') {
        // MIB figures are always complete
        figure.isComplete = true;
        figure.completenessNotes = '';
      } else if (figure.condition === 'Loose') {
        // For Loose condition, respect the isComplete value
        // If isComplete is true or not set, clear completeness notes
        if (figure.isComplete !== false) {
          figure.completenessNotes = '';
        }
        // If isComplete is false, keep completeness notes
      } else {
        // For Custom or other conditions, don't enforce isComplete logic
      }

      // Validate required fields
      if (figure.name && figure.condition) {
        figures.push(figure as ActionFigure);
      }
    }

    return figures;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const fileName = file.name.toLowerCase();

      let figures: ActionFigure[];

      if (fileName.endsWith('.csv')) {
        // Parse CSV
        figures = parseCSV(text);
      } else if (fileName.endsWith('.json')) {
        // Parse JSON
        const data = JSON.parse(text);

        if (!Array.isArray(data)) {
          alert('Invalid JSON format. Expected an array of figures.');
          return;
        }

        figures = data;
      } else {
        alert('Unsupported file type. Please upload a .json or .csv file.');
        return;
      }

      // Pass figures to parent component for saving
      onImport(figures);
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import file. Please ensure it is a valid JSON or CSV file. Error: ' + (error as Error).message);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            {selectedFigures.length > 0 && (
              <span className="ml-2 bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs">
                {selectedFigures.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Export</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleExportJSON}>
            <FileJson className="h-4 w-4 mr-2" />
            {selectedFigures.length > 0 ? `Export ${selectedFigures.length} Selected (JSON)` : 'Export as JSON'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {selectedFigures.length > 0 ? `Export ${selectedFigures.length} Selected (CSV)` : 'Export as CSV'}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Import</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleImportClick}>
            <Upload className="h-4 w-4 mr-2" />
            Import from File
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Download Templates</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleDownloadJSONTemplate}>
            <FileJson className="h-4 w-4 mr-2" />
            JSON Template
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadCSVTemplate}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV Template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}

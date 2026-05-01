import { useState, useEffect } from 'react';
import { MasterFiguresService } from '../utils/masterFigures';
import type { User } from '../types/user';
import { Database, Plus, Search, Edit, Trash2, Package, ArrowUpDown, ImageOff, Upload, GitMerge, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Combobox } from './ui/combobox';
import { Select } from './ui/select';
import { Label } from './ui/label';
import { SettingsService } from '../utils/settings';
import { toastManager } from '../utils/toastManager';
import type { AppSettings } from '../types/index';
import { parseCSV, type ParseResult } from '../utils/csvParser';
import { DuplicateDetectionPage } from './DuplicateDetectionPage';
import { DataCleanupDialog } from './DataCleanupDialog';

interface MasterFiguresDatabasePageProps {
  currentUser: User;
}

type SortField = 'name' | 'franchise' | 'series' | 'manufacturer' | 'year';
type SortDirection = 'asc' | 'desc';

export function MasterFiguresDatabasePage({ currentUser }: MasterFiguresDatabasePageProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [masterFigures, setMasterFigures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingFigure, setEditingFigure] = useState<any>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [csvData, setCsvData] = useState('');
  const [parsedImportData, setParsedImportData] = useState<ParseResult | null>(null);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [showDuplicateDetection, setShowDuplicateDetection] = useState(false);
  const [showDataCleanup, setShowDataCleanup] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    year: '',
    franchise: '',
    series: '',
    productLineNumber: '',
    subProductLine: '',
    manufacturer: '',
    size: '',
    imageUrl: ''
  });

  // Helper function to ensure current value is in options list
  const ensureValueInOptions = (options: string[], currentValue?: string): string[] => {
    if (!currentValue || options.includes(currentValue)) {
      return options;
    }
    return [...options, currentValue].sort();
  };

  useEffect(() => {
    const loadSettings = async () => {
      const loadedSettings = await SettingsService.getSettings();
      setSettings(loadedSettings);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    loadMasterFigures();
  }, []);

  const loadMasterFigures = async () => {
    setLoading(true);
    try {
      const figures = await MasterFiguresService.getAll();
      setMasterFigures(figures);
    } catch (error) {
      console.error('Failed to load master figures:', error);
      toastManager.error('Failed to load database');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingFigure(null);
    setFormData({
      name: '',
      version: '',
      year: '',
      franchise: '',
      series: '',
      productLineNumber: '',
      subProductLine: '',
      manufacturer: '',
      size: '',
      imageUrl: ''
    });
    setDialogOpen(true);
  };

  const handleEdit = (figure: any) => {
    setEditingFigure(figure);
    setFormData({
      name: figure.name || '',
      version: figure.version || '',
      year: figure.year?.toString() || '',
      franchise: figure.franchise || '',
      series: figure.series || '',
      productLineNumber: figure.productLineNumber || '',
      subProductLine: figure.subProductLine || '',
      manufacturer: figure.manufacturer || '',
      size: figure.size || '',
      imageUrl: figure.imageUrl || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toastManager.error('Figure name is required');
      return;
    }

    try {
      const figureData = {
        name: formData.name.trim(),
        version: formData.version.trim() || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        franchise: formData.franchise.trim() || undefined,
        series: formData.series.trim() || undefined,
        productLineNumber: formData.productLineNumber.trim() || undefined,
        subProductLine: formData.subProductLine.trim() || undefined,
        manufacturer: formData.manufacturer.trim() || undefined,
        size: formData.size.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined
      };

      if (editingFigure) {
        // Update existing
        await MasterFiguresService.updateFigure(editingFigure.id, figureData);
        toastManager.success('Figure updated in database');
      } else {
        // Add new
        await MasterFiguresService.addFromUserFigure(
          figureData,
          currentUser.id,
          currentUser.displayName,
          'manual'
        );
        toastManager.success('Figure added to database');
      }

      setDialogOpen(false);
      loadMasterFigures();
    } catch (error) {
      console.error('Failed to save figure:', error);
      toastManager.error('Failed to save figure');
    }
  };

  const handleDelete = async (figure: any) => {
    if (confirm(`Delete "${figure.name}" from the master database? This cannot be undone.`)) {
      try {
        await MasterFiguresService.deleteFigure(figure.id);
        toastManager.success('Figure deleted from database');
        loadMasterFigures();
      } catch (error) {
        console.error('Failed to delete figure:', error);
        toastManager.error('Failed to delete figure');
      }
    }
  };

  // Handle CSV parsing for preview
  const handleParseCSV = () => {
    if (!csvData.trim()) {
      toastManager.error('Please paste CSV data first');
      return;
    }

    const result = parseCSV(csvData);
    setParsedImportData(result);
    setShowImportPreview(true);

    if (result.success) {
      toastManager.success(`Parsed ${result.figures.length} figures successfully`);
    } else {
      toastManager.error(`Parse failed: ${result.errors.join(', ')}`);
    }
  };

  // Handle CSV import to master database
  const handleImportCSV = async () => {
    if (!parsedImportData || !parsedImportData.success) {
      toastManager.error('Please parse CSV data first');
      return;
    }

    try {
      const figureCount = parsedImportData.figures.length;
      const confirmImport = confirm(
        `Import ${figureCount} figure${figureCount > 1 ? 's' : ''} to the master database?`
      );

      if (!confirmImport) return;

      let importedCount = 0;
      let skippedCount = 0;

      // Import each figure
      for (const pf of parsedImportData.figures) {
        const figure = {
          name: pf.name,
          version: pf.version,
          year: pf.year,
          franchise: pf.franchise,
          series: pf.series,
          manufacturer: pf.manufacturer || 'Unknown',
          category: pf.category || 'Action Figure',
          size: pf.size,
          productLine: pf.series, // Use series as productLine for compatibility
          productLineNumber: pf.productLineNumber,
          subProductLine: pf.subProductLine,
          packaging: pf.packaging,
          source: 'import' as const,
          sourceName: 'CSV Import'
        };

        const added = await MasterFiguresService.add(
          figure,
          currentUser.id,
          currentUser.displayName
        );

        if (added) {
          importedCount++;
        } else {
          skippedCount++;
        }
      }

      toastManager.success(
        `Imported ${importedCount} figures${skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ''}`
      );

      // Reset import state
      setCsvData('');
      setParsedImportData(null);
      setShowImportPreview(false);
      setImportDialogOpen(false);

      // Reload database
      loadMasterFigures();
    } catch (error) {
      console.error('Failed to import CSV:', error);
      toastManager.error('Failed to import figures');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredFigures = masterFigures
    .filter(fig => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        fig.name?.toLowerCase().includes(term) ||
        fig.series?.toLowerCase().includes(term) ||
        fig.manufacturer?.toLowerCase().includes(term) ||
        fig.franchise?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';

      // Handle year as number
      if (sortField === 'year') {
        aVal = a[sortField] || 0;
        bVal = b[sortField] || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // String comparison
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  if (!settings || loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading database...</p>
      </div>
    );
  }

  return (
    <div className="w-full box-border relative">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Master Figures Database</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {masterFigures.length} figures in database
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setImportDialogOpen(true)}
              variant="default"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            {currentUser.role === 'management' && (
              <>
                <Button
                  onClick={() => setShowDuplicateDetection(true)}
                  variant="outline"
                >
                  <GitMerge className="h-4 w-4 mr-2" />
                  Find Duplicates
                </Button>
                <Button
                  onClick={() => setShowDataCleanup(true)}
                  variant="outline"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Clean Up Data
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search database by name, series, or manufacturer..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      {filteredFigures.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'No figures found matching your search' : 'No figures in database yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-12">
                    Image
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      {sortField === 'name' && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('franchise')}
                  >
                    <div className="flex items-center gap-2">
                      Franchise/IP
                      {sortField === 'franchise' && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('series')}
                  >
                    <div className="flex items-center gap-2">
                      Product Line
                      {sortField === 'series' && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('manufacturer')}
                  >
                    <div className="flex items-center gap-2">
                      Manufacturer
                      {sortField === 'manufacturer' && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('year')}
                  >
                    <div className="flex items-center gap-2">
                      Year
                      {sortField === 'year' && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredFigures.map((figure) => (
                  <tr
                    key={figure.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <td className="px-2 py-3">
                      {figure.imageUrl ? (
                        <img
                          src={figure.imageUrl}
                          alt={figure.name}
                          className="w-5 h-5 object-cover rounded"
                        />
                      ) : (
                        <div className="w-5 h-5 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                          <ImageOff className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {figure.name}
                        </div>
                        {figure.version && (
                          <div className="text-sm text-blue-600 dark:text-blue-400">
                            {figure.version}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {figure.franchise || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {figure.series || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {figure.manufacturer || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {figure.year || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(figure)}
                          className="p-1 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(figure)}
                          className="p-1 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={handleAddNew}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50"
        title="Add Figure"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingFigure ? 'Edit Figure' : 'Add Figure to Database'}
              </h2>
              <button
                onClick={() => setDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Figure Name *
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter figure name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Version
                  </Label>
                  <Combobox
                    value={formData.version || ''}
                    onChange={(value) => setFormData({ ...formData, version: value })}
                    options={ensureValueInOptions(settings.versionOptions, formData.version)}
                    placeholder="Type or select..."
                    emptyMessage="No version found. Type to add new."
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Year
                  </Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="e.g., 1984"
                  />
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Franchise/IP
                </Label>
                <Combobox
                  value={formData.franchise || ''}
                  onChange={(value) => setFormData({ ...formData, franchise: value })}
                  options={ensureValueInOptions(settings.franchiseOptions, formData.franchise)}
                  placeholder="Type or select franchise..."
                  emptyMessage="No franchise found. Type to add new."
                />
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Action Figure Product Line
                </Label>
                <Combobox
                  value={formData.series || ''}
                  onChange={(value) => setFormData({ ...formData, series: value })}
                  options={ensureValueInOptions(settings.seriesOptions, formData.series)}
                  placeholder="Type or select product line..."
                  emptyMessage="No product line found. Type to add new."
                />
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Product Line Number
                </Label>
                <Input
                  value={formData.productLineNumber || ''}
                  onChange={(e) => setFormData({ ...formData, productLineNumber: e.target.value })}
                  placeholder="e.g., #45, 1234"
                />
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sub-Product Line
                </Label>
                <Combobox
                  value={formData.subProductLine || ''}
                  onChange={(value) => setFormData({ ...formData, subProductLine: value })}
                  options={ensureValueInOptions(settings.subSeriesOptions || [], formData.subProductLine)}
                  placeholder="Type or select sub-product line..."
                  emptyMessage="No sub-product line found. Type to add new."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Manufacturer
                  </Label>
                  <Combobox
                    value={formData.manufacturer || ''}
                    onChange={(value) => setFormData({ ...formData, manufacturer: value })}
                    options={ensureValueInOptions(settings.manufacturerOptions, formData.manufacturer)}
                    placeholder="Type or select manufacturer..."
                    emptyMessage="No manufacturer found. Type to add new."
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Size
                  </Label>
                  <Select
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  >
                    <option value="">Select size...</option>
                    {ensureValueInOptions(settings.sizeOptions, formData.size).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image URL
                </Label>
                <Input
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingFigure ? 'Update' : 'Add to Database'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {importDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Import Figures to Master Database
              </h2>
              <button
                onClick={() => setImportDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Import action figures from CSV or TSV format. Paste your data below or use sample files.
                </p>

                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    CSV Format
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                    Expected columns: name, manufacturer, franchise, series, year, version, size, category, packaging, subProductLine (optional)
                  </p>
                  <code className="text-xs text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded block overflow-x-auto">
                    name,manufacturer,franchise,series,year,version,size,category,packaging
                  </code>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CSV/TSV Data
                  </label>
                  <textarea
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    className="w-full h-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                    placeholder="name,manufacturer,franchise,series,year,version,size,category,packaging&#10;Snake Eyes,Hasbro,G.I. Joe,A Real American Hero,1982,V1,3.75&quot;,Action Figure,Individual&#10;Scarlett,Hasbro,G.I. Joe,A Real American Hero,1982,V1,3.75&quot;,Action Figure,Individual"
                  />
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Sample Data Files
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Try importing one of our sample CSV files located in the <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">sample-data/</code> folder.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    <li><strong>action-figures-starter.csv</strong> - 107 figures across 9 franchises</li>
                    <li><strong>gijoe-arah-1982-1986.csv</strong> - 72 G.I. Joe figures from 1982-1986</li>
                  </ul>
                </div>

                {/* Preview Section */}
                {showImportPreview && parsedImportData && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Import Preview
                    </h3>

                    {/* Errors */}
                    {parsedImportData.errors.length > 0 && (
                      <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <h4 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
                          Errors ({parsedImportData.errors.length})
                        </h4>
                        <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-300 space-y-1">
                          {parsedImportData.errors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Warnings */}
                    {parsedImportData.warnings.length > 0 && (
                      <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                          Warnings ({parsedImportData.warnings.length})
                        </h4>
                        <ul className="list-disc list-inside text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                          {parsedImportData.warnings.slice(0, 5).map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                          {parsedImportData.warnings.length > 5 && (
                            <li>... and {parsedImportData.warnings.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Success Preview */}
                    {parsedImportData.success && parsedImportData.figures.length > 0 && (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <p className="text-sm font-semibold text-green-900 dark:text-green-200">
                            Ready to import {parsedImportData.figures.length} figure{parsedImportData.figures.length > 1 ? 's' : ''}
                          </p>
                        </div>

                        <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Manufacturer</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Franchise</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Series</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Year</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {parsedImportData.figures.slice(0, 10).map((figure, i) => (
                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                                  <td className="px-4 py-2 text-gray-900 dark:text-white">{figure.name}</td>
                                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{figure.manufacturer || '-'}</td>
                                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{figure.franchise || '-'}</td>
                                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{figure.series || '-'}</td>
                                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{figure.year || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {parsedImportData.figures.length > 10 && (
                            <div className="p-2 text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                              ... and {parsedImportData.figures.length - 10} more figures
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => {
                setImportDialogOpen(false);
                setCsvData('');
                setParsedImportData(null);
                setShowImportPreview(false);
              }}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleParseCSV}
                disabled={!csvData.trim()}
              >
                Parse & Preview
              </Button>
              <Button
                onClick={handleImportCSV}
                disabled={!parsedImportData || !parsedImportData.success}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import to Database
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Detection Dialog */}
      {showDuplicateDetection && (
        <DuplicateDetectionPage
          currentUser={currentUser}
          onClose={() => {
            setShowDuplicateDetection(false);
            // Reload figures after closing
            loadMasterFigures();
          }}
        />
      )}

      {/* Data Cleanup Dialog */}
      {showDataCleanup && (
        <DataCleanupDialog
          onClose={() => setShowDataCleanup(false)}
          onCleanupComplete={() => {
            // Reload figures after cleanup
            loadMasterFigures();
          }}
        />
      )}
    </div>
  );
}

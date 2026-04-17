import { useState, useEffect } from 'react';
import { MasterFiguresService } from '../utils/masterFigures';
import type { User } from '../types/user';
import { Database, Plus, Search, Edit, Trash2, Package, ArrowUpDown, ImageOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Combobox } from './ui/combobox';
import { Select } from './ui/select';
import { Label } from './ui/label';
import { SettingsService } from '../utils/settings';
import { toastManager } from '../utils/toastManager';

interface MasterFiguresDatabasePageProps {
  currentUser: User;
}

type SortField = 'name' | 'series' | 'manufacturer' | 'year';
type SortDirection = 'asc' | 'desc';

export function MasterFiguresDatabasePage({ currentUser }: MasterFiguresDatabasePageProps) {
  const settings = SettingsService.getSettings();
  const [masterFigures, setMasterFigures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFigure, setEditingFigure] = useState<any>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    year: '',
    franchise: '',
    series: '',
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

  if (loading) {
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
    </div>
  );
}

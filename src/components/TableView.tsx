import { useState, useMemo, useRef, useEffect } from 'react';
import type { ActionFigure, CustomField } from '../types/index';
import { SettingsService } from '../utils/settings';
import { ReactionsService } from '../utils/reactions';
import { AuthService } from '../utils/auth';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { ColumnVisibilityMenu } from './ColumnVisibilityMenu';
import { Pencil, Trash2, ChevronUp, ChevronDown, Package, Clock, Eye, Flame, Heart, ThumbsUp, Check, X as XIcon, AlertCircle, Star } from 'lucide-react';

interface TableViewProps {
  figures: ActionFigure[];
  onEdit: (figure: ActionFigure) => void;
  onDelete: (figure: ActionFigure) => void;
  onDelayedDelete?: (figure: ActionFigure) => void; // Optional delayed delete (admin only)
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onToggleFavorite?: (figureId: string) => void;
}

type SortField = 'name' | 'manufacturer' | 'category' | 'condition' | 'currentValue' | 'purchaseDate';
type SortDirection = 'asc' | 'desc';

export function TableView({ figures, onEdit, onDelete, onDelayedDelete, selectedIds, onToggleSelect, onSelectAll, onDeselectAll, onToggleFavorite }: TableViewProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load custom fields and column visibility from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await SettingsService.getSettings();
      setCustomFields(settings.customFields);
      const columns = await SettingsService.getColumnVisibility();
      setVisibleColumns(columns);
    };
    loadSettings();
  }, []);

  const refreshColumnVisibility = async () => {
    const columns = await SettingsService.getColumnVisibility();
    setVisibleColumns(columns);
  };

  const allSelected = figures.length > 0 && figures.every(f => selectedIds.has(f.id));
  const someSelected = figures.some(f => selectedIds.has(f.id)) && !allSelected;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedFigures = [...figures].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    // Handle undefined/null values
    if (!aVal) aVal = '';
    if (!bVal) bVal = '';

    // Compare based on type
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    // String comparison
    const comparison = String(aVal).localeCompare(String(bVal));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  if (figures.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No figures found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Column Visibility Menu */}
      <div className="flex justify-end px-4 sm:px-6 lg:px-8">
        <ColumnVisibilityMenu onVisibilityChange={refreshColumnVisibility} />
      </div>

      <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-auto border-2 border-gray-300 dark:border-gray-600 sm:border sm:border-gray-200 sm:dark:border-gray-700 sm:rounded-lg sm:mx-4 lg:mx-8 bg-white dark:bg-gray-800 sm:relative" style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain', touchAction: 'pan-x' }}>
            <table className="border-collapse bg-white dark:bg-gray-800" style={{ width: 'max-content', minWidth: '100%' }}>
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            <th className="px-0.5 py-2 text-center w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => allSelected ? onDeselectAll() : onSelectAll()}
                aria-label="Select all"
              />
            </th>
            {onToggleFavorite && (
              <th className="px-0.5 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase w-10">
                <Star className="h-3.5 w-3.5 inline" />
              </th>
            )}
            {visibleColumns.image !== false && (
              <th className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase w-16">
                Image
              </th>
            )}
            {visibleColumns.name !== false && (
              <th
                className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={() => handleSort('name')}
              >
                Name <SortIcon field="name" />
              </th>
            )}
            {visibleColumns.year !== false && (
              <th className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                Year
              </th>
            )}
            {visibleColumns.manufacturer !== false && (
              <th
                className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={() => handleSort('manufacturer')}
              >
                Manufacturer <SortIcon field="manufacturer" />
              </th>
            )}
            {visibleColumns.category !== false && (
              <th
                className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={() => handleSort('category')}
              >
                Category <SortIcon field="category" />
              </th>
            )}
            {visibleColumns.condition !== false && (
              <th
                className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={() => handleSort('condition')}
              >
                Condition <SortIcon field="condition" />
              </th>
            )}
            {visibleColumns.size !== false && (
              <th className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                Size
              </th>
            )}
            {visibleColumns.packaging !== false && (
              <th className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                Packaging
              </th>
            )}
            {visibleColumns.currentValue !== false && (
              <th
                className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={() => handleSort('currentValue')}
              >
                Value <SortIcon field="currentValue" />
              </th>
            )}
            {visibleColumns.purchaseDate !== false && (
              <th
                className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={() => handleSort('purchaseDate')}
              >
                Purchase Date <SortIcon field="purchaseDate" />
              </th>
            )}
            {visibleColumns.location !== false && (
              <th className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                Location
              </th>
            )}
            {visibleColumns.availability !== false && (
              <th className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                Availability
              </th>
            )}
            {visibleColumns.completeness !== false && (
              <th className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  Completeness
                </span>
              </th>
            )}
            {visibleColumns.jealousyMeter !== false && (
              <th className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                <span className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Jealousy
                </span>
              </th>
            )}
            {customFields.map(field => (
              <th key={field.id} className="px-0.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                {field.name}
              </th>
            ))}
            <th className="px-0.5 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedFigures.map((figure) => {
            const mainImage = figure.images && figure.images.length > 0
              ? figure.images[figure.mainImageIndex ?? 0]
              : null;

            return (
              <tr
                key={figure.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-0.5 py-2 text-center">
                  <Checkbox
                    checked={selectedIds.has(figure.id)}
                    onCheckedChange={() => onToggleSelect(figure.id)}
                    aria-label={`Select ${figure.name}`}
                  />
                </td>
                {onToggleFavorite && (
                  <td className="px-0.5 py-2 text-center">
                    <button
                      onClick={() => onToggleFavorite(figure.id)}
                      className={`p-1 rounded transition-colors ${
                        figure.isFavorite
                          ? 'text-yellow-500 hover:text-yellow-600'
                          : 'text-gray-400 hover:text-yellow-500'
                      }`}
                      title={figure.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`h-4 w-4 ${figure.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  </td>
                )}
                {visibleColumns.image !== false && (
                  <td className="px-2 py-2">
                    <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={figure.name}
                          className="w-full h-full object-cover"
                          style={{ objectPosition: figure.imagePosition || 'center center' }}
                        />
                      ) : (
                        <Package className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  </td>
                )}
                {visibleColumns.name !== false && (
                  <td className="px-0.5 py-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <span>
                        {figure.name}
                        {figure.version && (
                          <span className="ml-2 text-xs font-normal text-gray-600 dark:text-gray-400">({figure.version})</span>
                        )}
                      </span>
                      {figure.isPublic && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <Eye className="h-3 w-3 mr-1" />
                          Public
                        </span>
                      )}
                    </div>
                  </td>
                )}
                {visibleColumns.year !== false && (
                  <td className="px-0.5 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    {figure.year || '-'}
                  </td>
                )}
              {visibleColumns.manufacturer !== false && (
                <td className="px-0.5 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  {figure.manufacturer || '-'}
                </td>
              )}
              {visibleColumns.category !== false && (
                <td className="px-0.5 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  {figure.category || '-'}
                </td>
              )}
              {visibleColumns.condition !== false && (
                <td className="px-0.5 py-2 text-xs sm:text-sm">
                  <div className="space-y-1">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        figure.condition === 'MIB'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : figure.condition === 'Loose'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}
                    >
                      {figure.condition}
                    </span>
                    {figure.condition === 'Custom' && figure.customFormula && Object.values(figure.customFormula).some(v => v) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                        {[
                          figure.customFormula.head && `H: ${figure.customFormula.head}`,
                          figure.customFormula.torso && `T: ${figure.customFormula.torso}`,
                          figure.customFormula.waist && `W: ${figure.customFormula.waist}`
                        ].filter(Boolean).join(', ') || 'Custom parts listed'}
                      </div>
                    )}
                  </div>
                </td>
              )}
              {visibleColumns.size !== false && (
                <td className="px-0.5 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  {figure.size || '-'}
                </td>
              )}
              {visibleColumns.packaging !== false && (
                <td className="px-0.5 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  {figure.packaging || '-'}
                </td>
              )}
              {visibleColumns.currentValue !== false && (
                <td className="px-0.5 py-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                  ${figure.currentValue.toFixed(2)}
                </td>
              )}
              {visibleColumns.purchaseDate !== false && (
                <td className="px-0.5 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  {new Date(figure.purchaseDate).toLocaleDateString()}
                </td>
              )}
              {visibleColumns.location !== false && (
                <td className="px-0.5 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  {figure.location || '-'}
                </td>
              )}
              {visibleColumns.availability !== false && (
                <td className="px-0.5 py-2 text-xs sm:text-sm">
                {figure.availability && figure.availability.length > 0 ? (
                  <div className="flex gap-1">
                    {figure.availability.includes('for-sale') && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        For Sale
                      </span>
                    )}
                    {figure.availability.includes('for-trade') && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        For Trade
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
                </td>
              )}
              {visibleColumns.completeness !== false && (() => {
                // Only show for Loose or Custom figures
                if (figure.condition === 'MIB') {
                  return <td className="px-0.5 py-2 text-xs sm:text-sm text-gray-400">N/A</td>;
                }

                const completeness = figure.completenessPercentage ?? 100;
                const hasAccessories = figure.accessories && figure.accessories.length > 0;

                if (!hasAccessories) {
                  return <td className="px-0.5 py-2 text-xs sm:text-sm text-gray-400">-</td>;
                }

                return (
                  <td className="px-0.5 py-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${
                        completeness === 100
                          ? 'text-green-600 dark:text-green-400'
                          : completeness >= 75
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {completeness}%
                      </span>
                      {completeness === 100 ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : completeness >= 75 ? (
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <XIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                  </td>
                );
              })()}
              {visibleColumns.jealousyMeter !== false && (() => {
                const currentUser = AuthService.getCurrentUser();
                if (!currentUser || !figure.isPublic) {
                  return <td className="px-0.5 py-2 text-xs sm:text-sm text-gray-400">-</td>;
                }
                const jealousyScore = ReactionsService.getJealousyScore(figure.id, currentUser.id);
                const stats = ReactionsService.getJealousyStats(figure.id, currentUser.id);

                if (jealousyScore === 0) {
                  return <td className="px-0.5 py-2 text-xs sm:text-sm text-gray-400">-</td>;
                }

                return (
                  <td className="px-0.5 py-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                        {jealousyScore}
                      </span>
                      <div className="flex items-center gap-1">
                        {stats.fire > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-orange-600 dark:text-orange-400" title={`${stats.fire} Fire reactions`}>
                            <Flame className="h-3 w-3" />
                            {stats.fire}
                          </span>
                        )}
                        {stats.love > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-pink-600 dark:text-pink-400" title={`${stats.love} Love reactions`}>
                            <Heart className="h-3 w-3" />
                            {stats.love}
                          </span>
                        )}
                        {stats.appreciate > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400" title={`${stats.appreciate} Appreciate reactions`}>
                            <ThumbsUp className="h-3 w-3" />
                            {stats.appreciate}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                );
              })()}
              {customFields.map(field => {
                const value = figure.customFields?.[field.id];
                const displayValue = value !== undefined && value !== null && value !== ''
                  ? String(value)
                  : '-';

                return (
                  <td key={field.id} className="px-0.5 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    {displayValue}
                  </td>
                );
              })}
              <td className="px-0.5 py-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onEdit(figure)}
                    className="h-8 w-8"
                    disabled={!!onDelayedDelete}
                    title={onDelayedDelete ? "Cannot edit other users' figures" : "Edit figure"}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {onDelayedDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelayedDelete(figure)}
                      className="h-8 w-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                      title="Schedule deletion (2 hours + email warning)"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDelete(figure)}
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    title={onDelayedDelete ? "Delete immediately (sensitive content)" : "Delete figure"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
            </table>
      </div>
    </div>
  );
}

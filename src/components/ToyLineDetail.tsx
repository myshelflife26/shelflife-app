import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  Plus,
  Check,
  Star,
  Calendar,
  Hash,
  Package,
  User,
  AlertCircle,
  SortAsc,
  Edit3,
  X,
  Save
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ToyLinesService } from '../utils/toyLinesService';
import { ToyLineSuggestionsService } from '../utils/toyLineSuggestionsService';
import { MasterFiguresService } from '../utils/masterFigures';
import { toastManager } from '../utils/toastManager';
import type { ToyLine, ToyLineFigure, LineCompletion } from '../types/toyLine';
import type { User } from '../types/user';

interface ToyLineDetailProps {
  toyLine: ToyLine;
  currentUser: User;
  onBack: () => void;
  onAddFigure: (figure: ToyLineFigure) => void;
  onSuggestFigure: () => void;
}

interface FigureFilters {
  searchTerm: string;
  year: string;
  subLine: string;
  wave: string;
  ownedStatus: 'all' | 'owned' | 'missing';
}

type SortOption = 'name' | 'number' | 'year' | 'subline';

export function ToyLineDetail({
  toyLine,
  currentUser,
  onBack,
  onAddFigure,
  onSuggestFigure
}: ToyLineDetailProps) {
  const [figures, setFigures] = useState<ToyLineFigure[]>([]);
  const [completion, setCompletion] = useState<LineCompletion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FigureFilters>({
    searchTerm: '',
    year: '',
    subLine: '',
    wave: '',
    ownedStatus: 'all'
  });
  const [sortBy, setSortBy] = useState<SortOption>('number');
  const [sortAsc, setSortAsc] = useState(true);

  // Admin editing states
  const [editingFigure, setEditingFigure] = useState<string | null>(null);
  const [allToyLines, setAllToyLines] = useState<ToyLine[]>([]);
  const [editingToyLine, setEditingToyLine] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'management' || currentUser?.role === 'manager';

  useEffect(() => {
    loadToyLineData();
    if (isAdmin) {
      loadAllToyLines();
    }
  }, [toyLine.id, currentUser.id]);

  const loadAllToyLines = async () => {
    try {
      const toyLines = await ToyLinesService.getAll();
      setAllToyLines(toyLines);
    } catch (error) {
      console.error('Error loading toy lines:', error);
    }
  };

  const loadToyLineData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load figures and completion data in parallel
      const [figuresData, completionData] = await Promise.all([
        ToyLinesService.getFiguresInLine(toyLine.id),
        ToyLinesService.getLineCompletionForUser(currentUser.id, toyLine.id)
      ]);

      setFigures(figuresData);
      setCompletion(completionData);
    } catch (err) {
      console.error('Error loading toy line data:', err);
      setError('Failed to load toy line data');
    } finally {
      setLoading(false);
    }
  };

  // Get unique filter values
  const filterOptions = useMemo(() => {
    return {
      years: [...new Set(figures.map(f => f.year).filter(Boolean))].sort((a, b) => a - b),
      subLines: [...new Set(figures.map(f => f.subLine).filter(Boolean))].sort(),
      waves: [...new Set(figures.map(f => f.wave).filter(Boolean))].sort()
    };
  }, [figures]);

  // Filter and sort figures
  const filteredFigures = useMemo(() => {
    let filtered = figures.filter(figure => {
      // Search filter
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        if (!figure.name.toLowerCase().includes(term) &&
            !figure.figureNumber?.toLowerCase().includes(term)) {
          return false;
        }
      }

      // Year filter
      if (filters.year && figure.year !== parseInt(filters.year)) {
        return false;
      }

      // Sub-line filter
      if (filters.subLine && figure.subLine !== filters.subLine) {
        return false;
      }

      // Wave filter
      if (filters.wave && figure.wave !== filters.wave) {
        return false;
      }

      // Ownership filter
      if (filters.ownedStatus !== 'all' && completion) {
        const figureData = completion.figuresWithOwnership.find(f => f.figure.id === figure.id);
        const isOwned = figureData?.owned || false;

        if (filters.ownedStatus === 'owned' && !isOwned) return false;
        if (filters.ownedStatus === 'missing' && isOwned) return false;
      }

      return true;
    });

    // Sort figures
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'number':
          aValue = a.figureNumber || '';
          bValue = b.figureNumber || '';
          break;
        case 'year':
          aValue = a.year;
          bValue = b.year;
          break;
        case 'subline':
          aValue = a.subLine || '';
          bValue = b.subLine || '';
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortAsc ? aValue - bValue : bValue - aValue;
      }

      const result = aValue.toString().localeCompare(bValue.toString());
      return sortAsc ? result : -result;
    });

    return filtered;
  }, [figures, filters, sortBy, sortAsc, completion]);

  const handleClearFilters = () => {
    setFilters({
      searchTerm: '',
      year: '',
      subLine: '',
      wave: '',
      ownedStatus: 'all'
    });
  };

  const handleAddToCollection = async (figure: ToyLineFigure) => {
    try {
      onAddFigure(figure);
      toastManager.success(`Added ${figure.name} to your collection!`);

      // Refresh completion data
      const updatedCompletion = await ToyLinesService.getLineCompletionForUser(currentUser.id, toyLine.id);
      setCompletion(updatedCompletion);
    } catch (error) {
      console.error('Error adding figure to collection:', error);
      toastManager.error('Failed to add figure to collection');
    }
  };

  const getFigureOwnership = (figureId: string) => {
    if (!completion) return { owned: false };
    const figureData = completion.figuresWithOwnership.find(f => f.figure.id === figureId);
    return {
      owned: figureData?.owned || false,
      userFigureId: figureData?.userFigureId
    };
  };

  const getRandomCollectionImage = (figure: ToyLineFigure): string | null => {
    if (!figure.collectionImages || figure.collectionImages.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * figure.collectionImages.length);
    return figure.collectionImages[randomIndex].imageUrl;
  };

  // Admin editing functions
  const startEditFigure = (figure: ToyLineFigure) => {
    setEditingFigure(figure.id);
    // Find the current toy line assignment
    const currentToyLineId = allToyLines.find(tl => tl.name === toyLine.name)?.id || '';
    setEditingToyLine(currentToyLineId);
  };

  const cancelEdit = () => {
    setEditingFigure(null);
    setEditingToyLine('');
  };

  const saveFigureEdit = async (figure: ToyLineFigure) => {
    if (!editingToyLine || !figure.masterFigureId) {
      toastManager.error('Please select a toy line');
      return;
    }

    setIsSavingEdit(true);
    try {
      // Find the selected toy line
      const selectedToyLine = allToyLines.find(tl => tl.id === editingToyLine);
      if (!selectedToyLine) {
        throw new Error('Selected toy line not found');
      }

      // Update the master figure with new toy line assignment
      const masterFigure = await MasterFiguresService.getById(figure.masterFigureId);
      if (!masterFigure) {
        throw new Error('Master figure not found');
      }

      const updatedMasterFigure = {
        ...masterFigure,
        productLine: selectedToyLine.name,
        series: selectedToyLine.name, // Update legacy field too
        notes: (masterFigure.notes || '') + ` [Admin moved from "${toyLine.name}" to "${selectedToyLine.name}" on ${new Date().toLocaleDateString()}]`
      };

      await MasterFiguresService.update(figure.masterFigureId, updatedMasterFigure);

      // Refresh the toy line data to reflect the change
      await loadToyLineData();

      toastManager.success(`Moved ${figure.name} to ${selectedToyLine.name}`);
      setEditingFigure(null);
      setEditingToyLine('');

    } catch (error) {
      console.error('Error updating figure toy line:', error);
      toastManager.error('Failed to update figure assignment');
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Loading {toyLine.name}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
          <Button onClick={loadToyLineData} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button onClick={onBack} variant="outline" size="sm" className="mt-1">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {toyLine.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>{toyLine.manufacturer}</span>
            <span>•</span>
            <span>
              {toyLine.startYear}
              {toyLine.endYear ? `-${toyLine.endYear}` : '-Present'}
            </span>
            <span>•</span>
            <span>{figures.length} figures</span>
          </div>

          {toyLine.description && (
            <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
              {toyLine.description}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {completion && (
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                {completion.completionPercentage === 100 && (
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                )}
                <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {completion.completionPercentage}%
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {completion.ownedCount} of {completion.totalFigures}
              </p>
            </div>
          )}

          <Button onClick={onSuggestFigure} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Suggest Figure
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {completion && completion.completionPercentage > 0 && (
        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${completion.completionPercentage}%` }}
          />
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search figures by name or number..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="pl-10"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="">All Years</option>
              {filterOptions.years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {filterOptions.subLines.length > 0 && (
              <select
                value={filters.subLine}
                onChange={(e) => setFilters(prev => ({ ...prev, subLine: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Sub-Lines</option>
                {filterOptions.subLines.map(subLine => (
                  <option key={subLine} value={subLine}>{subLine}</option>
                ))}
              </select>
            )}

            <select
              value={filters.ownedStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, ownedStatus: e.target.value as any }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Figures</option>
              <option value="owned">Owned</option>
              <option value="missing">Missing</option>
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="number">Number</option>
              <option value="name">Name</option>
              <option value="year">Year</option>
              <option value="subline">Sub-Line</option>
            </select>

            <Button
              onClick={() => setSortAsc(!sortAsc)}
              variant="outline"
              size="sm"
            >
              <SortAsc className={`h-4 w-4 ${!sortAsc ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* Clear Filters */}
          {(filters.searchTerm || filters.year || filters.subLine || filters.ownedStatus !== 'all') && (
            <Button onClick={handleClearFilters} variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredFigures.length} of {figures.length} figures
      </div>

      {/* Figures Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFigures.map((figure) => {
          const ownership = getFigureOwnership(figure.id);
          const collectionImage = getRandomCollectionImage(figure);

          return (
            <div
              key={figure.id}
              className={`bg-white dark:bg-gray-800 border rounded-lg p-4 hover:shadow-md transition-all ${
                ownership.owned
                  ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Figure Image */}
              <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {collectionImage ? (
                  <img
                    src={collectionImage}
                    alt={figure.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="h-12 w-12 text-gray-400" />
                )}
              </div>

              {/* Figure Info */}
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
                      {figure.name}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {figure.figureNumber && (
                        <Badge variant="outline" className="text-xs">
                          <Hash className="h-3 w-3 mr-1" />
                          {figure.figureNumber}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {figure.year}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {ownership.owned ? (
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Button
                        onClick={() => handleAddToCollection(figure)}
                        size="sm"
                        className="text-xs px-2 py-1 h-auto"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}

                    {/* Admin Edit Button */}
                    {isAdmin && (
                      <Button
                        onClick={() => startEditFigure(figure)}
                        size="sm"
                        variant="outline"
                        className="text-xs px-2 py-1 h-auto"
                        title="Edit figure assignment"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {figure.subLine && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {figure.subLine}
                  </p>
                )}

                {figure.collectionImages && figure.collectionImages.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <User className="h-3 w-3" />
                    <span>{figure.collectionImages.length} collector{figure.collectionImages.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredFigures.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No figures found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {filters.searchTerm || filters.year || filters.subLine || filters.ownedStatus !== 'all'
              ? 'Try adjusting your search or filters'
              : 'No figures have been added to this toy line yet'}
          </p>
          <div className="flex gap-2 justify-center">
            {(filters.searchTerm || filters.year || filters.subLine || filters.ownedStatus !== 'all') && (
              <Button onClick={handleClearFilters} variant="outline">
                Clear Filters
              </Button>
            )}
            <Button onClick={onSuggestFigure} variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Suggest a Figure
            </Button>
          </div>
        </div>
      )}

      {/* Admin Edit Figure Modal */}
      {isAdmin && editingFigure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Figure Assignment
              </h3>
              <Button
                onClick={cancelEdit}
                size="sm"
                variant="ghost"
                className="p-1 h-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {(() => {
              const figure = figures.find(f => f.id === editingFigure);
              if (!figure) return null;

              return (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {figure.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {figure.manufacturer} • {figure.year}
                    </p>
                    {figure.figureNumber && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        #{figure.figureNumber}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Move to Toy Line:
                    </label>
                    <select
                      value={editingToyLine}
                      onChange={(e) => setEditingToyLine(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select a toy line...</option>
                      {allToyLines
                        .filter(tl => tl.manufacturer === figure.manufacturer) // Only show same manufacturer
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(tl => (
                          <option key={tl.id} value={tl.id}>
                            {tl.name} ({tl.figureCount} figures)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      This will update the master figure database and move this figure to the selected toy line.
                      The change will be logged in the figure's notes.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={cancelEdit}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => saveFigureEdit(figure)}
                      disabled={!editingToyLine || isSavingEdit}
                      className="flex-1"
                    >
                      {isSavingEdit ? (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
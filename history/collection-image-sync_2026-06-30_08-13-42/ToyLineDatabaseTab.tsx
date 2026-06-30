import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Database, ChevronRight, Star, Trophy } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ToyLinesService } from '../utils/toyLinesService';
import type { ToyLine, ToyLineCompletion } from '../types/toyLine';
import type { User } from '../types/user';

interface ToyLineDatabaseTabProps {
  currentUser: User;
  onSelectToyLine: (toyLine: ToyLine) => void;
}

interface FilterState {
  manufacturer: string;
  yearRange: [number, number];
  activeOnly: boolean;
  searchTerm: string;
}

export function ToyLineDatabaseTab({ currentUser, onSelectToyLine }: ToyLineDatabaseTabProps) {
  const [toyLines, setToyLines] = useState<ToyLine[]>([]);
  const [completionStats, setCompletionStats] = useState<ToyLineCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    manufacturer: '',
    yearRange: [1980, new Date().getFullYear()],
    activeOnly: false,
    searchTerm: ''
  });

  // Load toy lines and user completion data
  useEffect(() => {
    loadToyLines();
  }, []);

  useEffect(() => {
    if (currentUser.id) {
      loadUserCompletionStats();
    }
  }, [currentUser.id]);

  const loadToyLines = async () => {
    try {
      setLoading(true);
      const lines = await ToyLinesService.getAll();
      setToyLines(lines);
    } catch (err) {
      console.error('Error loading toy lines:', err);
      setError('Failed to load toy lines');
    } finally {
      setLoading(false);
    }
  };

  const loadUserCompletionStats = async () => {
    try {
      const stats = await ToyLinesService.getUserCompletionStats(currentUser.id);
      setCompletionStats(stats);
    } catch (err) {
      console.error('Error loading completion stats:', err);
    }
  };

  // Get unique manufacturers for filter dropdown
  const manufacturers = useMemo(() => {
    const unique = new Set(toyLines.map(line => line.manufacturer));
    return Array.from(unique).sort();
  }, [toyLines]);

  // Filter and sort toy lines
  const filteredToyLines = useMemo(() => {
    let filtered = toyLines.filter(line => {
      // Manufacturer filter
      if (filters.manufacturer && line.manufacturer !== filters.manufacturer) {
        return false;
      }

      // Active status filter
      if (filters.activeOnly && !line.isActive) {
        return false;
      }

      // Year range filter
      if (line.startYear < filters.yearRange[0] ||
          (line.endYear && line.endYear > filters.yearRange[1])) {
        return false;
      }

      // Search term filter
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return (
          line.name.toLowerCase().includes(term) ||
          line.manufacturer.toLowerCase().includes(term) ||
          line.description?.toLowerCase().includes(term)
        );
      }

      return true;
    });

    // Sort by completion percentage (user's completed lines first), then by name
    return filtered.sort((a, b) => {
      const aCompletion = completionStats.find(s => s.toyLineId === a.id);
      const bCompletion = completionStats.find(s => s.toyLineId === b.id);

      if (aCompletion && !bCompletion) return -1;
      if (!aCompletion && bCompletion) return 1;
      if (aCompletion && bCompletion) {
        return bCompletion.completionPercentage - aCompletion.completionPercentage;
      }

      return a.name.localeCompare(b.name);
    });
  }, [toyLines, filters, completionStats]);

  const handleClearFilters = () => {
    setFilters({
      manufacturer: '',
      yearRange: [1980, new Date().getFullYear()],
      activeOnly: false,
      searchTerm: ''
    });
  };

  const getCompletionForLine = (lineId: string): ToyLineCompletion | null => {
    return completionStats.find(s => s.toyLineId === lineId) || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Loading toy lines...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Database className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
          <Button onClick={loadToyLines} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Toy Line Databases</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Browse complete collections by toy line and track your progress
          </p>
        </div>

        {completionStats.length > 0 && (
          <div className="flex gap-2">
            <Badge variant="secondary">
              <Trophy className="h-3 w-3 mr-1" />
              {completionStats.filter(s => s.completionPercentage === 100).length} Complete
            </Badge>
            <Badge variant="outline">
              {completionStats.length} Lines Collected
            </Badge>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search toy lines, manufacturers, descriptions..."
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filters.manufacturer}
            onChange={(e) => setFilters(prev => ({ ...prev, manufacturer: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Manufacturers</option>
            {manufacturers.map(manufacturer => (
              <option key={manufacturer} value={manufacturer}>
                {manufacturer}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.activeOnly}
              onChange={(e) => setFilters(prev => ({ ...prev, activeOnly: e.target.checked }))}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            Active Only
          </label>

          {(filters.manufacturer || filters.activeOnly || filters.searchTerm) && (
            <Button onClick={handleClearFilters} variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredToyLines.length} of {toyLines.length} toy lines
      </div>

      {/* Toy Lines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredToyLines.map((toyLine) => {
          const completion = getCompletionForLine(toyLine.id);

          return (
            <div
              key={toyLine.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectToyLine(toyLine)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                    {toyLine.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {toyLine.manufacturer} • {toyLine.startYear}
                    {toyLine.endYear ? `-${toyLine.endYear}` : '-Present'}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>

              {toyLine.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {toyLine.description}
                </p>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {toyLine.figureCount} figures
                </span>

                <div className="flex items-center gap-2">
                  {!toyLine.isActive && (
                    <Badge variant="outline" className="text-xs">
                      Discontinued
                    </Badge>
                  )}

                  {completion && (
                    <div className="flex items-center gap-1">
                      {completion.completionPercentage === 100 && (
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      )}
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {completion.completionPercentage}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {completion && completion.completionPercentage > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${completion.completionPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {completion.ownedFigures} of {completion.totalFigures} collected
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredToyLines.length === 0 && !loading && (
        <div className="text-center py-12">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No toy lines found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {filters.searchTerm || filters.manufacturer || filters.activeOnly
              ? 'Try adjusting your search or filters'
              : 'No toy lines have been added yet'}
          </p>
          {(filters.searchTerm || filters.manufacturer || filters.activeOnly) && (
            <Button onClick={handleClearFilters} variant="outline">
              Clear Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
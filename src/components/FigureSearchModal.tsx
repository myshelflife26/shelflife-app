import { useState } from 'react';
import { FigureSearchService, type FigureSearchResult } from '../utils/figureSearch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, Loader2, Check, ExternalLink, Database, ShoppingCart, AlertCircle, Lightbulb } from 'lucide-react';
import { SuggestFigureModal } from './SuggestFigureModal';
import type { User } from '../types/user';

interface FigureSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (result: FigureSearchResult) => void;
  currentUser: User;
}

export function FigureSearchModal({ open, onClose, onSelect, currentUser }: FigureSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FigureSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Search community database only (no eBay)
      const searchResults = FigureSearchService.searchCommunityOnly(query);
      setResults(searchResults);

      if (searchResults.length === 0) {
        setError('No figures found in our database. Try different search terms or suggest this figure to help others!');
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: FigureSearchResult) => {
    onSelect(result);
    // Don't close modal yet - let parent component handle it after import
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Online Database
          </DialogTitle>
          <DialogDescription>
            Search our community database for figure information
          </DialogDescription>
        </DialogHeader>

        {/* Search Box */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Storm Shadow 1984, Snake Eyes v2, Cobra Commander"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              autoFocus
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Search Tips */}
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>💡 Tips: Include character name and year for best results</p>
            <p>Examples: "Storm Shadow 1984", "Snake Eyes Commando", "Destro v1"</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">{error}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => setSuggestModalOpen(true)}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Suggest This Figure
              </Button>
            </div>
          </div>
        )}

        {/* No Results Yet */}
        {results.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
              Search for a figure to get started
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              Search our community database of popular figures
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSuggestModalOpen(true)}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Can't find what you're looking for? Suggest a figure
            </Button>
          </div>
        )}

        {/* Results Grid */}
        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuggestModalOpen(true)}
              >
                <Lightbulb className="h-3 w-3 mr-1" />
                Suggest a Figure
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                  onClick={() => handleSelect(result)}
                >
                  {/* Image */}
                  {result.images[0] ? (
                    <div className="w-full h-48 mb-3 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                      <img
                        src={result.images[0]}
                        alt={result.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback if image fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 mb-3 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                      <p className="text-gray-400 text-sm">No image</p>
                    </div>
                  )}

                  {/* Info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm line-clamp-2 flex-1">
                        {result.name}
                      </h3>
                      {result.source === 'community' && result.verified && (
                        <Check
                          className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0"
                          title="Verified by community"
                        />
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      {result.manufacturer && <p>Manufacturer: {result.manufacturer}</p>}
                      {result.year && <p>Year: {result.year}</p>}
                      {result.productLine && <p>Line: {result.productLine}</p>}
                      {result.subProductLine && <p>Sub-Line: {result.subProductLine}</p>}
                      {result.condition && <p>Condition: {result.condition}</p>}
                    </div>

                    {/* Price */}
                    {result.estimatedValue && (
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        ~${result.estimatedValue.toFixed(2)}
                      </div>
                    )}

                    {/* Source Badge and Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          result.source === 'community'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 flex items-center gap-1'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 flex items-center gap-1'
                        }`}
                      >
                        {result.source === 'community' ? (
                          <>
                            <Database className="h-3 w-3" />
                            Community
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-3 w-3" />
                            eBay
                          </>
                        )}
                      </span>

                      {result.ebayUrl && (
                        <a
                          href={result.ebayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          onClick={(e) => e.stopPropagation()}
                          title="View on eBay"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>

                    {/* Import Button */}
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(result);
                      }}
                    >
                      Import This Figure
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggest Figure Modal */}
        <SuggestFigureModal
          open={suggestModalOpen}
          onClose={() => setSuggestModalOpen(false)}
          currentUser={currentUser}
        />
      </DialogContent>
    </Dialog>
  );
}

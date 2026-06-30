import React, { useState } from 'react';
import { Search, Link, CheckCircle, AlertTriangle, RefreshCw, Image, ArrowRight } from 'lucide-react';
import { CollectionImageSyncService } from '../../utils/collectionImageSync';
import type { ActionFigure } from '../../types';
import type { MasterFigure } from '../../utils/masterFigures';

interface OrphanedFigure {
  userFigure: ActionFigure;
  possibleMatches: MasterFigure[];
  issue: string;
}

const CollectionImageSyncPanel: React.FC = () => {
  const [orphanedFigures, setOrphanedFigures] = useState<OrphanedFigure[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFixes, setSelectedFixes] = useState<Map<string, MasterFigure>>(new Map());

  const analyzeOrphanedFigures = async () => {
    setIsAnalyzing(true);
    try {
      const orphaned = await CollectionImageSyncService.findOrphanedUserFigures();
      setOrphanedFigures(orphaned);
    } catch (error) {
      console.error('Error analyzing orphaned figures:', error);
      alert('Failed to analyze figures: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectFix = (userFigureId: string, masterFigure: MasterFigure) => {
    setSelectedFixes(prev => new Map(prev.set(userFigureId, masterFigure)));
  };

  const fixSingleFigure = async (orphaned: OrphanedFigure, masterFigure: MasterFigure) => {
    setIsFixing(prev => new Set([...prev, orphaned.userFigure.id]));

    try {
      await CollectionImageSyncService.updateUserFigureToMatchMaster(
        orphaned.userFigure.id,
        masterFigure,
        orphaned.userFigure.userId!
      );

      // Remove from orphaned list
      setOrphanedFigures(prev =>
        prev.filter(o => o.userFigure.id !== orphaned.userFigure.id)
      );

      alert(`Fixed ${orphaned.userFigure.name}!`);
    } catch (error) {
      alert('Failed to fix figure: ' + error.message);
    } finally {
      setIsFixing(prev => {
        const newSet = new Set(prev);
        newSet.delete(orphaned.userFigure.id);
        return newSet;
      });
    }
  };

  const batchFixSelected = async () => {
    if (selectedFixes.size === 0) {
      alert('No fixes selected');
      return;
    }

    const updates = Array.from(selectedFixes.entries()).map(([userFigureId, masterFigure]) => {
      const orphaned = orphanedFigures.find(o => o.userFigure.id === userFigureId);
      return {
        userFigureId,
        masterFigure,
        userId: orphaned!.userFigure.userId!
      };
    });

    try {
      const results = await CollectionImageSyncService.batchUpdateUserFigures(updates);

      if (results.errors.length > 0) {
        console.error('Batch update errors:', results.errors);
      }

      // Remove successfully fixed figures
      setOrphanedFigures(prev =>
        prev.filter(o => !selectedFixes.has(o.userFigure.id) || results.errors.some(e => e.includes(o.userFigure.id)))
      );

      setSelectedFixes(new Map());

      alert(`Fixed ${results.success} figures${results.failed > 0 ? `, ${results.failed} failed` : ''}!`);
    } catch (error) {
      alert('Batch fix failed: ' + error.message);
    }
  };

  const filteredOrphaned = orphanedFigures.filter(orphaned =>
    searchQuery === '' ||
    orphaned.userFigure.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    orphaned.userFigure.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Image className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Collection Image Sync</h2>
        </div>

        <p className="text-gray-600 mb-6">
          Find and fix user figures that don't match master figures, preventing their images from showing in toy lines. This tool will also find figures that might be matching the wrong master figure due to name/manufacturer changes.
        </p>

        <div className="flex gap-3 mb-6">
          <button
            onClick={analyzeOrphanedFigures}
            disabled={isAnalyzing}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Find Orphaned Figures
          </button>

          {selectedFixes.size > 0 && (
            <button
              onClick={batchFixSelected}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Fix Selected ({selectedFixes.size})
            </button>
          )}
        </div>

        {orphanedFigures.length > 0 && (
          <div className="mb-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search orphaned figures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {filteredOrphaned.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                Orphaned Figures ({filteredOrphaned.length})
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                These figures won't show images in toy lines
              </div>
            </div>

            {filteredOrphaned.map((orphaned, index) => (
              <div key={orphaned.userFigure.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {orphaned.userFigure.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {orphaned.userFigure.manufacturer} • Owner: {orphaned.userFigure.userId}
                    </p>
                    <p className="text-sm text-orange-600 mt-1">
                      {orphaned.issue}
                    </p>
                  </div>

                  {orphaned.userFigure.images && orphaned.userFigure.images.length > 0 && (
                    <div className="flex-shrink-0">
                      <img
                        src={orphaned.userFigure.images[orphaned.userFigure.mainImageIndex || 0]}
                        alt={orphaned.userFigure.name}
                        className="w-16 h-16 object-cover rounded border"
                      />
                    </div>
                  )}
                </div>

                {orphaned.possibleMatches.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Possible Matches:</h5>
                    {orphaned.possibleMatches.map((match, matchIndex) => (
                      <div key={match.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{match.name}</div>
                          <div className="text-xs text-gray-600">
                            {match.manufacturer} • {match.franchise && `${match.franchise} - `}{match.productLine || match.series}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`fix-${orphaned.userFigure.id}`}
                            checked={selectedFixes.get(orphaned.userFigure.id)?.id === match.id}
                            onChange={() => selectFix(orphaned.userFigure.id, match)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                          />
                          <button
                            onClick={() => fixSingleFigure(orphaned, match)}
                            disabled={isFixing.has(orphaned.userFigure.id)}
                            className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            {isFixing.has(orphaned.userFigure.id) ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Link className="h-3 w-3 mr-1 inline" />
                                Fix Now
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {orphaned.possibleMatches.length === 0 && (
                  <div className="text-sm text-gray-500 italic">
                    No automatic matches found. Manual intervention may be required.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isAnalyzing && orphanedFigures.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>No orphaned figures found. All collection images should be displaying correctly.</p>
          </div>
        )}

        {/* Information Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h4 className="font-medium text-blue-800 mb-2">How this helps:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Finds user figures that don't match any master figures</li>
            <li>• Shows why images aren't appearing in toy line views</li>
            <li>• Suggests possible master figure matches</li>
            <li>• Updates user figures to reconnect their images</li>
            <li>• Fixes the Scarlett figure image issue you mentioned</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CollectionImageSyncPanel;
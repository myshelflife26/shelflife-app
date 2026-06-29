import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  Plus,
  Database,
  Edit,
  Trash2,
  Check,
  X,
  Clock,
  Users,
  Package,
  AlertCircle,
  Upload
} from 'lucide-react';
import { ToyLinesService } from '../../utils/toyLinesService';
import { ToyLineSuggestionsService } from '../../utils/toyLineSuggestionsService';
import { seedSampleToyLineData } from '../../utils/seedToyLineData';
import { toastManager } from '../../utils/toastManager';
import type { ToyLine, ToyLineSuggestion } from '../../types/toyLine';
import type { User } from '../../types/user';

interface ToyLineManagementProps {
  currentUser: User;
}

export function ToyLineManagement({ currentUser }: ToyLineManagementProps) {
  const [toyLines, setToyLines] = useState<ToyLine[]>([]);
  const [suggestions, setSuggestions] = useState<ToyLineSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lines' | 'suggestions'>('lines');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLine, setEditingLine] = useState<ToyLine | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const [newLineForm, setNewLineForm] = useState({
    name: '',
    manufacturer: '',
    startYear: new Date().getFullYear(),
    endYear: '',
    description: '',
    category: 'Action Figures'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [linesData, suggestionsData] = await Promise.all([
        ToyLinesService.getAll(),
        ToyLineSuggestionsService.getAllSuggestions()
      ]);
      setToyLines(linesData);
      setSuggestions(suggestionsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toastManager.error('Failed to load toy line data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToyLine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const lineData = {
        ...newLineForm,
        startYear: parseInt(newLineForm.startYear.toString()),
        endYear: newLineForm.endYear ? parseInt(newLineForm.endYear.toString()) : undefined,
        isActive: !newLineForm.endYear,
        verified: true,
        isPublic: true,
        source: 'admin' as const,
        createdBy: currentUser.id
      };

      await ToyLinesService.create(lineData);
      toastManager.success('Toy line created successfully');
      setShowCreateForm(false);
      setNewLineForm({
        name: '',
        manufacturer: '',
        startYear: new Date().getFullYear(),
        endYear: '',
        description: '',
        category: 'Action Figures'
      });
      await loadData();
    } catch (error) {
      console.error('Error creating toy line:', error);
      toastManager.error('Failed to create toy line');
    }
  };

  const handleDeleteToyLine = async (lineId: string) => {
    if (!confirm('Are you sure you want to delete this toy line and all its figures?')) {
      return;
    }

    try {
      setProcessingIds(prev => new Set([...prev, lineId]));
      await ToyLinesService.delete(lineId);
      toastManager.success('Toy line deleted successfully');
      await loadData();
    } catch (error) {
      console.error('Error deleting toy line:', error);
      toastManager.error('Failed to delete toy line');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(lineId);
        return newSet;
      });
    }
  };

  const handleApproveSuggestion = async (suggestionId: string) => {
    try {
      setProcessingIds(prev => new Set([...prev, suggestionId]));
      await ToyLineSuggestionsService.approveSuggestion(suggestionId, currentUser.id, 'Approved by admin');
      toastManager.success('Suggestion approved and figure added to toy line');
      await loadData();
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toastManager.error('Failed to approve suggestion');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestionId);
        return newSet;
      });
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    const reason = prompt('Please provide a reason for rejecting this suggestion:');
    if (!reason) return;

    try {
      setProcessingIds(prev => new Set([...prev, suggestionId]));
      await ToyLineSuggestionsService.rejectSuggestion(suggestionId, currentUser.id, reason);
      toastManager.success('Suggestion rejected');
      await loadData();
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      toastManager.error('Failed to reject suggestion');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestionId);
        return newSet;
      });
    }
  };

  const handleSeedData = async () => {
    if (!confirm('This will create sample toy line data. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      toastManager.info('Creating sample data...');

      const result = await seedSampleToyLineData(currentUser.id);

      toastManager.success(`Created 2 toy lines with ${result.totalFigures} figures!`);
      await loadData();
    } catch (error) {
      console.error('Error seeding data:', error);
      toastManager.error('Failed to create sample data');
    } finally {
      setLoading(false);
    }
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const processedSuggestions = suggestions.filter(s => s.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Loading toy line data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Toy Line Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage toy lines, figures, and user suggestions
          </p>
        </div>

        <div className="flex gap-2">
          {toyLines.length === 0 && (
            <Button onClick={handleSeedData} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Create Sample Data
            </Button>
          )}
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Toy Line
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center">
            <Database className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{toyLines.length}</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Toy Lines</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {toyLines.reduce((total, line) => total + line.figureCount, 0)}
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Figures</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingSuggestions.length}</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Pending Suggestions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('lines')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'lines'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Database className="h-4 w-4 inline mr-2" />
          Toy Lines ({toyLines.length})
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'suggestions'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Suggestions ({pendingSuggestions.length})
        </button>
      </div>

      {/* Toy Lines Tab */}
      {activeTab === 'lines' && (
        <div className="space-y-4">
          {showCreateForm && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Toy Line</h3>
              <form onSubmit={handleCreateToyLine} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={newLineForm.name}
                      onChange={(e) => setNewLineForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="G.I. Joe Classified Series"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="manufacturer">Manufacturer *</Label>
                    <Input
                      id="manufacturer"
                      value={newLineForm.manufacturer}
                      onChange={(e) => setNewLineForm(prev => ({ ...prev, manufacturer: e.target.value }))}
                      placeholder="Hasbro"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="startYear">Start Year *</Label>
                    <Input
                      id="startYear"
                      type="number"
                      value={newLineForm.startYear}
                      onChange={(e) => setNewLineForm(prev => ({ ...prev, startYear: parseInt(e.target.value) }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endYear">End Year (optional)</Label>
                    <Input
                      id="endYear"
                      type="number"
                      value={newLineForm.endYear}
                      onChange={(e) => setNewLineForm(prev => ({ ...prev, endYear: e.target.value }))}
                      placeholder="Leave empty if still active"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={newLineForm.category}
                    onChange={(e) => setNewLineForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="Action Figures">Action Figures</option>
                    <option value="Transformers">Transformers</option>
                    <option value="Vehicles">Vehicles</option>
                    <option value="Collectibles">Collectibles</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newLineForm.description}
                    onChange={(e) => setNewLineForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the toy line..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Create Toy Line</Button>
                  <Button type="button" onClick={() => setShowCreateForm(false)} variant="outline">
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Toy Lines List */}
          <div className="space-y-4">
            {toyLines.map((line) => (
              <div key={line.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{line.name}</h3>
                      {line.isActive && (
                        <Badge variant="secondary">Active</Badge>
                      )}
                      {line.verified && (
                        <Badge variant="default">Verified</Badge>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {line.manufacturer} • {line.startYear}{line.endYear ? `-${line.endYear}` : '-Present'}
                    </p>
                    {line.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{line.description}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      {line.figureCount} figures • Created {new Date(line.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDeleteToyLine(line.id)}
                      variant="outline"
                      size="sm"
                      disabled={processingIds.has(line.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {toyLines.length === 0 && (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No toy lines yet</p>
                <Button onClick={() => setShowCreateForm(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Toy Line
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggestions Tab */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          {/* Pending Suggestions */}
          {pendingSuggestions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pending Suggestions</h3>
              <div className="space-y-4">
                {pendingSuggestions.map((suggestion) => {
                  const toyLine = toyLines.find(line => line.id === suggestion.toyLineId);
                  return (
                    <div key={suggestion.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{suggestion.figureName}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            For: {toyLine?.name || 'Unknown Toy Line'} • Suggested by: {suggestion.userName}
                          </p>
                          {suggestion.figureNumber && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">Number: {suggestion.figureNumber}</p>
                          )}
                          {suggestion.year && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">Year: {suggestion.year}</p>
                          )}
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 mb-2">{suggestion.reason}</p>
                          <p className="text-xs text-gray-500">
                            Submitted {new Date(suggestion.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApproveSuggestion(suggestion.id)}
                            size="sm"
                            disabled={processingIds.has(suggestion.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleRejectSuggestion(suggestion.id)}
                            variant="outline"
                            size="sm"
                            disabled={processingIds.has(suggestion.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Pending Suggestions */}
          {pendingSuggestions.length === 0 && (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No pending suggestions</p>
            </div>
          )}

          {/* Processed Suggestions */}
          {processedSuggestions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
              <div className="space-y-2">
                {processedSuggestions.slice(0, 10).map((suggestion) => {
                  const toyLine = toyLines.find(line => line.id === suggestion.toyLineId);
                  return (
                    <div key={suggestion.id} className="bg-gray-50 dark:bg-gray-700 rounded p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span>
                          <strong>{suggestion.figureName}</strong> for {toyLine?.name || 'Unknown Toy Line'}
                          by {suggestion.userName}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant={suggestion.status === 'approved' ? 'default' : 'destructive'}>
                            {suggestion.status}
                          </Badge>
                          <span className="text-gray-500">
                            {new Date(suggestion.reviewedAt!).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { Search, Edit, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { ToyLinesService } from '../../utils/toyLinesService';
import { MasterFiguresService } from '../../utils/masterFigures';
import { FirebaseStorage } from '../../utils/firebaseStorage';
import type { ActionFigure } from '../../types';
import type { ToyLine } from '../../types/toyLine';

interface FigureWithIssues {
  figure: ActionFigure;
  suggestedToyLine?: ToyLine;
  currentToyLine?: string;
  issue: 'no_toy_line' | 'wrong_toy_line' | 'multiple_matches';
}

const ToyLineFixPanel: React.FC = () => {
  const [figuresWithIssues, setFiguresWithIssues] = useState<FigureWithIssues[]>([]);
  const [toyLines, setToyLines] = useState<ToyLine[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const analyzeFigureAssignments = async () => {
    setIsAnalyzing(true);
    try {
      // Get all toy lines and user figures
      const [allToyLines, allUserFigures] = await Promise.all([
        ToyLinesService.getAll(),
        FirebaseStorage.getAllPublicFigures() // Get a sample of public figures to analyze
      ]);

      setToyLines(allToyLines);
      const issues: FigureWithIssues[] = [];

      // Group toy lines by name for easier matching
      const toyLineMap = new Map<string, ToyLine>();
      for (const toyLine of allToyLines) {
        toyLineMap.set(toyLine.name.toLowerCase(), toyLine);
      }

      for (const figure of allUserFigures.slice(0, 100)) { // Limit to first 100 for performance
        const figureToyLine = figure.productLine || figure.series;

        if (!figureToyLine) {
          // Figure has no toy line assigned
          const suggestedToyLine = findBestToyLineMatch(figure, allToyLines);
          if (suggestedToyLine) {
            issues.push({
              figure,
              suggestedToyLine,
              issue: 'no_toy_line'
            });
          }
        } else {
          // Check if the assigned toy line exists
          const currentToyLine = toyLineMap.get(figureToyLine.toLowerCase());
          if (!currentToyLine) {
            // Toy line doesn't exist, suggest alternatives
            const suggestedToyLine = findBestToyLineMatch(figure, allToyLines);
            if (suggestedToyLine) {
              issues.push({
                figure,
                suggestedToyLine,
                currentToyLine: figureToyLine,
                issue: 'wrong_toy_line'
              });
            }
          }
        }
      }

      setFiguresWithIssues(issues);
    } catch (error) {
      console.error('Error analyzing figure assignments:', error);
      alert('Failed to analyze figures: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const findBestToyLineMatch = (figure: ActionFigure, toyLines: ToyLine[]): ToyLine | undefined => {
    // Try to find toy line by manufacturer and similar naming
    const manufacturerLines = toyLines.filter(line =>
      line.manufacturer.toLowerCase() === figure.manufacturer.toLowerCase()
    );

    if (manufacturerLines.length === 0) return undefined;

    // Look for exact series match first
    if (figure.series) {
      const exactMatch = manufacturerLines.find(line =>
        line.name.toLowerCase().includes(figure.series.toLowerCase()) ||
        figure.series.toLowerCase().includes(line.name.toLowerCase())
      );
      if (exactMatch) return exactMatch;
    }

    // Look for category match
    const categoryMatch = manufacturerLines.find(line =>
      line.category.toLowerCase() === figure.category.toLowerCase()
    );
    if (categoryMatch) return categoryMatch;

    // Return first manufacturer match as fallback
    return manufacturerLines[0];
  };

  const fixFigureAssignment = async (figureWithIssue: FigureWithIssues) => {
    if (!figureWithIssue.suggestedToyLine) return;

    setIsFixing(prev => new Set([...prev, figureWithIssue.figure.id]));

    try {
      // Update the user's figure with the correct toy line assignment
      const updatedFigure = {
        ...figureWithIssue.figure,
        productLine: figureWithIssue.suggestedToyLine.name,
        series: figureWithIssue.suggestedToyLine.name // Also update legacy series field
      };

      await FirebaseStorage.updateFigure(figureWithIssue.figure.id, updatedFigure, figureWithIssue.figure.userId!);

      // Remove this issue from the list
      setFiguresWithIssues(prev =>
        prev.filter(issue => issue.figure.id !== figureWithIssue.figure.id)
      );

      console.log(`Fixed assignment for ${figureWithIssue.figure.name} → ${figureWithIssue.suggestedToyLine.name}`);
    } catch (error) {
      console.error('Error fixing figure assignment:', error);
      alert('Failed to fix figure: ' + error.message);
    } finally {
      setIsFixing(prev => {
        const newSet = new Set(prev);
        newSet.delete(figureWithIssue.figure.id);
        return newSet;
      });
    }
  };

  const filteredIssues = figuresWithIssues.filter(issue =>
    searchQuery === '' ||
    issue.figure.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    issue.figure.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    issue.suggestedToyLine?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIssueDescription = (issue: FigureWithIssues): string => {
    switch (issue.issue) {
      case 'no_toy_line':
        return 'No toy line assigned';
      case 'wrong_toy_line':
        return `Wrong toy line: "${issue.currentToyLine}"`;
      case 'multiple_matches':
        return 'Multiple toy line matches found';
      default:
        return 'Unknown issue';
    }
  };

  const getIssueColor = (issue: FigureWithIssues): string => {
    switch (issue.issue) {
      case 'no_toy_line':
        return 'text-orange-600 bg-orange-50';
      case 'wrong_toy_line':
        return 'text-red-600 bg-red-50';
      case 'multiple_matches':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Edit className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Toy Line Assignment Fixes</h2>
        </div>

        <p className="text-gray-600 mb-6">
          Analyze and fix figures that are assigned to incorrect toy lines or missing toy line assignments.
        </p>

        <div className="flex gap-3 mb-6">
          <button
            onClick={analyzeFigureAssignments}
            disabled={isAnalyzing}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Analyze Assignments
          </button>

          {figuresWithIssues.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Found {figuresWithIssues.length} figures with issues
            </div>
          )}
        </div>

        {/* Search */}
        {figuresWithIssues.length > 0 && (
          <div className="mb-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search figures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Issues List */}
        {filteredIssues.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 mb-3">Figures with Assignment Issues:</h3>

            {filteredIssues.map((issue, index) => (
              <div key={issue.figure.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {issue.figure.name}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIssueColor(issue)}`}>
                        {getIssueDescription(issue)}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Manufacturer:</strong> {issue.figure.manufacturer}</div>
                      <div><strong>Category:</strong> {issue.figure.category}</div>
                      {issue.figure.series && (
                        <div><strong>Current Series:</strong> {issue.figure.series}</div>
                      )}
                      {issue.figure.productLine && (
                        <div><strong>Current Product Line:</strong> {issue.figure.productLine}</div>
                      )}
                      <div><strong>Owner:</strong> {issue.figure.userId}</div>
                    </div>

                    {issue.suggestedToyLine && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                        <div className="text-sm">
                          <strong className="text-green-800">Suggested Assignment:</strong>
                          <div className="text-green-700 mt-1">
                            {issue.suggestedToyLine.name} ({issue.suggestedToyLine.manufacturer})
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    {issue.suggestedToyLine && (
                      <button
                        onClick={() => fixFigureAssignment(issue)}
                        disabled={isFixing.has(issue.figure.id)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {isFixing.has(issue.figure.id) ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1 inline animate-spin" />
                            Fixing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1 inline" />
                            Fix Assignment
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Issues Found */}
        {!isAnalyzing && figuresWithIssues.length === 0 && toyLines.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>No assignment issues found in the analyzed figures.</p>
          </div>
        )}

        {/* Information Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h4 className="font-medium text-blue-800 mb-2">How this works:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Analyzes user figures for missing or incorrect toy line assignments</li>
            <li>• Suggests the best matching toy line based on manufacturer and series</li>
            <li>• Updates both productLine and series fields for consistency</li>
            <li>• Fixes ownership detection in toy line listings</li>
            <li>• Only analyzes public figures to respect user privacy</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ToyLineFixPanel;
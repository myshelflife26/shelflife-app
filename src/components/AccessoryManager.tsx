import { useState, useRef } from 'react';
import type { Accessory, UserAccessory, AccessoryCategory, User } from '../types/index';
import { AccessoryService } from '../utils/accessoryService';
import { AccessorySuggestionService } from '../utils/accessorySuggestionService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select } from './ui/select';
import {
  Check,
  X,
  AlertCircle,
  Plus,
  Trash2,
  Package,
  Sword,
  ShirtIcon,
  Car,
  LayoutGrid,
  Camera,
  Edit2,
  Save,
  Upload,
  Send
} from 'lucide-react';

interface AccessoryManagerProps {
  masterAccessories?: Accessory[];
  userAccessories: UserAccessory[];
  onChange: (accessories: UserAccessory[]) => void;
  condition?: string; // Figure condition - only show for Loose condition
  figureId?: string; // For suggestions
  figureName?: string; // For suggestions
  currentUser?: User; // For suggestions
}

const categoryIcons: Record<AccessoryCategory, any> = {
  weapon: Sword,
  gear: Package,
  clothing: ShirtIcon,
  vehicle: Car,
  display: LayoutGrid,
  other: Package
};

const categoryColors: Record<AccessoryCategory, string> = {
  weapon: 'text-red-600 dark:text-red-400',
  gear: 'text-blue-600 dark:text-blue-400',
  clothing: 'text-purple-600 dark:text-purple-400',
  vehicle: 'text-green-600 dark:text-green-400',
  display: 'text-gray-600 dark:text-gray-400',
  other: 'text-orange-600 dark:text-orange-400'
};

export function AccessoryManager({
  masterAccessories = [],
  userAccessories,
  onChange,
  condition,
  figureId,
  figureName,
  currentUser
}: AccessoryManagerProps) {
  const [showAddIndividual, setShowAddIndividual] = useState(false);
  const [individualAccessoryName, setIndividualAccessoryName] = useState('');
  const [suggestToDatabase, setSuggestToDatabase] = useState(false);
  const [suggestionCategory, setSuggestionCategory] = useState<AccessoryCategory>('other');
  const [suggestionRequired, setSuggestionRequired] = useState(false);
  const [suggestionDescription, setSuggestionDescription] = useState('');

  // Edit state
  const [editingAccessoryId, setEditingAccessoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Camera state
  const [capturingPhotoFor, setCapturingPhotoFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Don't show for MIB condition
  if (condition === 'MIB') {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              Mint in Box
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              This figure is sealed in its original packaging. Accessory tracking is only available for Loose or Custom figures.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const completeness = masterAccessories.length > 0
    ? AccessoryService.calculateCompleteness(masterAccessories, userAccessories)
    : 100;

  const badge = AccessoryService.getCompletenessBadge(completeness);

  const handleToggleAccessory = (accessoryId: string) => {
    const accessory = userAccessories.find(a => a.id === accessoryId);
    const newOwned = !accessory?.owned;

    onChange(AccessoryService.updateAccessoryOwned(userAccessories, accessoryId, newOwned));
  };

  const handleAddIndividual = async () => {
    if (!individualAccessoryName.trim()) return;

    // Add to user's accessories
    onChange(AccessoryService.addCustomAccessory(userAccessories, individualAccessoryName.trim()));

    // Submit suggestion if requested
    if (suggestToDatabase && figureId && figureName && currentUser) {
      await AccessorySuggestionService.submitSuggestion(
        figureId,
        figureName,
        currentUser.id,
        currentUser.name,
        individualAccessoryName.trim(),
        suggestionCategory,
        suggestionRequired,
        suggestionDescription || undefined,
        undefined
      );
      alert('Accessory added to your figure and suggested to the database for review!');
    }

    // Reset form
    setIndividualAccessoryName('');
    setSuggestToDatabase(false);
    setSuggestionCategory('other');
    setSuggestionRequired(false);
    setSuggestionDescription('');
    setShowAddIndividual(false);
  };

  const handleRemoveIndividual = (accessoryId: string) => {
    if (confirm('Remove this accessory?')) {
      onChange(AccessoryService.removeCustomAccessory(userAccessories, accessoryId));
    }
  };

  const handleStartEdit = (accessoryId: string, currentName: string) => {
    setEditingAccessoryId(accessoryId);
    setEditingName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingAccessoryId && editingName.trim()) {
      onChange(AccessoryService.updateAccessoryName(userAccessories, editingAccessoryId, editingName.trim()));
    }
    setEditingAccessoryId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingAccessoryId(null);
    setEditingName('');
  };

  const handleImageUpload = (accessoryId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      onChange(AccessoryService.updateAccessoryImage(userAccessories, accessoryId, imageUrl));
    };
    reader.readAsDataURL(file);
  };

  const handleSuggestAccessory = async (accessory: UserAccessory) => {
    if (!figureId || !figureName || !currentUser) {
      alert('Unable to submit suggestion. Missing figure or user information.');
      return;
    }

    const category = prompt('Select category:\n1. weapon\n2. gear\n3. clothing\n4. vehicle\n5. display\n6. other\n\nEnter number (1-6):');
    const categoryMap: Record<string, AccessoryCategory> = {
      '1': 'weapon',
      '2': 'gear',
      '3': 'clothing',
      '4': 'vehicle',
      '5': 'display',
      '6': 'other'
    };
    const selectedCategory = categoryMap[category || '6'] || 'other';

    const required = confirm('Is this a required accessory (came with the figure)?');
    const description = prompt('Optional description:') || undefined;

    const success = await AccessorySuggestionService.submitSuggestion(
      figureId,
      figureName,
      currentUser.id,
      currentUser.name,
      accessory.name,
      selectedCategory,
      required,
      description,
      accessory.imageUrl
    );

    if (success) {
      alert('Accessory suggested to database for review!');
    } else {
      alert('Failed to submit suggestion. Please try again.');
    }
  };

  const handleMarkAllComplete = (checked: boolean) => {
    if (checked) {
      // If user accessories is empty or incomplete, merge with master and mark all owned
      if (userAccessories.length === 0 && masterAccessories.length > 0) {
        const allAccessories = AccessoryService.initializeUserAccessories(masterAccessories);
        const ownedAccessories = allAccessories.map(acc => ({ ...acc, owned: true }));
        onChange(ownedAccessories);
      } else {
        // Mark all existing accessories as owned
        const updatedAccessories = userAccessories.map(acc => ({
          ...acc,
          owned: true
        }));
        onChange(updatedAccessories);
      }
    } else {
      // Mark all as not owned
      const updatedAccessories = userAccessories.map(acc => ({
        ...acc,
        owned: false
      }));
      onChange(updatedAccessories);
    }
  };

  // Check if all accessories are owned
  const allAccessoriesOwned = userAccessories.length > 0 &&
    userAccessories.every(acc => acc.owned);

  // Group accessories by category
  const groupedAccessories = masterAccessories.reduce((acc, masterAcc) => {
    if (!acc[masterAcc.category]) {
      acc[masterAcc.category] = [];
    }
    acc[masterAcc.category].push(masterAcc);
    return acc;
  }, {} as Record<AccessoryCategory, Accessory[]>);

  // Individual accessories (not in master list)
  const individualAccessories = userAccessories.filter(
    ua => ua.isCustom || !masterAccessories.find(ma => ma.id === ua.id)
  );

  return (
    <div className="space-y-4">
      {/* Header with completeness */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Accessories</Label>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track what accessories you have for this figure
          </p>
        </div>

        {masterAccessories.length > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {completeness}%
            </div>
            <div className={`text-xs font-semibold ${
              badge.color === 'green'
                ? 'text-green-600 dark:text-green-400'
                : badge.color === 'yellow'
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {badge.label}
            </div>
          </div>
        )}
      </div>

      {/* Quick Complete Checkbox - only show if there are accessories */}
      {(masterAccessories.length > 0 || userAccessories.length > 0) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <Checkbox
              id="mark-all-complete"
              checked={allAccessoriesOwned}
              onChange={handleMarkAllComplete}
            />
            <label
              htmlFor="mark-all-complete"
              className="flex-1 cursor-pointer text-sm font-medium text-gray-900 dark:text-white"
            >
              Complete (I have all accessories)
            </label>
            {allAccessoriesOwned && (
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-8">
            Check this to mark all accessories as owned, or track them individually below
          </p>
        </div>
      )}

      {/* No accessories in master database */}
      {masterAccessories.length === 0 && individualAccessories.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                No Accessories Defined
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                This figure doesn't have accessories defined in our database yet. You can add individual accessories below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Accessory list grouped by category */}
      {Object.entries(groupedAccessories).map(([category, accessories]) => {
        const Icon = categoryIcons[category as AccessoryCategory];
        const colorClass = categoryColors[category as AccessoryCategory];

        return (
          <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`h-4 w-4 ${colorClass}`} />
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white capitalize">
                {category}
              </h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({accessories.filter(a => userAccessories.find(ua => ua.id === a.id)?.owned).length}/{accessories.length})
              </span>
            </div>

            <div className="space-y-2">
              {accessories.map(acc => {
                const userAcc = userAccessories.find(ua => ua.id === acc.id);
                const owned = userAcc?.owned || false;

                return (
                  <div
                    key={acc.id}
                    className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                      owned
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <Checkbox
                      id={`accessory-${acc.id}`}
                      checked={owned}
                      onChange={() => handleToggleAccessory(acc.id)}
                    />
                    <label
                      htmlFor={`accessory-${acc.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${
                          owned
                            ? 'text-gray-900 dark:text-white font-medium'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {acc.name}
                        </span>
                        {acc.required && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      {acc.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {acc.description}
                        </p>
                      )}
                    </label>
                    {userAcc?.imageUrl && (
                      <img
                        src={userAcc.imageUrl}
                        alt={acc.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    )}
                    {owned ? (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <X className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Individual accessories */}
      {individualAccessories.length > 0 && (
        <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
              Individual Accessories
            </h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              (specific to your figure)
            </span>
          </div>

          <div className="space-y-2">
            {individualAccessories.map(acc => (
              <div
                key={acc.id}
                className={`flex items-center gap-2 p-2 rounded-md ${
                  acc.owned
                    ? 'bg-purple-50 dark:bg-purple-900/20'
                    : 'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <Checkbox
                  id={`individual-${acc.id}`}
                  checked={acc.owned}
                  onChange={() => handleToggleAccessory(acc.id)}
                />

                {editingAccessoryId === acc.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 h-8"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEdit();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveEdit}
                      className="h-8 px-2"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="h-8 px-2"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <label
                      htmlFor={`individual-${acc.id}`}
                      className="flex-1 cursor-pointer text-sm text-gray-900 dark:text-white"
                    >
                      {acc.name}
                    </label>

                    {acc.imageUrl && (
                      <img
                        src={acc.imageUrl}
                        alt={acc.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(acc.id, e)}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-2 text-gray-600 hover:text-gray-700"
                      title="Add photo"
                    >
                      <Camera className="h-3 w-3" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(acc.id, acc.name)}
                      className="h-8 px-2 text-gray-600 hover:text-gray-700"
                      title="Edit name"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>

                    {figureId && figureName && currentUser && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSuggestAccessory(acc)}
                        className="h-8 px-2 text-blue-600 hover:text-blue-700"
                        title="Suggest to database"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveIndividual(acc.id)}
                      className="h-8 px-2 text-red-600 hover:text-red-700"
                      title="Remove"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add individual accessory */}
      <div>
        {showAddIndividual ? (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
            <Input
              value={individualAccessoryName}
              onChange={(e) => setIndividualAccessoryName(e.target.value)}
              placeholder="Accessory name..."
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !suggestToDatabase) {
                  e.preventDefault();
                  handleAddIndividual();
                }
              }}
              autoFocus
            />

            {figureId && figureName && currentUser && (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="suggest-to-db"
                    checked={suggestToDatabase}
                    onChange={(checked) => setSuggestToDatabase(checked)}
                  />
                  <label htmlFor="suggest-to-db" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    Suggest this accessory to be added to the database for all users
                  </label>
                </div>

                {suggestToDatabase && (
                  <div className="space-y-2 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
                    <div>
                      <Label className="text-xs">Category</Label>
                      <Select
                        value={suggestionCategory}
                        onChange={(e) => setSuggestionCategory(e.target.value as AccessoryCategory)}
                        className="h-8 text-sm"
                      >
                        <option value="weapon">Weapon</option>
                        <option value="gear">Gear</option>
                        <option value="clothing">Clothing</option>
                        <option value="vehicle">Vehicle</option>
                        <option value="display">Display</option>
                        <option value="other">Other</option>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="required-acc"
                        checked={suggestionRequired}
                        onChange={(checked) => setSuggestionRequired(checked)}
                      />
                      <label htmlFor="required-acc" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                        Required accessory (came with figure)
                      </label>
                    </div>

                    <div>
                      <Label className="text-xs">Description (optional)</Label>
                      <Input
                        value={suggestionDescription}
                        onChange={(e) => setSuggestionDescription(e.target.value)}
                        placeholder="e.g., Silver rifle with scope"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2">
              <Button type="button" onClick={handleAddIndividual} size="sm">
                Add
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddIndividual(false);
                  setIndividualAccessoryName('');
                  setSuggestToDatabase(false);
                  setSuggestionCategory('other');
                  setSuggestionRequired(false);
                  setSuggestionDescription('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddIndividual(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Individual Accessory
          </Button>
        )}
      </div>

      {/* Completeness notes */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        <AlertCircle className="h-3 w-3 inline mr-1" />
        Completeness is calculated based on required accessories only
      </div>
    </div>
  );
}

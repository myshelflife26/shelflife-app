import { useState, useMemo } from 'react';
import { SettingsService } from '../utils/settings';
import type { CustomField, CustomFieldType } from '../types/index';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Plus, X, Edit2, Check, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface CustomFieldsManagerProps {
  fields: CustomField[];
  onFieldsChange: () => void;
}

export function CustomFieldsManager({ fields, onFieldsChange }: CustomFieldsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newField, setNewField] = useState<Omit<CustomField, 'id'>>({
    name: '',
    type: 'text',
    required: false
  });
  const [editField, setEditField] = useState<CustomField | null>(null);
  const [selectOptions, setSelectOptions] = useState<string>('');
  const [editSelectOptions, setEditSelectOptions] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sort fields by reverse order (most recent first, as a proxy)
  const sortedFields = useMemo(() => {
    return [...fields].reverse();
  }, [fields]);

  // Filter fields by search query
  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedFields.slice(0, 20); // Show top 20 recent
    }
    const query = searchQuery.toLowerCase();
    return sortedFields.filter(field =>
      field.name.toLowerCase().includes(query) ||
      field.type.toLowerCase().includes(query)
    );
  }, [sortedFields, searchQuery]);

  const handleAdd = () => {
    if (!newField.name.trim()) return;

    const fieldToAdd: Omit<CustomField, 'id'> = {
      ...newField,
      options: newField.type === 'select'
        ? selectOptions.split(',').map(o => o.trim()).filter(Boolean)
        : undefined
    };

    SettingsService.addCustomField(fieldToAdd);
    setNewField({ name: '', type: 'text', required: false });
    setSelectOptions('');
    setIsAdding(false);
    onFieldsChange();
  };

  const handleEdit = (field: CustomField) => {
    setEditingId(field.id);
    setEditField({ ...field });
    setEditSelectOptions(field.options ? field.options.join(', ') : '');
  };

  const handleSaveEdit = () => {
    if (!editField || !editField.name.trim()) return;

    const fieldToUpdate: Partial<Omit<CustomField, 'id'>> = {
      name: editField.name,
      type: editField.type,
      required: editField.required,
      options: editField.type === 'select'
        ? editSelectOptions.split(',').map(o => o.trim()).filter(Boolean)
        : undefined
    };

    SettingsService.updateCustomField(editField.id, fieldToUpdate);
    setEditingId(null);
    setEditField(null);
    setEditSelectOptions('');
    onFieldsChange();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditField(null);
    setEditSelectOptions('');
  };

  const handleRemove = (id: string) => {
    if (confirm('Remove this custom field? This will remove it from all figures.')) {
      SettingsService.removeCustomField(id);
      onFieldsChange();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
      {/* Header - Always visible */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Custom Fields
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {fields.length} field{fields.length !== 1 ? 's' : ''} • Click to {isExpanded ? 'collapse' : 'expand'}
          </p>
        </div>
        <Button variant="ghost" size="icon">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Create your own fields that will appear when adding/editing figures
          </p>

          {/* Add Field Button - Always show when not adding */}
          {!isAdding && (
            <div className="mb-4">
              <Button onClick={() => setIsAdding(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
          )}

          {fields.length === 0 && !isAdding ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-8">
              No custom fields yet. Click "Add Field" above to create one.
            </p>
          ) : fields.length > 0 && (
            <>
              {/* Search Box */}
              {!isAdding && (
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by field name or type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {searchQuery ? `Showing ${filteredFields.length} matching fields` : `Showing ${filteredFields.length} most recent fields`}
                  </p>
                </div>
              )}

              {/* Existing Fields */}
              {filteredFields.length === 0 && searchQuery ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-8">
                  No fields found matching "{searchQuery}"
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {filteredFields.map((field) => (
          <div key={field.id}>
            {editingId === field.id && editField ? (
              // Edit Form
              <div className="border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded p-3 space-y-3">
                <div>
                  <Label htmlFor={`edit-name-${field.id}`}>Field Name *</Label>
                  <Input
                    id={`edit-name-${field.id}`}
                    value={editField.name}
                    onChange={(e) => setEditField({ ...editField, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor={`edit-type-${field.id}`}>Field Type</Label>
                  <Select
                    id={`edit-type-${field.id}`}
                    value={editField.type}
                    onChange={(e) => setEditField({ ...editField, type: e.target.value as CustomFieldType })}
                  >
                    <option value="text">Text (short)</option>
                    <option value="textarea">Text (long)</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="select">Dropdown (Select)</option>
                  </Select>
                </div>

                {editField.type === 'select' && (
                  <div>
                    <Label htmlFor={`edit-options-${field.id}`}>Dropdown Options *</Label>
                    <Input
                      id={`edit-options-${field.id}`}
                      placeholder="Option 1, Option 2, Option 3"
                      value={editSelectOptions}
                      onChange={(e) => setEditSelectOptions(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Separate options with commas
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-required-${field.id}`}
                    checked={editField.required || false}
                    onCheckedChange={(checked) => setEditField({ ...editField, required: checked === true })}
                  />
                  <Label htmlFor={`edit-required-${field.id}`} className="cursor-pointer">
                    Required field
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit} size="sm">
                    <Check className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              // Display Mode
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {field.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                      {field.type}
                    </span>
                    {field.required && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                        required
                      </span>
                    )}
                  </div>
                  {field.type === 'select' && field.options && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Options: {field.options.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                    onClick={() => handleEdit(field)}
                    title="Edit field"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => handleRemove(field.id)}
                    title="Remove field"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
                </div>
              )}
            </>
          )}

          {/* Add New Field Form */}
          {isAdding && (
            <div className="border-t pt-4 space-y-3">
          <div>
            <Label htmlFor="fieldName">Field Name *</Label>
            <Input
              id="fieldName"
              placeholder="e.g., Year Released, Edition, Rarity"
              value={newField.name}
              onChange={(e) => setNewField({ ...newField, name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="fieldType">Field Type</Label>
            <Select
              id="fieldType"
              value={newField.type}
              onChange={(e) => setNewField({ ...newField, type: e.target.value as CustomFieldType })}
            >
              <option value="text">Text (short)</option>
              <option value="textarea">Text (long)</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="select">Dropdown (Select)</option>
            </Select>
          </div>

          {newField.type === 'select' && (
            <div>
              <Label htmlFor="selectOptions">Dropdown Options *</Label>
              <Input
                id="selectOptions"
                placeholder="Option 1, Option 2, Option 3"
                value={selectOptions}
                onChange={(e) => setSelectOptions(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Separate options with commas
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="fieldRequired"
              checked={newField.required}
              onCheckedChange={(checked) => setNewField({ ...newField, required: checked === true })}
            />
            <Label htmlFor="fieldRequired" className="cursor-pointer">
              Required field
            </Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAdd} size="sm">
              <Check className="h-4 w-4 mr-2" />
              Add Field
            </Button>
            <Button
              onClick={() => {
                setIsAdding(false);
                setNewField({ name: '', type: 'text', required: false });
                setSelectOptions('');
              }}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

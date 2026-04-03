import { useState, useEffect } from 'react';
import { SettingsService } from '../utils/settings';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Columns3 } from 'lucide-react';

interface ColumnVisibilityMenuProps {
  onVisibilityChange: () => void;
}

interface ColumnDefinition {
  id: string;
  label: string;
}

const COLUMNS: ColumnDefinition[] = [
  { id: 'image', label: 'Image' },
  { id: 'name', label: 'Name' },
  { id: 'manufacturer', label: 'Manufacturer' },
  { id: 'category', label: 'Category' },
  { id: 'condition', label: 'Condition' },
  { id: 'size', label: 'Size' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'currentValue', label: 'Value' },
  { id: 'purchaseDate', label: 'Purchase Date' },
  { id: 'location', label: 'Location' },
  { id: 'availability', label: 'Availability' },
  { id: 'completeness', label: 'Completeness' },
];

export function ColumnVisibilityMenu({ onVisibilityChange }: ColumnVisibilityMenuProps) {
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const columns = SettingsService.getColumnVisibility();
    setVisibleColumns(columns);
  }, []);

  const handleToggle = (columnId: string) => {
    const newValue = !visibleColumns[columnId];
    SettingsService.updateColumnVisibility(columnId, newValue);
    setVisibleColumns(prev => ({ ...prev, [columnId]: newValue }));
    onVisibilityChange();
  };

  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="h-4 w-4 mr-2" />
          Columns ({visibleCount})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="p-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Show/Hide Columns
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {COLUMNS.map(column => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`col-${column.id}`}
                  checked={visibleColumns[column.id] ?? true}
                  onCheckedChange={() => handleToggle(column.id)}
                />
                <Label
                  htmlFor={`col-${column.id}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { useState, useEffect, useMemo } from 'react';
import type { Filters, ActionFigure, CustomField } from '../types/index';
import { SettingsService } from '../utils/settings';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from './ui/sheet';
import { Filter, X } from 'lucide-react';

interface FilterSheetProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  manufacturers: string[];
  categories: string[];
  conditions: string[];
  sizes: string[];
  packaging: string[];
  productLines: string[];
  locations: string[];
  figures: ActionFigure[];
}

export function FilterSheet({
  filters,
  onFilterChange,
  manufacturers,
  categories,
  conditions,
  sizes,
  packaging,
  productLines,
  locations,
  figures,
}: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<Filters>(filters);
  const [isOpen, setIsOpen] = useState(false);

  // Get custom fields from settings
  const customFields = useMemo(() => {
    return SettingsService.getSettings().customFields;
  }, []);

  // Calculate unique values for each custom field
  const customFieldValues = useMemo(() => {
    const values: Record<string, string[]> = {};

    customFields.forEach(field => {
      const uniqueValues = new Set<string>();
      figures.forEach(figure => {
        const value = figure.customFields?.[field.id];
        if (value !== undefined && value !== null && value !== '') {
          uniqueValues.add(String(value));
        }
      });
      values[field.id] = Array.from(uniqueValues).sort();
    });

    return values;
  }, [figures, customFields]);

  // Extract unique years from figures
  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    figures.forEach(figure => {
      if (figure.year) {
        years.add(figure.year);
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Descending order (newest first)
  }, [figures]);

  // Extract unique versions from figures
  const uniqueVersions = useMemo(() => {
    const versions = new Set<string>();
    figures.forEach(figure => {
      if (figure.version) {
        versions.add(figure.version);
      }
    });
    return Array.from(versions).sort();
  }, [figures]);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    const cleared: Filters = {
      search: '',
      manufacturers: [],
      conditions: [],
      priceRange: [0, 10000],
      dateRange: ['', ''],
      categories: [],
      sizes: [],
      packaging: [],
      productLines: [],
      locations: [],
      years: [],
      versions: [],
      upc: undefined,
      isComplete: 'all',
      completenessRange: undefined,
      saleTradeStatuses: [],
      customFields: {},
    };
    setLocalFilters(cleared);
    onFilterChange(cleared);
  };

  const toggleManufacturer = (mfg: string) => {
    setLocalFilters(prev => ({
      ...prev,
      manufacturers: prev.manufacturers.includes(mfg)
        ? prev.manufacturers.filter(m => m !== mfg)
        : [...prev.manufacturers, mfg]
    }));
  };

  const toggleCategory = (cat: string) => {
    setLocalFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  const toggleCondition = (cond: string) => {
    setLocalFilters(prev => ({
      ...prev,
      conditions: prev.conditions.includes(cond)
        ? prev.conditions.filter(c => c !== cond)
        : [...prev.conditions, cond]
    }));
  };

  const toggleSize = (size: string) => {
    setLocalFilters(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
  };

  const togglePackaging = (pkg: string) => {
    setLocalFilters(prev => ({
      ...prev,
      packaging: prev.packaging.includes(pkg)
        ? prev.packaging.filter(p => p !== pkg)
        : [...prev.packaging, pkg]
    }));
  };

  const toggleProductLine = (line: string) => {
    setLocalFilters(prev => ({
      ...prev,
      productLines: prev.productLines.includes(line)
        ? prev.productLines.filter(l => l !== line)
        : [...prev.productLines, line]
    }));
  };

  const toggleLocation = (loc: string) => {
    setLocalFilters(prev => ({
      ...prev,
      locations: prev.locations.includes(loc)
        ? prev.locations.filter(l => l !== loc)
        : [...prev.locations, loc]
    }));
  };

  const toggleYear = (year: number) => {
    setLocalFilters(prev => ({
      ...prev,
      years: prev.years.includes(year)
        ? prev.years.filter(y => y !== year)
        : [...prev.years, year]
    }));
  };

  const toggleVersion = (version: string) => {
    setLocalFilters(prev => ({
      ...prev,
      versions: prev.versions.includes(version)
        ? prev.versions.filter(v => v !== version)
        : [...prev.versions, version]
    }));
  };

  const toggleSaleTradeStatus = (status: string) => {
    setLocalFilters(prev => ({
      ...prev,
      saleTradeStatuses: prev.saleTradeStatuses.includes(status as any)
        ? prev.saleTradeStatuses.filter(s => s !== status)
        : [...prev.saleTradeStatuses, status as any]
    }));
  };

  const toggleCustomField = (fieldId: string, value: string) => {
    setLocalFilters(prev => {
      const currentCustomFields = prev.customFields || {};
      const currentValues = currentCustomFields[fieldId] || [];

      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];

      return {
        ...prev,
        customFields: {
          ...currentCustomFields,
          [fieldId]: newValues
        }
      };
    });
  };

  const customFieldFilterCount = useMemo(() => {
    if (!localFilters.customFields) return 0;
    return Object.values(localFilters.customFields).reduce((sum, values) => sum + values.length, 0);
  }, [localFilters.customFields]);

  const activeFilterCount =
    localFilters.manufacturers.length +
    localFilters.categories.length +
    localFilters.conditions.length +
    localFilters.sizes.length +
    localFilters.packaging.length +
    localFilters.productLines.length +
    localFilters.locations.length +
    localFilters.saleTradeStatuses.length +
    customFieldFilterCount +
    (localFilters.dateRange[0] || localFilters.dateRange[1] ? 1 : 0) +
    (localFilters.priceRange[0] !== 0 || localFilters.priceRange[1] !== 10000 ? 1 : 0) +
    (localFilters.isComplete && localFilters.isComplete !== 'all' ? 1 : 0) +
    (localFilters.completenessRange ? 1 : 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 sm:ml-2 bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Collection</SheetTitle>
          <SheetDescription>
            Apply filters to narrow down your collection view
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Manufacturers */}
          {manufacturers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Manufacturers</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {manufacturers.map((mfg) => (
                  <div key={mfg} className="flex items-center space-x-2">
                    <Checkbox
                      id={`mfg-${mfg}`}
                      checked={localFilters.manufacturers.includes(mfg)}
                      onCheckedChange={() => toggleManufacturer(mfg)}
                    />
                    <Label
                      htmlFor={`mfg-${mfg}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {mfg}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Categories</Label>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cat-${cat}`}
                      checked={localFilters.categories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    <Label
                      htmlFor={`cat-${cat}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {cat}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conditions */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Condition</Label>
            <div className="space-y-2">
              {conditions.map((cond) => (
                <div key={cond} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cond-${cond}`}
                    checked={localFilters.conditions.includes(cond)}
                    onCheckedChange={() => toggleCondition(cond)}
                  />
                  <Label
                    htmlFor={`cond-${cond}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {cond}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Price Range</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="Min"
                value={localFilters.priceRange[0]}
                onChange={(e) =>
                  setLocalFilters(prev => ({
                    ...prev,
                    priceRange: [parseFloat(e.target.value) || 0, prev.priceRange[1]]
                  }))
                }
              />
              <span>to</span>
              <Input
                type="number"
                placeholder="Max"
                value={localFilters.priceRange[1]}
                onChange={(e) =>
                  setLocalFilters(prev => ({
                    ...prev,
                    priceRange: [prev.priceRange[0], parseFloat(e.target.value) || 10000]
                  }))
                }
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Purchase Date Range</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={localFilters.dateRange[0]}
                onChange={(e) =>
                  setLocalFilters(prev => ({
                    ...prev,
                    dateRange: [e.target.value, prev.dateRange[1]]
                  }))
                }
              />
              <span>to</span>
              <Input
                type="date"
                value={localFilters.dateRange[1]}
                onChange={(e) =>
                  setLocalFilters(prev => ({
                    ...prev,
                    dateRange: [prev.dateRange[0], e.target.value]
                  }))
                }
              />
            </div>
          </div>

          {/* Completeness Range */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Accessory Completeness (%)</Label>
              {localFilters.completenessRange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocalFilters(prev => ({ ...prev, completenessRange: undefined }))}
                  className="h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="Min %"
                min="0"
                max="100"
                value={localFilters.completenessRange?.[0] ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                  setLocalFilters(prev => ({
                    ...prev,
                    completenessRange: val !== undefined ? [val, prev.completenessRange?.[1] ?? 100] : undefined
                  }));
                }}
              />
              <span>to</span>
              <Input
                type="number"
                placeholder="Max %"
                min="0"
                max="100"
                value={localFilters.completenessRange?.[1] ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Math.max(0, Math.min(100, parseInt(e.target.value) || 100));
                  setLocalFilters(prev => ({
                    ...prev,
                    completenessRange: val !== undefined ? [prev.completenessRange?.[0] ?? 0, val] : undefined
                  }));
                }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Filter figures by accessory completeness percentage (Loose/Custom only)
            </p>
          </div>

          {/* Size */}
          {sizes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Size</Label>
              <div className="space-y-2">
                {sizes.map((size) => (
                  <div key={size} className="flex items-center space-x-2">
                    <Checkbox
                      id={`size-${size}`}
                      checked={localFilters.sizes.includes(size)}
                      onCheckedChange={() => toggleSize(size)}
                    />
                    <Label
                      htmlFor={`size-${size}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {size}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Packaging */}
          {packaging.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Packaging</Label>
              <div className="space-y-2">
                {packaging.map((pkg) => (
                  <div key={pkg} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pkg-${pkg}`}
                      checked={localFilters.packaging.includes(pkg)}
                      onCheckedChange={() => togglePackaging(pkg)}
                    />
                    <Label
                      htmlFor={`pkg-${pkg}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {pkg}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product Line */}
          {productLines.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Product Line</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {productLines.map((line) => (
                  <div key={line} className="flex items-center space-x-2">
                    <Checkbox
                      id={`line-${line}`}
                      checked={localFilters.productLines.includes(line)}
                      onCheckedChange={() => toggleProductLine(line)}
                    />
                    <Label
                      htmlFor={`line-${line}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {line}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          {locations.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Location</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {locations.map((loc) => (
                  <div key={loc} className="flex items-center space-x-2">
                    <Checkbox
                      id={`loc-${loc}`}
                      checked={localFilters.locations.includes(loc)}
                      onCheckedChange={() => toggleLocation(loc)}
                    />
                    <Label
                      htmlFor={`loc-${loc}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {loc}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Filters Section */}
          {(uniqueYears.length > 0 || uniqueVersions.length > 0) && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Advanced Search</h3>

              {/* Year Filter */}
              {uniqueYears.length > 0 && (
                <div className="space-y-2 mb-4">
                  <Label className="text-base font-semibold">Release Year</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uniqueYears.map((year) => (
                      <div key={year} className="flex items-center space-x-2">
                        <Checkbox
                          id={`year-${year}`}
                          checked={localFilters.years.includes(year)}
                          onCheckedChange={() => toggleYear(year)}
                        />
                        <Label
                          htmlFor={`year-${year}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {year}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Version Filter */}
              {uniqueVersions.length > 0 && (
                <div className="space-y-2 mb-4">
                  <Label className="text-base font-semibold">Version</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uniqueVersions.map((version) => (
                      <div key={version} className="flex items-center space-x-2">
                        <Checkbox
                          id={`version-${version}`}
                          checked={localFilters.versions.includes(version)}
                          onCheckedChange={() => toggleVersion(version)}
                        />
                        <Label
                          htmlFor={`version-${version}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {version}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* UPC Search */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">UPC / Barcode</Label>
                <Input
                  type="text"
                  placeholder="Search by UPC or EAN..."
                  value={localFilters.upc || ''}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, upc: e.target.value || undefined }))}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Search for figures by their UPC or EAN barcode
                </p>
              </div>
            </div>
          )}

          {/* Is Complete (for Loose figures) */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Completeness (Loose Figures)</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="complete-all"
                  name="isComplete"
                  checked={localFilters.isComplete === 'all'}
                  onChange={() => setLocalFilters(prev => ({ ...prev, isComplete: 'all' }))}
                  className="cursor-pointer"
                />
                <Label htmlFor="complete-all" className="text-sm font-normal cursor-pointer">
                  All
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="complete-yes"
                  name="isComplete"
                  checked={localFilters.isComplete === 'yes'}
                  onChange={() => setLocalFilters(prev => ({ ...prev, isComplete: 'yes' }))}
                  className="cursor-pointer"
                />
                <Label htmlFor="complete-yes" className="text-sm font-normal cursor-pointer">
                  Complete Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="complete-no"
                  name="isComplete"
                  checked={localFilters.isComplete === 'no'}
                  onChange={() => setLocalFilters(prev => ({ ...prev, isComplete: 'no' }))}
                  className="cursor-pointer"
                />
                <Label htmlFor="complete-no" className="text-sm font-normal cursor-pointer">
                  Incomplete Only
                </Label>
              </div>
            </div>
          </div>

          {/* Sale/Trade Status */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Availability</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="status-sale"
                  checked={localFilters.saleTradeStatuses.includes('for-sale')}
                  onCheckedChange={() => toggleSaleTradeStatus('for-sale')}
                />
                <Label htmlFor="status-sale" className="text-sm font-normal cursor-pointer">
                  For Sale
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="status-trade"
                  checked={localFilters.saleTradeStatuses.includes('for-trade')}
                  onCheckedChange={() => toggleSaleTradeStatus('for-trade')}
                />
                <Label htmlFor="status-trade" className="text-sm font-normal cursor-pointer">
                  For Trade
                </Label>
              </div>
            </div>
          </div>

          {/* Custom Fields Filters */}
          {customFields.map(field => {
            const values = customFieldValues[field.id] || [];
            if (values.length === 0) return null;

            return (
              <div key={field.id} className="space-y-2">
                <Label className="text-base font-semibold">{field.name}</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {values.map(value => (
                    <div key={value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`custom-${field.id}-${value}`}
                        checked={localFilters.customFields?.[field.id]?.includes(value) || false}
                        onCheckedChange={() => toggleCustomField(field.id, value)}
                      />
                      <Label
                        htmlFor={`custom-${field.id}-${value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {value}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <SheetFooter className="mt-6 flex gap-2">
          <Button onClick={handleClear} variant="outline" className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

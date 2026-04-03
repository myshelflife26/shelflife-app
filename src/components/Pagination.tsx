import { Button } from './ui/button';
import { Select } from './ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-between gap-1 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-1 sm:gap-2">
        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap hidden sm:inline">
          Per page:
        </span>
        <Select
          value={pageSize.toString()}
          onChange={(e) => {
            const newSize = parseInt(e.target.value);
            onPageSizeChange(newSize);
            // Reset to page 1 when changing page size
            onPageChange(1);
          }}
          className="w-16 sm:w-24 text-xs sm:text-sm"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </Select>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1">
        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap hidden sm:inline">
          {startItem}-{endItem} of {totalItems}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious}
          className="h-7 w-7 sm:h-8 sm:w-8"
          title="First page"
        >
          <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="h-7 w-7 sm:h-8 sm:w-8"
          title="Previous page"
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 px-1 sm:px-2 whitespace-nowrap">
          {currentPage}/{totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="h-7 w-7 sm:h-8 sm:w-8"
          title="Next page"
        >
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          className="h-7 w-7 sm:h-8 sm:w-8"
          title="Last page"
        >
          <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  );
}

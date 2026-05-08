# Feed Page UI Updates - In Progress

## Completed:
- ✅ Added state variables for 3 recent periods (7 days, 30 days, custom)
- ✅ Added state for random collectors with sample figures
- ✅ Updated rising stars to filter by 3+ point bump (or show top 10 if none)
- ✅ Updated data loading to populate all new sections
- ✅ Added pagination variables for new sections
- ✅ Added `getRandomCollectors()` function

## Remaining UI Updates:

### 1. Recently Added Tab - Replace Single Section with Three
**Location:** Line ~1265 in FeedPage.tsx

Replace the single "Recently Added (Past Week)" section with three sections like Rising Stars:

**Section 1 - Last 7 Days:**
- Title: "Recently Added - Last 7 Days"
- Data: `paginatedRecent7Days`
- Pagination: `recent7DaysPage`, `recent7DaysPageSize`
- Empty state: "No recently added figures in the past 7 days"

**Section 2 - Last Month:**
- Title: "Recently Added - Last Month"  
- Data: `paginatedRecent30Days`
- Pagination: `recent30DaysPage`, `recent30DaysPageSize`
- Empty state: "No recently added figures in the past 30 days"

**Section 3 - Custom Period:**
- Title: "Recently Added - Custom Period"
- Input field for `recentCustomDaysBack` (similar to rising stars custom)
- Data: `paginatedRecentCustom`
- Pagination: `recentCustomPage`, `recentCustomPageSize`
- Empty state: "No recently added figures in the past {recentCustomDaysBack} days"

### 2. Suggested Collectors - Add Random Collectors Below
**Location:** After line ~1219 in FeedPage.tsx (end of Suggested Collectors section)

Add new section BELOW the existing Suggested Collectors:

```tsx
{/* Random Collectors */}
<div className="mb-8 bg-teal-100/70 dark:bg-teal-900/20 rounded-lg p-3 sm:p-6">
  <div className="flex items-center gap-2 mb-4">
    <Users className="h-6 w-6 text-teal-600" />
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Random Collectors</h2>
  </div>
  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
    Discover collectors from the community
  </p>

  <Pagination
    currentPage={randomCollectorsPage}
    totalItems={randomCollectors.length}
    pageSize={randomCollectorsPageSize}
    onPageChange={setRandomCollectorsPage}
    onPageSizeChange={setRandomCollectorsPageSize}
  />

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
    {paginatedRandomCollectors.map(collector => (
      <div key={collector.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
        {/* User info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
            {collector.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {collector.displayName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              @{collector.username}
            </p>
          </div>
        </div>

        {/* Sample figures - 4 small thumbnails in a grid */}
        {collector.sampleFigures.length > 0 && (
          <div className="grid grid-cols-4 gap-1 mb-3">
            {collector.sampleFigures.map(fig => {
              const img = fig.imageUrl || fig.customImageUrl;
              return (
                <div key={fig.id} className="aspect-square bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                  {img ? (
                    <img src={img} alt={fig.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => handleAdmire(collector.id)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Send Request
          </Button>
          {onNavigateToBrowse && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigateToBrowse(collector.id)}
            >
              View
            </Button>
          )}
        </div>
      </div>
    ))}
  </div>

  <Pagination
    currentPage={randomCollectorsPage}
    totalItems={randomCollectors.length}
    pageSize={randomCollectorsPageSize}
    onPageChange={setRandomCollectorsPage}
    onPageSizeChange={setRandomCollectorsPageSize}
  />
</div>
```

## Implementation Notes:

- The Recently Added sections should mirror the Rising Stars structure exactly (same background colors, same layout pattern)
- Use pink for 7 days, blue for 30 days, green for custom (to match Rising Stars colors but for "added" theme)
- Each figure card should show: image, name, owner, reaction buttons
- Random Collectors should show 4 small figure thumbnails in a 2x2 grid
- Both sections need empty state messages

## Testing:
1. Verify 3+ point bump filter works for Rising Stars
2. Verify Recently Added shows three time periods
3. Verify Random Collectors displays with figure thumbnails
4. Test pagination on all new sections
5. Verify custom period inputs update data on blur

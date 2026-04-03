# Integration Instructions for eBay Search Feature

## Files Created:
1. ✅ `src/utils/ebayAPI.ts` - eBay API integration
2. ✅ `src/utils/communityDatabase.ts` - Community database
3. ✅ `src/utils/figureSearch.ts` - Unified search service
4. ✅ `src/components/FigureSearchModal.tsx` - Search UI

## Files to Update:

### 1. Update `src/components/FigureForm.tsx`

Add these imports at the top:
```typescript
import { FigureSearchModal } from './FigureSearchModal';
import { FigureSearchService, type FigureSearchResult } from '../utils/figureSearch';
import { Search } from 'lucide-react';
import type { User } from '../types/user';
```

Update the FigureFormProps interface to include currentUser:
```typescript
interface FigureFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (figure: Omit<ActionFigure, 'id'>) => void;
  figure?: ActionFigure;
  currentUser: User; // ADD THIS LINE
}
```

Update the function signature:
```typescript
export function FigureForm({ open, onClose, onSave, figure, currentUser }: FigureFormProps) {
```

Add state for search modal (add after the other useState declarations):
```typescript
const [searchModalOpen, setSearchModalOpen] = useState(false);
```

Add handler for importing figure (add after handleSubmit):
```typescript
const handleImportFigure = (result: FigureSearchResult) => {
  // Pre-fill form with imported data
  setFormData({
    ...formData,
    name: result.name,
    manufacturer: result.manufacturer || formData.manufacturer,
    category: result.category || formData.category,
    currentValue: result.estimatedValue || formData.currentValue,
    images: result.images,
    year: result.year,
    productLine: result.productLine || formData.productLine,
  });

  // Save to community database
  FigureSearchService.saveToDatabase(result, currentUser.id, currentUser.displayName);

  // Close search modal
  setSearchModalOpen(false);

  // Show success message
  alert('✓ Figure data imported! Review the details and click Save to add to your collection.');
};
```

Add the search button in the form (find where the form fields start and add this button near the top, after the DialogHeader):
```typescript
{/* Search Online Button */}
<div className="mb-4">
  <Button
    type="button"
    variant="outline"
    onClick={() => setSearchModalOpen(true)}
    className="w-full"
  >
    <Search className="h-4 w-4 mr-2" />
    🔍 Search Online Database
  </Button>
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
    Import figure data from eBay and community database
  </p>
</div>
```

Add the modal at the end of the return statement (before the closing tag):
```typescript
{/* Search Modal */}
<FigureSearchModal
  open={searchModalOpen}
  onClose={() => setSearchModalOpen(false)}
  onSelect={handleImportFigure}
/>
```

---

### 2. Update `src/App.tsx`

Find where FigureForm is used (around line 980) and update it to pass currentUser:

```typescript
<FigureForm
  open={formOpen}
  onClose={handleCloseForm}
  onSave={handleSaveFigure}
  figure={editingFigure}
  currentUser={currentUser}  // ADD THIS LINE
/>
```

---

### 3. Add eBay API Key

Open `src/utils/ebayAPI.ts` and replace:
```typescript
const EBAY_APP_ID = 'YOUR_EBAY_APP_ID_HERE';
```

With your actual App ID from eBay Developer Program:
```typescript
const EBAY_APP_ID = 'YourActualAppID';
```

**How to get your App ID:**
1. Go to https://developer.ebay.com/my/keys
2. Sign in with your eBay account
3. Create a new keyset (or use existing)
4. Copy your "App ID (Client ID)"
5. Paste it in ebayAPI.ts

---

## Testing the Feature

### Before Adding API Key:
1. Click "Add Figure" button
2. Click "🔍 Search Online Database" button
3. Type a search (e.g., "Storm Shadow 1984")
4. Click Search
5. You'll see: "Search failed. Please check your eBay API key configuration"

### After Adding API Key:
1. Click "Add Figure" button
2. Click "🔍 Search Online Database" button
3. Type a search (e.g., "Storm Shadow 1984")
4. Click Search
5. You should see results from eBay!
6. Click "Import This Figure" on any result
7. Form will be pre-filled with data
8. Review and click "Save Figure"

---

## How It Works:

### User Flow:
1. User clicks "Add Figure"
2. Instead of typing everything manually, clicks "Search Online Database"
3. Searches for "Storm Shadow 1984"
4. Sees 20 results (mix of community database and eBay)
5. Clicks "Import This Figure" on the best match
6. Form pre-fills with:
   - Figure name
   - Manufacturer
   - Year
   - Images (automatically added)
   - Estimated value (current market price)
   - Product line
7. User can edit any field before saving
8. When saved, figure data also saves to community database
9. Next user who searches for same figure gets instant results (no eBay API call needed)

### Smart Features:
- **Community database searched first** - Instant results for popular figures
- **eBay fallback** - If not in community database, searches eBay
- **Builds over time** - Every import adds to community database
- **Verified badges** - Community figures can be verified by moderators
- **Usage tracking** - Most-used figures appear first
- **Duplicate prevention** - Similar figures are merged automatically

---

## Future Enhancements (Not Implemented Yet):

These can be added later:

1. **Auto-save on import** - Skip the "Save" button, add directly
2. **Bulk import** - Import multiple figures at once
3. **Barcode scanning** - Use phone camera to scan UPC
4. **Price history** - Track eBay sold prices over time
5. **Similar figures** - "You might also like..."
6. **Watchlist import** - Import from your eBay watchlist
7. **Community verification** - Pro users can verify figure data
8. **Image selection** - Choose which images to import
9. **Advanced filters** - Filter by year, manufacturer, price range
10. **Saved searches** - Save common searches for quick access

---

## Troubleshooting

### "Search failed" error:
- **Problem**: eBay API key not configured
- **Solution**: Add your App ID to `src/utils/ebayAPI.ts`

### No results found:
- **Problem**: Too specific search
- **Solution**: Try broader terms (e.g., "Storm Shadow" instead of "Storm Shadow v1 1984 MOC")

### Images not loading:
- **Problem**: eBay image URL expired or blocked
- **Solution**: This is normal for some listings. User can add their own images after import.

### Duplicate figures:
- **Problem**: Same figure imported multiple times
- **Solution**: Community database will merge similar figures automatically

### API rate limit:
- **Problem**: Made too many eBay searches (5,000+ per day)
- **Solution**: Community database will still work. Wait 24 hours for eBay API to reset.

---

## Cost & Limits

### eBay API (Free Tier):
- 5,000 calls per day
- No credit card required
- Finding API is always free
- Typical usage: 50-100 calls/day

### Storage:
- Community database: localStorage (free)
- Images: Stored as base64 or URLs (free)
- No backend needed for Phase 1

### Expected Usage:
- 10 users × 5 searches/day = 50 API calls/day
- Well within free tier

---

## Complete File List

**New Files Created:**
```
src/
  utils/
    ebayAPI.ts              ← eBay API integration
    communityDatabase.ts    ← Community database service
    figureSearch.ts         ← Unified search service
  components/
    FigureSearchModal.tsx   ← Search UI modal
```

**Files to Update:**
```
src/
  components/
    FigureForm.tsx          ← Add search button & import handler
  App.tsx                   ← Pass currentUser to FigureForm
```

---

## Next Steps After eBay Key Arrives:

1. ✅ Add eBay App ID to `src/utils/ebayAPI.ts`
2. ✅ Test search with "G.I. Joe Storm Shadow"
3. ✅ Import a figure
4. ✅ Verify data is correct
5. ✅ Check community database is building
6. ✅ Test second search (should be faster)

That's it! The feature is ready to go, just needs your eBay API key.

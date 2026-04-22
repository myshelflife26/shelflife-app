# Custom Fields Firestore Migration - April 21, 2026

## Overview
Major refactoring to migrate custom fields from localStorage to Firestore database for proper multi-user data isolation and cross-device support.

## Issues Addressed

### 1. Custom Fields Data Isolation Problem
**Issue**: Custom fields were being shared between users because they were stored in browser localStorage
- User ackpack34's custom fields appeared for ackpack342
- All users on same browser saw same custom fields
- No cross-device synchronization

**Root Cause**: 
- Custom fields stored in localStorage with keys like `app-settings-user-{userId}`
- localStorage is per-browser, not per-user
- Multiple users logging in on same browser would share localStorage

### 2. White Screen Errors
**Issue**: Application showed blank white screen after attempting Firestore migration
- Error: "Cannot read properties of undefined (reading 'forEach')"
- Occurred in multiple components

**Root Cause**: 
- Components calling `SettingsService.getSettings()` synchronously
- Method was changed to async but components weren't updated
- Trying to access `.customFields` on a Promise returned undefined

### 3. Custom Fields Not Saving
**Issue**: Creating custom fields appeared successful but didn't actually save
- No error shown to user
- Fields disappeared on refresh

**Root Causes**:
1. Using `updateDoc()` which fails if document/fields don't exist yet
2. Firebase rejecting `undefined` values in nested objects
3. Field objects containing `options: undefined` for non-select fields

## Solutions Implemented

### 1. Migrated Custom Fields to Firestore

**File Modified**: `src/utils/settings.ts`

**Changes**:
- Changed `getUserSettings()` from synchronous to async
- Modified to read from Firestore `users/{userId}` collection instead of localStorage
- Changed `saveUserSettings()` from synchronous to async
- Modified to write to Firestore instead of localStorage
- Added automatic migration from localStorage to Firestore on login
- Changed from `updateDoc()` to `setDoc()` with `{ merge: true }` option
- Added recursive `removeUndefined()` helper to clean data before saving

**Key Code Changes**:
```javascript
// Before (localStorage)
private static getUserSettings(userId?: string) {
  const key = this.getUserSettingsKey(userId);
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : DEFAULT_USER_SETTINGS;
}

// After (Firestore)
private static async getUserSettings(userId?: string) {
  const id = userId || FirebaseAuthService.getCurrentUserId();
  const userDoc = await getDoc(doc(db, 'users', id));
  const data = userDoc.data();
  return {
    customFields: data.customFields || [],
    visibleColumns: data.visibleColumns || DEFAULT_USER_SETTINGS.visibleColumns
  };
}
```

### 2. Fixed Async Settings Loading

**Files Modified**:
- `src/App.tsx`
- `src/components/SettingsPage.tsx`
- `src/components/TableView.tsx`
- `src/components/FilterSheet.tsx`
- `src/components/ExportImportMenu.tsx`
- `src/components/FigureForm.tsx`
- `src/components/StatsView.tsx`
- `src/components/MasterFiguresDatabasePage.tsx`

**Pattern Applied**:
```javascript
// Added state for settings
const [settings, setSettings] = useState<AppSettings | null>(null);

// Load settings async in useEffect
useEffect(() => {
  const loadSettings = async () => {
    const loadedSettings = await SettingsService.getSettings();
    setSettings(loadedSettings);
  };
  loadSettings();
}, []);

// Early return if settings not loaded
if (!settings) {
  return <div>Loading...</div>;
}
```

### 3. Fixed getAllUsersCustomFields

**File Modified**: `src/utils/settings.ts`

**Issue**: Method was calling `getUserSettings()` without await inside a `.map()`

**Fix**: Changed to `Promise.all()` with async map:
```javascript
// Before
return users.map((user) => {
  const userSettings = this.getUserSettings(user.id); // Missing await!
  return { ...user, fields: userSettings.customFields };
});

// After
const results = await Promise.all(users.map(async (user) => {
  const userSettings = await this.getUserSettings(user.id);
  return { ...user, fields: userSettings.customFields };
}));
return results;
```

### 4. Fixed Firebase Undefined Values

**File Modified**: `src/utils/settings.ts`

**Issue**: Firebase doesn't accept `undefined` values anywhere in documents

**Fix**: Added recursive cleaning function:
```javascript
const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      if (obj[key] !== undefined) {
        acc[key] = removeUndefined(obj[key]);
      }
      return acc;
    }, {} as any);
  }
  return obj;
};

const dataToSave = {
  customFields: removeUndefined(settings.customFields || []),
  visibleColumns: settings.visibleColumns || DEFAULT_USER_SETTINGS.visibleColumns
};
```

### 5. UI Improvements

**Files Modified**:
- `src/components/SettingsPage.tsx` - Moved System Configuration to General tab
- `src/components/MasterFiguresDatabasePage.tsx` - Added Franchise/IP column

**Changes**:
- System Options (Condition, Category, Manufacturer, etc.) moved from System tab to General tab
- Master Figures Database table now shows Franchise/IP column between Name and Product Line
- Franchise/IP column is sortable

## Testing Performed

1. ✅ Created custom field as ackpack34 - appears only for ackpack34
2. ✅ Created custom field as ackpack342 - appears only for ackpack342
3. ✅ Admin view shows all users' custom fields correctly isolated
4. ✅ Custom fields persist across page refreshes
5. ✅ Custom fields persist across different devices (Firestore sync)
6. ✅ No white screen errors
7. ✅ All settings pages load correctly
8. ✅ System Configuration visible in General tab
9. ✅ Master Database shows Franchise/IP column

## Database Schema

### Firestore Collection: `users`
```
users/{userId}
  - customFields: CustomField[]
      - id: string
      - name: string
      - type: 'text' | 'textarea' | 'number' | 'date' | 'select'
      - required: boolean
      - options?: string[] (only for select type)
  - visibleColumns: Object
      - image: boolean
      - name: boolean
      - manufacturer: boolean
      - etc...
```

## Firestore Rules
Already configured correctly - users can only write to their own document:
```javascript
match /users/{userId} {
  allow read: if true;
  allow write: if isOwner(userId) || isManagement();
}
```

## Migration Strategy

**Automatic Migration on Login**:
- When user logs in, `migrateLocalStorageToFirestore()` is called
- Checks if user has custom fields in localStorage
- If found and Firestore document is empty, migrates to Firestore
- Preserves existing Firestore data if already migrated
- Logs all migration steps for debugging

## Files Changed

### Core Settings Service
- `src/utils/settings.ts` - Major refactor for Firestore

### Authentication
- `src/utils/firebaseAuth.ts` - Added migration call on login

### Components (Async Settings Loading)
- `src/App.tsx`
- `src/components/SettingsPage.tsx`
- `src/components/TableView.tsx`
- `src/components/FilterSheet.tsx`
- `src/components/ExportImportMenu.tsx`
- `src/components/FigureForm.tsx`
- `src/components/StatsView.tsx`
- `src/components/MasterFiguresDatabasePage.tsx`
- `src/components/CustomFieldsManager.tsx`
- `src/components/AdminCustomFieldsManager.tsx`

## Deployment History

All deployments to Vercel production:
1. Initial Firestore migration - White screen errors
2. Fixed async loading in 6 components - Still errors
3. Fixed remaining 2 components (StatsView, MasterFiguresDatabasePage) - Settings page error
4. Fixed getAllUsersCustomFields async calls - Save errors
5. Fixed setDoc undefined values with basic cleaning - Still save errors
6. Fixed recursive undefined cleaning - SUCCESS ✅
7. Moved System Config to General tab - UI improvement
8. Added Franchise/IP column to Master Database - Final enhancement

## Performance Considerations

**Firestore Reads**:
- Settings loaded once per component mount
- Cached in component state
- Only re-fetched on user change or explicit refresh
- Admin view loads all users' settings once

**Firestore Writes**:
- Only on custom field add/edit/delete
- Atomic updates with merge
- No unnecessary re-writes

## Future Enhancements

Potential improvements:
1. Add caching layer for settings (React Context or Redux)
2. Implement optimistic updates for better UX
3. Add custom field usage analytics
4. Allow custom field reordering
5. Support for custom field dependencies
6. Custom field validation rules

## Rollback Plan

If issues arise:
1. Revert to localStorage-based settings
2. Copy backup files from `history/2026-04-21-custom-fields-firestore-migration/backups/`
3. Redeploy previous working version
4. Data is safe in Firestore - no data loss

## Success Metrics

✅ **Zero data loss** - All custom fields preserved
✅ **True multi-user isolation** - Each user's fields are separate
✅ **Cross-device sync** - Settings sync via Firestore
✅ **No white screen errors** - All components load correctly
✅ **Admin visibility** - Management can see all users' custom fields
✅ **Better UX** - System Config back in General tab, Franchise/IP visible

## Notes

- All localStorage keys for custom fields can be cleaned up (optional)
- Migration is one-time per user on first login after deploy
- Existing users will see no interruption - automatic migration
- New users will have settings in Firestore from the start

---

**Completed**: April 21, 2026
**Developer**: Claude Code
**Status**: ✅ Production Ready

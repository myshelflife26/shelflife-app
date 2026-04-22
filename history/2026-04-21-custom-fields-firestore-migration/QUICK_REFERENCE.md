# Quick Reference - Custom Fields Firestore Migration

## What Was Done

Migrated custom fields from browser localStorage to Firebase Firestore database for proper multi-user data isolation and cross-device synchronization.

## Key Changes

### Before
- Custom fields stored in localStorage
- Shared between users on same browser
- No cross-device sync
- Data isolation issues

### After  
- Custom fields stored in Firestore
- Properly isolated per user
- Syncs across devices
- True multi-user support

## How It Works Now

1. **User Login**: Automatic migration from localStorage to Firestore (one-time)
2. **Settings Load**: Components fetch from Firestore asynchronously
3. **Custom Fields**: Stored in `users/{userId}/customFields`
4. **Admin View**: Can see all users' custom fields via `getAllUsersCustomFields()`

## Important Code Patterns

### Loading Settings (All Components)
```javascript
const [settings, setSettings] = useState<AppSettings | null>(null);

useEffect(() => {
  const loadSettings = async () => {
    const loadedSettings = await SettingsService.getSettings();
    setSettings(loadedSettings);
  };
  loadSettings();
}, []);

if (!settings) return <div>Loading...</div>;
```

### Adding Custom Field
```javascript
await SettingsService.addCustomField({
  name: 'Field Name',
  type: 'text',
  required: false
});
```

### Getting Settings
```javascript
const settings = await SettingsService.getSettings();
// settings.customFields
// settings.visibleColumns
```

## Database Location

**Firestore Collection**: `users`  
**Document ID**: Firebase Auth UID  
**Fields**:
- `customFields[]` - Array of custom field objects
- `visibleColumns{}` - Object with column visibility settings

## Admin Features

**View All Users' Custom Fields**:
```javascript
const allFields = await SettingsService.getAllUsersCustomFields();
// Returns: [{ userId, username, displayName, fields[] }]
```

**Delete User's Custom Field**:
```javascript
await SettingsService.deleteCustomFieldForUser(userId, fieldId);
```

## UI Changes

1. **Settings → General Tab**:
   - System Configuration section now here (was in System tab)
   - Shows all dropdown options (Condition, Category, Manufacturer, etc.)
   - Management role only

2. **Settings → Database → Master Figures**:
   - Added Franchise/IP column
   - Sortable by clicking header

## Troubleshooting

### White Screen
**Cause**: Component not loading settings asynchronously  
**Fix**: Apply async pattern with useState/useEffect

### Custom Fields Not Saving
**Cause**: Undefined values in data  
**Fix**: Already handled by `removeUndefined()` helper

### Fields Showing for Wrong User
**Cause**: localStorage sharing (old issue)  
**Fix**: Now using Firestore - properly isolated

## Testing

Run these tests to verify:
1. Create custom field as user A → only shows for user A
2. Create custom field as user B → only shows for user B
3. Login as admin → see both users' fields in "All Users" section
4. Refresh page → custom fields persist
5. Login from different device → fields sync

## Backup Location

All modified files backed up in:
```
history/2026-04-21-custom-fields-firestore-migration/backups/
```

## Deployment

**Live URL**: https://action-figure-tracker-dev.vercel.app  
**Commands**:
```bash
npm run build
vercel --prod
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Can't save custom field | Check Firebase console for undefined values error |
| Field shows for wrong user | Clear localStorage, Firestore is source of truth |
| White screen on settings page | Check component is loading settings async |
| Settings not loading | Check Firestore rules allow read access |

## Contact

For issues or questions about this migration, check:
- `WORK_SUMMARY.md` - Full details
- `FILES_CHANGED.md` - List of all changes
- Firestore console - Check data structure

---

**Last Updated**: April 21, 2026  
**Status**: ✅ Production

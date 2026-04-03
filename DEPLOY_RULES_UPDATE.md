# 🚨 DEPLOY UPDATED FIREBASE RULES - FIXES TRADE MODAL PERMISSIONS

## What's Fixed

The trade proposal modal was failing to load figures from other users due to incorrect Firestore security rules. The updated rules now properly separate:
- **get** permissions (single document reads)
- **list** permissions (queries/collections)

## ⚠️ DEPLOY IMMEDIATELY

Without these updated rules, the trade modal will show "Missing or insufficient permissions" errors.

## Quick Deploy (2 minutes)

### Option 1: Firebase Console (EASIEST)

1. Open: https://console.firebase.google.com/
2. Select your project: **action-figure-tracker**
3. Click **Firestore Database** in left menu
4. Click **Rules** tab at top
5. **Delete everything** in the editor
6. Open `firestore.rules` file in this project
7. **Copy the entire contents** of that file
8. **Paste into Firebase rules editor**
9. Click **Publish** button
10. Wait 30 seconds for rules to propagate

### Option 2: Firebase CLI (If you have it installed)

```bash
# Deploy just the rules
firebase deploy --only firestore:rules
```

## What Changed

### Before
```javascript
allow read: if isSignedIn();
```
This was too simple and didn't properly handle queries.

### After
```javascript
allow get: if isSignedIn() && (
  resource.data.userId == request.auth.uid ||
  resource.data.isPublic == true ||
  resource.data.isListed == true
);
allow list: if isSignedIn() && (
  resource.data.userId == request.auth.uid ||
  resource.data.isPublic == true ||
  resource.data.isListed == true
);
```

Now properly allows:
- Reading your own figures (all of them)
- Reading public or listed figures from other users
- Querying figures with proper security checks

## Testing After Deployment

1. Wait 30-60 seconds after publishing rules
2. Clear browser cache or use incognito mode
3. Open the marketplace
4. Click the trade button on any "For Trade" listing
5. The modal should load without errors showing both your figures and the other user's public figures

## If You Still Get Errors

**"Missing or insufficient permissions"**
- Wait 1-2 minutes - rules can take time to propagate
- Clear browser cache completely
- Make sure you published the rules
- Check you're signed in to the app

**"Failed to get figures"**
- Check the browser console for more details
- Verify the rules were deployed correctly
- Make sure figures have `isPublic` or `isListed` fields set

---

**🚨 DEPLOY THE RULES NOW TO FIX THE TRADE MODAL 🚨**

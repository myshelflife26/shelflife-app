# Firebase Security Rules Deployment Guide

## Why This Is Needed

The app currently has Firebase permissions errors because the security rules don't allow users to:
1. Create and manage trades with other users
2. Send and manage admirer requests
3. Access shared collections between users

## What Changed

### New Collections Structure

Instead of storing trades and admirers in localStorage, we now use proper Firebase collections:

1. **`trades`** - Trade proposals between users
   - Both users can read/update their trades
   - Creator can create trades

2. **`admirer_requests`** - Pending admirer requests
   - Both parties can read/update requests
   - Requestor can create requests

3. **`admirers`** - Approved admirer relationships
   - Both parties can read relationships
   - Either party can delete (stop admiring)

## Deploying the Rules

### Option 1: Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Firestore Database** in the left menu
4. Click the **Rules** tab at the top
5. Copy the entire contents of `firestore.rules` from this project
6. Paste into the rules editor
7. Click **Publish**

### Option 2: Firebase CLI

If you have Firebase CLI installed:

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in this project (if not already done)
firebase init firestore

# Deploy just the rules
firebase deploy --only firestore:rules
```

## Verifying the Rules

After deploying, test:
1. Send a trade request - should work without errors
2. Send an admirer request - should work without errors
3. Check Firebase Console > Firestore Database - you should see new collections

## What the Rules Allow

### Users Collection
- ✅ Anyone can read user profiles
- ✅ Users can only update their own profile
- ❌ Users cannot update others' profiles

### Figures Collection
- ✅ Anyone can read figures
- ✅ Users can create/update/delete their own figures
- ❌ Users cannot modify others' figures

### Trades Collection
- ✅ Users can create trades they initiate
- ✅ Both parties can read/update their trades
- ❌ Users cannot see trades they're not part of

### Admirer Collections
- ✅ Users can send admirer requests
- ✅ Both parties can approve/reject requests
- ✅ Both parties can read their relationships
- ❌ Users cannot see others' admirer relationships

## Security Benefits

1. **Data Privacy** - Users can only access their own data and shared data they're part of
2. **Data Integrity** - Users can't modify data they don't own
3. **Scalability** - Proper collections work across devices and users
4. **Real-time** - Can use Firestore real-time listeners for instant updates

## Troubleshooting

**Error: "Missing or insufficient permissions"**
- Make sure you deployed the rules
- Check that you're signed in
- Verify the collection names match

**Error: "Document already exists"**
- This is normal - just means the data is already there
- The app will handle this gracefully

**Rules not taking effect**
- Wait 1-2 minutes after publishing
- Clear browser cache
- Try in incognito mode

## Rolling Back

If you need to rollback to more permissive rules temporarily:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**WARNING**: Only use this temporarily for testing. These rules allow any authenticated user to access all data.

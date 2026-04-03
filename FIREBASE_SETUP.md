# Firebase Setup Guide for ShelfLife

## Step 1: Create Firebase Project ✅

1. Go to https://console.firebase.google.com/
2. Click **"Add project"**
3. Project name: **ShelfLife** (or your preferred name)
4. **Disable Google Analytics** (not needed)
5. Click **"Create Project"**

---

## Step 2: Register Web App

1. In your Firebase project, click the **Web icon** `</>`
2. App nickname: **ShelfLife Web**
3. **Don't** check "Firebase Hosting"
4. Click **"Register app"**
5. **Copy the firebaseConfig object** (see example below)
6. Click **"Continue to console"**

### Example config (yours will be different):
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAbc123...",
  authDomain: "shelflife-abc123.firebaseapp.com",
  projectId: "shelflife-abc123",
  storageBucket: "shelflife-abc123.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

**PASTE YOUR CONFIG INTO:** `src/config/firebase.ts`

---

## Step 3: Enable Firebase Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **"Get started"**
3. Click **"Sign-in method"** tab
4. Enable **"Email/Password"**
   - Click on "Email/Password"
   - Toggle **"Enable"** to ON
   - Click **"Save"**

---

## Step 4: Enable Cloud Firestore

1. Go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. **Select location:** Choose closest to your users (e.g., `us-central1`)
4. **Security rules:** Start in **"Test mode"** (we'll add proper rules later)
5. Click **"Enable"**

### Set up Security Rules (IMPORTANT!)

Once Firestore is created:
1. Click **"Rules"** tab
2. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection
    match /users/{userId} {
      // Anyone can read user profiles
      allow read: if true;
      // Users can only update their own profile
      allow write: if request.auth != null && request.auth.uid == userId;
      // Admins can write any user
      allow write: if request.auth != null &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'management';
    }

    // Figures collection
    match /figures/{figureId} {
      // Anyone can read public figures
      allow read: if resource.data.isPublic == true;
      // Users can read their own figures
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      // Users can create their own figures
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      // Users can update/delete their own figures
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      // Admins can read/write any figure
      allow read, write: if request.auth != null &&
                            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'management';
    }

    // Reactions collection
    match /reactions/{reactionId} {
      // Anyone can read reactions
      allow read: if true;
      // Users can create/delete their own reactions
      allow create, delete: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Messages collection
    match /messages/{messageId} {
      // Users can read messages sent to them or from them
      allow read: if request.auth != null &&
                     (request.auth.uid == resource.data.toUserId ||
                      request.auth.uid == resource.data.fromUserId);
      // Users can send messages
      allow create: if request.auth != null && request.auth.uid == request.resource.data.fromUserId;
      // Users can update messages they received (mark as read)
      allow update: if request.auth != null && request.auth.uid == resource.data.toUserId;
    }

    // Community database (figures suggestions)
    match /communityFigures/{figureId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
                       (request.auth.uid == resource.data.contributorId ||
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'management');
    }
  }
}
```

3. Click **"Publish"**

---

## Step 5: Enable Cloud Storage (for images)

1. Go to **Build** → **Storage**
2. Click **"Get started"**
3. **Security rules:** Start in **"Test mode"**
4. **Storage location:** Same as Firestore
5. Click **"Done"**

### Set up Storage Rules

1. Click **"Rules"** tab
2. Replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User profile images
    match /profile-images/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Figure images
    match /figure-images/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **"Publish"**

---

## Step 6: Create Indexes for Firestore

Some queries require composite indexes. Create these:

1. Go to **Firestore Database** → **Indexes** tab
2. Click **"Add Index"**

### Index 1: Figures by user and date
- Collection ID: `figures`
- Fields to index:
  1. `userId` (Ascending)
  2. `createdAt` (Descending)
- Query scope: **Collection**
- Click **"Create"**

### Index 2: Public figures by date
- Collection ID: `figures`
- Fields to index:
  1. `isPublic` (Ascending)
  2. `createdAt` (Descending)
- Query scope: **Collection**
- Click **"Create"**

### Index 3: Public figures by user
- Collection ID: `figures`
- Fields to index:
  1. `userId` (Ascending)
  2. `isPublic` (Ascending)
  3. `createdAt` (Descending)
- Query scope: **Collection**
- Click **"Create"**

**Note:** Indexes take a few minutes to build. Firebase will show errors until they're ready.

---

## Step 7: Initialize Test Users

After you've added your Firebase config to `src/config/firebase.ts`:

1. Open your browser console
2. Run this command:
```javascript
// This will be available in the app - just need to call it once
await FirebaseAuthService.initializeDefaultUsers();
```

This creates two test users:
- **ackpack34** / **1234** (Management/Premium)
- **ackpack342** / **1234** (User/Free)

---

## Step 8: Update Your Firebase Config

**Edit:** `src/config/firebase.ts`

Replace the placeholder values with your actual Firebase config from Step 2.

---

## Firebase Console Quick Links

Once set up, bookmark these:
- **Authentication:** See users, sign-ins
- **Firestore Database:** Browse collections, debug data
- **Storage:** Manage uploaded images
- **Usage:** Monitor quota (free tier limits)

---

## Free Tier Limits

Firebase free plan ("Spark Plan") includes:
- ✅ **Firestore:** 1GB storage, 50K reads/day, 20K writes/day, 20K deletes/day
- ✅ **Storage:** 5GB storage, 1GB/day downloads
- ✅ **Auth:** Unlimited users

**Good for:**
- 100-200 active users testing
- Thousands of figures
- Daily usage

If you exceed limits, Firebase pauses until next day (or upgrade to "Blaze" pay-as-you-go).

---

## Next Steps After Setup

1. ✅ Complete all steps above
2. ✅ Add your Firebase config to `src/config/firebase.ts`
3. ✅ Deploy updated app to Vercel
4. ✅ Test login with default users
5. ✅ Add figures and mark as public
6. ✅ Test browsing from different accounts

---

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- You forgot to enable Email/Password authentication (Step 3)

### "Missing or insufficient permissions"
- Security rules not set up correctly (Steps 4 & 5)

### "The query requires an index"
- Create the composite indexes (Step 6)
- Wait 5-10 minutes for indexes to build

### Can't login
- Make sure you ran `initializeDefaultUsers()` (Step 7)
- Check Firebase Console > Authentication to see if users exist

---

## Status: Ready for Testing! 🚀

Once you complete these steps, your app will:
- ✅ Store data in the cloud
- ✅ Work across devices
- ✅ Allow users to see each other's collections
- ✅ Support real-time reactions and messages
- ✅ Scale to multiple users

**Questions?** Check Firebase Console for errors or ping me!

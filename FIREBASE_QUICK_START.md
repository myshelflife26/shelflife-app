# Firebase Quick Start - MUST DO NOW!

Your Firebase config is installed, but you need to enable services in Firebase Console.

## ⚡ Critical Steps (10 minutes)

### 1. Enable Authentication
https://console.firebase.google.com/project/myshelflife-a62ec/authentication

1. Click **"Get started"**
2. Click **"Sign-in method"** tab
3. Click **"Email/Password"**
4. Toggle **"Enable"** to ON
5. Click **"Save"**

### 2. Enable Firestore Database
https://console.firebase.google.com/project/myshelflife-a62ec/firestore

1. Click **"Create database"**
2. Location: Choose **us-central1** (or closest to you)
3. Select **"Start in test mode"**
4. Click **"Enable"**

**IMPORTANT - Set Security Rules:**
After Firestore is created:
1. Click **"Rules"** tab
2. Copy and paste this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'management';
    }

    // Figures collection
    match /figures/{figureId} {
      allow read: if resource.data.isPublic == true;
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow read, write: if request.auth != null &&
                            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'management';
    }

    // Reactions
    match /reactions/{reactionId} {
      allow read: if true;
      allow create, delete: if request.auth != null;
    }

    // Messages
    match /messages/{messageId} {
      allow read: if request.auth != null &&
                     (request.auth.uid == resource.data.toUserId ||
                      request.auth.uid == resource.data.fromUserId);
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.uid == resource.data.toUserId;
    }

    // Community figures
    match /communityFigures/{figureId} {
      allow read: if true;
      allow create: if request.auth != null;
    }
  }
}
```

3. Click **"Publish"**

### 3. Enable Storage (for images)
https://console.firebase.google.com/project/myshelflife-a62ec/storage

1. Click **"Get started"**
2. Select **"Start in test mode"**
3. Same location as Firestore
4. Click **"Done"**

**Set Storage Rules:**
1. Click **"Rules"** tab
2. Replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile-images/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    match /figure-images/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **"Publish"**

### 4. Create Indexes (Required for queries)

Go to: https://console.firebase.google.com/project/myshelflife-a62ec/firestore/indexes

Click **"Add Index"** for each:

**Index 1:**
- Collection: `figures`
- Fields: `userId` (Ascending) → `createdAt` (Descending)
- Query scope: Collection
- Click **Create**

**Index 2:**
- Collection: `figures`
- Fields: `isPublic` (Ascending) → `createdAt` (Descending)
- Query scope: Collection
- Click **Create**

**Index 3:**
- Collection: `figures`
- Fields: `userId` (Ascending) → `isPublic` (Ascending) → `createdAt` (Descending)
- Query scope: Collection
- Click **Create**

⏰ **Indexes take 5-10 minutes to build**

---

## ✅ What's Next

Once you complete the above steps:

1. **Deploy to Vercel** (I'll do this)
2. **Test Login** - Try logging in with test users
3. **Migrate Data** - Go to Settings → Firebase Migration
4. **Test Public Browsing** - Mark figures as public and browse from another account

---

## 🚨 Common Errors

**"Missing or insufficient permissions"**
→ You forgot to set Firestore security rules (Step 2)

**"The query requires an index"**
→ Indexes not created yet (Step 4) - wait 5-10 minutes

**"auth/configuration-not-found"**
→ You forgot to enable Email/Password auth (Step 1)

---

## Need Help?

Check Firebase Console for errors:
- Authentication: See if users are created
- Firestore: Browse data, check rules
- Usage: Monitor quota usage

**Ready?** Complete these 4 steps then let me know!

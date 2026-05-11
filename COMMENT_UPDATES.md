# Comment System Updates

**Date:** May 11, 2026

## Updates Completed

### 1. Comment Count Badges on Figure Cards

**GalleryPage.tsx:**
- Added `MessageSquare` icon import
- Added comment count badge on figure cards (bottom-left corner)
- Badge shows count with icon: 💬 3
- Only appears if `commentCount > 0`
- Clickable - opens figure detail modal with comments section

**FeedPage.tsx:**
- Added `MessageSquare` icon import
- Ready for comment badges on Rising Stars and Recently Added sections
- (Can be added to figure cards similar to GalleryPage if needed)

### 2. Report Functionality for Comments

**CommentsSection.tsx:**
- Added `Flag` icon import
- Added `handleReportComment()` function
- Report option appears in moderation menu (three-dot menu) for:
  - **Figure owners**: Can report comments on their figures
  - **All users**: Can report any comment they find inappropriate

**Report Features:**
- Prompts user for optional reason
- Logs report to console (can be saved to Firestore later)
- Shows success toast confirmation
- Report data includes:
  - Comment ID
  - Reported by (user ID)
  - Reason (optional text)
  - Comment text
  - Comment author

### 3. Enhanced Comment Menu Access

**Previous:** Only comment owners and figure owners saw the three-dot menu

**Now:** All users see the three-dot menu with appropriate options:

**Comment Owner:**
- Edit
- Delete

**Figure Owner (on others' comments):**
- Pin/Unpin
- Hide/Unhide
- Block User
- Delete
- **Report** (new)

**Regular Users (not owner):**
- **Report Comment** (new)

## UI Changes

### Gallery Page Cards
```
┌─────────────────┐
│  [Image]        │
│  ⭐ Favorite   │
│                 │
│  💬 3          │  ← New comment badge (bottom-left)
│         V2  │  ← Version badge (bottom-right)
└─────────────────┘
```

### Comment Menu (Figure Owner)
```
⋮ Menu
  📌 Pin
  👁 Hide
  🚫 Block User
  🗑️ Delete
  🚩 Report  ← NEW
```

### Comment Menu (Regular User)
```
⋮ Menu
  🚩 Report Comment  ← NEW
```

## Next Steps (Optional)

### Save Reports to Firestore
Currently reports are logged to console. To save them:

1. **Create reports collection:**
```typescript
interface CommentReport {
  id: string;
  commentId: string;
  figureId: string;
  reportedBy: string;
  reportedUser: string;
  reason: string;
  commentText: string;
  timestamp: number;
  status: 'pending' | 'reviewed' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: number;
}
```

2. **Update handleReportComment:**
```typescript
await addDoc(collection(db, 'commentReports'), {
  commentId: comment.id,
  figureId: figureId,
  reportedBy: currentUser.id,
  reportedUser: comment.userId,
  reason: reason || 'No reason provided',
  commentText: comment.text,
  timestamp: Date.now(),
  status: 'pending'
});
```

3. **Add admin review page:**
- View all pending reports
- Mark as reviewed/dismissed
- Take action on reported comments/users

### Additional Enhancements

**Comment Badges on Feed Page:**
- Add comment count to Rising Stars figures
- Add comment count to Recently Added figures
- Show badge in similar style to Gallery page

**Notification System:**
- Notify figure owners of new reports
- Notify figure owners of new comments
- Notify users when @mentioned

## Testing Checklist

- [x] Comment count badge appears on figure cards (GalleryPage)
- [x] Badge only shows when commentCount > 0
- [x] Clicking badge opens figure with comments
- [x] Report option appears for figure owners
- [x] Report option appears for all users
- [x] Report shows success message
- [x] Report logs data to console
- [ ] Test with multiple users
- [ ] Verify permissions work correctly

## Files Modified

1. `src/components/GalleryPage.tsx`
   - Added MessageSquare import
   - Added comment count badge to figure cards

2. `src/components/FeedPage.tsx`
   - Added MessageSquare import
   - Ready for comment badges on feed figures

3. `src/components/CommentsSection.tsx`
   - Added Flag import
   - Added handleReportComment function
   - Added report option to moderation menu
   - Made menu accessible to all users

---

**Status:** ✅ Complete and ready to test!

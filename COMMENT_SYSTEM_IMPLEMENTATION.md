# Comment System Implementation Guide

**Implementation Date:** May 11, 2026  
**Status:** ✅ Complete - Ready to Test

---

## What Was Implemented

A complete discussion/comment system for action figures with full owner moderation controls.

### Core Features

✅ **Basic Comments**
- Add, edit, delete your own comments
- Like comments
- Real-time updates (comments appear instantly)
- Character limits (10-1000 characters)
- @mention support
- Timestamps with relative time ("5m ago", "2h ago")

✅ **Owner Moderation Controls**
- Pin important comments to the top
- Hide comments (soft delete - can unhide later)
- Delete any comment on your figures
- Block specific users from commenting
- Enable/disable comments per figure
- Lock discussions (no new comments allowed)
- Pre-moderation mode (approve comments before they appear)

✅ **Security & Spam Prevention**
- Rate limiting (max 5 comments per 10 minutes per user)
- Character limits enforced
- Firestore security rules prevent unauthorized access
- Blocked users cannot comment

---

## Files Created/Modified

### New Files Created

1. **`src/components/CommentForm.tsx`**
   - Form component for adding/editing comments
   - Character counter and validation

2. **`src/components/CommentItem.tsx`**
   - Individual comment display
   - Like button, edit/delete for own comments
   - Owner moderation menu (pin, hide, delete, block user)

3. **`src/components/CommentModerationPanel.tsx`**
   - Settings panel for figure owners
   - Toggle comment settings
   - Manage blocked users
   - View and approve pending comments

### Files Modified

1. **`src/types/index.ts`**
   - Added comment fields to ActionFigure:
     - `commentsEnabled?: boolean`
     - `commentsLocked?: boolean`
     - `requireCommentApproval?: boolean`
     - `blockedFromCommenting?: string[]`
     - `commentCount?: number`

2. **`src/types/comment.ts`**
   - Added moderation fields to Comment:
     - `hidden?: boolean`
     - `hiddenBy?: string`
     - `approved?: boolean`
     - `pinned?: boolean`

3. **`src/utils/firebaseComments.ts`**
   - Added moderation methods:
     - `pinComment()`
     - `hideComment()`
     - `approveComment()`
     - `getPendingComments()`
     - `blockUserFromFigure()`
     - `unblockUserFromFigure()`
     - `updateFigureCommentSettings()`
     - `subscribeToComments()` - Real-time updates

4. **`src/components/CommentsSection.tsx`**
   - Complete rewrite with moderation features
   - Sort options (Newest, Oldest, Most Liked)
   - Status messages (locked, blocked, requires approval)
   - Settings button for figure owners
   - Pinned comments appear first

5. **`src/components/FigureDetailModal.tsx`**
   - Added `onFigureUpdate` prop
   - Passes figure and update handler to CommentsSection

6. **`firestore.rules`**
   - Added comprehensive security rules for comments collection
   - Helper functions for moderation checks
   - Access control based on owner status and settings

---

## How to Use

### As a Figure Owner

1. **View Comment Settings**
   - Open any of your figures
   - Click the gear icon (⚙️) next to "Comments"
   - Comment settings panel opens

2. **Comment Settings Options**
   - ✅ **Allow comments** - Toggle to disable all comments
   - 🔒 **Lock discussion** - Prevent new comments, keep existing visible
   - ✅ **Require approval** - New comments need your approval before appearing

3. **Moderate Individual Comments**
   - Click the three-dot menu (⋮) on any comment
   - **Pin/Unpin** - Highlight important comments at top
   - **Hide/Unhide** - Hide inappropriate comments (soft delete)
   - **Block User** - Prevent specific user from commenting on your figures
   - **Delete** - Permanently remove comment

4. **Manage Blocked Users**
   - Open comment settings panel
   - View list of blocked users
   - Click "Unblock" to restore commenting ability

5. **Pre-Moderation Mode**
   - Enable "Require approval for new comments"
   - New comments appear in "Pending Approval" section
   - Click "Approve" to publish or "Delete" to reject

### As a Commenter

1. **Add a Comment**
   - Type at least 10 characters (max 1000)
   - Use @username to mention other users
   - Click "Post Comment"

2. **Edit Your Comment**
   - Click the three-dot menu (⋮) on your comment
   - Select "Edit"
   - Make changes and click "Save"
   - Comment shows "(edited)" indicator

3. **Delete Your Comment**
   - Click the three-dot menu (⋮)
   - Select "Delete"
   - Confirm deletion

4. **Like Comments**
   - Click the heart icon (♥) on any comment
   - Click again to unlike

5. **Sort Comments**
   - Use dropdown menu: Newest, Oldest, Most Liked
   - Pinned comments always appear first

### Status Indicators

**🔒 Locked**: Discussion is locked - no new comments allowed

**🚫 Blocked**: You've been blocked from commenting on this figure

**ℹ️ Requires Approval**: Your comment won't appear until owner approves it

**📌 Pinned**: Owner has pinned this comment

**👁️ Hidden**: Comment is hidden (only visible to owner)

---

## Testing Checklist

### Basic Functionality
- [ ] Add a comment to your own figure
- [ ] Add a comment to someone else's public figure
- [ ] Edit your own comment
- [ ] Delete your own comment
- [ ] Like/unlike a comment
- [ ] Sort comments by newest/oldest/most liked

### Owner Moderation
- [ ] Pin a comment (appears at top with blue background)
- [ ] Unpin a comment
- [ ] Hide a comment (shows "Hidden" tag)
- [ ] Unhide a comment
- [ ] Delete another user's comment
- [ ] Block a user from commenting
- [ ] Unblock a user

### Settings
- [ ] Disable comments on a figure
- [ ] Re-enable comments
- [ ] Lock discussion (prevent new comments)
- [ ] Unlock discussion
- [ ] Enable pre-moderation mode
- [ ] Approve a pending comment
- [ ] Delete a pending comment

### Real-Time Updates
- [ ] Open same figure in two browsers
- [ ] Add comment in browser A
- [ ] See it appear instantly in browser B

### Rate Limiting
- [ ] Try to post 6 comments rapidly
- [ ] 6th comment should be rejected with error message

---

## Database Structure

### Comments Collection

```typescript
{
  id: string;                    // Auto-generated
  figureId: string;              // Reference to figure
  userId: string;                // Comment author
  userName: string;              // Author username
  userDisplayName: string;       // Author display name
  text: string;                  // Comment content
  timestamp: number;             // When posted
  likes: string[];               // Array of user IDs who liked
  edited: boolean;               // Has been edited
  editedAt?: number;             // When edited
  hidden?: boolean;              // Owner has hidden this
  hiddenBy?: string;             // Owner who hidden it
  approved?: boolean;            // For pre-moderation
  pinned?: boolean;              // Owner has pinned this
}
```

### Figure Fields (Added)

```typescript
{
  commentsEnabled?: boolean;             // Default: true
  commentsLocked?: boolean;              // Default: false
  requireCommentApproval?: boolean;      // Default: false
  blockedFromCommenting?: string[];      // Array of blocked user IDs
  commentCount?: number;                 // Number of approved comments
}
```

---

## Security Rules Summary

**Read Comments:**
- Anyone can read non-hidden, approved comments
- Figure owners can see all comments on their figures (including hidden/pending)

**Create Comments:**
- Must be signed in
- Not blocked from commenting on that figure
- Comments enabled and not locked
- Auto-approved unless pre-moderation is on

**Update Comments:**
- Own comments (for editing, liking)
- Figure owner (for moderation: pin, hide, approve)

**Delete Comments:**
- Own comments
- Figure owner can delete any comment on their figures

---

## Known Limitations

1. **No Nested Replies**
   - Comments are flat, not threaded
   - Can add nested replies in future if needed

2. **No Edit History**
   - Only shows "(edited)" indicator
   - Previous versions not stored

3. **@Mentions Don't Create Notifications**
   - Mentions are styled but don't notify users yet
   - Can add notification system later

4. **Block is Figure-Specific**
   - Blocking applies only to that figure
   - To block from all figures, would need global block list

---

## Next Steps (Optional Enhancements)

### Phase 2 Features (Future)
- [ ] Notifications for new comments
- [ ] Notifications for @mentions
- [ ] Notifications for comment replies
- [ ] Email digest of comment activity

### Phase 3 Features (Future)
- [ ] Nested comment replies (threading)
- [ ] Comment reactions (not just likes)
- [ ] Comment edit history
- [ ] Global user block list
- [ ] Comment reporting system
- [ ] Auto-moderation (spam detection)

---

## Troubleshooting

### Comments Not Appearing

**Check:**
1. Are comments enabled on the figure? (Settings panel)
2. Is the discussion locked?
3. Are you blocked from commenting?
4. Is pre-moderation enabled? (Your comment may be pending approval)
5. Did you meet the 10-character minimum?

### Cannot Moderate Comments

**Check:**
1. Are you the figure owner? (Only owners can moderate)
2. Is the figure in your collection?
3. Try refreshing the page

### Real-Time Updates Not Working

**Check:**
1. Firestore listeners are working (check browser console for errors)
2. Refresh the page to force reload comments
3. Check network connectivity

### Rate Limit Errors

**Solution:**
- Wait 10 minutes before commenting again
- This prevents spam and is working as intended

---

## Deployment Steps

### Before Deploying to Production

1. **Update Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Test Security Rules**
   - Use Firebase Emulator to test rules locally
   - Verify blocked users cannot comment
   - Verify owners can moderate

3. **Initialize Existing Figures**
   - Run migration to add default comment settings to existing figures:
   ```typescript
   commentsEnabled: true,
   commentsLocked: false,
   requireCommentApproval: false,
   blockedFromCommenting: [],
   commentCount: 0
   ```

4. **Deploy Application**
   - Deploy updated code to production
   - Monitor for errors in first 24 hours

5. **Monitor Usage**
   - Watch for spam/abuse
   - Adjust rate limits if needed
   - Gather user feedback

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify Firestore rules are deployed
3. Check that figure has comment fields initialized
4. Ensure user is authenticated

**Implementation Complete!** 🎉

The comment system is now fully functional and ready for testing.

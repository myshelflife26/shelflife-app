# Feature Research: Toy Scanning & Discussion System

**Date:** May 11, 2026  
**App:** ShelfLife Action Figure Tracker

---

## 1. TOY SCANNING & MARKET PRICE LOOKUP

### Overview
Toyzie-style scanning that identifies toys and shows current market prices.

### Current Implementation ✅
- **Barcode scanning** already implemented using `html5-qrcode`
- Supports: UPC-A, UPC-E, EAN-13, EAN-8, CODE_128, CODE_39
- Handles packaged figures with visible barcodes

### What You Need to Add

#### Phase 1: Market Price Integration (HIGHEST VALUE)
**Recommended: eBay API**
- **Why:** Most comprehensive collectibles market data
- **Data Available:**
  - Recent sold prices (last 90 days)
  - Current listings and asking prices
  - Condition-based pricing
  - Price trends over time
- **Cost:** Free tier covers most use cases
- **Implementation:**
  1. Get eBay developer account
  2. Use Finding API to search by UPC or figure name
  3. Parse sold listings for average price
  4. Cache results (update daily/weekly)
  5. Display: Average sold price, price range, recent trend

**Alternative: PriceCharting API**
- Good for cross-category apps (video games, Funko, LEGO)
- Limited traditional action figure coverage (G.I. Joe not primary focus)
- Requires paid subscription (~$50-100/month for API access)
- Better suited as secondary source

#### Phase 2: Enhanced UPC Database
**Add UPCitemdb API**
- Free tier: 100 lookups/day
- Paid: $10/month for 1000/day
- Gets product info for figures not in your database
- Returns: manufacturer, product line, release year

#### Phase 3: Image Recognition (OPTIONAL - Future)
**For loose figures without barcodes**
- Start with Google Vision API ($1.50 per 1000 images)
- Use for proof of concept
- Only add if user demand justifies cost/complexity
- **Note:** Requires large training dataset for accuracy

### Cost Estimate
- Barcode scanning: **Free** (client-side)
- UPCitemdb: **$10/month** (or free tier)
- eBay API: **Free** (with rate limits)
- Firebase storage/caching: **$5-10/month**
- **Total: ~$15-25/month**

### Recommended Implementation Steps

**Week 1-2: eBay Price Integration**
```typescript
// New service: src/utils/marketPricing.ts
class MarketPricingService {
  async getPriceData(upc?: string, searchTerm?: string) {
    // Query eBay Finding API
    // Get sold listings from last 30-90 days
    // Calculate average, min, max
    // Return price data with confidence score
  }
  
  async cachePriceData(figureId: string, priceData: PriceData) {
    // Store in Firestore with timestamp
    // Update daily/weekly
  }
}
```

**Week 3: Enhanced Figure Type**
```typescript
interface ActionFigure {
  // ... existing fields ...
  marketPrice?: {
    averagePrice: number;
    priceRange: { min: number; max: number };
    lastUpdated: number;
    soldCount: number; // Number of sales used for average
    confidence: 'high' | 'medium' | 'low';
    source: 'ebay' | 'pricecharting' | 'manual';
    trendDirection: 'up' | 'down' | 'stable';
  };
  upc?: string; // Add if not already present
}
```

**Week 4: UI Updates**
- Add "Check Market Price" button to figure detail
- Show price card with trend indicator
- Display "Last updated: X days ago"
- Add manual price entry if no market data

---

## 2. DISCUSSION SYSTEM WITH OWNER MODERATION

### Current Implementation ✅
You already have:
- Basic reactions (Fire, Love, Appreciate) on figures
- No comments/discussion system yet

### Recommended Features

#### Phase 1: Basic Comments (Week 1-2)
**Core Functionality:**
- Add comments to individual figures
- Display comments in chronological order
- Real-time updates using Firestore listeners
- User can edit/delete their own comments
- @mention other users

**New Firestore Collection:**
```typescript
// Collection: comments
interface Comment {
  id: string;
  figureId: string;
  userId: string;
  userDisplayName: string;
  text: string;
  timestamp: number;
  edited: boolean;
  editedAt?: number;
  likes: string[]; // userIds who liked
  hidden: boolean; // Owner can hide
  hiddenBy?: string; // Owner userId
  approved: boolean; // For pre-moderation
  pinned: boolean; // Owner can pin important comments
}
```

**Enhanced Figure Type:**
```typescript
interface ActionFigure {
  // ... existing fields ...
  commentsEnabled: boolean; // Owner can disable
  commentsLocked: boolean; // No new comments
  requireCommentApproval: boolean; // Pre-moderation
  blockedFromCommenting: string[]; // Blocked userIds
  commentCount: number; // For display
}
```

#### Phase 2: Owner Moderation Controls (Week 3)
**Essential Features:**
1. **Enable/Disable Comments** - Toggle per figure
2. **Delete Any Comment** - Owner can delete any comment on their figures
3. **Hide Comments** - Soft delete (can unhide later)
4. **Block User** - Prevent specific users from commenting
5. **Pin Comments** - Highlight important/helpful comments at top

**UI Additions:**
- Settings gear icon on owner's figures
- Moderation panel with:
  - Toggle: "Allow comments on this figure"
  - Toggle: "Require approval for new comments"
  - List: "Blocked users" with unblock option
- Per-comment actions (owner only):
  - Pin/Unpin
  - Hide/Unhide  
  - Delete permanently

#### Phase 3: Advanced Features (Week 4)
1. **Pre-Moderation Mode**
   - Owner approves comments before they appear
   - Pending queue for owner to review
   - Auto-approve from trusted users

2. **Notifications**
   - New comment on your figure
   - Reply to your comment
   - Someone @mentioned you
   - In-app + optional email digest

3. **Nested Replies** (Optional - adds complexity)
   - Allow replies to specific comments
   - Thread view
   - Collapse/expand threads

### Firestore Security Rules

```javascript
match /comments/{commentId} {
  // Read: Everyone can see non-hidden comments
  allow read: if !resource.data.hidden;
  
  // Read: Owner can see hidden comments on their figures
  allow read: if resource.data.hidden && 
    get(/databases/$(database)/documents/figures/$(resource.data.figureId)).data.userId == request.auth.uid;
  
  // Create: User not blocked, comments enabled, auto-approve or set to pending
  allow create: if request.auth != null &&
    isSignedIn() &&
    !isBlockedFromCommenting(request.resource.data.figureId, request.auth.uid) &&
    figureCommentsEnabled(request.resource.data.figureId) &&
    !figureCommentsLocked(request.resource.data.figureId);
  
  // Update: Own comment OR figure owner (for moderation)
  allow update: if isSignedIn() &&
    (resource.data.userId == request.auth.uid || // Own comment
     isFigureOwner(resource.data.figureId, request.auth.uid));
  
  // Delete: Own comment OR figure owner
  allow delete: if isSignedIn() &&
    (resource.data.userId == request.auth.uid ||
     isFigureOwner(resource.data.figureId, request.auth.uid));
}

// Helper functions
function isBlockedFromCommenting(figureId, userId) {
  return userId in get(/databases/$(database)/documents/figures/$(figureId)).data.blockedFromCommenting;
}

function figureCommentsEnabled(figureId) {
  return get(/databases/$(database)/documents/figures/$(figureId)).data.commentsEnabled == true;
}

function figureCommentsLocked(figureId) {
  return get(/databases/$(database)/documents/figures/$(figureId)).data.commentsLocked == true;
}

function isFigureOwner(figureId, userId) {
  return get(/databases/$(database)/documents/figures/$(figureId)).data.userId == userId;
}
```

### Spam Prevention
1. **Rate Limiting**
   - Max 5 comments per user per 10 minutes
   - Track via `lastCommentAt` timestamp
   
2. **Content Validation**
   - Minimum 10 characters
   - Maximum 1000 characters
   - Block duplicate text within 1 hour

3. **User Trust Levels** (Future)
   - New users: pre-moderation required
   - Trusted users: auto-approve
   - Build trust via positive interaction history

### UI/UX Recommendations

**Comments Section Layout:**
```
[Figure Details]
[Reactions: Fire, Love, Appreciate]

━━━━━━━━━━━━━━━━━━━━━━
💬 Discussion (23)        [Owner Gear Icon if owner]
━━━━━━━━━━━━━━━━━━━━━━

[Sort: Newest | Oldest | Most Liked]

📌 [Pinned Comment - highlighted]
   User Avatar | Username
   "This is a rare variant from 1985..."
   👍 12 likes | Reply | [Owner: Unpin | Hide | Delete]

[Regular Comment]
   User Avatar | Username | 2 hours ago
   "Great condition! Where did you find it?"
   👍 5 likes | Reply | [Flag]

[Your Comment - editable]
   Your Avatar | You | 5 mins ago (edited)
   "Thanks! Got it at a local toy show."
   [Edit] [Delete]

━━━━━━━━━━━━━━━━━━━━━━
[Text input: "Add a comment..."]
[Post Comment]
```

**Owner Moderation Panel:**
```
⚙️ Comment Settings

✅ Allow comments on this figure
□ Require approval for new comments  
□ Lock discussion (no new comments)

Blocked Users (2)
- user123 [Unblock]
- spammer456 [Unblock]

Recent Activity
- 3 new comments today
- 1 pending approval
```

---

## IMPLEMENTATION PRIORITY

### HIGH PRIORITY (Start Here)
1. eBay market price integration
2. Basic comments system
3. Owner delete/hide comments

### MEDIUM PRIORITY (Next)
4. Comment notifications
5. Pre-moderation mode
6. Block users from commenting

### LOW PRIORITY (Future)
7. Image recognition for loose figures
8. Nested comment replies
9. Advanced moderation tools

---

## TECHNICAL ARCHITECTURE

### New Services Needed

```typescript
// src/utils/marketPricing.ts
export class MarketPricingService {
  static async getEbayPrice(upc: string, figureName: string): Promise<PriceData>
  static async cachePrice(figureId: string, data: PriceData): Promise<void>
  static async getPriceHistory(figureId: string): Promise<PriceHistory[]>
}

// src/utils/comments.ts
export class CommentsService {
  static async addComment(figureId: string, userId: string, text: string): Promise<Comment>
  static async getComments(figureId: string): Promise<Comment[]>
  static async updateComment(commentId: string, text: string): Promise<void>
  static async deleteComment(commentId: string): Promise<void>
  static async hideComment(commentId: string, hideBy: string): Promise<void>
  static async pinComment(commentId: string, figureId: string): Promise<void>
  static async blockUserFromFigure(figureId: string, userId: string): Promise<void>
  static async subscribeToComments(figureId: string, callback: Function): Unsubscribe
}
```

### New Components Needed

```
src/components/
  MarketPriceCard.tsx          // Display price info
  CommentsSection.tsx          // Full comments UI
  CommentItem.tsx              // Single comment
  CommentForm.tsx              // Add/edit comment
  CommentModerationPanel.tsx   // Owner controls
  PinnedCommentBanner.tsx      // Highlighted pinned comment
```

---

## ESTIMATED TIMELINE

**Market Pricing: 2-3 weeks**
- Week 1: eBay API integration, price fetching
- Week 2: Caching, UI display, price history
- Week 3: Testing, refinement

**Comments System: 3-4 weeks**
- Week 1: Basic comments, Firestore setup, security rules
- Week 2: Owner moderation (delete, hide, block)
- Week 3: Pre-moderation, pin comments
- Week 4: Notifications, polish

**Total: 5-7 weeks for both features**

---

## NEXT STEPS

1. **Decide Priority:** Market pricing OR comments first?
   - **Market pricing** = Higher wow factor, easier to implement
   - **Comments** = More engagement, builds community

2. **Get API Credentials:**
   - Create eBay developer account
   - Test eBay Finding API with sample queries

3. **Update Firestore Schema:**
   - Add `marketPrice` field to figures
   - Create `comments` collection
   - Deploy new security rules

4. **Build MVP:**
   - Start with simplest version
   - Get user feedback
   - Iterate based on usage

Would you like me to start implementing either of these features?

# Marketplace Guide

## Overview
The Marketplace is a fantasy football-style trading platform where collectors can buy, sell, and trade action figures with each other.

## Phase 1: Basic Marketplace (CURRENT)

### Features Available Now

#### 1. Browse Marketplace
- View all figures listed by other collectors
- Filter by:
  - For Sale
  - For Trade
  - Both
- Search by name, manufacturer, or product line
- See figure details, condition, and completeness

#### 2. List Your Figures
- Mark any figure in your collection as "For Sale", "For Trade", or both
- Set asking price for sales
- Add marketplace description
- For customs: Include build details (parts used)

#### 3. My Listings Management
- View all your active listings
- Edit or remove listings
- Track listing performance

### How to List a Figure for Sale/Trade

1. **Go to your collection**
2. **Edit the figure** you want to list
3. **Scroll to "Availability" section**
4. **Check boxes:**
   - ✓ For Sale (optionally add price)
   - ✓ For Trade
5. **Make figure public** (required for marketplace visibility)
6. **Save the figure**

The figure will now appear in the Marketplace!

### Marketplace Listing Fields

**Standard Listing:**
- Figure details (name, condition, completeness)
- Photos (uses your figure's main image)
- For Sale / For Trade badges
- Asking price (if for sale)
- Marketplace description (optional)

**Custom Figure Listing:**
- All standard fields, plus:
- Custom build details (parts used from other figures)
- Paint/modification notes

### Example Listings

**Standard Listing:**
```
Snake Eyes V1 - Hasbro Classified
For Sale: $45 | For Trade: Yes
Condition: Loose - 100% Complete
All accessories included
```

**Custom Listing:**
```
Custom Cobra Ninja Viper
For Sale: $120 | For Trade: Yes
Condition: Custom

Custom Build:
• Head: Storm Shadow (Classified)
• Torso: Red Ninja (Classified)
• Arms: Cobra Viper (Classified)
• Legs: Snake Eyes (Classified)
• Custom black/red paint scheme
• Accessories: Katana, Backpack
```

### Browsing Tips

- **Use filters** to narrow down results
- **Check completeness badges** on loose figures
- **Review seller profile** for ratings (coming in Phase 2)
- **Message sellers** directly (coming in Phase 2)

## Phase 2: Trade System (COMING SOON)

### Planned Features

#### Trade Proposal System
- **Fantasy football-style interface**
- Select multiple figures from both sides
- Add cash to balance the trade
- System shows estimated values
- Write message with proposal

#### Counter-Offers
- Recipient can modify the trade
- Add/remove figures from either side
- Adjust cash amounts
- Back-and-forth negotiation

#### Trade Flow
```
1. User A makes offer → Email notification to User B
2. User B receives offer → Can Accept / Decline / Counter
3. If Counter → User A gets notified
4. Once Accepted → Trade is "pending completion"
5. Both users mark "Item Shipped"
6. Both users mark "Item Received"
7. Both users leave feedback/rating
8. Trade marked "Complete"
```

#### Trade Management Dashboard
- **Active Proposals** - Offers you've made
- **Incoming Offers** - Offers you've received
- **Pending Trades** - Accepted but not completed
- **Completed Trades** - History
- **Declined/Cancelled** - Archive

### Trade Proposal Example

```
┌─────────────────────────────────────────┐
│         Propose Trade with @johndoe     │
├─────────────────────────────────────────┤
│ Your Offer              Their Request   │
│ ┌─────────────┐        ┌─────────────┐ │
│ │ Scarlett    │        │ Snake Eyes  │ │
│ │ Value: $40  │   →    │ Value: $45  │ │
│ └─────────────┘        └─────────────┘ │
│ [+ Add Figure]         (Selected)       │
│                                         │
│ Cash Adjustment:                        │
│ You add: $5  [-] [+]                   │
│                                         │
│ Message:                                │
│ [Text box for negotiation message]     │
│                                         │
│ Total Value: $45 ↔ $45 ✅ Balanced    │
│                                         │
│     [Cancel] [Send Proposal]            │
└─────────────────────────────────────────┘
```

## Phase 3: Enhanced Features (FUTURE)

### User Ratings & Feedback
- After each completed trade
- Star rating (1-5)
- Written feedback
- Visible on user profiles
- Report system for bad actors

### Value Calculator
- Use figure's `currentValue` field
- Show if trade is "balanced"
- Warn if heavily imbalanced
- Historical value trends

### Shipping Integration
- Print shipping labels
- Tracking numbers
- Shipping cost calculator
- Insurance options

### Payment Processing
- Stripe/PayPal integration
- Secure escrow service
- Automatic fund transfer on completion
- Buyer/seller protection

### Local Meetup Coordination
- Location-based matching
- Public meetup spots
- Safety tips
- Local trade groups

### Dispute Resolution
- Admin can view trade history
- Users can report issues
- Cancel trade if problems arise
- Mediation service

## Data Structure

### MarketplaceListing
```typescript
{
  figureId: string;
  forSale: boolean;
  forTrade: boolean;
  askingPrice?: number;
  marketplaceDescription?: string;
  customBuildDetails?: string;
  listedAt: number;
}
```

### TradeProposal
```typescript
{
  id: string;
  status: 'pending' | 'countered' | 'accepted' | 'declined' | 'completed' | 'cancelled';

  // Initiator
  fromUserId: string;
  fromUserName: string;
  offeredFigureIds: string[];
  offeredCash: number;

  // Recipient
  toUserId: string;
  toUserName: string;
  requestedFigureIds: string[];
  requestedCash: number;

  // Negotiation
  messages: TradeMessage[];
  counterHistory: TradeCounter[];

  // Shipping tracking
  fromUserShippingStatus: 'not-shipped' | 'shipped' | 'received';
  toUserShippingStatus: 'not-shipped' | 'shipped' | 'received';

  // Timestamps
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}
```

### UserRating
```typescript
{
  id: string;
  tradeId: string;
  fromUserId: string;
  toUserId: string;
  rating: number; // 1-5 stars
  feedback: string;
  timestamp: number;
}
```

## Safety & Best Practices

### For Sellers
1. **Accurate descriptions** - Be honest about condition
2. **Clear photos** - Show all angles, damage
3. **Fair pricing** - Research market values
4. **Prompt shipping** - Ship within agreed timeframe
5. **Good communication** - Respond to messages quickly

### For Buyers
1. **Check seller ratings** - Look for positive feedback
2. **Ask questions** - Get clarification before buying
3. **Use safe payment** - PayPal Goods & Services, etc.
4. **Document everything** - Save messages, photos
5. **Leave feedback** - Help the community

### Red Flags
⚠️ Seller won't provide more photos
⚠️ Price way below market value (too good to be true)
⚠️ Asks for payment outside the platform
⚠️ Poor communication or evasive answers
⚠️ No user ratings or negative feedback
⚠️ Pressure to complete transaction quickly

### Local Trades
- Meet in **public places** (mall, coffee shop, police station parking lot)
- Bring a **friend** if possible
- **Inspect figure** before finalizing trade
- **Don't carry large amounts of cash**
- Trust your instincts

## FAQs

**Q: How do I list a figure?**
A: Edit the figure in your collection, check "For Sale" or "For Trade" in the Availability section, and make it public.

**Q: Can I list custom figures?**
A: Yes! Add custom build details to describe what parts you used.

**Q: Is there a listing fee?**
A: No, listing is completely free.

**Q: How do trades work?**
A: Phase 2 will add a full trade proposal system. For now, message users directly to coordinate.

**Q: Can I list the same figure for both sale and trade?**
A: Yes! Check both boxes in the Availability section.

**Q: What if I change my mind about selling?**
A: Just edit the figure and uncheck the availability boxes. The listing will be removed.

**Q: How do I set a price?**
A: When editing the figure, there's an "Asking Price" field in the marketplace section.

**Q: Can I negotiate prices?**
A: Yes! The asking price is just a starting point. Use the messaging system to negotiate.

**Q: What payment methods are accepted?**
A: That's between you and the buyer. PayPal Goods & Services is recommended for buyer protection.

**Q: How do I delete a listing?**
A: Edit the figure and uncheck the "For Sale" and "For Trade" boxes.

**Q: Can I see who viewed my listing?**
A: Not in Phase 1, but this may be added in a future update.

**Q: How are figures valued?**
A: Each figure has a `currentValue` field you set. The trade system (Phase 2) will use these values to help balance trades.

## Troubleshooting

**Issue**: My listing isn't showing in the marketplace
- **Solution**: Make sure the figure is marked as public AND has "For Sale" or "For Trade" checked

**Issue**: Can't edit a listing
- **Solution**: Go to your collection, find the figure, and edit it there

**Issue**: Figure shows in "My Listings" but not in "Browse"
- **Solution**: This is normal - you don't see your own listings in the browse tab

**Issue**: Can't add a price
- **Solution**: Make sure "For Sale" is checked first, then the price field will appear

**Issue**: Custom build details not showing
- **Solution**: Only shows if figure condition is set to "Custom"

## Technical Implementation

### Files
- **Types**: `src/types/index.ts` - MarketplaceListing, TradeProposal, etc.
- **Service**: `src/utils/marketplaceService.ts` - All marketplace logic
- **Page**: `src/components/MarketplacePage.tsx` - Main marketplace UI
- **Navigation**: `src/App.tsx` - Marketplace button and routing

### Database Collections
- **figures** - Extended with `marketplaceListing` field
- **trades** - Trade proposals and history (Phase 2)
- **userRatings** - Feedback and ratings (Phase 2)

### Firebase Rules
Marketplace listings inherit figure visibility rules:
- Only public figures appear in marketplace
- Users can only edit their own listings
- Anyone can view public marketplace listings

## Coming Soon

**Phase 2 (Trade System)** - ETA: Next sprint
- Trade proposal interface
- Counter-offer system
- Trade messaging
- Shipping status tracking

**Phase 3 (Enhanced Features)** - ETA: Future
- User ratings & feedback
- Payment processing
- Shipping integration
- Local meetup tools

## Feedback

Have suggestions for the marketplace? Contact the development team or submit feedback through the app!

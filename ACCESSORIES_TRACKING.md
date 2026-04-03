# Accessories Tracking System

## Overview
The Accessories Tracking System provides detailed tracking of accessories for action figures in your collection. This feature is designed to handle the wide variation in accessories - from figures with no accessories to deluxe figures with 20+ pieces.

## Key Features

### 1. **Master Database Integration**
- Each figure in the master database can define what accessories **should** come with it
- Accessories include: name, category, required flag, and description
- Categories: Weapon, Gear, Clothing, Vehicle, Display, Other

### 2. **User Collection Tracking**
- Users track which accessories they **actually own**
- Checkbox interface for easy tracking
- Add custom accessories not in the master list
- Notes field for condition/damage details

### 3. **Automatic Completeness Calculation**
- System calculates completeness percentage based on **required** accessories only
- 100% = All required accessories owned
- 75-99% = Mostly complete (yellow badge)
- < 75% = Incomplete (red badge)

### 4. **Visual Indicators**
- Completeness badges on figure cards
- Color-coded by status (green/yellow/red)
- Icons grouped by category

### 5. **Missing Accessories Report**
- View all incomplete figures in one place
- See exactly what's missing for each figure
- Sorted by least complete first
- Perfect for planning what to hunt for

## How It Works

### For Master Database (Admins/Contributors)

When adding a figure to the master database, you can define its accessories:

```typescript
{
  name: "Snake Eyes V1",
  manufacturer: "Hasbro",
  accessories: [
    {
      id: "acc_1",
      name: "Uzi Submachine Gun",
      category: "weapon",
      required: true,
      description: "Black plastic with silver paint"
    },
    {
      id: "acc_2",
      name: "Backpack",
      category: "gear",
      required: true
    },
    {
      id: "acc_3",
      name: "Display Stand",
      category: "display",
      required: false
    }
  ]
}
```

### For Users (Collectors)

When adding a figure to your collection:

1. **Add the figure** (via form, barcode scan, or search)
2. **Select condition**:
   - MIB (Mint in Box) = No accessory tracking needed
   - Loose or Custom = Accessory tracking available
3. **Check off owned accessories**:
   - See list from master database
   - Check boxes for items you own
   - Add custom accessories if needed
4. **View completeness**:
   - See percentage updated in real-time
   - Badge shows complete/incomplete status

### Condition-Based Behavior

**MIB (Mint in Box)**:
- No accessory tracking shown
- Assumed 100% complete (sealed package)
- Info message explains why tracking isn't available

**Loose**:
- Full accessory tracking interface
- Checkbox list from master database
- Can add custom accessories
- Completeness percentage calculated

**Custom**:
- Same as Loose
- Useful for tracking custom figure parts
- Custom accessories expected

## User Interface

### In Figure Form

**Accessories Section** (only for Loose/Custom):
- Grouped by category (Weapon, Gear, etc.)
- Color-coded category icons
- Checkbox for each accessory
- Required badge for essential items
- Real-time completeness percentage
- "Add Custom Accessory" button
- Additional notes field (shown when incomplete)

### On Figure Cards

**Completeness Badge**:
- Shows percentage (e.g., "75%")
- Green check icon = Complete
- Yellow alert icon = Mostly complete
- Red X icon = Incomplete
- Hover tooltip shows exact percentage

### Missing Accessories Report

**Access via Collection View**:
- Button in collection toolbar
- Opens modal with full report
- Summary: "X accessories missing across Y figures"
- List of incomplete figures with:
  - Figure name and version
  - Completeness percentage
  - List of missing required accessories
  - Any notes about condition

## Data Structure

### Accessory (Master Database)
```typescript
{
  id: string;              // Unique identifier
  name: string;            // e.g., "M-16 Rifle"
  category: AccessoryCategory;
  required: boolean;       // True if part of standard package
  description?: string;    // Optional details
  imageUrl?: string;       // Future: accessory images
}
```

### UserAccessory (User's Collection)
```typescript
{
  id: string;              // References Accessory.id
  name: string;            // Duplicate for convenience
  owned: boolean;          // True if user owns it
  condition?: string;      // Future: MIB, Loose, Damaged
  notes?: string;          // User notes
}
```

### ActionFigure (with accessories)
```typescript
{
  // ... existing fields
  accessories?: UserAccessory[];
  completenessPercentage?: number;  // 0-100
  completenessNotes?: string;       // Additional context
  isComplete?: boolean;             // DEPRECATED - use percentage
}
```

## Backward Compatibility

The system maintains backward compatibility with the old tracking method:

**Legacy Fields** (still supported):
- `isComplete`: Boolean checkbox
- `completenessNotes`: Text field

**Migration**:
- Old figures without `accessories` array still work
- Can gradually migrate by editing figures
- Both systems work side-by-side

## Examples

### Example 1: Standard Figure (3-5 Accessories)

**G.I. Joe Classified Snake Eyes:**
- 4 required accessories defined
- User owns 3 of them
- Completeness: 75% (Mostly Complete)
- Missing: Backpack

### Example 2: Vehicle Exclusive

**Cobra HISS Tank with Driver:**
- 1 required accessory: Vehicle
- 5 optional: Small parts
- User owns vehicle
- Completeness: 100% (all required items owned)

### Example 3: Bare Bones Figure

**WWE Basic Figure:**
- 0 accessories defined
- Completeness: 100% (nothing required)
- No tracking interface shown

### Example 4: Deluxe Set

**Marvel Legends Deluxe Apocalypse:**
- 20 accessories (hands, heads, weapons, BAF parts)
- 15 marked as required
- User owns 12
- Completeness: 80% (Mostly Complete)
- Missing: 3 hands

## Future Enhancements

### Phase 2 Features
- **Accessory Images**: Photos of each accessory
- **Condition Tracking**: Track condition of individual accessories
- **Marketplace Integration**: Specify which accessories are for sale/trade
- **Wants List**: Mark which missing accessories you're actively seeking
- **Price Tracking**: Separate values for figure vs accessories

### Phase 3 Features
- **Accessory Database**: Separate browsable database of accessories
- **Cross-Figure Matching**: Find accessories that work across different figures
- **Community Contributions**: Users can suggest accessories for master database
- **Photo Verification**: Upload photos to verify completeness
- **Rarity Indicators**: Show which accessories are hard to find

## Admin Tools

### Bulk Import Accessories

Admins can import accessories via CSV:

```csv
figure_name,accessory_name,category,required,description
Snake Eyes,Uzi,weapon,true,Black with silver paint
Snake Eyes,Backpack,gear,true,Large tactical backpack
Snake Eyes,Display Stand,display,false,Clear plastic stand
```

### Master Database Management

- Add/edit/delete accessories for master figures
- Mark accessories as required/optional
- Add descriptions and categories
- Upload accessory images (future)

## Technical Implementation

### Key Files

**Types**:
- `src/types/index.ts` - Accessory, UserAccessory types

**Services**:
- `src/utils/accessoryService.ts` - All accessory logic
- `src/utils/masterFigures.ts` - Master database integration

**Components**:
- `src/components/AccessoryManager.tsx` - Main tracking interface
- `src/components/CompletenessBadge.tsx` - Visual indicator
- `src/components/MissingAccessoriesReport.tsx` - Report modal
- `src/components/FigureForm.tsx` - Integration point

### Key Functions

**AccessoryService.calculateCompleteness()**
- Calculates percentage based on required accessories
- Returns 0-100

**AccessoryService.getMissingAccessories()**
- Returns list of required accessories not owned
- Used by Missing Accessories Report

**AccessoryService.initializeUserAccessories()**
- Creates initial user accessory list from master
- Sets all to owned=false by default

**AccessoryService.mergeAccessories()**
- Handles master database updates
- Preserves user's owned status when master list changes

## Best Practices

### For Admins (Master Database)

1. **Be thorough**: Include all standard accessories
2. **Mark correctly**: Only mark as required if it came in the original package
3. **Use categories**: Helps users browse and understand
4. **Add descriptions**: Especially for similar items ("small rifle" vs "large rifle")
5. **Don't include variants**: Create separate master figures for different versions

### For Users (Collectors)

1. **Check regularly**: Update when you acquire/sell accessories
2. **Use custom accessories**: For aftermarket or custom pieces
3. **Add notes**: Explain damage, reproduction parts, etc.
4. **Review missing report**: Plan what to hunt for
5. **Be honest**: Accurate tracking helps value calculations

## FAQs

**Q: Why doesn't my MIB figure show accessory tracking?**
A: MIB (Mint in Box) figures are sealed, so they're assumed 100% complete.

**Q: Can I track accessories I bought separately?**
A: Yes! Use "Add Custom Accessory" for aftermarket purchases.

**Q: What if the master database is wrong?**
A: Contact an admin to update it. You can still use custom accessories as a workaround.

**Q: Do optional accessories count toward completeness?**
A: No, only required accessories affect the percentage.

**Q: Can I track accessories for custom figures?**
A: Yes! The system works for Custom condition figures too.

**Q: What about reproduction accessories?**
A: Use the notes field to specify "reproduction" or "repro".

**Q: How do I report missing accessories for multiple figures?**
A: Click the "Missing Accessories Report" button in your collection view.

## Troubleshooting

**Issue**: Accessories not showing up
- **Solution**: Make sure figure condition is set to Loose or Custom

**Issue**: Completeness shows 0% but I have accessories
- **Solution**: Check boxes for owned accessories, save the figure

**Issue**: Master figure has wrong accessories
- **Solution**: Contact admin to update master database

**Issue**: Need to track non-standard accessory
- **Solution**: Use "Add Custom Accessory" button

**Issue**: Lost progress after editing
- **Solution**: Make sure to click "Update Figure" to save changes

## Statistics

Track your collection health with accessory statistics:

- **Total figures with accessories tracked**
- **Average completeness percentage**
- **Number of complete figures (100%)**
- **Number of incomplete figures (<100%)**
- **Total missing accessories**

These stats help you:
- Understand collection quality
- Set goals for completion
- Prioritize hunting/buying
- Track improvement over time

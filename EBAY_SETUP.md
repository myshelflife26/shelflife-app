# eBay Search Feature - Quick Setup Guide

## ⏳ Status: Waiting for eBay API Key

You requested an eBay Developer key. When it arrives (later this week), follow these steps:

---

## Step 1: Add Your eBay API Key

1. Check your email for eBay Developer approval
2. Go to: https://developer.ebay.com/my/keys
3. Copy your **App ID (Client ID)**
4. Open: `src/utils/ebayAPI.ts`
5. Replace line 6:
   ```typescript
   const EBAY_APP_ID = 'YOUR_EBAY_APP_ID_HERE';
   ```
   With:
   ```typescript
   const EBAY_APP_ID = 'YourActualAppID';
   ```
6. Save the file

---

## Step 2: Integrate with FigureForm

Follow the detailed instructions in `INTEGRATION_PATCH.md`:
- Update `src/components/FigureForm.tsx` (add search button)
- Update `src/App.tsx` (pass currentUser prop)

**Time Required**: ~15 minutes

---

## Step 3: Test It!

1. Run the app: `npm run dev`
2. Click "Add Figure"
3. Click "🔍 Search Online Database"
4. Search for: "Storm Shadow 1984"
5. Click "Import This Figure" on any result
6. Form should auto-fill with data!
7. Click "Save Figure"

**If it works**: You're done! 🎉

**If it fails**: Check `history/gijoe-app_ebay_search_feature.md` for troubleshooting

---

## What This Feature Does

- **Searches eBay** for action figures
- **Auto-imports** name, manufacturer, year, images, price
- **Saves time** - No manual typing
- **Builds database** - Creates community database for faster future searches
- **Free** - 5,000 searches/day included

---

## Files Already Created

✅ `src/utils/ebayAPI.ts` - eBay API integration
✅ `src/utils/communityDatabase.ts` - Community database
✅ `src/utils/figureSearch.ts` - Search service
✅ `src/components/FigureSearchModal.tsx` - Search UI

**Ready to integrate when you add the API key!**

---

## Documentation

Full documentation: `history/gijoe-app_ebay_search_feature.md`
Integration guide: `INTEGRATION_PATCH.md`

---

## Questions?

Resume Claude Code session and say:
> "I got my eBay API key, help me integrate the search feature"

Claude will guide you through the integration steps.

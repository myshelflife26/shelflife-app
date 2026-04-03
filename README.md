# ShelfLife

**Where collections live**

A modern collection management app designed for action figure collectors, with a focus on G.I. Joe enthusiasts. Track your figures, connect with other collectors, and discover market values.

## Features

### Collection Management
- **Multi-user support** - Individual accounts with secure authentication
- **Smart organization** - Filter by manufacturer, condition, year, location, and custom fields
- **Multiple views** - Gallery grid, detailed table, stats dashboard, and image gallery
- **Custom fields** - Add unlimited custom properties to track what matters to you
- **Image management** - Multiple images per figure with drag-and-drop reordering

### Social Features
- **Public collections** - Share your favorite figures with the community
- **Browse & discover** - Explore other collectors' public figures
- **Reactions** - Show appreciation with Appreciate, Love, and Fire reactions
- **Jealousy meter** - See which figures are most envied by the community
- **Messaging** - Connect with other collectors directly
- **Admirers** - Track who's interested in your collection

### Smart Data Entry
- **Online search** - Search eBay and community database for figure details
- **Auto-import** - Automatically populate name, year, manufacturer, images, and value
- **Community database** - Growing database of verified figure information
- **CSV import** - Bulk import your existing spreadsheets

### Advanced Features
- **Custom formulas** - Calculate total value, ROI, and custom metrics
- **Export/Import** - Backup your data or migrate between devices
- **Dark mode** - Easy on the eyes for late-night catalog sessions
- **Responsive design** - Works on desktop, tablet, and mobile

## Tech Stack

- **React 19** with TypeScript
- **Vite** for lightning-fast development
- **Tailwind CSS** for modern styling
- **LocalStorage** for client-side data persistence
- **eBay Finding API** for market data

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### First Run

1. Open http://localhost:5173
2. Create your account
3. Start adding figures!

## Subscription Tiers

- **Free** - Up to 100 figures
- **Starter** - $4.99/year - 250 figures, CSV import, online search
- **Pro** - $9.99/year - 500 figures, messaging, export
- **Curator** - $19.99/year - 2,000 figures, advanced features
- **Dealer** - $44.99/year - Unlimited figures, all features

## Project Structure

```
src/
├── components/        # React components
├── types/            # TypeScript type definitions
├── utils/            # Service utilities
│   ├── auth.ts       # Authentication
│   ├── storage.ts    # Data persistence
│   ├── ebayAPI.ts    # eBay integration
│   ├── figureSearch.ts   # Search orchestration
│   └── communityDatabase.ts  # Community data
└── data/             # Sample data
```

## Development

### Key Commands

```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Environment Setup

For eBay search feature, add your App ID to `src/utils/ebayAPI.ts`:

```typescript
const EBAY_APP_ID = 'YourActualAppID';
```

Get your free eBay Developer key at: https://developer.ebay.com/

## Documentation

- **EBAY_SETUP.md** - Quick guide for eBay API integration
- **INTEGRATION_PATCH.md** - Step-by-step integration instructions
- **history/** - Detailed feature documentation and pricing strategy

## Contributing

This is a personal project, but feedback and suggestions are welcome!

## License

Private - All rights reserved

## Support

For questions or issues, please check the documentation in the `history/` folder.

---

**ShelfLife** - Give your collection the life it deserves.

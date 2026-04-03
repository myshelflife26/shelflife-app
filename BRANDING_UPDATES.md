# ShelfLife Branding Updates

This document outlines all the visual branding updates applied to the ShelfLife application.

---

## Brand Identity

**App Name:** ShelfLife
**Tagline:** "Where collections live"
**Social Handle:** @myshelflife
**Primary Color:** Blue (#3b82f6)
**Accent Color:** Purple (#a855f7)
**Brand Icon:** Package/Box with sparkle accent

---

## Components Created

### 1. Logo Component (`src/components/Logo.tsx`)

A reusable logo component featuring:
- **Icon:** Package icon from lucide-react with purple sparkle accent
- **Sizes:** sm, md, lg, xl (responsive sizing)
- **Optional tagline:** "Where collections live"
- **Dark mode support:** Automatic color adaptation

**Usage:**
```tsx
import { Logo } from './components/Logo';

// Simple logo
<Logo size="md" />

// With tagline
<Logo size="lg" showTagline={true} />
```

### 2. BrandedFooter Component (`src/components/BrandedFooter.tsx`)

A consistent footer component showing:
- ShelfLife branding with tagline
- Social media link (@myshelflife)
- Copyright year (auto-updating)
- Responsive layout (stacks on mobile)

**Usage:**
```tsx
import { BrandedFooter } from './components/BrandedFooter';

<BrandedFooter />
```

---

## Pages Updated

### 1. Login Page (`src/components/LoginPage.tsx`)

**Updates:**
- ✅ Large Logo component with tagline at top
- ✅ Improved visual hierarchy
- ✅ Added marketing footer with value proposition
- ✅ "Free to start · 100 figures included" messaging

**Before:** Simple text "ShelfLife"
**After:** Branded logo with icon, tagline, and marketing copy

### 2. Main App Header (`src/App.tsx`)

**Updates:**
- ✅ Logo component in header (clickable to return home)
- ✅ Visual separator between logo and page title
- ✅ Smaller page title for better hierarchy
- ✅ Logo is always visible and clickable

**Before:** Only page title in header
**After:** Logo + separator + page title

### 3. Empty State - No Figures (`src/App.tsx`)

**Updates:**
- ✅ Logo with tagline at center
- ✅ Welcoming message
- ✅ Clear call-to-action buttons

**Before:** Generic "No figures" message
**After:** Branded welcome experience

### 4. App Layout (`src/App.tsx`)

**Updates:**
- ✅ Flex layout for sticky footer
- ✅ BrandedFooter component at bottom
- ✅ Consistent spacing and alignment

---

## Assets Created

### 1. Favicon (`public/favicon.svg`)

**Description:**
- Custom SVG favicon with package icon
- Blue background circle (#3b82f6)
- White package/box illustration
- Purple sparkle accent (#a855f7)
- 32x32px viewBox, scalable SVG

**Replaces:** Default Vite logo

### 2. HTML Meta Tags (`index.html`)

**Updates:**
- ✅ Updated favicon link
- ✅ Added meta description for SEO
- ✅ Added theme-color meta tag (blue)
- ✅ Updated page title

---

## Brand Colors Reference

### Primary Colors
```css
/* Blue - Primary Brand Color */
--primary-blue: #3b82f6;

/* Purple - Accent Color */
--accent-purple: #a855f7;
```

### Neutral Colors (Dark Mode Support)
```css
/* Light mode */
--bg-light: #f9fafb;
--text-light: #1f2937;

/* Dark mode */
--bg-dark: #1f2937;
--text-dark: #f9fafb;
```

### Usage in Tailwind
- Primary: `text-blue-600`, `bg-blue-600`
- Accent: `text-purple-500`, `bg-purple-500`
- Neutral light: `text-gray-900`, `bg-gray-50`
- Neutral dark: `text-white`, `bg-gray-900`

---

## Typography

### Font Stack
System font stack for fast loading and native feel:
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
  sans-serif;
```

### Brand Text Styles

**Logo:**
- Font weight: Bold (700)
- Letter spacing: Tight (`tracking-tight`)
- Never use italic or outline styles

**Tagline:**
- Font weight: Regular (400)
- Color: Gray-500 (light mode), Gray-400 (dark mode)
- Always lowercase: "Where collections live"

**Headlines:**
- Font weight: Semibold (600) or Bold (700)
- Sentence case preferred
- Keep concise

---

## Icon Usage

### Brand Icon (Package)
- **Component:** `<Package />` from lucide-react
- **Primary use:** Logo component
- **Color:** Blue-600 (light), Blue-400 (dark)
- **Accent:** Purple sparkle dot

### Supporting Icons
Use lucide-react icons throughout:
- Home, Search, Mail, Settings (navigation)
- Plus, Edit, Trash (actions)
- Heart, Flame, ThumbsUp (reactions)

**Guidelines:**
- Match icon size to text size
- Use consistent stroke width
- Never mix icon libraries

---

## Visual Guidelines

### Logo Placement
✅ **Do:**
- Use in header (clickable)
- Use on login/welcome screens
- Use in empty states (sparingly)
- Include tagline on marketing pages

❌ **Don't:**
- Don't use logo as inline icon
- Don't stretch or distort
- Don't change colors arbitrarily
- Don't use without adequate spacing

### Tagline Usage
✅ **Do:**
- Use with logo on first-time experiences
- Use in marketing materials
- Use in footer/about sections

❌ **Don't:**
- Don't use alone without logo
- Don't modify the text
- Don't use in tight spaces (omit instead)

### Color Application
✅ **Do:**
- Use blue for primary actions
- Use purple sparingly as accent
- Maintain contrast ratios (WCAG AA)
- Support dark mode everywhere

❌ **Don't:**
- Don't use red/green as brand colors
- Don't use pure black (#000000)
- Don't ignore dark mode
- Don't use more than 2 brand colors

---

## Responsive Behavior

### Logo Component
- **Mobile (< 640px):** Size "sm" or "md"
- **Tablet (640-1024px):** Size "md"
- **Desktop (> 1024px):** Size "md" or "lg"

### Footer
- **Mobile:** Stacks vertically, center-aligned
- **Desktop:** Horizontal layout, space-between

### Header
- **Mobile:** Logo + icon nav (collapse text)
- **Desktop:** Logo + text labels visible

---

## Implementation Checklist

### Completed ✅
- [x] Logo component created
- [x] BrandedFooter component created
- [x] Login page updated with branding
- [x] App header updated with logo
- [x] Empty states branded
- [x] Favicon created and linked
- [x] Meta tags updated
- [x] Footer added to main app
- [x] Flex layout for sticky footer

### Future Enhancements 📋
- [ ] Create proper logo design (hire designer)
- [ ] Add animated loading states with branding
- [ ] Create brand illustration library
- [ ] Design app store icons (iOS/Android)
- [ ] Create social media card images
- [ ] Add branded 404 error page
- [ ] Create branded email templates
- [ ] Design marketing landing page

---

## Testing the Branding

### Visual Check
1. **Start dev server:** `npm run dev`
2. **Check login page:** Logo with tagline visible
3. **Check header:** Logo appears and is clickable
4. **Check empty state:** Logo on empty collection view
5. **Check footer:** Footer at bottom with social link
6. **Check favicon:** Browser tab shows package icon
7. **Test dark mode:** Toggle and verify colors adapt

### Accessibility Check
- [ ] Logo has proper contrast ratios
- [ ] Clickable logo has hover state
- [ ] Footer links are keyboard accessible
- [ ] Alt text provided where needed
- [ ] Focus states visible on interactive elements

### Responsive Check
- [ ] Test on mobile viewport (375px)
- [ ] Test on tablet viewport (768px)
- [ ] Test on desktop viewport (1440px)
- [ ] Verify logo scales appropriately
- [ ] Verify footer stacks on mobile

---

## Brand Asset Locations

```
project-root/
├── public/
│   └── favicon.svg                    # App favicon
├── src/
│   └── components/
│       ├── Logo.tsx                   # Logo component
│       └── BrandedFooter.tsx          # Footer component
└── docs/
    ├── BRANDING_UPDATES.md            # This file
    └── SOCIAL_MEDIA_SETUP.md          # Social branding guide
```

---

## Style Guide Summary

### Quick Reference Card

**Logo:**
- Icon: Package with purple sparkle
- Text: "ShelfLife" (bold, no spaces)
- Tagline: "Where collections live" (gray, lowercase)

**Colors:**
- Primary: Blue #3b82f6
- Accent: Purple #a855f7

**Typography:**
- Font: System font stack
- Logo: Bold (700)
- Body: Regular (400)

**Spacing:**
- Logo: Minimum 16px clearance
- Tagline: 4-8px below logo text
- Footer: 24px padding top/bottom

**Social:**
- Handle: @myshelflife
- Website: shelflife.app

---

## Questions & Support

### Need Help?
- **Component questions:** Check component file comments
- **Design changes:** Review this guide first
- **New components:** Follow established patterns
- **Social branding:** See SOCIAL_MEDIA_SETUP.md

### Making Changes
When modifying branding:
1. Update components first
2. Test in light and dark mode
3. Check responsive breakpoints
4. Update this documentation
5. Commit with clear message

---

**Last Updated:** 2026-03-02
**Version:** 1.0.0
**Status:** ✅ Complete and deployed

---

**ShelfLife** - Where collections live 📦✨

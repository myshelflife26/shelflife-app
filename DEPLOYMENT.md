# ShelfLife Deployment Guide

## 🚀 Automated GitHub Pages Deployment

### Setup (One-time only)
1. Create GitHub repository (if not already done)
2. Push code to GitHub
3. Enable GitHub Pages in repository settings

### Deploy Process
Just push to GitHub - automatic deployment via GitHub Actions!

```bash
git add .
git commit -m "Update app"
git push origin main
```

Your app will be live at: `https://[username].github.io/action-figure-tracker-dev/`

## 🔧 Alternative: Netlify Drop

1. Build the app locally: `npm run build`
2. Go to [netlify.com/drop](https://app.netlify.com/drop)
3. Drag & drop the `dist` folder
4. Get instant deployment URL

## 📱 Alternative: Surge.sh

Simple CLI deployment:
```bash
# Install surge globally
npm install -g surge

# Build and deploy
npm run build
cd dist
surge --domain your-app-name.surge.sh
```

## 🔥 Firebase Hosting (Manual)

If you prefer Firebase:
```bash
firebase login
npm run deploy
```

## 🎯 Recommended: GitHub Pages

- ✅ Free hosting
- ✅ Automatic deployment on push
- ✅ Custom domain support
- ✅ No manual steps after setup
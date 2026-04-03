# Barcode Scanning Feature

## Overview
The barcode scanning feature allows users to quickly add action figures to their collection by scanning the UPC/EAN barcode on the figure's packaging using their device's camera.

## How It Works

### 1. Adding a Figure with Barcode Scanning
1. Click "Add Figure" button
2. In the figure form, you'll see two options in the blue banner:
   - **Scan Barcode** (purple button with scan icon)
   - **Search Database** (blue button with search icon)
3. Click "Scan Barcode"
4. Allow camera permissions when prompted
5. Point your camera at the UPC barcode on the figure's packaging
6. The scanner will automatically detect and scan the barcode

### 2. Auto-Population
Once a barcode is scanned:
- **If found in master database**: The form automatically fills with all figure details (name, manufacturer, product line, year, etc.)
- **If not found**: The UPC is saved to the form, and you can fill in the details manually

### 3. Supported Barcode Formats
- UPC-A (most common in North America)
- UPC-E (compact UPC)
- EAN-13 (European/International)
- EAN-8 (short EAN)
- CODE_128
- CODE_39

## Features

### Camera Requirements
- Requires device with camera (works on phones, tablets, laptops with webcam)
- Works best with good lighting
- Uses back camera on mobile devices by default

### Tips for Best Results
- Hold camera steady
- Ensure good lighting (avoid shadows on barcode)
- Keep barcode flat and parallel to camera
- Position barcode within the scanning area (yellow box)
- If barcode is damaged or unclear, you can enter the UPC manually

### UPC Storage
- UPC codes are stored with each figure in your collection
- Stored in both user figures and master figures database
- Can be used for future quick lookups

## Database Integration

### Master Figures Database
- When you scan a barcode, the system first checks the master figures database
- If a match is found, all figure details are auto-populated
- This saves time and ensures consistency across the community

### Manual UPC Entry
- If you can't scan a barcode (no camera, damaged barcode, etc.)
- You can manually type the UPC in the "UPC/Barcode" field
- The field accepts numeric barcodes typically found on action figure packaging

### Adding Figures to Master Database
- When you add a figure with a UPC code, it can be added to the master database
- This helps other users who scan the same UPC in the future
- Admins can import bulk UPC data from manufacturers or distributors

## Technical Details

### Library Used
- **html5-qrcode**: Modern barcode scanning library with broad browser support
- Supports multiple barcode formats
- Works on desktop and mobile devices
- No external dependencies for scanning

### Privacy & Permissions
- Camera permission is requested only when you click "Scan Barcode"
- No images or video are stored or transmitted
- Only the decoded barcode text is captured

### Browser Support
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 11+)
- Mobile browsers: Full support

## Future Enhancements

### Planned Features
- **Batch scanning**: Scan multiple figures quickly in succession
- **External API lookup**: Query external product databases (UPCitemdb, etc.) for figures not in our database
- **Barcode generation**: Generate printable barcodes for custom figures
- **QR code support**: Create QR codes linking to figure details pages

### Database Expansion
- Partner with manufacturers to get official UPC databases
- Community contribution of UPCs
- Import from distributor catalogs
- Crowdsourced UPC validation

## Troubleshooting

### Camera Not Working
- **Check permissions**: Make sure browser has camera permission
- **Try another browser**: Some browsers have better camera support
- **Check device**: Ensure your device has a working camera
- **Manual entry**: You can always type the UPC manually

### Barcode Not Scanning
- **Improve lighting**: Make sure barcode is well-lit
- **Clean the lens**: Wipe camera lens if blurry
- **Flatten barcode**: Remove wrinkles or bends in packaging
- **Try different angle**: Sometimes angle affects readability
- **Manual entry**: Type the UPC if scanning continues to fail

### Wrong Figure Detected
- If the wrong figure appears after scanning, it means the UPC was previously associated with a different figure
- Report this to an admin to correct the master database
- You can manually override all fields after scanning

## Usage Statistics

The barcode scanning feature helps track:
- How many figures were added via barcode vs. manual entry
- Which UPCs are most commonly scanned
- Missing UPCs in the master database
- Community contribution to UPC database

This data helps improve the feature and prioritize which figures to add to the master database.

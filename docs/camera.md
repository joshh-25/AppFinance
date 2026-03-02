# Mobile PWA & Camera Integration Plan

## Goal
Convert the app into an installable mobile Progressive Web App (PWA) and integrate direct camera capture for seamless receipt scanning and auto-filling via the existing n8n system.

## Implementation Steps

### 1. Create PWA Core Files (`manifest.json` & `sw.js`)
- Build `manifest.json` to define the app as a "Standalone" mobile application (removes URL bar, gives it a home screen icon).
- Build a basic Service Worker (`sw.js`) to cache core assets so the app satisfies mobile installation requirements.
- Generate simple placeholder app icons for the manifest.

### 2. Update Frontend Meta Tags (`index.php`)
- Add `<link rel="manifest" href="manifest.json">`.
- Add iOS specific meta tags (`apple-mobile-web-app-capable`, `apple-touch-icon`).
- Ensure `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">` to prevent zooming when tapping on forms.

### 3. Integrate Camera Capture (`index.php`)
- Update the `index.php` file input: `<input type="file" accept="image/*" capture="environment">`. This HTML5 standard forces mobile phones to open the native rear camera immediately instead of opening the file browser.
- Split the massive Dropzone UI into two distinct Mobile-optimized buttons:
    1. **"Scan Receipt" (Primary Camera Action)**
    2. **"Upload from Gallery files" (Secondary Action)**
- Both will trigger the existing `handleFileUpload` function, which already sends the image to your n8n API for OCR extraction!

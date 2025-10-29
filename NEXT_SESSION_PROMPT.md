# Download Photo Issue - Session Continuation Prompt

## Current Status
We're fixing the download photo functionality after payment in the Passphoto Pro project. The payment flow now works correctly, but the download generates empty/broken images.

## Branch Information
- **Working Branch:** `claude/review-download-fixes-011CUcD7XjqkBSP2g4bMToEn`
- **Repository:** haque51/passphoto-pro
- **Main File:** index.html (all frontend code in single file)

## Critical Issue Identified

### Problem
After successful payment and state restoration, both download options fail:
1. **Single Photo Download:** Produces an empty JPG file (0 bytes or blank image)
2. **4x6 Sheet Download:** Nothing happens when clicked (no download triggered)

### Root Cause (from console logs)
```
Canvas size set to: 0
```

**The canvas container is NOT visible when we try to set canvas dimensions**, resulting in:
- `canvas.width = 0`
- `canvas.height = 0`
- All image calculations in `generateFinalImage()` produce invalid results
- Downloads fail with empty/broken images

### Error Location
Line 2543 in index.html - Uncaught promise error (likely in `generateFinalImage` or `generate4x6Sheet`)

## State Restoration Code (Working)
Located around index.html:2354-2416

The restoration successfully:
- ✅ Detects payment success (`?payment=success&session_id=...`)
- ✅ Loads saved state from localStorage
- ✅ Restores the image
- ✅ Restores transform, filters, country, doc type, baseScale
- ✅ Updates UI sliders
- ✅ Calls `drawCanvas()`
- ✅ Navigates to download screen

**BUT:** Sets canvas size before the download screen is visible (index.html:2373-2376)

## Download Functions to Fix
1. **`generateFinalImage()`** - Line ~2413
   - Depends on canvas.width and canvas.height being > 0
   - Currently receives 0 from canvas, producing empty images

2. **`generate4x6Sheet()`** - Line ~2437
   - Calls generateFinalImage, so also fails
   - May have additional errors preventing download

## What Needs to Be Fixed

### 1. Canvas Size Issue
After navigating to download screen, wait for container to be visible before setting canvas size:

```javascript
// CURRENT (BROKEN):
const container = canvasContainer;
const size = Math.min(container.clientWidth, container.clientHeight);
canvas.width = size; // size = 0 because container not visible yet
canvas.height = size;

// SHOULD BE:
navigateTo('download');
// Wait for screen transition
setTimeout(() => {
    const container = canvasContainer;
    const size = Math.min(container.clientWidth, container.clientHeight);
    if (size === 0) {
        // Retry if still not visible
        setTimeout(() => { /* retry logic */ }, 100);
    }
    canvas.width = size;
    canvas.height = size;
    drawCanvas();
}, 100); // Or use requestAnimationFrame
```

### 2. Add Error Handling to Download Functions
Both `generateFinalImage()` and `generate4x6Sheet()` need:
- Validation that canvas dimensions are > 0
- console.log statements for debugging
- Try-catch blocks to catch errors
- User-friendly error messages

### 3. Debug Why 4x6 Sheet Doesn't Download
Check the promise chain in `generate4x6Sheet()` around line 2437

## Files to Modify
- **index.html** - Lines 2354-2416 (state restoration), 2413+ (generateFinalImage), 2437+ (generate4x6Sheet)

## Testing Steps After Fix
1. Upload a photo and adjust it (zoom, position, filters)
2. Click "Pay" button
3. Complete Stripe test payment
4. Verify redirect to download screen
5. Check console: "Canvas size set to: [non-zero number]"
6. Click "Download Single Photo" - should download valid JPG
7. Click "Download 4x6 Sheet" - should download valid JPG sheet

## Key Console Logs to Add
```javascript
console.log('Canvas size:', canvas.width, 'x', canvas.height);
console.log('originalImageData exists:', !!originalImageData);
console.log('state.baseScale:', state.baseScale);
console.log('Generating final image with requirements:', requirements);
console.log('Final canvas dimensions:', finalCanvas.width, 'x', finalCanvas.height);
```

## Previous Session Summary
- Fixed payment success detection (was checking wrong URL params)
- Fixed state persistence (saving baseScale and all transform values)
- Fixed state restoration (not calling initCanvas which resets offsets)
- Current branch has all payment flow working except download generation

## Command to Start
```bash
cd /home/user/passphoto-pro
git status
git log --oneline -5
# Review index.html around lines 2354-2550
```

## Success Criteria
- [ ] Canvas size is > 0 after payment redirect
- [ ] Single photo downloads with correct image and adjustments
- [ ] 4x6 sheet downloads with correct repeated photos
- [ ] No console errors during download
- [ ] Downloaded images match what user edited

# PWA (Progressive Web App) Setup

This application is configured as a Progressive Web App, allowing users to install it on their devices.

## Icon Requirements

To complete the PWA setup, you need to add the following icon files to the `/public` directory:

### Required Icons

1. **icon-192.png** (192x192 pixels)
   - Used for mobile home screen icons
   - Android Chrome requirements

2. **icon-512.png** (512x512 pixels)
   - Used for splash screens
   - High-resolution displays

### Creating Icons

You can create these icons using:

1. **Online Tools:**
   - [Favicon Generator](https://realfavicongenerator.net/)
   - [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)

2. **Design Software:**
   - Figma, Sketch, Adobe Illustrator
   - Export as PNG at the required sizes

3. **Command Line (ImageMagick):**
   ```bash
   # From a source image
   convert source.png -resize 192x192 icon-192.png
   convert source.png -resize 512x512 icon-512.png
   ```

### Icon Design Tips

- Use a **square canvas** (1:1 aspect ratio)
- Keep important content in the **center 80%** (safe zone)
- Use **high contrast** colors for visibility
- Avoid **text smaller than 48px**
- Test on both light and dark backgrounds

## Features Enabled

✅ **Installable** - Users can add to home screen
✅ **Offline-Ready** - Basic offline support (requires service worker)
✅ **App-like Experience** - Standalone display mode
✅ **Theme Colors** - Matches dark theme (#18181b)
✅ **App Shortcuts** - Quick access to Standings, Rosters, Matchups
✅ **Responsive** - Mobile-optimized viewport settings

## Testing PWA

### Chrome DevTools

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Check **Manifest** section
4. Use **Lighthouse** to audit PWA score

### Installation

1. Visit site in Chrome/Edge
2. Click install icon in address bar
3. Or use browser menu → "Install Veto City"

### Mobile Testing

1. Open in mobile browser (Chrome, Safari)
2. Look for "Add to Home Screen" prompt
3. Test installed app behavior

## Manifest Configuration

The PWA manifest is located at `/public/manifest.json` and includes:

- **Name & Description** - App identity
- **Icons** - Various sizes for different contexts
- **Display Mode** - Standalone (app-like)
- **Colors** - Theme and background colors
- **Shortcuts** - Quick actions to key pages
- **Orientation** - Portrait-primary default

## Future Enhancements

🔲 **Service Worker** - Advanced offline caching
🔲 **Push Notifications** - League updates
🔲 **Background Sync** - Offline data sync
🔲 **Share Target** - Share to app
🔲 **Badges** - Notification badges

## Troubleshooting

**Issue**: Can't install PWA
**Solution**: Ensure HTTPS is enabled (or localhost for dev)

**Issue**: Icons not showing
**Solution**: Check icon files exist in `/public` and paths in manifest.json

**Issue**: Manifest not loading
**Solution**: Verify `/public/manifest.json` is accessible and valid JSON

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Manifest Spec](https://www.w3.org/TR/appmanifest/)
- [PWA Builder](https://www.pwabuilder.com/)

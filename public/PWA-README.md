# PWA (Progressive Web App) Setup

This application is configured as a Progressive Web App — installable on phones and desktops.

## Icons

`icon-192.png`, `icon-512.png`, and `apple-touch-icon.png` (180x180) already exist in this directory, generated from `veto-city-logo.png` on a `#18181b` background (matches the site's dark theme, with padding so it also works as a maskable icon). To regenerate them after changing the logo, use `sharp` (already a transitive dependency via Next.js) in a small one-off script — resize the source onto a square canvas of the target size with `fit: "contain"`, then flatten it over a `#18181b` background.

### Icon Design Tips

- Use a **square canvas** (1:1 aspect ratio)
- Keep important content in the **center 80%** (safe zone)
- Use **high contrast** colors for visibility
- Avoid **text smaller than 48px**
- Test on both light and dark backgrounds

## Features Enabled

✅ **Installable** - Users can add to home screen
✅ **Offline-Ready** - `public/sw.js` caches static assets and falls back to `public/offline.html` for page navigations when there's no connection; live league/API data is always network-only (never cached), so scores are never served stale
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

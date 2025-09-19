# Environment & Build Settings

This project ships with a simple `.env` file to control build-time icon generation and to document a few runtime toggles you can set from the app menu.

Important: Only the icon-related variables are read automatically by scripts right now. Runtime behavior (window alpha, canvas safe mode, pre-draw flush) is controlled in-app via the menu. See below.

## Icon Generation (used by scripts)

- `CLOUDYW_EMOJI`: Emoji for the generated app icon (default: 🌦️).
- `CLOUDYW_ICON_STYLE`: `transparent` (default) or `glass` rounded-backplate.
- `CLOUDYW_ICON_Y_BIAS`: Vertical bias for emoji placement (−0.5 to 0.5). Default is ~0.28 to visually center the weather emoji.
- `CLOUDYW_ICON_OUT`: Output directory for icon artifacts (e.g., `./build`).

Where it's used:
- `npm run icon` calls `scripts/gen-icon.js` (no Electron) which loads `.env` and writes `build/icon.icns` on macOS.
- `npm run build` runs the same icon generation during `prebuild`; if it fails or you're not on macOS, the build continues with Electron's default icon.

Tips:
- If you're on macOS and see iCloud/FS delays, keep `CLOUDYW_ICON_OUT` on a local, non-iCloud path.

## Runtime Toggles (controlled in-app today)

These settings affect transparency stability and rendering, and are available from the app's View -> Developer menu:

- Window background alpha: set to Transparent (0%) or Near Transparent (1%).
- Canvas Safe Mode: disables Accelerated 2D Canvas in guest pages.
- Pre‑Draw Hard Flush: briefly hide the webview before nav/opacity changes.

Notes:
- The `.env` contains `CLOUDYW_WINDOW_ALPHA`, `CLOUDYW_CANVAS_SAFE_MODE`, and `CLOUDYW_PREDRAW_FLUSH` purely as documented defaults; the app doesn't read them at startup yet. Use the menu toggles during runtime.
- The renderer listens to these toggles and adapts behavior (e.g., only hard‑flush when the window alpha is 0%).

## Example

To generate a glass-style icon and place outputs under `./build`:

```
CLOUDYW_EMOJI=🌦️
CLOUDYW_ICON_STYLE=glass
CLOUDYW_ICON_OUT=./build
```

Then run:

```
npm run icon
```

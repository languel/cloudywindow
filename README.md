# cloudywindow

A transparent, borderless browser overlay built with Electron.

## Quickest Start (macOS)

- Download the latest DMG: https://github.com/languel/cloudywindow/releases/latest
- Open the DMG and drag `CloudyWindow.app` to `Applications`.
- First time opening:
  - Easiest: Right‑click the app in `Applications`, choose `Open`, then click `Open` again.
  - If macOS still blocks it, run this once after moving to `Applications`:
    ```sh
    xattr -dr com.apple.quarantine "/Applications/CloudyWindow.app"
    ```
- Launch the app. Hold `Opt+Shift` and drag anywhere to move the window. Use `Cmd+O` to open a file or `Cmd+Shift+O` to open a folder (loads `index.html` if present).

## Features
- Transparent, frameless window for overlaying web content
- Basic browser navigation (back, forward, reload, URL bar)
- Drag-and-drop file and URL support
- Open local HTML files (PDF optional; see Notes)
- Links with `target=_blank` open in a new frameless CloudyWindow
- Per‑site CSS rules with starter recipes
- Built‑in Site CSS editor window + DOM/CSS picker with auto‑zap, undo, and site reset
- Keyboard shortcuts for UI toggling, fullscreen, and more
- Custom frameless resize handles (edges + corners)
- Top drag region even when UI is hidden
- Cross-platform packaging (macOS, Windows, Linux)

## Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/languel/cloudywindow.git
   cd cloudywindow
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Start the app:**
   ```sh
   npm start
   ```

## Configuration

- Environment and build settings: see `docs/ENV.md` for icon generation via `.env` and notes on runtime transparency/safety toggles.
- Scripts:
  - `npm start` - run the app in development.
  - `npm run icon` - generate a macOS icon from an emoji (uses `.env`, macOS only).
  - `npm run build` - build distributables via electron-builder (invokes icon generation on macOS).
  - `npm run clean` - remove ignored files (dangerous; review with `npm run clean:dry`).

## Usage
- Use the navigation bar to enter URLs or open files.
 - Drag and drop files, folders, or URLs anywhere on the window to open them. A "Drop file or URL" overlay appears while dragging.
   - Images/PDFs: open directly; document viewer backdrops are forced transparent.
   - HTML files: self‑contained HTML opens directly. If it references local assets, prefer dropping the entire folder.
   - Folders: resolves to `index.html` (or first `.html`) and runs locally via `file://`.
   - Note: Some pages can swallow drag events; if drop doesn't trigger, use the shortcuts below.
- Links that open in a new tab/window (`target=_blank`) are intercepted and opened as a new CloudyWindow with the same frameless, transparent style. New windows are managed in the Window menu.
- Per‑site CSS:
  - Developer -> Site CSS -> Edit In-App... opens a JSON editor backed by `site-css.json` in your user data folder.
  - Click "Start Picker" then:
    - 📄 `P` page/root transparent • 🫥 `T` transparent • 🙈 `H` hide • ↩️ `Z` undo • ♻️ `R` reset site rules (keeps built‑in starter rules) • ✅ `Enter` done • ✖️ `Esc` cancel
  - Save to persist. Rules apply on the next navigation for that site.
- Frameless resize: drag edges/corners (invisible handles) to resize.
- Drag region: a 24px invisible bar at the top allows window dragging when UI is hidden.
- Keyboard shortcuts:
  - `Cmd+N` - New window
  - `Cmd+Opt+N` - New fullscreen window
  - `Cmd+O` - Open file
  - `Cmd+Shift+O` - Open folder (loads `index.html` if present)
  - `Cmd+Opt+U` - Toggle UI visibility
  - `Cmd+Opt+L` - Go to URL bar
  - `Cmd+Opt+R` - Reload content (webview)
  - `Opt+Shift+R` - Reload app window
  - `Cmd+Opt+B` - Flash border (quick orientation)
  - `Cmd+W` - Close window
  - `Cmd+Plus/Minus/0` - Zoom in/out/reset
  - Background opacity: `Opt+Shift+0/5/1`, step `Opt+Shift+[ / ]`
  - Overall (content) opacity: `Cmd+Opt+0/5/1`, step `Cmd+Opt+[ / ]`
  - Apply transparency CSS (manual): `Cmd+Opt+T`
  - `Opt+Shift+T` - Toggle Always‑on‑Top (this window)
  - `Opt+Shift+M` - Toggle Click‑through mode (this window; global shortcut also available for recovery)
  - `Cmd+Opt+P` - Start DOM/CSS Picker (this window)
  - `Cmd+Shift+S` - Save screenshot (PNG) of the current window
  - `Shift+F9` - Bottom half
  - `Shift+F12` - Bottom‑right 1/16 size (1/4×1/4)
  - `Shift+F11` - Centered overscan (push site UI offscreen)
  - Hold `Opt+Shift` and drag anywhere to move the window (frameless helper)

### Preferences and Startup

- Preferences (macOS app menu):
  - Set Startup File / Set Startup Folder: load this on launch (folders resolve to `index.html` or the first `.html`).
  - Startup Mode: Normal, Fullscreen, Fill Screen, Overscan Center.
  - Target Display: choose which monitor new windows should default to; startup will try to use it (falls back to primary if unavailable).
  - Hide Cursor at Startup: hide the cursor in the first window on launch (per-window toggling available via View → Hide Cursor).
  - Open/Reveal Settings File: opens `settings.json` for inspection.

- Settings file location (per user):
  - macOS: `~/Library/Application Support/cloudywindow/settings.json`
  - Windows: `%APPDATA%/cloudywindow/settings.json`
  - Linux: `~/.config/cloudywindow/settings.json`

- Window menu:
  - Move This Window To → [Display]: quickly centers the current window on a specific monitor.

Transparency safety toggles (in app):
- View → Developer → Transparent or Near Transparent window background
- View → Developer → Canvas Safe Mode (disable Accelerated 2D)
- View → Developer → Pre‑Draw Hard Flush

## Packaging
This repository uses electron-builder as the canonical packager and outputs artifacts into `dist/` by default.

To build distributable packages (macOS example):
```sh
npm run build
```

Notes:
- Local builds will skip code signing unless you have a Developer ID certificate configured. Signed builds are required for public distribution on macOS.

## Demos
The app loads `default-cloud.html` by default. There are additional local demos you can open with the URL input or by dropping files into the window:

- `default-cloud.html` - transparent desktop companion demo (cloud with eyes + doodling)
- `default-minimal.html` - minimal transparent page with emoji

Example to open the minimal default from the URL bar:
```
file://<path-to-repo>/default-minimal.html
```

## Notes
- Webview is used for content: drag & drop and per‑site CSS injection are supported.
- Popup handling: The webview has `allowpopups`, but the app intercepts all `window.open`/`_blank` requests and routes them to managed CloudyWindows (native titlebar is never shown).
- Site CSS store: Rules live at Electron `userData/site-css.json` (per-user, survives updates). Use the in-app editor or open externally.
- PDFs: Opening PDFs directly in a webview depends on platform support; alternatively open in the system browser.
 - Drag & Drop: Some pages may intercept drops; use `Cmd+O` / `Cmd+Shift+O` if needed.
- DnD with folders: On some OS paths aren't exposed from the drag source; CloudyWindow imports the folder to a temp location and opens its `index.html` automatically (no server required).
- Single HTML vs. folder: Dropping a single HTML file without a real path may render via a blob URL (relative assets won't load). Drop the folder or use Open Folder... for sketches with assets.
- Document viewer transparency: Built‑in viewers for file:/blob:/data: URLs have their backdrops cleared to transparent.
- Text files: Dragging `.txt/.md/.log/.nfo/.asc` renders a UTF‑8, monospace viewer so ASCII/Unicode art looks correct. `Cmd+O` supports all filetypes (no filter).
- Transparency stability: For fully transparent windows (0% alpha) GPU canvas pages may show afterimages. The default is 1% alpha; when at 0% the app performs short hard flushes. See `docs/DEVLOG.md` for details.

## Build Icon (macOS)
- To embed a macOS app icon generated from the 🌦️ emoji:
  - `npm run icon` (creates `build/icon.icns`), then `npm run build`.
  - If icon creation fails in CI/headless, the build continues with the default Electron icon.

## Docs
- Product requirements and plan: `docs/PRD.md`
- Dev log of solutions and challenges: `docs/DEVLOG.md` (includes transparency/afterimage experiments)
 - Environment and build settings: `docs/ENV.md`
 - Zap CSS + per-site CSS design/UX: `docs/ZAPCSS.md`

## macOS Gatekeeper
If macOS warns that the app is from an unidentified developer:

- Right‑click `CloudyWindow.app` → `Open` → `Open` (quickest, one‑time per version).
- Or remove the quarantine attribute after moving the app to `Applications`:
  ```sh
  xattr -dr com.apple.quarantine "/Applications/CloudyWindow.app"
  ```
- Advanced: you can ad‑hoc sign locally (optional):
  ```sh
  sudo codesign --force --deep --sign - "/Applications/CloudyWindow.app"
  ```

Notes:
- Do this only for software you trust.
- After updates, you may need to repeat the `xattr` step.

## License
MIT

## Acknowledgements
This is a sloppy vibe-coded personal project that others may find useful. 

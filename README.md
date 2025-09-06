# cloudywindow

A transparent, borderless browser overlay built with Electron.

## Features
- Transparent, frameless window for overlaying web content
- Basic browser navigation (back, forward, reload, URL bar)
- Drag-and-drop file and URL support
- Open local HTML files (PDF optional; see Notes)
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

## Usage
- Use the navigation bar to enter URLs or open files.
- Drag and drop files or URLs anywhere on the window to open them. A “Drop file or URL” overlay appears while dragging.
  - Note: Some cross‑origin pages can swallow drag events. If drop doesn’t trigger, use the shortcuts below.
- Frameless resize: drag edges/corners (invisible handles) to resize.
- Drag region: a 24px invisible bar at the top allows window dragging when UI is hidden.
- Keyboard shortcuts:
  - `Cmd+Opt+O` — Open file
  - `Opt+Shift+O` — Open folder (loads `index.html` if present)
  - `Cmd+Opt+U` — Toggle UI visibility
  - `Cmd+Opt+L` — Go to URL bar
  - `Cmd+Opt+R` — Reload content (webview)
  - `Opt+Shift+R` — Reload app window
  - `Cmd+Opt+B` — Flash border (quick orientation)
  - `Cmd+W` — Close window
  - `Cmd+Plus/Minus/0` — Zoom in/out/reset
  - Background opacity: `Opt+Shift+0/5/1`, step `Opt+Shift+[ / ]`
  - Overall (content) opacity: `Cmd+Opt+0/5/1`, step `Cmd+Opt+[ / ]`
  - Apply transparency CSS (manual): `Cmd+Opt+T`
  - `Opt+Shift+T` — Toggle Always‑on‑Top
  - `Opt+Shift+M` — Toggle Click‑through mode (global; recovery)
  - `Shift+F9` — Bottom half
  - `Shift+F12` — Bottom‑right 1/16 size (1/4×1/4)
  - `Shift+F11` — Centered overscan (push site UI offscreen)

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
- PDFs: Opening PDFs directly in a webview depends on platform support; alternatively open in the system browser.
- Drag & Drop: Some pages may intercept drops; use `Cmd+Opt+O` / `Opt+Shift+O` if needed.

## Build Icon (macOS)
- To embed a macOS app icon generated from the 🌦️ emoji:
  - `npm run icon` (creates `build/icon.icns`), then `npm run build`.
  - If icon creation fails in CI/headless, the build continues with the default Electron icon.

## Docs
- Product requirements and plan: `docs/PRD.md`
- Dev log of solutions and challenges: `docs/DEVLOG.md` (includes transparency/afterimage experiments)

## macOS Unsigned Builds (Gatekeeper)
If you distribute an unsigned build to students, macOS may block it. Options:

- Easiest: Right-click the app, choose `Open`, then confirm. This whitelists once.
- Remove quarantine attribute (after moving the app to `/Applications`):
  ```sh
  xattr -dr com.apple.quarantine "/Applications/CloudyWindow.app"
  ```
- If Gatekeeper still intercepts, ad‑hoc sign locally:
  ```sh
  sudo codesign --force --deep --sign - "/Applications/CloudyWindow.app"
  ```

Notes:
- Only run these commands for software you trust.
- After updates, you may need to repeat the `xattr` step.

## License
MIT

## Acknowledgements
This is a sloppy vibe-coded personal project that others may find useful. 

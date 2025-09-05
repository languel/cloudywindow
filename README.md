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
  - `Cmd+O` — Open file
  - `Cmd+Shift+O` — Open folder (loads `index.html` if present)
  - `Cmd+U` — Toggle UI visibility
  - `Cmd+L` — Toggle URL bar
  - `Cmd+R` — Reload content (iframe only)
  - `Cmd+Shift+R` — Reload app window
  - `Cmd+B` — Flash border (quick orientation when fully transparent)
  - `Cmd+W` — Close window
  - `Cmd+Plus/Minus/0` — Zoom in/out/reset
  - `Cmd+[ / Cmd+]` — Decrease/Increase background opacity
  - `Alt+T` — Toggle Always‑on‑Top
  - `Alt+M` — Toggle Click‑through mode (now shown in the menu)
  - `Shift+F9` — Bottom‑right position at 1/16 screen (1/4 width × 1/4 height)

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
- PDFs: Opening PDFs directly is not guaranteed inside an iframe and may be blocked by platform/engine support. HTML is fully supported. For robust PDF viewing, consider opening in the system browser or switching the app to use Electron `<webview>`.
 - Drag & Drop: Dropping over some web pages can be intercepted by the page itself. Use `Cmd+O` / `Cmd+Shift+O` if a drop is ignored. Switching to `<webview>` (planned) will make drops reliable everywhere and allow per‑site CSS injection.

## Build Icon (macOS)
- To embed a macOS app icon generated from the 🌦️ emoji:
  - `npm run icon` (creates `build/icon.icns`), then `npm run build`.
  - If icon creation fails in CI/headless, the build continues with the default Electron icon.

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

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
- Drag and drop files or URLs onto the window to open them.
- Frameless resize: drag edges/corners (invisible handles) to resize.
- Drag region: a 24px invisible bar at the top allows window dragging when UI is hidden.
- Use keyboard shortcuts:
  - `Cmd+O` — Open file
  - `Cmd+U` — Toggle UI visibility
  - `Cmd+L` — Toggle URL bar
  - `F11` — Toggle fullscreen
  - `Cmd+R` — Refresh content
  - `Cmd+W` — Close window
  - `Cmd+Plus/Minus/0` — Zoom in/out/reset
  - `Cmd+[ / Cmd+]` — Decrease/Increase background opacity
  - `Alt+T` — Toggle Always-on-Top
  - `Alt+M` — Toggle Click-through mode

## Packaging
This repository uses electron-builder as the canonical packager and outputs artifacts into `dist/` by default.

To build distributable packages (macOS example):
```sh
npm run build
```

Notes:
- Local builds will skip code signing unless you have a Developer ID certificate configured. Signed builds are required for public distribution on macOS.

## Demos
The app loads `default.html` by default. There are additional local demos you can open with the URL input or by dropping files into the window:

- `default.html` - welcome page with shortcuts
- `companion.html` - transparent desktop companion demo (cloud with googly eyes and doodling). Open with `file://` URL or drop it into the window.

Example to open the companion demo from the URL bar:
```
file://<path-to-repo>/companion.html

## Notes
- PDFs: Opening PDFs directly is not guaranteed inside an iframe and may be blocked by platform/engine support. HTML is fully supported. For robust PDF viewing, consider opening in the system browser or switching the app to use Electron `<webview>`.
```

## License
MIT

## Acknowledgements
This is a sloppy vibe-coded personal project that others may find useful. 

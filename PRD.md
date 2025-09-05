# Product Requirements Document (PRD) — CloudyWindow (branch: v3)

This PRD consolidates implementation plans and current status. Each requirement includes a status marker: [+] done, [~] in progress, [ ] pending. Evidence lines point to the files/lines that implement or reference the feature.

Note: legacy implementation files (`implementation-plan.md`, `implementation-v0.2.md`) were removed and their content is consolidated here.

---

## Quick status checklist

- [ + ] Transparent, frameless window
- [ + ] Load and display web content (URL and local file)
- [ + ] Basic browser navigation (back, forward, reload)
- [ + ] URL input to enter addresses
- [ + ] File opening (dialog + drag-and-drop)
- [ ~ ] Window resizing (frameless resize handles)
- [ + ] Toggle UI visibility
- [ + ] Maintain transparency while loading content
- [ + ] Keyboard shortcuts (many registered)
- [ ~ ] Multi-window management (partial)
- [ + ] Packaging support (artifacts exist in `out/` and `dist/`)

---

## Requirements and evidence

1) Display a transparent browser window
- Status: [+]
- Evidence: `main.js` BrowserWindow created with `transparent: true, frame: false` (lines ~3-12).

2) Load and display web content
- Status: [+]
- Evidence: `index.html` contains `<iframe id="content-frame" src="default.html">` and `renderer.js` sets `iframe.src` in `navigateToUrl()`.

3) Support basic browser navigation (back/forward/reload)
- Status: [+]
- Evidence: `renderer.js` binds `backButton`, `forwardButton`, and `reloadButton` to `iframe.contentWindow.history.back()`, `.forward()`, and `.location.reload()`.

4) Provide a URL input
- Status: [+]
- Evidence: `index.html` includes `#url-input` and `renderer.js` uses it in `navigateToUrl` + Enter key handling.

5) Support file opening (dialog + drag-and-drop)
- Status: [+]
- Evidence: `renderer.js` handles `drop` events (`handleFileDrop`) and calls `window.electronAPI.openFile()`; `preload.js` exposes `openFile` and `onFileSelected`; `main.js` handles `open-file` and replies with `selected-file`.

6) Allow window resizing (frameless)
- Status: [~]
- Evidence: `styles.css` has no resize handles implemented; `renderer.js` contains `setupResizeHandlers()` with TODO. `main.js` exposes an IPC `set-window-size` handler, so the plumbing exists but UI resize handles are not implemented.

7) Toggle UI visibility
- Status: [+]
- Evidence: `#ui-container` initially hidden in `styles.css`; `toggleUI()` in `renderer.js` toggles `visibility` and background color. `main.js` registers menu and shortcut to send `toggle-ui-shortcut`.

8) Maintain transparency
- Status: [+]
- Evidence: `main.js` window is transparent; `styles.css` sets `body` background to transparent; `renderer.js` uses `document.body.style.backgroundColor` when adjusting opacity.

9) Provide keyboard shortcuts
- Status: [+]
- Evidence: `main.js` registers many `globalShortcut.register` handlers for Cmd/Ctrl+O, +U, +L, F-keys, etc. `preload.js` and `renderer.js` wire the IPC handlers.

10) Multi-window management
- Status: [~]
- Evidence: `main.js` tracks multiple windows in `windows` Set, implements `createWindow()`, `new-window` IPC, dynamic Window menu population; but renderer only provides `newWindow` and `closeWindow` IPC. The multi-window UX is partial (menu/shortcuts exist, but window-specific state handling may need polish).

11) Packaging and build outputs
- Status: [+]
- Evidence: `out/` and `dist/` artifacts exist in the repo root (observed on disk). `package.json` references Electron Forge makers; `package-lock.json` includes electron-builder artifacts — repo contains outputs from both tools.

---

## README features mapping (mark implemented features referenced in README)

From `README.md`:

- Transparent, frameless window — [+] implemented (`main.js`)
- Basic browser navigation — [+] (`renderer.js`)
- Drag-and-drop file and URL support — [+] (`renderer.js` `handleFileDrop`)
- Open local HTML/PDF files — [+] HTML open supported via dialog + drag; PDF handling is not explicitly filtered but the `open-file` dialog in `main.js` filters HTML; PDF filter was present in earlier versions but current `main.js` only filters HTML. Mark as [~] for PDF.
- Keyboard shortcuts for UI toggling, fullscreen, and more — [+] (`main.js` global shortcuts)
- Custom window resizing handles — [~] (UI handlers missing, `setupResizeHandlers()` TODO)
- Cross-platform packaging — [+] artifacts exist; however two build systems were used — consider consolidation.

---

## Gaps and recommended next steps

- Implement frameless resize handles UI in `renderer.js` and styles in `styles.css` and wire to `ipcRenderer.send('set-window-size', ...)` — Status: medium priority.
- Decide on a single packager (Electron Forge vs electron-builder). Remove the other to avoid confusion and update `README` with canonical build steps — Status: high priority.
- Add an explicit PDF open handling path if PDF support is desired (main dialog filters, and `webContents` handling) — Status: low/optional.
- Add tests or a quick smoke script to launch a headless run of the app for CI — Status: optional.

---

## Final notes / quick evidence pointers

- Entry points: `main.js`, `preload.js`, `renderer.js`, `index.html`, `styles.css`, `default.html`.
- Build artifacts observed: `out/` (Electron Forge style) and `dist/` (electron-builder style). Consider cleaning and standardizing.

---

If this matches your expectations I can:
- Commit this `PRD.md` to `v3` (already created locally) and push the branch, or
- Implement the resize handles now and mark that item as done, or
- Consolidate packaging to electron-builder or Electron Forge per your preference.

Which next step would you like?

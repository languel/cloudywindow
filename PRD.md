# Product Requirements Document (PRD) — CloudyWindow (branch: v3)

This PRD consolidates implementation plans and current status. Each requirement includes a status marker: [+] done, [~] in progress, [ ] pending. Evidence lines point to the files/lines that implement or reference the feature.


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
- [ + ] Packaging support (artifacts exist in `dist/`)

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

---

## Webview Migration — Plan (target: v0.5)

Goal: Replace the current `<iframe>` with Electron `<webview>` for reliable drag‑and‑drop, per‑site CSS injection (e.g., tldraw transparency), better zoom/control, and future “zap” CSS removal.

Why webview
- Captures input/drag events consistently across origins (unlike iframe), so file/URL drops over content work.
- Allows `insertCSS` / `executeJavaScript` for site‑specific tweaks (e.g., transparent backgrounds for tldraw, Strudel UI tweaks).
- Enables per‑site isolation via `partition` and `preload` for script bridging if needed.

Scope
- Replace the iframe in `index.html` with `<webview id="content-webview">`.
- Main: set `webPreferences.webviewTag = true` on the BrowserWindow (keep `contextIsolation: true` and `nodeIntegration: false`).
- Renderer: update navigation, back/forward/reload bindings to target the webview.
- DnD: keep the full‑window overlay and, in addition, inject a lightweight dragover/drop handler into pages via `webview.insertCSS()` and optional `executeJavaScript()` as fallback.
- CSS injection library: add a small registry of per‑site “recipes” (tldraw, Strudel, Excalidraw) for removing backgrounds/transparency, togglable at runtime.
- Security: continue disallowing Node in webview; use `allowpopups` only if needed; prefer `sandbox` attribute where possible; keep `contextIsolation` on the host.

Deliverables
1) `<webview>` integration with parity for: URL bar navigation, back/forward/reload, zoom, Cmd+G “Go”.
2) Reliable drag‑and‑drop across content (file, URL, folder->index.html).
3) Inject CSS for tldraw to remove background by default (can be toggled); document how to add more recipes.
4) Tests/manual checks: open local HTML, images, PDFs; drop over content; verify shortcuts (Alt+M, Cmd+R content reload, Cmd+Shift+R app reload) still behave.

Out‑of‑scope (separate PRs)
- “Zap” feature: interactive CSS removal UI and rule persistence.
- Multi‑profile partitions and full per‑site settings UI.

Risks & mitigations
- Some sites may block navigation in a guest; provide app‑level reload and back/forward fallbacks.
- CSS breakage: keep recipes minimal and scoped; expose a toggle to disable per‑site CSS quickly.
- Permissions (camera/mic): defer; prompt user or document flags if needed.

Implementation steps (high level)
1) Enable `webviewTag` in main BrowserWindow; add `<webview>` in `index.html`.
2) Port renderer bindings (navigate/back/forward/reload/zoom) from iframe to webview APIs.
3) Move DnD overlay above webview; add injected drag handlers as needed.
4) Add `injectSiteCSS(url)` that applies known recipes (`insertCSS`) after `dom-ready`.
5) Add a quick toggle to disable injection for the current site.
6) Update README with webview notes and security guidance.

Acceptance criteria
- All navigation + reload content actions operate on the webview, not the window.
- Dropping files/URLs/folders anywhere loads the target in the webview.
- tldraw background is transparent by default via injection (can be turned off).
- No regression to existing shortcuts/menus.

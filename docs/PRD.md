# Product Requirements Document (PRD) - CloudyWindow (feature/webview)

This PRD is the single source of truth. See `docs/DEVLOG.md` for an ongoing log of experiments and fixes.

---

## Quick Status

- [ + ] Transparent, frameless window (macOS/Windows/Linux)
- [ + ] Load and display web content (URL/local)
- [ + ] Basic navigation (back/forward/reload via webview)
- [ + ] URL input and keyboard "Go"
- [ + ] File/folder open (folder → index.html)
- [ + ] Drag & drop (files/URLs/folders) over the window
- [ + ] Toggle UI and URL bar, Always-on-Top, Click-through
- [ + ] Preferences/Startup: startup file/folder, startup mode, target display, hide-cursor
- [ + ] Screenshot capture
- [ + ] Background opacity presets and Overall (content) opacity presets
- [ + ] Window background alpha control (0% / 1%)
- [ + ] Site CSS injection (tldraw, Strudel transparency)
- [ ~ ] Resize handles (frameless) - basic; polish later
- [ + ] Multi-window management (menu + _blank popups)
- [ + ] Per-site CSS (Store + Injection)
- [ + ] Site CSS Editor window (JSON) + DOM/CSS Picker (auto-zap + undo)
- [ + ] Packaging (electron-builder)

---

## Architecture

- BrowserWindow: `transparent:true`, `backgroundColor: #00000001` (1% alpha default), `hasShadow:false`
- Web content: Electron `<webview id="content-frame" allowpopups>`
- Guest preload: `webview-preload.js` forwards dragenter/over/leave/drop via `sendToHost`
- Renderer: `renderer.js` handles navigation, DnD resolution, opacity controls, CSS injection, and optional hard flush
- Main: menus, window management, and background alpha toggles
  - Popup routing: `app.on('web-contents-created')` -> `contents.setWindowOpenHandler` intercepts `window.open` / `target=_blank` from webviews and creates a new frameless CloudyWindow (then sends `navigate-to`)
  - Site CSS store in `userData/site-css.json` managed by `main/siteCssStore.js`; IPC for get/add/list/reload/read/write.
  - Site CSS editor window: `sitecss-editor.html` + `sitecss-editor.js` (JSON edit, picker control)
  - Picker pipeline: main (start/stop) -> renderer (forward) -> webview-preload (HUD, selector, auto-zap) -> renderer (result) -> main (forward) -> editor (insert rule)

---

## Shortcuts (current)

- New window: `Cmd+N`
- New fullscreen window: `Cmd+Opt+N`
- Open file: `Cmd+O`
- Open folder (index.html): `Cmd+Shift+O`
- Reload content: `Cmd+Opt+R` (webview)
- Reload app: `Opt+Shift+R`
- Toggle UI: `Cmd+Opt+U`
- Go to URL bar: `Cmd+Opt+L`
- Always-on-Top: `Opt+Shift+T`
- Click-through: `Opt+Shift+M`
- Hide cursor (this window): `Cmd+Shift+H`
- Save screenshot: `Cmd+Shift+S`
- Flash border: `Cmd+Opt+B`
- Background opacity: `Opt+Shift+0/5/1`, step `Opt+Shift+[ / ]`
- Overall (content) opacity: `Cmd+Opt+0/5/1`, step `Cmd+Opt+[ / ]`
- Hard flush content: `Cmd+Opt+F`
- Apply transparency CSS (manual): `Cmd+Opt+T`
- Window background alpha: View menu -> Transparent (0%) or Near Transparent (1%)
- Start DOM/CSS Picker: `Cmd+Opt+P` (This Window)

---

## Webview Migration - Plan and Rationale

Goal: Replace the old `<iframe>` with `<webview>` for reliable drag-and-drop, per-site CSS injection (tldraw/Strudel), better control, and future "Zap CSS".

Why webview
- Captures input/drag events across origins; file/URL drops work over content.
- Allows `insertCSS` / `executeJavaScript` for site‑specific tweaks.
- Per‑site isolation via `partition` + guest preload (future option).

Scope
- Enable `webviewTag` on BrowserWindow; replace iframe with `<webview>`.
- Add `webview-preload.js` to forward drag events to host.
- Port navigation/reload/URL bar to webview APIs.
- Add CSS recipes for tldraw and Strudel transparency.
- Intercept popups and open as managed CloudyWindows (no native chrome).

Acceptance criteria
- All navigation operates on webview; drops open content; CSS recipes make common tools transparent; links with `target=_blank` open in new CloudyWindows without native titlebar; new windows appear in Window menu; no major regressions.

---

## Known Issues / Mitigations (macOS compositor)

- Afterimages with fully transparent windows and GPU canvas
  - Default to 1% window background alpha (no visible tint, stable compositor)
  - Conditional, debounced hard flush only when alpha is 0%
  - Optional: Canvas Safe Mode (disable Accelerated2dCanvas)
  - Optional: Pre‑Draw Hard Flush toggle (hide before nav/opacity; show after dom‑ready)

---

## Roadmap (near‑term)

- Per‑site CSS registry + enable/disable per site in UI (toggle in menu)
- Polish resize handles and multi‑window UX
- Zap CSS picker improvements: multi‑select queue, preview panel, dim option; CodeMirror editor

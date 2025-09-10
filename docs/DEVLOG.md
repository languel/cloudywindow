# Dev Log — CloudyWindow (feature/webview)

This document tracks notable issues, decisions, and fixes while developing the webview‑based overlay.

## 2025‑09 — Webview migration + transparency fixes

- Drag & drop over content
  - Problem: iframe swallowed drag events cross‑origin; overlay didn’t trigger.
  - Solution: switch to `<webview>` with a guest preload (`webview-preload.js`) that forwards dragenter/over/leave/drop via `sendToHost`. Host listens and resolves files/folders (folder → index.html).

- Background transparency for tools
  - tldraw: inject CSS to override theme variables and clear containers/canvas (transparent background).
  - Strudel: inject CSS to clear common wrappers and remove `blackscreen/whitescreen/greenscreen` classes.

- Afterimage / ghosting during opacity changes & pans
  - Observed: Fully transparent BrowserWindows plus GPU canvas (e.g., tldraw) can leave stale pixels (“afterburn”) when panning or changing opacity.
  - Tried (and dropped): OS‑level window opacity; animating wrapper opacity; transform/visibility nudges; `contain: paint` on webview (interfered with canvas invalidation).
  - Working profile (default):
    - Window background alpha = 1% (`#00000001`) to stabilize the compositor
    - Opacity changes are CSS‑only (webview opacity and backdrop tint); no fades
    - Conditional, debounced Hard Flush only when background alpha is 0% (true transparent)
    - Manual Hard Flush command (Cmd+Shift+F) for stubborn frames
    - Optional toggles: Pre‑Draw Hard Flush; Canvas Safe Mode (disable Accelerated2dCanvas)
  - Result: No ghosting in default mode, minimal flashing; alpha 0% is supported with short debounced flushes

- Popup/link handling (target=_blank / window.open)
  - Problem: Links with `target="_blank"` either did nothing or opened with native window chrome.
  - Change: Enabled `<webview allowpopups>` and added a main‑process `setWindowOpenHandler` for webview contents.
  - Behavior: We deny the default popup and instead create a new frameless CloudyWindow via `createWindow()`, then send a `navigate-to` IPC so the new window’s webview loads the URL.
  - Notes: `about:blank` popups are ignored; windows are tracked in our `windows` set and appear in the Window menu. No native titlebar/decoration.

- Shortcuts (current)
  - Toggle UI: Cmd+Opt+U
  - Background opacity presets: Opt+Shift+0/5/1; step: Opt+Shift+[ / ]
  - Overall opacity presets: Cmd+Opt+0/5/1; step: Cmd+Opt+[ / ]
  - Apply transparency CSS: Cmd+Opt+T (manual, site‑aware + generic)
  - Hard Flush Content: Cmd+Opt+F; Pre‑Draw Hard Flush (toggle); Canvas Safe Mode (toggle)

- Security notes
  - `<webview allowpopups>` is enabled, but all popups are intercepted in main and default behavior is denied (`action:'deny'`). We route allowed URLs into managed CloudyWindows only.
  - Host remains `contextIsolation:true`, `nodeIntegration:false`.

### Site CSS Store, Editor, and Picker
- Store: Implemented `main/siteCssStore.js` with JSON at `userData/site-css.json` and seeded starter rules for TLDraw, Excalidraw, Strudel, play.ertdfgcvb.xyz, Cables, Unit. Debounced writes.
- Injection: Renderer queries matching rules and applies via `webview.insertCSS` on `dom-ready`/navigation.
- Editor: Dedicated window (`sitecss-editor.html`) with simple JSON textarea; menu action to open; supports reload/format/save.
- Picker: Webview preload injects a HUD and hover overlay; keys/buttons:
  - T Transparent (auto‑zap) — creates a rule immediately and previews; Z undoes the last auto‑zap.
  - H Hide (auto‑zap) — creates a hide rule; Z undoes.
  - Enter Done — sends selector to editor and exits pick mode.
  - Esc Cancel — exit without changes.
- Menu/shortcut: Developer → Start DOM/CSS Picker (This Window), `Cmd+Opt+P`.

## TODO / Ideas

- Per‑site CSS recipes registry + UI toggle (enable/disable for current site).
- Optional micro‑fade on backdrop changes only (if needed); keep webview static.
- Consider an in‑app “Zap CSS” tool for one‑off removals, store per‑site CSS.

# Dev Log — CloudyWindow (feature/webview)

This document tracks notable issues, decisions, and fixes while developing the webview‑based overlay.

## 2025‑09 — Webview migration + transparency fixes

- Drag & drop over content
  - Problem: iframe swallowed drag events cross‑origin; overlay didn’t trigger.
  - Solution: switch to `<webview>` with a guest preload (`webview-preload.js`) that forwards dragenter/over/leave/drop via `sendToHost`. Host listens and resolves files/folders (folder → index.html).

- Background transparency for tools
  - tldraw: inject CSS to override theme variables and clear containers/canvas (transparent background).
  - Strudel: inject CSS to clear common wrappers and remove `blackscreen/whitescreen/greenscreen` classes.

- Afterimage / ghosting during opacity changes
  - Observed: compositing artifacts when using OS‑level window opacity or animating wrapper opacity.
  - Attempts: transform/visibility nudges helped briefly but caused flickers in some cases.
  - Current approach: avoid OS window opacity; set `webview.style.opacity` + backdrop tint only. Added `contain: paint` on webview and `isolation: isolate` on wrapper.
  - Hard Flush: menu command (Cmd+Shift+F) temporarily sets `display:none` on the webview for two RAFs to force compositor cache drop; auto‑triggered after UI toggle and opacity presets.

- Shortcuts (to avoid editor conflicts)
  - Toggle UI: Cmd+Opt+U
  - Background opacity presets: Opt+Shift+0/5/1; adjust: Opt+Shift+[ / ]
  - Overall opacity presets: Cmd+Shift+0/5/1; adjust: Cmd+Alt+[ / ]
  - Hard Flush Content: Cmd+Shift+F

- Security notes
  - Removed `allowpopups` from `<webview>` in dev to prevent warnings.
  - Host remains `contextIsolation:true`, `nodeIntegration:false`.

## TODO / Ideas

- Per‑site CSS recipes registry + UI toggle (enable/disable for current site).
- Optional micro‑fade on backdrop changes only (if needed); keep webview static.
- Consider an in‑app “Zap CSS” tool for one‑off removals, store per‑site CSS.


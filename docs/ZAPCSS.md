# Zap CSS and Per‑Site CSS — Design

This document proposes an approach for user‑defined, per‑site CSS and an interactive “Zap CSS” tool that lets users pick elements in a page and apply style fixes (e.g., make backgrounds transparent, hide blocks).

## Goals
- Let users define CSS that applies automatically per site (host/path matcher).
- Provide an interactive picker (“Zap CSS”) to generate selectors and common rules without hand‑editing.
- Persist rules and apply them on each visit, across all CloudyWindow instances.
- Keep the system safe: CSS injection only by default (optional JS hooks guarded).

## Non‑Goals (Phase 1)
- Full visual editor with undo/redo.
- Cross‑device sync of rules.
- Complex rule languages; we’ll start simple and iterate.

---

## Data Model
Store rules in a JSON file under `app.getPath('userData')` (e.g., `site-css.json`).

Shape:
```
{
  "version": 1,
  "rules": [
    {
      "id": "uuid-1234",
      "enabled": true,
      "match": {
        "host": "docs.strudel.cc",      // exact or suffix (".strudel.cc")
        "pathPrefix": "/",              // optional
        "protocols": ["https"]          // optional; default http/https
      },
      "css": [
        "html,body,#root{background:transparent!important}",
        ".blackscreen,.whitescreen,.greenscreen{background:transparent!important}"
      ],
      "notes": "Strudel transparency"
    }
  ]
}
```

Matching:
- Host: exact or suffix match (e.g., `endsWith('.strudel.cc')`).
- Optional path prefix; protocols default to http/https.

---

## Architecture & APIs

- Main process owns the store (load/save/match). Renderer asks for rules for a given URL.
- IPC:
  - `site-css:get-matching` (url) → `[css strings]`
  - `site-css:add` ({match, css, notes}) → stored rule (returns id)
  - `site-css:update` ({id, patch}) → updated rule
  - `site-css:remove` (id) → ok
  - `site-css:open-file` () → opens JSON in system editor
  - `site-css:list` () → returns all rules (for future UI)

Storage:
- Lazy‑load on first use; debounce saves (e.g., 300 ms) to avoid churn.

---

## Injection Flow

- In `renderer.js`, replace ad‑hoc `injectSiteCSS(url)` with:
  1) On webview `dom-ready`, `did-navigate`, and `did-navigate-in-page`, request `site-css:get-matching` for `currentUrl`.
  2) `insertCSS` each snippet returned.
  3) Keep existing built‑in recipes (tldraw/Strudel) as a default rule set that ships with the app; merge with user rules.

- For performance, cache the last `currentUrl` → CSS applied to avoid duplicate inserts on rapid SPA changes.

Editor Window
- Dedicated window: `sitecss-editor.html` + `sitecss-editor.js` (dark UI).
- Buttons: Start Picker, Format, Reload, Save.
- Receives pick results via `site-css:picker-result` and inserts a starter rule; you review and save.

Picker UX (Phase 2 implemented)
- Start from Developer menu or editor (button). Shortcut: `Cmd+Opt+P`.
- HUD (icon‑only buttons with tooltips) and keys:
  - 🫥 `T` Transparent: Add a transparent background rule and preview it.
  - 🙈 `H` Hide: Add a hide rule and preview it.
  - ↩️ `Z` Undo: Undo the last auto‑zap (preview + stored rule).
  - ♻️ `R` Reset: Remove previews and all user rules for the current host (starter rules are preserved).
  - ✅ `Enter` Done: Send selector to the editor (insert template rule).
  - ✖️ `Esc` Cancel: Exit picker.
  - Overlay highlights the currently hovered element.

---

## Zap CSS (Interactive Picker)

Trigger: View → Developer → "Start Zap CSS (This Window)".

Behavior:
- Inject a transient script into the webview via `executeJavaScript` that:
  - Adds a hover overlay to outline the element under cursor.
  - On click, computes a robust CSS selector (id, classes, nth-of-type) and proposes a rule template.
  - Presents a tiny in‑page HUD with quick actions:
    - Clear background (background/background-color: transparent !important)
    - Hide element (display: none !important)
    - Dim element (opacity: 0.2 !important)
    - Custom CSS (textarea)
  - On confirm, sends a `sendToHost('zap-css:add', payload)` with `{ selector, cssText, location: {host, path}, url }`.
- Host (renderer) forwards to main: `site-css:add` creating a rule for the current host (and optional pathPrefix). Then immediately applies the CSS via `insertCSS`.
- Exit controls: Esc cancels; clicking outside cancels.

Selector generation heuristic:
- If element has stable `id` → `#id`.
- Else compose from tag + class list (cap length), ensure uniqueness up the DOM with `nth-of-type` as needed.
- Avoid overly brittle selectors (hash‑like classnames); fall back to short path.

Security:
- Injected script runs in the guest page but only manipulates DOM/CSS. No Node integration; communication only via `sendToHost`.

---

## Menu & UI

Add to Developer menu:
- Start Zap CSS (This Window)
- Apply Transparency CSS (existing)
- Site CSS →
  - Enable/Disable for Current Site (toggle)
  - Clear Site Rules for Current Site
  - Edit Site CSS File… (opens JSON)

Optional HUD control in the CloudyWindow UI later.

---

## Milestones

- M1: Passive per‑site CSS
  - Implement store + IPC + injection on navigation
  - Ship built‑in default rules (tldraw, Strudel) inside code

- M2: Zap CSS picker
  - Injection script + overlay + selector builder
  - Host piping to store; immediate apply

- M3: Menu ops / editing
  - Edit JSON file, enable/disable per site, clear site rules
  - Basic rule listing (console/log or simple modal)

- M4: Polish
  - Robust selector generation, multi‑rule templates, export/import

---

## Risks & Mitigations
- Brittle selectors → provide quick "Open editor" to refine; allow path‑scoped matches.
- Performance on SPA navigations → cache last applied, debounce.
- Security concerns → keep to CSS only by default; feature flag for JS actions.

---

## Implementation Notes (Skeleton)
- `main/siteCssStore.js` module: load/save/match APIs; JSON at `userData/site-css.json` (seeded with starter rules).
- In `main.js`: IPC for store (get/add/list/reload/read/write), picker control (start/stop, auto‑add, undo), and forwarding pick results to the editor window.
- In `renderer.js`: site CSS injection (built‑ins + user), bridge webview events and picker messages to main/editor.
- In `webview-preload.js`: picker overlay + HUD; compute selector; support auto‑zap/undo and commit.

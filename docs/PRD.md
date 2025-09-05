# Product Requirements Document (PRD) — CloudyWindow (feature/webview)

This PRD consolidates implementation plans and current status. See `docs/DEVLOG.md` for an ongoing log of decisions and fixes.

---

## Webview Migration — Plan (target: v0.5)

Goal: Replace the `<iframe>` with Electron `<webview>` for reliable drag‑and‑drop, per‑site CSS injection (tldraw/Strudel), better control, and future “Zap CSS”.

Why webview
- Captures input/drag events across origins; file/URL drops work over content.
- Allows `insertCSS` / `executeJavaScript` for site‑specific tweaks.
- Per‑site isolation possible via `partition` + guest preload.

Scope
- Enable `webviewTag` on BrowserWindow.
- Replace iframe with `<webview id="content-frame">`.
- Add `webview-preload.js` to forward drag events to host.
- Port navigation/reload/URL bar to webview APIs.
- CSS injection recipes for tldraw and Strudel transparency.

Deliverables
1) Parity navigation: URL bar, back/forward, reload.
2) DnD: files/URLs/folders anywhere reliably (folder → index.html).
3) Transparency recipes: tldraw + Strudel; extendable.
4) Updated shortcuts; background + overall opacity menus.

Risks & mitigations
- Compositor afterimages when toggling opacity: avoid OS window opacity; apply CSS opacity to webview + backdrop. Add Hard Flush (two‑RAF display:none) as an escape hatch.
- Cross‑origin quirks: rely on preload + `sendToHost`.

Acceptance criteria
- All navigation operates on webview; drops open content; CSS recipes make common tools transparent; no major regressions.


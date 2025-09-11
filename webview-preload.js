// Preload for <webview>: capture drag & drop events and forward to host
// Runs in the isolated world of the guest page
const { ipcRenderer } = require('electron');

function safeSend(channel, payload) {
  try { ipcRenderer.sendToHost(channel, payload); } catch (_) {}
}

window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  safeSend('wv-dragover');
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  safeSend('wv-dragover');
});

window.addEventListener('dragleave', (e) => {
  e.preventDefault();
  safeSend('wv-dragleave');
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files).map(f => f.path) : [];
  const uriList = e.dataTransfer?.getData ? e.dataTransfer.getData('text/uri-list') : '';
  const text = e.dataTransfer?.getData ? e.dataTransfer.getData('text/plain') : '';
  safeSend('wv-drop', { files, uriList, text });
});

// ---- Zap CSS picker (install/uninstall + selector computation) ----
let __zap_active = false;
let __zap_overlay = null;
let __zap_lastEl = null;
let __zap_hud = null;
let __zap_previewStack = [];

function __zap_createOverlay() {
  const d = document.createElement('div');
  d.style.position = 'fixed';
  d.style.zIndex = '21474836470';
  d.style.border = '2px solid rgba(0,200,255,0.9)';
  d.style.background = 'rgba(0,200,255,0.12)';
  d.style.pointerEvents = 'none';
  d.style.borderRadius = '3px';
  d.style.display = 'none';
  document.documentElement.appendChild(d);
  return d;
}

function __zap_updateOverlayFor(el) {
  if (!__zap_overlay) return;
  if (!el || !(el instanceof Element)) { __zap_overlay.style.display = 'none'; return; }
  const r = el.getBoundingClientRect();
  __zap_overlay.style.display = 'block';
  __zap_overlay.style.left = r.left + 'px';
  __zap_overlay.style.top = r.top + 'px';
  __zap_overlay.style.width = r.width + 'px';
  __zap_overlay.style.height = r.height + 'px';
}

function __zap_addPreview(cssText) {
  try {
    const st = document.createElement('style');
    st.type = 'text/css';
    st.dataset.cloudyZap = '1';
    st.textContent = cssText || '';
    (document.head || document.documentElement).appendChild(st);
    __zap_previewStack.push(st);
  } catch (_) {}
}

function __zap_undoPreview() {
  try {
    const st = __zap_previewStack.pop();
    if (st && st.parentNode) st.parentNode.removeChild(st);
  } catch (_) {}
}

function __zap_createHUD() {
  const box = document.createElement('div');
  box.style.position = 'fixed';
  box.style.zIndex = '21474836471';
  box.style.top = '8px';
  box.style.right = '8px';
  box.style.background = 'rgba(0,0,0,0.7)';
  box.style.color = '#fff';
  box.style.padding = '6px 8px';
  box.style.borderRadius = '8px';
  box.style.font = "12px -apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial";
  box.style.display = 'flex';
  box.style.gap = '6px';
  box.style.alignItems = 'center';
  const mkBtn = (label, title, handler) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.title = title;
    b.style.background = 'rgba(255,255,255,0.12)';
    b.style.color = '#fff';
    b.style.border = '1px solid rgba(255,255,255,0.2)';
    b.style.borderRadius = '6px';
    b.style.padding = '4px 8px';
    b.style.cursor = 'pointer';
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); try { handler(); } catch(_){} });
    return b;
  };
  const btnP = mkBtn('📄', 'Page/Root Transparent (P) — try to clear page background', () => { __zap_auto('page'); });
  const btnT = mkBtn('🫥', 'Transparent (T) — auto‑zap: make background transparent', () => { __zap_auto('transparent'); });
  const btnH = mkBtn('🙈', 'Hide (H) — auto‑zap: hide element', () => { __zap_auto('hide'); });
  const btnZ = mkBtn('↩️', 'Undo (Z) — undo last auto‑zap preview', () => { __zap_undo(); });
  const btnR = mkBtn('♻️', 'Reset (R) — remove previews and user rules for this host', () => { __zap_reset(); });
  const btnDone = mkBtn('✅', 'Done (Enter) — finish picking and send to editor', () => { __zap_commit(); });
  const btnCancel = mkBtn('✖️', 'Cancel (Esc) — cancel picker', () => { __zap_cancel(); });
  // Add a small help hint
  const hint = document.createElement('span');
  hint.textContent = ' P T H Z R Enter Esc ';
  hint.style.opacity = '0.75';
  hint.style.fontSize = '11px';
  hint.style.marginLeft = '4px';
  box.appendChild(btnP); box.appendChild(btnT); box.appendChild(btnH); box.appendChild(btnZ); box.appendChild(btnR); box.appendChild(btnDone); box.appendChild(btnCancel); box.appendChild(hint);
  document.documentElement.appendChild(box);
  return box;
}

function __zap_auto(kind) {
  if (!__zap_active) return;
  const el = __zap_lastEl;
  const selector = __zap_computeSelector(el);
  let cssText = '';
  if (kind === 'hide') {
    if (!selector) return;
    cssText = `${selector}{display:none!important}`;
  } else if (kind === 'page') {
    cssText = [
      'html,body,#root,#__next,#app,.app,.container,.content,.editor,.workspace,.main,.page{background:transparent!important;background-color:transparent!important}',
      'canvas,svg{background:transparent!important}'
    ].join('\n');
  } else {
    if (!selector) return;
    cssText = `${selector}{background:transparent!important;background-color:transparent!important}`;
  }
  __zap_addPreview(cssText);
  const payload = {
    action: kind,
    selector,
    cssText,
    url: location && location.href,
    host: location && location.host,
    path: location && location.pathname
  };
  safeSend('zap-css-auto', payload);
}

function __zap_undo() {
  __zap_undoPreview();
  safeSend('zap-css-undo', {});
}

function __zap_commit() {
  const el = __zap_lastEl;
  const selector = __zap_computeSelector(el);
  const url = (location && location.href) || '';
  const payload = {
    url,
    host: location && location.host,
    path: location && location.pathname,
    selector,
    hints: {
      transparent: `${selector}{background:transparent!important;background-color:transparent!important}`,
      hide: `${selector}{display:none!important}`,
      dim: `${selector}{opacity:0.2!important}`
    }
  };
  safeSend('zap-css-picked', payload);
  __zap_stop();
}

function __zap_cancel() {
  safeSend('zap-css-cancelled', {});
  __zap_stop();
}

function __zap_computeSelector(el) {
  if (!el || el.nodeType !== 1) return '';
  // id first
  if (el.id && /^[A-Za-z_][\w\-:.]*$/.test(el.id)) {
    return `#${CSS.escape ? CSS.escape(el.id) : el.id}`;
  }
  // build from tag + classes up the tree until unique
  const esc = (t) => (CSS.escape ? CSS.escape(t) : String(t).replace(/([!"#$%&'()*+,./:;<=>?@\[\]^`{|}~ ])/g, '\\$1'));
  const parts = [];
  let cur = el;
  while (cur && cur.nodeType === 1 && parts.length < 5) {
    let sel = cur.tagName ? cur.tagName.toLowerCase() : '';
    if (cur.classList && cur.classList.length) {
      const cls = Array.from(cur.classList).slice(0, 3).map(c => '.' + esc(c)).join('');
      sel += cls;
    }
    // ensure uniqueness at this level with nth-of-type if needed
    if (cur.parentElement) {
      const tag = cur.tagName;
      const siblings = Array.from(cur.parentElement.children).filter(ch => ch.tagName === tag);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(cur) + 1;
        sel += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(sel || '*');
    try { if (document.querySelector(parts.join(' > ')) === el) break; } catch (_) {}
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}

function __zap_onMouseMove(e) {
  if (!__zap_active) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  __zap_lastEl = el;
  __zap_updateOverlayFor(el);
}

function __zap_onClick(e) {
  if (!__zap_active) return;
  e.preventDefault();
  e.stopPropagation();
  __zap_commit();
}

function __zap_onKey(e) {
  if (!__zap_active) return;
  const k = e.key;
  if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); __zap_cancel(); }
  else if (k === 'Enter') { e.preventDefault(); e.stopPropagation(); __zap_commit(); }
  else if (k === 'p' || k === 'P') { e.preventDefault(); e.stopPropagation(); __zap_auto('page'); }
  else if (k === 't' || k === 'T') { e.preventDefault(); e.stopPropagation(); __zap_auto('transparent'); }
  else if (k === 'h' || k === 'H') { e.preventDefault(); e.stopPropagation(); __zap_auto('hide'); }
  else if (k === 'z' || k === 'Z') { e.preventDefault(); e.stopPropagation(); __zap_undo(); }
  else if (k === 'r' || k === 'R') { e.preventDefault(); e.stopPropagation(); __zap_reset(); }
}

function __zap_start() {
  if (__zap_active) return;
  __zap_active = true;
  if (!__zap_overlay) __zap_overlay = __zap_createOverlay();
  if (!__zap_hud) __zap_hud = __zap_createHUD();
  if (__zap_hud) __zap_hud.style.display = 'flex';
  try { __zap_lastEl = document.documentElement || document.body || null; __zap_updateOverlayFor(__zap_lastEl); } catch (_) {}
  window.addEventListener('mousemove', __zap_onMouseMove, true);
  window.addEventListener('click', __zap_onClick, true);
  window.addEventListener('keydown', __zap_onKey, true);
  window.addEventListener('keyup', __zap_onKey, true);
  try { document.addEventListener('keydown', __zap_onKey, true); } catch(_) {}
  try { document.addEventListener('keyup', __zap_onKey, true); } catch(_) {}
}

function __zap_stop() {
  if (!__zap_active) return;
  __zap_active = false;
  window.removeEventListener('mousemove', __zap_onMouseMove, true);
  window.removeEventListener('click', __zap_onClick, true);
  window.removeEventListener('keydown', __zap_onKey, true);
  if (__zap_overlay) __zap_overlay.style.display = 'none';
  if (__zap_hud) __zap_hud.style.display = 'none';
}

function __zap_reset() {
  // Remove all previews
  try { while (__zap_previewStack.length) { __zap_undoPreview(); } } catch (_) {}
  // Ask host to clear stored user rules for this host
  const host = (location && location.host) || '';
  safeSend('zap-css-reset', { host });
}

// IPC from embedder
ipcRenderer.on('zap-css-start', () => { try { __zap_start(); } catch (_) {} });
ipcRenderer.on('zap-css-stop', () => { try { __zap_stop(); } catch (_) {} });
ipcRenderer.on('zap-css-commit', () => { try { __zap_commit(); } catch (_) {} });
ipcRenderer.on('zap-css-cancel', () => { try { __zap_cancel(); } catch (_) {} });

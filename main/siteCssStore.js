const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const FILE_NAME = 'site-css.json';

function getStorePath() {
  try {
    const dir = app.getPath('userData');
    return path.join(dir, FILE_NAME);
  } catch (_) {
    // Fallback to cwd if userData is unavailable (dev env edge case)
    return path.join(process.cwd(), FILE_NAME);
  }
}

function starterRules() {
  // Minimal, non-destructive transparency helpers per site
  const rules = [];
  // TLDraw
  rules.push({
    id: 'starter-tldraw',
    enabled: true,
    match: { host: '.tldraw.com' },
    css: [
      `:root,[data-tl-theme],[data-theme],[data-color-mode]{--tl-color-background:hsla(0 0% 100% / 0)!important;--tlui-color-background:hsla(0 0% 100% / 0)!important;--tlui-color-panel:hsla(0 0% 100% / 0)!important}`,
      `html,body,#root,.tla,.tla-theme-container,.tl-container,.tlui,.tlui__editor,.tlui__container,.tlui__page,.tlui__panel,.tldraw,.tldraw__editor,.tl,.tl-theme{background:transparent!important}`,
      `.tl-background,.tlui-canvas,canvas,svg,[class*='canvas']{background:transparent!important}`
    ],
    notes: 'Make TLDraw app/canvas transparent'
  });
  // Excalidraw
  rules.push({
    id: 'starter-excalidraw',
    enabled: true,
    match: { host: 'excalidraw.com' },
    css: [
      `html,body,#root,.excalidraw,.layer-ui__wrapper,.App{background:transparent!important}`,
      `canvas,svg{background:transparent!important}`
    ],
    notes: 'Make Excalidraw canvas area transparent'
  });
  // Strudel (app + docs)
  rules.push({
    id: 'starter-strudel',
    enabled: true,
    match: { host: '.strudel.cc' },
    css: [
      `html,body,#root,#app,.app,.container,.editor-container,.visualizer,.scene{background:transparent!important}`,
      `.blackscreen,.whitescreen,.greenscreen{background:transparent!important}`,
      `canvas,svg{background:transparent!important}`
    ],
    notes: 'Strudel background transparency (editor/docs)'
  });
  // play.ertdfgcvb.xyz
  rules.push({
    id: 'starter-ertdfgcvb',
    enabled: true,
    match: { host: 'play.ertdfgcvb.xyz' },
    css: [
      `html,body,#root,#app,.app,.container{background:transparent!important}`,
      `canvas,svg{background:transparent!important}`
    ],
    notes: 'Make play.ertdfgcvb.xyz background transparent'
  });
  // cables.gl (editor/runtime)
  rules.push({
    id: 'starter-cables',
    enabled: true,
    match: { host: '.cables.gl' },
    css: [
      `html,body,#root,#app,.workspace,.editor,.viewport,.content{background:transparent!important}`,
      `canvas,svg{background:transparent!important}`
    ],
    notes: 'Cables editor/runtime transparency'
  });
  // unit.moe
  rules.push({
    id: 'starter-unit',
    enabled: true,
    match: { host: '.unit.moe' },
    css: [
      `html,body,#root,#app,.app,.container,.editor,.workspace,.main,.page{background:transparent!important}`,
      `canvas,svg{background:transparent!important}`
    ],
    notes: 'Unit background transparency'
  });
  return rules;
}

function defaultData() {
  return { version: 1, rules: starterRules() };
}

class SiteCssStore {
  constructor() {
    this.file = getStorePath();
    this.data = defaultData();
    this._loaded = false;
    this._saveTimer = null;
  }

  ensureLoaded() {
    if (this._loaded) return;
    try {
      if (fs.existsSync(this.file)) {
        const raw = fs.readFileSync(this.file, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rules)) {
          this.data = { version: parsed.version || 1, rules: parsed.rules };
        }
        // If file exists but has no rules, seed with starters
        if (!this.data.rules || this.data.rules.length === 0) {
          this.data = defaultData();
          this._saveSync();
        }
      } else {
        this.data = defaultData();
        this._saveSync();
      }
    } catch (_) {
      this.data = defaultData();
    }
    this._loaded = true;
  }

  reload() {
    this._loaded = false;
    this.ensureLoaded();
  }

  _saveSync() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
    } catch (_) {}
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (_) {}
  }

  saveDebounced() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveSync();
      this._saveTimer = null;
    }, 300);
  }

  list() {
    this.ensureLoaded();
    return this.data.rules.slice();
  }

  add(rule) {
    this.ensureLoaded();
    const r = Object.assign({ id: String(Date.now()) + '-' + Math.random().toString(36).slice(2), enabled: true }, rule);
    if (!r.css) r.css = [];
    if (!Array.isArray(r.css)) r.css = [String(r.css)];
    this.data.rules.push(r);
    this.saveDebounced();
    return r;
  }

  update(id, patch) {
    this.ensureLoaded();
    const idx = this.data.rules.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const next = Object.assign({}, this.data.rules[idx], patch || {});
    this.data.rules[idx] = next;
    this.saveDebounced();
    return next;
  }

  remove(id) {
    this.ensureLoaded();
    const prevLen = this.data.rules.length;
    this.data.rules = this.data.rules.filter(r => r.id !== id);
    if (this.data.rules.length !== prevLen) this.saveDebounced();
    return this.data.rules.length !== prevLen;
  }

  getMatching(url) {
    this.ensureLoaded();
    let u;
    try { u = new URL(url); } catch (_) { return []; }
    const proto = (u.protocol || '').replace(':','');
    const host = (u.hostname || '').toLowerCase();
    const pathName = u.pathname || '/';
    const out = [];
    for (const r of this.data.rules) {
      if (r && r.enabled !== false) {
        const m = r.match || {};
        const okProto = !m.protocols || (Array.isArray(m.protocols) ? m.protocols.includes(proto) : String(m.protocols) === proto);
        if (!okProto) continue;
        let okHost = true;
        if (m.host) {
          const want = String(m.host).toLowerCase();
          okHost = (host === want) || (want.startsWith('.') ? host.endsWith(want) : host.endsWith('.' + want) || host === want);
        }
        if (!okHost) continue;
        let okPath = true;
        if (m.pathPrefix) {
          okPath = String(pathName).startsWith(String(m.pathPrefix));
        }
        if (!okPath) continue;
        if (Array.isArray(r.css)) out.push(...r.css);
        else if (typeof r.css === 'string') out.push(r.css);
      }
    }
    return out;
  }
}

module.exports = new SiteCssStore();

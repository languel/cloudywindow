const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const FILE_NAME = 'settings.json';

function getPath() {
  try {
    return path.join(app.getPath('userData'), FILE_NAME);
  } catch (_) {
    return path.join(process.cwd(), FILE_NAME);
  }
}

function defaultData() {
  return {
    version: 1,
    startup: {
      path: null, // absolute path to file or folder
      mode: 'normal', // normal | fullscreen | fill-screen | overscan-center
      hideCursor: false,
      displayId: null // numeric Electron display.id; null -> auto/primary
    },
    ui: {
      addressBarOpacity: 0.5 // 0.0 to 1.0 (default 50% opacity)
    }
  };
}

class SettingsStore {
  constructor() {
    this.file = getPath();
    this.data = defaultData();
    this._loaded = false;
  }

  ensureLoaded(force = false) {
    if (this._loaded && !force) return;
    try {
      if (fs.existsSync(this.file)) {
        const raw = fs.readFileSync(this.file, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const def = defaultData();
          this.data = {
            ...def,
            ...parsed,
            startup: Object.assign({}, def.startup, parsed.startup || {}),
            ui: Object.assign({}, def.ui, parsed.ui || {})
          };
        }
      } else {
        this.data = defaultData();
        this.save();
      }
    } catch (_) { this.data = defaultData(); }
    this._loaded = true;
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
      return true;
    } catch (_) { return false; }
  }

  get(forceReload = true) { this.ensureLoaded(forceReload); return JSON.parse(JSON.stringify(this.data)); }

  setStartupPath(p) { this.ensureLoaded(); this.data.startup.path = p || null; return this.save(); }
  setStartupMode(mode) { this.ensureLoaded(); this.data.startup.mode = mode || 'normal'; return this.save(); }
  setStartupHideCursor(v) { this.ensureLoaded(); this.data.startup.hideCursor = !!v; return this.save(); }
  setStartupDisplayId(id) { this.ensureLoaded(); this.data.startup.displayId = (id === null || id === undefined) ? null : Number(id); return this.save(); }
  setAddressBarOpacity(v) {
    this.ensureLoaded();
    const num = typeof v === 'number' ? v : parseFloat(v);
    this.data.ui.addressBarOpacity = Number.isNaN(num) ? 0.5 : Math.max(0, Math.min(1, num));
    return this.save();
  }
}

module.exports = new SettingsStore();

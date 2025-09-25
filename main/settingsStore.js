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

function defaultProjection() {
  return {
    enabled: false,
    gridVisible: true,
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ]
  };
}

function sanitizeProjectionPoints(points) {
  if (!Array.isArray(points) || points.length !== 4) {
    return defaultProjection().points;
  }
  return points.map((pt) => ({
    x: Number(pt && pt.x) || 0,
    y: Number(pt && pt.y) || 0
  }));
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
    projection: defaultProjection()
  };
}

class SettingsStore {
  constructor() {
    this.file = getPath();
    this.data = defaultData();
    this._loaded = false;
  }

  ensureLoaded() {
    if (this._loaded) return;
    try {
      if (fs.existsSync(this.file)) {
        const raw = fs.readFileSync(this.file, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.data = Object.assign(defaultData(), parsed);
        }
      } else {
        this.data = defaultData();
        this.save();
      }
    } catch (_) { this.data = defaultData(); }
    if (!this.data.projection) {
      this.data.projection = defaultProjection();
    } else {
      try {
        if (typeof this.data.projection.enabled !== 'boolean') {
          this.data.projection.enabled = !!this.data.projection.enabled;
        }
        this.data.projection.gridVisible = this.data.projection.gridVisible !== false;
        this.data.projection.points = sanitizeProjectionPoints(this.data.projection.points);
      } catch (_) {
        this.data.projection = defaultProjection();
      }
    }
    this._loaded = true;
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
      return true;
    } catch (_) { return false; }
  }

  get() { this.ensureLoaded(); return JSON.parse(JSON.stringify(this.data)); }

  ensureProjection() {
    this.ensureLoaded();
    if (!this.data.projection) this.data.projection = defaultProjection();
    return this.data.projection;
  }

  getProjection() {
    const proj = this.ensureProjection();
    return JSON.parse(JSON.stringify(proj));
  }

  setProjectionEnabled(enabled) {
    const proj = this.ensureProjection();
    proj.enabled = !!enabled;
    return this.save();
  }

  setProjectionGridVisible(visible) {
    const proj = this.ensureProjection();
    proj.gridVisible = !!visible;
    return this.save();
  }

  setProjectionPoints(points) {
    const proj = this.ensureProjection();
    proj.points = sanitizeProjectionPoints(points);
    return this.save();
  }

  setProjection(data = {}) {
    const proj = this.ensureProjection();
    if (typeof data.enabled !== 'undefined') proj.enabled = !!data.enabled;
    if (typeof data.gridVisible !== 'undefined') proj.gridVisible = !!data.gridVisible;
    if (data.points) proj.points = sanitizeProjectionPoints(data.points);
    return this.save();
  }

  resetProjection() {
    this.data.projection = defaultProjection();
    return this.save();
  }

  setStartupPath(p) { this.ensureLoaded(); this.data.startup.path = p || null; return this.save(); }
  setStartupMode(mode) { this.ensureLoaded(); this.data.startup.mode = mode || 'normal'; return this.save(); }
  setStartupHideCursor(v) { this.ensureLoaded(); this.data.startup.hideCursor = !!v; return this.save(); }
  setStartupDisplayId(id) { this.ensureLoaded(); this.data.startup.displayId = (id === null || id === undefined) ? null : Number(id); return this.save(); }
}

module.exports = new SettingsStore();

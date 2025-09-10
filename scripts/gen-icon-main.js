const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Load .env (best-effort) so CLOUDYW_* vars work without manual export
(function loadDotEnv() {
  try {
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        if (!line || line.trim().startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1);
        if (key && !(key in process.env)) process.env[key] = val;
      }
    }
  } catch {}
})();

const EMOJI = process.env.CLOUDYW_EMOJI || '🌦️';
const OUT_DIR = process.env.CLOUDYW_ICON_OUT
  ? path.resolve(process.env.CLOUDYW_ICON_OUT)
  : path.resolve(__dirname, '..', 'build');
const ICONSET = path.join(OUT_DIR, 'icon.iconset');
const ICNS = path.join(OUT_DIR, 'icon.icns');

const targets = [
  { name: 'icon_16x16.png', size: 16 },
  { name: 'icon_16x16@2x.png', size: 32 },
  { name: 'icon_32x32.png', size: 32 },
  { name: 'icon_32x32@2x.png', size: 64 },
  { name: 'icon_128x128.png', size: 128 },
  { name: 'icon_128x128@2x.png', size: 256 },
  { name: 'icon_256x256.png', size: 256 },
  { name: 'icon_256x256@2x.png', size: 512 },
  { name: 'icon_512x512.png', size: 512 },
  { name: 'icon_512x512@2x.png', size: 1024 },
];

async function renderEmoji(size) {
  const win = new BrowserWindow({
    width: size,
    height: size,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true }
  });
  const html = `<!doctype html><meta charset=\"utf-8\"><style>
    html,body{margin:0;height:100%;width:100%;background:transparent}
    body{display:flex;align-items:center;justify-content:center}
    .e{font-size:${Math.floor(size * 0.8)}px;line-height:1;font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',system-ui,sans-serif}
  </style><div class=\"e\">${EMOJI}</div>`;
  // Write to a temporary HTML file and load it as a file:// URL (most robust)
  const os = require('os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-icon-'));
  const tmpHtml = path.join(tmpDir, 'emoji.html');
  fs.writeFileSync(tmpHtml, html, 'utf8');
  await win.loadFile(tmpHtml);
  // Ensure we're not throttled and give fonts time to load
  try { win.webContents.setBackgroundThrottling(false); } catch {}
  await new Promise(r => setTimeout(r, 120));
  let image = await win.capturePage();
  // Retry once if empty
  if (!image || image.isEmpty?.()) {
    await new Promise(r => setTimeout(r, 150));
    image = await win.capturePage();
  }
  win.destroy();
  if (!image || image.isEmpty?.()) {
    throw new Error('Offscreen capture returned empty image');
  }
  return image.resize({ width: size, height: size });
}

async function main() {
  if (process.platform !== 'darwin') {
    console.log('Icon generation skipped: macOS only (iconutil needed).');
    app.quit();
    return;
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  // Clean previous outputs to avoid stale/empty files
  try {
    if (fs.existsSync(ICONSET)) {
      for (const f of fs.readdirSync(ICONSET)) {
        try { fs.unlinkSync(path.join(ICONSET, f)); } catch {}
      }
      fs.rmdirSync(ICONSET);
    }
    if (fs.existsSync(ICNS)) fs.unlinkSync(ICNS);
  } catch {}
  fs.mkdirSync(ICONSET, { recursive: true });

  // Disable HW acceleration to make offscreen capture more deterministic
  try { app.disableHardwareAcceleration(); } catch {}
  await app.whenReady();

  for (const t of targets) {
    const img = await renderEmoji(t.size);
    const outPath = path.join(ICONSET, t.name);
    const buf = img.toPNG();
    if (!Buffer.isBuffer(buf) || buf.length < 24) {
      throw new Error('PNG buffer invalid for size ' + t.size);
    }
    fs.writeFileSync(outPath, buf);
  }

  const r = spawnSync('iconutil', ['-c', 'icns', ICONSET, '-o', ICNS], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.warn('iconutil failed. Leaving iconset at:', ICONSET);
    app.exit(1);
    return;
  }
  console.log('Generated', ICNS);
  app.exit(0);
}

main();

// Emoji icon generator without Electron.
// Requires macOS tools: qlmanage, sips, iconutil.
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EMOJI = process.env.CLOUDYW_EMOJI || '🌦️';
const ICON_STYLE = (process.env.CLOUDYW_ICON_STYLE || 'transparent').toLowerCase();
const OUT_DIR = process.env.CLOUDYW_ICON_OUT
  ? path.resolve(process.env.CLOUDYW_ICON_OUT)
  : path.resolve(__dirname, '..', 'build');
const ICONSET = path.join(OUT_DIR, 'icon.iconset');
const ICNS = path.join(OUT_DIR, 'icon.icns');

function sh(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  return res.status === 0;
}

function main() {
  if (process.platform !== 'darwin') {
    console.log('Icon generation skipped: macOS only');
    return 0;
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  // Clean old iconset to avoid stale or corrupted files
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

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-emoji-'));
  const svg = path.join(tmp, 'emoji.svg');
  const svgOut = path.join(tmp, 'emoji.svg.png');

  let bg = '';
  if (ICON_STYLE === 'glass') {
    bg = `\n  <defs>\n    <linearGradient id=\"glass\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#FFFFFF\" stop-opacity=\"0.18\"/>\n      <stop offset=\"100%\" stop-color=\"#FFFFFF\" stop-opacity=\"0.06\"/>\n    </linearGradient>\n  </defs>\n  <rect x=\"96\" y=\"96\" width=\"832\" height=\"832\" rx=\"192\" fill=\"url(#glass)\"/>`;
  }
  const svgContent = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\\n` +
    `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\\n` +
    `  <rect width=\"1024\" height=\"1024\" fill=\"none\"/>${bg}\\n` +
    `  <text x=\"512\" y=\"512\" text-anchor=\"middle\" dominant-baseline=\"central\"` +
    `        font-family=\"Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, system-ui, sans-serif\"` +
    `        font-size=\"820\">${EMOJI}</text>\\n` +
    `</svg>`;
  fs.writeFileSync(svg, svgContent, 'utf8');

  // Rasterize SVG to 1024 PNG via Quick Look
  let ok = sh('qlmanage', ['-t', '-s', '1024', '-o', tmp, svg]);
  // Fallback: use sips to convert SVG -> PNG if Quick Look fails
  if (!ok || !fs.existsSync(svgOut)) {
    const pngFallback = path.join(tmp, 'emoji.png');
    const okSips = sh('sips', ['-s', 'format', 'png', '-z', '1024', '1024', svg, '--out', pngFallback]);
    if (!okSips || !fs.existsSync(pngFallback)) {
      console.warn('Rasterization failed; skipping icon generation');
      return 0;
    }
    try { fs.copyFileSync(pngFallback, svgOut); } catch {}
  }

  // Validate PNG header (\x89PNG\r\n\x1A\n)
  try {
    const buf = fs.readFileSync(svgOut);
    const sig = buf.slice(0, 8).toString('binary');
    const expected = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]).toString('binary');
    if (sig !== expected) {
      console.warn('Rasterized file is not a valid PNG; skipping icon generation');
      return 0;
    }
  } catch (e) {
    console.warn('Cannot read rasterized PNG; skipping icon generation');
    return 0;
  }

  const sizes = [
    { name: 'icon_16x16.png', w: 16, h: 16 },
    { name: 'icon_16x16@2x.png', w: 32, h: 32 },
    { name: 'icon_32x32.png', w: 32, h: 32 },
    { name: 'icon_32x32@2x.png', w: 64, h: 64 },
    { name: 'icon_128x128.png', w: 128, h: 128 },
    { name: 'icon_128x128@2x.png', w: 256, h: 256 },
    { name: 'icon_256x256.png', w: 256, h: 256 },
    { name: 'icon_256x256@2x.png', w: 512, h: 512 },
    { name: 'icon_512x512.png', w: 512, h: 512 },
    { name: 'icon_512x512@2x.png', w: 1024, h: 1024 }
  ];
  function isValidPng(p) {
    try {
      const b = fs.readFileSync(p);
      if (b.length < 8) return false;
      const sig = b.slice(0, 8).toString('binary');
      const expected = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]).toString('binary');
      return sig === expected;
    } catch (_) { return false; }
  }

  for (const s of sizes) {
    const out = path.join(ICONSET, s.name);
    const tmpOut = path.join(tmp, s.name + '.tmp');
    // Generate from the 1024 PNG each time; write to a tmp file first (avoid partial file in iCloud)
    const ok = sh('sips', ['-s', 'format', 'png', '-z', String(s.h), String(s.w), svgOut, '--out', tmpOut]);
    if (!ok) {
      console.warn('sips resize failed for', s.name, '- copying base PNG');
      fs.copyFileSync(svgOut, out);
      continue;
    }
    // Wait a bit if the file is not yet fully materialized (iCloud / FS delays)
    for (let i = 0; i < 10 && (!fs.existsSync(tmpOut) || fs.statSync(tmpOut).size < 24); i++) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
    // Validate tmp PNG and atomically move into place when possible
    let wrote = false;
    if (isValidPng(tmpOut)) {
      try { fs.renameSync(tmpOut, out); wrote = true; } catch { /* cross-volume */ }
      if (!wrote) { try { fs.copyFileSync(tmpOut, out); wrote = true; } catch {} }
    }
    if (!wrote) {
      console.warn('Invalid PNG generated for', s.name, '- copying base PNG');
      fs.copyFileSync(svgOut, out);
    }
    // Final verification: ensure out is a valid PNG; otherwise write a minimal 1×1 transparent PNG to avoid XML error views
    if (!isValidPng(out)) {
      console.warn('Final PNG invalid for', s.name, '- writing 1x1 transparent placeholder');
      const onePx = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C6360000002000150A5A4F50000000049454E44AE426082','hex');
      fs.writeFileSync(out, onePx);
    }
  }

  sh('iconutil', ['-c', 'icns', ICONSET, '-o', ICNS]);
  console.log('Icon(s) generated at', ICONSET, 'and', ICNS);
  return 0;
}

process.exit(main());

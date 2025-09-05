// Launcher: finds the Electron binary and runs gen-icon-main.js in Electron.
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let electronPath = require('electron'); // returns path to electron binary in Node
if (typeof electronPath !== 'string') {
  // In some environments require('electron') resolves to an object; try env var or common path
  electronPath = process.env.ELECTRON_BINARY || electronPath?.toString?.() || 'electron';
}
const mainPath = path.resolve(__dirname, 'gen-icon-main.js');

// Ensure build/ exists so icon can be written
const outDir = path.resolve(__dirname, '..', 'build');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
try {
  const res = spawnSync(electronPath, [mainPath], { stdio: 'inherit', env });
  process.exit(res.status || 0);
} catch (err) {
  console.warn('Icon generation failed, continuing without custom icon:', err.message || err);
  process.exit(0);
}

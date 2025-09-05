// Launcher: finds the Electron binary and runs gen-icon-main.js in Electron.
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const electronPath = require('electron'); // returns path to electron binary
const mainPath = path.resolve(__dirname, 'gen-icon-main.js');

// Ensure build/ exists so icon can be written
const outDir = path.resolve(__dirname, '..', 'build');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const res = spawnSync(electronPath, [mainPath], { stdio: 'inherit' });
process.exit(res.status || 0);

const { app, BrowserWindow, ipcMain, dialog, globalShortcut, screen, Menu, session, systemPreferences } = require('electron');
const fs = require('fs');
const path = require('path');
const siteCssStore = require('./main/siteCssStore');
const settingsStore = require('./main/settingsStore');
const os = require('os');

let siteCssEditorWindow = null; // dedicated editor window
let lastContentWin = null; // last focused CloudyWindow (content)

function openSiteCssEditorWindow() {
  if (siteCssEditorWindow && !siteCssEditorWindow.isDestroyed()) {
    siteCssEditorWindow.focus();
    return siteCssEditorWindow;
  }
  siteCssEditorWindow = new BrowserWindow({
    width: 800,
    height: 640,
    title: 'CloudyWindow - Site CSS',
    backgroundColor: '#1e1e1e',
    frame: true,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });
  siteCssEditorWindow.on('closed', () => { siteCssEditorWindow = null; });
  siteCssEditorWindow.loadFile('sitecss-editor.html');
  return siteCssEditorWindow;
}

let windows = new Set(); // Track all windows
let mainWindow; // The initial window
let appIcon = null; // Generated emoji icon

// Allow autoplay without gesture (audio in webviews)
try { app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); } catch {}
// Improve local file handling for webview file:// content (e.g., images, PDFs, HTML with relative assets)
try { app.commandLine.appendSwitch('allow-file-access-from-files'); } catch {}

async function generateEmojiIcon(emoji = '🌦️', size = 256) {
  // Create an offscreen window to render the emoji and capture as an image
  const iconWin = new BrowserWindow({
    width: size,
    height: size,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      offscreen: true,
    }
  });
  const html = `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;height:100%;width:100%;background:transparent;}
    body{display:flex;align-items:center;justify-content:center;}
    .e{font-size:${Math.floor(size*0.8)}px;line-height:1;}
    .e{font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', system-ui, sans-serif;}
  </style><div class="e">${emoji}</div>`;
  await iconWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  const image = await iconWin.capturePage();
  iconWin.destroy();
  return image.resize({ width: size, height: size });
}

function createWindow() {
  const newWindow = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    backgroundColor: '#00000001',
    hasShadow: false,
    icon: appIcon || undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Required for security
      nodeIntegration: false, // Disable nodeIntegration in renderer
      webviewTag: true // Enable <webview>
    }
  });

  // Store click-through state with the window
  newWindow.isClickThrough = false;

  newWindow.loadFile('index.html');

  // Set initial cursor visibility per settings
  try {
    const cfg = settingsStore.get();
    newWindow._cursorHidden = !!(cfg && cfg.startup && cfg.startup.hideCursor);
  } catch(_) { newWindow._cursorHidden = false; }
  
  // Add window to our collection
  windows.add(newWindow);
  
  // If this is the first window, set it as mainWindow
  if (!mainWindow) {
    mainWindow = newWindow;
  }

  // Update window menu when title changes
  newWindow.on('page-title-updated', updateWindowMenu);

  newWindow.on('closed', () => {
    windows.delete(newWindow);
    if (newWindow === mainWindow) {
      mainWindow = windows.size > 0 ? windows.values().next().value : null;
    }
    updateWindowMenu();
  });

  newWindow.on('focus', () => {
    // Rebuild menu so checkboxes reflect this window's state
    lastContentWin = newWindow;
    updateWindowMenu();
  });

  // Update menu to show new window
  updateWindowMenu();

  return newWindow;
}

// Move window resizing handler outside createWindow function
// This ensures it's only registered once
ipcMain.handle('set-window-size', (event, width, height) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setSize(width, height);
  }
});

// Provide full bounds get/set for precise frameless resizing
ipcMain.handle('get-window-bounds', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    return win.getBounds();
  }
  return null;
});

ipcMain.handle('set-window-bounds', (event, bounds) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && bounds) {
    win.setBounds(bounds);
  }
});

// Close the currently focused window
function closeCurrentWindow() {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.close();
  }
}

// Position window in a specific quadrant of the screen
function positionWindowInQuadrant(win, quadrant) {
  if (!win) return;
  
  // Use the work area of the display that contains the window (not always primary)
  const bounds = win.getBounds();
  const display = screen.getDisplayMatching(bounds) || screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const halfWidth = Math.floor(workArea.width / 2);
  const halfHeight = Math.floor(workArea.height / 2);
  
  switch (quadrant) {
    case 'top-left':
      win.setBounds({ 
        x: workArea.x, 
        y: workArea.y, 
        width: halfWidth, 
        height: halfHeight 
      });
      break;
    case 'top-right':
      win.setBounds({ 
        x: workArea.x + halfWidth, 
        y: workArea.y, 
        width: halfWidth, 
        height: halfHeight 
      });
      break;
    case 'bottom-left':
      win.setBounds({ 
        x: workArea.x, 
        y: workArea.y + halfHeight, 
        width: halfWidth, 
        height: halfHeight 
      });
      break;
    case 'bottom-right':
      win.setBounds({ 
        x: workArea.x + halfWidth, 
        y: workArea.y + halfHeight, 
        width: halfWidth, 
        height: halfHeight 
      });
      break;
    case 'bottom-right-1-16': {
      const w = Math.floor(workArea.width / 4);
      const h = Math.floor(workArea.height / 4);
      win.setBounds({
        x: workArea.x + workArea.width - w,
        y: workArea.y + workArea.height - h,
        width: w,
        height: h,
      });
      break;
    }
    case 'top-half':
      win.setBounds({ 
        x: workArea.x, 
        y: workArea.y, 
        width: workArea.width, 
        height: halfHeight 
      });
      break;
    case 'bottom-half':
      win.setBounds({ 
        x: workArea.x, 
        y: workArea.y + halfHeight, 
        width: workArea.width, 
        height: halfHeight 
      });
      break;
    case 'left-half':
      win.setBounds({ 
        x: workArea.x, 
        y: workArea.y, 
        width: halfWidth, 
        height: workArea.height 
      });
      break;
    case 'right-half':
      win.setBounds({ 
        x: workArea.x + halfWidth, 
        y: workArea.y, 
        width: halfWidth, 
        height: workArea.height 
      });
      break;
    case 'full-screen':
      win.setBounds({ 
        x: workArea.x, 
        y: workArea.y, 
        width: workArea.width, 
        height: workArea.height 
      });
      break;
    case 'center':
      // Center the window with 2/3 of screen size
      const centerWidth = Math.floor(workArea.width * 2/3);
      const centerHeight = Math.floor(workArea.height * 2/3);
      win.setBounds({
        x: workArea.x + Math.floor((workArea.width - centerWidth) / 2),
        y: workArea.y + Math.floor((workArea.height - centerHeight) / 2),
        width: centerWidth,
        height: centerHeight
      });
      break;
    case 'overscan-center-110': {
      // Centered at ~130% of work area to push site UI offscreen
      const w = Math.floor(workArea.width * 1.3);
      const h = Math.floor(workArea.height * 1);
      win.setBounds({
        x: workArea.x + Math.floor((workArea.width - w) / 2),
        y: workArea.y + Math.floor((workArea.height - h) / 2),
        width: w,
        height: h,
      });
      break;
    }
  }
}

// Create application menu
function createMenu() {
  const isMac = process.platform === 'darwin';
  const focusedWin = BrowserWindow.getFocusedWindow();
  const openSiteCssEditorWindow = () => {
    const win = new BrowserWindow({
      width: 800,
      height: 640,
      title: 'CloudyWindow - Site CSS',
      backgroundColor: '#1e1e1e',
      frame: true,
      transparent: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      }
    });
    win.loadFile('sitecss-editor.html');
  };
  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { label: 'Preferences', submenu: [
          { label: 'Set Startup File...', click: async () => {
              try {
                const w = BrowserWindow.getFocusedWindow() || mainWindow;
                if (!w) return;
                const res = await dialog.showOpenDialog(w, { properties: ['openFile'] });
                if (!res.canceled && res.filePaths && res.filePaths[0]) {
                  settingsStore.setStartupPath(res.filePaths[0]);
                }
              } catch(_) {}
            } },
          { label: 'Set Startup Folder...', click: async () => {
              try {
                const w = BrowserWindow.getFocusedWindow() || mainWindow;
                if (!w) return;
                const res = await dialog.showOpenDialog(w, { properties: ['openDirectory'] });
                if (!res.canceled && res.filePaths && res.filePaths[0]) {
                  settingsStore.setStartupPath(res.filePaths[0]);
                }
              } catch(_) {}
            } },
          { label: 'Clear Startup Target', click: () => { try { settingsStore.setStartupPath(null); } catch(_) {} } },
          { type: 'separator' },
          { label: 'Startup Mode', submenu: [
            { label: 'Normal', type: 'radio', checked: (settingsStore.get().startup.mode||'normal')==='normal', click:()=>settingsStore.setStartupMode('normal') },
            { label: 'Fullscreen', type: 'radio', checked: (settingsStore.get().startup.mode||'normal')==='fullscreen', click:()=>settingsStore.setStartupMode('fullscreen') },
            { label: 'Fill Screen', type: 'radio', checked: (settingsStore.get().startup.mode||'normal')==='fill-screen', click:()=>settingsStore.setStartupMode('fill-screen') },
            { label: 'Overscan Center', type: 'radio', checked: (settingsStore.get().startup.mode||'normal')==='overscan-center', click:()=>settingsStore.setStartupMode('overscan-center') },
          ]},
          { type: 'separator' },
          { label: 'Hide Cursor at Startup', type: 'checkbox', checked: !!settingsStore.get().startup.hideCursor, click: (mi)=>settingsStore.setStartupHideCursor(mi.checked) },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ] },
        { type: 'separator' },
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => { createWindow(); }
        },
        {
          label: 'New Fullscreen Window',
          accelerator: 'CmdOrCtrl+Alt+N',
          click: () => {
            const win = createWindow();
            // After creation, fill work area (same as Shift+F5)
            try { positionWindowInQuadrant(win, 'full-screen'); } catch(_) {}
          }
        },
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('open-file-shortcut');
          }
        },
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('open-folder-shortcut');
          }
        },
        { type: 'separator' },
        {
          label: 'Save Screenshot…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => {
            try {
              const win = BrowserWindow.getFocusedWindow();
              if (!win) return;
              const image = await win.capturePage();
              const ts = new Date();
              const pad = (n)=>String(n).padStart(2,'0');
              const name = `cloudy-screenshot-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.png`;
              const defaultDir = app.getPath('pictures') || app.getPath('documents') || app.getPath('downloads');
              const { canceled, filePath } = await dialog.showSaveDialog(win, {
                title: 'Save Screenshot',
                defaultPath: require('path').join(defaultDir, name),
                filters: [{ name: 'PNG Image', extensions: ['png'] }]
              });
              if (canceled || !filePath) return;
              require('fs').writeFileSync(filePath, image.toPNG());
            } catch (_) {}
          }
        },
        { type: 'separator' },
        { role: 'close' },
        ...(isMac ? [] : [{ role: 'quit' }])
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload Content',
          accelerator: 'CmdOrCtrl+Alt+R',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('reload-content');
          }
        },
        {
          label: 'Reload App',
          accelerator: 'Alt+Shift+R',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.reload();
          }
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Always on Top (This Window)',
          type: 'checkbox',
          accelerator: 'Alt+Shift+T',
          checked: !!focusedWin && focusedWin.isAlwaysOnTop(),
          enabled: !!focusedWin,
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              const next = !win.isAlwaysOnTop();
              win.setAlwaysOnTop(next);
              updateWindowMenu(); // Rebuild so visual state stays in sync
            }
          }
        },
        {
          label: 'Click-through Mode (This Window)',
          type: 'checkbox',
          accelerator: 'Alt+Shift+M',
          checked: !!focusedWin && !!focusedWin.isClickThrough,
          enabled: !!focusedWin,
          click: (menuItem) => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              // Keep internal state in sync with menu toggle
              win.isClickThrough = menuItem.checked;
              win.setIgnoreMouseEvents(menuItem.checked, { forward: true });
              win.webContents.send('ignore-mouse-events-changed', menuItem.checked);
              updateWindowMenu(); // Rebuild so visual state stays in sync
            }
          }
        },
        {
          label: 'Flash Border',
          accelerator: 'CmdOrCtrl+Alt+B',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('flash-border');
          }
        },
        {
          label: 'Background Opacity',
          submenu: [
            {
              label: '0% (fully transparent)',
              accelerator: 'Alt+Shift+0',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) { win.webContents.send('set-bg-opacity', 0.0); win.webContents.send('hard-flush'); }
              }
            },
            {
              label: '50%',
              accelerator: 'Alt+Shift+5',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) { win.webContents.send('set-bg-opacity', 0.5); win.webContents.send('hard-flush'); }
              }
            },
            {
              label: '100%',
              accelerator: 'Alt+Shift+1',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) { win.webContents.send('set-bg-opacity', 1.0); win.webContents.send('hard-flush'); }
              }
            },
            { type: 'separator' },
            {
              label: 'Decrease',
              accelerator: 'Alt+Shift+[',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('decrease-opacity');
              }
            },
            {
              label: 'Increase',
              accelerator: 'Alt+Shift+]',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('increase-opacity');
              }
            }
          ]
        },
        {
          label: 'Overall Opacity',
          submenu: [
            {
              label: '0%',
              accelerator: 'CmdOrCtrl+Alt+0',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) { win.webContents.send('set-overall-opacity', 0.0); }
              }
            },
            {
              label: '50%',
              accelerator: 'CmdOrCtrl+Alt+5',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) { win.webContents.send('set-overall-opacity', 0.5); }
              }
            },
            {
              label: '100%',
              accelerator: 'CmdOrCtrl+Alt+1',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) { win.webContents.send('set-overall-opacity', 1.0); }
              }
            },
            { type: 'separator' },
            {
              label: 'Decrease',
              accelerator: 'CmdOrCtrl+Alt+[',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('decrease-overall-opacity');
              }
            },
            {
              label: 'Increase',
              accelerator: 'CmdOrCtrl+Alt+]',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('increase-overall-opacity');
              }
            }
          ]
        },
        {
          label: 'Toggle UI',
          accelerator: 'CmdOrCtrl+Alt+U',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('toggle-ui-shortcut');
          }
        },
        {
          label: 'Hide Cursor (This Window)',
          type: 'checkbox',
          accelerator: 'Alt+Shift+H',
          checked: !!focusedWin && !!focusedWin._cursorHidden,
          enabled: !!focusedWin,
          click: (menuItem) => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win._cursorHidden = !!menuItem.checked;
              try { win.webContents.send('set-cursor-hidden', win._cursorHidden); } catch(_) {}
              updateWindowMenu();
            }
          }
        },
        {
          label: 'Go to URL Bar',
          accelerator: 'CmdOrCtrl+Alt+L',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('toggle-url-bar-shortcut');
          }
        },
        {
          label: 'Go to URL',
          accelerator: 'CmdOrCtrl+Alt+G',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('go-to-url');
          }
        },
        { type: 'separator' },
        {
          label: 'Developer',
          submenu: [
            {
              label: 'Start DOM/CSS Picker (This Window)',
              accelerator: 'CmdOrCtrl+Alt+P',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                const target = (win && siteCssEditorWindow && win.id === siteCssEditorWindow.id)
                  ? (lastContentWin || mainWindow || BrowserWindow.getAllWindows().find(w => w !== siteCssEditorWindow))
                  : win;
                if (target) { target.webContents.send('zap-css-start'); try { target.focus(); } catch (_) {} }
              }
            },
            { type: 'separator' },
            {
              label: 'Clear All Site CSS Rules',
              click: () => {
                try {
                  const p = siteCssStore.file || path.join(app.getPath('userData'), 'site-css.json');
                  fs.mkdirSync(path.dirname(p), { recursive: true });
                  fs.writeFileSync(p, JSON.stringify({version:1,rules:[]},null,2));
                  siteCssStore.reload();
                } catch(_) {}
              }
            },
            {
              label: 'Apply Transparency CSS',
              accelerator: 'CmdOrCtrl+Alt+T',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('apply-transparency-css');
              }
            },
            {
              label: 'Force P5LIVE Transparency (This Window)',
              accelerator: 'CmdOrCtrl+Alt+Shift+T',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('force-p5live-transparency');
              }
            },
            {
              label: 'Hard Flush Content',
              accelerator: 'CmdOrCtrl+Alt+F',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('hard-flush');
              }
            },
            { type: 'separator' },
            {
              label: 'Site CSS',
              submenu: [
                { label: 'Enable for Current Host', click: async () => { try { const win = BrowserWindow.getFocusedWindow() || lastContentWin || mainWindow; if (!win) return; const host = await win.webContents.executeJavaScript(`(()=>{try{const w=document.getElementById('content-frame');if(!w) return '';const u=(w.getURL?w.getURL():w.src)||'';return u?new URL(u).hostname:'';}catch(_){return ''}})()`); if (!host) return; const rules = siteCssStore.list(); rules.forEach(r => { const h=(r.match&&r.match.host||'').toLowerCase(); if (h===host.toLowerCase()) siteCssStore.update(r.id,{enabled:true}); }); } catch(_) {} } },
                { label: 'Disable for Current Host', click: async () => { try { const win = BrowserWindow.getFocusedWindow() || lastContentWin || mainWindow; if (!win) return; const host = await win.webContents.executeJavaScript(`(()=>{try{const w=document.getElementById('content-frame');if(!w) return '';const u=(w.getURL?w.getURL():w.src)||'';return u?new URL(u).hostname:'';}catch(_){return ''}})()`); if (!host) return; const rules = siteCssStore.list(); rules.forEach(r => { const h=(r.match&&r.match.host||'').toLowerCase(); if (h===host.toLowerCase()) siteCssStore.update(r.id,{enabled:false}); }); } catch(_) {} } },
                { type: 'separator' },
                {
                  label: 'Edit In-App…',
                  click: () => { openSiteCssEditorWindow(); }
                },
                {
                  label: 'Open Externally…',
                  click: async () => {
                    try {
                      try { siteCssStore.reload(); } catch (_) {}
                      const p = siteCssStore.file || path.join(app.getPath('userData'), 'site-css.json');
                      const { shell } = require('electron');
                      await shell.openPath(p);
                    } catch (_) {}
                  }
                },
                {
                  label: 'Reload Rules',
                  click: () => { try { siteCssStore.reload(); } catch (_) {} }
                }
              ]
            },
            { type: 'separator' },
            {
              label: 'Pre‑Draw Hard Flush',
              type: 'checkbox',
              click: (menuItem) => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('pre-draw-flush-toggle', menuItem.checked);
              }
            },
            {
              label: 'Canvas Safe Mode (disable accelerated 2D)',
              type: 'checkbox',
              click: (menuItem) => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('canvas-safe-mode', menuItem.checked);
              }
            },
            { type: 'separator' },
            {
              label: 'transparent window background',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) {
                  win.setBackgroundColor('#00000000');
                  win.webContents.send('window-bg-alpha', 0);
                  win.webContents.send('hard-flush');
                }
              }
            },
            {
              label: 'almost transparent window background',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) {
                  win.setBackgroundColor('#00000001');
                  win.webContents.send('window-bg-alpha', 1);
                  // no immediate flush needed; let changes settle
                }
              }
            }
          ]
        },
        {
          label: 'Open Developer Tools',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.openDevTools({ mode: 'detach' });
          }
        },
        
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          // Add this role to restore system window management features
          { role: 'windowMenu' }  
        ] : [
          { role: 'close' }
        ]),
        { type: 'separator' },
        {
          label: 'Custom Positioning',
          submenu: [
            {
              label: 'Center Window (Shift+F6)',
              accelerator: 'Shift+F6',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'center');
              }
            },
            {
              label: 'Fill Screen (Shift+F5)',
              accelerator: 'Shift+F5',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'full-screen');
              }
            },
            {
              label: 'Centered Overscan (Shift+F11)',
              accelerator: 'Shift+F11',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'overscan-center-110');
              }
            },
            { type: 'separator' },
            {
              label: 'Left Half (Shift+F7)',
              accelerator: 'Shift+F7',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'left-half');
              }
            },
            {
              label: 'Right Half (Shift+F10)',
              accelerator: 'Shift+F10',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'right-half');
              }
            },
            {
              label: 'Top Half (Shift+F8)',
              accelerator: 'Shift+F8',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'top-half');
              }
            },
            {
              label: 'Bottom Half (Shift+F9)',
              accelerator: 'Shift+F9',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'bottom-half');
              }
            },
            { type: 'separator' },
            {
              label: 'Top Left (Shift+F1)',
              accelerator: 'Shift+F1',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'top-left');
              }
            },
            {
              label: 'Top Right (Shift+F2)',
              accelerator: 'Shift+F2',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'top-right');
              }
            },
            {
              label: 'Bottom Left (Shift+F3)',
              accelerator: 'Shift+F3',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'bottom-left');
              }
            },
            {
              label: 'Bottom Right (Shift+F4)',
              accelerator: 'Shift+F4',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'bottom-right');
              }
            },
            { type: 'separator' },
            {
              label: 'Bottom Right 1/16 (Shift+F12)',
              accelerator: 'Shift+F12',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'bottom-right-1-16');
              }
            }
          ]
        }
        // Dynamic window list will be added here
      ]
    },
    {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://electronjs.org');
          }
        }
      ]
    }
  ];

  // Add dynamic window list to Window menu
  const windowMenu = template.find(item => item.label === 'Window');
  if (windowMenu && windowMenu.submenu) {
    // Add a separator if there are any windows
    if (windows.size > 0) {
      windowMenu.submenu.push({ type: 'separator' });
    }

    // Add each window to the menu (keep your existing window list code)
    let windowIndex = 1;
    for (const win of windows) {
      const isAlwaysOnTop = win.isAlwaysOnTop();
      const isClickThrough = !!win.isClickThrough;
      
      let statusIndicators = '';
      if (isClickThrough) statusIndicators += '👆';
      if (isAlwaysOnTop) statusIndicators += '📌';
      if (statusIndicators) statusIndicators += ' ';
      
      windowMenu.submenu.push({
        label: `${statusIndicators}Window ${windowIndex}`,
        type: 'radio',
        checked: win === BrowserWindow.getFocusedWindow(),
        click: () => {
          win.focus();
        }
      });
      windowIndex++;
    }
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Update menu when windows change
function updateWindowMenu() {
  createMenu();
}

app.whenReady().then(async () => {
  // Proactively request macOS mic/camera access (no-op on other platforms)
  try {
    if (process.platform === 'darwin') {
      try { await systemPreferences.askForMediaAccess('microphone'); } catch {}
      try { await systemPreferences.askForMediaAccess('camera'); } catch {}
    }
  } catch {}

  // Auto‑grant common permissions for content inside the webview
  try {
    const ses = session.defaultSession;
    ses.setPermissionRequestHandler((_wc, permission, callback, _details) => {
      const allow = [
        'media',           // legacy combined media
        'audioCapture',    // microphone
        'videoCapture',    // camera
        'displayCapture',  // screen share
        'midi',
        'midiSysex'
      ].includes(permission);
      callback(allow);
    });
    if (ses.setPermissionCheckHandler) {
      ses.setPermissionCheckHandler((_wc, permission, _origin, _details) => {
        return [
          'media', 'audioCapture', 'videoCapture', 'displayCapture', 'midi', 'midiSysex'
        ].includes(permission);
      });
    }
  } catch {}

  // Generate emoji icon before creating any windows
  try {
    appIcon = await generateEmojiIcon('🌦️', 256);
    if (process.platform === 'darwin' && appIcon) {
      app.dock.setIcon(appIcon);
    }
  } catch (e) {
    console.warn('Icon generation failed, continuing without custom icon', e);
  }

  // Create menu before creating any windows
  createMenu();

  createWindow();

  // Ensure any window.open / target=_blank from webviews opens as a CloudyWindow
  app.on('web-contents-created', (_event, contents) => {
    try {
      if (contents && contents.getType && contents.getType() === 'webview') {
        contents.setWindowOpenHandler((details) => {
          const url = details && details.url ? details.url : '';
          // Allow blob/data/about:blank popups so they retain the opener's
          // execution context (needed for blob: URLs like p5live's split view).
          // Make these popup windows match main CloudyWindow style: frameless + transparent.
          if (!url || url === 'about:blank' || url.startsWith('blob:') || url.startsWith('data:')) {
            return {
              action: 'allow',
              overrideBrowserWindowOptions: {
                width: 800,
                height: 600,
                transparent: true,
                frame: false,
                hasShadow: false,
                backgroundColor: '#00000001',
                webPreferences: {
                  contextIsolation: true,
                  nodeIntegration: false,
                  preload: path.join(__dirname, 'popup-preload.js')
                }
              }
            };
          }
          if (url && url !== 'about:blank') {
            try {
              const win = createWindow();
              win.webContents.once('did-finish-load', () => {
                try { win.webContents.send('navigate-to', url); } catch (_) {}
              });
            } catch (_) {}
          }
          // Always deny default popup for http/https; we handled it above
          return { action: 'deny' };
        });

        // When a popup is created (allowed above), inject a minimal transparency CSS fallback
        try {
          contents.on('did-create-window', (child, _details) => {
            try {
              child.webContents.on('dom-ready', () => {
                try {
                  child.webContents.insertCSS('html,body,video,canvas{background:transparent!important;background-color:transparent!important}');
                } catch (_) {}
              });
            } catch (_) {}
          });
        } catch (_) {}
      }
    } catch (_) {}
  });

  app.on('activate', () => {
    if (windows.size === 0) {
      createWindow();
    }
  });
  
  // Add IPC handlers for window management
  ipcMain.on('new-window', () => {
    createWindow();
  });
  
  ipcMain.on('close-window', () => {
    closeCurrentWindow();
  });

  // Global recovery shortcut: toggle click-through even when window can't get mouse focus
  globalShortcut.register('Alt+Shift+M', () => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow || BrowserWindow.getAllWindows()[0];
    if (win) {
      win.isClickThrough = !win.isClickThrough;
      win.setIgnoreMouseEvents(win.isClickThrough, { forward: true });
      win.webContents.send('ignore-mouse-events-changed', win.isClickThrough);
      updateWindowMenu();
    }
  });

  // Removed global Alt+M (menu accelerator provides the shortcut and shows it visibly)
});

// Lightweight debug logger: writes JSON lines to userData/cloudywindow.log
const { ipcMain: __ipcMainForDebug } = require('electron');
__ipcMainForDebug.handle('debug:log', (_event, payload) => {
  try {
    const logDir = app.getPath('userData');
    const logPath = path.join(logDir, 'cloudywindow.log');
    const line = JSON.stringify({ t: new Date().toISOString(), p: payload }, null, 0) + os.EOL;
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, line, 'utf8');
    return true;
  } catch (_) {
    return false;
  }
});

// Read a local text file (UTF-8). Accepts file:// URL or absolute path
ipcMain.handle('fs:read-text', async (_e, p) => {
  try {
    if (!p) return null;
    let f = String(p);
    if (f.startsWith('file://')) {
      try { f = new URL(f).pathname; } catch (_) {}
    }
    if (!fs.existsSync(f)) return null;
    const buf = fs.readFileSync(f);
    return buf.toString('utf8');
  } catch (_) { return null; }
});

// Import a dropped directory (no real path exposed) into a temp folder and return index path
ipcMain.handle('tempfs:import', async (_e, payload) => {
  try {
    const root = (payload && payload.rootName) ? String(payload.rootName) : 'drop';
    const files = Array.isArray(payload && payload.files) ? payload.files : [];
    if (!files.length) return { ok: false, error: 'no files' };
    const os = require('os');
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudy-drop-'));
    const base = path.join(tmpRoot, root);
    fs.mkdirSync(base, { recursive: true });
    for (const f of files) {
      const rel = String(f.path || f.name || '');
      if (!rel) continue;
      const dest = path.join(base, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      let buf;
      if (Buffer.isBuffer(f.data)) buf = f.data;
      else if (f.data && f.data.type === 'Buffer' && Array.isArray(f.data.data)) buf = Buffer.from(f.data.data);
      else if (f.data && f.data.buffer) buf = Buffer.from(f.data.buffer);
      else if (f.data && ArrayBuffer.isView(f.data)) buf = Buffer.from(f.data.buffer);
      else if (typeof f.data === 'string') buf = Buffer.from(f.data, 'base64');
      else buf = Buffer.from([]);
      fs.writeFileSync(dest, buf);
    }
    // Choose an index file
    let indexRel = 'index.html';
    const candidates = ['index.html','index.htm'];
    const found = files.map(f => String(f.path||f.name||'')).find(r => candidates.includes(path.basename(r).toLowerCase()));
    if (found) indexRel = found;
    const indexAbs = path.join(base, indexRel);
    return { ok: true, index: indexAbs };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
});

// Move IPC handlers outside of createWindow to avoid registering them multiple times
// Handle file opening - use event.sender to reply to the correct window
ipcMain.on('open-file', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    event.reply('selected-file', result.filePaths[0]);
  }
});

// Resolve an openable path: if directory, find index.html/htm; returns file path
ipcMain.handle('resolve-openable', async (_event, inputPath) => {
  try {
    if (!inputPath) return null;
    let p = inputPath;
    if (p.startsWith('file://')) p = new URL(p).pathname;
    if (!fs.existsSync(p)) return null;
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      const tryFiles = ['index.html', 'index.htm'];
      for (const f of tryFiles) {
        const full = path.join(p, f);
        if (fs.existsSync(full)) return full;
      }
      // fallback: first HTML in folder
      const entries = fs.readdirSync(p);
      const html = entries.find(e => e.toLowerCase().endsWith('.html') || e.toLowerCase().endsWith('.htm'));
      if (html) return path.join(p, html);
      return null;
    }
    return p;
  } catch (e) {
    return null;
  }
});

ipcMain.handle('open-folder-dialog', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const p = result.filePaths[0];
  return p;
});

// Site CSS IPC handlers
ipcMain.handle('site-css:start-picker', () => {
  try {
    const win = lastContentWin || mainWindow || (Array.from(windows)[0] || null);
    if (!win) return false;
    win.webContents.send('zap-css-start');
    try { win.focus(); } catch (_) {}
    return true;
  } catch (_) { return false; }
});
ipcMain.handle('site-css:stop-picker', () => {
  try {
    const win = lastContentWin || mainWindow || (Array.from(windows)[0] || null);
    if (!win) return false;
    win.webContents.send('zap-css-stop');
    return true;
  } catch (_) { return false; }
});
ipcMain.on('site-css:picker-result', (_e, payload) => {
  try {
    const ed = siteCssEditorWindow || openSiteCssEditorWindow();
    if (!ed) return;
    if (ed.webContents.isLoading()) {
      ed.webContents.once('did-finish-load', () => {
        try { ed.webContents.send('site-css:picker-result', payload); ed.focus(); } catch (_) {}
      });
    } else {
      ed.webContents.send('site-css:picker-result', payload);
      ed.focus();
    }
  } catch (_) {}
});
ipcMain.handle('site-css:read', () => {
  try {
    siteCssStore.ensureLoaded && siteCssStore.ensureLoaded();
    const p = siteCssStore.file || path.join(app.getPath('userData'), 'site-css.json');
    if (!fs.existsSync(p)) return JSON.stringify({ version: 1, rules: [] }, null, 2);
    return fs.readFileSync(p, 'utf8');
  } catch (_) {
    return JSON.stringify({ version: 1, rules: [] }, null, 2);
  }
});
ipcMain.handle('site-css:write', (_e, raw) => {
  try {
    const p = siteCssStore.file || path.join(app.getPath('userData'), 'site-css.json');
    let parsed;
    try { parsed = JSON.parse(String(raw)); } catch (err) { return { ok: false, error: String(err && err.message || err) }; }
    const pretty = JSON.stringify(parsed, null, 2);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, pretty, 'utf8');
    try { siteCssStore.reload(); } catch (_) {}
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
});
ipcMain.handle('site-css:get-matching', (_event, url) => {
  try { return siteCssStore.getMatching(url); } catch (_) { return []; }
});
ipcMain.handle('site-css:add', (_event, rule) => {
  try { return siteCssStore.add(rule); } catch (_) { return null; }
});
ipcMain.handle('site-css:list', () => {
  try { return siteCssStore.list(); } catch (_) { return []; }
});
ipcMain.handle('site-css:reload', () => {
  try { siteCssStore.reload(); return true; } catch (_) { return false; }
});
ipcMain.handle('site-css:open-file', async () => {
  try {
    const p = siteCssStore.file || path.join(app.getPath('userData'), 'site-css.json');
    const { shell } = require('electron');
    await shell.openPath(p);
    return p;
  } catch (_) {
    return null;
  }
});

let lastAutoZap = null;
ipcMain.handle('site-css:auto-add', (_e, payload) => {
  try {
    const host = payload && payload.host ? String(payload.host) : '';
    const css = payload && payload.cssText ? [String(payload.cssText)] : [];
    if (!host || css.length === 0) return { ok: false, error: 'invalid payload' };
    const rule = siteCssStore.add({ enabled: true, match: { host }, css, notes: payload.selector ? `Auto: ${payload.selector}` : 'Auto zap' });
    lastAutoZap = { id: rule.id, host };
    try { if (siteCssEditorWindow) siteCssEditorWindow.webContents.send('site-css:auto-added', { id: rule.id, host, cssText: css[0] }); } catch (_) {}
    return { ok: true, id: rule.id };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
});
ipcMain.handle('site-css:auto-undo', () => {
  try {
    if (!lastAutoZap || !lastAutoZap.id) return { ok: false, error: 'nothing to undo' };
    const removed = siteCssStore.remove(lastAutoZap.id);
    const ok = !!removed;
    lastAutoZap = null;
    return { ok };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
});

ipcMain.handle('site-css:reset-host', (_e, host) => {
  try {
    if (!host) return { ok: false, error: 'no host' };
    const rules = siteCssStore.list();
    let count = 0;
    for (const r of rules) {
      const h = r && r.match && r.match.host ? String(r.match.host).toLowerCase() : '';
      const isStarter = r && typeof r.id === 'string' && r.id.startsWith('starter-');
      if (!isStarter && h === String(host).toLowerCase()) {
        if (siteCssStore.remove(r.id)) count++;
      }
    }
    return { ok: true, removed: count };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
});

ipcMain.handle('site-css:compact-host', (_e, host) => {
  try { return { ok: siteCssStore.compactHost(host) }; } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
});
ipcMain.handle('site-css:set-host-enabled', (_e, host, enabled) => {
  try {
    if (!host) return { ok: false, error: 'no host' };
    const rules = siteCssStore.list();
    let count = 0;
    for (const r of rules) {
      const h = r && r.match && r.match.host ? String(r.match.host).toLowerCase() : '';
      if (h === String(host).toLowerCase()) { siteCssStore.update(r.id, { enabled: !!enabled }); count++; }
    }
    return { ok: true, updated: count };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
});
ipcMain.handle('site-css:clear-all', () => {
  try {
    const blank = JSON.stringify({ version: 1, rules: [] }, null, 2);
    const p = siteCssStore.file || path.join(app.getPath('userData'), 'site-css.json');
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, blank, 'utf8');
    siteCssStore.reload();
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
});

// Open a URL in a brand new CloudyWindow instance
ipcMain.handle('open-url-in-new-window', async (_event, url) => {
  try {
    const win = createWindow();
    // After index.html loads, ask the renderer to navigate the webview
    win.webContents.once('did-finish-load', () => {
      try { win.webContents.send('navigate-to', url); } catch (_) {}
    });
    return true;
  } catch (e) {
    return false;
  }
});

// (Removed) legacy navigate/load-url IPC were unused in current renderer

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});

app.on('browser-window-focus', updateWindowMenu);
  // Apply startup preferences to the first window
  try {
    const cfg = settingsStore.get();
    const win = mainWindow;
    if (win && cfg && cfg.startup) {
      // Startup mode
      const mode = cfg.startup.mode || 'normal';
      if (mode === 'fullscreen') {
        try { win.setFullScreen(true); } catch(_) {}
      } else if (mode === 'fill-screen') {
        try { positionWindowInQuadrant(win, 'full-screen'); } catch(_) {}
      } else if (mode === 'overscan-center') {
        try { positionWindowInQuadrant(win, 'overscan-center-110'); } catch(_) {}
      }
      // Hide cursor at startup (send after load)
      try {
        win.webContents.once('did-finish-load', () => {
          try { win.webContents.send('set-cursor-hidden', !!cfg.startup.hideCursor); } catch(_) {}
        });
      } catch(_) {}
      // Startup path
      let sp = cfg.startup.path;
      if (sp && typeof sp === 'string' && sp.trim()) {
        try {
          // Resolve directory -> index.html
          let p = sp;
          if (p.startsWith('file://')) p = new URL(p).pathname;
          if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
            const idx = ['index.html','index.htm'].map(f => path.join(p,f)).find(f => fs.existsSync(f));
            if (idx) p = idx;
          }
          const url = p.startsWith('file://') ? p : 'file://' + p;
          win.webContents.once('did-finish-load', () => {
            try { win.webContents.send('navigate-to', url); } catch(_) {}
          });
        } catch(_) {}
      }
    }
  } catch(_) {}

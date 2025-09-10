const { app, BrowserWindow, ipcMain, dialog, globalShortcut, screen, Menu, session, systemPreferences } = require('electron');
const fs = require('fs');
const path = require('path');

let windows = new Set(); // Track all windows
let mainWindow; // The initial window
let appIcon = null; // Generated emoji icon

// Allow autoplay without gesture (audio in webviews)
try { app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); } catch {}

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
  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+Alt+N',
          click: () => { createWindow(); }
        },
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+Alt+O',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('open-file-shortcut');
          }
        },
        {
          label: 'Open Folder...',
          accelerator: 'Alt+Shift+O',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('open-folder-shortcut');
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
              label: 'Decrease (Opt+Shift+[)',
              accelerator: 'Alt+Shift+[',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('decrease-opacity');
              }
            },
            {
              label: 'Increase (Opt+Shift+])',
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
              label: 'Decrease (Cmd+Opt+[)',
              accelerator: 'CmdOrCtrl+Alt+[',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('decrease-overall-opacity');
              }
            },
            {
              label: 'Increase (Cmd+Opt+])',
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
              label: 'Apply Transparency CSS',
              accelerator: 'CmdOrCtrl+Alt+T',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('apply-transparency-css');
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

// Move IPC handlers outside of createWindow to avoid registering them multiple times
// Handle file opening - use event.sender to reply to the correct window
ipcMain.on('open-file', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      { name: 'Web Content', extensions: ['html','htm','png','jpg','jpeg','gif','webp','svg','pdf'] }
    ]
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

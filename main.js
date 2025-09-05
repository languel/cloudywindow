const { app, BrowserWindow, ipcMain, dialog, globalShortcut, screen, Menu } = require('electron');
const fs = require('fs');
const path = require('path');

let windows = new Set(); // Track all windows
let mainWindow; // The initial window
let appIcon = null; // Generated emoji icon

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
    backgroundColor: '#00000000',
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
    // Update View menu when window is focused to reflect this window's state
    const viewMenu = Menu.getApplicationMenu()?.items.find(item => item.label === 'View');
    if (viewMenu) {
      const clickThroughItem = viewMenu.submenu.items.find(item => item.label === 'Click-through Mode');
      if (clickThroughItem) {
        clickThroughItem.checked = newWindow.isClickThrough;
      }
      const alwaysOnTopItem = viewMenu.submenu.items.find(item => item.label === 'Always on Top');
      if (alwaysOnTopItem) {
        alwaysOnTopItem.checked = newWindow.isAlwaysOnTop();
      }
    }
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
  
  // Get the primary display's work area (screen size minus taskbar/dock)
  const workArea = screen.getPrimaryDisplay().workArea;
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
  }
}

// Create application menu
function createMenu() {
  const isMac = process.platform === 'darwin';
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
          accelerator: 'CmdOrCtrl+N',
          click: () => { createWindow(); }
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
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('reload-content');
          }
        },
        {
          label: 'Reload App',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.reload();
          }
        },
        { 
          role: 'toggleDevTools',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I'
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Always on Top',
          type: 'checkbox',
          accelerator: 'Alt+T',
          click: (menuItem) => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.setAlwaysOnTop(menuItem.checked);
              updateWindowMenu(); // Update menu immediately
            }
          }
        },
        {
          label: 'Click-through Mode',
          type: 'checkbox',
          accelerator: 'Alt+M',
          click: (menuItem) => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              // Keep internal state in sync with menu toggle
              win.isClickThrough = menuItem.checked;
              win.setIgnoreMouseEvents(menuItem.checked, { forward: true });
              win.webContents.send('ignore-mouse-events-changed', menuItem.checked);
              updateWindowMenu(); // Update menu immediately
            }
          }
        },
        {
          label: 'Flash Border',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('flash-border');
          }
        },
        { type: 'separator' },
        {
          label: 'Background Opacity',
          submenu: [
            {
              label: '0% (fully transparent)',
              accelerator: 'Alt+Shift+0',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('set-bg-opacity', 0.0);
              }
            },
            {
              label: '50%',
              accelerator: 'Alt+Shift+5',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('set-bg-opacity', 0.5);
              }
            },
            {
              label: '100%',
              accelerator: 'Alt+Shift+1',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.webContents.send('set-bg-opacity', 1.0);
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
              label: '0% (fully transparent) — caution',
              accelerator: 'CmdOrCtrl+Shift+0',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.setOpacity(0.0);
              }
            },
            {
              label: '50%',
              accelerator: 'CmdOrCtrl+Shift+5',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.setOpacity(0.5);
              }
            },
            {
              label: '100%',
              accelerator: 'CmdOrCtrl+Shift+1',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) win.setOpacity(1.0);
              }
            },
            { type: 'separator' },
            {
              label: 'Decrease (Cmd+Alt+[)',
              accelerator: 'CmdOrCtrl+Alt+[',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) {
                  const cur = typeof win.getOpacity === 'function' ? win.getOpacity() : 1;
                  const next = Math.max(0.0, Math.min(1.0, cur - 0.1));
                  win.setOpacity(next);
                }
              }
            },
            {
              label: 'Increase (Cmd+Alt+])',
              accelerator: 'CmdOrCtrl+Alt+]',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) {
                  const cur = typeof win.getOpacity === 'function' ? win.getOpacity() : 1;
                  const next = Math.max(0.0, Math.min(1.0, cur + 0.1));
                  win.setOpacity(next);
                }
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Toggle UI',
          accelerator: 'CmdOrCtrl+Alt+U',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('toggle-ui-shortcut');
          }
        },
        {
          label: 'Toggle URL Bar',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('toggle-url-bar-shortcut');
          }
        },
        {
          label: 'Go to URL',
          accelerator: 'CmdOrCtrl+G',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('go-to-url');
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
              label: 'Bottom Right 1/16 (Shift+F9)',
              accelerator: 'Shift+F9',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'bottom-right-1-16');
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
      const viewMenu = Menu.getApplicationMenu()?.items.find(item => item.label === 'View');
      const clickThroughItem = viewMenu?.submenu.items.find(item => item.label === 'Click-through Mode');
      const isClickThrough = clickThroughItem?.checked || false;
      
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

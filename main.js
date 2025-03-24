const { app, BrowserWindow, ipcMain, dialog, globalShortcut, screen, Menu } = require('electron');
const path = require('path');

let windows = new Set(); // Track all windows
let mainWindow; // The initial window

function createWindow() {
  const newWindow = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Required for security
      nodeIntegration: false, // Disable nodeIntegration in renderer
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
        { role: 'new' },
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('open-file-shortcut');
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
        { role: 'reload' },
        { role: 'forceReload' },
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
              win.setIgnoreMouseEvents(menuItem.checked, { forward: true });
              win.webContents.send('ignore-mouse-events-changed', menuItem.checked);
              updateWindowMenu(); // Update menu immediately
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle UI',
          accelerator: 'CmdOrCtrl+U',
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
        { type: 'separator' },
        {
          label: 'Decrease Opacity',
          accelerator: 'CmdOrCtrl+[',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('decrease-opacity');
          }
        },
        {
          label: 'Increase Opacity',
          accelerator: 'CmdOrCtrl+]',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.send('increase-opacity');
          }
        }
      ]
    },
    {
      label: 'Window',
      role: 'window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ]),
        { type: 'separator' },
        {
          label: 'Center Window',
          accelerator: 'Shift+F6',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) positionWindowInQuadrant(win, 'center');
          }
        },
        { type: 'separator' },
        {
          label: 'Fill Screen',
          accelerator: 'Shift+F5',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) positionWindowInQuadrant(win, 'full-screen');
          }
        },
        { type: 'separator' },
        {
          label: 'Half-Screen Positioning',
          submenu: [
            {
              label: 'Left Half',
              accelerator: 'Shift+F7',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'left-half');
              }
            },
            {
              label: 'Right Half',
              accelerator: 'Shift+F10',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'right-half');
              }
            },
            {
              label: 'Top Half',
              accelerator: 'Shift+F8',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'top-half');
              }
            },
            {
              label: 'Bottom Half',
              accelerator: 'Shift+F9',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'bottom-half');
              }
            }
          ]
        },
        {
          label: 'Quarter-Screen Positioning',
          submenu: [
            {
              label: 'Top Left',
              accelerator: 'Shift+F1',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'top-left');
              }
            },
            {
              label: 'Top Right',
              accelerator: 'Shift+F2',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'top-right');
              }
            },
            {
              label: 'Bottom Left',
              accelerator: 'Shift+F3',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'bottom-left');
              }
            },
            {
              label: 'Bottom Right',
              accelerator: 'Shift+F4',
              click: () => {
                const win = BrowserWindow.getFocusedWindow();
                if (win) positionWindowInQuadrant(win, 'bottom-right');
              }
            }
          ]
        }
        // ... keep dynamic window list code after this
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

// Register keyboard shortcuts for always-on-top and click-through mode
function setupExtraShortcuts() {
  globalShortcut.register('Alt+T', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      const isAlwaysOnTop = win.isAlwaysOnTop();
      win.setAlwaysOnTop(!isAlwaysOnTop);
      
      // Update menu checkbox
      const viewMenu = Menu.getApplicationMenu().items.find(item => item.label === 'View');
      if (viewMenu) {
        const alwaysOnTopItem = viewMenu.submenu.items.find(item => item.label === 'Always on Top');
        if (alwaysOnTopItem) {
          alwaysOnTopItem.checked = !isAlwaysOnTop;
        }
      }
      updateWindowMenu(); // Update window menu immediately
    }
  });

  globalShortcut.register('Alt+M', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.isClickThrough = !win.isClickThrough;
      win.setIgnoreMouseEvents(win.isClickThrough, { forward: true });
      win.webContents.send('ignore-mouse-events-changed', win.isClickThrough);
      
      const viewMenu = Menu.getApplicationMenu().items.find(item => item.label === 'View');
      if (viewMenu) {
        const clickThroughItem = viewMenu.submenu.items.find(item => item.label === 'Click-through Mode');
        if (clickThroughItem) {
          clickThroughItem.checked = win.isClickThrough;
        }
      }
      updateWindowMenu(); // Update window menu immediately
    }
  });
}

app.whenReady().then(() => {
  // Create menu before creating any windows
  createMenu();
  setupExtraShortcuts();
  
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

  // Register global shortcuts
  // Use the sender's BrowserWindow for all keyboard shortcuts that target a specific window
  globalShortcut.register('CommandOrControl+O', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.send('open-file-shortcut');
  });

  globalShortcut.register('CommandOrControl+L', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.send('toggle-url-bar-shortcut');
  });

  globalShortcut.register('CommandOrControl+U', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.send('toggle-ui-shortcut');
  });

  globalShortcut.register('CommandOrControl+R', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.send('reload-content');
  });

  globalShortcut.register('CommandOrControl+W', () => {
    closeCurrentWindow();
  });

  globalShortcut.register('CommandOrControl+Shift+R', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.send('redraw-webview');
  });

  globalShortcut.register('CommandOrControl+N', () => {
    createWindow();
  });
  
  // Add new shortcut for "Go" navigation
  globalShortcut.register('CommandOrControl+G', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.send('go-to-url');
  });

  // Replace Cmd+Shift+number shortcuts with fn+shift+arrow combinations
  // Half-screen positioning
  globalShortcut.register('Shift+F8', () => { // fn+shift+up arrow
    const win = BrowserWindow.getFocusedWindow();
    if (win) positionWindowInQuadrant(win, 'top-half');
  });

  globalShortcut.register('Shift+F9', () => { // fn+shift+down arrow
    const win = BrowserWindow.getFocusedWindow();
    if (win) positionWindowInQuadrant(win, 'bottom-half');
  });

  globalShortcut.register('Shift+F7', () => { // fn+shift+left arrow
    const win = BrowserWindow.getFocusedWindow();
    if (win) positionWindowInQuadrant(win, 'left-half');
  });

  globalShortcut.register('Shift+F10', () => { // fn+shift+right arrow
    const win = BrowserWindow.getFocusedWindow();
    if (win) positionWindowInQuadrant(win, 'right-half');
  });

  // Quarter-screen positioning (using function keys as logical mapping)
  globalShortcut.register('Shift+F1', () => { // fn+shift+F1 (top-left)
    const win = BrowserWindow.getFocusedWindow();
    if (win) positionWindowInQuadrant(win, 'top-left');
  });

  globalShortcut.register('Shift+F2', () => { // fn+shift+F2 (top-right)
    const win = BrowserWindow.getFocusedWindow();
    if (win) positionWindowInQuadrant(win, 'top-right');
  });

  globalShortcut.register('Shift+F3', () => { // fn+shift+F3 (bottom-left)
    const win = BrowserWindow.getFocusedWindow();
    if (win) positionWindowInQuadrant(win, 'bottom-left');
  });

  globalShortcut.register('Shift+F4', () => { // fn+shift+F4 (bottom-right)
    const win = BrowserWindow.getFocusedWindow();
    if (win) positionWindowInQuadrant(win, 'bottom-right');
  });

  // Full screen and center positioning
  globalShortcut.register('Shift+F5', () => { // fn+shift+F5 (full-screen)
    const win = BrowserWindow.getFocusedWindow();
    if (win) positionWindowInQuadrant(win, 'full-screen');
  });

  globalShortcut.register('Shift+F6', () => { // fn+shift+F6 (center)
    const win = BrowserWindow.getFocusedWindow();
    if (win) positionWindowInQuadrant(win, 'center');
  });

  // Add keyboard shortcuts for opacity control
  globalShortcut.register('CommandOrControl+[', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.send('decrease-opacity');
  });

  globalShortcut.register('CommandOrControl+]', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.send('increase-opacity');
  });
});

// Move IPC handlers outside of createWindow to avoid registering them multiple times
// Handle file opening - use event.sender to reply to the correct window
ipcMain.on('open-file', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'HTML Files', extensions: ['html'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    event.reply('selected-file', result.filePaths[0]);
  }
});

// Handle navigation - use event.sender to determine the source window
ipcMain.on('navigate', (event, url) => {
  event.sender.send('navigate-to', url);
});

// Handle loading URLs - use event.sender to determine the source window
ipcMain.on('load-url', (event, url) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    console.log('Loading URL:', url); // Debug log in main process
    win.loadURL(url);
  }
});

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
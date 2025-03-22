const electron = require('electron');
const { 
  app, 
  BrowserWindow, 
  ipcMain, 
  globalShortcut, 
  dialog,
  Menu,
  screen
} = electron;
const path = require('path');
const fs = require('fs');

// Enable experimental features for permissions
app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('enable-web-bluetooth');
app.commandLine.appendSwitch('disable-features', 'mojo-js');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;
let currentURL = 'https://www.example.com'; // Track current URL
let windowState = {
  bounds: { width: 800, height: 600, x: 0, y: 0 }
};

// Listen for URL updates from renderer
ipcMain.on('url-updated', (event, newUrl) => {
  if (newUrl && !newUrl.includes('index.html')) {
    currentURL = newUrl;
    console.log('URL updated:', currentURL);
  }
});

function createWindow(options = {}) {
  // Get screen dimensions
  const primaryDisplay = electron.screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // Center window if no position specified
  if (!options.x && !options.y) {
    windowState.bounds.x = Math.floor((width - windowState.bounds.width) / 2);
    windowState.bounds.y = Math.floor((height - windowState.bounds.height) / 2);
  }
  
  // Default options - always use frameless window
  const windowOptions = {
    ...windowState.bounds,
    transparent: true,
    frame: false,
    titleBarStyle: 'hidden', // For macOS
    trafficLightPosition: { x: 10, y: 8 }, // For macOS traffic lights position
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      enableRemoteModule: false
    },
    ...options
  };
  
  // Create the browser window
  mainWindow = new BrowserWindow(windowOptions);
  
  // Save window state when it's moved or resized
  mainWindow.on('resize', () => {
    if (mainWindow) {
      windowState.bounds = mainWindow.getBounds();
    }
  });
  
  mainWindow.on('move', () => {
    if (mainWindow) {
      windowState.bounds = mainWindow.getBounds();
    }
  });
  
  // Load the index.html
  mainWindow.loadFile('index.html');
  
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('Main window loaded');
    
    // After the window loads, apply the current URL
    if (currentURL && currentURL !== 'https://www.example.com') {
      console.log('Restoring URL:', currentURL);
      mainWindow.webContents.send('load-last-url', currentURL);
    }
  });
  
  // Register global keyboard shortcuts
  registerShortcuts();
  
  // Create application menu
  createMenu();
  
  return mainWindow;
}

// Update the shortcut registration to avoid duplicates
function registerShortcuts() {
  // Unregister all existing shortcuts first
  globalShortcut.unregisterAll();
  
  // Focus URL bar (Cmd+K and Cmd+L)
  globalShortcut.register('CommandOrControl+K', () => {
    console.log('Global Cmd+K shortcut triggered');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('focus-url-bar');
    }
  });
  
  globalShortcut.register('CommandOrControl+L', () => {
    console.log('Global Cmd+L shortcut triggered');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('focus-url-bar');
    }
  });
  
  // Reload page (Cmd+R)
  globalShortcut.register('CommandOrControl+R', () => {
    console.log('Global Cmd+R shortcut triggered');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('reload-page');
    }
  });
  
  // Hard reload (Cmd+Shift+R)
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    console.log('Global Cmd+Shift+R shortcut triggered');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('hard-reload-page');
    }
  });
  
  // Toggle UI (Cmd+U) - fixed with delay and logging
  globalShortcut.register('CommandOrControl+U', () => {
    console.log('Global Cmd+U shortcut triggered');
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('Sending toggle-ui to renderer');
      
      // Send the toggle-ui message with a slight delay to ensure the renderer is ready
      setTimeout(() => {
        mainWindow.webContents.send('toggle-ui');
      }, 10);
      
      // Also send a second message as a backup mechanism
      setTimeout(() => {
        mainWindow.webContents.send('toggle-ui-backup');
      }, 50);
    }
  });
  
  // Fullscreen (F11 or Cmd+F)
  globalShortcut.register('F11', () => {
    console.log('Global F11 shortcut triggered');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('toggle-fullscreen');
    }
  });
  
  globalShortcut.register('CommandOrControl+F', () => {
    console.log('Global Cmd+F shortcut triggered');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('toggle-fullscreen');
    }
  });
  
  // Log which shortcuts were successfully registered
  console.log('URL bar shortcuts registered:', 
    globalShortcut.isRegistered('CommandOrControl+K'),
    globalShortcut.isRegistered('CommandOrControl+L')
  );

  // Add window management keyboard shortcuts
  // Half left screen
  globalShortcut.register('Alt+CommandOrControl+Left', () => {
    console.log('Window snap to left half');
    if (mainWindow && !mainWindow.isDestroyed()) {
      const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
      const newBounds = {
        x: 0,
        y: 0,
        width: Math.floor(width / 2),
        height: height
      };
      mainWindow.setBounds(newBounds);
      mainWindow.webContents.send('window-snap', 'left');
    }
  });

  // Half right screen
  globalShortcut.register('Alt+CommandOrControl+Right', () => {
    console.log('Window snap to right half');
    if (mainWindow && !mainWindow.isDestroyed()) {
      const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
      const newBounds = {
        x: Math.floor(width / 2),
        y: 0,
        width: Math.floor(width / 2),
        height: height
      };
      mainWindow.setBounds(newBounds);
      mainWindow.webContents.send('window-snap', 'right');
    }
  });

  // Full height, maintain x position
  globalShortcut.register('Alt+CommandOrControl+Up', () => {
    console.log('Window stretch full height');
    if (mainWindow && !mainWindow.isDestroyed()) {
      const { height } = electron.screen.getPrimaryDisplay().workAreaSize;
      const currentBounds = mainWindow.getBounds();
      const newBounds = {
        x: currentBounds.x,
        y: 0,
        width: currentBounds.width,
        height: height
      };
      mainWindow.setBounds(newBounds);
      mainWindow.webContents.send('window-snap', 'fullheight');
    }
  });

  // Center on screen
  globalShortcut.register('Alt+CommandOrControl+C', () => {
    console.log('Window center on screen');
    if (mainWindow && !mainWindow.isDestroyed()) {
      const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
      const currentBounds = mainWindow.getBounds();
      const newBounds = {
        x: Math.floor((width - currentBounds.width) / 2),
        y: Math.floor((height - currentBounds.height) / 2),
        width: currentBounds.width,
        height: currentBounds.height
      };
      mainWindow.setBounds(newBounds);
      mainWindow.webContents.send('window-snap', 'center');
    }
  });

  // Maximize window
  globalShortcut.register('Alt+CommandOrControl+M', () => {
    console.log('Window maximize');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.maximize();
      mainWindow.webContents.send('window-snap', 'maximize');
    }
  });
}

// Add a direct method that can be called from DevTools for testing
global.toggleUI = function() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('Manual toggle UI from DevTools');
    mainWindow.webContents.send('toggle-ui');
  }
}

// When sending IPC messages to toggle the UI, add a small delay to avoid race conditions
function toggleUISafely() {
  // Small delay to avoid potential race conditions with WebKit/Blink interface calls
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('toggle-ui');
      console.log('toggle-ui sent to renderer (with safety delay)');
    }
  }, 100);
}

// Handle window resizing
ipcMain.on('set-window-size', (event, width, height) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Before resizing, notify the renderer to prepare (hide content)
    mainWindow.webContents.send('resize-starting');
    
    // Resize with animation disabled to prevent artifacts
    mainWindow.setSize(width, height, false);
    
    // After resize is complete, notify the renderer
    setTimeout(() => {
      mainWindow.webContents.send('resize-complete');
    }, 100);
  }
});

// Handle file opening
ipcMain.on('open-file-dialog', () => {
  openFileDialog();
});

// Function to open file dialog
function openFileDialog() {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'HTML', extensions: ['htm', 'html'] },
      { name: 'PDF', extensions: ['pdf'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      mainWindow.webContents.send('selected-file', filePath);
    }
  }).catch(err => {
    console.error('Error opening file dialog:', err);
  });
}

// Handle navigation
ipcMain.on('navigate', (event, url) => {
  if (mainWindow) {
    mainWindow.webContents.send('navigate-to-url', url);
  }
});

// Listen for window management IPC events
ipcMain.on('minimize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.minimize();
  }
});

ipcMain.on('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.close();
  }
});

ipcMain.on('maximize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

// Create a new window function
function createNewWindow() {
  const newWindow = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    titleBarStyle: 'hidden', // Use hidden for macOS native window controls
    trafficLightPosition: { x: 10, y: 8 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  newWindow.loadFile('index.html');
  
  // Enable macOS window management features
  if (process.platform === 'darwin') {
    newWindow.setWindowButtonVisibility(false); // Hide default macOS traffic lights, we'll use our own
  }
}

// Handle create new window request
ipcMain.on('create-new-window', () => {
  createNewWindow();
});

// For now, new tab is same as new window since we don't have tab support yet
ipcMain.on('create-new-tab', () => {
  createNewWindow();
});

// Function to create application menu
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
    
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            openFileDialog();
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    
    // Edit menu
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
    
    // View menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle UI',
          accelerator: 'CmdOrCtrl+U',
          click: () => {
            toggleUISafely();
          }
        },
        {
          label: 'Focus URL Bar',
          accelerator: 'CmdOrCtrl+K',
          click: () => {
            mainWindow.webContents.send('focus-url-bar');
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    
    // Window menu
    {
      label: 'Window',
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
        ])
      ]
    },
    
    // Help menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/languel/cloudywindow');
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App lifecycle events
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Clean up shortcuts when app is quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  console.log('All shortcuts unregistered');
});

// Enable macOS window management keyboard shortcuts
app.on('ready', () => {
  // macOS window management shortcuts generally work by default
  console.log('Window management shortcuts should work by default on macOS');
});

console.log('Main process started');

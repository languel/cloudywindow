const { app, BrowserWindow, globalShortcut, ipcMain, dialog, Menu, screen } = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs')

// Enable experimental features for permissions
app.commandLine.appendSwitch('enable-experimental-web-platform-features')
app.commandLine.appendSwitch('enable-web-bluetooth')

let mainWindow
let currentURL = 'https://www.example.com' // Track current URL
let windowState = {
  bounds: { width: 800, height: 600, x: 0, y: 0 }
}

// Listen for URL updates from renderer
ipcMain.on('url-updated', (event, newUrl) => {
  if (newUrl && !newUrl.includes('index.html')) {
    currentURL = newUrl
    console.log('URL updated:', currentURL)
  }
})

function createWindow (options = {}) {
  // Get screen dimensions
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  
  // Center window if no position specified
  if (!options.x && !options.y) {
    windowState.bounds.x = Math.floor((width - windowState.bounds.width) / 2)
    windowState.bounds.y = Math.floor((height - windowState.bounds.height) / 2)
  }
  
  // Default options - always use frameless window
  const windowOptions = {
    ...windowState.bounds,
    transparent: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      enableRemoteModule: false
    },
    ...options
  }
  
  // Create the browser window
  mainWindow = new BrowserWindow(windowOptions)
  
  // Save window state when it's moved or resized
  mainWindow.on('resize', () => {
    if (mainWindow) {
      windowState.bounds = mainWindow.getBounds()
    }
  })
  
  mainWindow.on('move', () => {
    if (mainWindow) {
      windowState.bounds = mainWindow.getBounds()
    }
  })
  
  // Load the index.html
  mainWindow.loadFile('index.html')
  
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('Main window loaded')
    
    // After the window loads, apply the current URL
    if (currentURL && currentURL !== 'https://www.example.com') {
      console.log('Restoring URL:', currentURL)
      mainWindow.webContents.send('load-last-url', currentURL)
    }
  })
  
  // Register global keyboard shortcuts
  registerShortcuts()
  
  // Create application menu
  createMenu()
  
  return mainWindow
}

function registerShortcuts() {
  // Toggle URL bar
  globalShortcut.register('CommandOrControl+L', () => {
    mainWindow.webContents.send('toggle-url-bar')
  })
  
  // Toggle UI
  globalShortcut.register('CommandOrControl+U', () => {
    mainWindow.webContents.send('toggle-ui')
  })
  
  // Toggle fullscreen
  globalShortcut.register('F11', () => {
    mainWindow.setFullScreen(!mainWindow.isFullScreen())
  })
  
  // Open file
  globalShortcut.register('CommandOrControl+O', () => {
    openFileDialog();
  });
 // Clear webview content - No global shortcut, handled via ipcMain.handle
}

// Handle window resizing and toggling UI by briefly toggling fullscreen
ipcMain.on('set-window-size', (event, width, height) => {
 if (mainWindow) {
 mainWindow.setSize(width, height);
 // Briefly toggle fullscreen to force a redraw
 const isFullScreen = mainWindow.isFullScreen();
 mainWindow.setFullScreen(!isFullScreen);
 setTimeout(() => {
 mainWindow.setFullScreen(isFullScreen);
 }, 100);
 }
});

ipcMain.on('toggle-ui', () => {
 if (mainWindow) {
 // Briefly toggle fullscreen to force a redraw
 const isFullScreen = mainWindow.isFullScreen();
 mainWindow.setFullScreen(!isFullScreen);
 setTimeout(() => {
 mainWindow.setFullScreen(isFullScreen);
 }, 100);
 }
});

// Handle file opening
ipcMain.on('open-file-dialog', () => {
 openFileDialog()
})

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
 const filePath = result.filePaths[0]
 mainWindow.webContents.send('selected-file', filePath)
 }
 }).catch(err => {
 console.error('Error opening file dialog:', err)
 })
}

// Handle navigation
ipcMain.on('navigate', (event, url) => {
 if (mainWindow) {
 mainWindow.webContents.send('navigate-to-url', url)
 }
})

// Handle file reading
ipcMain.handle('read-file-data', async (event, filePath) => {
 try {
 const data = fs.readFileSync(filePath);
 return data.toString('base64');
 } catch (error) {
 console.error('Error reading file:', error);
 return null; // Or throw an error if you want to handle it in the renderer
 }
});

ipcMain.handle('clear-webview', async () => {
 console.log('Clearing webview from main process.');
 if (mainWindow && mainWindow.webContents) {
 mainWindow.webContents.executeJavaScript('document.body.innerHTML = ""');
 } else {
 console.log('mainWindow or webContents is null in main process.');
 }
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
            mainWindow.webContents.send('toggle-ui');
          }
        },
        {
          label: 'Toggle URL Bar',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            mainWindow.webContents.send('toggle-url-bar');
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

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// Clean up shortcuts when app is quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

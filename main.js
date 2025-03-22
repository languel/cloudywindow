const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
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

  newWindow.loadFile('index.html');
  
  // Add window to our collection
  windows.add(newWindow);
  
  // If this is the first window, set it as mainWindow
  if (!mainWindow) {
    mainWindow = newWindow;
  }

  newWindow.on('closed', () => {
    windows.delete(newWindow);
    if (newWindow === mainWindow) {
      mainWindow = windows.size > 0 ? windows.values().next().value : null;
    }
  });

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

app.whenReady().then(() => {
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
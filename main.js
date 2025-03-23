const { app, BrowserWindow, ipcMain, dialog, globalShortcut, screen } = require('electron');
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
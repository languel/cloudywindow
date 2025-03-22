const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
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

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle window resizing
    ipcMain.on('set-window-size', (event, width, height) => {
        if (mainWindow) {
            mainWindow.setSize(width, height);
        }
    });

    // Handle file opening
    ipcMain.on('open-file', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [{ name: 'HTML Files', extensions: ['html'] }]
        });

        if (!result.canceled && result.filePaths.length > 0) {
            event.reply('selected-file', result.filePaths[0]);
        }
    });
    
    // Handle navigation
    ipcMain.on('navigate', (event, url) => {
      mainWindow.webContents.send('navigate-to', url);
    });

    // Register global shortcuts
    globalShortcut.register('CommandOrControl+O', () => {
      mainWindow.webContents.send('open-file-shortcut');
    });

    globalShortcut.register('CommandOrControl+L', () => {
      mainWindow.webContents.send('toggle-url-bar-shortcut');
    });

    globalShortcut.register('CommandOrControl+U', () => {
      mainWindow.webContents.send('toggle-ui-shortcut');
    });
    
    globalShortcut.register('CommandOrControl+R', () => {
      mainWindow.webContents.reload();
    });

    globalShortcut.register('CommandOrControl+W', () => {
      app.quit();
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll()
})
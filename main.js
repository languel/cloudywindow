const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron')
const path = require('path')

// Enable experimental features for permissions
app.commandLine.appendSwitch('enable-experimental-web-platform-features')
app.commandLine.appendSwitch('enable-web-bluetooth')

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      enableRemoteModule: false
    }
  })

  mainWindow.loadFile('index.html')
  
  // Register global keyboard shortcuts
  registerShortcuts()
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
  
  // Toggle window frame
  globalShortcut.register('CommandOrControl+B', () => {
    toggleFrame()
  })
  
  // Toggle fullscreen
  globalShortcut.register('F11', () => {
    mainWindow.setFullScreen(!mainWindow.isFullScreen())
  })
}

function toggleFrame() {
  const isFramed = mainWindow.getContentBounds().x !== mainWindow.getBounds().x
  mainWindow.setFrame(!isFramed)
  mainWindow.webContents.send('frame-toggled', !isFramed)
}

// Handle window resizing
ipcMain.on('set-window-size', (event, width, height) => {
  if (mainWindow) {
    mainWindow.setSize(width, height)
  }
})

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

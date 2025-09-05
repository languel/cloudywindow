const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Use invoke to match ipcMain.handle in main process
    setWindowSize: (width, height) => ipcRenderer.invoke('set-window-size', width, height),
    getWindowBounds: () => ipcRenderer.invoke('get-window-bounds'),
    setWindowBounds: (bounds) => ipcRenderer.invoke('set-window-bounds', bounds),
    // Navigation IPC removed (unused)
    openFile: () => ipcRenderer.send('open-file'),
    onFileSelected: (callback) => ipcRenderer.on('selected-file', callback),
    onOpenFileShortcut: (callback) => ipcRenderer.on('open-file-shortcut', callback),
    onToggleUrlBarShortcut: (callback) => ipcRenderer.on('toggle-url-bar-shortcut', callback),
    onToggleUiShortcut: (callback) => ipcRenderer.on('toggle-ui-shortcut', callback),
    onRedrawWebview: (callback) => ipcRenderer.on('redraw-webview', callback),
    
    // Add Go shortcut handler
    onGoToUrl: (callback) => ipcRenderer.on('go-to-url', callback),
    
    // Add new window management methods
    newWindow: () => ipcRenderer.send('new-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
    onReloadContent: (callback) => ipcRenderer.on('reload-content', callback),
    
    // Add opacity control handlers
    onDecreaseOpacity: (callback) => ipcRenderer.on('decrease-opacity', callback),
    onIncreaseOpacity: (callback) => ipcRenderer.on('increase-opacity', callback),
    
    // Add handler for ignore mouse events changes
    onIgnoreMouseEventsChanged: (callback) => ipcRenderer.on('ignore-mouse-events-changed', callback)
});

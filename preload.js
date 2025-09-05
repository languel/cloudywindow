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
    onOpenFolderShortcut: (callback) => ipcRenderer.on('open-folder-shortcut', callback),
    onToggleUrlBarShortcut: (callback) => ipcRenderer.on('toggle-url-bar-shortcut', callback),
    onToggleUiShortcut: (callback) => ipcRenderer.on('toggle-ui-shortcut', callback),
    onRedrawWebview: (callback) => ipcRenderer.on('redraw-webview', callback),
    
    // Add Go shortcut handler
    onGoToUrl: (callback) => ipcRenderer.on('go-to-url', callback),
    
    // Add new window management methods
    newWindow: () => ipcRenderer.send('new-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
    onReloadContent: (callback) => ipcRenderer.on('reload-content', callback),
    
    // Add background opacity control handlers
    onDecreaseOpacity: (callback) => ipcRenderer.on('decrease-opacity', callback),
    onIncreaseOpacity: (callback) => ipcRenderer.on('increase-opacity', callback),
    onSetBgOpacity: (callback) => ipcRenderer.on('set-bg-opacity', callback),
    // Overall opacity handlers
    onSetOverallOpacity: (callback) => ipcRenderer.on('set-overall-opacity', callback),
    onIncreaseOverallOpacity: (callback) => ipcRenderer.on('increase-overall-opacity', callback),
    onDecreaseOverallOpacity: (callback) => ipcRenderer.on('decrease-overall-opacity', callback),
    
    // Add handler for ignore mouse events changes
    onIgnoreMouseEventsChanged: (callback) => ipcRenderer.on('ignore-mouse-events-changed', callback),
    onFlashBorder: (callback) => ipcRenderer.on('flash-border', callback),
    onHardFlush: (callback) => ipcRenderer.on('hard-flush', callback),
    // Resolve directories to index.html in main process
    resolveOpenable: (p) => ipcRenderer.invoke('resolve-openable', p),
    openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
    // Provide absolute path to webview preload script
    getWebviewPreloadPath: () => require('path').join(__dirname, 'webview-preload.js')
});

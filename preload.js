const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    setWindowSize: (width, height) => ipcRenderer.send('set-window-size', width, height),
    updateURL: (url) => ipcRenderer.send('update-url', url),
    onLoadLastUrl: (callback) => ipcRenderer.on('load-last-url', callback),
    navigate: (url) => ipcRenderer.send('navigate', url),
    onNavigateTo: (callback) => ipcRenderer.on('navigate-to', callback),
    openFile: () => ipcRenderer.send('open-file'),
    onFileSelected: (callback) => ipcRenderer.on('selected-file', callback),
    clearIframe: () => ipcRenderer.invoke('clear-iframe'),
    onOpenFileShortcut: (callback) => ipcRenderer.on('open-file-shortcut', callback),
    onToggleUrlBarShortcut: (callback) => ipcRenderer.on('toggle-url-bar-shortcut', callback),
    onToggleUiShortcut: (callback) => ipcRenderer.on('toggle-ui-shortcut', callback),
    onRedrawWebview: (callback) => ipcRenderer.on('redraw-webview', callback),
    
    // Add Go shortcut handler
    onGoToUrl: (callback) => ipcRenderer.on('go-to-url', callback),
    
    // Add new window management methods
    newWindow: () => ipcRenderer.send('new-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
    
    loadURL: (url) => ipcRenderer.send('load-url', url),
    
    onReloadContent: (callback) => ipcRenderer.on('reload-content', callback)
});
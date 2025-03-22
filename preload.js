/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Version information
  versions: {
    chrome: () => process.versions.chrome,
    node: () => process.versions.node,
    electron: () => process.versions.electron
  },
  
  // UI toggling
  onToggleUrlBar: (callback) => ipcRenderer.on('toggle-url-bar', callback),
  onToggleUI: (callback) => ipcRenderer.on('toggle-ui', callback),
  // Remove frame toggle functionality
  
  // Window management
  setWindowSize: (width, height) => ipcRenderer.send('set-window-size', width, height),
  
  // URL management
  updateURL: (url) => ipcRenderer.send('url-updated', url),
  onLoadLastUrl: (callback) => ipcRenderer.on('load-last-url', callback),
  
  // Navigation
  navigate: (url) => ipcRenderer.send('navigate', url),
  onNavigateTo: (callback) => ipcRenderer.on('navigate-to-url', callback),
  // File operations
  openFile: () => ipcRenderer.send('open-file-dialog'),
  onFileSelected: (callback) => ipcRenderer.on('selected-file', callback),
  readFileData: (filePath) => ipcRenderer.invoke('read-file-data', filePath),
  clearWebview: () => ipcRenderer.invoke('clear-webview'),
})

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})

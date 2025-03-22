/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// Log the current directory and app paths for debugging
const appPath = require('electron').remote?.app.getAppPath() || process.cwd();
const userDataPath = require('electron').remote?.app.getPath('userData') || '';

console.log('App path:', appPath);
console.log('User data path:', userDataPath);

// Resolve app resources path
function resolveAppPath(relativePath) {
    // Try multiple base directories to find the file
    const possiblePaths = [
        path.join(appPath, relativePath),
        path.join(process.cwd(), relativePath),
        path.join(__dirname, relativePath)
    ];
    
    // Log all possible paths
    console.log('Possible paths for:', relativePath, possiblePaths);
    
    // Find first existing path
    for (const filePath of possiblePaths) {
        try {
            if (fs.existsSync(filePath)) {
                console.log('Found existing path:', filePath);
                return filePath;
            }
        } catch (err) {
            console.log('Error checking path:', filePath, err);
        }
    }
    
    // Default to first path if none exist
    console.log('No existing path found, using:', possiblePaths[0]);
    return possiblePaths[0];
}

// Expose functions to renderer
contextBridge.exposeInMainWorld('electronPath', {
    resolveAppFile: (relativePath) => resolveAppPath(relativePath),
    getDefaultHtmlPath: () => {
        const defaultHtmlPath = resolveAppPath('default.html');
        console.log('Default HTML path:', defaultHtmlPath);
        return 'file://' + defaultHtmlPath.replace(/\\/g, '/');
    }
});

// Log preload script execution
console.log('Preload script running');

// Expose IPC functions to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Listen for events from main process
  onFocusUrlBar: (callback) => {
    console.log('Registering focus-url-bar handler in preload');
    ipcRenderer.on('focus-url-bar', (event, ...args) => {
      console.log('focus-url-bar received in preload, forwarding to renderer');
      callback(event, ...args);
    });
  },
  onToggleUI: (callback) => {
    console.log('Registering toggle-ui handler in preload');
    ipcRenderer.on('toggle-ui', (event) => {
      console.log('Toggle UI IPC received in preload');
      if (typeof callback === 'function') {
        callback(event);
      }
    });
  },
  // Add backup toggle handler
  onToggleUIBackup: (callback) => {
    console.log('Registering toggle-ui-backup handler in preload');
    ipcRenderer.on('toggle-ui-backup', (event) => {
      console.log('Toggle UI Backup IPC received in preload');
      if (typeof callback === 'function') {
        callback(event);
      }
    });
  },
  onReloadPage: (callback) => {
    ipcRenderer.on('reload-page', (event, ...args) => callback(event, ...args));
  },
  onHardReloadPage: (callback) => {
    ipcRenderer.on('hard-reload-page', (event, ...args) => callback(event, ...args));
  },
  onToggleFullscreen: (callback) => {
    ipcRenderer.on('toggle-fullscreen', (event, ...args) => callback(event, ...args));
  },
  onNavigateBack: (callback) => {
    ipcRenderer.on('navigate-back', (event, ...args) => callback(event, ...args));
  },
  onNavigateForward: (callback) => {
    ipcRenderer.on('navigate-forward', (event, ...args) => callback(event, ...args));
  },
  onToggleFrame: (callback) => {
    ipcRenderer.on('toggle-frame', (event, ...args) => callback(event, ...args));
  },
  onNavigateTo: (callback) => {
    ipcRenderer.on('navigate-to-url', (event, ...args) => callback(event, ...args));
  },
  onLoadLastUrl: (callback) => {
    ipcRenderer.on('load-last-url', (event, ...args) => callback(event, ...args));
  },
  onFileSelected: (callback) => {
    ipcRenderer.on('selected-file', (event, ...args) => callback(event, ...args));
  },
  
  onResizeStarting: (callback) => {
    ipcRenderer.on('resize-starting', (event, ...args) => callback(event, ...args));
  },
  
  onResizeComplete: (callback) => {
    ipcRenderer.on('resize-complete', (event, ...args) => callback(event, ...args));
  },
  
  // Add window snap event handler
  onWindowSnap: (callback) => {
    ipcRenderer.on('window-snap', (event, position) => callback(event, position));
  },
  
  // Send events to main process
  loadUrl: (url) => ipcRenderer.send('load-url', url),
  sendLog: (message) => ipcRenderer.send('log-message', message),
  updateURL: (url) => ipcRenderer.send('url-updated', url),
  setWindowSize: (width, height) => ipcRenderer.send('set-window-size', width, height),
  openFile: () => ipcRenderer.send('open-file-dialog'),
  
  // Window control functions
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  
  // New tab and window functions
  createNewTab: () => ipcRenderer.send('create-new-tab'),
  createNewWindow: () => ipcRenderer.send('create-new-window'),

  // Add custom events for UI actions
  onToggleUIEvent: (callback) => {
    document.addEventListener('app-toggle-ui', callback);
  },
  
  onFocusUrlBarEvent: (callback) => {
    document.addEventListener('app-focus-url-bar', callback);
  },
  
  // Add direct UI control methods
  toggleUI: () => {
    console.log('toggleUI triggered from renderer');
    // The renderer can directly toggle UI without IPC
  },
  
  focusUrlBar: () => {
    document.dispatchEvent(new CustomEvent('app-focus-url-bar'));
  },

  manualToggleUI: () => {
    console.log('Manual toggle UI triggered');
    document.dispatchEvent(new CustomEvent('manual-toggle-ui'));
  }
});

// Log initialization complete
console.log('Preload initialization complete');

// Add window snap event handler
ipcRenderer.on('window-snap', (event, position) => {
    // Pass window snap events to the renderer
});

// Enhance the handling of toggle-ui messages
ipcRenderer.on('toggle-ui', (event) => {
    // Forward to any registered handler
    console.log('Received toggle-ui IPC message from main process');
    document.dispatchEvent(new CustomEvent('app-toggle-ui'));
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})

// Log when preload script is loaded
console.log('Preload script loaded and initialized');

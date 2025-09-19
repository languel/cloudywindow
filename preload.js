const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Use invoke to match ipcMain.handle in main process
    setWindowSize: (width, height) => ipcRenderer.invoke('set-window-size', width, height),
    getWindowBounds: () => ipcRenderer.invoke('get-window-bounds'),
    setWindowBounds: (bounds) => ipcRenderer.invoke('set-window-bounds', bounds),
    // Legacy/utility navigation events
    onNavigateTo: (callback) => ipcRenderer.on('navigate-to', callback),
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
    onApplyTransparencyCSS: (callback) => ipcRenderer.on('apply-transparency-css', callback),
    onForceP5LiveTransparency: (callback) => ipcRenderer.on('force-p5live-transparency', callback),
    onWindowBgAlpha: (callback) => ipcRenderer.on('window-bg-alpha', callback),
    onCanvasSafeMode: (callback) => ipcRenderer.on('canvas-safe-mode', callback),
    onPreDrawFlushToggle: (callback) => ipcRenderer.on('pre-draw-flush-toggle', callback),
    onOpenSiteCssEditor: (callback) => ipcRenderer.on('open-site-css-editor', callback),
    onZapCssStart: (callback) => ipcRenderer.on('zap-css-start', callback),
    onZapCssStop: (callback) => ipcRenderer.on('zap-css-stop', callback),
    // Resolve directories to index.html in main process
    resolveOpenable: (p) => ipcRenderer.invoke('resolve-openable', p),
    openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
    // Open a URL in a brand new CloudyWindow
    openUrlInNewWindow: (url) => ipcRenderer.invoke('open-url-in-new-window', url),
    // Site CSS APIs
    siteCssRead: () => ipcRenderer.invoke('site-css:read'),
    siteCssWrite: (raw) => ipcRenderer.invoke('site-css:write', raw),
    siteCssGetMatching: (url) => ipcRenderer.invoke('site-css:get-matching', url),
    siteCssAdd: (rule) => ipcRenderer.invoke('site-css:add', rule),
    siteCssList: () => ipcRenderer.invoke('site-css:list'),
    siteCssReload: () => ipcRenderer.invoke('site-css:reload'),
    siteCssOpenFile: () => ipcRenderer.invoke('site-css:open-file'),
    siteCssStartPicker: () => ipcRenderer.invoke('site-css:start-picker'),
    siteCssStopPicker: () => ipcRenderer.invoke('site-css:stop-picker'),
    siteCssPickerResult: (payload) => ipcRenderer.send('site-css:picker-result', payload),
    siteCssAutoAdd: (payload) => ipcRenderer.invoke('site-css:auto-add', payload),
    siteCssAutoUndo: () => ipcRenderer.invoke('site-css:auto-undo'),
    siteCssResetHost: (host) => ipcRenderer.invoke('site-css:reset-host', host),
    siteCssCompactHost: (host) => ipcRenderer.invoke('site-css:compact-host', host),
    siteCssSetHostEnabled: (host, enabled) => ipcRenderer.invoke('site-css:set-host-enabled', host, enabled),
    siteCssClearAll: () => ipcRenderer.invoke('site-css:clear-all'),
    siteCssGetCurrentHost: () => ipcRenderer.invoke('site-css:get-current-host'),
    onSiteCssPickerResult: (callback) => ipcRenderer.on('site-css:picker-result', callback),
    onSiteCssAutoAdded: (callback) => ipcRenderer.on('site-css:auto-added', callback),
    // Provide absolute path to webview preload script
    getWebviewPreloadPath: () => require('path').join(__dirname, 'webview-preload.js'),
    // Minimal debug logging to main (writes to userData/cloudywindow.log)
    debugLog: (message, extra) => ipcRenderer.invoke('debug:log', { message, extra }),
    // Read a local text file as UTF-8
    readTextFile: (p) => ipcRenderer.invoke('fs:read-text', p),
    // Temp FS import: write a virtual folder into a temp dir and return index path
    tempfsImport: (payload) => ipcRenderer.invoke('tempfs:import', payload)
});

// Ensure the <webview> uses an absolute preload path even in packaged apps
try {
  const { join } = require('path');
  const absWvPreload = join(__dirname, 'webview-preload.js');
  const looksAbsolute = (p) => !!p && /^(file:|\/|[A-Za-z]:\\)/.test(p);
  window.addEventListener('DOMContentLoaded', () => {
    try {
      const wv = document.getElementById('content-frame');
      if (!wv) return;
      const cur = wv.getAttribute('preload');
      if (!looksAbsolute(cur) || cur !== absWvPreload) {
        wv.setAttribute('preload', absWvPreload);
        // If content already loaded, trigger a light reload so the guest picks up the preload
        try {
          if (typeof wv.reload === 'function') {
            wv.reload();
          } else {
            const u = (wv.getURL && wv.getURL()) || wv.src;
            if (u) wv.src = u;
          }
        } catch (_) {}
      }
    } catch (_) {}
  });
} catch (_) {}

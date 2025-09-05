const iframe = document.getElementById('content-frame'); // now a <webview>
const dropOverlay = document.getElementById('drop-overlay');
const urlInput = document.getElementById('url-input');
const goButton = document.getElementById('go-button');
const backButton = document.getElementById('back-button');
const forwardButton = document.getElementById('forward-button');
const reloadButton = document.getElementById('reload-button');
const openFileButton = document.getElementById('open-file-button');
const newWindowButton = document.getElementById('new-window-button');
const closeWindowButton = document.getElementById('close-window-button');
const toggleUiButton = document.getElementById('toggle-ui-button');
const uiContainer = document.getElementById('ui-container');
const frameFlash = document.getElementById('frame-flash');
const contentRoot = document.getElementById('content-root');

// Add variables to track window opacity
let currentOpacity = 0.0; // Default opacity: fully transparent
const MIN_OPACITY = 0.0;  // Allow fully transparent window
const MAX_OPACITY = 1.0;  // Maximum opacity: 100%
const OPACITY_STEP = 0.05; // Finer steps to avoid jumpy fades

// Function to set the background opacity
function setBackgroundOpacity(opacity) {
  // Ensure opacity is within bounds
  opacity = Math.max(MIN_OPACITY, Math.min(MAX_OPACITY, opacity));
  currentOpacity = opacity;

  // Apply opacity to the backdrop layer (behind content)
  const backdrop = document.getElementById('backdrop');
  if (backdrop) {
    backdrop.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
  }
  // Aggressive flush to avoid any compositor afterimages
  hardFlushWebview();
}

function decreaseOpacity() {
  setBackgroundOpacity(currentOpacity - OPACITY_STEP);
}

function increaseOpacity() {
  setBackgroundOpacity(currentOpacity + OPACITY_STEP);
}

// Force the iframe to re-composite to avoid transparency artifacts on some GPUs
function forceIframeRedraw() {
  if (!iframe) return;
  // Strategy: briefly hide the webview to drop its compositor cache, then restore next frame.
  const prevVis = iframe.style.visibility || '';
  iframe.style.visibility = 'hidden';
  // Force reflow
  void iframe.offsetHeight;
  requestAnimationFrame(() => {
    iframe.style.visibility = prevVis;
  });
}

function navigateToUrl(url) {
  console.log('navigateToUrl called with:', url);
  if (!url) return;
    let fullUrl = url;
    if (!/^https?:\/\//i.test(url) && !url.startsWith('file://')) {
        fullUrl = 'http://' + url;
    }
    // Ensure webview has a valid absolute preload path
    try {
      const absPreload = window.electronAPI.getWebviewPreloadPath && window.electronAPI.getWebviewPreloadPath();
      if (absPreload && !iframe.getAttribute('preload')) {
        iframe.setAttribute('preload', absPreload);
      }
    } catch (_) {}
    if (typeof iframe.loadURL === 'function') {
      iframe.loadURL(fullUrl);
    } else {
      iframe.src = fullUrl;
    }
    urlInput.value = fullUrl;
}

function openLocalFile(filePath) {
    if (!filePath) return;
    // Normalize possible file:// prefix
    const fileUrl = filePath.startsWith('file://') ? filePath : 'file://' + filePath;
    navigateToUrl(fileUrl);
}

let dragCounter = 0;

function showDropOverlay() {
  if (!dropOverlay) return;
  dropOverlay.classList.add('active');
}

function hideDropOverlay() {
  dragCounter = 0;
  if (!dropOverlay) return;
  dropOverlay.classList.remove('active');
}

function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    hideDropOverlay();

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
        const file = files[0];
        const rawPath = file.path;
        // Ask main to resolve directories (index.html) etc.
        window.electronAPI.resolveOpenable(rawPath).then(resolved => {
          if (resolved) {
            openLocalFile(resolved);
          } else {
            // As a fallback, attempt to use file path directly
            openLocalFile(rawPath);
          }
        });
        return;
    }

    // Check for URI list (file:/// or http(s) URLs)
    const uriList = event.dataTransfer.getData('text/uri-list');
    if (uriList) {
        const first = uriList.split('\n')[0].trim();
        if (first.startsWith('file://')) {
          // Resolve folder index via main
          window.electronAPI.resolveOpenable(first).then(resolved => {
            if (resolved) openLocalFile(resolved); else openLocalFile(first);
          });
          return;
        }
        return navigateToUrl(first);
    }

    // Check for plain text
    const text = event.dataTransfer.getData('text/plain');
    if (text) {
        try {
            new URL(text);
            navigateToUrl(text);
        } catch (_) {
            // Likely a local filesystem path; resolve via main
            window.electronAPI.resolveOpenable(text).then(resolved => {
              if (resolved) openLocalFile(resolved); else openLocalFile(text);
            });
        }
    }
}

function toggleUI() {
  if (uiContainer.style.visibility === 'hidden' || uiContainer.style.visibility === '') {
    uiContainer.style.visibility = 'visible';
    uiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0)'; // Semi-transparent background
  } else {
    uiContainer.style.backgroundColor = 'transparent';
    uiContainer.style.visibility = 'hidden';
  }
  // Hard flush to prevent afterimages
  hardFlushWebview();
}

function setupResizeHandlers() {
    const MIN_W = 240;
    const MIN_H = 160;
    const handleMap = {
      'resize-top': { top: true },
      'resize-right': { right: true },
      'resize-bottom': { bottom: true },
      'resize-left': { left: true },
      'resize-top-left': { top: true, left: true },
      'resize-top-right': { top: true, right: true },
      'resize-bottom-right': { bottom: true, right: true },
      'resize-bottom-left': { bottom: true, left: true },
    };

    let resizing = false;
    let startMouse = { x: 0, y: 0 };
    let startBounds = null;
    let activeEdges = null;

    const onMouseMove = async (e) => {
      if (!resizing || !startBounds || !activeEdges) return;
      const dx = e.screenX - startMouse.x;
      const dy = e.screenY - startMouse.y;

      let { x, y, width, height } = startBounds;

      if (activeEdges.left) {
        x = startBounds.x + dx;
        width = startBounds.width - dx;
        if (width < MIN_W) {
          x = startBounds.x + (startBounds.width - MIN_W);
          width = MIN_W;
        }
      }
      if (activeEdges.right) {
        width = startBounds.width + dx;
        if (width < MIN_W) width = MIN_W;
      }
      if (activeEdges.top) {
        y = startBounds.y + dy;
        height = startBounds.height - dy;
        if (height < MIN_H) {
          y = startBounds.y + (startBounds.height - MIN_H);
          height = MIN_H;
        }
      }
      if (activeEdges.bottom) {
        height = startBounds.height + dy;
        if (height < MIN_H) height = MIN_H;
      }

      await window.electronAPI.setWindowBounds({ x, y, width, height });
    };

    const onMouseUp = () => {
      if (!resizing) return;
      resizing = false;
      startBounds = null;
      activeEdges = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp, true);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    const startResize = async (edges, cursor, e) => {
      e.preventDefault();
      e.stopPropagation();
      resizing = true;
      activeEdges = edges;
      startMouse = { x: e.screenX, y: e.screenY };
      startBounds = await window.electronAPI.getWindowBounds();
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp, true);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = cursor || 'default';
    };

    Object.entries(handleMap).forEach(([id, edges]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('mousedown', (e) => {
        const cursor = getComputedStyle(el).cursor;
        startResize(edges, cursor, e);
      });
    });
}

function clearIframeContent() {
    iframe.src = 'about:blank';
}

// Aggressive flush: briefly remove the webview from flow to drop compositor cache, then restore
function hardFlushWebview() {
  if (!iframe) return;
  const prev = iframe.style.display || '';
  iframe.style.display = 'none';
  // Force reflow
  void iframe.offsetHeight;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      iframe.style.display = prev;
    });
  });
}

// Event Listeners
goButton.addEventListener('click', () => {
    navigateToUrl(urlInput.value);
});

urlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        navigateToUrl(urlInput.value);
    }
});

backButton.addEventListener('click', () => {
  if (iframe && typeof iframe.goBack === 'function') {
    iframe.goBack();
  } else {
    console.warn('Back not supported on this content element');
  }
});

forwardButton.addEventListener('click', () => {
  if (iframe && typeof iframe.goForward === 'function') {
    iframe.goForward();
  } else {
    console.warn('Forward not supported on this content element');
  }
});

reloadButton.addEventListener('click', () => {
  if (iframe && typeof iframe.reload === 'function') {
    iframe.reload();
  } else if (iframe && iframe.src) {
    const current = iframe.src;
    iframe.src = current;
  }
});

openFileButton.addEventListener('click', () => {
    window.electronAPI.openFile();
});

newWindowButton.addEventListener('click', () => {
    window.electronAPI.newWindow();
});

closeWindowButton.addEventListener('click', () => {
    window.electronAPI.closeWindow();
});

toggleUiButton.addEventListener('click', () => {
    toggleUI();
});

// Global drag handling (document and iframe) with overlay above the iframe
['dragenter','dragover'].forEach(type => {
  document.addEventListener(type, (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    if (type === 'dragenter') dragCounter++;
    showDropOverlay();
  });
  iframe.addEventListener(type, (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    if (type === 'dragenter') dragCounter++;
    showDropOverlay();
  });
});

['dragleave'].forEach(type => {
  document.addEventListener(type, (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) hideDropOverlay();
  });
  iframe.addEventListener(type, (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) hideDropOverlay();
  });
});

document.addEventListener('dragend', () => hideDropOverlay());

document.addEventListener('drop', handleFileDrop);
iframe.addEventListener('drop', handleFileDrop);
if (dropOverlay) {
  dropOverlay.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });
  dropOverlay.addEventListener('drop', handleFileDrop);
}

// Flash border helper
function flashBorder(ms = 1200) {
  if (!frameFlash) return;
  frameFlash.classList.add('active');
  setTimeout(() => frameFlash.classList.remove('active'), ms);
}

// IPC event listeners
// Legacy navigate-to support (guarded)
if (window.electronAPI.onNavigateTo) {
  window.electronAPI.onNavigateTo((event, url) => {
    navigateToUrl(url);
  });
}

window.electronAPI.onFileSelected((event, filePath) => {
    openLocalFile(filePath);
});

window.electronAPI.onOpenFileShortcut(() => {
  window.electronAPI.openFile();
});

window.electronAPI.onToggleUrlBarShortcut(() => {
    if (uiContainer.style.visibility === 'hidden' || uiContainer.style.visibility === '') {
      toggleUI();
    }
    urlInput.focus();
    urlInput.select(); // Select all text in the URL input
});

window.electronAPI.onToggleUiShortcut(toggleUI);

window.electronAPI.onRedrawWebview(() => {
  const originalOpacity = iframe.style.opacity || 1;
  iframe.style.opacity = 1;
  setTimeout(() => {
    iframe.style.opacity = originalOpacity;
  }, 50); // Short delay
});

// Add event listener for the reload-content event
window.electronAPI.onReloadContent(() => {
  if (iframe && typeof iframe.reload === 'function') {
    iframe.reload();
  } else if (iframe && iframe.src) {
    const current = iframe.src;
    iframe.src = current;
  }
});

// Add event listener for the Go shortcut (Cmd+G)
window.electronAPI.onGoToUrl(() => {
  // Navigate to the URL in the input field even if UI is hidden
  navigateToUrl(urlInput.value);
});

// Add event listeners for the opacity control shortcuts
window.electronAPI.onDecreaseOpacity(() => {
  decreaseOpacity();
});

window.electronAPI.onIncreaseOpacity(() => {
  increaseOpacity();
});

// Set background opacity directly from menu (0, 0.5, 1)
window.electronAPI.onSetBgOpacity && window.electronAPI.onSetBgOpacity((_e, value) => {
  const v = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isNaN(v)) setBackgroundOpacity(v);
});

// Overall opacity of content (webview + backdrop) via container, not OS window
let overallOpacity = 1.0;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
function setOverallOpacity(v) {
  overallOpacity = clamp01(v);
  if (iframe) iframe.style.opacity = String(overallOpacity);
  setBackgroundOpacity(overallOpacity);
}
function incOverallOpacity(delta) { setOverallOpacity(overallOpacity + delta); }

window.electronAPI.onSetOverallOpacity && window.electronAPI.onSetOverallOpacity((_e, v) => setOverallOpacity(typeof v === 'number' ? v : parseFloat(v)));
window.electronAPI.onIncreaseOverallOpacity && window.electronAPI.onIncreaseOverallOpacity(() => incOverallOpacity(+0.1));
window.electronAPI.onDecreaseOverallOpacity && window.electronAPI.onDecreaseOverallOpacity(() => incOverallOpacity(-0.1));

// Shortcuts from menu
window.electronAPI.onOpenFolderShortcut && window.electronAPI.onOpenFolderShortcut(async () => {
  const folder = await window.electronAPI.openFolderDialog();
  if (folder) {
    const resolved = await window.electronAPI.resolveOpenable(folder);
    if (resolved) openLocalFile(resolved);
  }
});

window.electronAPI.onFlashBorder && window.electronAPI.onFlashBorder(() => {
  flashBorder();
});

window.electronAPI.onHardFlush && window.electronAPI.onHardFlush(() => {
  hardFlushWebview();
});

// Initialize opacity
setBackgroundOpacity(currentOpacity);

// Initialize frameless resize handlers
setupResizeHandlers();

// Inject site-specific CSS (e.g., tldraw transparency) after webview is ready
function injectSiteCSS(url) {
  if (!iframe || typeof iframe.insertCSS !== 'function') return;
  const u = (url || '').toLowerCase();
  // tldraw: remove white backgrounds
  if (u.includes('tldraw')) {
    const css = `
      :root,.tla-theme-container{--tla-color-sidebar:hsla(0 0% 99% / 0)!important;--tla-color-background:hsla(0 0% 99% / 0)!important}
      html,body,#root,.tla,.tla-theme-container,.tl-container{background:transparent!important}
      .tl-background,canvas,svg{background:transparent!important}
    `;
    try { iframe.insertCSS(css); } catch (_) {}
  }

  // Strudel (strudel.cc / tidal strudel): try to make background transparent
  if (u.includes('strudel')) {
    const css = `
      html,body,#root,#app,.app,.container,.editor-container,.visualizer,.scene { background: transparent !important; }
      .blackscreen,.whitescreen,.greenscreen { background: transparent !important; }
      canvas,svg { background: transparent !important; }
    `;
    try { iframe.insertCSS(css); } catch (_) {}
    // Additionally, strip common theme classes that force solid bg
    try {
      iframe.executeJavaScript(`(function(){
        const rm = ['blackscreen','whitescreen','greenscreen'];
        document.documentElement && document.documentElement.classList && document.documentElement.classList.remove(...rm);
        document.body && document.body.classList && document.body.classList.remove(...rm);
      })();`);
    } catch (_) {}
  }
}

if (iframe) {
  iframe.addEventListener('dom-ready', () => {
    let currentUrl = '';
    try { currentUrl = iframe.getURL ? iframe.getURL() : iframe.src; } catch (_) {}
    injectSiteCSS(currentUrl || '');
  });
  iframe.addEventListener('did-fail-load', (e) => {
    console.warn('Content failed to load', e.errorCode, e.errorDescription, e.validatedURL);
  });
  iframe.addEventListener('did-navigate', (_e) => {
    // Update URL bar with current location
    try { urlInput.value = iframe.getURL ? iframe.getURL() : urlInput.value; } catch (_) {}
  });
  // Bridge DnD events coming from the guest page via preload
  iframe.addEventListener('ipc-message', (event) => {
    if (!event || !event.channel) return;
    if (event.channel === 'wv-dragover') {
      showDropOverlay();
    } else if (event.channel === 'wv-dragleave') {
      hideDropOverlay();
    } else if (event.channel === 'wv-drop') {
      hideDropOverlay();
      const payload = event.args && event.args[0] ? event.args[0] : {};
      if (payload.files && payload.files.length > 0) {
        const p = payload.files[0];
        window.electronAPI.resolveOpenable(p).then(resolved => {
          if (resolved) openLocalFile(resolved); else openLocalFile(p);
        });
        return;
      }
      const uri = payload.uriList ? String(payload.uriList).split('\n')[0].trim() : '';
      if (uri) {
        if (uri.startsWith('file://')) {
          window.electronAPI.resolveOpenable(uri).then(resolved => {
            if (resolved) openLocalFile(resolved); else openLocalFile(uri);
          });
        } else {
          navigateToUrl(uri);
        }
        return;
      }
      const text = payload.text || '';
      if (text) {
        try { new URL(text); navigateToUrl(text); }
        catch (_) {
          window.electronAPI.resolveOpenable(text).then(resolved => {
            if (resolved) openLocalFile(resolved); else openLocalFile(text);
          });
        }
      }
    }
  });
}

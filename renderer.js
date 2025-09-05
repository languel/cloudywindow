const iframe = document.getElementById('content-frame');
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
  forceIframeRedraw();
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
  const prev = iframe.style.transform;
  iframe.style.transform = 'translateZ(0)';
  requestAnimationFrame(() => {
    iframe.style.transform = prev || '';
  });
}

function navigateToUrl(url) {
  console.log('navigateToUrl called with:', url);
  if (!url) return;
    let fullUrl = url;
    if (!/^https?:\/\//i.test(url) && !url.startsWith('file://')) {
        fullUrl = 'http://' + url;
    }
    iframe.src = fullUrl;
    urlInput.value = fullUrl;
}

function openLocalFile(filePath) {
    const fileUrl = 'file://' + filePath;
    navigateToUrl(fileUrl);
}

function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files[0];
    if (file) {
        if (file.path.endsWith('.html')) {
            openLocalFile(file.path);
        } else {
          // Check if it is a URL
          try {
            new URL(file.path);
            navigateToUrl(file.path)
          } catch (_) {
            alert('Invalid file type. Please drop an HTML file or a URL.');
          }
        }
    } else {
      // Check if it is text
      const text = event.dataTransfer.getData('text/plain');
      if (text) {
        try {
          new URL(text);
          navigateToUrl(text);
        } catch (_) {
          // It is likely a file path
          openLocalFile(text);
        }
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
  // Nudge compositor so the iframe doesn't capture stale pixels
  forceIframeRedraw();
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
  try {
    // Cross-origin safety: accessing history may throw; wrap in try/catch
    iframe.contentWindow.history.back();
  } catch (e) {
    // If not allowed, no-op
    console.warn('Back navigation not permitted for this content.', e);
  }
});

forwardButton.addEventListener('click', () => {
  try {
    iframe.contentWindow.history.forward();
  } catch (e) {
    console.warn('Forward navigation not permitted for this content.', e);
  }
});

reloadButton.addEventListener('click', () => {
  try {
    // Some cross-origin contexts disallow reload via location; reset src as a fallback
    iframe.contentWindow.location.reload();
  } catch (e) {
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

document.addEventListener('dragover', (event) => {
  event.preventDefault();
    event.stopPropagation();
});

document.addEventListener('drop', handleFileDrop);

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
  if (iframe.src !== 'about:blank' && iframe.src !== '') {
    iframe.contentWindow.location.reload();
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

// Initialize opacity
setBackgroundOpacity(currentOpacity);

// Initialize frameless resize handlers
setupResizeHandlers();

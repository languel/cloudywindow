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
let currentOpacity = 0.0; // Default opacity: 50%
const MIN_OPACITY = 0.0;  // Minimum opacity: 10% (to prevent completely invisible window)
const MAX_OPACITY = 1.0;  // Maximum opacity: 100%
const OPACITY_STEP = 0.1; // Step for each adjustment: 10%

// Function to set the background opacity
function setBackgroundOpacity(opacity) {
  // Ensure opacity is within bounds
  opacity = Math.max(MIN_OPACITY, Math.min(MAX_OPACITY, opacity));
  currentOpacity = opacity;
  
  // Apply opacity to the iframe background
  document.body.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
  
  // Optional: Display a temporary indicator of current opacity level
  // showOpacityIndicator();
}

// Function to display a temporary opacity indicator
function showOpacityIndicator() {
  // Check if indicator already exists
  let indicator = document.getElementById('opacity-indicator');
  if (!indicator) {
    // Create indicator element
    indicator = document.createElement('div');
    indicator.id = 'opacity-indicator';
    indicator.style.position = 'absolute';
    indicator.style.top = '50%';
    indicator.style.left = '50%';
    indicator.style.transform = 'translate(-50%, -50%)';
    indicator.style.padding = '10px 20px';
    indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    indicator.style.color = 'white';
    indicator.style.borderRadius = '5px';
    indicator.style.fontFamily = 'sans-serif';
    indicator.style.fontSize = '18px';
    indicator.style.transition = 'opacity 0.5s ease';
    indicator.style.zIndex = '2000';
    document.body.appendChild(indicator);
  }
  
  // Update and show the indicator
  indicator.textContent = `Opacity: ${Math.round(currentOpacity * 100)}%`;
  indicator.style.opacity = '1';
  
  // Hide the indicator after a delay
  clearTimeout(window.opacityIndicatorTimeout);
  window.opacityIndicatorTimeout = setTimeout(() => {
    indicator.style.opacity = '0';
  }, 1500);
}

// Function to decrease opacity (Cmd+[)
function decreaseOpacity() {
  setBackgroundOpacity(currentOpacity - OPACITY_STEP);
}

// Function to increase opacity (Cmd+])
function increaseOpacity() {
  setBackgroundOpacity(currentOpacity + OPACITY_STEP);
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
}

function setupResizeHandlers() {
    // TODO: Implement custom resize handles
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
    iframe.contentWindow.history.back();
});

forwardButton.addEventListener('click', () => {
    iframe.contentWindow.history.forward();
});

reloadButton.addEventListener('click', () => {
  iframe.contentWindow.location.reload();
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
window.electronAPI.onNavigateTo((event, url) => {
  navigateToUrl(url);
});

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
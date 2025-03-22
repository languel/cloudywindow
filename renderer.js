const iframe = document.getElementById('content-frame');
const urlInput = document.getElementById('url-input');
const goButton = document.getElementById('go-button');
const backButton = document.getElementById('back-button');
const forwardButton = document.getElementById('forward-button');
const reloadButton = document.getElementById('reload-button');
const toggleUiButton = document.getElementById('toggle-ui-button');
const uiContainer = document.getElementById('ui-container');

function navigateToUrl(url) {
    if (!url) return;
    let fullUrl = url;
    if (!/^https?:\/\//i.test(url)) {
        fullUrl = 'http://' + url;
    }
    iframe.src = 'about:blank'; // Clear the iframe
    // Use a timeout to ensure about:blank is loaded before setting new URL
    setTimeout(() => {
      iframe.src = fullUrl;
      urlInput.value = fullUrl;
    }, 0);
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
    uiContainer.style.display = uiContainer.style.display === 'none' ? 'block' : 'none';
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

toggleUiButton.addEventListener('click', toggleUI);

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
    // focus the urlInput
    if (uiContainer.style.display === 'none') {
      toggleUI();
    }
    urlInput.focus();
});

window.electronAPI.onToggleUiShortcut(toggleUI);
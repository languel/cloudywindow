/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

// Elements
const webview = document.getElementById('content-webview');
const urlInput = document.getElementById('url-input');
const goButton = document.getElementById('go-button');
const backButton = document.getElementById('back-button')
const forwardButton = document.getElementById('forward-button')
const reloadButton = document.getElementById('reload-button')
const openFileButton = document.getElementById('open-file-button')
const toggleUiButton = document.getElementById('toggle-ui-button')
const toggleFrameButton = document.getElementById('toggle-frame-button')
const fullscreenButton = document.getElementById('fullscreen-button')
const browserControls = document.getElementById('browser-controls')
const statusBar = document.getElementById('status-bar')
const statusText = document.getElementById('status-text')

// State
let uiVisible = true
let urlBarVisible = true
let frameVisible = false
let inactivityTimer = null

// Initialize
document.addEventListener('DOMContentLoaded', () => {
 console.log("DOMContentLoaded")
    setupEventListeners()
    setupResizeHandlers()
    setupDragAndDrop()
    // Removed initializeAutoHide() as we're eliminating auto-fade

    // Load a default page
    navigateToUrl('default.html')
})

// Setup all event listeners
function setupEventListeners() {
 // Add listener for clear webview shortcut
 document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
   window.electronAPI.clearWebview();
  }
 })
    // Navigation buttons
    backButton.addEventListener('click', () => {
        if (webview.canGoBack()) {
            webview.goBack()
        }
    })

    forwardButton.addEventListener('click', () => {
        if (webview.canGoForward()) {
            webview.goForward()
        }
    })

    reloadButton.addEventListener('click', () => {
        webview.reload()
    })

    // URL navigation
    goButton.addEventListener('click', () => {
        navigateToUrl(urlInput.value)
    })

    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            navigateToUrl(urlInput.value)
        }
    })

    // UI toggle
    toggleUiButton.addEventListener('click', toggleUI)

    // Frame toggle button - now just resizes window to default size
    toggleFrameButton.addEventListener('click', () => {
        // Reset window to default size
        window.electronAPI.setWindowSize(800, 600)
    })

    // Fullscreen toggle
    fullscreenButton.addEventListener('click', () => {
        document.documentElement.requestFullscreen()
    })

    // Open file button
    openFileButton.addEventListener('click', () => {
        window.electronAPI.openFile()
    })

    // Webview events
    webview.addEventListener('did-start-loading', () => {
        statusText.textContent = 'Loading...'
        // Remove text content manipulation, use CSS classes instead
        if (reloadButton) reloadButton.classList.add('loading')
    })

    webview.addEventListener('did-stop-loading', () => {
        statusText.textContent = 'Ready'
        // Remove text content manipulation, use CSS classes instead
        if (reloadButton) reloadButton.classList.remove('loading')
        urlInput.value = webview.getURL()
        updateNavigationButtons()
    })

    webview.addEventListener('did-navigate', (e) => {
        urlInput.value = webview.getURL()
        updateNavigationButtons()
        // Update main process with current URL
        window.electronAPI.updateURL(webview.getURL())
    })

    webview.addEventListener('page-title-updated', (e) => {
        document.title = e.title
    })

    webview.addEventListener('permissionrequest', (e) => {
        // Auto-accept permission requests for demo purposes
        // In a production app, you might want to show a permission dialog
        if (e.permission === 'media' ||
            e.permission === 'midi' ||
            e.permission === 'bluetooth' ||
            e.permission === 'geolocation') {
            e.request.allow()
        }
    })

    // Listen for IPC messages
    window.electronAPI.onToggleUrlBar(() => {
        focusUrlBar()
    })

    window.electronAPI.onToggleUI(() => {
        toggleUI()
    })

    // Remove unused frame toggle event listeners and clear webview content listener
 window.electronAPI.onClearWebviewContent = null

    // Listen for file selection
    window.electronAPI.onFileSelected((event, filePath) => {
        openLocalFile(filePath)
    })

    // Listen for navigation requests from main process
    window.electronAPI.onNavigateTo((event, url) => {
        navigateToUrl(url)
    })

    // Listen for the last URL from main process after window recreation
    window.electronAPI.onLoadLastUrl((event, lastUrl) => {
        if (lastUrl) {
            navigateToUrl(lastUrl)
        }
    })

    // Reset inactivity timer on mouse movement
    document.removeEventListener('mousemove', resetInactivityTimer)
}

// Helper function to determine if a file is an image based on its extension
function isImageFile(filePath) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    return imageExtensions.includes(ext);
}

// Setup drag and drop for file opening
function setupDragAndDrop() {
    // Add drag and drop to the entire document/window
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.add('drag-over-window');
    });
    
    document.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only remove the class if we're leaving the document
        if (e.clientX <= 0 || e.clientY <= 0 || 
            e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
            document.body.classList.remove('drag-over-window');
        }
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.remove('drag-over-window');
        
        handleFileDrop(e);
    });
    
    // Keep URL input specific handlers for visual feedback
    urlInput.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        urlInput.classList.add('drag-over');
    });
    
    urlInput.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        urlInput.classList.remove('drag-over');
    });
    
    urlInput.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        urlInput.classList.remove('drag-over');
        document.body.classList.remove('drag-over-window');
        
        handleFileDrop(e);
    });
}

// Handle file drops more robustly
function handleFileDrop(event) {
    // Handle file drops
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        
        // In Electron, we should have access to the path
        if (file.path) {
            openLocalFile(file.path);
            return;
        }
    }
    
    // Handle URL drops or alternative file handling
    const url = event.dataTransfer.getData('text/uri-list') || 
                event.dataTransfer.getData('text/plain');
                
    if (url) {
        if (url.startsWith('file://')) {
            // It's a file URL, use it directly
            console.log('Dropped file URL:', url);
            navigateToUrl(url);
        } else {
            // It's a regular URL
            navigateToUrl(url);
        }
    }
}

// Open local file with more robust path handling
function openLocalFile(filePath) {
    if (!filePath) return;
    
    statusText.textContent = `Opening: ${filePath}`;
    console.log('Original path:', filePath);
    
    // Remove file:// prefix if it exists (for consistency)
    if (filePath.startsWith('file://')) {
        filePath = filePath.substring(7);
    }
    
    // Replace backslashes with forward slashes
    filePath = filePath.replace(/\\/g, '/');
    
    // Handle macOS path that might start with /Users
    if (!filePath.startsWith('/') && !filePath.match(/^[A-Za-z]:/)) {
        filePath = '/' + filePath;
    }
    
    // Create proper file URL
    const fileUrl = `file://${encodeURI(filePath)}`;
    console.log('Attempting to load file:', fileUrl);

    if (isImageFile(filePath)) {
        // Read the image file and display it using a data URL
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.style.maxWidth = '100%'; // Ensure image fits within the window
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain'; // Maintain aspect ratio

            // Create a container div for centering
            const containerDiv = document.createElement('div');
            containerDiv.style.display = 'flex';
            containerDiv.style.justifyContent = 'center';
            containerDiv.style.alignItems = 'center';
            containerDiv.style.height = '100%';
            containerDiv.style.width = '100%';
            containerDiv.style.overflow = 'hidden'; // Prevent scrollbars if image is too large
            containerDiv.appendChild(img);

            // Clear current webview content
            webview.src = 'about:blank';

            // Inject the image into the webview
            webview.executeJavaScript(`
                document.body.innerHTML = '';
                document.body.appendChild(${JSON.stringify(containerDiv.outerHTML)});
            `);
        };
 
         // Use electronAPI to read the file data from the main process
         window.electronAPI.readFileData(filePath).then(base64Data => {
             if (base64Data) {
                 img.src = `data:image;base64,${base64Data}`;
             } else {
                 console.error('Failed to read image file.');
                 // Handle the error appropriately, e.g., display a message to the user.
             }
         });
     } else {
         // If not an image, load the file URL as before
        navigateToUrl(fileUrl);
    }
}

// Navigate to URL with proper formatting
function navigateToUrl(url) {
    if (!url) return;

    // Force-clear the webview before loading anything
    webview.loadURL('about:blank');

    // Special case for localhost - prefer HTTP unless HTTPS is explicitly specified
    if (url.includes('localhost') && !url.startsWith('http')) {
        url = 'http://' + url.replace(/^https?:\/\//i, '');
    }
    // Add protocol for non-localhost URLs if missing
    else if (!/^(https?|file):\/\//i.test(url)) {
        url = 'https://' + url;
    }

    console.log('Navigating to:', url);
    webview.src = url;
    urlInput.blur(); // Remove focus from input

    // Inform main process of URL change for persistence
    window.electronAPI.updateURL(url);
}

// Update navigation button states
function updateNavigationButtons() {
    backButton.disabled = !webview.canGoBack()
    forwardButton.disabled = !webview.canGoForward()
}

// Toggle UI visibility - keep this function, but remove auto-hide logic
function toggleUI() {
    uiVisible = !uiVisible

    if (uiVisible) {
        browserControls.classList.remove('hidden')
        statusBar.classList.remove('hidden')
        document.body.classList.remove('ui-hidden') // Remove shadow class
    } else {
        browserControls.classList.add('hidden')
        statusBar.classList.add('hidden')
        document.body.classList.add('ui-hidden') // Add shadow class
    }
 webview.invalidate();
 //webview.reload();
}

<<<<<<< HEAD
// Toggle URL bar visibility
function toggleUrlBar() {
    const urlContainer = document.getElementById('url-container')
    urlBarVisible = !urlBarVisible

    if (urlBarVisible) {
        urlContainer.style.display = 'flex'
        urlInput.focus()
        urlInput.select()
    } else {
        urlContainer.style.display = 'none'
    }
=======
// Toggle URL bar visibility - replaced with focusUrlBar
function focusUrlBar() {
  const urlContainer = document.getElementById('url-container')
  
  // Always ensure URL bar is visible
  if (!urlBarVisible) {
    urlBarVisible = true
    urlContainer.style.display = 'flex'
  }
  
  // Focus and select text in URL input
  if (urlInput) {
    setTimeout(() => {
      urlInput.focus()
      urlInput.select()
    }, 10) // Small timeout to ensure the UI has updated
  }
>>>>>>> origin/c3browser
}

// Update UI elements based on frame state
function updateUIForFrameState() {
    // Always show resize handles since we're always frameless
    const resizeHandles = document.querySelector('.resize-handles')
    resizeHandles.style.display = 'block'
}

// Setup handlers for window resizing
function setupResizeHandlers() {
    const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
    let resizing = false
    let startX, startY, startWidth, startHeight

    directions.forEach(dir => {
        const handle = document.querySelector(`.resize-handle-${dir}`)
        
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault()
            resizing = true
            startX = e.clientX
            startY = e.clientY

            // Get current window dimensions
            startWidth = window.innerWidth
            startHeight = window.innerHeight

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', stopResize)
        })
    })

    function handleMouseMove(e) {
        if (!resizing) return

        // Calculate new dimensions based on mouse movement and direction
        const deltaX = e.clientX - startX
        const deltaY = e.clientY - startY

        // TODO: Implement proper resizing logic for each direction
        // For now, just resize in all directions
        const newWidth = startWidth + deltaX
        const newHeight = startHeight + deltaY

        window.electronAPI.setWindowSize(newWidth, newHeight);
  webview.invalidate();
        //webview.reload(); // Force webview to reload after resizing
    }

    function stopResize() {
        resizing = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', stopResize)
    }
}

// Function to simulate a fullscreen toggle
function toggleFullscreen() {
 if (mainWindow) {
 const currentState = mainWindow.isFullScreen();
 mainWindow.setFullScreen(!currentState);
 setTimeout(() => {
 mainWindow.setFullScreen(currentState);
 }, 100); // Toggle back after 100ms
 }
}

// Function to clear webview content
function clearWebviewContent() {
 console.log('Clearing webview content.');
 webview.invalidate();
    webview.executeJavaScript('document.body.innerHTML = ""');
}

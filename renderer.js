/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

// Elements
const webview = document.getElementById('content-webview')
const urlInput = document.getElementById('url-input')
const goButton = document.getElementById('go-button')
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
    setupEventListeners()
    setupResizeHandlers()
    setupDragAndDrop()
    // Removed initializeAutoHide() as we're eliminating auto-fade

    // Load a default page
    navigateToUrl('https://www.example.com')
})

// Setup all event listeners
function setupEventListeners() {
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
        reloadButton.textContent = '×'
    })

    webview.addEventListener('did-stop-loading', () => {
        statusText.textContent = 'Ready'
        reloadButton.textContent = '↻'
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
        toggleUrlBar()
    })

    window.electronAPI.onToggleUI(() => {
        toggleUI()
    })

    // Remove unused frame toggle event listeners
    window.electronAPI.onFrameToggled = null;

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
    navigateToUrl(fileUrl);
}

// Navigate to URL with proper formatting
function navigateToUrl(url) {
    if (!url) return
    
    // Special case for localhost - prefer HTTP unless HTTPS is explicitly specified
    if (url.includes('localhost') && !url.startsWith('http')) {
        url = 'http://' + url.replace(/^https?:\/\//i, '')
    }
    // Add protocol for non-localhost URLs if missing
    else if (!/^(https?|file):\/\//i.test(url)) {
        url = 'https://' + url
    }
    
    console.log('Navigating to:', url)
    webview.src = url
    urlInput.blur() // Remove focus from input
    
    // Inform main process of URL change for persistence
    window.electronAPI.updateURL(url)
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
}

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
        
        window.electronAPI.setWindowSize(newWidth, newHeight)
    }
    
    function stopResize() {
        resizing = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', stopResize)
    }
}

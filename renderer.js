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
    initializeAutoHide()

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

    // Frame toggle
    toggleFrameButton.addEventListener('click', () => {
        window.electronAPI.setWindowSize(800, 600) // Reset size when toggling frame
    })

    // Fullscreen toggle
    fullscreenButton.addEventListener('click', () => {
        document.documentElement.requestFullscreen()
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

    webview.addEventListener('did-navigate', () => {
        urlInput.value = webview.getURL()
        updateNavigationButtons()
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

    window.electronAPI.onFrameToggled((event, isFramed) => {
        frameVisible = isFramed
        updateUIForFrameState()
    })

    // Reset inactivity timer on mouse movement
    document.addEventListener('mousemove', resetInactivityTimer)
}

// Navigate to URL with proper formatting
function navigateToUrl(url) {
    if (!url) return
    
    // Add protocol if missing
    if (!/^https?:\/\//i.test(url) && !url.startsWith('file://')) {
        url = 'https://' + url
    }
    
    webview.src = url
    urlInput.blur() // Remove focus from input
}

// Update navigation button states
function updateNavigationButtons() {
    backButton.disabled = !webview.canGoBack()
    forwardButton.disabled = !webview.canGoForward()
}

// Toggle UI visibility
function toggleUI() {
    uiVisible = !uiVisible
    
    if (uiVisible) {
        browserControls.classList.remove('hidden')
        statusBar.classList.remove('hidden')
    } else {
        browserControls.classList.add('hidden')
        statusBar.classList.add('hidden')
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
    const resizeHandles = document.querySelector('.resize-handles')
    
    if (frameVisible) {
        resizeHandles.style.display = 'none'
    } else {
        resizeHandles.style.display = 'block'
    }
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

// Auto-hide UI after period of inactivity
function initializeAutoHide() {
    resetInactivityTimer()
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimer)
    
    // If UI is hidden, show it
    if (!uiVisible) {
        toggleUI()
    }
    
    // Set timer to hide UI after 3 seconds of inactivity
    inactivityTimer = setTimeout(() => {
        if (uiVisible) {
            toggleUI()
        }
    }, 3000)
}

/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

// Elements
const webview = document.getElementById('content-webview') || document.getElementById('content-view')
const urlInput = document.getElementById('url-input')
const goButton = document.getElementById('go-button')
const backButton = document.getElementById('back-button')
const forwardButton = document.getElementById('forward-button')
const reloadButton = document.getElementById('reload-button')
const newTabButton = document.getElementById('new-tab-button')
const newWindowButton = document.getElementById('new-window-button')
const browserControls = document.getElementById('browser-controls')
const statusBar = document.getElementById('status-bar')
const statusText = document.getElementById('status-text')
const dragRegion = document.querySelector('.drag-region')
const closeButton = document.getElementById('close-button')
const minimizeButton = document.getElementById('minimize-button')
const maximizeButton = document.getElementById('maximize-button')

// State
let uiVisible = true
let urlBarVisible = true
let frameVisible = false
let inactivityTimer = null

// Make toggleUI globally available with a clean, reliable implementation
window.toggleUI = function() {
    console.log('toggleUI: Toggling UI visibility');
    
    // Find elements - always get fresh references to avoid stale elements
    const browserControls = document.getElementById('browser-controls');
    const statusBar = document.getElementById('status-bar');
    const dragRegion = document.querySelector('.drag-region');
    const webview = document.getElementById('content-webview') || document.getElementById('content-view');
    
    // Toggle state - always use window.uiVisible for consistent state tracking
    window.uiVisible = !window.uiVisible;
    console.log(`UI visibility set to: ${window.uiVisible}`);
    
    try {
        // Use a unified approach: CSS classes for toggles
        document.body.classList.toggle('ui-hidden', !window.uiVisible);
        
        if (window.uiVisible) {
            // Show UI elements using both CSS classes and direct style
            // This hybrid approach ensures maximum compatibility
            if (browserControls) {
                browserControls.style.display = 'flex';
                browserControls.style.visibility = 'visible';
                browserControls.style.opacity = '1';
                browserControls.classList.remove('hidden');
            }
            
            if (statusBar) {
                statusBar.style.display = 'flex';
                statusBar.style.visibility = 'visible';
                statusBar.style.opacity = '1';
                statusBar.classList.remove('hidden');
            }
            
            if (dragRegion) {
                dragRegion.style.display = 'block';
                dragRegion.style.visibility = 'visible';
                dragRegion.style.opacity = '1';
                dragRegion.classList.remove('hidden');
            }
            
            if (webview) {
                webview.style.height = 'calc(100% - 50px)';
            }
        } else {
            // Hide UI elements
            if (browserControls) {
                browserControls.style.display = 'none';
                browserControls.style.visibility = 'hidden';
                browserControls.style.opacity = '0';
                browserControls.classList.add('hidden');
            }
            
            if (statusBar) {
                statusBar.style.display = 'none';
                statusBar.style.visibility = 'hidden';
                statusBar.style.opacity = '0';
                statusBar.classList.add('hidden');
            }
            
            if (dragRegion) {
                dragRegion.style.display = 'none';
                dragRegion.style.visibility = 'hidden';
                dragRegion.style.opacity = '0';
                dragRegion.classList.add('hidden');
            }
            
            if (webview) {
                webview.style.height = '100%';
            }
        }
        
        // Force a layout recalculation to ensure changes take effect immediately
        void document.body.offsetHeight;
        
        // Dispatch event for other parts of the application to respond
        document.dispatchEvent(new CustomEvent('ui-state-changed', { 
            detail: { visible: window.uiVisible } 
        }));
        
    } catch (error) {
        console.error('Error toggling UI:', error);
    }
    
    // Return true to indicate successful toggle
    return true;
}

// Emergency direct toggle function - exposed globally
window.emergencyToggleUI = function() {
    console.log('EMERGENCY UI TOGGLE');
    
    // Get direct element references
    const controls = document.getElementById('browser-controls');
    const status = document.getElementById('status-bar');
    const drag = document.querySelector('.drag-region');
    const view = document.getElementById('content-view') || document.getElementById('content-webview');
    
    // Check current visibility
    const isVisible = controls && window.getComputedStyle(controls).display !== 'none';
    
    if (isVisible) {
        // Hide everything
        document.body.classList.add('ui-hidden');
        
        if (controls) {
            controls.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
            controls.classList.add('hidden');
        }
        
        if (status) {
            status.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
            status.classList.add('hidden');
        }
        
        if (drag) {
            drag.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
            drag.classList.add('hidden');
        }
        
        if (view) {
            view.style.height = '100%';
        }
        
        window.uiVisible = false;
    } else {
        // Show everything
        document.body.classList.remove('ui-hidden');
        
        if (controls) {
            controls.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
            controls.classList.remove('hidden');
        }
        
        if (status) {
            status.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
            status.classList.remove('hidden');
        }
        
        if (drag) {
            drag.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            drag.classList.remove('hidden');
        }
        
        if (view) {
            view.style.height = 'calc(100% - 50px)';
        }
        
        window.uiVisible = true;
    }
    
    return 'UI toggle complete';
};

// Initialize UI state globally
window.uiVisible = true;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded - initializing renderer');
    setupEventListeners();
    setupResizeHandlers();
    
    // Initialize UI state explicitly
    window.uiVisible = true;
    
    // Load a default page if webview is available
    if (webview) {
        const defaultHtmlPath = getDefaultHtmlPath()
        console.log('Loading default page on init:', defaultHtmlPath)
        webview.src = defaultHtmlPath
        
        // Fallback if direct setting doesn't work
        setTimeout(() => {
            if (webview.src === 'about:blank' || !webview.src) {
                console.log('Fallback: navigating to default.html')
                navigateToUrl(defaultHtmlPath)
            }
        }, 500)
    }
})

// Helper function to get the path to default.html
function getDefaultHtmlPath() {
    try {
        const currentPath = window.location.href
        console.log('Current location:', currentPath)
        
        let basePath
        if (currentPath.startsWith('file://')) {
            basePath = currentPath.substring(0, currentPath.lastIndexOf('/'))
        } else {
            basePath = currentPath.substring(0, currentPath.lastIndexOf('/'))
        }
        
        const defaultHtmlPath = `${basePath}/default.html`
        console.log('Default HTML path:', defaultHtmlPath)
        
        return defaultHtmlPath
    } catch (error) {
        console.error('Error getting default HTML path:', error)
        return './default.html'
    }
}

// Set up event listeners for all UI elements
function setupEventListeners() {
    if (!webview) return
    console.log('Setting up event listeners');

    // Navigation controls
    if (backButton) {
        backButton.addEventListener('click', () => {
            if (webview.canGoBack()) webview.goBack()
        })
    }

    if (forwardButton) {
        forwardButton.addEventListener('click', () => {
            if (webview.canGoForward()) webview.goForward()
        })
    }

    if (reloadButton) {
        reloadButton.addEventListener('click', () => {
            console.log('Reload button clicked - reloading current page')
            if (webview && webview.src) {
                reloadButton.classList.add('loading');
                webview.reload();
            }
        })
    }
    
    // URL input
    if (goButton && urlInput) {
        goButton.addEventListener('click', () => {
            navigateToUrl(urlInput.value)
        })
    }

    if (urlInput) {
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') navigateToUrl(urlInput.value)
        })
    }
    
    // Window controls
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            console.log('Close button clicked');
            if (window.electronAPI && window.electronAPI.closeWindow) {
                window.electronAPI.closeWindow()
            }
        })
    }

    if (minimizeButton) {
        minimizeButton.addEventListener('click', () => {
            console.log('Minimize button clicked');
            if (window.electronAPI && window.electronAPI.minimizeWindow) {
                window.electronAPI.minimizeWindow()
            }
        })
    }

    if (maximizeButton) {
        maximizeButton.addEventListener('click', () => {
            console.log('Maximize button clicked');
            toggleFullscreen()
        })
    }

    // New tab and window buttons
    if (newTabButton) {
        newTabButton.addEventListener('click', () => {
            console.log('New tab button clicked');
            if (window.electronAPI && window.electronAPI.createNewTab) {
                window.electronAPI.createNewTab()
            }
        })
    }

    if (newWindowButton) {
        newWindowButton.addEventListener('click', () => {
            console.log('New window button clicked');
            if (window.electronAPI && window.electronAPI.createNewWindow) {
                window.electronAPI.createNewWindow()
            }
        })
    }

    // Webview events
    if (webview) {
        webview.addEventListener('did-start-loading', () => {
            if (statusText) statusText.textContent = 'Loading...';
            if (reloadButton) {
                reloadButton.classList.add('loading');
                console.log('Loading started - reload button set to loading state');
            }
            webview.style.backgroundColor = 'transparent';
            document.body.style.backgroundColor = 'transparent';
        });

        webview.addEventListener('did-stop-loading', () => {
            if (statusText) statusText.textContent = 'Ready';
            if (reloadButton) {
                reloadButton.classList.remove('loading');
                console.log('Loading complete - reload button reset to normal state');
            }
            if (urlInput) urlInput.value = webview.getURL();
            updateNavigationButtons();
            
            // Ensure transparency
            webview.style.backgroundColor = 'transparent';
            document.body.style.backgroundColor = 'transparent';
            
            const webviewContainer = webview.parentElement;
            if (webviewContainer) {
                webviewContainer.style.backgroundColor = 'transparent';
            }
        });

        webview.addEventListener('did-navigate', (e) => {
            if (urlInput) urlInput.value = webview.getURL()
            updateNavigationButtons()
            if (window.electronAPI && window.electronAPI.updateURL) {
                window.electronAPI.updateURL(webview.getURL())
            }
        })

        // Set page title
        webview.addEventListener('page-title-updated', (e) => {
            document.title = e.title
        })
        
        // Auto-accept permissions
        webview.addEventListener('permissionrequest', (e) => {
            if (e.permission === 'media' || 
                e.permission === 'midi' || 
                e.permission === 'bluetooth' ||
                e.permission === 'geolocation') {
                e.request.allow()
            }
        })
        
        // Force transparency
        webview.addEventListener('dom-ready', () => {
            webview.style.backgroundColor = 'transparent'
            webview.executeJavaScript(`
                document.body.style.backgroundColor = 'rgba(0,0,0,0)';
                document.documentElement.style.backgroundColor = 'rgba(0,0,0,0)';
                true;
            `).catch(err => console.log('CSS injection error:', err))
        })
    }

    // Set up keyboard shortcuts
    setupKeyboardShortcuts()
    
    // Set up IPC handlers
    setupIPCHandlers()
}

// Keyboard shortcuts setup
function setupKeyboardShortcuts() {
    console.log('Setting up keyboard shortcuts');
    
    // Clean up any existing listeners to prevent duplicates
    if (window.keydownHandler) {
        document.removeEventListener('keydown', window.keydownHandler);
    }
    
    // Create a direct UI toggle handler (highest priority)
    window.uiToggleHandler = function(e) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
            console.log('Direct UI toggle shortcut detected');
            e.preventDefault();
            e.stopPropagation();
            window.toggleUI();
        }
    };
    
    // Add a dedicated handler just for UI toggle with capture phase
    document.addEventListener('keydown', window.uiToggleHandler, true);
    
    // Regular keyboard handler for other shortcuts
    window.keydownHandler = function(e) {
        // Skip if we already handled UI toggle
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
            return;
        }
        
        // Other shortcuts
        if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'l')) {
            e.preventDefault();
            showUIAndFocusUrlBar();
        } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'r' && !e.shiftKey) {
            e.preventDefault();
            if (webview) webview.reload();
        } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'r' && e.shiftKey) {
            e.preventDefault();
            hardReload();
        } else if ((e.metaKey && e.key.toLowerCase() === 'f') || e.key === 'F11') {
            e.preventDefault();
            toggleFullscreen();
        } else if (e.metaKey && e.key.toLowerCase() === 'n' && !e.shiftKey) {
            e.preventDefault();
            if (window.electronAPI && window.electronAPI.createNewWindow) {
                window.electronAPI.createNewWindow();
            }
        } else if (e.metaKey && e.key.toLowerCase() === 't' && !e.shiftKey) {
            e.preventDefault();
            if (window.electronAPI && window.electronAPI.createNewTab) {
                window.electronAPI.createNewTab();
            }
        } else if (e.metaKey && e.key.toLowerCase() === 'w' && !e.shiftKey) {
            e.preventDefault();
            if (window.electronAPI && window.electronAPI.closeWindow) {
                window.electronAPI.closeWindow();
            }
        }
    };
    
    // Add the regular handler with bubble phase
    document.addEventListener('keydown', window.keydownHandler, false);
}

// Fix IPC handlers setup
function setupIPCHandlers() {
    console.log('Setting up IPC handlers');
    
    if (!window.electronAPI) {
        console.error('electronAPI not available in window - IPC will not work!');
        return;
    }
    
    // Toggle UI handler - directly connected to window.toggleUI
    if (window.electronAPI.onToggleUI) {
        console.log('Registering toggle-ui IPC handler');
        window.electronAPI.onToggleUI((event) => {
            console.log('IPC toggle-ui received in renderer');
            window.toggleUI();
        });
    } else {
        console.error('onToggleUI not available in electronAPI');
    }
    
    // Also listen for backup toggle event 
    if (window.electronAPI.onToggleUIBackup) {
        window.electronAPI.onToggleUIBackup((event) => {
            console.log('IPC toggle-ui-backup received');
            window.toggleUI();
        });
    }
    
    // Listen for reload events
    if (window.electronAPI.onReloadPage) {
        window.electronAPI.onReloadPage(() => {
            console.log('Reload page event received from IPC');
            if (webview && webview.src) {
                // Set loading state on reload button
                if (reloadButton) {
                    reloadButton.classList.add('loading');
                    // Ensure we remove the class when loading completes
                    const removeLoadingClass = () => {
                        reloadButton.classList.remove('loading');
                        webview.removeEventListener('did-stop-loading', removeLoadingClass);
                    };
                    webview.addEventListener('did-stop-loading', removeLoadingClass);
                }
                webview.reload();
            }
        });
    }
    
    // Listen for hard reload events
    if (window.electronAPI.onHardReloadPage) {
        window.electronAPI.onHardReloadPage(() => {
            console.log('Hard reload page event received from IPC');
            hardReload();
        });
    }
    
    // Focus URL bar handler - uses the focusing function
    if (window.electronAPI.onFocusUrlBar) {
        window.electronAPI.onFocusUrlBar(() => {
            console.log('Focus URL bar event received from IPC');
            showUIAndFocusUrlBar();
        });
    }
    
    // Load last URL handler
    if (window.electronAPI.onLoadLastUrl) {
        window.electronAPI.onLoadLastUrl((event, lastUrl) => {
            console.log('Load last URL event received:', lastUrl);
            if (lastUrl) navigateToUrl(lastUrl);
        });
    }
    
    // Window snap handler
    if (window.electronAPI.onWindowSnap) {
        window.electronAPI.onWindowSnap((event, position) => {
            console.log('Window snapped to:', position);
        });
    }
    
    // Toggle fullscreen handler
    if (window.electronAPI.onToggleFullscreen) {
        window.electronAPI.onToggleFullscreen(() => {
            console.log('Toggle fullscreen event received from IPC');
            toggleFullscreen();
        });
    }
    
    // Manual toggle UI (backup event)
    document.addEventListener('app-toggle-ui', () => {
        console.log('app-toggle-ui event received');
        window.toggleUI();
    });
    
    document.addEventListener('manual-toggle-ui', () => {
        console.log('manual-toggle-ui event received');
        window.toggleUI();
    });
    
    // Register for custom events
    if (window.electronAPI.onToggleUIEvent) {
        window.electronAPI.onToggleUIEvent(() => window.toggleUI());
    }
}

// Navigate to URL with proper formatting
function navigateToUrl(url) {
    if (!url || !webview) return;
    
    console.log('Navigate request:', url);
    
    // Format URL based on type
    if (url === 'default.html' || url === './default.html') {
        url = getDefaultHtmlPath();
    } else if (url.startsWith('./') || url.startsWith('../')) {
        const currentPath = window.location.href;
        const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        url = `${basePath}/${url.replace(/^\.\//, '')}`;
    } else if (url.startsWith('/')) {
        url = `file://${url}`;
    } else if (url.startsWith('file://') || url.startsWith('about:')) {
        // Keep as is
    } else if (url.includes('localhost') || url.includes('127.0.0.1')) {
        url = 'http://' + url.replace(/^https?:\/\//i, '');
    } else if (!url.includes('://')) {
        url = 'https://' + url;
    }
    
    console.log('Final URL for navigation:', url);
    
    try {
        if (statusText) statusText.textContent = 'Loading...';
        webview.src = url;
        
        if (urlInput) {
            urlInput.value = url;
            urlInput.blur();
        }
        
        setTimeout(() => {
            if (webview) webview.style.backgroundColor = 'transparent';
        }, 100);
        
        if (window.electronAPI && window.electronAPI.updateURL) {
            window.electronAPI.updateURL(url);
        }
    } catch (error) {
        console.error('Navigation error:', error);
        if (statusText) statusText.textContent = 'Navigation error';
    }
}

// Local toggleUI function to call the global one
function toggleUI() {
    window.toggleUI();
}

// Helper function for hard reload
function hardReload() {
    if (!webview || !webview.src) return;
    
    const currentUrl = webview.src;
    webview.src = 'about:blank';
    
    setTimeout(() => {
        webview.src = currentUrl;
        console.log('Hard reloaded:', currentUrl);
    }, 50);
}

// Helper function to show UI and focus URL bar
function showUIAndFocusUrlBar() {
    console.log('Showing UI and focusing URL bar');
    
    // First ensure UI is visible
    window.uiVisible = true;
    document.body.classList.remove('ui-hidden');
    
    // Get fresh references to all UI elements
    const browserControls = document.getElementById('browser-controls');
    const statusBar = document.getElementById('status-bar');
    const dragRegion = document.querySelector('.drag-region'); 
    const webview = document.getElementById('content-view') || document.getElementById('content-webview');
    const urlInput = document.getElementById('url-input');
    
    // Show all UI components
    if (browserControls) {
        browserControls.style.display = 'flex';
        browserControls.style.visibility = 'visible';
        browserControls.classList.remove('hidden');
    }
    
    if (statusBar) {
        statusBar.style.display = 'flex';
        statusBar.style.visibility = 'visible';
        statusBar.classList.remove('hidden');
    }
    
    if (dragRegion) {
        dragRegion.style.display = 'block';
        dragRegion.style.visibility = 'visible';
        dragRegion.classList.remove('hidden');
    }
    
    if (webview) {
        webview.style.height = 'calc(100% - 50px)';
    }
    
    // Force a layout recalculation to ensure changes take effect immediately
    void document.body.offsetHeight;
    
    // Focus and select URL input with robust approach
    if (urlInput) {
        // Try immediate focus
        urlInput.focus();
        urlInput.select();
        
        // Backup with timeout in case the first attempt doesn't work
        setTimeout(() => {
            urlInput.focus();
            urlInput.select();
            console.log('URL input focused and selected (attempt 1)');
            
            // Third attempt if needed
            setTimeout(() => {
                if (document.activeElement !== urlInput) {
                    console.log('URL input not focused, trying again');
                    urlInput.focus();
                    urlInput.select();
                }
            }, 100);
        }, 50);
    } else {
        console.error('URL input element not found');
    }
}

// Toggle fullscreen mode
function toggleFullscreen() {
    if (window.isFullscreenTransitioning) return;
    
    window.isFullscreenTransitioning = true;
    
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
            .then(() => {
                setTimeout(() => { window.isFullscreenTransitioning = false; }, 500);
            })
            .catch(err => {
                console.error('Fullscreen error:', err);
                window.isFullscreenTransitioning = false;
            });
    } else {
        document.exitFullscreen()
            .then(() => {
                setTimeout(() => { window.isFullscreenTransitioning = false; }, 500);
            })
            .catch(err => {
                console.error('Exit fullscreen error:', err);
                window.isFullscreenTransitioning = false;
            });
    }
}

// Handle fullscreen changes
document.addEventListener('fullscreenchange', () => {
    // Get the webview reference directly
    const webview = document.getElementById('content-webview') || document.getElementById('content-view');
    
    if (document.fullscreenElement) {
        if (webview) webview.style.height = '100vh';
    } else {
        if (webview) {
            // Check the global UI state
            webview.style.height = window.uiVisible ? 'calc(100% - 50px)' : '100%';
        }
    }
});

// Update navigation button states
function updateNavigationButtons() {
    if (!webview) return;
    
    if (backButton) backButton.disabled = !webview.canGoBack();
    if (forwardButton) forwardButton.disabled = !webview.canGoForward();
}

// Setup window resize handlers
function setupResizeHandlers() {
    const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
    let resizing = false;
    let startX, startY, startWidth, startHeight;
    
    directions.forEach(dir => {
        const handle = document.querySelector(`.resize-handle-${dir}`);
        if (!handle) return;
        
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            resizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = window.innerWidth;
            startHeight = window.innerHeight;
            
            document.body.classList.add('resizing');
            if (webview) webview.style.display = 'none';
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', stopResize);
        });
    });
    
    function handleMouseMove(e) {
        if (!resizing || !window.electronAPI || !window.electronAPI.setWindowSize) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        window.electronAPI.setWindowSize(startWidth + deltaX, startHeight + deltaY);
    }
    
    function stopResize() {
        resizing = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResize);
        
        setTimeout(() => {
            document.body.classList.remove('resizing');
            if (webview) {
                const currentUrl = webview.src;
                webview.style.display = 'block';
                
                void webview.offsetHeight;
                webview.src = 'about:blank';
                
                setTimeout(() => {
                    webview.src = currentUrl;
                    webview.style.height = uiVisible ? 'calc(100% - 50px)' : '100%';
                }, 50);
            }
        }, 200);
    }
    
    // Handle regular window resize events
    window.addEventListener('resize', () => {
        if (window.resizeTimer) clearTimeout(window.resizeTimer);
        
        window.resizeTimer = setTimeout(() => {
            if (webview) {
                webview.style.height = uiVisible ? 'calc(100% - 50px)' : '100%';
            }
        }, 100);
    });
}

// Export functionality for console debugging
window.cwUtils = {
    toggleUI: window.toggleUI,
    navigateToUrl,
    hardReload,
    showUIAndFocusUrlBar,
    toggleFullscreen,
    getDefaultHtmlPath
};

console.log('Renderer script initialized');
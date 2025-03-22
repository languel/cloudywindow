// Simple debugging utilities for CloudyWindow

// Add a global debug object
window.cwDebug = {
    // Toggle UI manually - now directly using the main toggleUI function
    toggleUI: () => {
        console.log('Debug: Manually toggling UI');
        if (typeof window.toggleUI === 'function') {
            return window.toggleUI();
        } else {
            console.error('Main toggleUI function not found, using emergency fallback');
            return window.cwDebug.emergencyToggleUI();
        }
    },
    
    // Emergency direct UI toggle as fallback
    emergencyToggleUI: () => {
        console.log('EMERGENCY DIRECT UI TOGGLE');
        
        // Get elements directly
        const browserControls = document.getElementById('browser-controls');
        const statusBar = document.getElementById('status-bar');
        const dragRegion = document.querySelector('.drag-region');
        const webview = document.getElementById('content-view') || document.getElementById('content-webview');
        
        // Detect current state
        const uiVisible = !document.body.classList.contains('ui-hidden');
        console.log(`Current UI visibility: ${uiVisible}, toggling to ${!uiVisible}`);
        
        if (uiVisible) {
            // Hide UI
            document.body.classList.add('ui-hidden');
            
            if (browserControls) {
                browserControls.style.cssText = 'display: none !important; visibility: hidden !important;';
                browserControls.classList.add('hidden');
            }
            
            if (statusBar) {
                statusBar.style.cssText = 'display: none !important; visibility: hidden !important;';
                statusBar.classList.add('hidden');
            }
            
            if (dragRegion) {
                dragRegion.style.cssText = 'display: none !important; visibility: hidden !important;';
                dragRegion.classList.add('hidden');
            }
            
            if (webview) webview.style.height = '100%';
            window.uiVisible = false;
            
        } else {
            // Show UI
            document.body.classList.remove('ui-hidden');
            
            if (browserControls) {
                browserControls.style.cssText = 'display: flex !important; visibility: visible !important;';
                browserControls.classList.remove('hidden');
            }
            
            if (statusBar) {
                statusBar.style.cssText = 'display: flex !important; visibility: visible !important;';
                statusBar.classList.remove('hidden');
            }
            
            if (dragRegion) {
                dragRegion.style.cssText = 'display: block !important; visibility: visible !important;';
                dragRegion.classList.remove('hidden');
            }
            
            if (webview) webview.style.height = 'calc(100% - 50px)';
            window.uiVisible = true;
        }
        
        return `Emergency UI toggle complete. Visibility now: ${window.uiVisible}`;
    },
    
    // Get UI state for debugging
    getUIState: () => {
        const browserControls = document.getElementById('browser-controls');
        const statusBar = document.getElementById('status-bar');
        const dragRegion = document.querySelector('.drag-region');
        
        return {
            uiHiddenClass: document.body.classList.contains('ui-hidden'),
            globalUIVisible: window.uiVisible,
            browserControlsDisplay: browserControls ? getComputedStyle(browserControls).display : 'not found',
            statusBarDisplay: statusBar ? getComputedStyle(statusBar).display : 'not found',
            dragRegionDisplay: dragRegion ? getComputedStyle(dragRegion).display : 'not found'
        };
    },
    
    // Add direct shortcut handlers
    addEmergencyHandlers: () => {
        // Alt+Shift+U as a last-resort toggle
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'u') {
                console.log('Emergency UI toggle via Alt+Shift+U');
                e.preventDefault();
                e.stopPropagation();
                window.cwDebug.toggleUI();
            }
        }, true);
        
        // Double click handler
        document.addEventListener('dblclick', (e) => {
            // Only on the body element to avoid interfering with normal double clicks
            if (e.target === document.body) {
                console.log('Emergency UI toggle via double click on body');
                window.cwDebug.toggleUI();
            }
        });
        
        console.log('Emergency UI toggle handlers added');
    },
    
    // Force show UI elements
    showUI: () => {
        window.uiVisible = true;
        document.body.classList.remove('ui-hidden');
        
        const browserControls = document.getElementById('browser-controls');
        const statusBar = document.getElementById('status-bar');
        const dragRegion = document.querySelector('.drag-region');
        const webview = document.getElementById('content-view') || document.getElementById('content-webview');
        
        if (browserControls) {
            browserControls.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
            browserControls.classList.remove('hidden');
        }
        
        if (statusBar) {
            statusBar.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
            statusBar.classList.remove('hidden');
        }
        
        if (dragRegion) {
            dragRegion.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            dragRegion.classList.remove('hidden');
        }
        
        if (webview) webview.style.height = 'calc(100% - 50px)';
        
        console.log('UI forced to visible state');
        return 'UI forced to visible state';
    },
    
    // Force hide UI elements
    hideUI: () => {
        window.uiVisible = false;
        document.body.classList.add('ui-hidden');
        
        const browserControls = document.getElementById('browser-controls');
        const statusBar = document.getElementById('status-bar');
        const dragRegion = document.querySelector('.drag-region');
        const webview = document.getElementById('content-view') || document.getElementById('content-webview');
        
        if (browserControls) {
            browserControls.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
            browserControls.classList.add('hidden');
        }
        
        if (statusBar) {
            statusBar.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
            statusBar.classList.add('hidden');
        }
        
        if (dragRegion) {
            dragRegion.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
            dragRegion.classList.add('hidden');
        }
        
        if (webview) webview.style.height = '100%';
        
        console.log('UI forced to hidden state');
        return 'UI forced to hidden state';
    },
    
    // Fix inconsistent UI states
    repairUIState: () => {
        const uiHidden = document.body.classList.contains('ui-hidden');
        if (uiHidden !== !window.uiVisible) {
            console.log('Inconsistent UI state detected, repairing');
            if (uiHidden) {
                window.uiVisible = false;
            } else {
                window.uiVisible = true;
            }
        }
        return `UI state repaired. Current visibility: ${window.uiVisible}`;
    }
};

// Initialize debug tools
(function init() {
    console.log('CloudyWindow debug tools loaded');
    window.cwDebug.addEmergencyHandlers();
    
    // Ensure global toggleUI is always available
    if (!window.toggleUI) {
        console.log('Main toggleUI function not found, creating fallback');
        window.toggleUI = window.cwDebug.toggleUI;
    }
    
    // Add Alt+U shortcut for UI toggle (non-conflicting with main Cmd+U)
    document.addEventListener('keydown', (e) => {
        if (e.altKey && !e.shiftKey && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'u') {
            console.log('Alt+U UI toggle triggered');
            e.preventDefault();
            window.toggleUI();
        }
    }, true);
    
    // Repair UI state on load
    setTimeout(() => {
        window.cwDebug.repairUIState();
    }, 500);
    
    console.log('Debug tools initialization complete');
})();

# Transparent Browser Overlay Implementation Plan

## Project Overview
Create a transparent, borderless browser that can overlay other applications, allowing users to view and interact with web content while still seeing through transparent areas to the windows below. Ideal for tracing, annotation, and overlay applications.

## Core Features

### Window Management
- **Transparent window** with no default frame/chrome
- **Toggleable UI elements**:
  - Window borders/frame for resizing
  - Navigation controls
  - URL bar (modal)
- **Toggleable fullscreen mode**
- **Draggable regions** for repositioning the window

### Browser Functionality
- **Complete web browsing capabilities**
- **Navigation controls**: back, forward, reload
- **URL input field** (modal, appears on demand)
- **Event passthrough**: ensure mouse/keyboard events work properly
- **Web permissions support**:
  - MIDI access
  - Bluetooth connectivity
  - Camera/microphone access
  - Other device APIs

### User Experience
- **Keyboard shortcuts** for all major functions
- **Minimal UI** that doesn't interfere with content
- **Auto-hiding controls** after period of inactivity

## Technical Implementation

### 1. Electron Window Configuration
```javascript
const mainWindow = new BrowserWindow({
  width: 800,
  height: 600,
  transparent: true,
  frame: false,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
    webviewTag: true,
    enableRemoteModule: true
  }
});
```

### 2. Browser Engine Integration
- Use a `<webview>` element or BrowserView for loading external content
- Configure proper permissions for device access

### 3. Permission Handling
```javascript
// In main process
app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('enable-web-bluetooth');

// For webview permissions
webview.addEventListener('permissionrequest', (event) => {
  if (event.permission === 'media' || 
      event.permission === 'midi' || 
      event.permission === 'bluetooth') {
    event.request.allow();
  }
});
```

### 4. UI Component Implementation
- Create minimal, toggleable UI components:
  - URL bar
  - Navigation buttons
  - Status indicators
  - Frame toggle control
  - Fullscreen toggle button

### 5. Keyboard Shortcuts
| Function | Shortcut |
|----------|----------|
| Toggle URL bar | Ctrl/Cmd+L |
| Toggle UI | Ctrl/Cmd+U |
| Back | Alt+Left |
| Forward | Alt+Right |
| Reload | Ctrl/Cmd+R |
| Toggle fullscreen | F11 |
| Toggle window frame | Ctrl/Cmd+B |

### 6. CSS Considerations
- Use high-contrast UI elements for visibility
- Implement smooth transitions for UI elements
- Ensure UI can be seen against any background

## Implementation Phases

### Phase 1: Core Window & Browser Setup
- Configure transparent, frameless window
- Implement basic webview/browsing capability
- Set up URL bar functionality

### Phase 2: UI and Navigation
- Implement navigation controls
- Create toggleable UI system
- Add keyboard shortcuts

### Phase 3: Permissions & Advanced Features
- Implement device permission handling
- Add fullscreen toggle functionality
- Ensure event passthrough works correctly

### Phase 4: Refinement
- Optimize performance
- Improve UI/UX
- Fix any edge cases or bugs

## Technical Considerations
1. **Event handling**: Ensure events properly pass through to loaded content
2. **Performance**: Monitor resource usage, especially with transparency
3. **Security**: Review webview security settings
4. **Cross-platform**: Test on Windows, macOS and Linux
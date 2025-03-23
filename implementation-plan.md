# CloudyWindow Implementation Plan - v0.2 (Revised)

## 1. Introduction

This document outlines the implementation plan for CloudyWindow, a transparent browser overlay application built with Electron. This plan addresses the afterimage issue in the previous version by using an `iframe` within a standard `BrowserWindow` instead of the `<webview>` tag.

## 2. Core Requirements

The application must:

1. **Display a transparent browser window:** The main window should be transparent.
2. **Load and display web content:** Load and display web content from a URL or local file.
3. **Support basic browser navigation:** Back, forward, and reload.
4. **Provide a URL input:** Allow the user to enter a URL.
5. **Support file opening:** Open local HTML files via a file dialog or drag-and-drop.
6. **Allow window resizing:** Resize the frameless window.
7. **Toggle UI visibility:** Toggle the visibility of the UI elements.
8. **Maintain transparency:** Maintain transparency even when resizing, toggling the UI, or loading different content. Resolve the afterimage issue.
9. **Provide keyboard shortcuts:** Keyboard shortcuts for common actions.

## 3. Clarifications and Design Decisions

- **UI Framework:** Plain HTML, CSS, and JavaScript will be used for the UI elements, as clarified by the user.
- **Design:** A simple, functional design with a dark theme will be implemented.
- **Initial URL:** The application will initially load the `default.html` page.

## 4. File Structure

```html
cloudywindow/
├── index.html      (Main HTML structure)
├── styles.css      (Styles for the application)
├── main.js         (Electron main process)
├── preload.js      (Preload script for security)
├── renderer.js     (Renderer process logic)
└── default.html    (Default page to display)
```

## 5. Technologies

- Electron (with `BrowserWindow`, not `<webview>`)
- HTML
- CSS (with particular attention to transparency and blending, and dark theme)
- JavaScript (ES6+)
- Node.js (for file system access in the main process)

## 6. Detailed Implementation Steps

The following steps expand on the original plan, incorporating the clarifications and design decisions:

### `index.html`

- Basic HTML structure.
- Include `styles.css` and `renderer.js`.
- A `div` container for UI elements and the `iframe`.
- An `iframe` element, initially set to `src="default.html"`.

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CloudyWindow</title>
    <link rel="stylesheet" href="./styles.css">
</head>
<body>
    <div id="ui-container">
        <input type="text" id="url-input" placeholder="Enter URL or drop file">
        <button id="go-button">Go</button>
        <button id="back-button">Back</button>
        <button id="forward-button">Forward</button>
        <button id="reload-button">Reload</button>
        <button id="toggle-ui-button">Toggle UI</button>
    </div>
    <iframe id="content-frame" src="default.html" frameborder="0"></iframe>
    <script src="./renderer.js"></script>
</body>
</html>
```

### `styles.css`

- `body`: `background-color: transparent;`
- `#ui-container`: Positioned absolutely, with a dark background and appropriate styling for the UI elements. `z-index` to ensure it's above the `iframe`. Initially hidden.
- `#content-frame`: Fills the entire window (`width: 100%`, `height: 100%`, `position: absolute`, `top: 0`, `left: 0`).
- Dark theme styling for all UI elements.
- Styling for drag-and-drop and resize handles.
- Avoid using thansitions because they conflict with transparency/ascii animatin.

### `main.js`

- Create a `BrowserWindow` with `transparent: true` and `frame: false`.
- Load `index.html`.
- Handle window resizing (`ipcMain.on('set-window-size')`).
- Handle file open dialog (`dialog.showOpenDialog`).
- Handle IPC messages for navigation and URL updates.
- Register global shortcuts (as specified in the original plan).

### `preload.js`

- Use `contextBridge` to expose safe APIs to the renderer:
  - `setWindowSize`
  - `updateURL`
  - `onLoadLastUrl`
  - `navigate`
  - `onNavigateTo`
  - `openFile`
  - `onFileSelected`
  - `clearIframe`

### `renderer.js`

- References to UI elements and the `iframe`.
- Event listeners for:
  - Navigation buttons.
  - URL input (Enter key and "Go" button).
  - UI toggle button (initially hidden).
  - File open button.
  - Drag and drop events.
  - Window resize events.
  - IPC messages.
- Functions for:
  - `navigateToUrl(url)`: Sets `iframe.src` to `about:blank` *then* to the new URL.
  - `openLocalFile(filePath)`: Construct a `file://` URL and call `navigateToUrl`.
  - `handleFileDrop(event)`: Handle dropped files.
  - `toggleUI()`: Toggle `#ui-container` visibility.
  - `setupResizeHandlers()`: Logic for resizing.
  - `clearIframeContent()`: Sets the iframe's src to about:blank.

### `default.html`

- A simple HTML page to be displayed initially. Could contain instructions or a welcome message.

## 7. Communication

- `ipcRenderer.invoke` and `ipcMain.handle` for synchronous communication.
- `ipcRenderer.send` and `ipcMain.on` for asynchronous communication.

## 8. Error Handling

- Implement error handling (e.g., display error messages).

## 9. Transparency Handling

- `body` in `styles.css`: `background-color: transparent;`
- `BrowserWindow`: `transparent: true`.
- `iframe`: Fills the entire window.

## 10. Animation Handling

- Ensure `iframe` content is cleared before rendering new frames.
- Guideline for loaded content: use `requestAnimationFrame`.

## 11. Keyboard Shortcuts

- Cmd+O / Ctrl+O: Open File
- Cmd+L / Ctrl+L: Toggle URL Bar
- Cmd+U / Ctrl+U: Toggle UI
- F11: Toggle Fullscreen
- Cmd+R / Ctrl+R: Reload
- Cmd+W / Ctrl+W: Close Window

## 12. Mermaid Diagram (Optional)

A state diagram could be useful to visualize the application's states (e.g., UI visible, UI hidden, loading, displaying content). However, given the relatively simple state transitions, it might not be strictly necessary. I will omit it for now but can add it if the user requests it.

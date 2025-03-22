# CloudyWindow Implementation Plan - v0.2

## Introduction

This document outlines a revised implementation plan for CloudyWindow, a transparent browser overlay application built with Electron. The previous implementation (v0.1) suffered from a persistent afterimage (ghosting) issue, particularly when resizing the window or toggling the UI. This plan proposes a new approach to address this issue and create a more robust and maintainable application.

## Core Requirements

The application must:

1.  **Display a transparent browser window:** The main window should be transparent, allowing the user to see through it to the content behind it.
2.  **Load and display web content:** The window should load and display web content from a specified URL or local file.
3.  **Support basic browser navigation:** The user should be able to navigate back, forward, and reload the web content.
4.  **Provide a URL input:** The user should be able to enter a URL to navigate to.
5.  **Support file opening:** The user should be able to open local HTML files via a file dialog or drag-and-drop.
6.  **Allow window resizing:** The user should be able to resize the frameless window.
7.  **Toggle UI visibility:** The user should be able to toggle the visibility of the UI elements (URL bar, buttons).
8.  **Maintain transparency:** The application should maintain transparency even when resizing, toggling the UI, or loading different content. The afterimage issue must be resolved.
9. **Provide keyboard shortcuts:** Provide keyboard shortcuts for common actions.

## Root Cause Analysis (v0.1 Issues)

The primary issue with the previous implementation was a persistent afterimage or "ghosting" effect. This occurred after resizing the window or toggling the UI visibility. Despite attempts to clear the webview's content using `webview.reload()`, `webview.loadURL('about:blank')`, and `webview.executeJavaScript('document.body.innerHTML = ""')`, and `webview.invalidate()`, the afterimage remained. This suggests a low-level issue with how Electron's webview handles rendering in transparent windows, possibly related to caching or buffering of previous frames. The fact that manually toggling fullscreen mode resolved the issue indicates that a full window redraw/refresh is needed, but standard webview methods are insufficient to trigger this.

## Proposed Solution (v0.2)

Instead of relying on the `webview` tag, which seems to be the source of the persistent rendering issues, I propose using a standard `BrowserWindow` with custom HTML, CSS, and JavaScript to render the web content. This gives us complete control over the rendering pipeline and avoids the potential limitations or bugs within the `webview` tag's handling of transparency.

Specifically, I propose using an `iframe` within the main `BrowserWindow` to display the web content. The `iframe` will be styled to fill the entire window, and we will manage its content and lifecycle directly. This approach offers several advantages:

*   **Direct Control:** We have full control over the `iframe`'s content and can directly manipulate its DOM, styles, and events.
*   **Avoidance of `webview` Issues:** We bypass any potential bugs or limitations in the `webview` tag's rendering, especially concerning transparency.
*   **Simplified Debugging:** Debugging becomes easier as we're working with standard web technologies within a regular `BrowserWindow`.
* **Flexibility:** We can more easily implement custom rendering logic or visual effects if needed.

To ensure proper clearing of content and prevent afterimages, we will:

1.  **Explicitly clear the `iframe`'s content:** Before loading new content, we will set the `iframe`'s `src` attribute to `about:blank`. This is a standard and reliable way to clear an iframe.
2.  **Use `requestAnimationFrame`:** We will use `requestAnimationFrame` to synchronize our rendering updates with the browser's repaint cycle. This can help prevent visual artifacts and ensure smooth transitions.

## Detailed Implementation Plan

1.  **File Structure:** Maintain the existing file structure:

    ```
    cloudywindow/
    ├── index.html      (Main HTML structure)
    ├── styles.css      (Styles for the application)
    ├── main.js         (Electron main process)
    ├── preload.js      (Preload script for security)
    ├── renderer.js     (Renderer process logic)
    └── default.html    (Default page to display)
    ```

2.  **Technologies:**

    *   Electron (with `BrowserWindow`, not `<webview>`)
    *   HTML
    *   CSS (with particular attention to transparency and blending)
    *   JavaScript (ES6+)
    *   Node.js (for file system access in the main process)

3.  **`index.html`:**

    *   Basic HTML structure.
    *   Include `styles.css` and `renderer.js`.
    *   Include a `div` to act as a container for the UI elements and the `iframe`.
    *   Include an `iframe` element, initially set to `src="default.html"`. This `iframe` will fill the entire window and display the web content.

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
            </div>
        <iframe id="content-frame" src="default.html" frameborder="0"></iframe>
        <script src="./renderer.js"></script>
    </body>
    </html>
    ```

4.  **`styles.css`:**

    *   Style the `body` for transparency (`background-color: transparent`).
    *   Style the `#ui-container` to position the UI elements (URL bar, buttons) correctly. Use `position: absolute` and `z-index` to ensure they appear above the `iframe`.
    *   Style the `#content-frame` to fill the entire window (`width: 100%`, `height: 100%`, `position: absolute`, `top: 0`, `left: 0`).
    *   Ensure proper styling for the URL input, buttons, and other UI elements.
    *   Handle drag and drop styling.
    *   Handle resize handle styling.

5.  **`main.js`:**

    *   Create a `BrowserWindow` with `transparent: true` and `frame: false`.
    *   Load `index.html` into the window.
    *   Handle window resizing using `ipcMain.on('set-window-size')`.
    *   Handle the file open dialog using `dialog.showOpenDialog`.
    *   Handle IPC messages for navigation (`navigate`), URL updates (`url-updated`), and clearing the `iframe` content.
    *   Register global shortcuts for UI toggling, URL bar toggling, and file opening.

6.  **`preload.js`:**

    *   Use `contextBridge` to expose safe APIs to the renderer process:
        *   `setWindowSize`
        *   `updateURL`
        *   `onLoadLastUrl`
        *   `navigate`
        *   `onNavigateTo`
        *   `openFile`
        *   `onFileSelected`
        *   `clearIframe` (new function)

7.  **`renderer.js`:**

    *   Get references to the UI elements and the `iframe`.
    *   Implement event listeners for:
        *   Navigation buttons (back, forward, reload).
        *   URL input (handling Enter key and "Go" button).
        *   UI toggle button.
        *   File open button.
        *   Drag and drop events.
        *   Window resize events (using the custom resize handles).
        *   IPC messages from the main process (`load-last-url`, `navigate-to-url`, `selected-file`).
    *   Implement functions for:
        *   `navigateToUrl(url)`:  This function should first set the iframe's src to `about:blank`, and *then* set the `src` to the new URL. This ensures the iframe is cleared before loading new content.
        *   `openLocalFile(filePath)`: Construct a `file://` URL and call `navigateToUrl`.
        *   `handleFileDrop(event)`: Handle dropped files (URLs and local files).
        *   `toggleUI()`: Toggle the visibility of the `#ui-container` element.
        *   `setupResizeHandlers()`: Implement the logic for resizing the frameless window using custom resize handles.
        * `clearIframeContent()`: Sets the iframe's src to about:blank.

8. **Communication:**
    * Use `ipcRenderer.invoke` and `ipcMain.handle` for synchronous communication between renderer and main (e.g. clearing the iframe).
    * Use `ipcRenderer.send` and `ipcMain.on` for asynchronous communication (e.g., window resizing, UI toggling).

9. **Error Handling:**
    * Implement appropriate error handling (e.g., displaying error messages to the user if a file fails to load).

10. **Transparency Handling:**
    * The `body` element in `styles.css` should have `background-color: transparent;`
    * The `BrowserWindow` should be created with `transparent: true`.
    * The `iframe` should fill the entire window.

11. **Animation Handling (Specific to the afterimage issue):**
    * Since the afterimage is related to an ASCII animation, the new implementation should ensure that the `iframe` content is completely cleared *before* any new frame of the animation is rendered. The `navigateToUrl` function, by setting `iframe.src = 'about:blank'`, should achieve this.
    * If the animation is driven by JavaScript within the loaded content, ensure that the animation logic uses `requestAnimationFrame` for smooth and consistent updates. This is more of a guideline for the content being loaded *into* the iframe, rather than something the CloudyWindow application itself can directly control. However, it's worth mentioning in the plan.

12. **Keyboard Shortcuts:**
    * Cmd+O / Ctrl+O: Open File
    * Cmd+L / Ctrl+L: Toggle URL Bar
    * Cmd+U / Ctrl+U: Toggle UI
    * F11: Toggle Fullscreen (Electron default)
    * Cmd+R / Ctrl+R: Reload
    * Cmd+W / Ctrl+W: Close Window

This plan provides a detailed outline for rebuilding CloudyWindow from scratch, addressing the core requirements and specifically targeting the afterimage issue by using an `iframe` within a standard `BrowserWindow` and carefully managing its content lifecycle. This approach should provide a more stable and predictable rendering pipeline, avoiding the problems encountered with the `webview` tag.
# Transparent Browser Overlay v0.2 Implementation Plan

## Overview
This document outlines the plan for implementing new features in version 0.2 of the Transparent Browser Overlay application. These features are designed to enhance the overlay's utility for design work, tracing, and general usage.

## Features

### 1. URL Bar Toggle with Auto-Resize
**Description:** Enhance the URL bar toggle (Cmd+U) to auto-resize the window when toggled, compensating for the space taken by the UI elements.

**Implementation Steps:**
- Modify the `toggleUrlBar()` function to measure the height of the UI elements
- Add logic to resize the window accordingly when toggling the UI on/off
- Ensure proper sizing in fullscreen mode
- Keep the elegant fading behavior as is

**Technical Approach:**
- Calculate height differences before/after toggle
- Use IPC to communicate with main process for resizing
- Handle fullscreen state detection and appropriate sizing

### 2. Background Opacity Slider
**Description:** Add a slider to control the opacity of the window background, rather than just having it completely transparent or opaque.

**Implementation Steps:**
- Add a slider control to the UI
- Connect to CSS variables to control background opacity
- Store opacity preference in localStorage
- Add keyboard shortcuts for quickly adjusting opacity (optional)

**Technical Approach:**
- Use CSS variables (--bg-opacity) to control the background-color rgba value
- Listen for slider changes and update the CSS variable
- Update opacity on window elements

### 3. Always-on-Top Toggle
**Description:** Allow the window to stay on top of all other applications.

**Implementation Steps:**
- Add a toggle button to the UI
- Implement IPC message to set the window's always-on-top property
- Add keyboard shortcut (e.g., Cmd+T)
- Store preference in localStorage

**Technical Approach:**
- Use Electron's `setAlwaysOnTop()` method
- Toggle state tracking in renderer process
- Visual indicator for when always-on-top is enabled

### 4. Click-Through / Event Pass-Through Mode
**Description:** Allow mouse events to pass through to applications below the overlay, making it perfect for tracing work.

**Implementation Steps:**
- Add a toggle button and keyboard shortcut (e.g., Cmd+P for "Pass-through")
- Implement `setIgnoreMouseEvents(true)` in the main process
- Ensure keyboard shortcut to toggle back (essential for usability)
- Visual indicator when in pass-through mode

**Technical Approach:**
- Use Electron's `setIgnoreMouseEvents(true)` with the `forward` option to allow specific regions to still receive events
- Handle different OS-specific behaviors
- Implement special overlay indicators when in pass-through mode

### 5. CSS Injection for Background Transparency
**Description:** Enable the ability to inject custom CSS into loaded webpages to remove or replace backgrounds, making sites like tldraw have transparent backgrounds.

**Implementation Steps:**
- Create a configurable CSS injection system
- Add presets for popular websites (tldraw, etc.)
- Provide a UI for custom CSS input
- Store per-site CSS preferences

**Technical Approach:**
- Use `webview.insertCSS()` to inject styles
- Create domain-specific rule matching
- Develop preset CSS rules for common applications
- Allow user to create and save custom rules
- Store rules in localStorage or a configuration file

## Implementation Priority
1. Build standalone app for testing
2. Background Opacity Slider (most straightforward)
3. Always-on-Top Toggle
4. CSS Injection for Background Transparency
5. Click-Through Mode
6. URL Bar Auto-Resize

## Technical Challenges

### CSS Injection Specificity
- Different websites have different approaches to backgrounds
- Need to handle iframes and shadow DOM elements
- May need to continuously inject CSS if sites use dynamic styling

### Click-Through Mode Usability
- Need reliable way to toggle back when in click-through mode
- May need visual indicator that doesn't interfere with underlying applications

### Window Sizing in Different States
- Need to properly handle window resizing in various states (fullscreen, with URL bar, without URL bar)
- Account for differences in UI element heights across platforms

## Next Steps
1. Create a new branch for v0.2 development
2. Implement features according to priority
3. Test each feature thoroughly
4. Prepare for v0.2 release
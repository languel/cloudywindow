# CloudyWindow Style Guide

## JavaScript Best Practices

### Function Design
- **Keep it simple**: Functions should do one thing and do it well
- **Avoid side effects**: Functions should not modify state outside their scope unless explicitly designed to do so
- **Return values**: Prefer return values over side effects

### Event Handling
- **Clean up event listeners**: Always remove event listeners when they're no longer needed
- **Debounce when appropriate**: For frequent events like resizing, use debouncing
- **Use event delegation**: When handling events for multiple similar elements

### CSS Interaction
- **Prefer classList**: Use element.classList.add/remove instead of direct style manipulation
- **Batch DOM updates**: Minimize reflows by batching related DOM changes

## CSS Organization

### Structure
1. Base elements
2. Layout components
3. UI components
4. States and modifiers
5. Animations
6. Media queries

### Naming Conventions
- Use descriptive, functional class names
- Prefer dashes for multi-word classes (e.g., `.browser-controls`)
- Use standardized state classes (`.hidden`, `.active`, etc.)

### Performance
- Avoid deeply nested selectors
- Minimize use of expensive properties (box-shadow, filters, etc.)
- Use hardware acceleration for animations (`transform`, `opacity`)

## Electron Best Practices

### IPC Communication
- Keep IPC messages clear and minimal
- Document the purpose of each IPC channel
- Handle errors in IPC communication gracefully

### Window Management
- Respect user window sizing and positioning
- Save window state between sessions
- Handle multi-monitor setups appropriately

### Resource Management
- Clean up resources when windows are closed
- Monitor memory usage, especially with webviews
- Use lazy-loading for expensive operations

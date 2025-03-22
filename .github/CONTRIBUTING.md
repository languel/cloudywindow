# Contributing to CloudyWindow

## Core Development Principles

1. **Do One Thing Well**
   - Keep functions focused on a single responsibility
   - Avoid overengineering simple solutions
   - Name functions based on what they do, not how they do it

2. **State Management**
   - Use local state variables when possible
   - Avoid global state except when absolutely necessary
   - Document all state variables clearly

3. **UI Manipulation**
   - Choose one approach consistently (either CSS classes OR direct style manipulation)
   - Prefer CSS classes for toggleable states
   - avoid transitions, just simple cuts (none)

4. **Code Patterns**
   - Implement minimal, focused changes
   - Test thoroughly before adding complexity
   - Avoid unnecessary abstractions

5. **Error Handling**
   - Handle errors at the appropriate level
   - Don't mask errors with excessive try/catch blocks
   - Provide clear error messages

## UI Guidelines

1. **Button Styling**
   - All buttons should have consistent height (30px)
   - Use Unicode symbols for button icons
   - Maintain proper alignment and padding

2. **Keyboard Shortcuts**
   - All main functions should have keyboard shortcuts
   - Document shortcuts in both code and user documentation
   - Follow platform conventions (Cmd for macOS, Ctrl for Windows/Linux)

## Code Style

1. **JavaScript**
   - Use camelCase for variables and functions
   - Keep lines under 100 characters
   - Document complex logic with comments

2. **CSS**
   - Organize CSS by component/feature
   - Use consistent naming conventions
   - Minimize use of !important

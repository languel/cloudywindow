## Project Overview

### Project Map Branch Description

The `projmap` branch is focused on implementing projection mapping functionality akin to the TouchDesigner Kantan mapper. The purpose of this branch is to enhance the user experience by providing intuitive tools for managing projection maps and associated windows.

### Features of the projmap Functionality:

1. **Projmap Mask Window**:  
   - Users will have access to a separate projmap mask window.  
   - This window will allow users to draw masks using a simple spline tool.  
   - Users can assign different windows to the created masks for tailored projection control.

2. **Secondary Window for Compositing**:  
   - The projmap tool will feature a secondary window that assembles and composites web views from various windows.  
   - This functionality allows users to send the composite output to a projector according to specific requirements.

### Reference Implementation

The implementation will draw inspiration from the Kantan mapper functionalities detailed in the following tutorial: [Kantan Mapper Tutorial](https://jmarsico.github.io/rsma2019/tutorials/td_projectionMapping/).
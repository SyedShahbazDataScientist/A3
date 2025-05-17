# Interactive Data Visualization Dashboard

An interactive, data-driven dashboard built with D3.js that allows users to upload and explore any flat JSON dataset through multiple advanced visualizations with dynamic brushing and linking.

## Overview

This dashboard dynamically adapts to user-uploaded JSON data and creates four different visualization types:

1. **Radial Bar Chart**: Visualizes quantities or distributions with interactive elements
2. **Chord Diagram**: Shows relationships between entities with bidirectional highlighting
3. **Force-Directed Graph**: Displays a network with zooming, panning, and cluster highlighting
4. **Sunburst Chart**: Presents hierarchies with interactive navigation and drill-down capabilities

Each visualization is linked to the others through brushing and selection, allowing for synchronized data exploration across different chart types.

## Features

- **Dynamic Data Loading**: Upload any flat JSON file or choose from sample datasets
- **Intelligent Field Selection**: Automatically identifies appropriate fields for each visualization type
- **Brushing & Linking**: Selections in one chart highlight related data across all visualizations
- **Advanced Filtering**: Filter data through both interactive selection and UI widgets
- **Consistent Color Mapping**: Entities maintain the same color across all visualizations
- **Responsive Design**: Adapts to different screen sizes and supports fullscreen mode

## How It Works

1. **Upload Data**: Use the drag-and-drop interface or file picker to upload a JSON file
2. **Field Selection**: The system automatically analyzes the data structure and recommends fields for each visualization type
3. **Apply Selection**: Once you've confirmed or adjusted the field selections, all visualizations render simultaneously
4. **Interactive Exploration**: 
   - Click on elements to select them across all charts
   - Use Ctrl/Shift for multi-selection
   - Filter data using category and range filters
   - Zoom, pan, and navigate through hierarchical elements

## Technical Implementation

- **Pure D3.js**: All visualizations are built using D3.js v7 without additional charting libraries
- **Modular Architecture**: Each visualization is encapsulated in its own class
- **Responsive Design**: Uses CSS Grid and Flexbox for a responsive layout
- **Browser Support**: Works in all modern browsers (Chrome, Firefox, Safari, Edge)

## Data Requirements

The dashboard works with any flat JSON data structure that contains:
- Array-based fields for relationships (required for Chord Diagram, Force Graph, and Sunburst Chart)
- Categorical fields for grouping and labeling
- Numerical fields for sizing and quantitative display

## Running Locally

1. Download this zip package.
2. Open index.html in a modern browser (or use a local server like `python -m http.server`)
3. Upload your own JSON file or use the included sample datasets

## Technical Challenges and Decisions

- **JSON Parser**: Built a robust JSON parser that can handle different structures (flat arrays, nested objects) and extract meaningful fields
- **Field Detection**: Implemented algorithms to detect appropriate field types (categorical, numerical, array) for different visualizations
- **D3 Integration**: Carefully managed D3.js update patterns for smooth transitions when data changes
- **Performance Optimization**: Used requestAnimationFrame and debounced events for smooth interaction even with large datasets

## AI Tools Usage
- **Github Copilot**: Initially written some code, and after that used Github copilot's help.
- **Prompts**: 

1. **Architecture & Data Handling:**
   - "Design a modular architecture for a D3.js dashboard that efficiently handles dynamic data loading and visualization rendering while maintaining separation of concerns between data processing, visualization, and UI components."
   - "Create a robust JSON parser that can handle varied structures including nested objects and arrays, automatically identifying suitable fields for different visualization types while handling edge cases and malformed data."
   - "Implement an algorithm that analyzes a flat JSON structure to identify categorical, numerical, and array-relationship fields, with appropriate heuristics for distinguishing identifiers from categorical variables."

2. **Radial Bar Chart Implementation:**
   - "Develop a D3.js radial bar chart with customizable inner and outer radii, smooth transitions for data updates, and precise angular calculations that accurately represent the underlying data values."
   - "Implement interactive elements in a radial bar chart including hover states, tooltips with formatted values, and click events that trigger global selection state changes across multiple visualizations."

3. **Chord Diagram Development:**
   - "Create a D3.js chord diagram with matrix transformation functions that properly handle relationship data from arbitrary JSON structures, ensuring correct reciprocal connections."
   - "Implement bidirectional highlighting in a chord diagram with optimized D3 selections that maintain performant rendering even with large datasets and complex interaction patterns."

4. **Force-Directed Graph Optimization:**
   - "Develop a force-directed graph visualization using D3's force simulation with customized force parameters that achieve visual clarity while maintaining physical accuracy in node positioning."
   - "Implement advanced interaction features for a force-directed graph including zoom/pan functionality, node dragging with force recalculation, and performance optimizations through quadtree-based collision detection."

5. **Sunburst Chart and Hierarchical Data:**
   - "Create a sunburst chart that dynamically generates hierarchical structures from flat data based on user-selected dimensions, with optimized space utilization for text labels and segments."
   - "Implement zoom and drill-down capabilities for a sunburst chart with smooth arc transitions that maintain user context, including breadcrumb navigation and efficient parent-child relationship tracking."

6. **Brushing and Linking System:**
   - "Design a global selection state management system that enables brushing and linking across heterogeneous visualization types with different underlying data structures and visual representations."
   - "Implement multi-selection capabilities using modifier keys (Ctrl/Shift) that integrate with D3's event system and propagate selection changes efficiently to all visualizations."

7. **Color Consistency and Accessibility:**
   - "Create a global color mapping system that maintains consistent entity colors across multiple visualization types while ensuring sufficient contrast and accessibility compliance."
   - "Implement dynamic color palette generation that scales with arbitrary numbers of data categories while avoiding perceptual conflicts and maintaining distinguishability."

8. **Performance Optimization:**
   - "Optimize D3.js rendering performance for interactive visualizations through strategic use of enter/update/exit patterns and efficient DOM manipulation to maintain responsiveness even with larger datasets."
   - "Implement data filtering and selection propagation techniques that maintain visual consistency across all four visualization types while minimizing computational overhead during interactions."

9. **Responsive Design and Visualization Controls:**
   - "Design a responsive grid-based dashboard layout that maintains proper spacing and proportions across different screen sizes while preserving the integrity of each D3.js visualization."
   - "Implement collapsible UI sections for data input, field selection, and filtering panels that maximize available screen space for visualizations while maintaining accessibility to controls."

10. **User Experience and Edge Cases:**
    - "Create a fullscreen mode for visualizations that properly maintains aspect ratios, preserves interactivity, and correctly restores original dimensions when exiting fullscreen."
    - "Design a robust error handling system for JSON data processing that validates field selections, provides meaningful feedback, and gracefully handles missing or malformed data."

11. **Filtering and Selection System:**
    - "Develop dual-mode filtering capabilities that support both UI-based filtering through categorical checkboxes and numerical range sliders, as well as direct interactive selection within visualizations."
    - "Implement a unified selection state management system that synchronizes selections across radial bar, chord diagram, force-directed graph and sunburst visualizations with visual feedback in each chart."

12. **Data Exploration Features:**
    - "Design interactive tooltips with context-sensitive information display that adapts content based on the visualization type and data point being inspected."
    - "Implement hierarchical navigation in the sunburst chart with breadcrumb trail and zooming capabilities that maintain user context during data exploration."

## Author

SyedShahbazDataScientist

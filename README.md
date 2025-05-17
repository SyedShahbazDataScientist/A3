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

1. Clone this repository
2. Open index.html in a modern browser (or use a local server like `python -m http.server`)
3. Upload your own JSON file or use the included sample datasets

## Technical Challenges and Decisions

- **JSON Parser**: Built a robust JSON parser that can handle different structures (flat arrays, nested objects) and extract meaningful fields
- **Field Detection**: Implemented algorithms to detect appropriate field types (categorical, numerical, array) for different visualizations
- **D3 Integration**: Carefully managed D3.js update patterns for smooth transitions when data changes
- **Performance Optimization**: Used requestAnimationFrame and debounced events for smooth interaction even with large datasets

## Limitations and Future Improvements

- Currently limited to flat JSON structures; hierarchical JSON requires preprocessing
- Planning to add custom color themes and export functionality
- Future versions will support direct database connections

## Author

SyedShahbazDataScientist

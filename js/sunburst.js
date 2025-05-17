class SunburstChart {
    constructor(selector, tooltip, dashboard) {
        this.container = d3.select(selector);
        this.tooltip = tooltip;
        this.dashboard = dashboard;
        
        // Chart dimensions will be set during rendering
        this.width = 0;
        this.height = 0;
        
        // Create SVG element
        this.svg = this.container.append('svg');
        
        // Add breadcrumb navigation
        this.breadcrumb = this.container.append('div')
            .attr('class', 'breadcrumb')
            .style('position', 'absolute')
            .style('top', '5px')
            .style('left', '5px')
            .style('font-size', '12px')
            .style('padding', '5px');
    }
    
    render(data, fieldSelection, selectedItems, colorMapping) {
        // Clear previous rendering
        this.svg.selectAll('*').remove();
        this.breadcrumb.html('<span>Home</span>');
        
        // Update dimensions
        this.width = this.container.node().clientWidth;
        this.height = 400;
        const radius = Math.min(this.width, this.height) / 2;
        
        // Update SVG dimensions
        this.svg
            .attr('width', this.width)
            .attr('height', this.height);
            
        // Add help text for interactions
        this.svg.append("text")
            .attr("class", "help-text")
            .attr("x", 10)
            .attr("y", 20)
            .attr("font-size", "10px")
            .attr("fill", "#666")
            .text("Scroll to zoom, click segments to navigate, Shift+click to select");
            
        // Create main container group for zoom
        const g = this.svg.append('g')
            .attr('transform', `translate(${this.width/2},${this.height/2})`);
            
        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 5])
            .extent([[0, 0], [this.width, this.height]])
            .on("zoom", event => {
                g.attr("transform", `translate(${this.width/2},${this.height/2}) scale(${event.transform.k})`);
                // Adjust stroke width inversely with zoom to keep line thickness consistent
                g.selectAll('.sunburst-arc')
                    .style('stroke-width', 0.5 / event.transform.k);
                // Scale down text size inversely with zoom to maintain readability
                g.selectAll('.sunburst-label')
                    .style('font-size', `${10 / Math.sqrt(event.transform.k)}px`);
            });
            
        this.svg.call(zoom);
        
        // Center text for showing current focus
        const centerText = g.append('text')
            .attr('class', 'center-text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', '14px')
            .style('opacity', 0);
            
        // Check if we have necessary fields
        if (!fieldSelection.entity || !fieldSelection.group || !fieldSelection.relations) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .text('Please select entity, group, and relations fields');
            return;
        }
        
        // Use selected fields
        const entityField = fieldSelection.entity;
        const groupField = fieldSelection.group;
        const relationField = fieldSelection.relations;
        
        // Check if data has required fields
        if (data.length === 0 || 
            !data[0][relationField] || !Array.isArray(data[0][relationField]) ||
            !data[0][groupField]) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .text('Invalid data format for sunburst chart');
            return;
        }
        
        // Create more detailed hierarchical structure for sunburst
        const entityNodes = data.map(d => {
            // Calculate a value based on number of relations
            const relationsCount = d[relationField].length;
            
            return {
                name: d[entityField],
                originalData: d, // Store original data for linking
                value: 1,
                children: [{
                    name: d[groupField],
                    value: relationsCount,
                    children: d[relationField].map(c => ({
                        name: c,
                        value: 1,
                        originalEntity: d[entityField] // Link back to parent entity
                    }))
                }]
            };
        });
        
        // Create hierarchy
        const hierarchy = {
            name: "root",
            children: entityNodes
        };
        
        // Create hierarchy and partition
        const root = d3.hierarchy(hierarchy)
            .sum(d => d.value || 1);
            
        // Set color scale ensuring consistent colors
        const entities = data.map(d => d[entityField]);
        const groups = [...new Set(data.map(d => d[groupField]))];
        const relations = [...new Set(data.flatMap(d => d[relationField]))];
        
        const color = d => {
            // For hierarchical coloring with enhanced contrast
            if (d.depth === 0) return "#e0e0e0"; // Root - light gray instead of white
            if (d.depth === 1) return colorMapping[d.data.name] || d3.schemeSet3[d.depth % 12]; // Entity
            if (d.depth === 2) return colorMapping[d.data.name] || d3.schemeSet2[d.depth % 8]; // Group
            return colorMapping[d.data.name] || d3.schemeTableau10[d.depth % 10]; // Relations
        };
        
        // Current view parameters
        let currentView = {
            node: root,
            depth: 0
        };
        
        // Create partition layout
        const partition = d3.partition()
            .size([2 * Math.PI, radius]);
            
        partition(root);
        
        // Function to update the visualization when zooming
        const updateView = (node) => {
            // Track the current view node
            currentView.node = node;
            currentView.depth = node.depth;
            
            // Reset zoom transform when changing view
            this.svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
            
            // Update breadcrumb
            const ancestors = node.ancestors().reverse();
            
            this.breadcrumb.html('');
            ancestors.forEach((d, i) => {
                this.breadcrumb.append('span')
                    .text(i === 0 ? 'Home' : d.data.name)
                    .style('cursor', 'pointer')
                    .style('color', i === ancestors.length - 1 ? '#333' : '#3498db')
                    .on('click', () => {
                        if (i < ancestors.length - 1) {
                            updateView(ancestors[i]);
                        }
                    });
                    
                if (i < ancestors.length - 1) {
                    this.breadcrumb.append('span').text(' > ');
                }
            });
            
            // Center text
            if (node !== root) {
                centerText.text(node.data.name)
                    .transition()
                    .duration(500)
                    .style('opacity', 1);
            } else {
                centerText.transition()
                    .duration(500)
                    .style('opacity', 0);
            }
            
            // Create a new root based on the focused node
            const focusedNode = node === root ? root : 
                d3.hierarchy(node.data)
                    .sum(d => d.value || 1);
                    
            partition(focusedNode);
            
            // Define arc generator based on focused node
            const arc = d3.arc()
                .startAngle(d => d.x0)
                .endAngle(d => d.x1)
                .innerRadius(d => Math.sqrt(d.y0))
                .outerRadius(d => Math.sqrt(d.y1));
                
            // Update paths
            const paths = g.selectAll('path')
                .data(focusedNode.descendants().slice(1), d => d.data.name + d.depth); // Unique key
                
            // Exit old paths with animation
            paths.exit()
                .transition()
                .duration(500)
                .attrTween('d', d => {
                    const interpolate = d3.interpolate(
                        { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 },
                        { x0: (d.x0 + d.x1) / 2, x1: (d.x0 + d.x1) / 2, y0: 0, y1: 0 }
                    );
                    return t => arc(interpolate(t));
                })
                .remove();
                
            // Enter new paths
            const enterPaths = paths.enter()
                .append('path')
                .attr('class', 'sunburst-arc')
                .style('fill', color)
                .style('opacity', 0)
                .style('stroke', 'white')
                .style('stroke-width', 0.5);
                
            // Update all paths (enter + update)
            enterPaths.merge(paths)
                .transition()
                .duration(750)
                .attrTween('d', d => {
                    const interpolate = d3.interpolate(
                        { x0: (d.x0 + d.x1) / 2, x1: (d.x0 + d.x1) / 2, y0: 0, y1: 0 },
                        { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 }
                    );
                    return t => arc(interpolate(t));
                })
                .style('opacity', d => {
                    const name = d.data.name;
                    return selectedItems.size > 0 ? 
                        (selectedItems.has(name) ? 1 : 0.3) : 0.8;
                });
                
            // Add interactivity to all paths
            g.selectAll('.sunburst-arc')
                .on('mouseover', (event, d) => {
                    // Create path description
                    let pathToRoot = d.ancestors().reverse().map(n => n.data.name).slice(1).join(' > ');
                    
                    // Add value information
                    let valueInfo = '';
                    if (d.value) {
                        valueInfo = `<br><strong>Value:</strong> ${d.value}`;
                    }
                    
                    // Add original data if available
                    if (d.data.originalData) {
                        valueInfo += '<hr>';
                        Object.entries(d.data.originalData).forEach(([key, value]) => {
                            if (!Array.isArray(value) && typeof value !== 'object') {
                                valueInfo += `<br>${key}: ${value}`;
                            }
                        });
                    }
                    
                    this.tooltip.transition()
                        .duration(200)
                        .style('opacity', 0.9);
                    this.tooltip.html(`<strong>${d.data.name}</strong><br>${pathToRoot}${valueInfo}`)
                        .style('left', (event.pageX + 5) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                        
                    // Highlight current path
                    g.selectAll('.sunburst-arc')
                        .style('opacity', node => 
                            d.ancestors().indexOf(node) >= 0 ? 1 : 0.3);
                })
                .on('mouseout', () => {
                    this.tooltip.transition()
                        .duration(500)
                        .style('opacity', 0);
                        
                    // Reset highlight based on selection
                    g.selectAll('.sunburst-arc')
                        .style('opacity', node => {
                            const name = node.data.name;
                            return selectedItems.size > 0 ? 
                                (selectedItems.has(name) ? 1 : 0.3) : 0.8;
                        });
                })
                .on('click', (event, d) => {
                    // If shift-click, just select the item
                    if (event.shiftKey || event.ctrlKey) {
                        this.dashboard.handleSelection(d.data.name, event);
                        return;
                    }
                    
                    // Regular click - zoom if not leaf
                    if (d.children) {
                        updateView(d);
                    } else {
                        // If leaf node, select the item
                        this.dashboard.handleSelection(d.data.name, event);
                    }
                });
                
            // Update labels
            const labels = g.selectAll('.sunburst-label')
                .data(focusedNode.descendants().filter(d => (d.x1 - d.x0) > 0.15));
                
            // Remove old labels
            labels.exit().remove();
            
            // Enter new labels
            const enterLabels = labels.enter()
                .append('text')
                .attr('class', 'sunburst-label')
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .style('pointer-events', 'none')
                .style('opacity', 0);
                
            // Update all labels
            enterLabels.merge(labels)
                .text(d => d.data.name)
                .transition()
                .duration(750)
                .attr('transform', d => {
                    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI - 90;
                    const y = Math.sqrt((d.y0 + d.y1) / 2);
                    return `rotate(${x}) translate(${y},0) rotate(${x < 90 || x > 270 ? 0 : 180})`;
                })
                .style('fill', d => d.depth > 2 ? '#fff' : '#000')
                .style('opacity', 1);
                
            // Add zoom out button in the center if not at root
            const zoomOutButton = g.selectAll('.zoom-out')
                .data(node === root ? [] : [node]);
                
            zoomOutButton.exit()
                .transition()
                .duration(500)
                .style('opacity', 0)
                .remove();
                
            zoomOutButton.enter()
                .append('circle')
                .attr('class', 'zoom-out')
                .attr('r', 20)
                .attr('fill', '#f8f9fa')
                .attr('stroke', '#dee2e6')
                .style('cursor', 'pointer')
                .style('opacity', 0)
                .on('click', () => updateView(root))
                .transition()
                .duration(500)
                .style('opacity', 0.7);
                
            // Add zoom out icon
            const zoomOutIcon = g.selectAll('.zoom-out-icon')
                .data(node === root ? [] : [node]);
                
            zoomOutIcon.exit()
                .transition()
                .duration(500)
                .style('opacity', 0)
                .remove();
                
            zoomOutIcon.enter()
                .append('text')
                .attr('class', 'zoom-out-icon')
                .text('🔍')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .style('cursor', 'pointer')
                .style('opacity', 0)
                .style('font-size', '14px')
                .on('click', () => updateView(root))
                .transition()
                .duration(500)
                .style('opacity', 1);
        };
        
        // Initialize view
        updateView(root);
        
        // Add double-click handler to reset zoom
        this.svg.on("dblclick", () => {
            this.svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        });
    }
}

/**
 * Sunburst Chart - Interactive hierarchical visualization with drill-down capability
 */
class SunburstChart {
    constructor(containerId, data, fieldSelections, colorMapping, tooltip, selectedItems) {
        this.containerId = containerId;
        this.data = data;
        this.fieldSelections = fieldSelections;
        this.colorMapping = colorMapping;
        this.tooltip = tooltip;
        this.selectedItems = selectedItems;
        
        // Chart state
        this.currentView = {
            node: null,
            depth: 0
        };
        
        // Chart dimensions
        this.width = 0;
        this.height = 0;
        this.radius = 0;
        
        // Zoom state
        this.currentZoom = 1;
        this.zoomable = true;
        
        // Animation duration
        this.duration = 750;
        
        // Color settings - avoid white completely
        this.colors = {
            stroke: '#d0d0d0',       // Medium gray for strokes
            textLight: '#202020',    // Very dark gray for text (almost black)
            centerFill: '#f0f0f0',   // Light gray for center circle
            centerStroke: '#c0c0c0', // Medium gray for center circle stroke
            textDark: '#000000'      // Black for text
        };
        
        // Text size settings - 4x smaller
        this.textSizes = {
            help: 2,           // Was 8px, now 2px
            center: 2.5,       // Was 10px, now 2.5px
            labelLarge: 1.8,   // Was 7px, now 1.8px
            labelMedium: 1.5,  // Was 6px, now 1.5px
            labelSmall: 1.2,   // Was 5px, now 1.2px
            labelTiny: 1       // Was 4px, now 1px
        };
        
        // Stroke width settings - reduced by half
        this.strokeWidths = {
            arc: 0.25,          // Was 0.5, now 0.25
            highlight: 1,       // Was 2, now 1
            center: 0.5         // Was 1, now 0.5
        };
    }
    
    render() {
        const container = document.getElementById(this.containerId);
        container.innerHTML = '';
        
        // Get container dimensions
        const rect = container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height || 400;
        
        // Increase chart size by 3x (adjust radius calculation)
        this.radius = Math.min(this.width, this.height) * 0.48 * 3;
        
        // Create SVG with proper dimensions
        this.svg = d3.select('#' + this.containerId)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .style('overflow', 'visible'); // Allow overflow for zoom
        
        // Add breadcrumb navigation with black text and smaller font
        const breadcrumb = d3.select('#' + this.containerId)
            .append('div')
            .attr('class', 'breadcrumb')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('left', '10px')
            .style('background-color', 'rgba(240, 240, 240, 0.9)') 
            .style('font-size', '3px'); // 4x smaller breadcrumb text
            
        breadcrumb.append('span')
            .text('Home')
            .style('cursor', 'pointer')
            .style('font-weight', 'bold')
            .style('color', '#000')  
            .on('click', () => {
                if (this.currentView.depth > 0) {
                    this.zoomToRoot();
                }
            });
        
        // Add help text - make it 4x smaller
        this.svg.append('text')
            .attr('class', 'help-text')
            .attr('x', 10)
            .attr('y', 40)
            .attr('fill', '#333')
            .style('font-size', `${this.textSizes.help}px`)
            .text('Click segments to zoom in, click center to zoom out');
            
        // Create center group for the chart
        this.centerG = this.svg.append('g')
            .attr('class', 'sunburst-container')
            .attr('transform', `translate(${this.width/2}, ${this.height/2})`);
            
        // Add zoom behavior with increased maximum scale (4x deeper zoom)
        const zoom = d3.zoom()
            .scaleExtent([0.5, 40])  // Increase maximum zoom by 4x (was 10)
            .on('zoom', event => {
                if (this.zoomable) {
                    this.centerG.attr('transform', `translate(${this.width/2 + event.transform.x}, ${this.height/2 + event.transform.y}) scale(${event.transform.k})`);
                    this.currentZoom = event.transform.k;
                }
            });
            
        this.svg.call(zoom);
        
        // Update the center circle
        this.centerG.append('circle')
            .attr('class', 'center-circle')
            .attr('r', 15)
            .attr('fill', this.colors.centerFill)
            .attr('stroke', this.colors.centerStroke)
            .attr('stroke-width', this.strokeWidths.center) // Reduced stroke width
            .style('opacity', 0.7)
            .style('cursor', 'pointer')
            .on('click', () => this.zoomOut());
        
        // Update center text - make it 4x smaller
        this.centerText = this.centerG.append('text')
            .attr('class', 'center-text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', `${this.textSizes.center}px`)
            .style('fill', this.colors.textDark)
            .style('pointer-events', 'none')
            .style('opacity', 0);
        
        // Remove home icon from center (by not adding it)
        
        // Adjust center circle click area
        this.centerG.append('circle')
            .attr('r', 20)
            .attr('fill', 'transparent')
            .style('cursor', 'pointer')
            .on('click', () => this.zoomOut());
        
        // Check if we have necessary fields
        if (!this.fieldSelections.entity || !this.fieldSelections.group || !this.fieldSelections.relations) {
            this.centerG.append('text')
                .attr('text-anchor', 'middle')
                .text('Please select entity, group, and relations fields')
                .style('font-size', '14px');
            return;
        }
        
        try {
            // Create hierarchy data
            const root = this.createHierarchy();
            if (!root) {
                throw new Error("Could not create hierarchy");
            }
            
            // Store current view
            this.currentView.node = root;
            
            // Initial draw
            this.updateView(root);
            
        } catch (error) {
            console.error("Error rendering sunburst chart:", error);
            this.centerG.append('text')
                .attr('text-anchor', 'middle')
                .text('Error creating sunburst visualization')
                .style('font-size', '14px');
        }
        
        // Add resize handler
        this.resizeHandler = () => this.resize();
        window.addEventListener('resize', this.resizeHandler);
        
        // Expose resize method for external calls (like fullscreen toggle)
        container.sunburstResize = () => this.resize();
    }
    
    createHierarchy() {
        // Use selected fields
        const entityField = this.fieldSelections.entity;
        const groupField = this.fieldSelections.group;
        const relationField = this.fieldSelections.relations;
        
        // Check data validity
        if (!this.data || this.data.length === 0 || 
            !this.data[0][entityField] || 
            !this.data[0][groupField] || 
            !this.data[0][relationField] || 
            !Array.isArray(this.data[0][relationField])) {
            return null;
        }
        
        // Build hierarchy structure
        const entityNodes = this.data.map(d => {
            const relationsCount = d[relationField].length || 0;
            
            return {
                name: d[entityField],
                originalData: d,
                value: 1,
                children: [{
                    name: d[groupField] || 'Unknown',
                    value: relationsCount || 1,
                    children: d[relationField].map(r => ({
                        name: r,
                        value: 1,
                        originalEntity: d[entityField]
                    }))
                }]
            };
        });
        
        // Root node
        const hierarchyData = {
            name: "root",
            children: entityNodes
        };
        
        // Create D3 hierarchy and compute values
        const root = d3.hierarchy(hierarchyData)
            .sum(d => d.value || 1);
            
        return root;
    }
    
    updateView(node) {
        // Store current view node
        this.currentView.node = node;
        this.currentView.depth = node.depth;
        
        // Update breadcrumb
        this.updateBreadcrumb(node);
        
        // Update center circle text
        if (node.depth > 0) {
            // Show current node name in center with smaller text
            this.centerText
                .text(node.data.name.length > 20 ? node.data.name.substring(0, 20) + '...' : node.data.name)
                .transition()
                .duration(300)
                .style('opacity', 1)
                .style('font-size', `${this.textSizes.center}px`); // Ensure font size is maintained
                
        } else {
            // For root level, just hide the text (no home icon to show)
            this.centerText.transition().duration(300).style('opacity', 0);
        }
        
        // Create partition layout
        const partition = d3.partition()
            .size([2 * Math.PI, this.radius]);
            
        // Process the data
        const root = partition(node.depth === 0 
            ? node 
            : d3.hierarchy(node.data).sum(d => d.value || 1));
        
        // Define arc generator
        const arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .innerRadius(d => Math.sqrt(d.y0))
            .outerRadius(d => Math.sqrt(d.y1));
        
        // Remove old arcs and labels
        this.centerG.selectAll('.sunburst-arc').remove();
        this.centerG.selectAll('.sunburst-label').remove();
        
        // Add arcs
        const arcs = this.centerG.selectAll('.sunburst-arc')
            .data(root.descendants().slice(1))
            .enter()
            .append('path')
            .attr('class', 'sunburst-arc')
            .attr('d', arc)
            .style('fill', d => this.getColor(d))
            .style('stroke', this.colors.stroke)
            .style('stroke-width', this.strokeWidths.arc) // Reduced stroke width
            .style('opacity', d => this.getOpacity(d))
            .on('mouseover', (event, d) => this.handleMouseOver(event, d))
            .on('mouseout', (event, d) => this.handleMouseOut())
            .on('click', (event, d) => this.handleClick(event, d));
            
        // Add labels to segments with enough space - use 4x smaller text
        root.descendants()
            .filter(d => (d.x1 - d.x0) > 0.12 && d.depth > 0)
            .forEach(d => {
                const angle = (d.x0 + d.x1) / 2;
                const radius = Math.sqrt((d.y0 + d.y1) / 2);
                const x = radius * Math.sin(angle);
                const y = -radius * Math.cos(angle);
                
                // Calculate rotation to make text readable
                const rotation = (angle * 180 / Math.PI - 90) % 180 - 90;
                
                // Use 4x smaller font sizes based on segment size
                let fontSize = this.textSizes.labelMedium;  // Default to medium
                
                // Adjust font size based on segment size and depth
                if ((d.x1 - d.x0) > 0.25) fontSize = this.textSizes.labelLarge;
                if ((d.x1 - d.x0) < 0.15) fontSize = this.textSizes.labelSmall;
                if ((d.x1 - d.x0) < 0.1) fontSize = this.textSizes.labelTiny;
                
                // Determine background brightness for text contrast
                const fillColor = d3.rgb(this.getColor(d));
                const isLight = (fillColor.r * 0.299 + fillColor.g * 0.587 + fillColor.b * 0.114) > 150;
                
                // Create label with smaller text
                this.centerG.append('text')
                    .attr('class', 'sunburst-label')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('transform', `rotate(${rotation}, ${x}, ${y})`)
                    .attr('text-anchor', 'middle')
                    .style('fill', isLight ? '#000000' : '#202020')
                    .style('font-size', `${fontSize}px`) // Use the 4x smaller font size
                    .style('font-weight', isLight ? '400' : '600')
                    .style('pointer-events', 'none')
                    .text(d.data.name.length > 8 ? d.data.name.substring(0, 8) + '..' : d.data.name);  // Shorter text for smaller font
            });
    }
    
    updateBreadcrumb(node) {
        // Get ancestors chain
        const ancestors = node.ancestors().reverse();
        
        // Update breadcrumb
        const breadcrumb = d3.select('#' + this.containerId)
            .select('.breadcrumb');
            
        breadcrumb.html('');
        
        // Add each ancestor as a breadcrumb item
        ancestors.forEach((d, i) => {
            breadcrumb.append('span')
                .text(i === 0 ? 'Home' : d.data.name.length > 6 ? d.data.name.substring(0, 6) + '..' : d.data.name)
                .style('font-weight', i === ancestors.length - 1 ? 'bold' : 'normal')
                .style('cursor', 'pointer')
                .style('font-size', '3px') // Ensure breadcrumb text is small
                .on('click', () => {
                    if (i < ancestors.length - 1) {
                        this.updateView(ancestors[i]);
                    }
                });
                
            // Add separator between breadcrumb items
            if (i < ancestors.length - 1) {
                breadcrumb.append('span')
                    .text(' > ')
                    .style('color', '#666')
                    .style('pointer-events', 'none');
            }
        });
    }
    
    getColor(d) {
        // Get color from global mapping if available
        if (this.colorMapping[d.data.name]) {
            return this.colorMapping[d.data.name];
        }
        
        // Fallback color schemes by depth
        const colorSchemes = [
            d3.schemeCategory10, // Root
            d3.schemeTableau10,  // First level
            d3.schemePastel1,    // Second level
            d3.schemeSet2        // Third level
        ];
        
        const schemeIndex = Math.min(d.depth, colorSchemes.length - 1);
        const scheme = colorSchemes[schemeIndex];
        const colorIndex = (d.parent ? d.parent.children.indexOf(d) : d.index) % scheme.length;
        
        return scheme[colorIndex];
    }
    
    getOpacity(d) {
        // Base opacity if nothing selected
        if (this.selectedItems.size === 0) return 0.9;  // Higher base opacity
        
        // Higher contrast between selected and unselected
        return this.selectedItems.has(d.data.name) ? 1 : 0.25;
    }
    
    handleMouseOver(event, d) {
        // Calculate tooltip position
        const mouse = d3.pointer(event);
        const svgRect = this.svg.node().getBoundingClientRect();
        const x = svgRect.left + mouse[0] + this.width/2;
        const y = svgRect.top + mouse[1] + this.height/2;
        
        // Create tooltip content
        let tooltipContent = `<strong>${d.data.name}</strong>`;
        
        // Add value info
        if (d.value) {
            tooltipContent += `<br>Value: ${d.value}`;
        }
        
        // Add original data if available
        if (d.data.originalData) {
            tooltipContent += '<hr>';
            Object.entries(d.data.originalData).forEach(([key, value]) => {
                if (!Array.isArray(value) && typeof value !== 'object') {
                    tooltipContent += `<br>${key}: ${value}`;
                }
            });
        }
        
        // Show tooltip
        this.tooltip.html(tooltipContent)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px')
            .transition()
            .duration(200)
            .style('opacity', 0.9);
            
        // Highlight current path with reduced stroke width for highlight
        this.centerG.selectAll('.sunburst-arc')
            .style('opacity', pathNode => {
                // Check if pathNode is in the ancestors path of d
                return d.ancestors().some(a => a === pathNode) ? 1 : 0.3;
            })
            .style('stroke-width', pathNode => {
                return pathNode === d ? this.strokeWidths.highlight : this.strokeWidths.arc; // Reduced highlight stroke
            })
            .style('stroke', pathNode => {
                return pathNode === d ? '#d0d0d0' : this.colors.stroke;
            });
    }
    
    handleMouseOut() {
        // Hide tooltip
        this.tooltip.transition()
            .duration(500)
            .style('opacity', 0);
            
        // Reset highlight with reduced stroke width
        this.centerG.selectAll('.sunburst-arc')
            .style('opacity', d => this.getOpacity(d))
            .style('stroke-width', this.strokeWidths.arc) // Reduced stroke width
            .style('stroke', this.colors.stroke);
    }
    
    handleClick(event, d) {
        // Handle shift/ctrl click for selection
        if (event.shiftKey || event.ctrlKey) {
            const name = d.data.name;
            
            // Toggle selection
            if (this.selectedItems.has(name)) {
                this.selectedItems.delete(name);
            } else {
                this.selectedItems.add(name);
            }
            
            // Update all arcs with new opacity based on selection
            this.centerG.selectAll('.sunburst-arc')
                .style('opacity', node => this.getOpacity(node));
                
            return;
        }
        
        // Regular click - zoom into segment if it has children
        if (d.children && d.children.length) {
            // Temporarily disable pan/zoom during transition
            this.zoomable = false;
            
            // Update view to show children of clicked segment
            this.updateView(d);
            
            // Re-enable pan/zoom after animation
            setTimeout(() => {
                this.zoomable = true;
            }, this.duration + 50);
        }
    }
    
    zoomOut() {
        // If at root, nothing to do
        if (this.currentView.depth <= 0) return;
        
        // Get parent node
        const parent = this.currentView.node.parent;
        if (!parent) return;
        
        // Zoom to parent
        this.updateView(parent);
    }
    
    zoomToRoot() {
        // Find root node
        let root = this.currentView.node;
        while (root.parent) {
            root = root.parent;
        }
        
        // Update view to show root
        this.updateView(root);
    }
    
    resize() {
        // Get new container dimensions
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        // Get computed dimensions
        const rect = container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height || 400;
        
        // Check if we're in fullscreen by looking at container size
        const isFullscreen = this.width > window.innerWidth * 0.8;
        
        // Use 3x larger space in all modes
        this.radius = isFullscreen 
            ? Math.min(this.width, this.height) * 0.48 * 3  // 3x larger in fullscreen
            : Math.min(this.width, this.height) * 0.45 * 3; // 3x larger in normal view
        
        // Update SVG dimensions
        this.svg
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`);
            
        // Update center group position
        this.centerG
            .attr('transform', `translate(${this.width/2}, ${this.height/2})`);
            
        // Re-render with current state
        if (this.currentView.node) {
            this.updateView(this.currentView.node);
        }
    }
    
    destroy() {
        // Remove event listeners
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
    }
}

// Export for use in main Dashboard
if (typeof module !== 'undefined') {
    module.exports = SunburstChart;
}

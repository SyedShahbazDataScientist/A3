class ChordDiagram {
    constructor(selector, tooltip, dashboard) {
        this.container = d3.select(selector);
        this.tooltip = tooltip;
        this.dashboard = dashboard;
        
        // Chart dimensions will be set during rendering based on container
        this.width = 0;
        this.height = 0;
        
        // Create SVG element
        this.svg = this.container.append('svg');
    }
    
    render(data, fieldSelection, selectedItems, colorMapping) {
        // Clear previous rendering
        this.svg.selectAll('*').remove();
        
        // Update dimensions
        this.width = this.container.node().clientWidth;
        this.height = 400; // Fixed height
        const radius = Math.min(this.width, this.height) * 0.4;
        
        // Update SVG dimensions
        this.svg
            .attr('width', this.width)
            .attr('height', this.height);
            
        // Add zoom capability
        const g = this.svg.append('g')
            .attr('transform', `translate(${this.width/2},${this.height/2})`)
            .call(d3.zoom()
                .scaleExtent([0.5, 2])
                .on("zoom", (event) => g.attr("transform", `translate(${this.width/2 + event.transform.x},${this.height/2 + event.transform.y}) scale(${event.transform.k})`))
            );
            
        // Check if we have necessary fields
        if (!fieldSelection.entity || !fieldSelection.relations) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .text('Please select entity and relations fields');
            return;
        }
        
        // Add help text
        this.svg.append("text")
            .attr("x", 10)
            .attr("y", 20)
            .attr("font-size", "10px")
            .attr("fill", "#666")
            .text("Drag to pan, scroll to zoom, Ctrl+click for multi-select");
        
        // Use selected fields
        const entityField = fieldSelection.entity;
        const relationField = fieldSelection.relations;
        
        // Check if data has required fields
        if (data.length === 0 || !data[0][relationField] || !Array.isArray(data[0][relationField])) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .text('Invalid data format for chord diagram');
            return;
        }
        
        // Get unique entities
        const entities = new Set();
        data.forEach(d => {
            entities.add(d[entityField]);
            d[relationField].forEach(c => entities.add(c));
        });
        const names = Array.from(entities);
        
        // Create a weighted matrix based on relationship counts
        const matrix = Array(names.length).fill(0)
            .map(() => Array(names.length).fill(0));
            
        // Create original data lookup for tooltips
        const entityData = {};
        
        data.forEach(d => {
            const sourceIndex = names.indexOf(d[entityField]);
            entityData[d[entityField]] = d; // Store original data
            
            d[relationField].forEach(target => {
                const targetIndex = names.indexOf(target);
                // Increase weight by 1 for each relationship
                matrix[sourceIndex][targetIndex] += 1;
                
                // For bidirectional relationships (comment out for directed graphs)
                matrix[targetIndex][sourceIndex] += 1;
            });
        });
        
        const chord = d3.chord()
            .padAngle(0.05)
            .sortSubgroups(d3.descending);
            
        const arcs = chord(matrix);
        
        // Create color scale ensuring consistent colors with other visualizations
        const color = d => colorMapping[names[d.index]] || d3.schemeCategory10[d.index % 10];
        
        // Background circle for better aesthetics
        g.append("circle")
            .attr("r", radius - 25)
            .attr("fill", "#f8f9fa")
            .attr("opacity", 0.2);
        
        // Draw outer arcs with gradient fills for more visual appeal
        const outerArcs = g.append("g")
            .selectAll("path")
            .data(arcs.groups)
            .join("path")
            .attr("class", "chord-arc")
            .style("fill", d => {
                const gradientId = `gradient-${d.index}`;
                
                // Create a gradient
                const gradient = this.svg.append("defs")
                    .append("linearGradient")
                    .attr("id", gradientId)
                    .attr("x1", "0%")
                    .attr("x2", "100%")
                    .attr("y1", "0%")
                    .attr("y2", "100%");
                    
                gradient.append("stop")
                    .attr("offset", "0%")
                    .attr("stop-color", color(d))
                    .attr("stop-opacity", 1);
                    
                gradient.append("stop")
                    .attr("offset", "100%")
                    .attr("stop-color", d3.rgb(color(d)).darker(0.8))
                    .attr("stop-opacity", 1);
                    
                return `url(#${gradientId})`;
            })
            .attr("d", d3.arc()
                .innerRadius(radius - 20)
                .outerRadius(radius)
            )
            .style('opacity', d => selectedItems.size > 0 ? 
                (selectedItems.has(names[d.index]) ? 1 : 0.3) : 0.8)
            .style("stroke", d => d3.rgb(color(d)).darker(0.5))
            .style("stroke-width", 0.5);
                
        // Add interactivity to arcs
        outerArcs
            .on("mouseover", (event, d) => {
                const name = names[d.index];
                // Get entity data if available
                let tooltipContent = `<strong>${name}</strong>`;
                
                if (entityData[name]) {
                    tooltipContent += "<hr>";
                    Object.entries(entityData[name]).forEach(([key, value]) => {
                        if (!Array.isArray(value) && typeof value !== 'object') {
                            tooltipContent += `<br>${key}: ${value}`;
                        }
                    });
                }
                
                this.tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                this.tooltip.html(tooltipContent)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
                    
                // Highlight all connections from/to this entity
                ribbons
                    .style("opacity", ribbon => 
                        (ribbon.source.index === d.index || ribbon.target.index === d.index) ? 0.9 : 0.1);
                    
                outerArcs
                    .style("opacity", arc => {
                        // Check for connection with the current arc
                        const connected = matrix[d.index][arc.index] > 0;
                        return arc.index === d.index || connected ? 1 : 0.3;
                    });
            })
            .on("mouseout", () => {
                this.tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
                    
                // Reset opacity based on selection
                this.updateChordHighlighting(outerArcs, ribbons, names, selectedItems);
            })
            .on("click", (event, d) => {
                this.dashboard.handleSelection(names[d.index], event);
            });
            
        // Draw ribbons with gradient fills
        const ribbons = g.append("g")
            .selectAll("path")
            .data(arcs)
            .join("path")
            .attr("class", "chord-ribbon")
            .attr("d", d3.ribbon().radius(radius - 20))
            .style("fill", d => {
                const gradientId = `ribbon-gradient-${d.source.index}-${d.target.index}`;
                
                // Create a gradient
                const gradient = this.svg.append("defs")
                    .append("linearGradient")
                    .attr("id", gradientId)
                    .attr("x1", "0%")
                    .attr("x2", "100%")
                    .attr("y1", "0%")
                    .attr("y2", "100%");
                    
                gradient.append("stop")
                    .attr("offset", "0%")
                    .attr("stop-color", color({index: d.source.index}))
                    .attr("stop-opacity", 0.7);
                    
                gradient.append("stop")
                    .attr("offset", "100%")
                    .attr("stop-color", color({index: d.target.index}))
                    .attr("stop-opacity", 0.7);
                    
                return `url(#${gradientId})`;
            })
            .style("opacity", d => {
                if (selectedItems.size === 0) return 0.7;
                
                const sourceEntity = names[d.source.index];
                const targetEntity = names[d.target.index];
                
                return (selectedItems.has(sourceEntity) || selectedItems.has(targetEntity)) ? 0.9 : 0.1;
            })
            .style("stroke", "#fff")
            .style("stroke-opacity", 0.2)
            .style("stroke-width", 0.5);
            
        // Add interactivity to ribbons
        ribbons
            .on("mouseover", (event, d) => {
                const sourceEntity = names[d.source.index];
                const targetEntity = names[d.target.index];
                
                // Calculate the weight/value of the connection
                const value = matrix[d.source.index][d.target.index];
                
                this.tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                this.tooltip.html(`<strong>${sourceEntity} ↔ ${targetEntity}</strong><br>Connection strength: ${value}`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
                    
                // Highlight just this connection
                ribbons.style("opacity", r => 
                    (r.source.index === d.source.index && r.target.index === d.target.index) ||
                    (r.source.index === d.target.index && r.target.index === d.source.index)
                        ? 1 : 0.1);
                        
                // Highlight the connected arcs
                outerArcs.style("opacity", a => 
                    a.index === d.source.index || a.index === d.target.index ? 1 : 0.3);
            })
            .on("mouseout", () => {
                this.tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
                    
                // Reset opacity based on selection
                this.updateChordHighlighting(outerArcs, ribbons, names, selectedItems);
            })
            .on("click", (event, d) => {
                // Select both connected entities
                if (event.ctrlKey || event.shiftKey) {
                    const sourceEntity = names[d.source.index];
                    const targetEntity = names[d.target.index];
                    
                    // Add both to selection
                    this.dashboard.selectedItems.add(sourceEntity);
                    this.dashboard.selectedItems.add(targetEntity);
                    this.dashboard.renderAllVisualizations();
                }
            });
            
        // Add arc labels with better positioning
        const labels = g.append("g")
            .selectAll("g")
            .data(arcs.groups)
            .join("g");
            
        labels.append("text")
            .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr("dy", ".35em")
            .attr("transform", d => `
                rotate(${(d.angle * 180 / Math.PI - 90)})
                translate(${radius + 10})
                ${d.angle > Math.PI ? "rotate(180)" : ""}
            `)
            .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
            .text((d, i) => names[i])
            .style("font-size", "10px")
            .style("font-weight", "bold")
            .style("fill", d => d3.rgb(color(d)).darker(0.5));
            
        // Add small connection strength indicators on arcs
        arcs.groups.forEach(group => {
            const connectionCount = matrix[group.index].reduce((sum, val) => sum + val, 0);
            if (connectionCount > 0) {
                g.append("text")
                    .attr("dy", ".35em")
                    .attr("transform", () => {
                        const angle = (group.startAngle + group.endAngle) / 2;
                        const x = Math.cos(angle - Math.PI / 2) * (radius - 10);
                        const y = Math.sin(angle - Math.PI / 2) * (radius - 10);
                        return `translate(${x},${y})`;
                    })
                    .attr("text-anchor", "middle")
                    .text(connectionCount)
                    .style("font-size", "8px")
                    .style("fill", "#fff")
                    .style("pointer-events", "none");
            }
        });
    }
    
    // Helper method to update chord diagram highlighting based on selection
    updateChordHighlighting(outerArcs, ribbons, names, selectedItems) {
        if (selectedItems.size === 0) {
            // No selection, show all with normal opacity
            outerArcs.style("opacity", 0.8);
            ribbons.style("opacity", 0.7);
            return;
        }
        
        // Highlight selected arcs
        outerArcs.style("opacity", d => 
            selectedItems.has(names[d.index]) ? 1 : 0.3);
            
        // Highlight ribbons connected to selected entities
        ribbons.style("opacity", d => {
            const sourceEntity = names[d.source.index];
            const targetEntity = names[d.target.index];
            
            return (selectedItems.has(sourceEntity) || selectedItems.has(targetEntity)) ? 
                0.9 : 0.1;
        });
    }
}

class RadialBarChart {
    constructor(selector, tooltip, dashboard) {
        this.container = d3.select(selector);
        this.tooltip = tooltip;
        this.dashboard = dashboard;
        
        // Chart dimensions will be set during rendering based on container
        this.width = 0;
        this.height = 0;
        this.margin = 40;
        
        // Create SVG element
        this.svg = this.container.append('svg');
        
        // Make the chart responsive
        this.resizeHandler = () => {
            this.render();
        };
        window.addEventListener('resize', this.resizeHandler);
    }
    
    render(data, fieldSelection, selectedItems, colorMapping) {
        // Clear previous rendering
        this.svg.selectAll('*').remove();
        
        // Update dimensions
        this.width = this.container.node().clientWidth;
        this.height = 400; // Fixed height
        
        // Update SVG dimensions
        this.svg
            .attr('width', this.width)
            .attr('height', this.height);
            
        const radius = Math.min(this.width, this.height) / 2 - this.margin;
        
        // Add a group for the chart that can be zoomed/panned
        const g = this.svg.append('g')
            .attr('transform', `translate(${this.width/2},${this.height/2})`)
            .call(d3.zoom()
                .scaleExtent([0.5, 2])
                .on("zoom", (event) => g.attr("transform", `translate(${this.width/2 + event.transform.x},${this.height/2 + event.transform.y}) scale(${event.transform.k})`))
            );
            
        // Check if we have necessary fields
        if (!fieldSelection.category || !fieldSelection.value) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .text('Please select category and value fields');
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
        const categoryField = fieldSelection.category;
        const valueField = fieldSelection.value;
        
        // Map data to the chart's format
        const chartData = data.map(d => ({
            name: d[categoryField],
            value: d[valueField],
            originalData: d // Store original data for tooltips and linking
        }));
        
        // Create scales
        const x = d3.scaleBand()
            .range([0, 2 * Math.PI])
            .align(0)
            .domain(chartData.map(d => d.name))
            .paddingInner(0.1);
            
        const y = d3.scaleRadial()
            .range([0, radius])
            .domain([0, d3.max(chartData, d => d.value) * 1.1]); // Add 10% padding
            
        // Add circular grid lines
        const gridLines = [0, 0.25, 0.5, 0.75, 1];
        const maxValue = d3.max(chartData, d => d.value);
        
        gridLines.forEach(d => {
            const gridRadius = y(maxValue * d);
            if (gridRadius > 0) {
                g.append('circle')
                    .attr('r', gridRadius)
                    .attr('fill', 'none')
                    .attr('stroke', '#ddd')
                    .attr('stroke-dasharray', '2,2')
                    .attr('stroke-width', 0.5);
                    
                g.append('text')
                    .attr('y', -gridRadius - 5)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#888')
                    .style('font-size', '8px')
                    .text((maxValue * d).toFixed(1));
            }
        });
        
        // Add animated bars with transitions
        const arcGenerator = d3.arc()
            .innerRadius(0)
            .outerRadius(d => y(d.value))
            .startAngle(d => x(d.name))
            .endAngle(d => x(d.name) + x.bandwidth())
            .padRadius(radius/2);
            
        const bars = g.append('g')
            .selectAll('path')
            .data(chartData)
            .join('path')
            .attr('class', 'radial-bar')
            .attr('fill', d => colorMapping[d.name] || d3.schemeCategory10[chartData.indexOf(d) % 10])
            .style('opacity', d => selectedItems.size > 0 ? 
                (selectedItems.has(d.name) ? 1 : 0.3) : 0.8)
            .style('stroke', d => d3.rgb(colorMapping[d.name] || d3.schemeCategory10[chartData.indexOf(d) % 10]).darker(0.5))
            .style('stroke-width', 0.5);
                
        // Animate bars growing from center
        bars.transition()
            .duration(1000)
            .attrTween('d', function(d) {
                const interpolate = d3.interpolate(0, d.value);
                return function(t) {
                    d.value = interpolate(t);
                    return arcGenerator(d);
                };
            })
            .on('end', function(d, i) {
                // Reset to actual value after animation
                d.value = chartData[i].value;
            });
                
        // Add interactivity with enhanced tooltips
        bars.on('mouseover', (event, d) => {
                // Create rich tooltip with all data
                let tooltipContent = `<strong>${d.name}: ${d.value.toFixed(2)}</strong>`;
                
                // Add additional data if available
                if (d.originalData) {
                    tooltipContent += "<hr>";
                    Object.entries(d.originalData).forEach(([key, value]) => {
                        if (!Array.isArray(value) && typeof value !== 'object') {
                            tooltipContent += `<br>${key}: ${value}`;
                        }
                    });
                }
                
                this.tooltip.transition()
                    .duration(200)
                    .style('opacity', 0.9);
                this.tooltip.html(tooltipContent)
                    .style('left', (event.pageX + 5) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
                    
                // Highlight bar
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .style('opacity', 1)
                    .style('stroke-width', 2)
                    .attr('transform', 'scale(1.05)');
            })
            .on('mouseout', (event) => {
                this.tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
                    
                // Reset highlight
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .style('opacity', d => selectedItems.size > 0 ? 
                        (selectedItems.has(d.name) ? 1 : 0.3) : 0.8)
                    .style('stroke-width', 0.5)
                    .attr('transform', 'scale(1)');
            })
            .on('click', (event, d) => {
                this.dashboard.handleSelection(d.name, event);
            });
            
        // Add labels with better positioning and animation
        const labels = g.append('g')
            .selectAll('g')
            .data(chartData)
            .join('g')
            .attr('class', 'radial-label')
            .attr('text-anchor', d => (x(d.name) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? 'end' : 'start')
            .attr('transform', d => `rotate(${((x(d.name) + x.bandwidth() / 2) * 180 / Math.PI - 90)})translate(${radius + 10},0)`);
        
        labels.append('text')
            .text(d => d.name)
            .attr('transform', d => (x(d.name) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? 'rotate(180)' : 'rotate(0)')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('alignment-baseline', 'middle')
            .style('opacity', 0)
            .transition()
            .duration(1000)
            .style('opacity', 1);
            
        labels.append('text')
            .text(d => d.value.toFixed(2))
            .attr('dy', '1em')
            .attr('transform', d => (x(d.name) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? 'rotate(180)' : 'rotate(0)')
            .style('font-size', '10px')
            .style('alignment-baseline', 'middle')
            .style('opacity', 0)
            .transition()
            .duration(1000)
            .delay(500)
            .style('opacity', 1);
            
        // Add legend
        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(10, ${this.height - 10})`)
            .style('font-size', '10px');
            
        const legendItems = legend.selectAll('.legend-item')
            .data(chartData)
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${-i * 15})`);
            
        legendItems.append('rect')
            .attr('width', 10)
            .attr('height', 10)
            .attr('fill', d => colorMapping[d.name] || d3.schemeCategory10[chartData.indexOf(d) % 10])
            .style('opacity', d => selectedItems.size > 0 ? 
                (selectedItems.has(d.name) ? 1 : 0.3) : 0.8);
                
        legendItems.append('text')
            .attr('x', 15)
            .attr('y', 8)
            .text(d => d.name)
            .style('opacity', d => selectedItems.size > 0 ? 
                (selectedItems.has(d.name) ? 1 : 0.3) : 0.8)
            .on('click', (event, d) => {
                this.dashboard.handleSelection(d.name, event);
            })
            .style('cursor', 'pointer');
            
        // Add a title
        this.svg.append('text')
            .attr('class', 'chart-title')
            .attr('x', this.width / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text(`${categoryField} by ${valueField}`);
    }
    
    destroy() {
        // Clean up event listeners when chart is destroyed
        window.removeEventListener('resize', this.resizeHandler);
    }
}

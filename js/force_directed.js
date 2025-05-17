class ForceDirectedGraph {
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
        const container = this.container.node();
        
        // Clear previous rendering
        this.svg.selectAll('*').remove();
        
        // Update dimensions
        this.width = container.clientWidth;
        this.height = container.clientHeight || 400; // Fallback if height is not set
        
        // Update SVG dimensions
        this.svg
            .attr('width', this.width)
            .attr('height', this.height)
            .call(d3.zoom()
                .extent([[0, 0], [this.width, this.height]])
                .scaleExtent([0.1, 4])
                .on("zoom", event => this.svg.select(".force-container").attr("transform", event.transform)));
        
        // Main graphics container to apply zoom
        const g = this.svg.append("g").attr("class", "force-container");
        
        // Add helpful instructions
        this.svg.append("text")
            .attr("class", "help-text")
            .attr("x", 10)
            .attr("y", 20)
            .attr("font-size", "10px")
            .attr("fill", "#666")
            .text("Scroll to zoom, drag to pan, Ctrl+click for multi-select");
        
        // Check if we have necessary fields
        if (!fieldSelection.entity || !fieldSelection.relations) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .attr('x', this.width / 2)
                .attr('y', this.height / 2)
                .text('Please select entity and relations fields');
            return;
        }
        
        // Use selected fields
        const entityField = fieldSelection.entity;
        const relationField = fieldSelection.relations;
        const groupField = fieldSelection.group;
        
        // Check if data has required fields
        if (data.length === 0 || !data[0][relationField] || !Array.isArray(data[0][relationField])) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .attr('x', this.width / 2)
                .attr('y', this.height / 2)
                .text('Invalid data format for force graph');
            return;
        }
        
        // Create nodes and links
        const nodes = [];
        const links = [];
        const nodeSet = new Set();
        
        // Add main entities first
        data.forEach(d => {
            const groupValue = groupField && d[groupField] ? d[groupField] : 1;
            nodes.push({ 
                id: d[entityField], 
                group: groupValue,
                isMainEntity: true,
                // Store all original data for tooltips and linking
                data: d
            });
            nodeSet.add(d[entityField]);
        });
        
        // Add relations and links
        data.forEach(d => {
            const source = d[entityField];
            d[relationField].forEach(target => {
                if (!nodeSet.has(target)) {
                    nodes.push({ 
                        id: target, 
                        group: 0, // Different group for related entities
                        isMainEntity: false 
                    });
                    nodeSet.add(target);
                }
                links.push({ 
                    source, 
                    target,
                    value: 1 // Could be weighted if we have data for it
                });
            });
        });
        
        // Identify clusters using community detection (simplified)
        // Group nodes that are densely connected
        const communities = this.detectCommunities(nodes, links);
        nodes.forEach(node => {
            node.community = communities[node.id] || 0;
        });
        
        // Create forces with clusters
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(30))
            // Use cluster force for community structure
            .force('cluster', this.forceCluster(nodes));
            
        // Create color scale based on groups (prefer communities if available)
        const clusterField = groupField || "community";
        
        // Draw links
        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('class', 'force-link')
            .attr('stroke', '#999')
            .attr('stroke-width', d => 1.5 + Math.sqrt(d.value || 1))
            .attr('stroke-opacity', d => {
                if (selectedItems.size === 0) return 0.6;
                
                return (selectedItems.has(d.source.id) || selectedItems.has(d.target.id)) ? 
                    0.8 : 0.1;
            });
            
        // Draw nodes
        const node = g.append('g')
            .selectAll('circle')
            .data(nodes)
            .join('circle')
            .attr('class', 'force-node')
            .attr('r', d => d.isMainEntity ? 8 : 5)
            .attr('fill', d => colorMapping[d.id] || d3.schemeCategory10[d[clusterField] % 10])
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .style('opacity', d => selectedItems.size > 0 ? 
                (selectedItems.has(d.id) ? 1 : 0.3) : 0.8)
            .call(this.setupDrag(simulation));
            
        // Add interactivity
        node.on('mouseover', (event, d) => {
                // Create enhanced tooltip content
                let tooltipContent = `<strong>${d.id}</strong>`;
                
                // Add additional data if available
                if (d.data) {
                    tooltipContent += "<hr>";
                    Object.entries(d.data).forEach(([key, value]) => {
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
                    
                // Highlight connected nodes and links
                const connected = new Set();
                connected.add(d.id);
                
                links.forEach(l => {
                    if (l.source.id === d.id) {
                        connected.add(l.target.id);
                    } else if (l.target.id === d.id) {
                        connected.add(l.source.id);
                    }
                });
                
                node.style('opacity', n => connected.has(n.id) ? 1 : 0.1);
                
                link.attr('stroke-opacity', l => 
                    (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1);
            })
            .on('mouseout', () => {
                this.tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
                    
                // Restore node opacity based on selection
                node.style('opacity', d => selectedItems.size > 0 ? 
                    (selectedItems.has(d.id) ? 1 : 0.3) : 0.8);
                    
                // Restore link opacity based on selection
                link.attr('stroke-opacity', l => {
                    if (selectedItems.size === 0) return 0.6;
                    return (selectedItems.has(l.source.id) || selectedItems.has(l.target.id)) ? 
                        0.8 : 0.1;
                });
            })
            .on('click', (event, d) => {
                this.dashboard.handleSelection(d.id, event);
            });
            
        // Add labels
        const label = g.append('g')
            .selectAll('text')
            .data(nodes)
            .join('text')
            .attr('class', 'force-label')
            .text(d => d.id)
            .attr('font-size', '10px')
            .attr('dx', d => d.isMainEntity ? 12 : 8)
            .attr('dy', 4)
            .style('opacity', d => d.isMainEntity ? 1 : 0.8);
            
        // Add cluster hulls to visualize communities
        this.drawClusterHulls(g, nodes);
            
        // Update positions on simulation tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
                
            node
                .attr('cx', d => d.x = Math.max(10, Math.min(this.width - 10, d.x)))
                .attr('cy', d => d.y = Math.max(10, Math.min(this.height - 10, d.y)));
                
            label
                .attr('x', d => d.x)
                .attr('y', d => d.y);
                
            // Update cluster hulls if they exist
            this.updateClusterHulls(g, nodes);
        });
    }
    
    // Detect communities in the graph using a simple algorithm
    detectCommunities(nodes, links) {
        const communities = {};
        let communityId = 0;
        
        // Initialize each node to its own community
        nodes.forEach(node => {
            communities[node.id] = communityId++;
        });
        
        // Simple approach: merge communities of connected nodes
        // In a real application, you'd use a proper community detection algorithm
        for (let i = 0; i < 3; i++) { // Few iterations for simplicity
            links.forEach(link => {
                const sourceComm = communities[link.source.id || link.source];
                const targetComm = communities[link.target.id || link.target];
                
                // Merge communities (take the smaller ID)
                if (sourceComm !== targetComm) {
                    const newComm = Math.min(sourceComm, targetComm);
                    const oldComm = Math.max(sourceComm, targetComm);
                    
                    // Reassign all nodes from oldComm to newComm
                    Object.keys(communities).forEach(id => {
                        if (communities[id] === oldComm) {
                            communities[id] = newComm;
                        }
                    });
                }
            });
        }
        
        return communities;
    }
    
    // Force function to group nodes by cluster
    forceCluster(nodes) {
        const strength = 0.2;
        const centroids = {};
        
        return function(alpha) {
            // Calculate centroids for each community
            nodes.forEach(d => {
                if (!centroids[d.community]) {
                    centroids[d.community] = {x: 0, y: 0, count: 0};
                }
                centroids[d.community].x += d.x || 0;
                centroids[d.community].y += d.y || 0;
                centroids[d.community].count += 1;
            });
            
            // Calculate average position for each community
            Object.keys(centroids).forEach(comm => {
                centroids[comm].x /= centroids[comm].count;
                centroids[comm].y /= centroids[comm].count;
            });
            
            // Apply force towards community centroid
            nodes.forEach(d => {
                if (centroids[d.community]) {
                    d.vx = (d.vx || 0) + (centroids[d.community].x - d.x) * strength * alpha;
                    d.vy = (d.vy || 0) + (centroids[d.community].y - d.y) * strength * alpha;
                }
            });
        };
    }
    
    // Draw hulls around clusters
    drawClusterHulls(svg, nodes) {
        // Group nodes by community
        const clusters = {};
        
        nodes.forEach(d => {
            const key = d.community || 0;
            if (!clusters[key]) {
                clusters[key] = [];
            }
            clusters[key].push(d);
        });
        
        // Create the hulls container
        svg.append("g")
            .attr("class", "hulls");
    }
    
    // Update cluster hulls positions
    updateClusterHulls(svg, nodes) {
        const clusters = {};
        const padding = 15;
        
        // Group nodes by community
        nodes.forEach(d => {
            const key = d.community || 0;
            if (!clusters[key]) {
                clusters[key] = [];
            }
            clusters[key].push([d.x, d.y]);
        });
        
        // Get existing hulls
        const hulls = svg.select(".hulls").selectAll("path")
            .data(Object.entries(clusters));
            
        // Update existing hulls
        hulls.enter()
            .append("path")
            .merge(hulls)
            .attr("d", d => {
                if (d[1].length < 3) return "";  // Need at least 3 points for a hull
                return "M" + d3.polygonHull(d[1])
                    .map(p => [p[0] + (Math.random() - 0.5) * padding, p[1] + (Math.random() - 0.5) * padding])
                    .join("L") + "Z";
            })
            .attr("fill", (d, i) => d3.schemeCategory10[i % 10])
            .attr("opacity", 0.1)
            .attr("stroke", (d, i) => d3.schemeCategory10[i % 10])
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.2)
            .lower(); // Move hulls to back
            
        hulls.exit().remove();
    }

    setupDrag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        
        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
    
    // Add a resize method
    resize() {
        // Re-render with updated dimensions
        this.render();
    }
}

/**
 * UI Controls - Handles user interface interactions
 */
class UIControls {
    constructor() {
        this.setupEventListeners();
        this.initializeSections();
    }

    /**
     * Initialize all sidebar sections
     */
    initializeSections() {
        // Expand all section contents by default
        document.querySelectorAll('.section-content').forEach(content => {
            content.classList.add('expanded');
        });
    }

    /**
     * Set up event listeners for UI elements
     */
    setupEventListeners() {
        // Handle sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', this.toggleSidebar);
        }
        
        // Handle section collapsing - important fix here
        document.querySelectorAll('.collapsible-header').forEach(header => {
            // Remove any existing listeners to prevent duplicates
            const newHeader = header.cloneNode(true);
            header.parentNode.replaceChild(newHeader, header);
            
            // Add the event listener
            newHeader.addEventListener('click', this.toggleSection);
        });
        
        // Handle fullscreen buttons
        document.querySelectorAll('.fullscreen-btn').forEach(btn => {
            btn.addEventListener('click', this.toggleFullscreen);
        });
    }
    
    /**
     * Toggle sidebar visibility
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
        sidebar.classList.toggle('expanded');
        
        // Update toggle button icon
        const icon = document.getElementById('sidebarToggle').querySelector('i');
        
        if (sidebar.classList.contains('collapsed')) {
            icon.className = 'fas fa-bars';
        } else {
            icon.className = 'fas fa-chevron-left';
        }
        
        // Trigger window resize to update visualizations
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300);
    }
    
    /**
     * Toggle section expansion/collapse - fixed to work properly
     */
    toggleSection(event) {
        const header = event.currentTarget;
        const content = header.nextElementSibling;
        const icon = header.querySelector('.toggle-icon');
        
        // Toggle the expanded class on the content
        content.classList.toggle('expanded');
        
        // Update the icon
        if (content.classList.contains('expanded')) {
            icon.className = 'fas fa-chevron-down toggle-icon';
        } else {
            icon.className = 'fas fa-chevron-right toggle-icon';
        }
        
        // Prevent event from bubbling up
        event.stopPropagation();
    }
    
    /**
     * Update the toggleFullscreen method to fix the sunburst chart display
     */
    toggleFullscreen(event) {
        const card = event.currentTarget.closest('.card');
        const chartContainer = card.querySelector('.chart-container');
        const chartId = chartContainer.id;
        
        // Toggle fullscreen class
        card.classList.toggle('fullscreen');
        
        // Toggle button icon
        const icon = event.currentTarget.querySelector('i');
        icon.classList.toggle('fa-expand');
        icon.classList.toggle('fa-compress');
        
        // Add instruction box in fullscreen mode
        let helpBox = card.querySelector('.fullscreen-help');
        
        if (card.classList.contains('fullscreen')) {
            // Create help box if entering fullscreen
            if (!helpBox) {
                helpBox = document.createElement('div');
                helpBox.className = 'fullscreen-help';
                
                // Special instructions for sunburst
                let interactions = '';
                if (chartId === 'sunburstChart') {
                    interactions = `
                        <li><i class="fas fa-mouse-pointer"></i> Click segments to zoom in/navigate</li>
                        <li><i class="fas fa-home"></i> Click center or breadcrumb to navigate out</li>
                        <li><i class="fas fa-mouse"></i> Drag to pan, scroll to zoom view</li>
                        <li><i class="fas fa-keyboard"></i> Shift+Click to select items</li>
                    `;
                } else {
                    // Default instructions for other charts
                    interactions = `
                        <li><i class="fas fa-mouse"></i> Scroll to zoom in/out</li>
                        <li><i class="fas fa-hand-paper"></i> Click and drag to pan</li>
                        <li><i class="fas fa-mouse-pointer"></i> Click elements to select</li>
                        <li><i class="fas fa-keyboard"></i> Ctrl+Click for multi-select</li>
                    `;
                }
                
                helpBox.innerHTML = `
                    <div class="help-content">
                        <h3>${card.querySelector('.card-header h2').textContent}</h3>
                        <p>You can interact with the chart using:</p>
                        <ul>${interactions}</ul>
                        <p>Click <i class="fas fa-compress"></i> to exit fullscreen mode</p>
                    </div>
                `;
                
                chartContainer.parentNode.insertBefore(helpBox, chartContainer);
            }
            
            // Critical fix: Force redraw after a short delay to ensure proper rendering
            setTimeout(() => {
                // If sunburst, call its specific resize handler
                if (chartId === 'sunburstChart' && chartContainer.sunburstResize) {
                    document.body.style.overflow = 'hidden'; // Prevent page scrolling
                    chartContainer.style.height = (window.innerHeight - 120) + 'px';
                    chartContainer.sunburstResize();
                }
                
                // Dispatch resize event for all charts
                window.dispatchEvent(new Event('resize'));
            }, 100);
        } else {
            // Exiting fullscreen mode
            if (helpBox) {
                helpBox.remove();
            }
            
            document.body.style.overflow = ''; // Restore page scrolling
            chartContainer.style.height = '';
            
            // Force redraw after exit
            setTimeout(() => {
                if (chartId === 'sunburstChart' && chartContainer.sunburstResize) {
                    chartContainer.sunburstResize();
                }
                window.dispatchEvent(new Event('resize'));
            }, 100);
        }
    }
    
    /**
     * Initialize filter controls after they're created
     */
    static initializeFilterControls() {
        // Ensure filter section is expanded by default after creation
        document.querySelector('#filterContainer .card-body').classList.add('expanded');
        
        // Update expand button icon to match state
        const expandIcon = document.querySelector('#expandFilters i');
        if (expandIcon) {
            expandIcon.classList.remove('fa-chevron-down');
            expandIcon.classList.add('fa-chevron-up');
        }
    }
    
    /**
     * Update Reset All Filters button - prevents duplication
     */
    static updateResetAllFiltersButton(container) {
        // Remove any existing reset buttons first
        document.querySelectorAll('#resetAllFilters').forEach(btn => btn.remove());
        
        // Create new button
        const resetAllBtn = document.createElement('button');
        resetAllBtn.id = 'resetAllFilters';
        resetAllBtn.className = 'reset-all-btn';
        resetAllBtn.innerHTML = '<i class="fas fa-undo"></i> Reset All Filters';
        
        // Append to container
        container.appendChild(resetAllBtn);
        
        return resetAllBtn;
    }
    
    /**
     * Initialize fullscreen controls for charts
     */
    static initializeFullscreenControls() {
        // Store original dimensions before entering fullscreen
        const originalDimensions = {};

        document.querySelectorAll('.fullscreen-btn').forEach(button => {
            button.addEventListener('click', function() {
                const card = this.closest('.card');
                const container = card.querySelector('.chart-container');
                const chartId = container.id;
                
                if (!card.classList.contains('fullscreen')) {
                    // Enter fullscreen - save current dimensions first
                    originalDimensions[chartId] = {
                        width: container.style.width || getComputedWidth(container),
                        height: container.style.height || getComputedHeight(container)
                    };
                    
                    // Add fullscreen class and change icon
                    card.classList.add('fullscreen');
                    this.querySelector('i').classList.remove('fa-expand');
                    this.querySelector('i').classList.add('fa-compress');
                    
                    // Trigger resize for chart to adapt
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
                } else {
                    // Exit fullscreen - restore dimensions
                    card.classList.remove('fullscreen');
                    this.querySelector('i').classList.remove('fa-compress');
                    this.querySelector('i').classList.add('fa-expand');
                    
                    // Restore original dimensions if available
                    if (originalDimensions[chartId]) {
                        container.style.width = originalDimensions[chartId].width;
                        container.style.height = originalDimensions[chartId].height;
                    }
                    
                    // Trigger resize with slight delay to ensure dimensions are applied
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
                }
            });
        });
        
        // Helper function to get computed width
        function getComputedWidth(element) {
            return window.getComputedStyle(element).width;
        }
        
        // Helper function to get computed height  
        function getComputedHeight(element) {
            return window.getComputedStyle(element).height;
        }
    }

    /**
     * Initialize UI Controls
     */
    static initialize() {
        // Initialize filter controls
        this.initializeFilterControls();
        
        // Initialize fullscreen controls
        this.initializeFullscreenControls();
    }
}

// Initialize UI Controls when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create UI Controls instance
    const uiControls = new UIControls();
    
    // Ensure filter container is correctly styled when generated
    document.getElementById('applyFields')?.addEventListener('click', () => {
        // Show the filter container
        const filterContainer = document.getElementById('filterContainer');
        if (filterContainer) {
            filterContainer.style.display = 'block';
            
            // Make sure its content is expanded
            const content = filterContainer.querySelector('.section-content');
            if (content) {
                content.classList.add('expanded');
            }
        }
    });
});

/**
 * UI Controls - Handles user interface interactions and enhancements
 */
class UIControls {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Handle expand/collapse for filter section
        document.getElementById('expandFilters')?.addEventListener('click', this.toggleFilterVisibility);
        
        // Handle fullscreen buttons
        document.querySelectorAll('.fullscreen-btn').forEach(btn => {
            btn.addEventListener('click', this.toggleFullscreen);
        });
    }
    
    toggleFilterVisibility(event) {
        // Toggle icon between down and up arrows
        const icon = event.currentTarget.querySelector('i');
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
        
        // Toggle expanded class on the collapsible content
        const cardBody = event.currentTarget.closest('.card-header').nextElementSibling;
        cardBody.classList.toggle('expanded');
    }
    
    toggleFullscreen(event) {
        const card = event.currentTarget.closest('.card');
        const chartContainer = card.querySelector('.chart-container');
        const chartTitle = card.querySelector('.card-header h2').textContent;
        
        // Toggle fullscreen class
        card.classList.toggle('fullscreen');
        
        // Toggle button icon between expand and compress
        const icon = event.currentTarget.querySelector('i');
        icon.classList.toggle('fa-expand');
        icon.classList.toggle('fa-compress');
        
        // Add/remove fullscreen guidance
        let helpBox = card.querySelector('.fullscreen-help');
        
        if (card.classList.contains('fullscreen')) {
            // Create help box if entering fullscreen
            if (!helpBox) {
                helpBox = document.createElement('div');
                helpBox.className = 'fullscreen-help';
                helpBox.innerHTML = `
                    <div class="help-content">
                        <h3>Fullscreen Mode: ${chartTitle}</h3>
                        <p>You can interact with the chart using the following:</p>
                        <ul>
                            <li><i class="fas fa-mouse"></i> Scroll to zoom in/out</li>
                            <li><i class="fas fa-hand-paper"></i> Click and drag to pan</li>
                            <li><i class="fas fa-mouse-pointer"></i> Click elements to select</li>
                            <li><i class="fas fa-keyboard"></i> Ctrl+Click for multi-select</li>
                        </ul>
                        <p>Click <i class="fas fa-compress"></i> to exit fullscreen mode</p>
                    </div>
                `;
                chartContainer.parentNode.insertBefore(helpBox, chartContainer);
            }
            
            // Force chart redraw by triggering a resize event
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 100);
        } else {
            // Remove help box if exiting fullscreen
            if (helpBox) {
                helpBox.remove();
            }
            
            // Force chart redraw when exiting fullscreen
            setTimeout(() => {
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
}

// Initialize UI Controls when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new UIControls();
});

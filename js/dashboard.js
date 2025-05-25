class Dashboard {
    constructor() {
        // Sample data - will be replaced when user uploads JSON
        this.data = SAMPLE_DATA.music_artists;
        this.originalData = [...this.data]; // Keep original data for filtering
        
        // Field selections for different chart types
        this.fieldSelections = {
            radial: {
                category: null,
                value: null
            },
            chord: {
                entity: null,
                relations: null
            },
            force: {
                entity: null,
                relations: null,
                group: null
            },
            sunburst: {
                entity: null,
                group: null,
                relations: null
            }
        };
        
        // Selected elements for brushing & linking
        this.selectedItems = new Set();
        
        // Global color mapping for consistency across visualizations
        this.colorMapping = {};
        
        // Tooltip for all charts with enhanced styling
        this.tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
        
        this.currentDateTime = new Date().toLocaleString();
        this.currentUser = "SyedShahbazDataScientist";
        
        // Add resize listener for responsive charts
        window.addEventListener('resize', this.handleResize.bind(this));
        
        this.initialize();
        
        // Make this instance available globally for the fix script
        window.dashboard = this;
    }

    initialize() {
        this.updateMetadata();
        this.setupEventListeners();
        
        // Start with sample data analysis
        this.analyzeData();
    }

    updateMetadata() {
        document.getElementById('timestamp').textContent = this.currentDateTime;
        document.getElementById('username').textContent = this.currentUser;
    }

    setupEventListeners() {
        // Load sample data
        document.getElementById('datasetSelector').addEventListener('change', (e) => {
            const datasetType = e.target.value;
            this.data = SAMPLE_DATA[datasetType];
            this.originalData = [...this.data];
            this.analyzeData();
        });

        document.getElementById('loadSampleData').addEventListener('click', () => {
            const datasetType = document.getElementById('datasetSelector').value;
            this.data = SAMPLE_DATA[datasetType];
            this.originalData = [...this.data];
            this.analyzeData();
        });

        // Enhanced file upload with drop zone and validation
        const fileInput = document.getElementById('fileInput');
        const dropZone = document.getElementById('dropZone');
        
        // File input change handler
        fileInput.addEventListener('change', (e) => {
            this.processUploadedFile(e.target.files[0]);
        });
        
        // Create drag and drop zone for files
        if (dropZone) {
            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });
            
            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            // Highlight drop zone when file is dragged over it
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.add('highlight');
                }, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.remove('highlight');
                }, false);
            });
            
            // Handle dropped files
            dropZone.addEventListener('drop', (e) => {
                const file = e.dataTransfer.files[0];
                this.processUploadedFile(file);
            }, false);
        }
        
        // Display file upload progress indicator
        document.getElementById('loadingIndicator')?.addEventListener('animationend', () => {
            document.getElementById('loadingIndicator').style.display = 'none';
        });

        // Update Apply Field Selection button behavior
        document.getElementById('applyFields').addEventListener('click', () => {
            // Disable button temporarily to prevent multiple clicks
            const applyButton = document.getElementById('applyFields');
            applyButton.disabled = true;
            
            // Update field selections
            this.updateFieldSelections();
            
            // Initialize charts immediately if they don't exist
            if (!this.radialChart) {
                this.initializeCharts();
            }
            
            // Create filter widgets
            this.createFilterWidgets();
            
            // Show filter container
            const filterContainer = document.getElementById('filterContainer');
            if (filterContainer) {
                filterContainer.style.display = 'block';
            }
            
            // IMPORTANT: Render all visualizations IMMEDIATELY - no delays
            this.renderAllVisualizations();
            
            // Re-enable button after a short delay
            setTimeout(() => {
                applyButton.disabled = false;
            }, 200);
        });
    }

    processUploadedFile(file) {
        if (!file) return;
        
        // Show loading indicator
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        
        // Verify file is JSON
        if (!file.name.endsWith('.json') && file.type !== 'application/json') {
            alert('Please upload a JSON file.');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const rawData = event.target.result;
                
                // Try to parse as JSON
                let parsedData;
                try {
                    parsedData = JSON.parse(rawData);
                } catch (jsonError) {
                    throw new Error(`Invalid JSON format: ${jsonError.message}`);
                }
                
                // Handle different JSON structures
                let dataArray;
                
                // Case 1: Direct array of objects
                if (Array.isArray(parsedData) && parsedData.length > 0 && typeof parsedData[0] === 'object') {
                    dataArray = parsedData;
                }
                // Case 2: Nested array in a property
                else if (parsedData && typeof parsedData === 'object') {
                    // Find an array property
                    const arrayProps = Object.entries(parsedData)
                        .filter(([_, val]) => Array.isArray(val) && val.length > 0 && typeof val[0] === 'object');
                    
                    if (arrayProps.length > 0) {
                        // Use the first array property found
                        dataArray = parsedData[arrayProps[0][0]];
                        console.log(`Using nested data from property: ${arrayProps[0][0]}`);
                    } else {
                        // Try to convert object to array of objects with key-value pairs
                        const nonArrayProps = Object.entries(parsedData)
                            .filter(([_, val]) => typeof val === 'object' && val !== null && !Array.isArray(val));
                        
                        if (nonArrayProps.length > 0) {
                            dataArray = Object.entries(parsedData).map(([key, value]) => {
                                return { id: key, ...value };
                            });
                            console.log('Converted object to array of objects');
                        }
                    }
                }
                
                // Validate final data structure
                if (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0) {
                    throw new Error('Could not find a valid array of objects in the JSON file');
                }
                
                // Flatten complex objects
                dataArray = this.flattenComplexObjects(dataArray);
                
                // Store data and analyze
                this.data = dataArray;
                this.originalData = [...dataArray];
                
                // Display file name
                const fileNameElement = document.getElementById('uploadedFileName');
                if (fileNameElement) {
                    fileNameElement.textContent = `File loaded: ${file.name} (${dataArray.length} records)`;
                    fileNameElement.style.display = 'block';
                }
                
                // Analyze data
                this.analyzeData();
                
            } catch (error) {
                console.error("Error processing file:", error);
                alert(`Error loading file: ${error.message}`);
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            }
        };
        reader.onerror = () => {
            alert('Error reading file');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        };
        reader.readAsText(file);
    }
    
    flattenComplexObjects(dataArray, maxDepth = 2, currentDepth = 0) {
        if (currentDepth >= maxDepth) return dataArray;
        
        return dataArray.map(item => {
            const flatItem = { ...item };
            
            Object.entries(flatItem).forEach(([key, value]) => {
                // Handle nested objects (but not arrays)
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    Object.entries(value).forEach(([nestedKey, nestedValue]) => {
                        const newKey = `${key}_${nestedKey}`;
                        // Don't overwrite existing keys
                        if (!(newKey in flatItem)) {
                            flatItem[newKey] = nestedValue;
                        }
                    });
                }
            });
            
            return flatItem;
        });
    }
    
    analyzeData() {
        try {
            // Analyze the data and identify field types
            const analysis = DataParser.analyzeData(this.data);
            
            // Show field selection interface
            document.getElementById('fieldSelectionContainer').style.display = 'block';
            
            // Hide loading indicator if present
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            // Populate field selectors
            this.populateFieldSelectors(analysis);
            
            // Auto-set recommended fields
            this.autoSelectFields(analysis.recommendations);
        } catch (error) {
            console.error("Error analyzing data:", error);
            alert("Error analyzing data: " + error.message);
            
            // Hide loading indicator in case of error
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
        }
    }

    populateFieldSelectors(analysis) {
        const { fields } = analysis;
        
        // Radial chart fields
        document.getElementById('radialCategory').innerHTML = 
            DataParser.createFieldOptions(fields, 'categorical');
        document.getElementById('radialValue').innerHTML = 
            DataParser.createFieldOptions(fields, 'numerical');
            
        // Chord diagram fields
        document.getElementById('chordEntity').innerHTML = 
            DataParser.createFieldOptions(fields, 'categorical');
        document.getElementById('chordRelations').innerHTML = 
            DataParser.createFieldOptions(fields, 'array');
            
        // Force-directed graph fields
        document.getElementById('forceEntity').innerHTML = 
            DataParser.createFieldOptions(fields, 'categorical');
        document.getElementById('forceRelations').innerHTML = 
            DataParser.createFieldOptions(fields, 'array');
        document.getElementById('forceGroup').innerHTML = 
            "<option value=''>None</option>" + DataParser.createFieldOptions(fields, 'categorical');
            
        // Sunburst chart fields
        document.getElementById('sunburstEntity').innerHTML = 
            DataParser.createFieldOptions(fields, 'categorical');
        document.getElementById('sunburstGroup').innerHTML = 
            DataParser.createFieldOptions(fields, 'categorical');
        document.getElementById('sunburstRelations').innerHTML = 
            DataParser.createFieldOptions(fields, 'array');
    }

    autoSelectFields(recommendations) {
        // Radial chart
        if (recommendations.radialBar.category) {
            document.getElementById('radialCategory').value = recommendations.radialBar.category;
        }
        if (recommendations.radialBar.value) {
            document.getElementById('radialValue').value = recommendations.radialBar.value;
        }
        
        // Chord diagram
        if (recommendations.chord.entity) {
            document.getElementById('chordEntity').value = recommendations.chord.entity;
        }
        if (recommendations.chord.relations) {
            document.getElementById('chordRelations').value = recommendations.chord.relations;
        }
        
        // Force-directed graph
        if (recommendations.force.entity) {
            document.getElementById('forceEntity').value = recommendations.force.entity;
        }
        if (recommendations.force.relations) {
            document.getElementById('forceRelations').value = recommendations.force.relations;
        }
        
        // Sunburst chart
        if (recommendations.sunburst.entity) {
            document.getElementById('sunburstEntity').value = recommendations.sunburst.entity;
        }
        if (recommendations.sunburst.group) {
            document.getElementById('sunburstGroup').value = recommendations.sunburst.group;
        }
        if (recommendations.sunburst.relations) {
            document.getElementById('sunburstRelations').value = recommendations.sunburst.relations;
        }
    }

    updateFieldSelections() {
        // Update radial chart fields
        this.fieldSelections.radial.category = document.getElementById('radialCategory').value;
        this.fieldSelections.radial.value = document.getElementById('radialValue').value;
        
        // Update chord diagram fields
        this.fieldSelections.chord.entity = document.getElementById('chordEntity').value;
        this.fieldSelections.chord.relations = document.getElementById('chordRelations').value;
        
        // Update force-directed graph fields
        this.fieldSelections.force.entity = document.getElementById('forceEntity').value;
        this.fieldSelections.force.relations = document.getElementById('forceRelations').value;
        this.fieldSelections.force.group = document.getElementById('forceGroup').value;
        
        // Update sunburst chart fields
        this.fieldSelections.sunburst.entity = document.getElementById('sunburstEntity').value;
        this.fieldSelections.sunburst.group = document.getElementById('sunburstGroup').value;
        this.fieldSelections.sunburst.relations = document.getElementById('sunburstRelations').value;
        
        // Create global color mapping for consistency across visualizations
        this.createGlobalColorMapping();
    }

    // Create a consistent color mapping for all data elements
    createGlobalColorMapping() {
        // Reset color mapping
        this.colorMapping = {};
        
        // Gather all unique entities across all selected fields
        const allEntities = new Set();
        
        // Add radial chart categories
        if (this.fieldSelections.radial.category) {
            this.data.forEach(d => allEntities.add(d[this.fieldSelections.radial.category]));
        }
        
        // Add chord entities and their relations
        if (this.fieldSelections.chord.entity && this.fieldSelections.chord.relations) {
            this.data.forEach(d => {
                allEntities.add(d[this.fieldSelections.chord.entity]);
                d[this.fieldSelections.chord.relations].forEach(r => allEntities.add(r));
            });
        }
        
        // Add force graph entities and their relations
        if (this.fieldSelections.force.entity && this.fieldSelections.force.relations) {
            this.data.forEach(d => {
                allEntities.add(d[this.fieldSelections.force.entity]);
                d[this.fieldSelections.force.relations].forEach(r => allEntities.add(r));
            });
        }
        
        // Add sunburst entities, groups and relations
        if (this.fieldSelections.sunburst.entity && this.fieldSelections.sunburst.relations) {
            this.data.forEach(d => {
                allEntities.add(d[this.fieldSelections.sunburst.entity]);
                if (this.fieldSelections.sunburst.group) {
                    allEntities.add(d[this.fieldSelections.sunburst.group]);
                }
                d[this.fieldSelections.sunburst.relations].forEach(r => allEntities.add(r));
            });
        }
        
        // Assign colors to all entities
        [...allEntities].forEach((entity, i) => {
            this.colorMapping[entity] = d3.schemeCategory10[i % 10];
        });
    }

    createFilterWidgets() {
        // Show filter container
        document.getElementById('filterContainer').style.display = 'block';
        
        const categoricalContainer = document.getElementById('categoricalFilters');
        const numericalContainer = document.getElementById('numericalFilters');
        
        // Clear previous filters
        categoricalContainer.innerHTML = '';
        numericalContainer.innerHTML = '';
        
        // Add titles to filter sections
        categoricalContainer.innerHTML = '<h3>Categorical Filters</h3>';
        numericalContainer.innerHTML = '<h3>Numerical Filters</h3>';
        
        // Create a set of all fields used in visualizations
        const usedFields = new Set();
        Object.values(this.fieldSelections).forEach(selection => {
            Object.values(selection).forEach(field => {
                if (field) usedFields.add(field);
            });
        });
        
        // Create filter widgets for each field
        let hasNumericalFilters = false;
        let hasCategoricalFilters = false;
        
        usedFields.forEach(field => {
            // Skip relation fields (arrays)
            if (DataParser.isArrayField(this.data, field)) return;
            
            const fieldType = typeof this.data[0][field];
            
            if (fieldType === 'number') {
                hasNumericalFilters = true;
                // Create numerical range filter with double-ended slider
                const { min, max } = DataParser.getMinMax(this.data, field);
                
                const filterDiv = document.createElement('div');
                filterDiv.className = 'field-group';
                
                // Create a more sophisticated range slider
                filterDiv.innerHTML = `
                    <label class="field-label">${field}:</label>
                    <div class="range-slider-container">
                        <input type="range" id="filter-min-${field}" min="${min}" max="${max}" step="${(max - min) / 100}" 
                               value="${min}" class="range-filter min-range" data-field="${field}">
                        <input type="range" id="filter-max-${field}" min="${min}" max="${max}" step="${(max - min) / 100}"
                               value="${max}" class="range-filter max-range" data-field="${field}">
                    </div>
                    <div class="range-values">
                        <span id="filter-min-value-${field}">${min.toFixed(2)}</span>
                        <span>to</span>
                        <span id="filter-max-value-${field}">${max.toFixed(2)}</span>
                        <button id="reset-filter-${field}" class="reset-filter-btn">Reset</button>
                    </div>
                `;
                numericalContainer.appendChild(filterDiv);
                
                // Add event listeners for min range
                document.getElementById(`filter-min-${field}`).addEventListener('input', (e) => {
                    const minValue = parseFloat(e.target.value);
                    const maxInput = document.getElementById(`filter-max-${field}`);
                    const maxValue = parseFloat(maxInput.value);
                    
                    // Ensure min value doesn't exceed max value
                    if (minValue > maxValue) {
                        e.target.value = maxValue;
                        document.getElementById(`filter-min-value-${field}`).textContent = maxValue.toFixed(2);
                    } else {
                        document.getElementById(`filter-min-value-${field}`).textContent = minValue.toFixed(2);
                    }
                    this.filterData();
                });
                
                // Add event listeners for max range
                document.getElementById(`filter-max-${field}`).addEventListener('input', (e) => {
                    const maxValue = parseFloat(e.target.value);
                    const minInput = document.getElementById(`filter-min-${field}`);
                    const minValue = parseFloat(minInput.value);
                    
                    // Ensure max value isn't less than min value
                    if (maxValue < minValue) {
                        e.target.value = minValue;
                        document.getElementById(`filter-max-value-${field}`).textContent = minValue.toFixed(2);
                    } else {
                        document.getElementById(`filter-max-value-${field}`).textContent = maxValue.toFixed(2);
                    }
                    this.filterData();
                });
                
                // Add reset button listener
                document.getElementById(`reset-filter-${field}`).addEventListener('click', () => {
                    document.getElementById(`filter-min-${field}`).value = min;
                    document.getElementById(`filter-max-${field}`).value = max;
                    document.getElementById(`filter-min-value-${field}`).textContent = min.toFixed(2);
                    document.getElementById(`filter-max-value-${field}`).textContent = max.toFixed(2);
                    this.filterData();
                });
            } else {
                hasCategoricalFilters = true;
                // Create categorical filter with multi-select capability
                const uniqueValues = DataParser.getUniqueValues(
                    DataParser.getFieldValues(this.data, field)
                );
                
                const filterDiv = document.createElement('div');
                filterDiv.className = 'field-group';
                
                // Create checkboxes for multi-select
                let checkboxes = '';
                uniqueValues.forEach(value => {
                    checkboxes += `
                        <div class="checkbox-option">
                            <input type="checkbox" id="filter-${field}-${value}" 
                                   class="categorical-filter" data-field="${field}" 
                                   data-value="${value}" checked>
                            <label for="filter-${field}-${value}">${value}</label>
                        </div>
                    `;
                });
                
                filterDiv.innerHTML = `
                    <label class="field-label">${field}:</label>
                    <div class="filter-options-container">
                        <div class="filter-options-header">
                            <button id="select-all-${field}" class="small-btn">Select All</button>
                            <button id="clear-all-${field}" class="small-btn">Clear All</button>
                        </div>
                        <div class="filter-options-list">
                            ${checkboxes}
                        </div>
                    </div>
                `;
                categoricalContainer.appendChild(filterDiv);
                
                // Add event listeners to checkboxes
                document.querySelectorAll(`.categorical-filter[data-field="${field}"]`).forEach(checkbox => {
                    checkbox.addEventListener('change', () => {
                        this.filterData();
                    });
                });
                
                // Add event listeners for select all/clear all buttons
                document.getElementById(`select-all-${field}`).addEventListener('click', () => {
                    document.querySelectorAll(`.categorical-filter[data-field="${field}"]`)
                        .forEach(checkbox => checkbox.checked = true);
                    this.filterData();
                });
                
                document.getElementById(`clear-all-${field}`).addEventListener('click', () => {
                    document.querySelectorAll(`.categorical-filter[data-field="${field}"]`)
                        .forEach(checkbox => checkbox.checked = false);
                    this.filterData();
                });
            }
        });
        
        // Show/hide containers based on available filters
        numericalContainer.style.display = hasNumericalFilters ? 'block' : 'none';
        categoricalContainer.style.display = hasCategoricalFilters ? 'block' : 'none';
        
        // Add a button to reset all filters - FIXED: Now uses UIControls to prevent duplication
        if (hasNumericalFilters || hasCategoricalFilters) {
            const filterContainer = document.getElementById('filterContainer');
            const resetAllBtn = UIControls.updateResetAllFiltersButton(filterContainer);
            resetAllBtn.addEventListener('click', () => this.resetAllFilters());
        }
        
        // Initialize filter UI controls after widgets are created
        UIControls.initializeFilterControls();
    }
    
    resetAllFilters() {
        // Reset all categorical filters
        document.querySelectorAll('.categorical-filter[type="checkbox"]')
            .forEach(checkbox => checkbox.checked = true);
            
        // Reset all numerical filters
        document.querySelectorAll('.range-filter.min-range').forEach(input => {
            const field = input.dataset.field;
            const { min } = DataParser.getMinMax(this.originalData, field);
            input.value = min;
            document.getElementById(`filter-min-value-${field}`).textContent = min.toFixed(2);
        });
        
        document.querySelectorAll('.range-filter.max-range').forEach(input => {
            const field = input.dataset.field;
            const { max } = DataParser.getMinMax(this.originalData, field);
            input.value = max;
            document.getElementById(`filter-max-value-${field}`).textContent = max.toFixed(2);
        });
        
        // Reset to original data and re-render
        this.data = [...this.originalData];
        this.renderAllVisualizations();
    }

    filterData() {
        // Start with original data
        let filteredData = [...this.originalData];
        
        // Apply categorical filters (checkboxes)
        const categoricalFilterFields = new Set();
        document.querySelectorAll('.categorical-filter[type="checkbox"]').forEach(filter => {
            categoricalFilterFields.add(filter.dataset.field);
        });
        
        categoricalFilterFields.forEach(field => {
            const checkedValues = new Set();
            document.querySelectorAll(`.categorical-filter[data-field="${field}"]:checked`).forEach(filter => {
                checkedValues.add(filter.dataset.value);
            });
            
            // Only filter if not all values are selected
            if (checkedValues.size > 0) {
                filteredData = filteredData.filter(d => checkedValues.has(String(d[field])));
            }
        });
        
        // Apply numerical range filters
        const numericalFilterFields = new Set();
        document.querySelectorAll('.range-filter.min-range').forEach(filter => {
            numericalFilterFields.add(filter.dataset.field);
        });
        
        numericalFilterFields.forEach(field => {
            const minValue = parseFloat(document.querySelector(`.range-filter.min-range[data-field="${field}"]`).value);
            const maxValue = parseFloat(document.querySelector(`.range-filter.max-range[data-field="${field}"]`).value);
            
            filteredData = filteredData.filter(d => {
                const value = parseFloat(d[field]);
                return value >= minValue && value <= maxValue;
            });
        });
        
        // Update data and update selection info to reflect filtered data
        this.data = filteredData;
        
        // Check if any selected items are no longer in filtered data
        if (this.selectedItems.size > 0) {
            const itemsToRemove = [];
            this.selectedItems.forEach(item => {
                // Check if the item exists in any field of the filtered data
                const stillExists = filteredData.some(d => 
                    Object.values(d).some(value => 
                        Array.isArray(value) 
                            ? value.includes(item)
                            : String(value) === String(item)
                    )
                );
                
                if (!stillExists) {
                    itemsToRemove.push(item);
                }
            });
            
            // Remove items that are no longer in the filtered data
            itemsToRemove.forEach(item => this.selectedItems.delete(item));
        }
        
        // Re-render all visualizations
        this.renderAllVisualizations();
    }

    renderAllVisualizations() {
        // Create color mappings before rendering
        this.createGlobalColorMapping();
        
        // Render all chart types
        this.radialChart.render(this.data, this.fieldSelections.radial, this.selectedItems, this.colorMapping);
        this.chordDiagram.render(this.data, this.fieldSelections.chord, this.selectedItems, this.colorMapping);
        this.forceGraph.render(this.data, this.fieldSelections.force, this.selectedItems, this.colorMapping);
        this.renderSunburstChart();
        
        // Update selection info if there are selected items
        if (this.selectedItems.size > 0) {
            this.updateSelectionInfo();
        }
    }
    
    renderSunburstChart() {
        try {
            // Clear any existing chart
            const container = document.getElementById('sunburstChart');
            container.innerHTML = '';
            
            // Check if the required fields are selected
            if (!this.fieldSelections.sunburst.entity || 
                !this.fieldSelections.sunburst.group || 
                !this.fieldSelections.sunburst.relations) {
                container.innerHTML = '<div class="chart-message">Please select entity, group, and relations fields</div>';
                return;
            }
            
            // Create and render the sunburst chart
            const sunburst = new SunburstChart(
                'sunburstChart',
                this.data,
                this.fieldSelections.sunburst,
                this.colorMapping,
                this.tooltip,
                this.selectedItems
            );
            
            sunburst.render();
            
        } catch (error) {
            console.error("Error rendering sunburst chart:", error);
            document.getElementById('sunburstChart').innerHTML = 
                '<div class="chart-error">Error rendering sunburst chart</div>';
        }
    }
    
    handleSelection(item, event) {
        // Check for multi-selection (Ctrl/Shift key pressed)
        const isMultiSelect = event && (event.ctrlKey || event.shiftKey);
        
        // If not multi-selecting, clear previous selections
        if (!isMultiSelect) {
            this.selectedItems.clear();
        }
        
        // Toggle selection for the clicked item
        if (this.selectedItems.has(item)) {
            this.selectedItems.delete(item);
        } else {
            this.selectedItems.add(item);
        }
        
        // Update selection info display
        this.updateSelectionInfo();
        
        // Update all visualizations to reflect selection
        this.renderAllVisualizations();
        
        // Update filter widgets to reflect selection
        this.updateFiltersFromSelection(item);
    }
    
    // Method to update selection info display
    updateSelectionInfo() {
        // Get or create the selection info container in the sidebar
        let selectionInfo = document.getElementById('sidebar-selection-info');
        if (!selectionInfo) {
            // Create selection info section in the sidebar
            const sidebar = document.getElementById('sidebar');
            const selectionSection = document.createElement('div');
            selectionSection.className = 'sidebar-section';
            
            // Create section header
            const header = document.createElement('div');
            header.className = 'section-header collapsible-header';
            header.innerHTML = `
                <i class="fas fa-tags"></i>
                <span>Selected Items</span>
                <i class="fas fa-chevron-down toggle-icon"></i>
            `;
            
            // Create section content
            const content = document.createElement('div');
            content.className = 'section-content expanded';
            content.id = 'sidebar-selection-info';
            
            // Add to sidebar
            selectionSection.appendChild(header);
            selectionSection.appendChild(content);
            sidebar.appendChild(selectionSection);
            
            // Add event listener to make it collapsible
            header.addEventListener('click', (e) => {
                content.classList.toggle('expanded');
                const icon = header.querySelector('.toggle-icon');
                if (content.classList.contains('expanded')) {
                    icon.className = 'fas fa-chevron-down toggle-icon';
                } else {
                    icon.className = 'fas fa-chevron-right toggle-icon';
                }
                e.stopPropagation();
            });
            
            selectionInfo = content;
        }
        
        // Update selection display in sidebar
        if (this.selectedItems.size === 0) {
            selectionInfo.innerHTML = '<div class="empty-selection">No items selected</div>';
        } else {
            const items = Array.from(this.selectedItems).map(item => {
                return `<span class="selected-item">${item}</span>`;
            }).join('');
            
            selectionInfo.innerHTML = `
                <div class="selection-list">${items}</div>
                <button class="clear-selection-btn">Clear Selection</button>
            `;
            
            // Add event listener to clear button
            selectionInfo.querySelector('.clear-selection-btn').addEventListener('click', () => {
                this.selectedItems.clear();
                this.updateSelectionInfo();
                this.renderAllVisualizations();
            });
        }
        
        // Hide the main selection info if it exists (the old location)
        const mainSelectionInfo = document.getElementById('selection-info');
        if (mainSelectionInfo) {
            mainSelectionInfo.style.display = 'none';
        }
    }

    clearSelections() {
        this.selectedItems.clear();
        this.renderAllVisualizations();
        
        // Reset filter widgets
        document.querySelectorAll('.categorical-filter').forEach(filter => {
            filter.value = 'all';
        });
        
        // Reset numerical filters to min values
        document.querySelectorAll('.range-filter').forEach(filter => {
            const field = filter.dataset.field;
            const { min } = DataParser.getMinMax(this.originalData, field);
            filter.value = min;
            document.getElementById(`filter-${field}-value`).textContent = min.toFixed(2);
        });
    }
    
    updateFiltersFromSelection(item) {
        // Find the selected item in the data
        const selectedData = this.originalData.find(d => {
            // Check all categorical fields for a match
            return Object.entries(d).some(([key, value]) => {
                if (typeof value === 'string' || typeof value === 'number') {
                    return value.toString() === item.toString();
                }
                return false;
            });
        });
        
        if (!selectedData) return;
        
        // Update categorical filters
        document.querySelectorAll('.categorical-filter').forEach(filter => {
            const field = filter.dataset.field;
            if (selectedData[field]) {
                filter.value = selectedData[field];
            }
        });
    }

    // Initialize chart components
    initializeCharts() {
        if (!this.radialChart) {
            this.radialChart = new RadialBarChart('#radialChart', this.tooltip, this);
        }
        
        if (!this.chordDiagram) {
            this.chordDiagram = new ChordDiagram('#chordDiagram', this.tooltip, this);
        }
        
        if (!this.forceGraph) {
            this.forceGraph = new ForceDirectedGraph('#forceGraph', this.tooltip, this);
        }
        
        // Sunburst is created in renderSunburstChart method
    }
    
    handleResize() {
        // Only redraw if charts are already rendered
        if (this.data && document.getElementById('radialChart').innerHTML !== '') {
            // Add a small delay to ensure DOM updates are complete
            setTimeout(() => {
                this.renderAllVisualizations();
            }, 100);
        }
    }
}

// Class for data parsing and analysis
class DataParser {
    static analyzeData(data) {
        if (!data || !data.length) {
            throw new Error('No data to analyze');
        }
        
        const fields = {};
        const recommendations = {
            radialBar: { category: null, value: null },
            chord: { entity: null, relations: null },
            force: { entity: null, relations: null, group: null },
            sunburst: { entity: null, group: null, relations: null }
        };

        // Analyze the first data item for field types
        const sampleData = data[0];
        
        // Classify all fields
        Object.keys(sampleData).forEach(field => {
            if (Array.isArray(sampleData[field])) {
                fields[field] = 'array';
            } else if (typeof sampleData[field] === 'number') {
                fields[field] = 'numerical';
            } else if (typeof sampleData[field] === 'string') {
                // Check if the field has few unique values relative to dataset
                const uniqueValues = this.getUniqueValues(
                    this.getFieldValues(data, field)
                );
                
                // If uniqueValues > 50% of dataset, it's likely an identifier
                const isIdentifier = uniqueValues.size > data.length * 0.5;
                fields[field] = isIdentifier ? 'identifier' : 'categorical';
            }
        });
        
        // Find suitable fields for each visualization
        // For Radial Bar Chart: need categorical field and numerical value
        const categoricalFields = Object.entries(fields)
            .filter(([_, type]) => type === 'categorical')
            .map(([field]) => field);
            
        const numericalFields = Object.entries(fields)
            .filter(([_, type]) => type === 'numerical')
            .map(([field]) => field);
            
        const arrayFields = Object.entries(fields)
            .filter(([_, type]) => type === 'array')
            .map(([field]) => field);
            
        if (categoricalFields.length && numericalFields.length) {
            recommendations.radialBar.category = categoricalFields[0];
            recommendations.radialBar.value = numericalFields[0];
        }
        
        // For Chord Diagram & Force Graph: need entity field and array relation field
        if (categoricalFields.length && arrayFields.length) {
            // For simplicity, we'll choose same sets for chord and force
            recommendations.chord.entity = categoricalFields[0];
            recommendations.chord.relations = arrayFields[0];
            
            recommendations.force.entity = categoricalFields[0];
            recommendations.force.relations = arrayFields[0];
            recommendations.force.group = categoricalFields.length > 1 ? categoricalFields[1] : null;
        }
        
        // For Sunburst: need entity, group, and relations
        if (categoricalFields.length > 1 && arrayFields.length) {
            recommendations.sunburst.entity = categoricalFields[0];
            recommendations.sunburst.group = categoricalFields[1];
            recommendations.sunburst.relations = arrayFields[0];
        }
        
        return { fields, recommendations };
    }
    
    static getFieldValues(data, field) {
        return data.map(d => d[field]);
    }
    
    static getUniqueValues(values) {
        return new Set(values);
    }
    
    static getMinMax(data, field) {
        const values = data.map(d => parseFloat(d[field])).filter(v => !isNaN(v));
        return {
            min: Math.min(...values),
            max: Math.max(...values)
        };
    }
    
    static isArrayField(data, field) {
        return data.length > 0 && Array.isArray(data[0][field]);
    }
    
    static createFieldOptions(fields, type) {
        return Object.entries(fields)
            .filter(([_, fieldType]) => fieldType === type)
            .map(([field]) => `<option value="${field}">${field}</option>`)
            .join('');
    }
}

// Initialize dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new Dashboard();
    dashboard.initializeCharts();
});

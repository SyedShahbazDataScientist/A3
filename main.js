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
        
        this.initialize();
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

        // Apply field selections
        document.getElementById('applyFields').addEventListener('click', () => {
            this.updateFieldSelections();
            this.createFilterWidgets();
            this.renderAllVisualizations();
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
        
        // Add a button to reset all filters
        if (hasNumericalFilters || hasCategoricalFilters) {
            const resetAllBtn = document.createElement('button');
            resetAllBtn.id = 'resetAllFilters';
            resetAllBtn.textContent = 'Reset All Filters';
            resetAllBtn.className = 'reset-all-btn';
            resetAllBtn.addEventListener('click', () => this.resetAllFilters());
            
            document.getElementById('filterContainer').appendChild(resetAllBtn);
        }
        
        // Add filter styles
        const style = document.createElement('style');
        style.textContent = `
            .filter-options-container {
                border: 1px solid #e1e4e8;
                border-radius: 4px;
                margin-top: 5px;
            }
            
            .filter-options-header {
                display: flex;
                justify-content: space-between;
                padding: 5px;
                background: #f6f8fa;
                border-bottom: 1px solid #e1e4e8;
            }
            
            .small-btn {
                padding: 3px 8px;
                font-size: 12px;
                background: #0366d6;
            }
            
            .filter-options-list {
                max-height: 150px;
                overflow-y: auto;
                padding: 5px;
            }
            
            .checkbox-option {
                padding: 3px 0;
            }
            
            .range-slider-container {
                position: relative;
                height: 40px;
            }
            
            .range-filter {
                position: absolute;
                width: 100%;
                pointer-events: none;
            }
            
            .range-filter::-webkit-slider-thumb {
                pointer-events: auto;
            }
            
            .range-filter::-moz-range-thumb {
                pointer-events: auto;
            }
            
            .reset-filter-btn {
                padding: 2px 6px;
                font-size: 11px;
                margin-left: 8px;
            }
            
            .reset-all-btn {
                margin-top: 20px;
                background: #e74c3c;
            }
        `;
        document.head.appendChild(style);
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
        this.renderRadialChart();
        this.renderChordDiagram();
        this.renderForceGraph();
        this.renderSunburstChart();
        
        // Update selection info if there are selected items
        if (this.selectedItems.size > 0) {
            this.updateSelectionInfo();
        }
    }

    renderRadialChart() {
        const container = document.getElementById('radialChart');
        container.innerHTML = '';
        
        const width = container.clientWidth;
        const height = 400;
        
        const margin = 40;
        const radius = Math.min(width, height) / 2 - margin;
        
        const svg = d3.select('#radialChart')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
            
        // Add a group for the chart that can be zoomed/panned
        const g = svg.append('g')
            .attr('transform', `translate(${width/2},${height/2})`)
            .call(d3.zoom()
                .scaleExtent([0.5, 2])
                .on("zoom", (event) => g.attr("transform", `translate(${width/2 + event.transform.x},${height/2 + event.transform.y}) scale(${event.transform.k})`))
            );
            
        // Check if we have necessary fields
        if (!this.fieldSelections.radial.category || !this.fieldSelections.radial.value) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .text('Please select category and value fields');
            return;
        }
        
        // Add help text
        svg.append("text")
            .attr("x", 10)
            .attr("y", 20)
            .attr("font-size", "10px")
            .attr("fill", "#666")
            .text("Drag to pan, scroll to zoom, Ctrl+click for multi-select");
            
        // Use selected fields
        const categoryField = this.fieldSelections.radial.category;
        const valueField = this.fieldSelections.radial.value;
        
        // Map data to the chart's format
        const chartData = this.data.map(d => ({
            name: d[categoryField],
            value: d[valueField],
            originalData: d // Store original data for tooltips and linking
        }));
        
        // Create consistent color mapping
        const colorMapping = {};
        chartData.forEach((d, i) => {
            colorMapping[d.name] = d3.schemeCategory10[i % 10];
        });
        
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
            .attr('fill', d => colorMapping[d.name])
            .style('opacity', d => this.selectedItems.size > 0 ? 
                (this.selectedItems.has(d.name) ? 1 : 0.3) : 0.8)
            .style('stroke', d => d3.rgb(colorMapping[d.name]).darker(0.5))
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
                    .style('opacity', d => this.selectedItems.size > 0 ? 
                        (this.selectedItems.has(d.name) ? 1 : 0.3) : 0.8)
                    .style('stroke-width', 0.5)
                    .attr('transform', 'scale(1)');
            })
            .on('click', (event, d) => {
                this.handleSelection(d.name, event);
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
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(10, ${height - 10})`)
            .style('font-size', '10px');
            
        const legendItems = legend.selectAll('.legend-item')
            .data(chartData)
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${-i * 15})`);
            
        legendItems.append('rect')
            .attr('width', 10)
            .attr('height', 10)
            .attr('fill', d => colorMapping[d.name])
            .style('opacity', d => this.selectedItems.size > 0 ? 
                (this.selectedItems.has(d.name) ? 1 : 0.3) : 0.8);
                
        legendItems.append('text')
            .attr('x', 15)
            .attr('y', 8)
            .text(d => d.name)
            .style('opacity', d => this.selectedItems.size > 0 ? 
                (this.selectedItems.has(d.name) ? 1 : 0.3) : 0.8)
            .on('click', (event, d) => {
                this.handleSelection(d.name, event);
            })
            .style('cursor', 'pointer');
            
        // Add a title
        svg.append('text')
            .attr('class', 'chart-title')
            .attr('x', width / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text(`${categoryField} by ${valueField}`);
    }

    renderChordDiagram() {
        const container = document.getElementById('chordDiagram');
        container.innerHTML = '';
        
        const width = container.clientWidth;
        const height = 400;
        const radius = Math.min(width, height) * 0.4;
        
        const svg = d3.select('#chordDiagram')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
            
        // Add zoom capability
        const g = svg.append('g')
            .attr('transform', `translate(${width/2},${height/2})`)
            .call(d3.zoom()
                .scaleExtent([0.5, 2])
                .on("zoom", (event) => g.attr("transform", `translate(${width/2 + event.transform.x},${height/2 + event.transform.y}) scale(${event.transform.k})`))
            );
            
        // Check if we have necessary fields
        if (!this.fieldSelections.chord.entity || !this.fieldSelections.chord.relations) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .text('Please select entity and relations fields');
            return;
        }
        
        // Add help text
        svg.append("text")
            .attr("x", 10)
            .attr("y", 20)
            .attr("font-size", "10px")
            .attr("fill", "#666")
            .text("Drag to pan, scroll to zoom, Ctrl+click for multi-select");
        
        // Use selected fields
        const entityField = this.fieldSelections.chord.entity;
        const relationField = this.fieldSelections.chord.relations;
        
        // Check if data has required fields
        if (this.data.length === 0 || !this.data[0][relationField] || !Array.isArray(this.data[0][relationField])) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .text('Invalid data format for chord diagram');
            return;
        }
        
        // Get unique entities
        const entities = new Set();
        this.data.forEach(d => {
            entities.add(d[entityField]);
            d[relationField].forEach(c => entities.add(c));
        });
        const names = Array.from(entities);
        
        // Create a weighted matrix based on relationship counts
        const matrix = Array(names.length).fill(0)
            .map(() => Array(names.length).fill(0));
            
        // Create original data lookup for tooltips
        const entityData = {};
        
        this.data.forEach(d => {
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
        const colorMapping = {};
        names.forEach((name, i) => {
            colorMapping[name] = d3.schemeCategory10[i % 10];
        });
        
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
                const gradient = svg.append("defs")
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
            .style('opacity', d => this.selectedItems.size > 0 ? 
                (this.selectedItems.has(names[d.index]) ? 1 : 0.3) : 0.8)
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
                this.updateChordHighlighting(outerArcs, ribbons, names);
            })
            .on("click", (event, d) => {
                this.handleSelection(names[d.index], event);
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
                const gradient = svg.append("defs")
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
                if (this.selectedItems.size === 0) return 0.7;
                
                const sourceEntity = names[d.source.index];
                const targetEntity = names[d.target.index];
                
                return (this.selectedItems.has(sourceEntity) || this.selectedItems.has(targetEntity)) ? 0.9 : 0.1;
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
                this.updateChordHighlighting(outerArcs, ribbons, names);
            })
            .on("click", (event, d) => {
                // Select both connected entities
                if (event.ctrlKey || event.shiftKey) {
                    const sourceEntity = names[d.source.index];
                    const targetEntity = names[d.target.index];
                    
                    // Add both to selection
                    this.selectedItems.add(sourceEntity);
                    this.selectedItems.add(targetEntity);
                    this.renderAllVisualizations();
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
    updateChordHighlighting(outerArcs, ribbons, names) {
        if (this.selectedItems.size === 0) {
            // No selection, show all with normal opacity
            outerArcs.style("opacity", 0.8);
            ribbons.style("opacity", 0.7);
            return;
        }
        
        // Highlight selected arcs
        outerArcs.style("opacity", d => 
            this.selectedItems.has(names[d.index]) ? 1 : 0.3);
            
        // Highlight ribbons connected to selected entities
        ribbons.style("opacity", d => {
            const sourceEntity = names[d.source.index];
            const targetEntity = names[d.target.index];
            
            return (this.selectedItems.has(sourceEntity) || this.selectedItems.has(targetEntity)) ? 
                0.9 : 0.1;
        });
    }

    renderForceGraph() {
        const container = document.getElementById('forceGraph');
        container.innerHTML = '';
        
        const width = container.clientWidth;
        const height = 400;
        
        // Create SVG with zoom capability
        const svg = d3.select('#forceGraph')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .call(d3.zoom()
                .extent([[0, 0], [width, height]])
                .scaleExtent([0.1, 4])
                .on("zoom", zoomed));
        
        // Main graphics container to apply zoom
        const g = svg.append("g").attr("class", "force-container");
            
        // Function to implement zooming
        function zoomed(event) {
            g.attr("transform", event.transform);
        }
            
        // Check if we have necessary fields
        if (!this.fieldSelections.force.entity || !this.fieldSelections.force.relations) {
            svg.append('text')
                .attr('text-anchor', 'middle')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .text('Please select entity and relations fields');
            return;
        }
        
        // Add help text for interactions
        svg.append("text")
            .attr("class", "help-text")
            .attr("x", 10)
            .attr("y", 20)
            .attr("font-size", "10px")
            .attr("fill", "#666")
            .text("Scroll to zoom, drag to pan, Ctrl+click for multi-select");
        
        // Use selected fields
        const entityField = this.fieldSelections.force.entity;
        const relationField = this.fieldSelections.force.relations;
        const groupField = this.fieldSelections.force.group;
        
        // Check if data has required fields
        if (this.data.length === 0 || !this.data[0][relationField] || !Array.isArray(this.data[0][relationField])) {
            svg.append('text')
                .attr('text-anchor', 'middle')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .text('Invalid data format for force graph');
            return;
        }
        
        // Create nodes and links
        const nodes = [];
        const links = [];
        const nodeSet = new Set();
        
        // Add main entities first
        this.data.forEach(d => {
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
        this.data.forEach(d => {
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
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(30))
            // Use cluster force for community structure
            .force('cluster', this.forceCluster(nodes));
            
        // Create color scale based on groups (prefer communities if available)
        const clusterField = groupField || "community";
        const uniqueGroups = [...new Set(nodes.map(d => d[clusterField]))];
        const color = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(uniqueGroups);
            
        // Draw links
        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('class', 'force-link')
            .attr('stroke', '#999')
            .attr('stroke-width', d => 1.5 + Math.sqrt(d.value || 1))
            .attr('stroke-opacity', d => {
                if (this.selectedItems.size === 0) return 0.6;
                
                return (this.selectedItems.has(d.source.id) || this.selectedItems.has(d.target.id)) ? 
                    0.8 : 0.1;
            });
            
        // Draw nodes
        const node = g.append('g')
            .selectAll('circle')
            .data(nodes)
            .join('circle')
            .attr('class', 'force-node')
            .attr('r', d => d.isMainEntity ? 8 : 5)
            .attr('fill', d => color(d[clusterField]))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .style('opacity', d => this.selectedItems.size > 0 ? 
                (this.selectedItems.has(d.id) ? 1 : 0.3) : 0.8)
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
                node.style('opacity', d => this.selectedItems.size > 0 ? 
                    (this.selectedItems.has(d.id) ? 1 : 0.3) : 0.8);
                    
                // Restore link opacity based on selection
                link.attr('stroke-opacity', l => {
                    if (this.selectedItems.size === 0) return 0.6;
                    return (this.selectedItems.has(l.source.id) || this.selectedItems.has(l.target.id)) ? 
                        0.8 : 0.1;
                });
            })
            .on('click', (event, d) => {
                this.handleSelection(d.id, event);
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
        this.drawClusterHulls(g, nodes, color);
            
        // Update positions on simulation tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
                
            node
                .attr('cx', d => d.x = Math.max(10, Math.min(width - 10, d.x)))
                .attr('cy', d => d.y = Math.max(10, Math.min(height - 10, d.y)));
                
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
    drawClusterHulls(svg, nodes, colorScale) {
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

    renderSunburstChart() {
        const container = document.getElementById('sunburstChart');
        container.innerHTML = '';
        
        const width = container.clientWidth;
        const height = 400;
        const radius = Math.min(width, height) / 2;
        
        // Add breadcrumb navigation
        const breadcrumb = d3.select('#sunburstChart')
            .append('div')
            .attr('class', 'breadcrumb')
            .style('position', 'absolute')
            .style('top', '5px')
            .style('left', '5px')
            .style('font-size', '12px')
            .style('padding', '5px');
            
        breadcrumb.append('span')
            .text('Home');
            
        // Create SVG with zoom capability
        const svg = d3.select('#sunburstChart')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
            
        // Add help text for interactions
        svg.append("text")
            .attr("class", "help-text")
            .attr("x", 10)
            .attr("y", 20)
            .attr("font-size", "10px")
            .attr("fill", "#666")
            .text("Scroll to zoom, click segments to navigate, Shift+click to select");
            
        // Create main container group for zoom
        const g = svg.append('g')
            .attr('transform', `translate(${width/2},${height/2})`);
            
        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 5])  // Allow zooming from 0.5x to 5x
            .extent([[0, 0], [width, height]])
            .on("zoom", zoomed);
            
        svg.call(zoom);
        
        // Function to handle zoom events
        function zoomed(event) {
            g.attr("transform", `translate(${width/2},${height/2}) scale(${event.transform.k})`);
            // Adjust stroke width inversely with zoom to keep line thickness consistent
            g.selectAll('.sunburst-arc')
                .style('stroke-width', 0.5 / event.transform.k);
            // Scale down text size inversely with zoom to maintain readability
            g.selectAll('.sunburst-label')
                .style('font-size', `${10 / Math.sqrt(event.transform.k)}px`);
        }
            
        // Center text for showing current focus
        const centerText = g.append('text')
            .attr('class', 'center-text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', '14px')
            .style('opacity', 0);
            
        // Check if we have necessary fields
        if (!this.fieldSelections.sunburst.entity || !this.fieldSelections.sunburst.group || !this.fieldSelections.sunburst.relations) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .text('Please select entity, group, and relations fields');
            return;
        }
        
        // Use selected fields
        const entityField = this.fieldSelections.sunburst.entity;
        const groupField = this.fieldSelections.sunburst.group;
        const relationField = this.fieldSelections.sunburst.relations;
        
        // Check if data has required fields
        if (this.data.length === 0 || 
            !this.data[0][relationField] || !Array.isArray(this.data[0][relationField]) ||
            !this.data[0][groupField]) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .text('Invalid data format for sunburst chart');
            return;
        }
        
        // Create more detailed hierarchical structure for sunburst
        const entityNodes = this.data.map(d => {
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
        const entities = this.data.map(d => d[entityField]);
        const groups = [...new Set(this.data.map(d => d[groupField]))];
        const relations = [...new Set(this.data.flatMap(d => d[relationField]))];
        
        // Create a consistent color mapping for entities
        const colorMapping = {};
        [...entities, ...groups, ...relations].forEach((item, i) => {
            colorMapping[item] = d3.schemeCategory10[i % 10];
        });
        
        const color = d => {
            // For hierarchical coloring with enhanced contrast
            if (d.depth === 0) return "#e0e0e0"; // Root - light gray instead of white
            if (d.depth === 1) return colorMapping[d.data.name] || d3.schemeSet3[d.depth % 12]; // Entity - using schemeSet3 for better contrast
            if (d.depth === 2) return colorMapping[d.data.name] || d3.schemeSet2[d.depth % 8]; // Group - using schemeSet2
            return colorMapping[d.data.name] || d3.schemeTableau10[d.depth % 10]; // Relations - using schemeTableau10
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
            svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
            
            // Update breadcrumb
            const ancestors = node.ancestors().reverse();
            
            breadcrumb.html('');
            ancestors.forEach((d, i) => {
                breadcrumb.append('span')
                    .text(i === 0 ? 'Home' : d.data.name)
                    .style('cursor', 'pointer')
                    .style('color', i === ancestors.length - 1 ? '#333' : '#3498db')
                    .on('click', () => {
                        if (i < ancestors.length - 1) {
                            updateView(ancestors[i]);
                        }
                    });
                    
                if (i < ancestors.length - 1) {
                    breadcrumb.append('span').text(' > ');
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
                    return this.selectedItems.size > 0 ? 
                        (this.selectedItems.has(name) ? 1 : 0.3) : 0.8;
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
                            return this.selectedItems.size > 0 ? 
                                (this.selectedItems.has(name) ? 1 : 0.3) : 0.8;
                        });
                })
                .on('click', (event, d) => {
                    // If shift-click, just select the item
                    if (event.shiftKey || event.ctrlKey) {
                        this.handleSelection(d.data.name, event);
                        return;
                    }
                    
                    // Regular click - zoom if not leaf
                    if (d.children) {
                        updateView(d);
                    } else {
                        // If leaf node, select the item
                        this.handleSelection(d.data.name, event);
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
        
        // Initialize view
        updateView(root);
        
        // Add double-click handler to reset zoom
        svg.on("dblclick", () => {
            svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        });
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
        const selectionInfo = document.getElementById('selection-info');
        if (!selectionInfo) {
            // Create selection info element if it doesn't exist
            const dashboard = document.querySelector('.dashboard');
            const infoContainer = document.createElement('div');
            infoContainer.id = 'selection-info';
            infoContainer.className = 'selection-info';
            infoContainer.style.padding = '10px';
            infoContainer.style.marginBottom = '10px';
            infoContainer.style.backgroundColor = '#f8f9fa';
            infoContainer.style.borderRadius = '4px';
            infoContainer.style.border = '1px solid #dee2e6';
            
            // Insert at the top of dashboard
            dashboard.insertBefore(infoContainer, dashboard.firstChild);
        }
        
        // Update selection display
        const selectionDisplay = document.getElementById('selection-info');
        
        if (this.selectedItems.size === 0) {
            selectionDisplay.innerHTML = 'No items selected <button class="clear-selection-btn" style="margin-left: 10px; padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Clear Selection</button>';
        } else {
            let items = Array.from(this.selectedItems).map(item => {
                return `<span class="selected-item" style="
                    display: inline-block;
                    margin: 3px;
                    padding: 3px 8px;
                    background-color: #3498db;
                    color: white;
                    border-radius: 10px;
                    font-size: 12px;">${item}</span>`;
            }).join('');
            
            selectionDisplay.innerHTML = `Selected items: ${items} <button class="clear-selection-btn" style="
                margin-left: 10px;
                padding: 5px 10px;
                background: #e74c3c;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;">Clear Selection</button>`;
        }
        
        // Add event listener to clear button
        document.querySelector('.clear-selection-btn').addEventListener('click', () => {
            this.selectedItems.clear();
            this.updateSelectionInfo();
            this.renderAllVisualizations();
        });
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
}

// Initialize dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new Dashboard();
});
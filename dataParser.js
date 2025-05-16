class DataParser {
    /**
     * Checks if a string is likely a date
     * @param {string} str - The string to check
     * @returns {boolean} True if the string appears to be a date
     */
    static isDateString(str) {
        if (typeof str !== 'string') return false;
        
        // Check for ISO date format
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
            return true;
        }
        
        // Check for common date formats
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
            return true;
        }
        
        if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(str)) {
            return true;
        }
        
        // Try creating a date object
        const date = new Date(str);
        return !isNaN(date.getTime());
    }
    
    /**
     * Determines the type from subsequent samples if the first sample has null/undefined
     * @param {Array} samples - Array of sample objects
     * @param {string} key - The key to check
     * @returns {string} The determined type
     */
    static determineTypeFromLaterSamples(samples, key) {
        for (let i = 1; i < samples.length; i++) {
            if (samples[i][key] !== undefined && samples[i][key] !== null) {
                return typeof samples[i][key];
            }
        }
        return 'string'; // Default to string if all samples are null/undefined
    }
    
    /**
     * Analyzes a dataset to identify field types and suitable fields for visualizations
     * @param {Array} data - The dataset to analyze
     * @returns {Object} Field type mappings and visualization recommendations
     */
    static analyzeData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid data format: data must be a non-empty array');
        }

        // Get sample record and analyze multiple records for better accuracy
        const sampleSize = Math.min(10, data.length);
        const samples = data.slice(0, sampleSize);
        
        // Initialize field mappings
        const fields = {
            categorical: [],
            numerical: [],
            arrays: [],
            objects: [],
            date: [],
            boolean: [],
            all: Object.keys(samples[0])
        };
        
        // Count unique values for each field
        const uniqueValueCounts = {};
        const totalRecords = data.length;
        
        fields.all.forEach(field => {
            // Get all values for this field
            const values = data.map(item => item[field]).filter(val => val !== undefined && val !== null);
            
            // Count unique values
            const uniqueValues = new Set(values);
            uniqueValueCounts[field] = uniqueValues.size;
        });

        // Analyze each field to determine its type with better accuracy
        fields.all.forEach(key => {
            // Check for consistent type across samples
            let isConsistentType = true;
            let baseType = typeof samples[0][key];
            
            // Skip undefined/null values
            if (samples[0][key] === undefined || samples[0][key] === null) {
                baseType = this.determineTypeFromLaterSamples(samples, key);
            }
            
            // Check if array type is consistent across samples
            if (Array.isArray(samples[0][key])) {
                const isConsistentArray = samples.every(sample => 
                    Array.isArray(sample[key]) || sample[key] === undefined || sample[key] === null);
                    
                if (isConsistentArray) {
                    fields.arrays.push(key);
                    return;
                }
            }
            
            // For non-array fields, check type consistency
            for (let i = 1; i < samples.length; i++) {
                const sample = samples[i];
                if (sample[key] === undefined || sample[key] === null) continue;
                
                const currentType = typeof sample[key];
                if (currentType !== baseType) {
                    isConsistentType = false;
                    break;
                }
            }
            
            // If type is inconsistent, treat as categorical
            if (!isConsistentType) {
                fields.categorical.push(key);
                return;
            }
            
            // Handle consistent types
            if (Array.isArray(samples[0][key])) {
                fields.arrays.push(key);
            } else if (baseType === 'object' && samples[0][key] !== null) {
                fields.objects.push(key);
            } else if (baseType === 'number') {
                fields.numerical.push(key);
            } else if (baseType === 'boolean') {
                fields.boolean.push(key);
                fields.categorical.push(key); // Boolean can also be treated as categorical
            } else if (baseType === 'string') {
                // Check if string represents a date
                if (this.isDateString(samples[0][key])) {
                    fields.date.push(key);
                    fields.categorical.push(key); // Dates can also be treated as categorical
                } else {
                    // Check if this is a low-cardinality field (few unique values) = categorical
                    const uniqueRatio = uniqueValueCounts[key] / totalRecords;
                    if (uniqueRatio < 0.5 && uniqueValueCounts[key] < 20) {
                        fields.categorical.push(key);
                    } else {
                        // High cardinality fields might be IDs or long text - still categorical but noted
                        fields.categorical.push(key);
                    }
                }
            } else {
                fields.categorical.push(key);
            }
        });

        // Recommend fields for different visualizations
        const recommendations = {
            radialBar: {
                category: fields.categorical.length > 0 ? fields.categorical[0] : null,
                value: fields.numerical.length > 0 ? fields.numerical[0] : null
            },
            chord: {
                entity: fields.categorical.length > 0 ? fields.categorical[0] : null,
                relations: fields.arrays.length > 0 ? fields.arrays[0] : null
            },
            force: {
                entity: fields.categorical.length > 0 ? fields.categorical[0] : null,
                relations: fields.arrays.length > 0 ? fields.arrays[0] : null
            },
            sunburst: {
                entity: fields.categorical.length > 0 ? fields.categorical[0] : null,
                group: fields.categorical.length > 1 ? fields.categorical[1] : null,
                relations: fields.arrays.length > 0 ? fields.arrays[0] : null
            }
        };

        return {
            fields,
            recommendations
        };
    }

    /**
     * Creates field selector options based on field types
     * @param {Object} fields - The field types object
     * @param {string} type - The type of field to select options for
     * @returns {Array} HTML option elements
     */
    static createFieldOptions(fields, type) {
        let options = [];
        
        switch (type) {
            case 'categorical':
                options = fields.categorical;
                break;
            case 'numerical':
                options = fields.numerical;
                break;
            case 'array':
                options = fields.arrays;
                break;
            case 'all':
                options = fields.all;
                break;
        }
        
        return options.map(field => `<option value="${field}">${field}</option>`).join('');
    }

    /**
     * Determines if a field is an array type
     * @param {Array} data - The dataset
     * @param {string} field - The field name to check
     * @returns {boolean} True if the field is an array
     */
    static isArrayField(data, field) {
        return Array.isArray(data[0][field]);
    }

    /**
     * Extract specific field values from the dataset
     * @param {Array} data - The dataset
     * @param {string} field - The field to extract
     * @returns {Array} Values from the specified field
     */
    static getFieldValues(data, field) {
        return data.map(d => d[field]);
    }

    /**
     * Gets unique values from an array
     * @param {Array} values - The array of values
     * @returns {Array} Unique values
     */
    static getUniqueValues(values) {
        return [...new Set(values)];
    }

    /**
     * Gets min and max values from a numerical field
     * @param {Array} data - The dataset
     * @param {string} field - The numerical field
     * @returns {Object} Min and max values
     */
    static getMinMax(data, field) {
        const values = data.map(d => d[field]);
        return {
            min: Math.min(...values),
            max: Math.max(...values)
        };
    }
}

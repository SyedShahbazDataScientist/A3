/**
 * Data Parser - Analyzes and processes data for visualization
 */
class DataParser {
    /**
     * Analyze data structure and identify appropriate fields for visualization
     */
    static analyzeData(data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error("Invalid data format. Expected a non-empty array of objects.");
        }
        
        // Extract all field names from first object
        const firstItem = data[0];
        const fieldNames = Object.keys(firstItem);
        
        // Analyze each field type
        const fields = {};
        fieldNames.forEach(field => {
            fields[field] = this.analyzeFieldType(data, field);
        });
        
        // Make visualization recommendations based on field types
        const recommendations = this.makeRecommendations(fields, data);
        
        return {
            fields,
            recommendations
        };
    }
    
    /**
     * Determine the type of a field
     */
    static analyzeFieldType(data, field) {
        // Sample the first 10 items or less
        const sampleSize = Math.min(data.length, 10);
        const samples = data.slice(0, sampleSize);
        
        // Check if field contains arrays
        const hasArrays = samples.some(item => Array.isArray(item[field]));
        if (hasArrays) return "array";
        
        // Check if field contains objects
        const hasObjects = samples.some(item => 
            item[field] !== null && 
            typeof item[field] === 'object' &&
            !Array.isArray(item[field])
        );
        if (hasObjects) return "object";
        
        // Count numeric vs non-numeric values
        let numericCount = 0;
        let uniqueValues = new Set();
        
        samples.forEach(item => {
            const value = item[field];
            
            // Track unique values
            uniqueValues.add(value);
            
            // Check if numeric
            if (typeof value === 'number') numericCount++;
        });
        
        // Determine if categorical or numerical
        const uniqueRatio = uniqueValues.size / sampleSize;
        
        if (numericCount >= sampleSize * 0.8) {
            // Mostly numeric values, but check cardinality
            return uniqueRatio > 0.8 ? "numerical" : "categorical"; 
        } else {
            return "categorical";
        }
    }
    
    /**
     * Make recommendations for each visualization type
     */
    static makeRecommendations(fields, data) {
        const categoricalFields = Object.entries(fields)
            .filter(([_, type]) => type === "categorical")
            .map(([name, _]) => name);
            
        const numericalFields = Object.entries(fields)
            .filter(([_, type]) => type === "numerical")
            .map(([name, _]) => name);
            
        const arrayFields = Object.entries(fields)
            .filter(([_, type]) => type === "array")
            .map(([name, _]) => name);
        
        return {
            radialBar: {
                category: categoricalFields[0] || null,
                value: numericalFields[0] || null
            },
            chord: {
                entity: categoricalFields[0] || null,
                relations: arrayFields[0] || null
            },
            force: {
                entity: categoricalFields[0] || null,
                relations: arrayFields[0] || null,
                group: categoricalFields[1] || null
            },
            sunburst: {
                entity: categoricalFields[0] || null,
                group: categoricalFields[1] || null,
                relations: arrayFields[0] || null
            }
        };
    }
    
    /**
     * Create HTML options for field selection dropdowns
     */
    static createFieldOptions(fields, filterType = null) {
        let options = '';
        
        Object.entries(fields).forEach(([fieldName, fieldType]) => {
            if (!filterType || fieldType === filterType) {
                options += `<option value="${fieldName}">${fieldName}</option>`;
            }
        });
        
        return options;
    }
    
    /**
     * Check if a field contains array values
     */
    static isArrayField(data, field) {
        if (!data || data.length === 0) return false;
        return Array.isArray(data[0][field]);
    }
    
    /**
     * Get min and max values for a numerical field
     */
    static getMinMax(data, field) {
        const values = data.map(d => parseFloat(d[field])).filter(v => !isNaN(v));
        return {
            min: Math.min(...values),
            max: Math.max(...values)
        };
    }
    
    /**
     * Extract all values for a given field
     */
    static getFieldValues(data, field) {
        return data.map(d => d[field]);
    }
    
    /**
     * Get unique values from an array
     */
    static getUniqueValues(values) {
        return [...new Set(values.map(String))];
    }
}

/**
 * Function to safely extract data from complex structures
 */
function safeGet(obj, path, defaultValue = null) {
    if (!obj) return defaultValue;
    
    const pathArray = Array.isArray(path) ? path : path.split('.');
    
    let result = obj;
    for (let i = 0; i < pathArray.length; i++) {
        result = result[pathArray[i]];
        if (result === undefined || result === null) {
            return defaultValue;
        }
    }
    
    return result;
}

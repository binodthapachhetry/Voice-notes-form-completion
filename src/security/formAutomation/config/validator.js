/**
 * Form Configuration Validator
 * 
 * Validates form configuration objects against the defined JSON schema
 * to ensure data integrity and security.
 */

import { formConfigSchema, decryptedFormDataSchema } from './schema.js';

/**
 * Validates an encrypted form configuration against the schema
 * @param {Object} config - The encrypted form configuration to validate
 * @returns {Object} Validation result with success flag and any errors
 */
export function validateEncryptedConfig(config) {
  return validateAgainstSchema(config, formConfigSchema);
}

/**
 * Validates a decrypted form data payload against the schema
 * @param {Object} data - The decrypted form data to validate
 * @returns {Object} Validation result with success flag and any errors
 */
export function validateDecryptedData(data) {
  return validateAgainstSchema(data, decryptedFormDataSchema);
}

/**
 * Validates an object against a JSON schema
 * @private
 * @param {Object} data - The data to validate
 * @param {Object} schema - The JSON schema to validate against
 * @returns {Object} Validation result with success flag and any errors
 */
function validateAgainstSchema(data, schema) {
  // In a production implementation, this would use a library like Ajv
  // For now, we'll implement a simple validation function
  
  const errors = [];
  
  // Check if data is an object
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      errors: ['Data must be an object']
    };
  }
  
  // Check required properties
  if (schema.required) {
    for (const requiredProp of schema.required) {
      if (!(requiredProp in data)) {
        errors.push(`Missing required property: ${requiredProp}`);
      }
    }
  }
  
  // Check property types and nested objects
  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propName in data) {
        const value = data[propName];
        
        // Type checking
        if (propSchema.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
          errors.push(`Property ${propName} must be an object`);
        } else if (propSchema.type === 'array' && !Array.isArray(value)) {
          errors.push(`Property ${propName} must be an array`);
        } else if (propSchema.type === 'string' && typeof value !== 'string') {
          errors.push(`Property ${propName} must be a string`);
        } else if (propSchema.type === 'number' && typeof value !== 'number') {
          errors.push(`Property ${propName} must be a number`);
        } else if (propSchema.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Property ${propName} must be a boolean`);
        } else if (propSchema.type === 'integer' && (!Number.isInteger(value))) {
          errors.push(`Property ${propName} must be an integer`);
        }
        
        // Enum validation
        if (propSchema.enum && !propSchema.enum.includes(value)) {
          errors.push(`Property ${propName} must be one of: ${propSchema.enum.join(', ')}`);
        }
        
        // Recursive validation for objects
        if (propSchema.type === 'object' && propSchema.properties && typeof value === 'object') {
          const nestedResult = validateAgainstSchema(value, propSchema);
          if (!nestedResult.valid) {
            errors.push(...nestedResult.errors.map(err => `${propName}.${err}`));
          }
        }
        
        // Array item validation
        if (propSchema.type === 'array' && propSchema.items && Array.isArray(value)) {
          value.forEach((item, index) => {
            const itemResult = validateAgainstSchema(item, propSchema.items);
            if (!itemResult.valid) {
              errors.push(...itemResult.errors.map(err => `${propName}[${index}].${err}`));
            }
          });
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Sanitizes a form configuration by removing any properties not defined in the schema
 * @param {Object} config - The form configuration to sanitize
 * @param {Object} schema - The schema to sanitize against
 * @returns {Object} The sanitized configuration
 */
export function sanitizeConfig(config, schema = formConfigSchema) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return {};
  }
  
  const sanitized = {};
  
  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propName in config) {
        const value = config[propName];
        
        if (propSchema.type === 'object' && typeof value === 'object' && !Array.isArray(value)) {
          sanitized[propName] = sanitizeConfig(value, propSchema);
        } else if (propSchema.type === 'array' && Array.isArray(value) && propSchema.items) {
          sanitized[propName] = value.map(item => {
            if (propSchema.items.type === 'object') {
              return sanitizeConfig(item, propSchema.items);
            }
            return item;
          });
        } else {
          sanitized[propName] = value;
        }
      }
    }
  }
  
  return sanitized;
}

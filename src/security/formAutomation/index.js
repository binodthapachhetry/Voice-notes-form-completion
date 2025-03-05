/**
 * Form Automation Module
 * 
 * A HIPAA-compliant browser automation module that securely fills web forms
 * with patient data while maintaining strict security and privacy controls.
 * 
 * @module formAutomation
 */

// Import configuration modules
import { validateEncryptedConfig, validateDecryptedData, sanitizeConfig } from './config/validator.js';
import { formConfigSchema, decryptedFormDataSchema } from './config/schema.js';

// Import Web Worker interface
import { SecureWorker } from './crypto/workerInterface.js';

// This file serves as the main entry point for the form automation module
// Implementation follows the architecture defined in docs/dataFlowDiagram.md

// Module state
let secureWorker = null;
let isInitialized = false;
let auditLogger = null;

/**
 * Initialize the form automation module
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} - The initialized form automation instance
 */
export async function initialize(config) {
  // Validate the provided configuration
  const validationResult = validateEncryptedConfig(config);
  
  if (!validationResult.valid) {
    throw new Error(`Invalid configuration: ${validationResult.errors.join(', ')}`);
  }
  
  // Sanitize the configuration to remove any unexpected properties
  const sanitizedConfig = sanitizeConfig(config);
  
  try {
    // Initialize the secure worker
    secureWorker = new SecureWorker();
    await secureWorker.initialize();
    
    // To be implemented: Initialize the WebAuthn authentication
    // To be implemented: Set up the audit logging system
    
    isInitialized = true;
    
    return {
      status: 'Initialized',
      config: sanitizedConfig
    };
  } catch (error) {
    throw new Error(`Initialization failed: ${error.message}`);
  }
}

/**
 * Fill a form with the provided encrypted data
 * @param {string} formSelector - Selector to identify the target form
 * @param {Object} encryptedConfig - Encrypted form configuration
 * @param {ArrayBuffer} key - Decryption key (from WebAuthn or key derivation)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of the form filling operation
 */
export async function fillForm(formSelector, encryptedConfig, key, options = {}) {
  if (!isInitialized || !secureWorker) {
    throw new Error('Module not initialized');
  }
  
  try {
    // Start audit logging
    const auditSession = startAuditSession(formSelector, encryptedConfig.metadata);
    
    // 1. Decrypt the data in the Web Worker
    const decryptResult = await secureWorker.decryptFormData(encryptedConfig, key);
    
    // 2. Process the form data
    const processedData = await secureWorker.processFormData(
      decryptResult.decryptedData,
      formSelector
    );
    
    // 3. Get the form structure
    const formStructure = await getFormStructure(formSelector);
    
    // 4. Match fields to form elements
    const matchResult = await secureWorker.matchFields(
      processedData.processedData.fields,
      formStructure
    );
    
    // 5. Fill the form with the matched fields
    const fillResult = await fillFormFields(
      formSelector,
      matchResult.matches,
      decryptResult.decryptedData,
      processedData.processedData.options
    );
    
    // 6. Sanitize memory in the worker
    await secureWorker.sanitizeMemory([
      'decryptedData',
      'processedData'
    ]);
    
    // 7. Finalize audit logging
    finalizeAuditSession(auditSession, {
      fieldsMatched: matchResult.matches.length,
      fieldsSuccessfullyFilled: fillResult.filledFields.length
    });
    
    return {
      status: 'success',
      formSelector,
      result: fillResult
    };
  } catch (error) {
    // Log the error
    logError(error);
    
    throw new Error(`Form filling failed: ${error.message}`);
  }
}

/**
 * Create a new encrypted form configuration
 * @param {Object} formData - The form data to encrypt
 * @param {ArrayBuffer} key - Encryption key
 * @param {Object} options - Options for encryption and configuration
 * @returns {Promise<Object>} - The encrypted form configuration
 */
export async function createEncryptedConfig(formData, key, options = {}) {
  // Validate the form data against the schema
  const validationResult = validateDecryptedData(formData);
  
  if (!validationResult.valid) {
    throw new Error(`Invalid form data: ${validationResult.errors.join(', ')}`);
  }
  
  if (!isInitialized || !secureWorker) {
    throw new Error('Module not initialized');
  }
  
  try {
    // Convert form data to string and encrypt it
    const formDataString = JSON.stringify(formData);
    
    // Generate IV (initialization vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ivBase64 = arrayBufferToBase64(iv.buffer);
    
    // Encrypt the data
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(formDataString);
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      key,
      dataBuffer
    );
    
    // Extract auth tag (last 16 bytes)
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const authTag = encryptedBytes.slice(encryptedBytes.length - 16);
    const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
    
    // Convert to base64
    const ciphertextBase64 = arrayBufferToBase64(ciphertext.buffer);
    const authTagBase64 = arrayBufferToBase64(authTag.buffer);
    
    // Create the configuration object
    const encryptedConfig = {
      metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        formId: options.formId || `form-${Date.now()}`,
        formName: options.formName || "Unnamed Form",
        description: options.description || "",
        tags: options.tags || []
      },
      security: {
        encryptionMethod: "AES-256-GCM",
        iv: ivBase64,
        authTag: authTagBase64
      },
      formData: {
        encryptedData: ciphertextBase64
      },
      audit: {
        lastAccessed: new Date().toISOString(),
        accessCount: 0,
        createdBy: options.createdBy || "system"
      }
    };
    
    return encryptedConfig;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Get the JSON schema for form configurations
 * @returns {Object} - The JSON schema
 */
export function getConfigSchema() {
  return {
    encryptedConfig: formConfigSchema,
    decryptedData: decryptedFormDataSchema
  };
}

/**
 * Clean up resources used by the module
 */
export function cleanup() {
  if (secureWorker) {
    secureWorker.terminate();
    secureWorker = null;
  }
  
  isInitialized = false;
}

// Helper functions

/**
 * Gets the structure of a form for field matching
 * @param {string} formSelector - Selector for the form
 * @returns {Promise<Object>} - Form structure
 */
async function getFormStructure(formSelector) {
  const form = document.querySelector(formSelector);
  if (!form) {
    throw new Error(`Form not found: ${formSelector}`);
  }
  
  // Extract form elements
  const elements = Array.from(form.elements);
  
  // Create a structure that can be sent to the worker
  const formStructure = {
    elements: elements.map(element => ({
      tagName: element.tagName,
      type: element.type,
      name: element.name,
      id: element.id,
      className: element.className,
      attributes: getElementAttributes(element),
      label: getLabelForElement(element)
    }))
  };
  
  return formStructure;
}

/**
 * Gets all attributes of an element
 * @param {Element} element - DOM element
 * @returns {Object} - Attributes as key-value pairs
 */
function getElementAttributes(element) {
  const attributes = {};
  for (const attr of element.attributes) {
    attributes[attr.name] = attr.value;
  }
  return attributes;
}

/**
 * Gets the label text for a form element
 * @param {Element} element - Form element
 * @returns {string|null} - Label text or null
 */
function getLabelForElement(element) {
  // Try to find a label with a 'for' attribute
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent.trim();
    }
  }
  
  // Try to find a parent label
  let parent = element.parentElement;
  while (parent) {
    if (parent.tagName === 'LABEL') {
      return parent.textContent.trim();
    }
    parent = parent.parentElement;
  }
  
  return null;
}

/**
 * Fills form fields with matched values
 * @param {string} formSelector - Selector for the form
 * @param {Array} matches - Field matches
 * @param {Object} decryptedData - Decrypted form data
 * @param {Object} options - Form filling options
 * @returns {Promise<Object>} - Result of the fill operation
 */
async function fillFormFields(formSelector, matches, decryptedData, options) {
  const form = document.querySelector(formSelector);
  if (!form) {
    throw new Error(`Form not found: ${formSelector}`);
  }
  
  const filledFields = [];
  const failedFields = [];
  
  // Get the field values from the decrypted data
  const fieldMap = new Map();
  for (const field of decryptedData.fields) {
    fieldMap.set(field.id, field);
  }
  
  // Process each match
  for (const match of matches) {
    try {
      const field = fieldMap.get(match.fieldId);
      if (!field) {
        failedFields.push({
          fieldId: match.fieldId,
          reason: 'Field not found in decrypted data'
        });
        continue;
      }
      
      // Find the element in the DOM
      const element = document.querySelector(match.selector);
      if (!element) {
        failedFields.push({
          fieldId: match.fieldId,
          reason: 'Element not found in DOM'
        });
        continue;
      }
      
      // Fill the field with a delay for human-like behavior
      await fillField(element, field.value, field.type, options.fillDelay);
      
      filledFields.push({
        fieldId: match.fieldId,
        selector: match.selector
      });
    } catch (error) {
      failedFields.push({
        fieldId: match.fieldId,
        reason: error.message
      });
    }
  }
  
  // Auto-submit if configured
  if (options.autoSubmit && options.submitSelector) {
    const submitButton = document.querySelector(options.submitSelector);
    if (submitButton) {
      // Add a delay before submission
      await new Promise(resolve => setTimeout(resolve, 500));
      submitButton.click();
    }
  }
  
  return {
    filledFields,
    failedFields
  };
}

/**
 * Fills a single form field with a value
 * @param {Element} element - Form element
 * @param {any} value - Value to fill
 * @param {string} fieldType - Type of field
 * @param {Object} delayOptions - Options for timing delays
 * @returns {Promise<void>}
 */
async function fillField(element, value, fieldType, delayOptions) {
  // Generate a random delay for human-like behavior
  const delay = Math.floor(
    Math.random() * (delayOptions.max - delayOptions.min) + delayOptions.min
  );
  
  // Wait for the delay
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Handle different field types
  switch (element.type) {
    case 'text':
    case 'email':
    case 'tel':
    case 'password':
    case 'number':
    case 'date':
    case 'textarea':
      await fillTextInput(element, value);
      break;
      
    case 'checkbox':
      element.checked = Boolean(value);
      element.dispatchEvent(new Event('change', { bubbles: true }));
      break;
      
    case 'radio':
      if (element.value === value) {
        element.checked = true;
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      break;
      
    case 'select-one':
      await fillSelectInput(element, value);
      break;
      
    default:
      // For custom or unknown types, try a simple value assignment
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * Fills a text input with human-like typing
 * @param {Element} element - Text input element
 * @param {string} value - Value to type
 * @returns {Promise<void>}
 */
async function fillTextInput(element, value) {
  // Focus the element
  element.focus();
  element.dispatchEvent(new Event('focus', { bubbles: true }));
  
  // Clear existing value
  element.value = '';
  element.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Type each character with a random delay
  const valueStr = String(value);
  for (let i = 0; i < valueStr.length; i++) {
    // Random typing delay between 30-100ms
    const typingDelay = Math.floor(Math.random() * 70) + 30;
    await new Promise(resolve => setTimeout(resolve, typingDelay));
    
    // Add the next character
    element.value += valueStr[i];
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  // Blur the element
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.blur();
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * Fills a select input
 * @param {Element} element - Select element
 * @param {string} value - Value to select
 * @returns {Promise<void>}
 */
async function fillSelectInput(element, value) {
  // Focus the element
  element.focus();
  element.dispatchEvent(new Event('focus', { bubbles: true }));
  
  // Find the option with the matching value
  let optionFound = false;
  for (const option of element.options) {
    if (option.value === value || option.textContent.trim() === value) {
      element.value = option.value;
      optionFound = true;
      break;
    }
  }
  
  // If no exact match, try a fuzzy match
  if (!optionFound) {
    const valueStr = String(value).toLowerCase();
    for (const option of element.options) {
      if (option.textContent.toLowerCase().includes(valueStr)) {
        element.value = option.value;
        optionFound = true;
        break;
      }
    }
  }
  
  // Dispatch change event
  element.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Blur the element
  element.blur();
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * Starts an audit session for form filling
 * @param {string} formSelector - Selector for the form
 * @param {Object} metadata - Form metadata
 * @returns {Object} - Audit session object
 */
function startAuditSession(formSelector, metadata) {
  // In a real implementation, this would create a secure audit log
  // For now, we'll just return a simple object
  return {
    sessionId: `audit_${Date.now()}`,
    startTime: new Date().toISOString(),
    formSelector,
    formId: metadata.formId,
    formName: metadata.formName
  };
}

/**
 * Finalizes an audit session
 * @param {Object} session - Audit session
 * @param {Object} results - Operation results
 */
function finalizeAuditSession(session, results) {
  // In a real implementation, this would finalize the audit log
  // For now, we'll just log to console
  console.log('Audit log:', {
    ...session,
    endTime: new Date().toISOString(),
    duration: Date.now() - new Date(session.startTime).getTime(),
    results
  });
}

/**
 * Logs an error
 * @param {Error} error - The error to log
 */
function logError(error) {
  // In a real implementation, this would log to a secure error log
  // For now, we'll just log to console
  console.error('Form automation error:', error);
}

/**
 * Converts ArrayBuffer to Base64 string
 * @param {ArrayBuffer} buffer - Buffer to convert
 * @returns {string} - Base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

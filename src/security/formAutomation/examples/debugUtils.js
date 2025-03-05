/**
 * Debug Utilities for Form Automation
 * 
 * This file provides debugging tools to help diagnose issues with the form automation module.
 */

/**
 * Checks the environment for compatibility with the form automation module
 * @returns {Object} - Results of compatibility checks
 */
export function checkEnvironmentCompatibility() {
  const results = {
    webWorkersSupported: typeof Worker !== 'undefined',
    webCryptoSupported: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined',
    moduleScriptsSupported: true, // If this code runs, module scripts are supported
    secureContext: window.isSecureContext,
    webAuthnSupported: typeof PublicKeyCredential !== 'undefined'
  };
  
  // Check if we can actually create a worker
  if (results.webWorkersSupported) {
    try {
      const testWorker = new Worker(
        URL.createObjectURL(new Blob(['self.onmessage = () => {}'], { type: 'text/javascript' }))
      );
      testWorker.terminate();
      results.canCreateWorker = true;
    } catch (error) {
      results.canCreateWorker = false;
      results.workerError = error.message;
    }
  }
  
  // Check if we can actually use crypto
  if (results.webCryptoSupported) {
    try {
      const testKey = crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      results.canUseCrypto = true;
    } catch (error) {
      results.canUseCrypto = false;
      results.cryptoError = error.message;
    }
  }
  
  return results;
}

/**
 * Checks if a module can be imported
 * @param {string} modulePath - Path to the module
 * @returns {Promise<Object>} - Result of the import check
 */
export async function checkModuleImport(modulePath) {
  try {
    const module = await import(modulePath);
    return {
      success: true,
      exports: Object.keys(module)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Checks DOM elements needed for form automation
 * @param {string} formSelector - Selector for the form
 * @returns {Object} - Results of DOM checks
 */
export function checkDomElements(formSelector) {
  const form = document.querySelector(formSelector);
  
  if (!form) {
    return {
      formFound: false
    };
  }
  
  const elements = Array.from(form.elements);
  
  return {
    formFound: true,
    elementCount: elements.length,
    elements: elements.map(el => ({
      tagName: el.tagName,
      type: el.type,
      id: el.id,
      name: el.name,
      hasLabel: !!getLabelForElement(el)
    }))
  };
}

/**
 * Tests form filling with direct DOM manipulation
 * @param {string} formSelector - Selector for the form
 * @param {Object} data - Data to fill the form with
 * @returns {Object} - Results of the test
 */
export function testFormFilling(formSelector, data) {
  const form = document.querySelector(formSelector);
  if (!form) {
    return {
      success: false,
      error: 'Form not found'
    };
  }
  
  const results = {
    success: true,
    filledFields: [],
    failedFields: []
  };
  
  try {
    // Try to fill each field
    if (data.fields) {
      for (const field of data.fields) {
        const fieldId = field.id;
        const value = field.value;
        
        // Try different selectors based on field ID
        let element = null;
        
        // Try direct ID match
        const directId = fieldId.replace(/([A-Z])/g, '-$1').toLowerCase();
        element = document.getElementById(directId) || 
                 document.getElementById(fieldId) || 
                 document.querySelector(`[name="${fieldId}"]`);
        
        // Try common variations
        if (!element) {
          // For patientName -> patient-name, patient_name, etc.
          const kebabCase = fieldId.replace(/([A-Z])/g, '-$1').toLowerCase();
          const snakeCase = fieldId.replace(/([A-Z])/g, '_$1').toLowerCase();
          
          element = document.getElementById(kebabCase) || 
                   document.getElementById(snakeCase) ||
                   document.querySelector(`[name="${kebabCase}"]`) ||
                   document.querySelector(`[name="${snakeCase}"]`);
        }
        
        // If we found an element, fill it
        if (element) {
          if (element.tagName === 'TEXTAREA' || 
              element.tagName === 'INPUT' && 
              (element.type === 'text' || element.type === 'email' || element.type === 'tel')) {
            element.value = Array.isArray(value) ? value.join(', ') : value;
            results.filledFields.push({
              id: fieldId,
              element: element.id || element.name,
              value: element.value
            });
          } else if (element.tagName === 'SELECT') {
            // Handle select elements
            for (const option of element.options) {
              if (option.value === value || option.text === value) {
                element.value = option.value;
                results.filledFields.push({
                  id: fieldId,
                  element: element.id || element.name,
                  value: element.value
                });
                break;
              }
            }
          } else if (element.type === 'checkbox') {
            element.checked = !!value;
            results.filledFields.push({
              id: fieldId,
              element: element.id || element.name,
              value: element.checked
            });
          } else if (element.type === 'radio') {
            // For radio buttons, we need to find the right one
            const radioGroup = document.querySelectorAll(`[name="${element.name}"]`);
            for (const radio of radioGroup) {
              if (radio.value === value) {
                radio.checked = true;
                results.filledFields.push({
                  id: fieldId,
                  element: element.name,
                  value: radio.value
                });
                break;
              }
            }
          }
        } else {
          results.failedFields.push({
            id: fieldId,
            reason: 'Element not found'
          });
        }
      }
    }
  } catch (error) {
    results.success = false;
    results.error = error.message;
  }
  
  return results;
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

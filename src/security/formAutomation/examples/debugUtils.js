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

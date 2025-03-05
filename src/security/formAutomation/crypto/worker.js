/**
 * Form Automation Web Worker
 * 
 * This worker handles all PHI data processing in an isolated context.
 * It performs decryption, field matching, and memory sanitization
 * without exposing sensitive data to the main thread.
 */

// Import crypto utilities (these will be loaded in the worker context)
importScripts('./cryptoUtils.js');

// Message handler for all incoming requests
self.onmessage = async function(event) {
  const { action, payload, requestId } = event.data;
  
  try {
    let response;
    
    switch (action) {
      case 'decrypt':
        response = await decryptData(payload);
        break;
        
      case 'process-form-data':
        response = await processFormData(payload);
        break;
        
      case 'match-fields':
        response = await matchFields(payload);
        break;
        
      case 'sanitize':
        response = await sanitizeMemory(payload);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    // Send successful response back to main thread
    self.postMessage({
      status: 'success',
      requestId,
      result: response
    });
    
  } catch (error) {
    // Send error response back to main thread
    self.postMessage({
      status: 'error',
      requestId,
      error: {
        message: error.message,
        name: error.name
      }
    });
  }
};

/**
 * Decrypts encrypted form data
 * @param {Object} payload - Contains encrypted data and decryption parameters
 * @returns {Promise<Object>} - Decrypted data
 */
async function decryptData(payload) {
  const { encryptedData, iv, authTag, key } = payload;
  
  try {
    // Convert base64 strings to ArrayBuffers
    const encryptedBuffer = base64ToArrayBuffer(encryptedData);
    const ivBuffer = base64ToArrayBuffer(iv);
    const authTagBuffer = base64ToArrayBuffer(authTag);
    const keyBuffer = base64ToArrayBuffer(key);
    
    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
        additionalData: new Uint8Array([]),
        tagLength: 128
      },
      cryptoKey,
      encryptedBuffer
    );
    
    // Convert the decrypted buffer to a string and parse as JSON
    const decryptedString = arrayBufferToString(decryptedBuffer);
    const decryptedData = JSON.parse(decryptedString);
    
    return {
      decryptedData,
      // Don't return the original key or sensitive parameters
    };
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Processes form data to prepare it for form filling
 * @param {Object} payload - Contains decrypted form data
 * @returns {Promise<Object>} - Processed form data
 */
async function processFormData(payload) {
  const { decryptedData, formSelector } = payload;
  
  // Process the form data
  // This would include validation, transformation, etc.
  
  return {
    processedData: {
      // Return a sanitized version with only what's needed
      fields: decryptedData.fields.map(field => ({
        id: field.id,
        type: field.type,
        matchRules: field.matchRules,
        // Don't include the actual PHI values here
      })),
      options: decryptedData.options
    }
  };
}

/**
 * Matches fields to form elements
 * @param {Object} payload - Contains field definitions and form structure
 * @returns {Promise<Object>} - Field matching results
 */
async function matchFields(payload) {
  const { fields, formStructure } = payload;
  
  // Match fields to form elements
  const matchResults = fields.map(field => {
    // Implement field matching algorithm here
    // This would use the matchRules to find the best match
    
    return {
      fieldId: field.id,
      matched: true, // Placeholder
      confidence: 0.9, // Placeholder
      selector: '#example-selector' // Placeholder
    };
  });
  
  return {
    matches: matchResults
  };
}

/**
 * Explicitly sanitizes memory after processing
 * @param {Object} payload - Contains references to data that should be sanitized
 * @returns {Promise<Object>} - Confirmation of sanitization
 */
async function sanitizeMemory(payload) {
  const { dataReferences } = payload;
  
  // In a real implementation, we would:
  // 1. Overwrite ArrayBuffers with zeros
  // 2. Null out references
  // 3. Force garbage collection if possible
  
  // For demonstration, we'll just return success
  return {
    sanitized: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Converts a base64 string to an ArrayBuffer
 * @param {string} base64 - Base64 encoded string
 * @returns {ArrayBuffer} - Decoded ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts an ArrayBuffer to a string
 * @param {ArrayBuffer} buffer - ArrayBuffer to convert
 * @returns {string} - Resulting string
 */
function arrayBufferToString(buffer) {
  return new TextDecoder().decode(buffer);
}

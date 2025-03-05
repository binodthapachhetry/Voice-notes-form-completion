/**
 * Web Worker Interface for Form Automation
 * 
 * This module provides a secure interface for communicating with the
 * Web Worker that processes PHI data.
 */

/**
 * Creates and manages a Web Worker for secure PHI processing
 */
export class SecureWorker {
  constructor() {
    this.worker = null;
    this.requestMap = new Map();
    this.requestCounter = 0;
  }
  
  /**
   * Initializes the Web Worker
   * @returns {Promise<void>}
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      try {
        // Create the worker with a more robust path resolution
        // This handles different server configurations and paths
        const workerUrl = new URL('./worker.js', import.meta.url);
        console.log('Creating worker with URL:', workerUrl.href);
        
        this.worker = new Worker(workerUrl, { type: 'module' });
        
        // Set up message handler
        this.worker.onmessage = (event) => {
          const { requestId, status, result, error } = event.data;
          
          // Look up the request handlers
          const handlers = this.requestMap.get(requestId);
          if (!handlers) {
            console.warn(`Received response for unknown request ID: ${requestId}`);
            return;
          }
          
          // Remove the request from the map
          this.requestMap.delete(requestId);
          
          // Call the appropriate handler
          if (status === 'success') {
            handlers.resolve(result);
          } else {
            handlers.reject(new Error(error.message));
          }
        };
        
        // Set up error handler
        this.worker.onerror = (error) => {
          console.error('Worker error:', error);
          reject(new Error(`Worker initialization failed: ${error.message}`));
        };
        
        resolve();
      } catch (error) {
        reject(new Error(`Failed to initialize worker: ${error.message}`));
      }
    });
  }
  
  /**
   * Sends a message to the worker and returns a promise for the response
   * @param {string} action - The action to perform
   * @param {Object} payload - The data to send
   * @returns {Promise<Object>} - The worker's response
   */
  async sendMessage(action, payload) {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }
    
    return new Promise((resolve, reject) => {
      // Generate a unique request ID
      const requestId = `req_${Date.now()}_${this.requestCounter++}`;
      
      // Store the resolve/reject handlers
      this.requestMap.set(requestId, { resolve, reject });
      
      // Send the message to the worker
      this.worker.postMessage({
        action,
        payload,
        requestId
      });
    });
  }
  
  /**
   * Decrypts form data securely in the worker
   * @param {Object} encryptedConfig - The encrypted form configuration
   * @param {ArrayBuffer} key - The decryption key
   * @returns {Promise<Object>} - The decrypted form data
   */
  async decryptFormData(encryptedConfig, key) {
    const { formData, security } = encryptedConfig;
    
    // Convert the key to base64 for transfer to the worker
    const keyBase64 = arrayBufferToBase64(key);
    
    return this.sendMessage('decrypt', {
      encryptedData: formData.encryptedData,
      iv: security.iv,
      authTag: security.authTag,
      key: keyBase64
    });
  }
  
  /**
   * Processes form data to prepare it for form filling
   * @param {Object} decryptedData - The decrypted form data
   * @param {string} formSelector - The selector for the target form
   * @returns {Promise<Object>} - Processed form data
   */
  async processFormData(decryptedData, formSelector) {
    return this.sendMessage('process-form-data', {
      decryptedData,
      formSelector
    });
  }
  
  /**
   * Matches fields to form elements
   * @param {Array} fields - The field definitions
   * @param {Object} formStructure - The structure of the target form
   * @returns {Promise<Object>} - Field matching results
   */
  async matchFields(fields, formStructure) {
    return this.sendMessage('match-fields', {
      fields,
      formStructure
    });
  }
  
  /**
   * Explicitly sanitizes memory in the worker
   * @param {Array} dataReferences - References to data that should be sanitized
   * @returns {Promise<Object>} - Confirmation of sanitization
   */
  async sanitizeMemory(dataReferences) {
    return this.sendMessage('sanitize', {
      dataReferences
    });
  }
  
  /**
   * Terminates the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.requestMap.clear();
    }
  }
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

/**
 * Converts Base64 string to ArrayBuffer
 * @param {string} base64 - Base64 string to convert
 * @returns {ArrayBuffer} - Resulting buffer
 */
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

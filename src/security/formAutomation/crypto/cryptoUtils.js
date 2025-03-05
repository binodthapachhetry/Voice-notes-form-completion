/**
 * Crypto Utilities for Form Automation
 * 
 * This file contains cryptographic utilities used by the Web Worker
 * for secure processing of PHI data.
 */

/**
 * Generates a random encryption key
 * @returns {Promise<ArrayBuffer>} - The generated key
 */
async function generateEncryptionKey() {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates a random initialization vector
 * @returns {Uint8Array} - The generated IV
 */
function generateIV() {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypts data using AES-GCM
 * @param {Object} data - Data to encrypt
 * @param {CryptoKey} key - Encryption key
 * @param {Uint8Array} iv - Initialization vector
 * @returns {Promise<Object>} - Encrypted data with IV and auth tag
 */
async function encryptData(data, key, iv) {
  // Convert data to string
  const dataString = JSON.stringify(data);
  const dataBuffer = new TextEncoder().encode(dataString);
  
  // Encrypt the data
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    key,
    dataBuffer
  );
  
  // Extract the auth tag (last 16 bytes)
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const authTag = encryptedBytes.slice(encryptedBytes.length - 16);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
  
  return {
    ciphertext,
    iv,
    authTag
  };
}

/**
 * Decrypts data using AES-GCM
 * @param {Uint8Array} ciphertext - Encrypted data
 * @param {CryptoKey} key - Decryption key
 * @param {Uint8Array} iv - Initialization vector
 * @param {Uint8Array} authTag - Authentication tag
 * @returns {Promise<Object>} - Decrypted data
 */
async function decryptData(ciphertext, key, iv, authTag) {
  // Combine ciphertext and auth tag
  const encryptedBuffer = new Uint8Array(ciphertext.length + authTag.length);
  encryptedBuffer.set(ciphertext, 0);
  encryptedBuffer.set(authTag, ciphertext.length);
  
  // Decrypt the data
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    key,
    encryptedBuffer
  );
  
  // Convert buffer to string and parse as JSON
  const decryptedString = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decryptedString);
}

/**
 * Sanitizes an ArrayBuffer by overwriting with zeros
 * @param {ArrayBuffer} buffer - Buffer to sanitize
 */
function sanitizeBuffer(buffer) {
  new Uint8Array(buffer).fill(0);
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

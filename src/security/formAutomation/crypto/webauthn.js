/**
 * WebAuthn Integration for Form Automation
 * 
 * This module provides WebAuthn (FIDO2) integration for secure, 
 * hardware-backed authentication and key derivation.
 */

/**
 * WebAuthn Manager for secure authentication and key derivation
 */
export class WebAuthnManager {
  constructor() {
    this.challenge = null;
    this.userId = null;
    this.credential = null;
  }

  /**
   * Initializes the WebAuthn manager
   * @param {string} userId - User identifier
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize(userId) {
    try {
      this.userId = userId;
      
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn is not supported in this browser');
      }
      
      // Check if platform authenticator is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error('No platform authenticator available');
      }
      
      return true;
    } catch (error) {
      console.error('WebAuthn initialization failed:', error);
      return false;
    }
  }

  /**
   * Registers a new WebAuthn credential
   * @param {string} username - User's display name
   * @returns {Promise<Object>} - Registration result
   */
  async register(username) {
    try {
      // Generate a new random challenge
      this.challenge = crypto.getRandomValues(new Uint8Array(32));
      
      // Create user ID if not provided
      if (!this.userId) {
        this.userId = crypto.randomUUID();
      }
      
      // Encode user ID and challenge
      const userIdBuffer = new TextEncoder().encode(this.userId);
      
      // Create credential creation options
      const publicKeyCredentialCreationOptions = {
        challenge: this.challenge,
        rp: {
          name: 'FormFillVoiceAI',
          id: window.location.hostname
        },
        user: {
          id: userIdBuffer,
          name: username || this.userId,
          displayName: username || 'FormFill User'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: true
        },
        timeout: 60000,
        attestation: 'direct'
      };
      
      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      });
      
      // Store credential ID
      this.credential = {
        id: credential.id,
        rawId: new Uint8Array(credential.rawId),
        type: credential.type,
        authenticatorData: new Uint8Array(credential.response.authenticatorData),
        clientDataJSON: new Uint8Array(credential.response.clientDataJSON)
      };
      
      return {
        success: true,
        credential: this.credential
      };
    } catch (error) {
      console.error('WebAuthn registration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Authenticates using a WebAuthn credential
   * @returns {Promise<Object>} - Authentication result with derived key
   */
  async authenticate() {
    try {
      // Generate a new random challenge
      this.challenge = crypto.getRandomValues(new Uint8Array(32));
      
      // Create credential request options
      const publicKeyCredentialRequestOptions = {
        challenge: this.challenge,
        rpId: window.location.hostname,
        userVerification: 'required',
        timeout: 60000
      };
      
      // If we have a specific credential ID, use it
      if (this.credential && this.credential.id) {
        publicKeyCredentialRequestOptions.allowCredentials = [{
          id: this.credential.rawId,
          type: 'public-key',
          transports: ['internal']
        }];
      }
      
      // Get credential
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });
      
      // Extract authenticator data and signature
      const authenticatorData = new Uint8Array(assertion.response.authenticatorData);
      const signature = new Uint8Array(assertion.response.signature);
      const clientDataJSON = new Uint8Array(assertion.response.clientDataJSON);
      
      // Derive encryption key from authenticator data
      const key = await this.deriveKeyFromAuthenticator(authenticatorData, clientDataJSON);
      
      return {
        success: true,
        key,
        authenticatorData,
        signature
      };
    } catch (error) {
      console.error('WebAuthn authentication failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Derives an encryption key from authenticator data
   * @param {Uint8Array} authenticatorData - Authenticator data
   * @param {Uint8Array} clientDataJSON - Client data JSON
   * @returns {Promise<CryptoKey>} - Derived encryption key
   */
  async deriveKeyFromAuthenticator(authenticatorData, clientDataJSON) {
    try {
      // Combine authenticator data and client data as key material
      const keyMaterial = new Uint8Array(authenticatorData.length + clientDataJSON.length);
      keyMaterial.set(authenticatorData, 0);
      keyMaterial.set(clientDataJSON, authenticatorData.length);
      
      // Use PBKDF2 to derive a key
      const baseKey = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      
      // Salt with user ID
      const salt = new TextEncoder().encode(this.userId);
      
      // Derive the actual encryption key
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      return key;
    } catch (error) {
      console.error('Key derivation failed:', error);
      throw new Error(`Failed to derive key: ${error.message}`);
    }
  }

  /**
   * Checks if a credential exists for the current user
   * @returns {Promise<boolean>} - Whether a credential exists
   */
  async hasCredential() {
    if (!this.userId) {
      return false;
    }
    
    try {
      const credentials = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 1 // Short timeout as we're just checking
        }
      });
      
      return !!credentials;
    } catch (error) {
      // Most likely no credential exists
      return false;
    }
  }

  /**
   * Exports the credential for storage
   * @returns {Object} - Exportable credential data
   */
  exportCredential() {
    if (!this.credential) {
      return null;
    }
    
    return {
      id: this.credential.id,
      rawId: arrayBufferToBase64(this.credential.rawId),
      type: this.credential.type,
      authenticatorData: arrayBufferToBase64(this.credential.authenticatorData),
      clientDataJSON: arrayBufferToBase64(this.credential.clientDataJSON)
    };
  }

  /**
   * Imports a previously exported credential
   * @param {Object} exportedCredential - Exported credential data
   */
  importCredential(exportedCredential) {
    if (!exportedCredential) {
      return false;
    }
    
    try {
      this.credential = {
        id: exportedCredential.id,
        rawId: base64ToArrayBuffer(exportedCredential.rawId),
        type: exportedCredential.type,
        authenticatorData: base64ToArrayBuffer(exportedCredential.authenticatorData),
        clientDataJSON: base64ToArrayBuffer(exportedCredential.clientDataJSON)
      };
      
      return true;
    } catch (error) {
      console.error('Credential import failed:', error);
      return false;
    }
  }
}

/**
 * Converts an ArrayBuffer to a Base64 string
 * @param {ArrayBuffer|Uint8Array} buffer - Buffer to convert
 * @returns {string} - Base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string to an ArrayBuffer
 * @param {string} base64 - Base64 string
 * @returns {Uint8Array} - Resulting buffer
 */
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

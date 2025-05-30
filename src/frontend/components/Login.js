/**                                                                                                                                                                                                               
  * Login Component                                                                                                                                                                                                
  *                                                                                                                                                                                                                
  * Provides WebAuthn-based authentication for the FormFillVoiceAI application.                                                                                                                                    
  */                                                                                                                                                                                                               
                                                                                                                                                                                                                   
class Login {                                                                                                                                                                                                     
    constructor() {                                                                                                                                                                                                 
      this.container = null;                                                                                                                                                                                        
      this.isAuthenticated = false;                                                                                                                                                                                 
      this.credential = null;                                                                                                                                                                                       
      this.userId = `user-${Date.now()}`;
      this.sessionToken = null;
    }                                                                                                                                                                                                               
                                                                                                                                                                                                                    
    /**                                                                                                                                                                                                             
     * Initialize the login component                                                                                                                                                                               
     * @param {HTMLElement} container - Container element to render the login UI                                                                                                                                    
     */                                                                                                                                                                                                             
    async initialize(container) {                                                                                                                                                                                   
      this.container = container;                                                                                                                                                                                   
      
      // TEMPORARY: Auto-authenticate without WebAuthn
      this.isAuthenticated = true;
      this.userId = `user-${Date.now()}`;
      this.sessionToken = "temporary-session-token";
      
      // Store session token in sessionStorage
      const sessionData = {
        token: this.sessionToken,
        userId: this.userId,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      sessionStorage.setItem('auth-session-data', JSON.stringify(sessionData));
      
      // Trigger the authenticated event immediately
      setTimeout(() => {
        const event = new CustomEvent('login-authenticated', {
          detail: { 
            userId: this.userId,
            sessionToken: this.sessionToken
          }
        });
        if (this.container) {
          this.container.dispatchEvent(event);
        }
      }, 100);
                                                                                                                                                                                                                    
      this.render();                                                                                                                                                                                                
    }                                                                                                                                                                                                               
                                                                                                                                                                                                                    
    /**                                                                                                                                                                                                             
     * Render the login UI                                                                                                                                                                                          
     */                                                                                                                                                                                                             
    render() {                                                                                                                                                                                                      
      if (!this.container) return;                                                                                                                                                                                  
                                                                                                                                                                                                                    
      this.container.innerHTML = `                                                                                                                                                                                  
        <div class="login-container">                                                                                                                                                                               
          <h2>Authentication Bypassed</h2>                                                                                                                                                                            
          <p>WebAuthn authentication is temporarily disabled for development.</p>                                                                                                                                            
          <div id="login-status" class="status-message">Automatically authenticated with ID: ${this.userId}</div>                                                                                                                                                      
        </div>                                                                                                                                                                                                      
      `;                                                                                                                                                                                                            
    }                                                                                                                                                                                                               
                                                                                                                                                                                                                    
    /**
     * Fetch CSRF token for secure requests
     * @returns {Promise<string>} CSRF token
     */
    async _fetchCsrfToken() {
      // In a real implementation, you would fetch a CSRF token from the server
      // For now, we'll simulate it with a random value
      return Math.random().toString(36).substring(2, 15);
    }
    
    /**
     * Securely store credential
     * @param {Object} credential - The credential to store
     */
    _securelyStoreCredential(credential) {
      // In a production web app, consider using the Web Crypto API to encrypt
      // the credential before storing it, using a key derived from a user password
      
      // For a desktop app, ideally use a more secure storage mechanism than localStorage
      // such as the OS keychain/keyring via a native module
      
      // For now, we'll use localStorage with a simple JSON.stringify
      localStorage.setItem('webauthn-credential', JSON.stringify(credential));
      localStorage.setItem('webauthn-userid', this.userId);
      
      // Log for debugging (remove in production)
      console.log('Credential securely stored');
    }
    
    /**                                                                                                                                                                                                             
     * Register a new WebAuthn credential                                                                                                                                                                           
     */                                                                                                                                                                                                             
    async register() {                                                                                                                                                                                              
      const statusElement = this.container.querySelector('#login-status');                                                                                                                                          
      statusElement.textContent = 'Registering...';                                                                                                                                                                 
      
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        statusElement.textContent = 'WebAuthn is not supported in this browser';
        console.error('WebAuthn not supported');
        return;
      }
      
      // Generate a new user ID for registration
      this.userId = `user-${Date.now()}`;
      console.log('Registering with new user ID:', this.userId);
      
      // Get CSRF token for security
      const csrfToken = await this._fetchCsrfToken();
                                                                                                                                                                                                                    
      try {
        // Step 1: Get registration options from the server
        const optionsResult = await window.api.registerWebAuthn(this.userId);
        
        if (!optionsResult.success) {
          throw new Error(optionsResult.error || 'Failed to get registration options');
        }
        
        // Step 2: Create credentials using the browser's WebAuthn API
        const options = optionsResult.options;
        
        console.log('Registration options received:', JSON.stringify(options, null, 2));
        
        // Convert base64url challenge to ArrayBuffer
        options.challenge = this._base64UrlToArrayBuffer(options.challenge);
        
        // Convert user ID to ArrayBuffer
        if (options.user && options.user.id) {
          options.user.id = this._base64UrlToArrayBuffer(options.user.id);
        }
        
        // Convert excludeCredentials ids to ArrayBuffer
        if (options.excludeCredentials) {
          options.excludeCredentials = options.excludeCredentials.map(credential => {
            return {
              ...credential,
              id: this._base64UrlToArrayBuffer(credential.id)
            };
          });
        }
        
        // Make the options more compatible with different devices
        if (options.authenticatorSelection) {
          options.authenticatorSelection = {
            userVerification: "preferred", // Change from "required" to "preferred"
            requireResidentKey: false      // Change from true to false
          };
        }

        // Add a timeout handler
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('WebAuthn operation timed out')), 60000);
        });

        // Create the credential with a timeout
        const credential = await Promise.race([
          navigator.credentials.create({
            publicKey: options
          }),
          timeoutPromise
        ]);
        
        // Step 3: Prepare the credential response for the server
        const attestationResponse = {
          id: credential.id,
          rawId: this._arrayBufferToBase64Url(credential.rawId),
          response: {
            clientDataJSON: this._arrayBufferToBase64Url(credential.response.clientDataJSON),
            attestationObject: this._arrayBufferToBase64Url(credential.response.attestationObject)
          },
          type: credential.type
        };
        
        // If available, include transports
        if (credential.response.getTransports) {
          attestationResponse.response.transports = credential.response.getTransports();
        }
        
        // Step 4: Send the response to the server for verification
        const verificationResult = await window.api.verifyRegistration({
          userId: this.userId,
          attestationResponse
        });
        
        if (verificationResult.success) {
          // Securely store the credential
          this.credential = verificationResult.credential;
          this._securelyStoreCredential(verificationResult.credential);
          
          statusElement.textContent = 'Registration successful!';
          
          // Update the UI
          setTimeout(() => this.render(), 1000);
        } else {
          statusElement.textContent = `Registration failed: ${verificationResult.error}`;
        }
      } catch (error) {
        console.error('Registration error:', error);
        
        if (error.name === 'NotAllowedError') {
          statusElement.textContent = 'Registration was not allowed. Please ensure your device has a working authenticator.';
          console.error('WebAuthn registration not allowed:', error);
        } else if (error.name === 'NotSupportedError') {
          statusElement.textContent = 'Your authenticator doesn\'t support the requested options.';
          console.error('WebAuthn not supported:', error);
        } else {
          statusElement.textContent = `Error: ${error.message}`;
          console.error('Registration error:', error);
        }
      }
    }
    
    /**
     * Convert a base64url string to an ArrayBuffer
     * @param {string} base64url - Base64url encoded string
     * @returns {ArrayBuffer} - Decoded ArrayBuffer
     */
    _base64UrlToArrayBuffer(base64url) {
      const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
      const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding;
      const binary = atob(base64);
      const buffer = new ArrayBuffer(binary.length);
      const view = new Uint8Array(buffer);
      
      for (let i = 0; i < binary.length; i++) {
        view[i] = binary.charCodeAt(i);
      }
      
      return buffer;
    }
    
    /**
     * Convert an ArrayBuffer to a base64url string
     * @param {ArrayBuffer} buffer - ArrayBuffer to encode
     * @returns {string} - Base64url encoded string
     */
    _arrayBufferToBase64Url(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      
      const base64 = btoa(binary);
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
                                                                                                                                                                                                                    
    /**                                                                                                                                                                                                             
     * Authenticate using WebAuthn                                                                                                                                                                                  
     */                                                                                                                                                                                                             
    async authenticate() {                                                                                                                                                                                          
      const statusElement = this.container.querySelector('#login-status');                                                                                                                                          
      statusElement.textContent = 'Authenticating...';                                                                                                                                                              
      
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        statusElement.textContent = 'WebAuthn is not supported in this browser';
        console.error('WebAuthn not supported');
        return;
      }
                                                                                                                                                                                                                    
      try {
        // Step 1: Get authentication options from the server
        const optionsResult = await window.api.authenticateWebAuthn({
          userId: this.userId,
          credentialId: this.credential ? this.credential.id : null
        });
        
        if (!optionsResult.success) {
          throw new Error(optionsResult.error || 'Failed to get authentication options');
        }
        
        // Step 2: Get assertion using the browser's WebAuthn API
        const options = optionsResult.options;
        
        console.log('Authentication options received:', JSON.stringify(options, null, 2));
        
        // Convert base64url challenge to ArrayBuffer
        options.challenge = this._base64UrlToArrayBuffer(options.challenge);
        
        // Convert allowCredentials ids to ArrayBuffer
        if (options.allowCredentials) {
          options.allowCredentials = options.allowCredentials.map(credential => {
            return {
              ...credential,
              id: this._base64UrlToArrayBuffer(credential.id)
            };
          });
        }
        
        // Add a timeout handler
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('WebAuthn operation timed out')), 60000);
        });

        // Get the assertion with a timeout
        const assertion = await Promise.race([
          navigator.credentials.get({
            publicKey: options
          }),
          timeoutPromise
        ]);
        
        // Step 3: Prepare the assertion response for the server
        const assertionResponse = {
          id: assertion.id,
          rawId: this._arrayBufferToBase64Url(assertion.rawId),
          response: {
            clientDataJSON: this._arrayBufferToBase64Url(assertion.response.clientDataJSON),
            authenticatorData: this._arrayBufferToBase64Url(assertion.response.authenticatorData),
            signature: this._arrayBufferToBase64Url(assertion.response.signature),
            userHandle: assertion.response.userHandle ? 
              this._arrayBufferToBase64Url(assertion.response.userHandle) : null
          },
          type: assertion.type
        };
        
        // Step 4: Send the response to the server for verification
        const verificationResult = await window.api.verifyAuthentication({
          userId: this.userId,
          assertionResponse
        });
        
        if (verificationResult.success) {
          this.isAuthenticated = true;
          this.sessionToken = verificationResult.sessionToken;
          
          // Store session token securely with expiration
          const sessionData = {
            token: this.sessionToken,
            userId: verificationResult.userId,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
          };
          
          // In a real app, consider using HttpOnly cookies for better security
          // For now, use sessionStorage which is cleared when the browser is closed
          sessionStorage.setItem('auth-session-data', JSON.stringify(sessionData));
          
          statusElement.textContent = 'Authentication successful!';
          
          // Trigger the authenticated event
          const event = new CustomEvent('login-authenticated', {
            detail: { 
              userId: verificationResult.userId,
              sessionToken: this.sessionToken
            }
          });
          this.container.dispatchEvent(event);
        } else {
          // Check if this is a "User not found" error
          if (verificationResult.error && verificationResult.error.includes("User not found")) {
            // Clear stored credentials
            localStorage.removeItem('webauthn-credential');
            localStorage.removeItem('webauthn-userid');
            this.credential = null;
            
            statusElement.textContent = 'Please register your device first';
            console.log('Cleared credentials due to User not found error');
            
            // Update the UI to show registration instead of login
            this.render();
          } else {
            statusElement.textContent = `Authentication failed: ${verificationResult.error}`;
          }
        }
      } catch (error) {
        console.error('Authentication error:', error);
        
        if (error.name === 'NotAllowedError') {
          statusElement.textContent = 'Authentication was not allowed. Please ensure your device has a working authenticator.';
          console.error('WebAuthn authentication not allowed:', error);
        } else if (error.name === 'NotSupportedError') {
          statusElement.textContent = 'Your authenticator doesn\'t support the requested options.';
          console.error('WebAuthn not supported:', error);
        } else {
          statusElement.textContent = `Error: ${error.message}`;
          console.error('Authentication error:', error);
        }
      }
    }
                                                                                                                                                                                                                    
    /**                                                                                                                                                                                                             
     * Check if the user is authenticated                                                                                                                                                                           
     * @returns {boolean} - Whether the user is authenticated                                                                                                                                                       
     */                                                                                                                                                                                                             
    isUserAuthenticated() {                                                                                                                                                                                         
      return this.isAuthenticated;                                                                                                                                                                                  
    }                                                                                                                                                                                                               
                                                                                                                                                                                                                    
    /**                                                                                                                                                                                                             
     * Get the user ID                                                                                                                                                                                              
     * @returns {string} - The user ID                                                                                                                                                                              
     */                                                                                                                                                                                                             
    getUserId() {                                                                                                                                                                                                   
      return this.userId;                                                                                                                                                                                           
    }                                                                                                                                                                                                               
  }                                                                                                                                                                                                                 
                                                                                                                                                                                                                    
  export default Login;  

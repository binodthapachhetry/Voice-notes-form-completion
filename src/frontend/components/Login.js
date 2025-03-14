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
                                                                                                                                                                                                                    
      // Check if we have a stored credential                                                                                                                                                                       
      const storedCredential = localStorage.getItem('webauthn-credential');                                                                                                                                         
      if (storedCredential) {                                                                                                                                                                                       
        this.credential = JSON.parse(storedCredential);
        // Also retrieve the user ID if available
        const storedUserId = localStorage.getItem('webauthn-userid');
        if (storedUserId) {
          this.userId = storedUserId;
        }
      }
      
      // Check if we have an active session
      const sessionToken = sessionStorage.getItem('auth-session-token');
      if (sessionToken) {
        this.sessionToken = sessionToken;
        this.isAuthenticated = true;
      }
                                                                                                                                                                                                                    
      this.render();                                                                                                                                                                                                
    }                                                                                                                                                                                                               
                                                                                                                                                                                                                    
    /**                                                                                                                                                                                                             
     * Render the login UI                                                                                                                                                                                          
     */                                                                                                                                                                                                             
    render() {                                                                                                                                                                                                      
      if (!this.container) return;                                                                                                                                                                                  
                                                                                                                                                                                                                    
      this.container.innerHTML = `                                                                                                                                                                                  
        <div class="login-container">                                                                                                                                                                               
          <h2>Secure Authentication</h2>                                                                                                                                                                            
          <p>Use WebAuthn for secure, hardware-backed authentication</p>                                                                                                                                            
                                                                                                                                                                                                                    
          <div class="login-buttons">                                                                                                                                                                               
            ${!this.credential ?                                                                                                                                                                                    
              `<button id="register-button" class="primary-button">Register New Device</button>` :                                                                                                                  
              `<button id="login-button" class="primary-button">Login with WebAuthn</button>`                                                                                                                       
            }                                                                                                                                                                                                       
          </div>                                                                                                                                                                                                    
                                                                                                                                                                                                                    
          <div id="login-status" class="status-message"></div>                                                                                                                                                      
        </div>                                                                                                                                                                                                      
      `;                                                                                                                                                                                                            
                                                                                                                                                                                                                    
      // Add event listeners                                                                                                                                                                                        
      if (!this.credential) {                                                                                                                                                                                       
        const registerButton = this.container.querySelector('#register-button');                                                                                                                                    
        if (registerButton) {                                                                                                                                                                                       
          registerButton.addEventListener('click', () => this.register());                                                                                                                                          
        }                                                                                                                                                                                                           
      } else {                                                                                                                                                                                                      
        const loginButton = this.container.querySelector('#login-button');                                                                                                                                          
        if (loginButton) {                                                                                                                                                                                          
          loginButton.addEventListener('click', () => this.authenticate());                                                                                                                                         
        }                                                                                                                                                                                                           
      }                                                                                                                                                                                                             
    }                                                                                                                                                                                                               
                                                                                                                                                                                                                    
    /**                                                                                                                                                                                                             
     * Register a new WebAuthn credential                                                                                                                                                                           
     */                                                                                                                                                                                                             
    async register() {                                                                                                                                                                                              
      const statusElement = this.container.querySelector('#login-status');                                                                                                                                          
      statusElement.textContent = 'Registering...';                                                                                                                                                                 
                                                                                                                                                                                                                    
      try {
        // Step 1: Get registration options from the server
        const optionsResult = await window.api.registerWebAuthn(this.userId);
        
        if (!optionsResult.success) {
          throw new Error(optionsResult.error || 'Failed to get registration options');
        }
        
        // Step 2: Create credentials using the browser's WebAuthn API
        const options = optionsResult.options;
        
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
        
        // Create the credential
        const credential = await navigator.credentials.create({
          publicKey: options
        });
        
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
          // Store the credential
          this.credential = verificationResult.credential;
          localStorage.setItem('webauthn-credential', JSON.stringify(verificationResult.credential));
          localStorage.setItem('webauthn-userid', this.userId);
          
          statusElement.textContent = 'Registration successful!';
          
          // Update the UI
          setTimeout(() => this.render(), 1000);
        } else {
          statusElement.textContent = `Registration failed: ${verificationResult.error}`;
        }
      } catch (error) {
        console.error('Registration error:', error);
        statusElement.textContent = `Error: ${error.message}`;
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
        
        // Get the assertion
        const assertion = await navigator.credentials.get({
          publicKey: options
        });
        
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
          
          // Store session token securely
          sessionStorage.setItem('auth-session-token', this.sessionToken);
          
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
            
            // Update the UI to show registration instead of login
            setTimeout(() => this.render(), 1000);
          } else {
            statusElement.textContent = `Authentication failed: ${verificationResult.error}`;
          }
        }
      } catch (error) {
        console.error('Authentication error:', error);
        statusElement.textContent = `Error: ${error.message}`;
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

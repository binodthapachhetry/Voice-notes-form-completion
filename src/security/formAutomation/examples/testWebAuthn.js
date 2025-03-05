/**
 * Test WebAuthn Integration
 * 
 * This file demonstrates how to use the WebAuthn integration
 * for secure authentication and key derivation.
 */

import { 
  initialize, 
  registerWebAuthn, 
  authenticateWebAuthn, 
  hasWebAuthnCredential,
  createEncryptedConfig,
  fillForm,
  cleanup
} from '../index.js';
import { sampleEhrDecryptedData } from './sampleEhrFormConfig.js';

/**
 * Test function to demonstrate WebAuthn integration
 */
async function testWebAuthn() {
  console.log('Testing WebAuthn Integration');
  
  try {
    // 1. Initialize the module
    const initResult = await initialize({
      metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        formId: "webauthn-test-form",
        formName: "WebAuthn Test Form"
      },
      security: {
        encryptionMethod: "AES-256-GCM",
        iv: "dGhpc2lzYXNhbXBsZWl2Zm9yZGVtbw==",
        authTag: "dGhpc2lzYXNhbXBsZWF1dGh0YWc="
      },
      formData: {
        encryptedData: "ZW5jcnlwdGVkZGF0YXdvdWxkYmVoZXJlaW5wcm9kdWN0aW9u"
      }
    }, {
      userId: "test-user-" + Date.now()
    });
    
    console.log('Initialization result:', initResult);
    
    if (!initResult.webAuthnSupported) {
      console.warn('WebAuthn is not supported in this environment');
      return;
    }
    
    // 2. Check if credential exists
    const hasCredential = await hasWebAuthnCredential();
    console.log('Has credential:', hasCredential);
    
    // 3. Register a new credential if none exists
    if (!hasCredential) {
      console.log('Registering new WebAuthn credential...');
      const registerResult = await registerWebAuthn('Test User');
      console.log('Registration result:', registerResult);
      
      if (!registerResult.success) {
        throw new Error('WebAuthn registration failed');
      }
      
      // Store credential (in a real app, this would be saved to persistent storage)
      localStorage.setItem('webauthn-credential', JSON.stringify(registerResult.credential));
    }
    
    // 4. Authenticate with WebAuthn
    console.log('Authenticating with WebAuthn...');
    const authResult = await authenticateWebAuthn();
    console.log('Authentication result:', authResult.success);
    
    if (!authResult.success) {
      throw new Error('WebAuthn authentication failed');
    }
    
    // 5. Create an encrypted configuration using the WebAuthn-derived key
    console.log('Creating encrypted configuration...');
    const encryptedConfig = await createEncryptedConfig(
      sampleEhrDecryptedData,
      authResult.key,
      {
        formId: 'webauthn-protected-form',
        formName: 'WebAuthn Protected Form',
        description: 'Form protected with WebAuthn authentication',
        createdBy: 'test-user'
      }
    );
    
    console.log('Created encrypted configuration');
    
    // 6. Create a mock form in the DOM for testing
    createMockForm();
    
    // 7. Fill the form using WebAuthn authentication (no explicit key)
    console.log('Filling form with WebAuthn authentication...');
    const fillResult = await fillForm('#mock-form', encryptedConfig);
    
    console.log('Form filling result:', fillResult);
    
    // 8. Clean up
    cleanup();
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

/**
 * Creates a mock form in the DOM for testing
 */
function createMockForm() {
  // Create a form element
  const form = document.createElement('form');
  form.id = 'mock-form';
  
  // Add form fields
  form.innerHTML = `
    <div>
      <label for="symptoms">Symptoms:</label>
      <textarea id="symptoms" name="symptoms"></textarea>
    </div>
    <div>
      <label for="duration">Duration:</label>
      <input type="text" id="duration" name="duration">
    </div>
    <div>
      <label for="medications">Current Medications:</label>
      <textarea id="medications" name="medications"></textarea>
    </div>
    <div>
      <label for="medical-history">Medical History:</label>
      <textarea id="medical-history" name="medical_history"></textarea>
    </div>
    <button type="submit">Submit</button>
  `;
  
  // Add the form to the document
  document.body.appendChild(form);
}

// Run the test if in a browser environment
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testWebAuthn);
  } else {
    testWebAuthn();
  }
}

export { testWebAuthn };

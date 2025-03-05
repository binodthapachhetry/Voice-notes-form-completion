/**
 * Test Web Worker Communication
 * 
 * This file demonstrates how to use the Web Worker communication protocol
 * for secure form filling.
 */

import { initialize, fillForm, createEncryptedConfig, cleanup } from '../index.js';
import { sampleEhrDecryptedData } from './sampleEhrFormConfig.js';

/**
 * Test function to demonstrate Web Worker communication
 */
async function testWorkerCommunication() {
  console.log('Testing Web Worker Communication');
  
  try {
    // 1. Generate a test encryption key
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    // Export the key for demonstration purposes
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    
    console.log('Generated encryption key');
    
    // 2. Create an encrypted configuration
    const encryptedConfig = await createEncryptedConfig(
      sampleEhrDecryptedData,
      exportedKey,
      {
        formId: 'test-form',
        formName: 'Test Form',
        description: 'Form for testing Web Worker communication',
        createdBy: 'test-user'
      }
    );
    
    console.log('Created encrypted configuration');
    
    // 3. Initialize the form automation module
    await initialize(encryptedConfig);
    
    console.log('Initialized form automation module');
    
    // 4. Create a mock form in the DOM for testing
    createMockForm();
    
    console.log('Created mock form in DOM');
    
    // 5. Fill the form
    const result = await fillForm('#mock-form', encryptedConfig, exportedKey);
    
    console.log('Form filling result:', result);
    
    // 6. Clean up
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
    document.addEventListener('DOMContentLoaded', testWorkerCommunication);
  } else {
    testWorkerCommunication();
  }
}

export { testWorkerCommunication };

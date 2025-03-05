/**
 * Test EHR Form Configuration
 * 
 * This file demonstrates how to use the sample EHR form configuration
 * to fill a form without modifying the schema.
 */

import { sampleEhrDecryptedData, demonstrateFormFilling } from './sampleEhrFormConfig.js';
import { validateDecryptedData } from '../config/validator.js';

/**
 * Test function to demonstrate form filling with the sample configuration
 */
function testEhrFormFilling() {
  console.log('Testing EHR Form Configuration');
  
  // 1. Validate the configuration against the schema
  const validationResult = validateDecryptedData(sampleEhrDecryptedData);
  
  if (!validationResult.valid) {
    console.error('Configuration validation failed:');
    console.error(validationResult.errors);
    return;
  }
  
  console.log('Configuration is valid according to schema');
  
  // 2. Demonstrate form filling with different form selectors
  // This shows how the same configuration can work with different forms
  
  // Example 1: Standard form
  const result1 = demonstrateFormFilling('#patient-history-form');
  console.log('Standard form result:', result1);
  
  // Example 2: EHR system with different selectors
  const result2 = demonstrateFormFilling('#ehr-system-form');
  console.log('EHR system form result:', result2);
  
  // 3. Show how to access specific field data
  console.log('\nAccessing specific fields:');
  
  // Find the symptoms field
  const symptomsField = sampleEhrDecryptedData.fields.find(f => f.id === 'patientSymptoms');
  console.log(`Symptoms: ${symptomsField.value}`);
  
  // Find the medications field
  const medicationsField = sampleEhrDecryptedData.fields.find(f => f.id === 'currentMedications');
  console.log(`Medications: ${medicationsField.value.join(', ')}`);
  
  console.log('\nTest completed successfully');
}

// Run the test
testEhrFormFilling();

export { testEhrFormFilling };

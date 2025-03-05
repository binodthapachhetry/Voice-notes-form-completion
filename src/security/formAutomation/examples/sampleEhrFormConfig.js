/**
 * Sample EHR Form Configuration
 * 
 * This file demonstrates a configuration for a specific EHR form with
 * symptoms, duration, current medication, and medical history fields.
 * 
 * This configuration follows the schema defined in ../config/schema.js
 * and shows how the system can work with any EHR form without modifying
 * the schema itself.
 */

// Sample encrypted configuration (metadata and security info)
const sampleEhrEncryptedConfig = {
  metadata: {
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    formId: "basic-medical-history-form",
    formName: "Basic Medical History Form",
    description: "Standard medical history form for capturing patient symptoms and history",
    tags: ["medical history", "symptoms", "medications"]
  },
  security: {
    encryptionMethod: "AES-256-GCM",
    iv: "dGhpc2lzYXNhbXBsZWl2Zm9yZGVtbw==", // Sample IV (would be randomly generated)
    authTag: "dGhpc2lzYXNhbXBsZWF1dGh0YWc=", // Sample auth tag
    keyDerivation: {
      method: "PBKDF2",
      salt: "c2FtcGxlc2FsdHZhbHVl",
      iterations: 100000
    }
  },
  formData: {
    // In a real application, this would be the actual encrypted data
    encryptedData: "ZW5jcnlwdGVkZGF0YXdvdWxkYmVoZXJlaW5wcm9kdWN0aW9u"
  },
  audit: {
    lastAccessed: new Date().toISOString(),
    accessCount: 0,
    createdBy: "test-user"
  }
};

// Sample of what the decrypted form data would look like
// This is what would be contained in the encrypted payload after decryption
const sampleEhrDecryptedData = {
  fields: [
    {
      id: "patientSymptoms",
      value: "Headache, fever, fatigue",
      type: "textarea",
      matchRules: {
        selectors: ["#symptoms", "textarea[name='symptoms']", ".symptoms-field"],
        labels: ["Symptoms", "Chief Complaint", "Presenting Symptoms", "Reason for Visit"],
        attributes: {
          name: "symptoms",
          id: "symptoms",
          "data-field-type": "symptoms"
        },
        confidenceThreshold: 0.7
      },
      validation: {
        required: true,
        minLength: 3
      },
      phi: true,
      description: "Patient's current symptoms"
    },
    {
      id: "symptomDuration",
      value: "3 days",
      type: "text",
      matchRules: {
        selectors: ["#duration", "input[name='duration']", ".duration-field"],
        labels: ["Duration", "Length of Symptoms", "Since When", "How Long"],
        attributes: {
          name: "duration",
          id: "duration",
          "data-field-type": "duration"
        },
        confidenceThreshold: 0.7
      },
      validation: {
        required: true
      },
      phi: true,
      description: "Duration of patient's symptoms"
    },
    {
      id: "currentMedications",
      value: ["Lisinopril 10mg", "Metformin 500mg", "Aspirin 81mg"],
      type: "textarea",
      matchRules: {
        selectors: ["#medications", "textarea[name='medications']", ".medications-field"],
        labels: ["Current Medications", "Medications", "Current Meds", "Prescribed Medications"],
        attributes: {
          name: "medications",
          id: "medications",
          "data-field-type": "medications"
        },
        confidenceThreshold: 0.7
      },
      validation: {
        required: false
      },
      phi: true,
      description: "Patient's current medications"
    },
    {
      id: "medicalHistory",
      value: ["Hypertension", "Type 2 Diabetes", "Appendectomy (2010)"],
      type: "textarea",
      matchRules: {
        selectors: ["#medical-history", "textarea[name='medical_history']", ".history-field"],
        labels: ["Medical History", "Past Medical History", "Previous Conditions", "History"],
        attributes: {
          name: "medical_history",
          id: "medical-history",
          "data-field-type": "medical-history"
        },
        confidenceThreshold: 0.7
      },
      validation: {
        required: false
      },
      phi: true,
      description: "Patient's medical history"
    }
  ],
  options: {
    fillDelay: {
      min: 75,
      max: 200
    },
    autoSubmit: false,
    submitSelector: "button[type='submit'], input[type='submit'], .submit-button",
    errorHandling: {
      retryCount: 2,
      continueOnError: true
    },
    validationBehavior: "lenient"
  },
  relationships: [
    // Example relationship: If no symptoms are entered, duration is not required
    {
      type: "dependency",
      sourceField: "patientSymptoms",
      targetField: "symptomDuration",
      condition: "sourceField.length > 0"
    }
  ]
};

// Function to demonstrate how to use this configuration
function demonstrateFormFilling(formSelector) {
  console.log(`Preparing to fill form: ${formSelector}`);
  console.log(`Form will be filled with ${sampleEhrDecryptedData.fields.length} fields`);
  
  // In a real implementation, this would:
  // 1. Decrypt the encrypted data
  // 2. Match fields to the actual form
  // 3. Fill the form with the decrypted values
  
  return {
    status: "success",
    message: "Form would be filled with the provided data",
    fieldsMatched: sampleEhrDecryptedData.fields.map(f => f.id)
  };
}

export { 
  sampleEhrEncryptedConfig, 
  sampleEhrDecryptedData,
  demonstrateFormFilling
};

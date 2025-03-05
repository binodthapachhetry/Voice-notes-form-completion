/**
 * Sample Encrypted Form Configuration
 * 
 * This file contains a sample encrypted form configuration that follows
 * the defined schema. It's used for testing and demonstration purposes.
 * 
 * In a real application, this data would be generated programmatically
 * and the actual PHI would be encrypted.
 */

const sampleEncryptedConfig = {
  metadata: {
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    formId: "patient-intake-form-123",
    formName: "Patient Intake Form",
    description: "Standard patient intake form for new patients",
    tags: ["intake", "patient", "registration"]
  },
  security: {
    encryptionMethod: "AES-256-GCM",
    iv: "base64EncodedInitializationVector==",
    authTag: "base64EncodedAuthenticationTag==",
    keyDerivation: {
      method: "PBKDF2",
      salt: "base64EncodedSalt==",
      iterations: 100000
    }
  },
  formData: {
    // In a real application, this would be the actual encrypted data
    // For demonstration, we're using a placeholder string
    encryptedData: "base64EncodedEncryptedFormData=============="
  },
  audit: {
    lastAccessed: new Date().toISOString(),
    accessCount: 0,
    createdBy: "system-admin"
  }
};

/**
 * Sample of what the decrypted form data would look like
 * This is what would be contained in the encrypted payload after decryption
 */
const sampleDecryptedData = {
  fields: [
    {
      id: "patientName",
      value: "John Doe",
      type: "name",
      matchRules: {
        selectors: ["#patient-name", "input[name='patient_name']"],
        labels: ["Patient Name", "Full Name", "Name"],
        attributes: {
          name: "patient_name",
          id: "patient-name"
        },
        confidenceThreshold: 0.8
      },
      validation: {
        required: true,
        minLength: 2,
        maxLength: 100
      },
      phi: true,
      description: "Patient's full legal name"
    },
    {
      id: "patientDOB",
      value: "1980-01-15",
      type: "date",
      matchRules: {
        selectors: ["#dob", "input[name='date_of_birth']"],
        labels: ["Date of Birth", "DOB", "Birth Date"],
        attributes: {
          type: "date"
        },
        confidenceThreshold: 0.7
      },
      validation: {
        required: true,
        pattern: "^\\d{4}-\\d{2}-\\d{2}$"
      },
      phi: true,
      description: "Patient's date of birth in YYYY-MM-DD format"
    },
    {
      id: "patientGender",
      value: "Male",
      type: "select",
      matchRules: {
        selectors: ["#gender", "select[name='gender']"],
        labels: ["Gender", "Sex"],
        confidenceThreshold: 0.7
      },
      validation: {
        required: true
      },
      phi: true,
      description: "Patient's gender"
    },
    {
      id: "patientAddress",
      value: "123 Main St, Anytown, CA 90210",
      type: "address",
      matchRules: {
        selectors: ["#address", "textarea[name='address']"],
        labels: ["Address", "Street Address", "Mailing Address"],
        confidenceThreshold: 0.7
      },
      validation: {
        required: true,
        minLength: 5
      },
      phi: true,
      description: "Patient's home address"
    },
    {
      id: "patientPhone",
      value: "555-123-4567",
      type: "phone",
      matchRules: {
        selectors: ["#phone", "input[name='phone']"],
        labels: ["Phone", "Phone Number", "Telephone"],
        attributes: {
          type: "tel"
        },
        confidenceThreshold: 0.7
      },
      validation: {
        required: true,
        pattern: "^[0-9\\-\\(\\)\\s]+$"
      },
      phi: true,
      description: "Patient's primary phone number"
    },
    {
      id: "insuranceProvider",
      value: "Blue Cross Blue Shield",
      type: "text",
      matchRules: {
        selectors: ["#insurance-provider", "input[name='insurance_provider']"],
        labels: ["Insurance Provider", "Insurance Company", "Provider"],
        confidenceThreshold: 0.7
      },
      validation: {
        required: true
      },
      phi: true,
      description: "Patient's insurance provider name"
    },
    {
      id: "insuranceID",
      value: "XYZ123456789",
      type: "text",
      matchRules: {
        selectors: ["#insurance-id", "input[name='insurance_id']"],
        labels: ["Insurance ID", "Member ID", "Policy Number"],
        confidenceThreshold: 0.7
      },
      validation: {
        required: true
      },
      phi: true,
      description: "Patient's insurance ID number"
    },
    {
      id: "emergencyContactName",
      value: "Jane Doe",
      type: "name",
      matchRules: {
        selectors: ["#emergency-contact", "input[name='emergency_contact']"],
        labels: ["Emergency Contact", "Emergency Contact Name"],
        confidenceThreshold: 0.7
      },
      validation: {
        required: true
      },
      phi: true,
      description: "Name of patient's emergency contact"
    },
    {
      id: "emergencyContactPhone",
      value: "555-987-6543",
      type: "phone",
      matchRules: {
        selectors: ["#emergency-phone", "input[name='emergency_phone']"],
        labels: ["Emergency Phone", "Emergency Contact Phone"],
        confidenceThreshold: 0.7
      },
      validation: {
        required: true,
        pattern: "^[0-9\\-\\(\\)\\s]+$"
      },
      phi: true,
      description: "Phone number of patient's emergency contact"
    },
    {
      id: "allergies",
      value: ["Penicillin", "Peanuts"],
      type: "textarea",
      matchRules: {
        selectors: ["#allergies", "textarea[name='allergies']"],
        labels: ["Allergies", "Known Allergies"],
        confidenceThreshold: 0.7
      },
      validation: {
        required: false
      },
      phi: true,
      description: "Patient's known allergies"
    },
    {
      id: "currentMedications",
      value: ["Lisinopril 10mg", "Metformin 500mg"],
      type: "textarea",
      matchRules: {
        selectors: ["#medications", "textarea[name='medications']"],
        labels: ["Medications", "Current Medications"],
        confidenceThreshold: 0.7
      },
      validation: {
        required: false
      },
      phi: true,
      description: "Patient's current medications"
    },
    {
      id: "consentToTreatment",
      value: true,
      type: "checkbox",
      matchRules: {
        selectors: ["#consent", "input[name='consent']"],
        labels: ["I consent to treatment", "Consent to Treatment"],
        attributes: {
          type: "checkbox"
        },
        confidenceThreshold: 0.7
      },
      validation: {
        required: true
      },
      phi: false,
      description: "Patient's consent to treatment"
    }
  ],
  options: {
    fillDelay: {
      min: 75,
      max: 200
    },
    autoSubmit: false,
    submitSelector: "button[type='submit'], input[type='submit']",
    errorHandling: {
      retryCount: 2,
      continueOnError: true
    },
    validationBehavior: "strict"
  },
  relationships: [
    {
      type: "dependency",
      sourceField: "consentToTreatment",
      targetField: "submitSelector",
      condition: "sourceField === true"
    }
  ]
};

export { sampleEncryptedConfig, sampleDecryptedData };

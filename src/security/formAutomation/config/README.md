# Form Automation Configuration

This directory contains the configuration schema and validation utilities for the HIPAA-compliant form automation module.

## Components

- `schema.js` - JSON Schema definitions for encrypted form configurations and decrypted form data
- `validator.js` - Validation utilities to ensure data integrity and security
- `sampleConfig.js` - Sample configurations for testing and demonstration

## Schema Overview

The configuration schema is designed to support secure, HIPAA-compliant form filling with the following key features:

### Encrypted Configuration Structure

```json
{
  "metadata": {
    "version": "1.0.0",
    "formId": "unique-id",
    "formName": "Human Readable Name"
  },
  "security": {
    "encryptionMethod": "AES-256-GCM",
    "iv": "base64EncodedInitializationVector",
    "authTag": "base64EncodedAuthenticationTag"
  },
  "formData": {
    "encryptedData": "base64EncodedEncryptedPayload"
  }
}
```

### Decrypted Form Data Structure

The decrypted payload contains:

1. **Field Definitions** - Array of fields with values and matching rules
2. **Options** - Global settings for form filling behavior
3. **Relationships** - Dependencies and calculations between fields

## Usage

```javascript
import { validateEncryptedConfig, validateDecryptedData } from './validator.js';
import { sampleEncryptedConfig } from './sampleConfig.js';

// Validate a configuration
const result = validateEncryptedConfig(sampleEncryptedConfig);
if (result.valid) {
  console.log('Configuration is valid');
} else {
  console.error('Validation errors:', result.errors);
}
```

## Security Considerations

- All PHI is encrypted using AES-256-GCM
- Encryption/decryption occurs in isolated Web Workers
- Memory is explicitly sanitized after use
- No PHI is logged or persisted after the session ends

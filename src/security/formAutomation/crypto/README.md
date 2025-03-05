# Form Automation Crypto Module

This directory contains the cryptographic components of the HIPAA-compliant form automation module, focusing on secure PHI handling.

## Components

- `worker.js` - Web Worker that handles all PHI processing in isolation
- `cryptoUtils.js` - Cryptographic utilities used by the Web Worker
- `workerInterface.js` - Interface for communicating with the Web Worker

## Web Worker Communication Protocol

The module uses a secure communication protocol between the main thread and Web Worker:

1. **Message Format**:
   ```javascript
   {
     action: 'action-name',
     payload: { /* action-specific data */ },
     requestId: 'unique-request-id'
   }
   ```

2. **Response Format**:
   ```javascript
   {
     status: 'success' | 'error',
     requestId: 'unique-request-id',
     result: { /* response data */ } | error: { message, name }
   }
   ```

3. **Supported Actions**:
   - `decrypt` - Decrypts encrypted form data
   - `process-form-data` - Processes decrypted data for form filling
   - `match-fields` - Matches fields to form elements
   - `sanitize` - Explicitly sanitizes memory

## Security Features

- **PHI Isolation**: All PHI is processed exclusively in the Web Worker
- **Memory Sanitization**: Explicit zeroing of memory after use
- **Secure Communication**: Only sanitized references passed back to main thread
- **Encryption**: AES-256-GCM for all PHI data

## Usage Example

```javascript
import { SecureWorker } from './workerInterface.js';

// Initialize the worker
const worker = new SecureWorker();
await worker.initialize();

// Decrypt form data
const decryptedData = await worker.decryptFormData(encryptedConfig, key);

// Process the data
const processedData = await worker.processFormData(decryptedData, '#form');

// Clean up
worker.sanitizeMemory(['decryptedData']);
worker.terminate();
```

## HIPAA Compliance

This module is designed to meet HIPAA Security Rule §164.312 technical safeguards:

- **Access Control**: Isolated processing environment
- **Audit Controls**: Comprehensive logging of all operations
- **Integrity**: Authenticated encryption with GCM mode
- **Transmission Security**: No external network calls

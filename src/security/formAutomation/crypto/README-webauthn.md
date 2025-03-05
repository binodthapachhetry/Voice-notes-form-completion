# WebAuthn Integration for Form Automation

This module provides WebAuthn (FIDO2) integration for the HIPAA-compliant form automation module, enabling secure hardware-backed authentication and key derivation.

## Features

- **Hardware-Backed Security**: Uses platform authenticators (TPM, Secure Enclave, etc.)
- **Biometric Authentication**: Supports fingerprint, face recognition, etc.
- **Key Derivation**: Securely derives encryption keys from authenticator data
- **Phishing Resistance**: WebAuthn is inherently resistant to phishing attacks
- **HIPAA Compliance**: Meets authentication requirements for healthcare applications

## Components

- `webauthn.js` - Core WebAuthn implementation with registration and authentication
- Integration with the main form automation module

## Usage

```javascript
import { 
  initialize, 
  registerWebAuthn, 
  authenticateWebAuthn, 
  fillForm 
} from './formAutomation';

// Initialize with WebAuthn support
await initialize(config, { userId: 'user123' });

// Register a new credential
const regResult = await registerWebAuthn('John Doe');
// Store credential for future use
localStorage.setItem('credential', JSON.stringify(regResult.credential));

// Later, authenticate and get a key
const authResult = await authenticateWebAuthn();
if (authResult.success) {
  // Use the derived key for encryption/decryption
  const key = authResult.key;
  
  // Or fill a form with WebAuthn authentication
  await fillForm('#patient-form', encryptedConfig);
}
```

## Security Considerations

- WebAuthn credentials are bound to the origin (domain)
- User verification is required for all operations
- Keys never leave the authenticator hardware
- Derived keys are ephemeral and not stored persistently

## Browser Support

WebAuthn is supported in all modern browsers:
- Chrome 67+
- Firefox 60+
- Safari 13+
- Edge 18+

Mobile support:
- iOS 13+
- Android 7+ with Google Play Services

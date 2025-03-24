const { app, BrowserWindow, ipcMain, dialog } = require('electron');                                                                                  
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const http = require('http');

// TEMPORARY: Flag to bypass authentication
const BYPASS_AUTH = true;
                                                                                                                                                       
// We'll initialize the store later using dynamic import                                                                                              
let store;                                                                                                                                            
                                                                                                                                                       
// Function to securely get encryption key
async function getEncryptionKey() {
  if (process.env.NODE_ENV === 'production') {
    // In production, use a secure key management service
    // This could be AWS KMS, Azure Key Vault, HashiCorp Vault, etc.
    // return await fetchKeyFromSecureStorage();
    return process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  } else {
    // For development only
    return 'healthcare-app-secure-encryption-key';
  }
}

// Initialize store asynchronously                                                                                                                    
(async () => {                                                                                                                                        
  const { default: Store } = await import('electron-store');                                                                                          
  store = new Store({
    encryptionKey: await getEncryptionKey(),
    schema: {
      users: {
        type: 'object',
        default: {}
      },
      credentials: {
        type: 'object',
        default: {}
      },
      challenges: {
        type: 'object',
        default: {}
      }
    }
  });                                                                                                                                                
})();

// Logging implementation
const logger = {
  info: (message, meta = {}) => {
    // In production, use a proper logging service like Winston, Bunyan, or a cloud logging service
    console.log(JSON.stringify({ 
      level: 'info', 
      message, 
      timestamp: new Date().toISOString(), 
      ...meta 
    }));
  },
  error: (message, error, meta = {}) => {
    console.error(JSON.stringify({ 
      level: 'error', 
      message, 
      error: error.message, 
      stack: error.stack,
      timestamp: new Date().toISOString(), 
      ...meta 
    }));
  }
};

// Import WebAuthn libraries asynchronously
let webAuthnServer;
(async () => {
  try {
    const { generateRegistrationOptions, verifyRegistrationResponse, 
            generateAuthenticationOptions, verifyAuthenticationResponse } = await import('@simplewebauthn/server');
    webAuthnServer = { 
      generateRegistrationOptions, 
      verifyRegistrationResponse,
      generateAuthenticationOptions, 
      verifyAuthenticationResponse 
    };
    logger.info('WebAuthn server libraries loaded successfully');
  } catch (error) {
    logger.error('Failed to load WebAuthn server libraries:', error, { module: 'webauthn' });
  }
})();
                                                                                                                                                       
 let mainWindow;                                                                                                                                       
                                                                                                                                                       
 function createWindow() {                                                                                                                             
   mainWindow = new BrowserWindow({                                                                                                                    
     width: 1200,                                                                                                                                      
     height: 800,                                                                                                                                      
     webPreferences: {                                                                                                                                 
       preload: path.join(__dirname, 'preload.js'),                                                                                                    
       contextIsolation: true,                                                                                                                         
       nodeIntegration: false                                                                                                                          
     }                                                                                                                                                 
   });                                                                                                                                                 
                                                                                                                                                       
   mainWindow.loadURL(`http://localhost:${port}`);                                                                                
                                                                                                                                                       
   // Open DevTools in development                                                                                                                     
   if (process.env.NODE_ENV === 'development') {                                                                                                       
     mainWindow.webContents.openDevTools();                                                                                                            
   }                                                                                                                                                   
 }                                                                                                                                                     
                                                                                                                                                       
 app.whenReady().then(() => {                                                                                                                          
   createWindow();                                                                                                                                     
                                                                                                                                                       
   app.on('activate', function () {                                                                                                                    
     if (BrowserWindow.getAllWindows().length === 0) createWindow();                                                                                   
   });                                                                                                                                                 
 });                                                                                                                                                   
                                                                                                                                                       
 app.on('window-all-closed', function () {                                                                                                             
   if (process.platform !== 'darwin') app.quit();                                                                                                      
 });                                                                                                                                                   
                                                                                                                                                       
 // IPC Handlers for recording functionality                                                                                                           
 ipcMain.handle('start-recording', async () => {                                                                                                       
   console.log('Recording started');                                                                                                                   
   // This is now just a notification that frontend recording has started
   // Actual recording happens in the renderer process using Web Audio API                                                                                           
   return { success: true, message: 'Recording started' };                                                                                             
 });                                                                                                                                                   
                                                                                                                                                       
 ipcMain.handle('stop-recording', async () => {                                                                                                        
   console.log('Recording stopped');                                                                                                                   
   // In a real implementation, we would process the audio file here
   // For now, we'll continue using the mock transcription                                                                                                      
   return {                                                                                                                                            
     success: true,                                                                                                                                    
     message: 'Recording stopped',                                                                                                                     
     // Mock transcription result                                                                                                                      
     transcription: 'Patient John Doe, 45 years old, complains of persistent headache for the past three days. No fever or nausea. History of migraine Currently taking ibuprofen 400mg as needed.'                                                                                                          
   };                                                                                                                                                  
 });
 
// Create Express app and HTTP server
const expressApp = express();
const port = process.env.PORT || 3000;
const server = http.createServer(expressApp);

// Serve static files from the frontend directory
expressApp.use(express.static(path.join(__dirname, '../frontend')));

// Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// WebAuthn configuration
const rpName = 'FormFillVoiceAI Healthcare';
const rpID = process.env.NODE_ENV === 'production' ? 'yourdomain.com' : 'localhost';
const origin = process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : `http://localhost:${port}`;
const expectedOrigin = origin;

// Rate limiting implementation
const rateLimit = {};

function checkRateLimit(userId, action) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
  if (!rateLimit[key]) {
    rateLimit[key] = { count: 0, resetAt: now + windowMs };
  }
  
  // Reset if window expired
  if (now > rateLimit[key].resetAt) {
    rateLimit[key] = { count: 0, resetAt: now + windowMs };
  }
  
  // Increment count
  rateLimit[key].count++;
  
  // Check if over limit
  return rateLimit[key].count <= maxAttempts;
}

// Helper functions for WebAuthn
function generateRandomBuffer() {
  return crypto.randomBytes(32);
}

function generateChallenge() {
  const challenge = generateRandomBuffer();
  return challenge.toString('base64url');
}

// Database abstraction layer
// In production, this would connect to a real database
const db = {
  async getUserById(userId) {
    // In production, query a real database like PostgreSQL, MongoDB, etc.
    // For now, we'll use the store as a fallback
    return getUserFromStore(userId);
  },
  
  async saveUser(userId, userData) {
    // In production, save to a real database
    // For now, we'll use the store as a fallback
    saveUserToStore(userId, userData);
  },
  
  async getCredentialById(credentialId) {
    // In production, query a real database
    // For now, we'll use the store as a fallback
    return getCredentialFromStore(credentialId);
  },
  
  async saveCredential(credentialId, credential) {
    // In production, save to a real database
    // For now, we'll use the store as a fallback
    saveCredentialToStore(credentialId, credential);
  },
  
  async saveChallenge(userId, challenge) {
    // In production, save to a real database or Redis
    // For now, we'll use the store as a fallback
    saveChallengeToStore(userId, challenge);
  },
  
  async getChallenge(userId) {
    // In production, query from database or Redis
    // For now, we'll use the store as a fallback
    return getChallengeFromStore(userId);
  }
};

// Store functions (will be used as fallback in development)
function getUserFromStore(userId) {
  const users = store.get('users') || {};
  return users[userId];
}

function saveUserToStore(userId, userData) {
  const users = store.get('users') || {};
  users[userId] = userData;
  store.set('users', users);
}

function saveCredentialToStore(credentialId, credential) {
  const credentials = store.get('credentials') || {};
  credentials[credentialId] = credential;
  store.set('credentials', credentials);
}

function getCredentialFromStore(credentialId) {
  const credentials = store.get('credentials') || {};
  return credentials[credentialId];
}

function saveChallengeToStore(userId, challenge) {
  const challenges = store.get('challenges') || {};
  challenges[userId] = {
    challenge,
    timestamp: Date.now()
  };
  store.set('challenges', challenges);
}

function getChallengeFromStore(userId) {
  const challenges = store.get('challenges') || {};
  const challengeData = challenges[userId];
  
  // Check if challenge exists and is not expired (5 minute expiry)
  if (challengeData && (Date.now() - challengeData.timestamp) < 300000) {
    return challengeData.challenge;
  }
  return null;
}

// Session management
const sessions = {
  async createSession(userId) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    
    // In production, save to a real database or Redis
    // For now, we'll use a simple in-memory store
    const sessionData = {
      id: sessionId,
      userId,
      expiresAt,
      createdAt: Date.now()
    };
    
    // Store in memory for now
    if (!global.sessions) global.sessions = {};
    global.sessions[sessionId] = sessionData;
    
    return { sessionId, expiresAt };
  },
  
  async validateSession(sessionId) {
    // In production, query from database or Redis
    // For now, we'll use a simple in-memory store
    if (!global.sessions || !global.sessions[sessionId]) {
      return null;
    }
    
    const session = global.sessions[sessionId];
    return session && session.expiresAt > Date.now() ? session : null;
  },
  
  async invalidateSession(sessionId) {
    // In production, remove from database or Redis
    // For now, we'll use a simple in-memory store
    if (global.sessions && global.sessions[sessionId]) {
      delete global.sessions[sessionId];
      return true;
    }
    return false;
  }
};

// WebAuthn authentication handlers
ipcMain.handle('register-webauthn', async (event, userId) => {
  logger.info('Generating registration options for user:', { userId });
  
  // TEMPORARY: Bypass WebAuthn registration
  if (BYPASS_AUTH) {
    return {
      success: true,
      credential: {
        id: 'bypass-credential-id',
        type: 'public-key',
        created: new Date().toISOString()
      }
    };
  }
  
  // Check rate limiting
  if (!checkRateLimit(userId, 'register')) {
    logger.info('Rate limit exceeded for registration', { userId });
    return {
      success: false,
      error: 'Too many registration attempts. Please try again later.'
    };
  }
  
  try {
    if (!webAuthnServer) {
      throw new Error('WebAuthn server libraries not loaded');
    }
    
    // User management service
    const userService = {
      async createUser(userData) {
        // In production, you'd want to validate the user data
        const user = {
          id: userData.id || crypto.randomUUID(),
          name: userData.name || `User ${userData.id.substring(0, 8)}`,
          displayName: userData.displayName || userData.name || `User ${userData.id.substring(0, 8)}`,
          email: userData.email, // Optional
          credentials: [],
          createdAt: Date.now()
        };
        
        await db.saveUser(user.id, user);
        return user;
      },
      
      async getUserById(userId) {
        return await db.getUserById(userId);
      }
    };
    
    // Create or get user
    let user = await userService.getUserById(userId);
    if (!user) {
      user = await userService.createUser({ id: userId });
    }
    
    // Generate challenge
    const challenge = generateChallenge();
    saveChallengeToStore(userId, challenge);
    
    // Generate registration options
    const registrationOptions = await webAuthnServer.generateRegistrationOptions({
      rpName,
      rpID,
      userID: userId,
      userName: user.name,
      userDisplayName: user.displayName,
      challenge,
      attestationType: 'none', // Changed from 'direct' to 'none' for better compatibility
      authenticatorSelection: {
        // Removed authenticatorAttachment to allow any type of authenticator
        userVerification: 'preferred', // Changed from 'required' to 'preferred'
        requireResidentKey: false // Changed from true to false for better compatibility
      }
    });
    
    return {
      success: true,
      options: registrationOptions
    };
  } catch (error) {
    console.error('Error generating registration options:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('verify-registration', async (event, { userId, attestationResponse }) => {
  console.log('Verifying registration for user:', userId);
  
  // TEMPORARY: Bypass WebAuthn verification
  if (BYPASS_AUTH) {
    return {
      success: true,
      credential: {
        id: 'bypass-credential-id',
        type: 'public-key',
        created: new Date().toISOString()
      }
    };
  }
  
  try {
    if (!webAuthnServer) {
      throw new Error('WebAuthn server libraries not loaded');
    }
    
    // Get the challenge
    const expectedChallenge = getChallengeFromStore(userId);
    if (!expectedChallenge) {
      throw new Error('Challenge expired or not found');
    }
    
    // Enhanced attestation verification
    async function verifyAttestationWithMetadata(attestation, options) {
      // In production, you might want to verify the attestation against
      // the FIDO Metadata Service (MDS) to ensure the authenticator is genuine
      
      // For now, we'll use the standard verification
      return await webAuthnServer.verifyRegistrationResponse(options);
      
      // In a real implementation with MDS:
      // const mdsVerifier = new MdsVerifier();
      // const mdsResult = await mdsVerifier.verify(attestation);
      // if (!mdsResult.isValid) {
      //   throw new Error('Authenticator not trusted according to FIDO MDS');
      // }
    }
    
    // Verify the attestation with enhanced verification
    const verification = await verifyAttestationWithMetadata(
      attestationResponse,
      {
        response: attestationResponse,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID
      }
    );
    
    if (verification.verified) {
      // Get the user
      const user = getUserFromStore(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Audit logging function
      async function createAuditLog(userId, action, metadata) {
        const auditLog = {
          userId,
          action,
          timestamp: Date.now(),
          ip: metadata.ip || 'unknown',
          userAgent: metadata.userAgent || 'unknown',
          success: metadata.success,
          details: metadata.details
        };
        
        // In production, save to a secure, append-only database or service
        // For now, log to console in a structured format
        logger.info('Audit log entry created', { auditLog });
        
        // In a real implementation, you would save this to a database
        // await dbClient.collection('auditLogs').insertOne(auditLog);
      }
      
      // Save the credential
      const { credentialID, credentialPublicKey } = verification.registrationInfo;
      const credentialIdBase64 = Buffer.from(credentialID).toString('base64url');
      
      const newCredential = {
        id: credentialIdBase64,
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter: verification.registrationInfo.counter,
        transports: attestationResponse.response.transports || [],
        created: new Date().toISOString()
      };
      
      // Add to user's credentials
      user.credentials.push(credentialIdBase64);
      await db.saveUser(userId, user);
      
      // Save credential separately
      await db.saveCredential(credentialIdBase64, newCredential);
      
      // Create audit log for successful registration
      await createAuditLog(userId, 'webauthn_registration', {
        success: true,
        details: {
          credentialId: credentialIdBase64,
          created: newCredential.created
        }
      });
      
      return {
        success: true,
        credential: {
          id: credentialIdBase64,
          type: 'public-key',
          created: newCredential.created
        }
      };
    } else {
      throw new Error('Attestation verification failed');
    }
  } catch (error) {
    console.error('Registration verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Compliance and privacy functions
function ensureCompliance(userData) {
  // Implement functions to ensure compliance with regulations like GDPR, HIPAA, etc.
  // For healthcare apps, this is especially important
  
  // For example, ensure proper consent is recorded
  if (process.env.NODE_ENV === 'production' && !userData.consentRecorded) {
    logger.info('User consent not recorded', { userId: userData.id });
    // In production, you might want to enforce this
    // throw new Error('User consent must be recorded before processing data');
  }
  
  // Ensure data minimization - only return necessary fields
  const sanitizedData = {
    id: userData.id,
    name: userData.name,
    displayName: userData.displayName,
    credentials: userData.credentials
    // Exclude sensitive fields
  };
  
  return sanitizedData;
}

ipcMain.handle('authenticate-webauthn', async (event, { userId, credentialId }) => {
  logger.info('Generating authentication options for user:', { userId });
  
  // TEMPORARY: Bypass WebAuthn authentication
  if (BYPASS_AUTH) {
    return {
      success: true,
      userId: userId || 'bypass-user-id',
      sessionToken: 'bypass-session-token'
    };
  }
  
  // Check rate limiting
  if (!checkRateLimit(userId, 'authenticate')) {
    logger.info('Rate limit exceeded for authentication', { userId });
    return {
      success: false,
      error: 'Too many authentication attempts. Please try again later.'
    };
  }
  
  try {
    if (!webAuthnServer) {
      throw new Error('WebAuthn server libraries not loaded');
    }
    
    // Get user
    const user = getUserFromStore(userId);
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }
    
    // Generate challenge
    const challenge = generateChallenge();
    saveChallengeToStore(userId, challenge);
    
    // Get allowed credential IDs
    let allowCredentials = [];
    if (credentialId) {
      // If a specific credential is provided
      allowCredentials = [{
        id: Buffer.from(credentialId, 'base64url'),
        type: 'public-key'
      }];
    } else if (user.credentials && user.credentials.length > 0) {
      // Otherwise use all user credentials
      allowCredentials = user.credentials.map(id => ({
        id: Buffer.from(id, 'base64url'),
        type: 'public-key'
      }));
    }
    
    // Generate authentication options
    const authOptions = await webAuthnServer.generateAuthenticationOptions({
      rpID,
      challenge,
      allowCredentials,
      userVerification: 'preferred' // Changed from 'required' to 'preferred' for better compatibility
    });
    
    return {
      success: true,
      options: authOptions
    };
  } catch (error) {
    console.error('Error generating authentication options:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('verify-authentication', async (event, { userId, assertionResponse }) => {
  console.log('Verifying authentication for user:', userId);
  
  // TEMPORARY: Bypass WebAuthn verification
  if (BYPASS_AUTH) {
    return {
      success: true,
      userId: userId || 'bypass-user-id',
      sessionToken: 'bypass-session-token'
    };
  }
  
  try {
    if (!webAuthnServer) {
      throw new Error('WebAuthn server libraries not loaded');
    }
    
    // Get the challenge
    const expectedChallenge = getChallengeFromStore(userId);
    if (!expectedChallenge) {
      return {
        success: false,
        error: 'Challenge expired or not found'
      };
    }
    
    // Get credential ID from the response
    const credentialIdBase64 = assertionResponse.id;
    
    // Get the credential
    const credential = getCredentialFromStore(credentialIdBase64);
    if (!credential) {
      return {
        success: false,
        error: 'Credential not found'
      };
    }
    
    // Verify the assertion
    const verification = await webAuthnServer.verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(credential.id, 'base64url'),
        credentialPublicKey: Buffer.from(credential.publicKey, 'base64url'),
        counter: credential.counter
      }
    });
    
    if (verification.verified) {
      // Update the credential counter
      credential.counter = verification.authenticationInfo.newCounter;
      credential.lastUsed = new Date().toISOString();
      saveCredentialToStore(credentialIdBase64, credential);
      
      // Create a session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      
      // In a real app, you would store this token securely and associate it with the user
      
      return {
        success: true,
        userId,
        sessionToken
      };
    } else {
      throw new Error('Authentication verification failed');
    }
  } catch (error) {
    console.error('Authentication verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
                                                                                                                                                       
 ipcMain.handle('process-transcription', async (event, transcription) => {                                                                             
   console.log('Processing transcription:', transcription);                                                                                            
   // Placeholder for actual NLP processing                                                                                                            
                                                                                                                                                       
   // Mock extracted entities                                                                                                                          
   const extractedEntities = {                                                                                                                         
     patientName: 'John Doe',                                                                                                                          
     patientAge: '45',                                                                                                                                 
     symptoms: ['headache'],                                                                                                                           
     duration: '3 days',                                                                                                                               
     medications: ['ibuprofen 400mg'],                                                                                                                 
     medicalHistory: ['migraines']                                                                                                                     
   };                                                                                                                                                  
                                                                                                                                                       
   return { success: true, entities: extractedEntities };                                                                                              
 });                                                                                                                                                   
                                                                                                                                                       
 ipcMain.handle('save-form', async (event, formData) => {                                                                                              
   console.log('Saving form:', formData);                                                                                                              
   // Placeholder for actual form saving logic                                                                                                         
                                                                                                                                                       
   // Show save dialog                                                                                                                                 
   const { filePath } = await dialog.showSaveDialog({                                                                                                  
     title: 'Save Completed Form',                                                                                                                     
     defaultPath: 'completed_form.json',                                                                                                               
     filters: [                                                                                                                                        
       { name: 'JSON Files', extensions: ['json'] }                                                                                                    
     ]                                                                                                                                                 
   });                                                                                                                                                 
                                                                                                                                                       
   if (filePath) {                                                                                                                                     
     // In a real app, you would save the file here                                                                                                    
     return { success: true, message: `Form would be saved to ${filePath}` };                                                                          
   }                                                                                                                                                   
                                                                                                                                                       
   return { success: false, message: 'Save cancelled' };                                                                                               
 });                                                                                                                                                  
                                                                                                                                                      

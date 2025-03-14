const { app, BrowserWindow, ipcMain, dialog } = require('electron');                                                                                  
const path = require('path');
const crypto = require('crypto');
                                                                                                                                                       
// We'll initialize the store later using dynamic import                                                                                              
let store;                                                                                                                                            
                                                                                                                                                       
// Initialize store asynchronously                                                                                                                    
(async () => {                                                                                                                                        
  const { default: Store } = await import('electron-store');                                                                                          
  store = new Store({
    encryptionKey: 'healthcare-app-secure-encryption-key', // In production, use a secure key management solution
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
    console.log('WebAuthn server libraries loaded successfully');
  } catch (error) {
    console.error('Failed to load WebAuthn server libraries:', error);
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
                                                                                                                                                       
   mainWindow.loadFile(path.join(__dirname, '../frontend/index.html'));                                                                                
                                                                                                                                                       
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
 
// WebAuthn configuration
const rpName = 'FormFillVoiceAI Healthcare';
const rpID = 'localhost'; // In production, use your actual domain
const origin = `http://${rpID}:${process.env.PORT || 3000}`;
const expectedOrigin = origin;

// Helper functions for WebAuthn
function generateRandomBuffer() {
  return crypto.randomBytes(32);
}

function generateChallenge() {
  const challenge = generateRandomBuffer();
  return challenge.toString('base64url');
}

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

// WebAuthn authentication handlers
ipcMain.handle('register-webauthn', async (event, userId) => {
  console.log('Generating registration options for user:', userId);
  
  try {
    if (!webAuthnServer) {
      throw new Error('WebAuthn server libraries not loaded');
    }
    
    // Create or get user
    let user = getUserFromStore(userId);
    if (!user) {
      user = {
        id: userId,
        name: `User ${userId.substring(0, 8)}`,
        displayName: `User ${userId.substring(0, 8)}`,
        credentials: []
      };
      saveUserToStore(userId, user);
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
      attestationType: 'direct', // For healthcare, we want attestation
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Allow both platform and cross-platform authenticators
        userVerification: 'required', // Require biometric/PIN for healthcare
        requireResidentKey: true // For better UX, use resident keys
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
  
  try {
    if (!webAuthnServer) {
      throw new Error('WebAuthn server libraries not loaded');
    }
    
    // Get the challenge
    const expectedChallenge = getChallengeFromStore(userId);
    if (!expectedChallenge) {
      throw new Error('Challenge expired or not found');
    }
    
    // Verify the attestation
    const verification = await webAuthnServer.verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID
    });
    
    if (verification.verified) {
      // Get the user
      const user = getUserFromStore(userId);
      if (!user) {
        throw new Error('User not found');
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
      saveUserToStore(userId, user);
      
      // Save credential separately
      saveCredentialToStore(credentialIdBase64, newCredential);
      
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

ipcMain.handle('authenticate-webauthn', async (event, { userId, credentialId }) => {
  console.log('Generating authentication options for user:', userId);
  
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
      userVerification: 'required' // Require biometric/PIN for healthcare
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
                                                                                                                                                      

const { contextBridge, ipcRenderer } = require('electron');                                                                                           
                                                                                                                                                       
// Expose protected methods that allow the renderer process to use                                                                                    
// the ipcRenderer without exposing the entire object                                                                                                

contextBridge.exposeInMainWorld('api', {                                                                                                                                                                          
  // Recording functions                                                                                                                                                                                          
  startRecording: () => ipcRenderer.invoke('start-recording'),                                                                                                                                                    
  stopRecording: () => ipcRenderer.invoke('stop-recording'),                                                                                                                                                      
                                                                                                                                                                                                                  
  // Processing functions                                                                                                                                                                                         
  processTranscription: (transcription) =>                                                                                                                                                                        
    ipcRenderer.invoke('process-transcription', transcription),                                                                                                                                                   
                                                                                                                                                                                                                  
  // Form functions                                                                                                                                                                                               
  saveForm: (formData) => ipcRenderer.invoke('save-form', formData),                                                                                                                                              
                                                                                                                                                                                                                  
  // WebAuthn authentication functions - enhanced API                                                                                                                                                            
  // Registration
  registerWebAuthn: (userId) => ipcRenderer.invoke('register-webauthn', userId),
  verifyRegistration: (data) => ipcRenderer.invoke('verify-registration', data),
  
  // Authentication
  authenticateWebAuthn: (data) => ipcRenderer.invoke('authenticate-webauthn', data),
  verifyAuthentication: (data) => ipcRenderer.invoke('verify-authentication', data),
  
  // Permissions
  checkPermissions: async () => {
    try {
      // Check for microphone permission
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('Checking microphone permission...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately after getting permission
        stream.getTracks().forEach(track => track.stop());
        console.log('Microphone permission granted');
        return { microphone: true };
      } else {
        console.error('MediaDevices API not available');
        return { microphone: false, error: 'MediaDevices API not available' };
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      return { microphone: false, error: error.message };
    }
  }
});

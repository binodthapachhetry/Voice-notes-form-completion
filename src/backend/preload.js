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
  verifyAuthentication: (data) => ipcRenderer.invoke('verify-authentication', data)
});

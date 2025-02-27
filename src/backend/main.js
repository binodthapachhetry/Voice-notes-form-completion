const { app, BrowserWindow, ipcMain, dialog } = require('electron');                                                                                  
 const path = require('path');                                                                                                                         
                                                                                                                                                       
 // We'll initialize the store later using dynamic import                                                                                              
 let store;                                                                                                                                            
                                                                                                                                                       
 // Initialize store asynchronously                                                                                                                    
 (async () => {                                                                                                                                        
   const { default: Store } = await import('electron-store');                                                                                          
   store = new Store();                                                                                                                                
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
   // Placeholder for actual recording logic                                                                                                           
   return { success: true, message: 'Recording started' };                                                                                             
 });                                                                                                                                                   
                                                                                                                                                       
 ipcMain.handle('stop-recording', async () => {                                                                                                        
   console.log('Recording stopped');                                                                                                                   
   // Placeholder for actual recording stop logic                                                                                                      
   return {                                                                                                                                            
     success: true,                                                                                                                                    
     message: 'Recording stopped',                                                                                                                     
     // Mock transcription result                                                                                                                      
     transcription: 'Patient John Doe, 45 years old, complains of persistent headache for the past three days. No fever or nausea. History of migraine Currently taking ibuprofen 400mg as needed.'                                                                                                          
   };                                                                                                                                                  
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
                                                                                                                                                      

// DOM Elements                                                                                                                                       
const recordButton = document.getElementById('recordButton');                                                                                         
const recordingStatus = document.getElementById('recordingStatus');                                                                                   
const recordingTime = document.getElementById('recordingTime');                                                                                       
const transcriptionText = document.getElementById('transcriptionText');                                                                               
const saveFormButton = document.getElementById('saveFormButton');                                                                                     
                                                                                                                                                      
// Form fields                                                                                                                                        
const patientNameInput = document.getElementById('patientName');                                                                                      
const patientAgeInput = document.getElementById('patientAge');                                                                                        
const symptomsInput = document.getElementById('symptoms');                                                                                            
const durationInput = document.getElementById('duration');                                                                                            
const medicationsInput = document.getElementById('medications');                                                                                      
const medicalHistoryInput = document.getElementById('medicalHistory');                                                                                
                                                                                                                                                      
// State                                                                                                                                              
let isRecording = false;                                                                                                                              
let recordingInterval;                                                                                                                                
let recordingSeconds = 0;                                                                                                                             
                                                                                                                                                      
// Event Listeners                                                                                                                                    
recordButton.addEventListener('click', toggleRecording);                                                                                              
saveFormButton.addEventListener('click', saveForm);                                                                                                   
                                                                                                                                                      
// Functions                                                                                                                                          
async function toggleRecording() {                                                                                                                    
  if (!isRecording) {                                                                                                                                 
    // Start recording                                                                                                                                
    const result = await window.api.startRecording();                                                                                                 
    if (result.success) {                                                                                                                             
      isRecording = true;                                                                                                                             
      recordButton.textContent = 'Stop Recording';                                                                                                    
      recordButton.classList.add('recording');                                                                                                        
      recordingStatus.textContent = 'Recording...';                                                                                                   
      startRecordingTimer();                                                                                                                          
    }                                                                                                                                                 
  } else {                                                                                                                                            
    // Stop recording                                                                                                                                 
    const result = await window.api.stopRecording();                                                                                                  
    if (result.success) {                                                                                                                             
      isRecording = false;                                                                                                                            
      recordButton.textContent = 'Start Recording';                                                                                                   
      recordButton.classList.remove('recording');                                                                                                     
      recordingStatus.textContent = 'Processing...';                                                                                                  
      stopRecordingTimer();                                                                                                                           
                                                                                                                                                      
      // Display transcription                                                                                                                        
      transcriptionText.value = result.transcription;                                                                                                 
                                                                                                                                                      
      // Process transcription                                                                                                                        
      processTranscription(result.transcription);                                                                                                     
    }                                                                                                                                                 
  }                                                                                                                                                   
}                                                                                                                                                     
                                                                                                                                                      
function startRecordingTimer() {                                                                                                                      
  recordingSeconds = 0;                                                                                                                               
  updateRecordingTime();                                                                                                                              
  recordingInterval = setInterval(() => {                                                                                                             
    recordingSeconds++;                                                                                                                               
    updateRecordingTime();                                                                                                                            
  }, 1000);                                                                                                                                           
}                                                                                                                                                     
                                                                                                                                                      
function stopRecordingTimer() {                                                                                                                       
  clearInterval(recordingInterval);                                                                                                                   
}                                                                                                                                                     
                                                                                                                                                      
function updateRecordingTime() {                                                                                                                      
  const minutes = Math.floor(recordingSeconds / 60).toString().padStart(2, '0');                                                                      
  const seconds = (recordingSeconds % 60).toString().padStart(2, '0');                                                                                
  recordingTime.textContent = `${minutes}:${seconds}`;                                                                                                
}                                                                                                                                                     
                                                                                                                                                      
async function processTranscription(transcription) {                                                                                                  
  recordingStatus.textContent = 'Extracting information...';                                                                                          
                                                                                                                                                      
  const result = await window.api.processTranscription(transcription);                                                                                
                                                                                                                                                      
  if (result.success) {                                                                                                                               
    recordingStatus.textContent = 'Ready';                                                                                                            
                                                                                                                                                      
    // Populate form with extracted entities                                                                                                          
    const entities = result.entities;                                                                                                                 
    patientNameInput.value = entities.patientName || '';                                                                                              
    patientAgeInput.value = entities.patientAge || '';                                                                                                
    symptomsInput.value = entities.symptoms ? entities.symptoms.join(', ') : '';                                                                      
    durationInput.value = entities.duration || '';                                                                                                    
    medicationsInput.value = entities.medications ? entities.medications.join(', ') : '';                                                             
    medicalHistoryInput.value = entities.medicalHistory ? entities.medicalHistory.join(', ') : '';                                                    
  } else {                                                                                                                                            
    recordingStatus.textContent = 'Error processing transcription';                                                                                   
  }                                                                                                                                                   
}                                                                                                                                                     
                                                                                                                                                      
async function saveForm() {                                                                                                                           
  // Collect form data                                                                                                                                
  const formData = {                                                                                                                                  
    patientName: patientNameInput.value,                                                                                                              
    patientAge: patientAgeInput.value,                                                                                                                
    symptoms: symptomsInput.value.split(',').map(s => s.trim()),                                                                                      
    duration: durationInput.value,                                                                                                                    
    medications: medicationsInput.value.split(',').map(m => m.trim()),                                                                                
    medicalHistory: medicalHistoryInput.value.split(',').map(h => h.trim())                                                                           
  };                                                                                                                                                  
                                                                                                                                                      
  // Save form                                                                                                                                        
  const result = await window.api.saveForm(formData);                                                                                                 
                                                                                                                                                      
  if (result.success) {                                                                                                                               
    alert('Form saved successfully!');                                                                                                                
  } else {                                                                                                                                            
    alert('Error saving form: ' + result.message);                                                                                                    
  }                                                                                                                                                   
} 
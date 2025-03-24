// DOM Elements                                                                                                                                       
const recordButton = document.getElementById('recordButton');                                                                                         
const recordingStatus = document.getElementById('recordingStatus');                                                                                   
const recordingTime = document.getElementById('recordingTime');                                                                                       
const transcriptionText = document.getElementById('transcriptionText');                                                                               
const saveFormButton = document.getElementById('saveFormButton');
const audioVisualizer = document.getElementById('audioVisualizer');                                                                                     
                                                                                                                                                      
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

// Audio recording variables
let audioContext;
let audioStream;
let audioRecorder;
let audioProcessor;
let audioAnalyser;
let audioChunks = [];
let visualizerContext;
let animationFrame;     

// Event Listeners                                                                                                                                    
recordButton.addEventListener('click', toggleRecording);                                                                                              
saveFormButton.addEventListener('click', saveForm);  

 // Import the Login component                                                                                                                                                                                     
 import Login from './components/Login.js';                                                                                                                                                                        
                                                                                                                                                                                                                   
 // DOM Elements (will be initialized after authentication)                                                                                                                                                        
 let recordButton;                                                                                                                                                                                                 
 let recordingStatus;                                                                                                                                                                                              
 let recordingTime;                                                                                                                                                                                                
 let transcriptionText;                                                                                                                                                                                            
 let saveFormButton;                                                                                                                                                                                               
 let audioLevel;                                                                                                                                                                                                   
 let waveformContainer;                                                                                                                                                                                            
 let patientNameInput;                                                                                                                                                                                             
 let patientAgeInput;                                                                                                                                                                                              
 let symptomsInput;                                                                                                                                                                                                
 let durationInput;                                                                                                                                                                                                
 let medicationsInput;                                                                                                                                                                                             
 let medicalHistoryInput;                                                                                                                                                                                          
                                                                                                                                                                                                                   
 // Audio Recording variables                                                                                                                                                                                      
 let isRecording = false;                                                                                                                                                                                          
 let recordingInterval;                                                                                                                                                                                            
 let recordingSeconds = 0;                                                                                                                                                                                         
 let audioContext;                                                                                                                                                                                                 
 let mediaRecorder;                                                                                                                                                                                                
 let audioChunks = [];                                                                                                                                                                                             
 let analyser;                                                                                                                                                                                                     
 let microphone;                                                                                                                                                                                                   
 let dataArray;                                                                                                                                                                                                    
 let waveform = null;                                                                                                                                                                                              
                                                                                                                                                                                                                   
 // Authentication state                                                                                                                                                                                           
 let isAuthenticated = false;                                                                                                                                                                                      
 let currentUserId = null;                                                                                                                                                                                         
                                                                                                                                                                                                                   
 // Initialize the application                                                                                                                                                                                     
 document.addEventListener('DOMContentLoaded', initializeApp); 


 async function initializeApp() {                                                                                                                                                                                  
  // Initialize the login component                                                                                                                                                                               
  const loginContainer = document.getElementById('login-container');                                                                                                                                              
  const mainContainer = document.getElementById('main-container');                                                                                                                                                
                                                                                                                                                                                                                  
  const login = new Login();                                                                                                                                                                                      
  await login.initialize(loginContainer);                                                                                                                                                                         
                                                                                                                                                                                                                  
  // Listen for authentication events                                                                                                                                                                             
  loginContainer.addEventListener('login-authenticated', (event) => {                                                                                                                                             
    isAuthenticated = true;                                                                                                                                                                                       
    currentUserId = event.detail.userId;                                                                                                                                                                          
                                                                                                                                                                                                                  
    // Show the main application                                                                                                                                                                                  
    loginContainer.style.display = 'none';                                                                                                                                                                        
    mainContainer.style.display = 'block';                                                                                                                                                                        
                                                                                                                                                                                                                  
    // Initialize the main application                                                                                                                                                                            
    initializeMainApp();                                                                                                                                                                                          
  });                                                                                                                                                                                                             
}                                                                                                                                                                                                                 
                                                                                                                                                                                                                  
/**                                                                                                                                                                                                               
 * Initialize the main application after authentication                                                                                                                                                           
 */                                                                                                                                                                                                               
async function initializeMainApp() {                                                                                                                                                                              
  // Initialize DOM elements                                                                                                                                                                                      
  recordButton = document.getElementById('recordButton');                                                                                                                                                         
  recordingStatus = document.getElementById('recordingStatus');                                                                                                                                                   
  recordingTime = document.getElementById('recordingTime');                                                                                                                                                       
  transcriptionText = document.getElementById('transcriptionText');                                                                                                                                               
  saveFormButton = document.getElementById('saveFormButton');                                                                                                                                                     
  audioLevel = document.getElementById('audioLevel');                                                                                                                                                             
  waveformContainer = document.getElementById('waveform');                                                                                                                                                        
                                                                                                                                                                                                                  
  // Form fields                                                                                                                                                                                                  
  patientNameInput = document.getElementById('patientName');                                                                                                                                                      
  patientAgeInput = document.getElementById('patientAge');                                                                                                                                                        
  symptomsInput = document.getElementById('symptoms');                                                                                                                                                            
  durationInput = document.getElementById('duration');                                                                                                                                                            
  medicationsInput = document.getElementById('medications');                                                                                                                                                      
  medicalHistoryInput = document.getElementById('medicalHistory');                                                                                                                                                
                                                                                                                                                                                                                  
  // Check for permissions                                                                                                                                                                                        
  await window.api.checkPermissions();                                                                                                                                                                            
                                                                                                                                                                                                                  
  // Set up event listeners                                                                                                                                                                                       
  recordButton.addEventListener('click', toggleRecording);                                                                                                                                                        
  saveFormButton.addEventListener('click', saveForm);                                                                                                                                                             
}
                                                                                                                                                                                                                                                     
                                                                                                                                                      
// Functions                                                                                                                                          
async function toggleRecording() {                                                                                                                    
  if (!isRecording) {                                                                                                                                 
    try {
      // Initialize audio recording
      await initAudioRecording();
      
      // Notify backend that recording started
      const result = await window.api.startRecording();                                                                                                 
      
      if (result.success) {                                                                                                                             
        isRecording = true;                                                                                                                             
        recordButton.textContent = 'Stop Recording';                                                                                                    
        recordButton.classList.add('recording');                                                                                                        
        recordingStatus.textContent = 'Recording...';                                                                                                   
        startRecordingTimer();
        startAudioVisualization();                                                                                                                          
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      recordingStatus.textContent = 'Error: ' + error.message;
    }                                                                                                                                 
  } else {                                                                                                                                            
    try {
      // Stop audio recording
      const audioBlob = await stopAudioRecording();
      
      // Notify backend that recording stopped
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
    } catch (error) {
      console.error('Error stopping recording:', error);
      recordingStatus.textContent = 'Error: ' + error.message;
      isRecording = false;
      recordButton.textContent = 'Start Recording';
      recordButton.classList.remove('recording');
      stopRecordingTimer();
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
  console.log('Recording timer started');                                                                                                                                           
}                                                                                                                                                     
                                                                                                                                                      
function stopRecordingTimer() {                                                                                                                       
  clearInterval(recordingInterval);
  console.log('Recording timer stopped');                                                                                                                   
}                                                                                                                                                     
                                                                                                                                                      
function updateRecordingTime() {                                                                                                                      
  const minutes = Math.floor(recordingSeconds / 60).toString().padStart(2, '0');                                                                      
  const seconds = (recordingSeconds % 60).toString().padStart(2, '0');                                                                                
  recordingTime.textContent = `${minutes}:${seconds}`;                                                                                                
}

// Audio Recording Functions
async function initAudioRecording() {
  // Reset audio chunks
  audioChunks = [];
  
  try {
    // Get audio stream
    audioStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });
    
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create source from stream
    const source = audioContext.createMediaStreamSource(audioStream);
    
    // Create analyzer for visualization
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 256;
    source.connect(audioAnalyser);
    
    // Setup recorder
    audioRecorder = new MediaRecorder(audioStream);
    
    // Event handler for data available
    audioRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    // Start recording
    audioRecorder.start(1000); // Collect data every second
    
    // Initialize visualizer
    visualizerContext = audioVisualizer.getContext('2d');
    audioVisualizer.width = audioVisualizer.clientWidth;
    audioVisualizer.height = audioVisualizer.clientHeight;
    
    console.log('Audio recording initialized successfully');
  } catch (error) {
    console.error('Error initializing audio recording:', error);
    throw error;
  }
}

async function stopAudioRecording() {
  return new Promise((resolve, reject) => {
    if (!audioRecorder || audioRecorder.state === 'inactive') {
      reject(new Error('No active recorder'));
      return;
    }
    
    // Stop the animation
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    
    // Event for when recording stops
    audioRecorder.onstop = () => {
      // Create blob from chunks
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      
      // Clean up
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      
      audioStream = null;
      audioRecorder = null;
      audioAnalyser = null;
      
      // Clear visualizer
      if (visualizerContext) {
        visualizerContext.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);
      }
      
      console.log('Audio recording stopped successfully');
      resolve(audioBlob);
    };
    
    // Stop recording
    audioRecorder.stop();
  });
}

function startAudioVisualization() {
  if (!audioAnalyser || !visualizerContext) {
    console.error('Visualizer or analyzer not initialized');
    return;
  }
  
  const bufferLength = audioAnalyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  visualizerContext.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);
  
  function draw() {
    if (!isRecording) return;
    
    animationFrame = requestAnimationFrame(draw);
    
    audioAnalyser.getByteFrequencyData(dataArray);
    
    visualizerContext.fillStyle = '#f0f4f8';
    visualizerContext.fillRect(0, 0, audioVisualizer.width, audioVisualizer.height);
    
    const barWidth = (audioVisualizer.width / bufferLength) * 2.5;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i] / 255 * audioVisualizer.height;
      
      // Use a gradient based on amplitude
      const intensity = dataArray[i] / 255;
      const r = Math.floor(39 + (intensity * 180)); // 2563eb -> #1d4ed8
      const g = Math.floor(99 + (intensity * 80));
      const b = Math.floor(235 - (intensity * 100));
      
      visualizerContext.fillStyle = `rgb(${r}, ${g}, ${b})`;
      visualizerContext.fillRect(x, audioVisualizer.height - barHeight, barWidth, barHeight);
      
      x += barWidth + 1;
    }
  }
  
  draw();
  console.log('Audio visualization started');
}                                                                                                                                                     
                                                                                                                                                      
async function processTranscription(transcription) {                                                                                                  
  recordingStatus.textContent = 'Extracting information...';                                                                                          
  
  try {                                                                                                                                                    
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
      
      console.log('Form populated with extracted entities:', entities);                                                    
    } else {                                                                                                                                            
      recordingStatus.textContent = 'Error processing transcription';
      console.error('Error processing transcription:', result.error);                                                                                   
    }
  } catch (error) {
    console.error('Exception processing transcription:', error);
    recordingStatus.textContent = 'Error processing transcription: ' + error.message;
  }                                                                                                                                                   
}                                                                                                                                                     
                                                                                                                                                      
async function saveForm() {                                                                                                                           
  try {
    // Update status
    recordingStatus.textContent = 'Saving form...';
    
    // Collect form data                                                                                                                                
    const formData = {                                                                                                                                  
      patientName: patientNameInput.value,                                                                                                              
      patientAge: patientAgeInput.value,                                                                                                                
      symptoms: symptomsInput.value.split(',').map(s => s.trim()).filter(s => s),                                                                                      
      duration: durationInput.value,                                                                                                                    
      medications: medicationsInput.value.split(',').map(m => m.trim()).filter(m => m),                                                                                
      medicalHistory: medicalHistoryInput.value.split(',').map(h => h.trim()).filter(h => h),
      timestamp: new Date().toISOString()                                                                           
    };                                                                                                                                                  
                                                                                                                                                      
    console.log('Saving form data:', formData);
    
    // Save form                                                                                                                                        
    const result = await window.api.saveForm(formData);                                                                                                 
                                                                                                                                                      
    if (result.success) {                                                                                                                               
      recordingStatus.textContent = 'Form saved successfully';
      alert('Form saved successfully!');                                                                                                                
    } else {                                                                                                                                            
      recordingStatus.textContent = 'Error saving form';
      alert('Error saving form: ' + result.message);                                                                                                    
    }
  } catch (error) {
    console.error('Exception saving form:', error);
    recordingStatus.textContent = 'Error saving form';
    alert('Error saving form: ' + error.message);
  }                                                                                                                                                   
} 

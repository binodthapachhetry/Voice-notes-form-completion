// DOM Elements                                                                                                                                       
const recordButton = document.getElementById('recordButton');                                                                                         
const recordingStatus = document.getElementById('recordingStatus');                                                                                   
const recordingTime = document.getElementById('recordingTime');                                                                                       
const transcriptionText = document.getElementById('transcriptionText');                                                                               
const saveFormButton = document.getElementById('saveFormButton');
const waveformElement = document.getElementById('waveform');
const audioLevelElement = document.getElementById('audioLevel');
                                                                                                                                                      
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
let mediaRecorder;
let audioSource;
let audioAnalyser;
let audioChunks = [];
let visualizerContext;
let animationFrame;
let dataArray;

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
        recordingStatus.classList.add('recording');                                                                                                   
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
        recordingStatus.classList.remove('recording');                                                                                                  
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
      recordingStatus.classList.remove('recording');
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
    // Get audio stream with specific constraints for better quality
    audioStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1
      } 
    });
    
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 44100
    });
    
    // Create source from stream
    audioSource = audioContext.createMediaStreamSource(audioStream);
    
    // Create analyzer for visualization
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 256;
    audioAnalyser.smoothingTimeConstant = 0.7;
    audioSource.connect(audioAnalyser);
    
    // Create data array for visualization
    dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
    
    // Setup media recorder
    mediaRecorder = new MediaRecorder(audioStream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000
    });
    
    // Event handler for data available
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    // Start recording
    mediaRecorder.start(1000); // Collect data every second
    
    console.log('Audio recording initialized successfully');
  } catch (error) {
    console.error('Error initializing audio recording:', error);
    throw error;
  }
}

async function stopAudioRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      reject(new Error('No active recorder'));
      return;
    }
    
    // Stop the animation
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    
    // Event for when recording stops
    mediaRecorder.onstop = () => {
      // Create blob from chunks
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      
      // Clean up
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      
      // For debugging: create an audio URL for playback
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('Debug: Audio available at:', audioUrl);
      
      // Clean up resources
      audioStream = null;
      mediaRecorder = null;
      audioAnalyser = null;
      audioSource = null;
      
      // Clear waveform
      if (waveformElement) {
        waveformElement.innerHTML = '';
      }
      
      // Reset audio level
      if (audioLevelElement) {
        audioLevelElement.style.width = '0%';
      }
      
      console.log('Audio recording stopped successfully');
      resolve(audioBlob);
    };
    
    // Stop recording
    mediaRecorder.stop();
  });
}

function startAudioVisualization() {
  if (!audioAnalyser || !waveformElement) {
    console.error('Visualizer or analyzer not initialized');
    return;
  }
  
  // Create canvas for waveform visualization
  const canvas = document.createElement('canvas');
  canvas.width = waveformElement.clientWidth;
  canvas.height = waveformElement.clientHeight;
  waveformElement.innerHTML = '';
  waveformElement.appendChild(canvas);
  
  visualizerContext = canvas.getContext('2d');
  
  function draw() {
    if (!isRecording) return;
    
    animationFrame = requestAnimationFrame(draw);
    
    // Get frequency data
    audioAnalyser.getByteFrequencyData(dataArray);
    
    // Clear canvas
    visualizerContext.clearRect(0, 0, canvas.width, canvas.height);
    visualizerContext.fillStyle = '#f0f4f8';
    visualizerContext.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate average volume for audio level meter
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    const volumePercent = (average / 255) * 100;
    
    // Update audio level meter
    if (audioLevelElement) {
      audioLevelElement.style.width = `${volumePercent}%`;
    }
    
    // Draw frequency bars
    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let x = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      
      // Use a gradient based on amplitude
      const intensity = dataArray[i] / 255;
      const r = Math.floor(37 + (intensity * 180)); // 2563eb -> #1d4ed8
      const g = Math.floor(99 + (intensity * 80));
      const b = Math.floor(235 - (intensity * 100));
      
      visualizerContext.fillStyle = `rgb(${r}, ${g}, ${b})`;
      visualizerContext.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      
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
      
      // Highlight the form to show it's been populated
      highlightFormFields();
      
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

// Highlight form fields that have been populated
function highlightFormFields() {
  const formFields = [
    patientNameInput,
    patientAgeInput,
    symptomsInput,
    durationInput,
    medicationsInput,
    medicalHistoryInput
  ];
  
  formFields.forEach(field => {
    if (field && field.value) {
      // Add a highlight class
      field.classList.add('highlighted-field');
      
      // Remove the highlight after 2 seconds
      setTimeout(() => {
        field.classList.remove('highlighted-field');
      }, 2000);
    }
  });
}                                                                                                                                                     
                                                                                                                                                      
async function saveForm() {                                                                                                                           
  try {
    // Update status
    recordingStatus.textContent = 'Saving form...';
    
    // Validate form data
    if (!patientNameInput.value.trim()) {
      throw new Error('Patient name is required');
    }
    
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

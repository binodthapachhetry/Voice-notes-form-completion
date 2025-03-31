// Import speech recognition service
import speechRecognitionService from './speechRecognitionService.js';

// DOM Elements
let recordButton;
let recordingStatus;
let recordingTime;
let transcriptionText;
let saveFormButton;
let audioLevel;
let waveformContainer;
let loginContainer;  // Add these variables at the top level                                                                                           
let mainContainer;   // Add these variables at the top level

// Form fields
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
let audioStream;
let audioSource;
let audioAnalyser;
let visualizerContext;
let animationFrame;
let dataArray;

// Speech recognition variables
let isTranscribing = false;
let lastRecordedAudioBlob = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('error', (event) => {                                                                                                          
  console.error('Global error:', event.error);                                                                                                         
});                                                                                                                                                    
                                                                                                                                                       
// // At the top of initializeApp                                                                                                                         
// console.log('DOM loaded, containers:', {                                                                                                               
//   loginContainer: loginContainer?.id,                                                                                                                  
//   mainContainer: mainContainer?.id                                                                                                                     
// }); 

async function initializeApp() {
  console.log('Initializing application...');
  
  // Initialize the login component
  const loginContainer = document.getElementById('login-container');
  const mainContainer = document.getElementById('main-container');

  // Now log the containers after they're defined                                                                                                      
  console.log('DOM loaded, containers:', {                                                                                                             
    loginContainer: loginContainer?.id,                                                                                                                
    mainContainer: mainContainer?.id                                                                                                                   
  }); 
  
  if (!loginContainer) {
    console.error('Login container not found');
    return;
  }
  
  if (!mainContainer) {
    console.error('Main container not found');
    return;
  }
  
  try {
    // Since we're bypassing authentication, show the main container immediately
    loginContainer.style.display = 'none';
    mainContainer.style.display = 'block';
    
    // Initialize the main application
    initializeMainApp();
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Error initializing application:', error);
  }
}

/**
 * Initialize the main application after authentication
 */
async function initializeMainApp() {
  console.log('Initializing main application...');
  
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
  
  // Log which elements were found and which weren't
  console.log('DOM Elements found:', {
    recordButton: !!recordButton,
    recordingStatus: !!recordingStatus,
    recordingTime: !!recordingTime,
    transcriptionText: !!transcriptionText,
    saveFormButton: !!saveFormButton,
    audioLevel: !!audioLevel,
    waveformContainer: !!waveformContainer,
    patientNameInput: !!patientNameInput,
    patientAgeInput: !!patientAgeInput,
    symptomsInput: !!symptomsInput,
    durationInput: !!durationInput,
    medicationsInput: !!medicationsInput,
    medicalHistoryInput: !!medicalHistoryInput
  });
  
  // Set up event listeners
  if (recordButton) {
    recordButton.addEventListener('click', toggleRecording);
    console.log('Added click listener to record button');
  } else {
    console.error('Record button not found');
  }
  
  if (saveFormButton) {
    saveFormButton.addEventListener('click', saveForm);
    console.log('Added click listener to save form button');
  } else {
    console.error('Save form button not found');
  }
  
  // Initialize speech recognition service
  try {
    // Set up callbacks
    speechRecognitionService.setCallbacks({
      onStatus: (message) => {
        console.log('Speech recognition status:', message);
        if (recordingStatus) {
          recordingStatus.textContent = message;
        }
      },
      onProgress: (progress) => {
        console.log('Transcription progress:', progress.toFixed(1) + '%');
        // Could update a progress bar here
      },
      onResult: (result) => {
        console.log('Transcription result:', result);
        if (transcriptionText) {
          transcriptionText.value = result.text;
        }
        isTranscribing = false;
        
        // Process the transcription to extract entities
        processTranscription(result.text);
      },
      onError: (error) => {
        console.error('Speech recognition error:', error);
        if (recordingStatus) {
          recordingStatus.textContent = 'Error: ' + error.message;
        }
        isTranscribing = false;
      },
      onInterim: (text) => {
        console.log('Interim transcription:', text);
        if (transcriptionText) {
          transcriptionText.value = text + ' ...';
        }
      }
    });
    
    // Initialize the service
    await speechRecognitionService.initialize({ modelName: 'base' });
    console.log('Speech recognition service initialized');
  } catch (error) {
    console.error('Failed to initialize speech recognition:', error);
  }
}
// Functions
async function toggleRecording() {
  console.log('Toggle recording called, current state:', isRecording);
  
  if (!isRecording) {
    try {
      // Initialize audio recording
      await initAudioRecording();
      
      // Notify backend that recording started
      const result = await window.api.startRecording();
      console.log('Backend start recording result:', result);
      
      if (result.success) {
        isRecording = true;
        recordButton.textContent = 'Stop Recording';
        recordButton.classList.add('recording');
        recordingStatus.textContent = 'Recording...';
        recordingStatus.classList.add('recording');
        startRecordingTimer();
        startAudioVisualization();
        console.log('Recording started successfully');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      recordingStatus.textContent = 'Error: ' + error.message;
    }
  } else {
    try {
      // Stop audio recording
      const audioBlob = await stopAudioRecording();
      console.log('Audio recording stopped, blob size:', audioBlob.size);
      
      isRecording = false;
      recordButton.textContent = 'Start Recording';
      recordButton.classList.remove('recording');
      recordingStatus.textContent = 'Transcribing...';
      recordingStatus.classList.remove('recording');
      stopRecordingTimer();
      
      // Start on-device transcription
      if (!isTranscribing && lastRecordedAudioBlob) {
        isTranscribing = true;
        
        try {
          // Clear previous transcription
          if (transcriptionText) {
            transcriptionText.value = 'Transcribing...';
          }
          
          // Transcribe the audio using our on-device service
          await speechRecognitionService.transcribe(lastRecordedAudioBlob);
          
          // Note: Results will be handled by the callback functions
          // set in initializeMainApp
        } catch (error) {
          console.error('Error transcribing audio:', error);
          recordingStatus.textContent = 'Error: ' + error.message;
          isTranscribing = false;
        }
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
  console.log('Initializing audio recording...');
  
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
  console.log('Stopping audio recording...');
  
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
      
      // Store the audio blob for transcription
      lastRecordedAudioBlob = audioBlob;
      
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
      if (waveformContainer) {
        waveformContainer.innerHTML = '';
      }
      
      // Reset audio level
      if (audioLevel) {
        audioLevel.style.width = '0%';
      }
      
      console.log('Audio recording stopped successfully');
      resolve(audioBlob);
    };
    
    // Stop recording
    mediaRecorder.stop();
  });
}

function startAudioVisualization() {
  console.log('Starting audio visualization...');
  
  if (!audioAnalyser || !waveformContainer) {
    console.error('Visualizer or analyzer not initialized');
    return;
  }
  
  // Create canvas for waveform visualization
  const canvas = document.createElement('canvas');
  canvas.width = waveformContainer.clientWidth;
  canvas.height = waveformContainer.clientHeight;
  waveformContainer.innerHTML = '';
  waveformContainer.appendChild(canvas);
  
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
    if (audioLevel) {
      audioLevel.style.width = `${volumePercent}%`;
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
  console.log('Processing transcription:', transcription);
  
  recordingStatus.textContent = 'Extracting information...';
  
  try {
    const result = await window.api.processTranscription(transcription);
    console.log('Transcription processing result:', result);
    
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
  console.log('Saving form...');
  
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
    console.log('Save form result:', result);
    
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

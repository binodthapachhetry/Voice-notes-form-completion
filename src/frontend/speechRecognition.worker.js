// Import transformers.js in worker context
try {
  importScripts('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
  const { pipeline, env } = self.Transformers;
  
  // Log successful import
  console.log('Transformers.js loaded successfully via importScripts');
  
  // Continue with the rest of the worker code...
  initWorker(pipeline, env);
} catch (e) {
  console.error('Failed to load Transformers.js via importScripts:', e);
  
  // Fallback to dynamic import
  import('@xenova/transformers').then(({ pipeline, env }) => {
    console.log('Transformers.js loaded successfully via dynamic import');
    initWorker(pipeline, env);
  }).catch(err => {
    console.error('Failed to load Transformers.js via dynamic import:', err);
    self.postMessage({ 
      type: 'error', 
      message: `Failed to load Transformers.js: ${err.message}` 
    });
  });
}

// Initialize the worker with the imported modules
function initWorker(pipeline, env) {

// Set environment variables for transformers.js
env.allowLocalModels = true;
env.useBrowserCache = true;
env.cacheDir = './models';

// Store the ASR pipeline
let asr = null;
let isProcessing = false;

// Configure transformers environment
function configureEnvironment(env) {
  // Set environment variables for transformers.js
  env.allowLocalModels = true;
  env.useBrowserCache = true;
  env.cacheDir = './models';
  env.useQuantizedModels = true;
  
  return env;
}

// Initialize the model
async function initializeModel(modelName = 'Xenova/whisper-base') {
  // Configure the environment
  configureEnvironment(env);
  try {
    // Send status update
    self.postMessage({ type: 'status', message: 'Loading model...' });
    
    // Load the ASR pipeline with the specified model
    asr = await pipeline('automatic-speech-recognition', modelName, {
      quantized: true, // Use quantized model for better performance
      progress_callback: (progress) => {
        // Report loading progress
        self.postMessage({ 
          type: 'progress', 
          message: 'Loading model...', 
          progress: progress.progress * 100 
        });
      }
    });
    
    // Model loaded successfully
    self.postMessage({ 
      type: 'status', 
      message: 'Model loaded successfully',
      modelName: modelName
    });
    
    return true;
  } catch (error) {
    // Report error
    self.postMessage({ 
      type: 'error', 
      message: `Failed to load model: ${error.message}` 
    });
    
    return false;
  }
}

// Transcribe audio
async function transcribeAudio(audioData, options = {}) {
  if (!asr) {
    throw new Error('Model not initialized');
  }
  
  if (isProcessing) {
    throw new Error('Already processing audio');
  }
  
  isProcessing = true;
  
  try {
    // Default options
    const defaultOptions = {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: 'english',
      task: 'transcribe',
      return_timestamps: false
    };
    
    // Merge with user options
    const transcriptionOptions = { ...defaultOptions, ...options };
    
    // Start transcription
    self.postMessage({ type: 'status', message: 'Transcribing audio...' });
    
    // Process the audio in chunks with progress updates
    const result = await asr(audioData, {
      ...transcriptionOptions,
      callback_function: (progress) => {
        // Report transcription progress
        if (progress && progress.progress !== undefined) {
          self.postMessage({ 
            type: 'progress', 
            message: 'Transcribing...', 
            progress: progress.progress * 100 
          });
          
          // Send interim results if available
          if (progress.text) {
            self.postMessage({ 
              type: 'interim', 
              text: progress.text 
            });
          }
        }
      }
    });
    
    // Send the final result
    self.postMessage({ 
      type: 'result', 
      text: result.text,
      language: result.language,
      duration: result.duration
    });
    
    return result;
  } catch (error) {
    // Report error
    self.postMessage({ 
      type: 'error', 
      message: `Transcription failed: ${error.message}` 
    });
    
    throw error;
  } finally {
    isProcessing = false;
  }
}

}

// Handle messages from the main thread
function setupMessageHandler() {
  self.addEventListener('message', async (event) => {
    const { type, data } = event.data;
    
    try {
      switch (type) {
        case 'initialize':
          await initializeModel(data?.modelName);
          break;
          
        case 'transcribe':
          if (!asr) {
            await initializeModel(data?.modelName);
          }
          await transcribeAudio(data.audio, data?.options);
          break;
          
        case 'cancel':
          // TODO: Implement cancellation logic
          isProcessing = false;
          self.postMessage({ type: 'status', message: 'Transcription cancelled' });
          break;
          
        default:
          self.postMessage({ 
            type: 'error', 
            message: `Unknown command: ${type}` 
          });
      }
    } catch (error) {
      self.postMessage({ 
        type: 'error', 
        message: error.message 
      });
    }
  });

  // Notify that the worker is ready
  self.postMessage({ type: 'ready' });
}

// Set up the message handler
setupMessageHandler();

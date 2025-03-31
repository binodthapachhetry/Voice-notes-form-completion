// Import transformers.js in worker context                                                                                                            
try {                                                                                                                                                  
  // Use CDN URL for the worker - use the UMD build which exposes global variables                                                                     
  importScripts('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.umd.min.js');                                              
                                                                                                                                                       
  // Log successful import and check what's available                                                                                                  
  console.log('Transformers.js loaded successfully via importScripts');                                                                                
  console.log('Available globals:', Object.keys(self));                                                                                                
                                                                                                                                                       
  // Access the global Transformers object                                                                                                             
  if (self.Transformers) {                                                                                                                             
    const { pipeline, env } = self.Transformers;                                                                                                       
                                                                                                                                                       
    // Log to verify pipeline is a function                                                                                                            
    console.log('Pipeline type:', typeof pipeline);                                                                                                    
                                                                                                                                                       
    // Set environment variables for transformers.js                                                                                                   
    env.allowLocalModels = true;                                                                                                                       
    env.useBrowserCache = true;                                                                                                                        
    env.cacheDir = './models';                                                                                                                         
    env.useQuantizedModels = true;                                                                                                                     
                                                                                                                                                       
    // Initialize the worker with the imported modules                                                                                                 
    initWorker(pipeline, env);                                                                                                                         
                                                                                                                                                       
    // Notify that the worker is ready                                                                                                                 
    self.postMessage({ type: 'ready' });                                                                                                               
  } else {                                                                                                                                             
    throw new Error('Transformers global object not found');                                                                                           
  }                                                                                                                                                    
} catch (error) {                                                                                                                                      
  console.error('Failed to load Transformers.js via importScripts:', error);                                                                           
                                                                                                                                                       
  // Fallback to fetch + eval approach                                                                                                                 
  fetch('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.umd.min.js')                                                       
    .then(response => response.text())                                                                                                                 
    .then(code => {                                                                                                                                    
      // Evaluate the code to create the global Transformers object                                                                                    
      eval(code);                                                                                                                                      
                                                                                                                                                       
      if (self.Transformers) {                                                                                                                         
        const { pipeline, env } = self.Transformers;                                                                                                   
                                                                                                                                                       
        // Set environment variables for transformers.js                                                                                               
        env.allowLocalModels = true;                                                                                                                   
        env.useBrowserCache = true;                                                                                                                    
        env.cacheDir = './models';                                                                                                                     
        env.useQuantizedModels = true;                                                                                                                 
                                                                                                                                                       
        // Initialize the worker with the imported modules                                                                                             
        initWorker(pipeline, env);                                                                                                                     
                                                                                                                                                       
        // Notify that the worker is ready                                                                                                             
        self.postMessage({ type: 'ready' });                                                                                                           
      } else {                                                                                                                                         
        throw new Error('Transformers global object not found after eval');                                                                            
      }                                                                                                                                                
    })                                                                                                                                                 
    .catch(err => {                                                                                                                                    
      console.error('Failed to load Transformers.js via fetch+eval:', err);                                                                            
      self.postMessage({                                                                                                                               
        type: 'error',                                                                                                                                 
        message: `Failed to load Transformers.js: ${err.message}`                                                                                      
      });                                                                                                                                              
    });                                                                                                                                                
}       

// Global variables                                                                                                                                    
let asr = null;                                                                                                                                        
let isProcessing = false;                                                                                                                              
                                                                                                                                                       
// Initialize the worker with the imported modules                                                                                                     
function initWorker(pipeline, env) {                                                                                                                   
  // Set up message handler                                                                                                                            
  self.addEventListener('message', async (event) => {                                                                                                  
    try {                                                                                                                                              
      const { type, data } = event.data;                                                                                                               
                                                                                                                                                       
      switch (type) {                                                                                                                                  
        case 'initialize':                                                                                                                             
          await initializeModel(pipeline, env, data?.modelName);                                                                                       
          break;                                                                                                                                       
                                                                                                                                                       
        case 'transcribe':                                                                                                                             
          if (!asr) {                                                                                                                                  
            await initializeModel(pipeline, env, data?.modelName);                                                                                     
          }                                                                                                                                            
          await transcribeAudio(data.audio, data?.options);                                                                                            
          break;                                                                                                                                       
                                                                                                                                                       
        case 'cancel':                                                                                                                                 
          // Implement cancellation logic                                                                                                              
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
      console.error('Error in worker message handler:', error);                                                                                        
      self.postMessage({                                                                                                                               
        type: 'error',                                                                                                                                 
        message: `Worker error: ${error.message || 'Unknown error'}`                                                                                   
      });                                                                                                                                              
    }                                                                                                                                                  
  });                                                                                                                                                  
}                                                                                                                                                     
                                                                                                                                                       
// Initialize the model                                                                                                                                
async function initializeModel(pipeline, env, modelName = 'Xenova/whisper-base') {                                                                                     
  // Configure the environment                                                                                                                         
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

// Handle messages from the main thread                                                                                                                
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

// Use dynamic import for transformers.js in a module worker context                                                                  
                                                                                                                                      
// Define library path                                                                                                                
const TRANSFORMERS_CDN_URL = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';                     
                                                                                                                                      
// Global variables                                                                                                                   
let pipeline = null; // Will be assigned after import                                                                                 
let env = null;      // Will be assigned after import                                                                                 
let asr = null;                                                                                                                       
let isProcessing = false;                                                                                                             
let initializationPromise = null; // To track initialization state 

// Initialize the model                                                                                                                                
async function initializeModel(modelName = 'Xenova/whisper-base') {                                                                   
  // Ensure Transformers library is loaded first                                                                                      
  if (!pipeline || !env) {                                                                                                            
    if (!initializationPromise) {                                                                                                     
    // Start loading if not already started                                                                                         
    initializationPromise = loadTransformersLibrary();                                                                              
    }                                                                                                                                 
    // Wait for loading to complete                                                                                                   
    await initializationPromise;                                                                                                      
  }                                                                                                                                                                                                                                                                       
  // Check again after waiting                                                                                                        
  if (!pipeline || !env) {                                                                                                            
    throw new Error("Transformers library failed to load.");                                                                        
  }                                                                                                                                   
                                                                                       
  // Configure the environment                                                                                                                         
  try {
    // Set environment variables using the imported 'env'                                                                             
    env.allowLocalModels = true;                                                                                                      
    env.useBrowserCache = true;                                                                                                       
    // Set cache directory - but allow it to still use HF Hub if needed
    env.cacheDir = './models'; 
    // Configure CDN backup path
    env.backends = {
      hf: {
        baseUrl: 'https://huggingface.co'
      },
      cdn: {
        baseUrl: 'https://cdn.jsdelivr.net/npm/@xenova/transformers-models@latest'
      }
    };

    env.useQuantizedModels = true; // Default to quantized

    // Send status update
    self.postMessage({ type: 'status', message: 'Loading model...' });
    
    // Load the ASR pipeline with the specified model
    // Use the imported 'pipeline' function
    asr = await pipeline('automatic-speech-recognition', modelName, {
      quantized: true, // Use quantized model for better performance
      // Let transformers.js handle the model configuration
      // Don't override the model file paths

      progress_callback: (progress) => {
        // Report loading progress
        self.postMessage({ 
          type: 'progress', 
          message: 'Loading model...', 
          progress: progress.progress * 100 
        });
      }
    }); // pipeline() call ends here
    
    // Model loaded successfully
    self.postMessage({ 
      type: 'status', 
      message: 'Model loaded successfully',
      modelName: modelName
    });
    
    return true;
  } catch (error) {
    // Report error
    console.error("Model initialization error:", error); // Log detailed error
    // Log all available environment variables to help with debugging
    console.error("Environment configuration:", {
      allowLocalModels: env.allowLocalModels,
      useBrowserCache: env.useBrowserCache,
      cacheDir: env.cacheDir,
      backends: env.backends,
      useQuantizedModels: env.useQuantizedModels
    });
    self.postMessage({                                                                                                                
      type: 'error',                                                                                                                  
      message: `Failed to load model: ${error.message}. Please check browser console for details.`                                                                               
    });
    return false;
  }
}

// Transcribe audio
async function transcribeAudio(audioData, options = {}) {
  if (!asr) {
    // Or alternatively: await initializeModel(); if not initialized 
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
    const transcriptionOptions = { ...defaultOptions, ...(options || {}) }; 
    
    // Start transcription
    self.postMessage({ type: 'status', message: 'Transcribing audio...' });
    
    // Process the audio in chunks with progress updates
    const result = await asr(audioData, { // Ensure audioData is in the correct format (e.g., Float32Array) if needed by the model
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

    console.log("Transcription result:", result); // Log the raw result 
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
    console.error("Transcription error:", error); // Log detailed error                                                               
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
self.onmessage = async (event) => { // Use onmessage directly                                                                         
  const { type, data } = event.data;                                                                                                                    
                                                                                                                                                       
  try {                                                                                                                                                
    switch (type) {                                                                                                                                    
      case 'initialize':                                                                                                                               
        // Ensure library is loaded before initializing model                                                                         
        if (!initializationPromise) {                                                                                                 
          initializationPromise = loadTransformersLibrary();                                                                        
        }                                                                                                                             
        await initializationPromise; // Wait for library load if needed                                                               
        await initializeModel(data?.modelName);                                                                                                        
        break;                                                                                                                                         
                                                                                                                                                       
      case 'transcribe':                                                                                                                               
        if (!asr) { // Ensure model is ready                                                                                          
          console.warn("Transcribe called before model initialization. Initializing now...");                                       
          await initializeModel(data?.modelName); // This will also wait for library load if needed                                                                                                      
        }                                                                                                                                              
        if (asr) { // Check if model loaded successfully                                                                              
           await transcribeAudio(data.audio, data?.options);                                                                         
        } else {                                                                                                                      
          throw new Error("Cannot transcribe: Model failed to initialize.");                                                        
        }                                                                                                
        break;                                                                                                                                         
                                                                                                                                                       
      case 'cancel':                                                                                                                                   
        // TODO: Implement more robust cancellation if possible within Transformers.js                                                                                                         
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
};                                                                                                                                    
                                                                                                                                     
// Function to load the library                                                                                                       
async function loadTransformersLibrary() {                                                                                            
  try {                                                                                                                             
    console.log(`Attempting to import Transformers.js from ${TRANSFORMERS_CDN_URL}`);                                             
    // Check if fetch is available and working
    const preCheck = await fetch(TRANSFORMERS_CDN_URL, { method: 'HEAD' })
      .catch(err => {
        throw new Error(`CDN availability check failed: ${err.message}`);
      });
      
    if (!preCheck.ok) {
      throw new Error(`CDN returned status ${preCheck.status} ${preCheck.statusText}`);
    }
    
    const module = await import(TRANSFORMERS_CDN_URL);                                                                            
    console.log("Transformers.js module loaded:", module);                                                                        
    // Assign the specific exports needed                                                                                         
    pipeline = module.pipeline;                                                                                                   
    env = module.env;                                                                                                             
    if (typeof pipeline !== 'function') {                                                                                         
      throw new Error(`'pipeline' function not found in the imported module. Available keys: ${Object.keys(module)}`);          
    }                                                                                                                             
    self.postMessage({ type: 'status', message: 'Transformers library loaded.' }); // Notify main thread                          
  } catch (error) {                                                                                                                 
    console.error('Failed to dynamically import Transformers.js:', error);                                                        
    self.postMessage({ type: 'error', message: `Failed to load Transformers library: ${error.message}` });                        
    throw error; // Re-throw to prevent further execution attempts                                                                
  }                                                                                                                                 
}                                                                                                                                  
                                                                                                                                      
// --- Initiate library loading immediately when worker starts ---                                                                    
// We don't wait here, but message handler will await initializationPromise                                                           
initializationPromise = loadTransformersLibrary();                                                                                    
                                                                                                                                      
// Notify main thread that the worker script itself has loaded (library loading starts async)                                         
self.postMessage({ type: 'worker_ready' }); // Use a different message than the old 'ready'                                             

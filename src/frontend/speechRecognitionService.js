/**
 * Speech Recognition Service
 * 
 * Provides an interface for transcribing audio using Whisper model via transformers.js
 * Runs in a Web Worker to avoid blocking the UI thread
 */
class SpeechRecognitionService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.isProcessing = false;
    this.callbacks = {
      onStatus: () => {},
      onProgress: () => {},
      onResult: () => {},
      onError: () => {},
      onInterim: () => {}
    };
  }
  
  /**
   * Set callback functions
   * @param {Object} callbacks - Callback functions
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
  
  /**
   * Initialize the speech recognition service
   * @param {Object} options - Initialization options
   * @param {string} options.modelName - Model name (default: 'Xenova/whisper-base')
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // // Create worker - don't use module type since we're using importScripts                                                                               
      // this.worker = new Worker(new URL('./speechRecognition.worker.js', import.meta.url)); 

      // Create worker as type 'module' to allow dynamic import()                                                                     
      this.worker = new Worker(new URL('./speechRecognition.worker.js', import.meta.url), { type: 'module' });
      
      // Set up message handling
      // Set up message handling                                                                                                                       
      this.worker.onmessage = (event) => {                                                                                                             
        try {                                                                                                                                          
          const { type, message, progress, text } = event.data;                                                                                        
                                                                                                                                                       
          console.log('Worker message received:', type, event.data);                                                                                   
                                                                                                                                                       
          switch (type) {                                                                                                                              
            case 'status':                                                                                                                             
              this.callbacks.onStatus(message);                                                                                                        
              break;                                                                                                                                   
                                                                                                                                                       
            case 'progress':                                                                                                                           
              this.callbacks.onProgress(progress);                                                                                                     
              break;                                                                                                                                   
                                                                                                                                                       
            case 'result':                                                                                                                             
              this.isProcessing = false;                                                                                                               
              this.callbacks.onResult(event.data);                                                                                                     
              break;                                                                                                                                   
                                                                                                                                                       
            case 'error':                                                                                                                              
              this.isProcessing = false;                                                                                                               
              this.callbacks.onError(new Error(message || 'Unknown worker error'));                                                                    
              break;                                                                                                                                   
                                                                                                                                                       
            case 'interim':                                                                                                                            
              this.callbacks.onInterim(text);                                                                                                          
              break;                                                                                                                                   
                                                                                                                                                       
            case 'ready':                                                                                                                              
              console.log('Worker is ready, initializing model...');                                                                                   
              // Worker is ready, initialize the model                                                                                                 
              this.worker.postMessage({                                                                                                                
                type: 'initialize',                                                                                                                    
                data: { modelName: options.modelName || 'Xenova/whisper-base' }                                                                        
              });                                                                                                                                      
              break;                                                                                                                                   
                                                                                                                                                       
            default:                                                                                                                                   
              console.warn('Unknown message type from worker:', type);                                                                                 
          }                                                                                                                                            
        } catch (error) {                                                                                                                              
          console.error('Error handling worker message:', error);                                                                                      
          this.callbacks.onError(new Error(`Error handling worker message: ${error.message}`));                                                        
          this.isProcessing = false;                                                                                                                   
        }                                                                                                                                              
      }; 
      
      // Handle worker errors
        // Handle worker errors                                                                                                                              
      this.worker.onerror = (error) => {                                                                                                                   
        // Log the raw event first
        // console.error('Raw Worker error event:', error);
        // Log specific potentially useful properties
        // console.error(`Worker error details: message='${error.message}', filename='${error.filename}', lineno='${error.lineno}', colno='${error.colno}', type='${error.type}'`);
        // Construct a more informative error message if possible
        const errorMessage = error.message ? `Worker error: ${error.message}` : `Worker failed to load/initialize (type: ${error.type}, file: ${error.filename}, line: ${error.lineno})`;
        this.callbacks.onError(new Error(errorMessage));
        this.isProcessing = false;                                                                                                                         
      };
                                                                                                                                       
        // --- Simplified Initialization Wait ---                                                                                       
        // The service is considered "initialized" once the worker script loads.                                                        
        // Model loading happens asynchronously upon first transcribe/initialize call.                                                  
        // We wait for the 'worker_ready' signal from the worker.                                                                       
        await new Promise((resolve, reject) => {                                                                                        
          const timeout = setTimeout(() => {                                                                                            
            reject(new Error('Worker readiness timed out after 30 seconds'));                                                           
          }, 30000); // 30 second timeout for worker script load                                                                        
                                                                                                                                    
          const readyHandler = (event) => {                                                                                             
            try {                                                                                                                       
                // Listen for 'worker_ready' or an early error                                                                            
                if (event.data.type === 'worker_ready') {                                                                                 
                  console.log("Worker script is ready. Library/model loading will be triggered by 'initialize' message.");                
                  clearTimeout(timeout);                                                                                                  
                  this.worker.removeEventListener('message', readyHandler);                                                               
                  this.isInitialized = true; // Mark service as ready to receive commands                                                 
                
                  // Explicitly send initialize message to load the model
                  console.log("Explicitly initializing the model now...");
                  this.worker.postMessage({
                    type: 'initialize',
                    data: { modelName: options.modelName || 'Xenova/whisper-base' }
                  });
                
                  resolve();                                                                                                              
                } else if (event.data.type === 'error') {                                                                                 
                  // Handle errors during initial worker script execution/import attempt                                                  
                  clearTimeout(timeout);                                                                                                  
                  this.worker.removeEventListener('message', readyHandler);                                                               
                  reject(new Error(`Worker initialization error: ${event.data.message || 'Unknown worker error'}`));                      
                }                                                                                                                         
            } catch (error) {                                                                                                           
                clearTimeout(timeout);                                                                                                   
                this.worker.removeEventListener('message', readyHandler);                                                                
                reject(new Error(`Error in worker ready handler: ${error.message}`));                                                    
            }                                                                                                                           
          };                                                                                                                            
                                                                                                                                       
          this.worker.addEventListener('message', readyHandler);                                                                        
        });                                                                                                                             
      // --- End Simplified Initialization Wait ---  
      
      console.log('Speech recognition service initialized');
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      this.callbacks.onError(error);
      throw error;
    }
  }
  
  /**
   * Transcribe audio
   * @param {Blob} audioBlob - Audio blob to transcribe
   * @param {Object} options - Transcription options
   * @returns {Promise<void>}
   */
  async transcribe(audioBlob) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.isProcessing) {
      throw new Error('Already processing audio');
    }
    
    this.isProcessing = true;
    
    try {
      // Convert blob to array buffer
      const arrayBuffer = await this.blobToArrayBuffer(audioBlob);
      
      // Send to worker for processing
      this.worker.postMessage({
        type: 'transcribe',
        data: {
          audio: arrayBuffer,
          options: {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: 'english',
            task: 'transcribe'
          }
        }
      }, [arrayBuffer]); // Transfer the buffer to avoid copying
      
      // The result will be handled by the onmessage event handler
    } catch (error) {
      this.isProcessing = false;
      this.callbacks.onError(error);
      throw error;
    }
  }
  
  /**
   * Convert a Blob to an ArrayBuffer
   * @param {Blob} blob - The blob to convert
   * @returns {Promise<ArrayBuffer>}
   */
  async blobToArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }
  
  /**
   * Cancel ongoing transcription
   */
  cancel() {
    if (this.worker && this.isProcessing) {
      this.worker.postMessage({ type: 'cancel' });
      this.isProcessing = false;
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.isProcessing = false;
  }
}

// Export a singleton instance
export default new SpeechRecognitionService();

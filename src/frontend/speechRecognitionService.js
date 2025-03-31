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
      // Create worker
      // Create worker - don't use module type since we're using importScripts                                                                               
      this.worker = new Worker(new URL('./speechRecognition.worker.js', import.meta.url)); 
      
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
        console.error('Worker error:', error);                                                                                                             
        this.callbacks.onError(new Error(`Worker error: ${error.message || error.type || 'Unknown error'}`));                                              
        this.isProcessing = false;                                                                                                                         
      };
      
            // Wait for initialization to complete                                                                                                           
            await new Promise((resolve, reject) => {                                                                                                         
              const timeout = setTimeout(() => {                                                                                                             
                reject(new Error('Initialization timed out after 60 seconds'));                                                                              
              }, 60000); // 60 second timeout for model loading                                                                                              
                                                                                                                                                             
              const statusHandler = (event) => {                                                                                                             
                try {                                                                                                                                        
                  const { type, message } = event.data;                                                                                                      
                  console.log('Initialization status:', type, message);                                                                                      
                                                                                                                                                             
                  if (type === 'status' && message === 'Model loaded successfully') {                                                                        
                    clearTimeout(timeout);                                                                                                                   
                    this.worker.removeEventListener('message', statusHandler);                                                                               
                    this.isInitialized = true;                                                                                                               
                    resolve();                                                                                                                               
                  } else if (type === 'error') {                                                                                                             
                    clearTimeout(timeout);                                                                                                                   
                    this.worker.removeEventListener('message', statusHandler);                                                                               
                    reject(new Error(message || 'Unknown error during initialization'));                                                                     
                  }                                                                                                                                          
                } catch (error) {                                                                                                                            
                  clearTimeout(timeout);                                                                                                                     
                  this.worker.removeEventListener('message', statusHandler);                                                                                 
                  reject(new Error(`Error in status handler: ${error.message}`));                                                                            
                }                                                                                                                                            
              };                                                                                                                                             
                                                                                                                                                             
              this.worker.addEventListener('message', statusHandler);                                                                                        
            });
      
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

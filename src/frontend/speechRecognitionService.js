/**
 * Speech Recognition Service
 * 
 * Provides an interface for on-device speech recognition using WebAssembly.
 * Handles model management, audio processing, and secure memory handling.
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
   * Initialize the speech recognition service
   * @param {Object} options Configuration options
   * @param {string} options.modelName Model name to use (tiny, base, small)
   * @returns {Promise} Resolves when initialization is complete
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create worker
      this.worker = new Worker(new URL('./speechRecognition.worker.js', import.meta.url), { type: 'module' });
      
      // Set up message handling
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      
      // Initialize the worker with the model
      this.worker.postMessage({
        command: 'init',
        data: { modelName: options.modelName || 'base' }
      });
      
      // Wait for initialization to complete
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Speech recognition initialization timed out'));
        }, 30000); // 30 second timeout
        
        const onMessage = (event) => {
          if (event.data.type === 'ready') {
            this.worker.removeEventListener('message', onMessage);
            clearTimeout(timeout);
            resolve();
          } else if (event.data.type === 'error') {
            this.worker.removeEventListener('message', onMessage);
            clearTimeout(timeout);
            reject(new Error(event.data.error.message));
          }
        };
        
        this.worker.addEventListener('message', onMessage);
      });
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      this.callbacks.onError(error);
      throw error;
    }
  }

  /**
   * Handle messages from the worker
   * @param {MessageEvent} event Worker message event
   */
  handleWorkerMessage(event) {
    const { type, ...data } = event.data;
    
    switch (type) {
      case 'status':
        this.callbacks.onStatus(data.message);
        break;
        
      case 'progress':
        this.callbacks.onProgress(data.progress);
        break;
        
      case 'result':
        this.isProcessing = false;
        this.callbacks.onResult(data.result);
        break;
        
      case 'error':
        this.isProcessing = false;
        this.callbacks.onError(new Error(data.error.message));
        break;
        
      case 'interim':
        this.callbacks.onInterim(data.result);
        break;
    }
  }

  /**
   * Transcribe audio data
   * @param {Blob} audioBlob Audio data as a Blob
   * @returns {Promise<Object>} Transcription result
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
        command: 'transcribe',
        data: { audioData: arrayBuffer }
      }, [arrayBuffer]); // Transfer ownership to avoid copy
      
      // Result will be delivered via handleWorkerMessage
      return new Promise((resolve, reject) => {
        const originalOnResult = this.callbacks.onResult;
        const originalOnError = this.callbacks.onError;
        
        this.callbacks.onResult = (result) => {
          this.callbacks.onResult = originalOnResult;
          this.callbacks.onError = originalOnError;
          originalOnResult(result);
          resolve(result);
        };
        
        this.callbacks.onError = (error) => {
          this.callbacks.onResult = originalOnResult;
          this.callbacks.onError = originalOnError;
          originalOnError(error);
          reject(error);
        };
      });
    } catch (error) {
      this.isProcessing = false;
      this.callbacks.onError(error);
      throw error;
    }
  }

  /**
   * Convert a Blob to an ArrayBuffer
   * @param {Blob} blob The blob to convert
   * @returns {Promise<ArrayBuffer>} The array buffer
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
   * Set callback functions
   * @param {Object} callbacks Callback functions
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.worker) {
      this.worker.postMessage({ command: 'unload' });
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.isProcessing = false;
  }
}

// Export as singleton
const speechRecognitionService = new SpeechRecognitionService();
export default speechRecognitionService;
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
      this.worker = new Worker(new URL('./speechRecognition.worker.js', import.meta.url), { type: 'module' });
      
      // Set up message handling
      this.worker.onmessage = (event) => {
        const { type, message, progress, text } = event.data;
        
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
            this.callbacks.onError(new Error(message));
            break;
            
          case 'interim':
            this.callbacks.onInterim(text);
            break;
            
          case 'ready':
            // Worker is ready, initialize the model
            this.worker.postMessage({ 
              type: 'initialize', 
              data: { modelName: options.modelName || 'Xenova/whisper-base' } 
            });
            break;
        }
      };
      
      // Handle worker errors
      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.callbacks.onError(new Error(`Worker error: ${error.message}`));
        this.isProcessing = false;
      };
      
      // Wait for initialization to complete
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Initialization timed out'));
        }, 60000); // 60 second timeout for model loading
        
        const statusHandler = (event) => {
          const { type, message } = event.data;
          
          if (type === 'status' && message === 'Model loaded successfully') {
            clearTimeout(timeout);
            this.worker.removeEventListener('message', statusHandler);
            this.isInitialized = true;
            resolve();
          } else if (type === 'error') {
            clearTimeout(timeout);
            this.worker.removeEventListener('message', statusHandler);
            reject(new Error(message));
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

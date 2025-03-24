/**
 * Transformers.js Configuration
 * 
 * This file configures the behavior of the Transformers.js library
 * for speech recognition and other NLP tasks.
 */

// Import the env object from transformers.js
import { env } from '@xenova/transformers';

// Configure Transformers.js environment
export function configureTransformers() {
  // Allow loading models from local storage
  env.allowLocalModels = true;
  
  // Use browser cache for models
  env.useBrowserCache = true;
  
  // Set the cache directory for models
  env.cacheDir = './models';
  
  // Enable quantized models for better performance
  env.useQuantizedModels = true;
  
  // Configure model loading timeout (in milliseconds)
  env.modelLoadingTimeout = 60000; // 60 seconds
  
  // Configure local model preferences
  env.localModelPath = './models';
  
  // Configure WASM settings
  env.backends = env.backends || {};
  env.backends.onnx = env.backends.onnx || {};
  env.backends.onnx.wasm = env.backends.onnx.wasm || {};
  env.backends.onnx.wasm.numThreads = 4;
  
  // Configure offline mode
  env.offlineMode = false; // Set to true to prevent any network requests
  
  // Configure model loading progress callback
  env.progressCallback = (progress) => {
    console.log(`Model loading progress: ${Math.round(progress.progress * 100)}%`);
  };
  
  // Return the configured env for use elsewhere
  return env;
}

// Configure speech recognition models
export const speechRecognitionConfig = {
  // Available models in order of increasing accuracy/size
  models: {
    tiny: 'Xenova/whisper-tiny',
    base: 'Xenova/whisper-base',
    small: 'Xenova/whisper-small',
    medium: 'Xenova/whisper-medium'
  },
  
  // Default model to use
  defaultModel: 'Xenova/whisper-base',
  
  // Transcription options
  transcriptionOptions: {
    chunk_length_s: 30,
    stride_length_s: 5,
    language: 'english',
    task: 'transcribe',
    return_timestamps: false
  },
  
  // Medical terminology enhancement
  medicalTerminology: {
    enabled: true,
    // Path to medical terminology dictionary if available
    dictionaryPath: './models/medical-terms.json'
  }
};

// Export default configuration
export default {
  configure: configureTransformers,
  speech: speechRecognitionConfig
};

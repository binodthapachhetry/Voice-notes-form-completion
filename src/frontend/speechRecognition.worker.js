// Web Worker for speech recognition using Whisper.cpp WebAssembly
let whisperModule = null;
let whisperModel = null;
let isModelLoading = false;
let modelLoadPromise = null;

// Configuration
const MODEL_URLS = {
  tiny: './models/whisper-tiny.bin',
  base: './models/whisper-base.bin',
  small: './models/whisper-small.bin'
};

const DEFAULT_MODEL = 'base';

// Initialize the worker
self.onmessage = async function(event) {
  const { command, data } = event.data;
  
  try {
    switch (command) {
      case 'init':
        await initializeWhisper(data?.modelName || DEFAULT_MODEL);
        break;
        
      case 'transcribe':
        if (!whisperModule || !whisperModel) {
          await initializeWhisper(DEFAULT_MODEL);
        }
        const result = await transcribeAudio(data.audioData);
        self.postMessage({ type: 'result', result });
        break;
        
      case 'unload':
        unloadModel();
        break;
        
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: { 
        message: error.message,
        stack: error.stack
      }
    });
  }
};

// Load the Whisper WebAssembly module and model
async function initializeWhisper(modelName = DEFAULT_MODEL) {
  if (isModelLoading) {
    // If already loading, wait for that to complete
    await modelLoadPromise;
    return;
  }
  
  if (whisperModel && whisperModule) {
    // Already loaded
    self.postMessage({ type: 'ready' });
    return;
  }
  
  isModelLoading = true;
  
  // Create a promise we can await elsewhere
  modelLoadPromise = (async () => {
    try {
      self.postMessage({ type: 'status', message: 'Loading Whisper WASM module...' });
      
      // Import the Whisper WASM module
      // Note: In a real implementation, this would be the actual path to the WASM module
      const WhisperModule = await import('./whisper.js');
      whisperModule = await WhisperModule.default();
      
      self.postMessage({ type: 'status', message: `Loading ${modelName} model...` });
      
      // Get the model URL
      const modelUrl = MODEL_URLS[modelName];
      if (!modelUrl) {
        throw new Error(`Unknown model: ${modelName}`);
      }
      
      // Fetch the model
      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch model: ${response.statusText}`);
      }
      
      // Get the model as an ArrayBuffer
      const modelBuffer = await response.arrayBuffer();
      
      // Load the model into Whisper
      self.postMessage({ type: 'status', message: 'Initializing model...' });
      whisperModel = new whisperModule.Model(modelBuffer);
      
      self.postMessage({ type: 'ready' });
    } catch (error) {
      self.postMessage({ 
        type: 'error', 
        error: { 
          message: error.message,
          stack: error.stack
        }
      });
      throw error;
    } finally {
      isModelLoading = false;
    }
  })();
  
  await modelLoadPromise;
}

// Transcribe audio using the loaded model
async function transcribeAudio(audioData) {
  if (!whisperModel || !whisperModule) {
    throw new Error('Whisper model not loaded');
  }
  
  try {
    self.postMessage({ type: 'status', message: 'Processing audio...' });
    
    // Convert audio data to the format expected by Whisper
    // In a real implementation, this would handle format conversion
    // from WebM/Opus to 16kHz mono PCM
    const audioBuffer = prepareAudioData(audioData);
    
    // Create a Whisper context
    const context = new whisperModule.Context(whisperModel);
    
    // Set parameters for medical transcription
    context.setParam('language', 'en');
    context.setParam('translate', false);
    context.setParam('no_context', true);
    context.setParam('single_segment', false);
    context.setParam('print_special', false);
    context.setParam('print_progress', false);
    context.setParam('print_realtime', false);
    context.setParam('print_timestamps', true);
    
    // Process the audio in chunks to provide progress updates
    const CHUNK_SIZE = 30 * 1000; // 30 seconds of audio
    const fullTranscription = [];
    
    // Calculate total chunks
    const totalChunks = Math.ceil(audioBuffer.length / CHUNK_SIZE);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, audioBuffer.length);
      const chunk = audioBuffer.slice(start, end);
      
      // Process chunk
      self.postMessage({ 
        type: 'progress', 
        progress: (i / totalChunks) * 100 
      });
      
      // In a real implementation, this would be the actual Whisper API call
      // const result = context.transcribe(chunk);
      
      // For now, simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate a result for this chunk
      const chunkResult = {
        text: `Chunk ${i + 1} transcription would appear here.`
      };
      
      fullTranscription.push(chunkResult.text);
      
      // Send interim results
      self.postMessage({ 
        type: 'interim', 
        result: fullTranscription.join(' ') 
      });
    }
    
    // Post-process the transcription for medical terminology
    const processedText = postProcessMedicalTerminology(fullTranscription.join(' '));
    
    // Clean up
    context.delete();
    
    self.postMessage({ type: 'status', message: 'Transcription complete' });
    
    return {
      text: processedText,
      language: 'en'
    };
  } catch (error) {
    self.postMessage({ type: 'status', message: 'Transcription failed' });
    throw error;
  }
}

// Prepare audio data for processing
function prepareAudioData(audioData) {
  // In a real implementation, this would:
  // 1. Convert from WebM/Opus to raw PCM
  // 2. Resample to 16kHz if needed
  // 3. Convert to mono if needed
  // 4. Apply preprocessing (noise reduction, normalization)
  
  // For now, just return the data as-is
  return audioData;
}

// Post-process transcription for medical terminology
function postProcessMedicalTerminology(text) {
  // In a real implementation, this would:
  // 1. Correct common medical term errors
  // 2. Apply medical abbreviation expansion
  // 3. Format numbers and units properly
  
  // For now, just return the text as-is
  return text;
}

// Unload the model to free memory
function unloadModel() {
  if (whisperModel) {
    whisperModel.delete();
    whisperModel = null;
  }
  
  // Force garbage collection if available
  if (typeof self.gc === 'function') {
    self.gc();
  }
  
  self.postMessage({ type: 'status', message: 'Model unloaded' });
}

// Secure memory handling
function secureMemoryWipe(buffer) {
  // In a real implementation, this would overwrite the buffer with zeros
  // before releasing it to prevent data leakage
  if (buffer && buffer.byteLength > 0) {
    const view = new Uint8Array(buffer);
    for (let i = 0; i < view.length; i++) {
      view[i] = 0;
    }
  }
}

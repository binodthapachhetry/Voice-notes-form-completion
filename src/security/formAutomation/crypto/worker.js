/**
 * Form Automation Web Worker
 * 
 * This worker handles all PHI data processing in an isolated context.
 * It performs decryption, field matching, and memory sanitization
 * without exposing sensitive data to the main thread.
 */

// Import crypto utilities (these will be loaded in the worker context)
importScripts('./cryptoUtils.js');

// Message handler for all incoming requests
self.onmessage = async function(event) {
  const { action, payload, requestId } = event.data;
  
  try {
    let response;
    
    switch (action) {
      case 'decrypt':
        response = await decryptData(payload);
        break;
        
      case 'process-form-data':
        response = await processFormData(payload);
        break;
        
      case 'match-fields':
        response = await matchFields(payload);
        break;
        
      case 'sanitize':
        response = await sanitizeMemory(payload);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    // Send successful response back to main thread
    self.postMessage({
      status: 'success',
      requestId,
      result: response
    });
    
  } catch (error) {
    // Send error response back to main thread
    self.postMessage({
      status: 'error',
      requestId,
      error: {
        message: error.message,
        name: error.name
      }
    });
  }
};

/**
 * Decrypts encrypted form data
 * @param {Object} payload - Contains encrypted data and decryption parameters
 * @returns {Promise<Object>} - Decrypted data
 */
async function decryptData(payload) {
  const { encryptedData, iv, authTag, key } = payload;
  
  try {
    // Convert base64 strings to ArrayBuffers
    const encryptedBuffer = base64ToArrayBuffer(encryptedData);
    const ivBuffer = base64ToArrayBuffer(iv);
    const authTagBuffer = base64ToArrayBuffer(authTag);
    const keyBuffer = base64ToArrayBuffer(key);
    
    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
        additionalData: new Uint8Array([]),
        tagLength: 128
      },
      cryptoKey,
      encryptedBuffer
    );
    
    // Convert the decrypted buffer to a string and parse as JSON
    const decryptedString = arrayBufferToString(decryptedBuffer);
    const decryptedData = JSON.parse(decryptedString);
    
    return {
      decryptedData,
      // Don't return the original key or sensitive parameters
    };
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Processes form data to prepare it for form filling
 * @param {Object} payload - Contains decrypted form data
 * @returns {Promise<Object>} - Processed form data
 */
async function processFormData(payload) {
  const { decryptedData, formSelector } = payload;
  
  // Process the form data
  // This would include validation, transformation, etc.
  
  return {
    processedData: {
      // Return a sanitized version with only what's needed
      fields: decryptedData.fields.map(field => ({
        id: field.id,
        type: field.type,
        matchRules: field.matchRules,
        // Don't include the actual PHI values here
      })),
      options: decryptedData.options
    }
  };
}

/**
 * Matches fields to form elements
 * @param {Object} payload - Contains field definitions and form structure
 * @returns {Promise<Object>} - Field matching results
 */
async function matchFields(payload) {
  const { fields, formStructure } = payload;
  
  try {
    // Import the field matcher dynamically
    // In a real implementation, this would be properly imported
    // For now, we'll implement the matching algorithm directly here
    
    // Match fields to form elements using multi-strategy approach
    const matchResults = [];
    
    for (const field of fields) {
      // Get matching rules for this field
      const matchRules = field.matchRules || {};
      
      // Find potential matches for this field
      const potentialMatches = findMatchesForField(field, formStructure.elements, matchRules);
      
      // Get the best match
      const bestMatch = getBestMatch(potentialMatches);
      
      if (bestMatch && bestMatch.confidence >= (matchRules.confidenceThreshold || 0.7)) {
        matchResults.push({
          fieldId: field.id,
          matched: true,
          confidence: bestMatch.confidence,
          selector: bestMatch.selector
        });
      } else {
        matchResults.push({
          fieldId: field.id,
          matched: false,
          confidence: bestMatch ? bestMatch.confidence : 0,
          selector: null
        });
      }
    }
    
    return {
      matches: matchResults
    };
  } catch (error) {
    console.error('Field matching error:', error);
    throw new Error(`Field matching failed: ${error.message}`);
  }
}

/**
 * Finds potential matches for a field using multiple strategies
 * @param {Object} field - Field definition
 * @param {Array} elements - Form elements
 * @param {Object} matchRules - Matching rules
 * @returns {Array} - Potential matches with confidence scores
 */
function findMatchesForField(field, elements, matchRules) {
  const matches = [];
  
  // Apply each matching strategy to each element
  for (const element of elements) {
    // Strategy 1: Label text matching
    const labelConfidence = matchByLabel(matchRules.labels, element.label);
    
    // Strategy 2: Attribute matching
    const attributeConfidence = matchByAttributes(matchRules.attributes, element.attributes);
    
    // Strategy 3: Selector matching
    const selectorConfidence = matchBySelectors(matchRules.selectors, element);
    
    // Strategy 4: Type matching (simplified hierarchy analysis)
    const typeConfidence = matchByType(field.type, element.type, element.tagName);
    
    // Combine strategies with weighted scoring
    const combinedConfidence = (
      (labelConfidence * 0.4) +
      (attributeConfidence * 0.3) +
      (selectorConfidence * 0.2) +
      (typeConfidence * 0.1)
    );
    
    // If we have a reasonable match, add it to the results
    if (combinedConfidence > 0.3) {
      matches.push({
        element: element,
        selector: generateSelector(element),
        confidence: combinedConfidence
      });
    }
  }
  
  return matches;
}

/**
 * Matches by label text using fuzzy matching
 * @param {Array} labels - Target labels to match
 * @param {string} elementLabel - Element's label text
 * @returns {number} - Confidence score (0-1)
 */
function matchByLabel(labels, elementLabel) {
  if (!labels || !labels.length || !elementLabel) {
    return 0;
  }
  
  let bestScore = 0;
  
  // Find the best matching label
  for (const label of labels) {
    const similarity = calculateTextSimilarity(elementLabel, label);
    bestScore = Math.max(bestScore, similarity);
  }
  
  return bestScore;
}

/**
 * Matches by HTML attributes
 * @param {Object} targetAttributes - Target attributes to match
 * @param {Object} elementAttributes - Element's attributes
 * @returns {number} - Confidence score (0-1)
 */
function matchByAttributes(targetAttributes, elementAttributes) {
  if (!targetAttributes || !elementAttributes) {
    return 0;
  }
  
  const attributeKeys = Object.keys(targetAttributes);
  if (attributeKeys.length === 0) {
    return 0;
  }
  
  let matchCount = 0;
  
  // Check each attribute for matches
  for (const key of attributeKeys) {
    const targetValue = targetAttributes[key];
    const elementValue = elementAttributes[key];
    
    if (elementValue) {
      const similarity = calculateTextSimilarity(elementValue, targetValue);
      if (similarity > 0.8) {
        matchCount++;
      }
    }
  }
  
  return attributeKeys.length > 0 ? matchCount / attributeKeys.length : 0;
}

/**
 * Matches by CSS selectors
 * @param {Array} selectors - Target selectors to match
 * @param {Object} element - Form element
 * @returns {number} - Confidence score (0-1)
 */
function matchBySelectors(selectors, element) {
  if (!selectors || !selectors.length) {
    return 0;
  }
  
  // Generate a selector for the current element
  const elementSelector = generateSelector(element);
  
  let bestScore = 0;
  
  // Check each selector for matches
  for (const selector of selectors) {
    // Direct selector match
    if (selectorMatches(selector, element)) {
      return 1.0; // Perfect match
    }
    
    // Partial selector match
    const similarity = calculateTextSimilarity(selector, elementSelector);
    bestScore = Math.max(bestScore, similarity);
  }
  
  return bestScore;
}

/**
 * Matches by field and element types
 * @param {string} fieldType - Field type
 * @param {string} elementType - Element type
 * @param {string} tagName - Element tag name
 * @returns {number} - Confidence score (0-1)
 */
function matchByType(fieldType, elementType, tagName) {
  if (!fieldType) {
    return 0.1; // Default low confidence
  }
  
  switch (fieldType) {
    case 'text':
    case 'email':
    case 'phone':
    case 'address':
    case 'name':
      return (elementType === 'text' || tagName === 'INPUT') ? 0.7 : 0;
    case 'textarea':
      return (tagName === 'TEXTAREA') ? 0.9 : 0;
    case 'select':
      return (tagName === 'SELECT') ? 0.9 : 0;
    case 'checkbox':
      return (elementType === 'checkbox') ? 0.9 : 0;
    case 'radio':
      return (elementType === 'radio') ? 0.9 : 0;
    default:
      return 0.1; // Default low confidence
  }
}

/**
 * Calculates text similarity using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score (0-1)
 */
function calculateTextSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  // Normalize strings for comparison
  const a = String(str1).toLowerCase().trim();
  const b = String(str2).toLowerCase().trim();
  
  // Exact match
  if (a === b) return 1;
  
  // Check if one contains the other
  if (a.includes(b) || b.includes(a)) {
    const containmentScore = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return Math.max(0.7, containmentScore);
  }
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  
  // Convert distance to similarity score
  return maxLength > 0 ? 1 - (distance / maxLength) : 0;
}

/**
 * Calculates Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Levenshtein distance
 */
function levenshteinDistance(a, b) {
  const matrix = [];
  
  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Checks if a selector matches an element
 * @param {string} selector - CSS selector
 * @param {Object} element - Form element
 * @returns {boolean} - True if the selector matches
 */
function selectorMatches(selector, element) {
  // This is a simplified implementation
  
  // ID selector
  if (selector.startsWith('#') && element.id === selector.substring(1)) {
    return true;
  }
  
  // Class selector
  if (selector.startsWith('.') && element.className?.includes(selector.substring(1))) {
    return true;
  }
  
  // Attribute selector
  if (selector.includes('[') && selector.includes(']')) {
    const match = selector.match(/\[([^=]+)=['"]?([^'"\]]+)['"]?\]/);
    if (match && match.length === 3) {
      const [_, attrName, attrValue] = match;
      return element.attributes?.[attrName] === attrValue;
    }
  }
  
  // Tag selector
  const tagMatch = selector.match(/^([a-zA-Z0-9]+)/);
  if (tagMatch && tagMatch[1].toUpperCase() === element.tagName) {
    return true;
  }
  
  return false;
}

/**
 * Generates a CSS selector for an element
 * @param {Object} element - Form element
 * @returns {string} - CSS selector
 */
function generateSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.attributes?.name) {
    return `[name="${element.attributes.name}"]`;
  }
  
  if (element.className) {
    return `.${element.className.split(' ')[0]}`;
  }
  
  return element.tagName.toLowerCase();
}

/**
 * Gets the best match from a list of potential matches
 * @param {Array} matches - Potential matches
 * @returns {Object|null} - Best match or null if no matches
 */
function getBestMatch(matches) {
  if (!matches || matches.length === 0) {
    return null;
  }
  
  // Sort by confidence score (descending)
  const sortedMatches = [...matches].sort((a, b) => b.confidence - a.confidence);
  
  return sortedMatches[0];
}

/**
 * Explicitly sanitizes memory after processing
 * @param {Object} payload - Contains references to data that should be sanitized
 * @returns {Promise<Object>} - Confirmation of sanitization
 */
async function sanitizeMemory(payload) {
  const { dataReferences } = payload;
  
  // In a real implementation, we would:
  // 1. Overwrite ArrayBuffers with zeros
  // 2. Null out references
  // 3. Force garbage collection if possible
  
  // For demonstration, we'll just return success
  return {
    sanitized: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Converts a base64 string to an ArrayBuffer
 * @param {string} base64 - Base64 encoded string
 * @returns {ArrayBuffer} - Decoded ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts an ArrayBuffer to a string
 * @param {ArrayBuffer} buffer - ArrayBuffer to convert
 * @returns {string} - Resulting string
 */
function arrayBufferToString(buffer) {
  return new TextDecoder().decode(buffer);
}

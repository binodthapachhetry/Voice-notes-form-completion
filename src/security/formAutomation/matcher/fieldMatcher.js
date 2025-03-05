/**
 * Field Matcher Module
 * 
 * Implements a multi-strategy field matching algorithm for identifying form fields
 * across different EHR systems with confidence scoring.
 */

/**
 * Matches fields to form elements using multiple strategies
 * @param {Array} fields - Field definitions with matching rules
 * @param {Object} formStructure - Structure of the form to match against
 * @returns {Array} - Matching results with confidence scores
 */
export function matchFields(fields, formStructure) {
  if (!fields || !formStructure || !formStructure.elements) {
    return [];
  }
  
  const results = [];
  
  // Process each field
  for (const field of fields) {
    const matches = findMatchesForField(field, formStructure.elements);
    
    // Get the best match
    const bestMatch = getBestMatch(matches);
    
    if (bestMatch) {
      results.push({
        fieldId: field.id,
        matched: bestMatch.confidence >= (field.matchRules?.confidenceThreshold || 0.7),
        confidence: bestMatch.confidence,
        selector: bestMatch.selector,
        element: bestMatch.element
      });
    } else {
      // No match found
      results.push({
        fieldId: field.id,
        matched: false,
        confidence: 0,
        selector: null
      });
    }
  }
  
  return results;
}

/**
 * Finds potential matches for a field using multiple strategies
 * @param {Object} field - Field definition with matching rules
 * @param {Array} elements - Form elements to match against
 * @returns {Array} - Potential matches with confidence scores
 */
function findMatchesForField(field, elements) {
  const matches = [];
  const matchRules = field.matchRules || {};
  
  // Apply each matching strategy
  for (const element of elements) {
    // Strategy 1: Label text matching
    const labelMatch = matchByLabel(field, element, matchRules);
    
    // Strategy 2: Attribute matching
    const attributeMatch = matchByAttributes(field, element, matchRules);
    
    // Strategy 3: Selector matching
    const selectorMatch = matchBySelectors(field, element, matchRules);
    
    // Strategy 4: DOM hierarchy analysis (simplified for now)
    const hierarchyMatch = matchByHierarchy(field, element, matchRules);
    
    // Combine strategies with weighted scoring
    const combinedConfidence = combineConfidenceScores([
      { score: labelMatch.confidence, weight: 0.4 },
      { score: attributeMatch.confidence, weight: 0.3 },
      { score: selectorMatch.confidence, weight: 0.2 },
      { score: hierarchyMatch.confidence, weight: 0.1 }
    ]);
    
    // If we have a reasonable match, add it to the results
    if (combinedConfidence > 0.3) {
      matches.push({
        element: element,
        selector: generateSelector(element),
        confidence: combinedConfidence,
        strategies: {
          label: labelMatch,
          attribute: attributeMatch,
          selector: selectorMatch,
          hierarchy: hierarchyMatch
        }
      });
    }
  }
  
  return matches;
}

/**
 * Matches a field to an element based on label text
 * @param {Object} field - Field definition
 * @param {Object} element - Form element
 * @param {Object} matchRules - Matching rules
 * @returns {Object} - Match result with confidence
 */
function matchByLabel(field, element, matchRules) {
  const labels = matchRules.labels || [];
  if (!labels.length || !element.label) {
    return { confidence: 0, reason: 'No labels to match' };
  }
  
  let bestScore = 0;
  let bestLabel = '';
  
  // Find the best matching label
  for (const label of labels) {
    const similarity = calculateTextSimilarity(element.label, label);
    if (similarity > bestScore) {
      bestScore = similarity;
      bestLabel = label;
    }
  }
  
  return {
    confidence: bestScore,
    matchedLabel: bestLabel,
    reason: bestScore > 0.8 ? 'Strong label match' : 
            bestScore > 0.6 ? 'Moderate label match' : 
            bestScore > 0.3 ? 'Weak label match' : 'Poor label match'
  };
}

/**
 * Matches a field to an element based on HTML attributes
 * @param {Object} field - Field definition
 * @param {Object} element - Form element
 * @param {Object} matchRules - Matching rules
 * @returns {Object} - Match result with confidence
 */
function matchByAttributes(field, element, matchRules) {
  const targetAttributes = matchRules.attributes || {};
  const attributeKeys = Object.keys(targetAttributes);
  
  if (!attributeKeys.length) {
    return { confidence: 0, reason: 'No attributes to match' };
  }
  
  let matchCount = 0;
  let totalAttributes = attributeKeys.length;
  let matchedAttributes = [];
  
  // Check each attribute for matches
  for (const key of attributeKeys) {
    const targetValue = targetAttributes[key];
    const elementValue = element.attributes?.[key];
    
    if (elementValue) {
      const similarity = calculateTextSimilarity(elementValue, targetValue);
      if (similarity > 0.8) {
        matchCount++;
        matchedAttributes.push(key);
      }
    }
  }
  
  const confidence = totalAttributes > 0 ? matchCount / totalAttributes : 0;
  
  return {
    confidence,
    matchedAttributes,
    reason: confidence > 0.8 ? 'Strong attribute match' : 
            confidence > 0.5 ? 'Moderate attribute match' : 
            confidence > 0 ? 'Weak attribute match' : 'No attribute match'
  };
}

/**
 * Matches a field to an element based on CSS selectors
 * @param {Object} field - Field definition
 * @param {Object} element - Form element
 * @param {Object} matchRules - Matching rules
 * @returns {Object} - Match result with confidence
 */
function matchBySelectors(field, element, matchRules) {
  const selectors = matchRules.selectors || [];
  if (!selectors.length) {
    return { confidence: 0, reason: 'No selectors to match' };
  }
  
  // Generate a selector for the current element
  const elementSelector = generateSelector(element);
  
  let bestScore = 0;
  let bestSelector = '';
  
  // Check each selector for matches
  for (const selector of selectors) {
    // Direct selector match
    if (selectorMatches(selector, element)) {
      bestScore = 1.0;
      bestSelector = selector;
      break;
    }
    
    // Partial selector match
    const similarity = calculateSelectorSimilarity(selector, elementSelector);
    if (similarity > bestScore) {
      bestScore = similarity;
      bestSelector = selector;
    }
  }
  
  return {
    confidence: bestScore,
    matchedSelector: bestSelector,
    reason: bestScore > 0.9 ? 'Direct selector match' : 
            bestScore > 0.7 ? 'Strong selector similarity' : 
            bestScore > 0.4 ? 'Partial selector match' : 'Poor selector match'
  };
}

/**
 * Matches a field to an element based on DOM hierarchy
 * @param {Object} field - Field definition
 * @param {Object} element - Form element
 * @param {Object} matchRules - Matching rules
 * @returns {Object} - Match result with confidence
 */
function matchByHierarchy(field, element, matchRules) {
  // This is a simplified implementation
  // In a full implementation, we would analyze parent-child relationships
  
  // For now, we'll just check if the element type matches the field type
  let confidence = 0;
  
  // Check if element type matches field type
  if (field.type && element.type) {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'address':
      case 'name':
        confidence = (element.type === 'text' || element.tagName === 'INPUT') ? 0.7 : 0;
        break;
      case 'textarea':
        confidence = (element.tagName === 'TEXTAREA') ? 0.9 : 0;
        break;
      case 'select':
        confidence = (element.tagName === 'SELECT') ? 0.9 : 0;
        break;
      case 'checkbox':
        confidence = (element.type === 'checkbox') ? 0.9 : 0;
        break;
      case 'radio':
        confidence = (element.type === 'radio') ? 0.9 : 0;
        break;
      default:
        confidence = 0.1; // Default low confidence
    }
  }
  
  return {
    confidence,
    reason: confidence > 0.7 ? 'Element type matches field type' : 
            confidence > 0 ? 'Partial type match' : 'No type match'
  };
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
 * Calculates similarity between two CSS selectors
 * @param {string} selector1 - First selector
 * @param {string} selector2 - Second selector
 * @returns {number} - Similarity score (0-1)
 */
function calculateSelectorSimilarity(selector1, selector2) {
  // This is a simplified implementation
  // In a full implementation, we would parse and compare selector parts
  
  // For now, we'll use text similarity as an approximation
  return calculateTextSimilarity(selector1, selector2);
}

/**
 * Checks if a selector matches an element
 * @param {string} selector - CSS selector
 * @param {Object} element - Form element
 * @returns {boolean} - True if the selector matches
 */
function selectorMatches(selector, element) {
  // This is a simplified implementation
  // In a browser, we would use document.querySelector
  
  // Parse the selector (very basic implementation)
  if (selector.startsWith('#') && element.id === selector.substring(1)) {
    return true;
  }
  
  if (selector.startsWith('.') && element.className?.includes(selector.substring(1))) {
    return true;
  }
  
  if (selector.includes('[') && selector.includes(']')) {
    // Extract attribute name and value
    const match = selector.match(/\[([^=]+)=['"]?([^'"\]]+)['"]?\]/);
    if (match && match.length === 3) {
      const [_, attrName, attrValue] = match;
      return element.attributes?.[attrName] === attrValue;
    }
  }
  
  // Check tag name
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
  // This is a simplified implementation
  // In a full implementation, we would generate a unique selector
  
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.name) {
    return `[name="${element.name}"]`;
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
 * Combines multiple confidence scores with weights
 * @param {Array} scores - Array of {score, weight} objects
 * @returns {number} - Combined confidence score (0-1)
 */
function combineConfidenceScores(scores) {
  if (!scores || scores.length === 0) {
    return 0;
  }
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const { score, weight } of scores) {
    weightedSum += score * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

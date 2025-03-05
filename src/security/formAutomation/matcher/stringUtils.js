/**
 * String Utility Functions for Field Matching
 * 
 * Provides utility functions for string comparison and similarity calculations.
 */

/**
 * Calculates the Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - The Levenshtein distance
 */
export function levenshteinDistance(str1, str2) {
  const a = str1 || '';
  const b = str2 || '';
  
  // Create the matrix
  const matrix = Array(b.length + 1).fill().map(() => Array(a.length + 1).fill(0));
  
  // Initialize the first row and column
  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }
  
  // Fill the matrix
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calculates the similarity between two strings (0-1)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {Object} options - Options for similarity calculation
 * @returns {number} - Similarity score between 0 and 1
 */
export function stringSimilarity(str1, str2, options = {}) {
  const a = (str1 || '').toLowerCase().trim();
  const b = (str2 || '').toLowerCase().trim();
  
  // Handle edge cases
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  
  // Check for containment
  if (a.includes(b) || b.includes(a)) {
    const containmentScore = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return Math.max(0.7, containmentScore);
  }
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  
  // Convert to similarity score
  let similarity = 1 - (distance / maxLength);
  
  // Apply threshold for "close enough" matches
  const threshold = options.threshold || 0.8;
  if (similarity >= threshold) {
    similarity = Math.max(similarity, 0.8); // Boost close matches
  }
  
  return similarity;
}

/**
 * Normalizes a string for comparison
 * @param {string} str - String to normalize
 * @returns {string} - Normalized string
 */
export function normalizeString(str) {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
    .replace(/[^\w\s]/g, ''); // Remove punctuation
}

/**
 * Checks if two strings are semantically similar
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {boolean} - True if strings are semantically similar
 */
export function areStringsSimilar(str1, str2) {
  const similarity = stringSimilarity(str1, str2);
  return similarity >= 0.8;
}

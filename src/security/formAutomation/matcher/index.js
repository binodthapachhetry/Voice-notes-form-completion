/**
 * Field Matcher Module
 * 
 * Exports the field matching functionality for the form automation module.
 */

import { matchFields } from './fieldMatcher.js';
import { stringSimilarity, levenshteinDistance, normalizeString } from './stringUtils.js';

export {
  matchFields,
  stringSimilarity,
  levenshteinDistance,
  normalizeString
};

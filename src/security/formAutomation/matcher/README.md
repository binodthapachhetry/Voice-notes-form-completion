# Form Automation Field Matcher

This directory contains the field matching algorithm for the HIPAA-compliant form automation module.

## Components

- `fieldMatcher.js` - Core field matching algorithm with multi-strategy approach
- `stringUtils.js` - String similarity and comparison utilities
- `index.js` - Module exports

## Field Matching Algorithm

The field matcher uses a multi-strategy approach to identify form fields across different EHR systems:

1. **Label Text Matching**: Uses fuzzy text matching with Levenshtein distance to match field labels
2. **Attribute Matching**: Matches based on HTML attributes like name, id, data-* attributes
3. **Selector Matching**: Matches based on CSS selectors
4. **DOM Hierarchy Analysis**: Examines parent-child relationships in the DOM

Each strategy produces a confidence score, which are combined with weighted averaging to determine the best match.

## Usage

```javascript
import { matchFields } from './matcher';

// Form structure from DOM analysis
const formStructure = {
  elements: [
    {
      tagName: 'INPUT',
      type: 'text',
      id: 'patient-name',
      name: 'patient_name',
      className: 'form-control',
      attributes: {
        name: 'patient_name',
        id: 'patient-name',
        type: 'text'
      },
      label: 'Patient Name'
    },
    // More elements...
  ]
};

// Field definitions with matching rules
const fields = [
  {
    id: 'patientName',
    type: 'text',
    matchRules: {
      selectors: ['#patient-name', 'input[name="patient_name"]'],
      labels: ['Patient Name', 'Full Name', 'Name'],
      attributes: {
        name: 'patient_name',
        id: 'patient-name'
      },
      confidenceThreshold: 0.7
    }
  },
  // More fields...
];

// Match fields to form elements
const results = matchFields(fields, formStructure);
```

## Confidence Scoring

The algorithm uses a confidence scoring system (0-1) to determine match quality:

- **1.0**: Perfect match (exact label or selector match)
- **0.8-0.99**: Strong match (very similar label or attributes)
- **0.6-0.79**: Good match (similar label or multiple attributes match)
- **0.3-0.59**: Weak match (some similarity but not confident)
- **< 0.3**: Poor match (ignored)

The default confidence threshold is 0.7, but can be configured per field.

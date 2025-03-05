/**
 * JSON Schema for Form Automation Configuration
 * 
 * This schema defines the structure of the encrypted form configuration data
 * that will be used by the form automation module to fill web forms securely.
 * 
 * The schema follows HIPAA compliance requirements and includes validation
 * rules to ensure data integrity and security.
 */

const formConfigSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "HIPAA-Compliant Form Configuration",
  description: "Configuration for secure form filling with PHI data",
  type: "object",
  required: ["metadata", "security", "formData"],
  properties: {
    metadata: {
      type: "object",
      required: ["version", "createdAt", "formId", "formName"],
      properties: {
        version: {
          type: "string",
          description: "Schema version for compatibility checking"
        },
        createdAt: {
          type: "string",
          format: "date-time",
          description: "ISO 8601 timestamp of when this configuration was created"
        },
        formId: {
          type: "string",
          description: "Unique identifier for the form template"
        },
        formName: {
          type: "string",
          description: "Human-readable name of the form"
        },
        description: {
          type: "string",
          description: "Optional description of the form's purpose"
        },
        tags: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Optional tags for categorization"
        }
      }
    },
    security: {
      type: "object",
      required: ["encryptionMethod", "iv", "authTag"],
      properties: {
        encryptionMethod: {
          type: "string",
          enum: ["AES-256-GCM"],
          description: "Encryption algorithm used"
        },
        iv: {
          type: "string",
          description: "Base64-encoded initialization vector"
        },
        authTag: {
          type: "string",
          description: "Base64-encoded authentication tag for GCM mode"
        },
        keyDerivation: {
          type: "object",
          description: "Optional key derivation parameters if not using WebAuthn",
          properties: {
            method: {
              type: "string",
              enum: ["PBKDF2", "Argon2id"],
              description: "Key derivation function used"
            },
            salt: {
              type: "string",
              description: "Base64-encoded salt"
            },
            iterations: {
              type: "integer",
              minimum: 100000,
              description: "Number of iterations for key derivation"
            }
          }
        }
      }
    },
    formData: {
      type: "object",
      required: ["encryptedData"],
      properties: {
        encryptedData: {
          type: "string",
          description: "Base64-encoded encrypted form data payload"
        }
      }
    },
    audit: {
      type: "object",
      properties: {
        lastAccessed: {
          type: "string",
          format: "date-time",
          description: "ISO 8601 timestamp of last access"
        },
        accessCount: {
          type: "integer",
          minimum: 0,
          description: "Number of times this configuration has been accessed"
        },
        createdBy: {
          type: "string",
          description: "Identifier of the user who created this configuration"
        }
      }
    }
  }
};

/**
 * Schema for the decrypted form data payload
 * This is the structure of the data after decryption
 */
const decryptedFormDataSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Decrypted Form Data",
  description: "Structure of the decrypted PHI data for form filling",
  type: "object",
  required: ["fields", "options"],
  properties: {
    fields: {
      type: "array",
      description: "Array of field definitions with values",
      items: {
        type: "object",
        required: ["id", "value"],
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for this field"
          },
          value: {
            description: "The value to fill into the form field",
            oneOf: [
              { type: "string" },
              { type: "number" },
              { type: "boolean" },
              { 
                type: "array",
                items: { type: "string" }
              }
            ]
          },
          type: {
            type: "string",
            enum: [
              "text", "number", "date", "select", "radio", "checkbox", 
              "email", "phone", "ssn", "address", "name", "creditCard",
              "password", "textarea", "file", "hidden", "custom"
            ],
            description: "Type of form field for specialized handling"
          },
          matchRules: {
            type: "object",
            description: "Rules for matching this field to form elements",
            properties: {
              selectors: {
                type: "array",
                items: {
                  type: "string",
                  description: "CSS selectors to identify the field"
                }
              },
              labels: {
                type: "array",
                items: {
                  type: "string",
                  description: "Text labels associated with the field"
                }
              },
              attributes: {
                type: "object",
                description: "HTML attributes to match (name, id, etc.)",
                additionalProperties: {
                  type: "string"
                }
              },
              xpath: {
                type: "string",
                description: "XPath expression to locate the field"
              },
              confidenceThreshold: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Minimum confidence score required for a match (0-1)"
              }
            }
          },
          validation: {
            type: "object",
            description: "Validation rules for this field",
            properties: {
              required: {
                type: "boolean",
                description: "Whether this field must be filled"
              },
              pattern: {
                type: "string",
                description: "Regex pattern for validation"
              },
              minLength: {
                type: "integer",
                minimum: 0,
                description: "Minimum length for text fields"
              },
              maxLength: {
                type: "integer",
                minimum: 0,
                description: "Maximum length for text fields"
              },
              min: {
                type: "number",
                description: "Minimum value for numeric fields"
              },
              max: {
                type: "number",
                description: "Maximum value for numeric fields"
              }
            }
          },
          phi: {
            type: "boolean",
            description: "Flag indicating if this field contains PHI",
            default: true
          },
          description: {
            type: "string",
            description: "Human-readable description of this field"
          }
        }
      }
    },
    options: {
      type: "object",
      description: "Global options for form filling",
      properties: {
        fillDelay: {
          type: "object",
          description: "Timing parameters for human-like input",
          properties: {
            min: {
              type: "integer",
              minimum: 0,
              description: "Minimum delay between inputs in ms"
            },
            max: {
              type: "integer",
              minimum: 0,
              description: "Maximum delay between inputs in ms"
            }
          }
        },
        autoSubmit: {
          type: "boolean",
          description: "Whether to automatically submit the form after filling",
          default: false
        },
        submitSelector: {
          type: "string",
          description: "CSS selector for the submit button"
        },
        errorHandling: {
          type: "object",
          properties: {
            retryCount: {
              type: "integer",
              minimum: 0,
              description: "Number of times to retry filling a field on error"
            },
            continueOnError: {
              type: "boolean",
              description: "Whether to continue filling other fields if one fails",
              default: true
            }
          }
        },
        validationBehavior: {
          type: "string",
          enum: ["strict", "lenient", "ignore"],
          description: "How to handle validation failures",
          default: "strict"
        }
      }
    },
    relationships: {
      type: "array",
      description: "Relationships between fields (dependencies, calculations)",
      items: {
        type: "object",
        required: ["type", "sourceField", "targetField"],
        properties: {
          type: {
            type: "string",
            enum: ["dependency", "calculation", "copy"],
            description: "Type of relationship between fields"
          },
          sourceField: {
            type: "string",
            description: "ID of the source field"
          },
          targetField: {
            type: "string",
            description: "ID of the target field"
          },
          condition: {
            type: "string",
            description: "JavaScript expression for conditional relationships"
          },
          formula: {
            type: "string",
            description: "Formula for calculation relationships"
          }
        }
      }
    }
  }
};

export { formConfigSchema, decryptedFormDataSchema };

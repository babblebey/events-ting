/**
 * Custom Field Validation Utilities
 * 
 * Validates custom registration form fields and responses against event-specific schemas.
 * Supports multiple field types (text, textarea, select, checkbox, radio) with
 * comprehensive validation rules.
 * 
 * Custom fields are stored in Event.customData (field definitions) and
 * Attendee.customData (attendee responses).
 */

import { z } from 'zod';

/**
 * Supported custom field types
 */
export const CUSTOM_FIELD_TYPES = [
  'text',
  'textarea',
  'select',
  'checkbox',
  'radio',
] as const;

export type CustomFieldType = typeof CUSTOM_FIELD_TYPES[number];

/**
 * Custom field definition (stored in Event.customData)
 */
export interface CustomFieldDefinition {
  /** Unique identifier for this field */
  id: string;
  /** Display label */
  label: string;
  /** Field type */
  type: CustomFieldType;
  /** Whether response is required */
  required: boolean;
  /** Placeholder text (for text/textarea) */
  placeholder?: string;
  /** Options (for select/radio/checkbox) */
  options?: string[];
  /** Validation regex pattern (for text/textarea) */
  pattern?: string;
  /** Minimum length (for text/textarea) */
  minLength?: number;
  /** Maximum length (for text/textarea) */
  maxLength?: number;
  /** Minimum selections (for checkbox) */
  minSelections?: number;
  /** Maximum selections (for checkbox) */
  maxSelections?: number;
  /** Help text to display below field */
  helpText?: string;
}

/**
 * Custom field response value types
 */
export type CustomFieldValue = string | boolean | string[];

/**
 * Custom field responses (stored in Attendee.customData)
 */
export type CustomFieldResponses = Record<string, CustomFieldValue>;

/**
 * Validation result for a single field
 */
export interface FieldValidationResult {
  /** Whether the field value is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Warning messages (non-blocking) */
  warnings?: string[];
}

/**
 * Validation result for all fields
 */
export interface FormValidationResult {
  /** Whether all fields are valid */
  isValid: boolean;
  /** Map of field ID to validation result */
  fields: Record<string, FieldValidationResult>;
  /** General form-level errors */
  errors: string[];
}

/**
 * Zod schema for custom field definition
 */
export const customFieldDefinitionSchema = z.object({
  id: z.string().min(1, 'Field ID is required'),
  label: z.string().min(1, 'Field label is required'),
  type: z.enum(CUSTOM_FIELD_TYPES),
  required: z.boolean(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  pattern: z.string().optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).optional(),
  minSelections: z.number().int().min(0).optional(),
  maxSelections: z.number().int().min(1).optional(),
  helpText: z.string().optional(),
});

/**
 * Zod schema for array of custom field definitions
 */
export const customFieldDefinitionsSchema = z.array(customFieldDefinitionSchema);

/**
 * Validate a custom field definition.
 * 
 * @param field - The field definition to validate
 * @returns Validation result
 * 
 * @example
 * ```typescript
 * const field = {
 *   id: 'dietary',
 *   label: 'Dietary Restrictions',
 *   type: 'select',
 *   required: false,
 *   options: ['None', 'Vegetarian', 'Vegan'],
 * };
 * const result = validateFieldDefinition(field);
 * // Returns: { isValid: true, ... }
 * ```
 */
export function validateFieldDefinition(
  field: unknown
): FieldValidationResult {
  try {
    customFieldDefinitionSchema.parse(field);
    
    const typedField = field as CustomFieldDefinition;
    
    // Type-specific validations
    if (['select', 'radio', 'checkbox'].includes(typedField.type)) {
      if (!typedField.options || typedField.options.length === 0) {
        return {
          isValid: false,
          error: `Field type '${typedField.type}' requires at least one option`,
        };
      }
    }
    
    if (typedField.type === 'checkbox') {
      if (typedField.minSelections !== undefined && typedField.maxSelections !== undefined) {
        if (typedField.minSelections > typedField.maxSelections) {
          return {
            isValid: false,
            error: 'minSelections cannot be greater than maxSelections',
          };
        }
      }
    }
    
    if (['text', 'textarea'].includes(typedField.type)) {
      if (typedField.minLength !== undefined && typedField.maxLength !== undefined) {
        if (typedField.minLength > typedField.maxLength) {
          return {
            isValid: false,
            error: 'minLength cannot be greater than maxLength',
          };
        }
      }
    }
    
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.errors[0]?.message ?? 'Invalid field definition',
      };
    }
    return {
      isValid: false,
      error: 'Unknown validation error',
    };
  }
}

/**
 * Validate a single field response against its definition.
 * 
 * @param fieldDef - The field definition
 * @param value - The response value to validate
 * @returns Validation result
 * 
 * @example
 * ```typescript
 * const field = { id: 'name', label: 'Name', type: 'text', required: true };
 * const result = validateFieldResponse(field, 'John Doe');
 * // Returns: { isValid: true }
 * ```
 */
export function validateFieldResponse(
  fieldDef: CustomFieldDefinition,
  value: CustomFieldValue | undefined
): FieldValidationResult {
  const warnings: string[] = [];
  
  // Required field validation
  if (fieldDef.required) {
    if (value === undefined || value === null || value === '') {
      return {
        isValid: false,
        error: `${fieldDef.label} is required`,
      };
    }
    
    if (Array.isArray(value) && value.length === 0) {
      return {
        isValid: false,
        error: `${fieldDef.label} requires at least one selection`,
      };
    }
  }
  
  // If not required and no value, it's valid
  if (!fieldDef.required && (value === undefined || value === null || value === '')) {
    return { isValid: true, warnings };
  }
  
  // Type-specific validation
  switch (fieldDef.type) {
    case 'text':
    case 'textarea':
      return validateTextFieldResponse(fieldDef, value, warnings);
      
    case 'select':
    case 'radio':
      return validateSelectFieldResponse(fieldDef, value, warnings);
      
    case 'checkbox':
      return validateCheckboxFieldResponse(fieldDef, value, warnings);
      
    default: {
      const exhaustiveCheck: never = fieldDef.type;
      return {
        isValid: false,
        error: `Unsupported field type: ${String(exhaustiveCheck)}`,
      };
    }
  }
}

/**
 * Validate text/textarea field response
 */
function validateTextFieldResponse(
  fieldDef: CustomFieldDefinition,
  value: CustomFieldValue | undefined,
  warnings: string[]
): FieldValidationResult {
  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: `${fieldDef.label} must be text`,
    };
  }
  
  // Length validation
  if (fieldDef.minLength !== undefined && value.length < fieldDef.minLength) {
    return {
      isValid: false,
      error: `${fieldDef.label} must be at least ${fieldDef.minLength} characters`,
    };
  }
  
  if (fieldDef.maxLength !== undefined && value.length > fieldDef.maxLength) {
    return {
      isValid: false,
      error: `${fieldDef.label} must be at most ${fieldDef.maxLength} characters`,
    };
  }
  
  // Pattern validation
  if (fieldDef.pattern) {
    try {
      const regex = new RegExp(fieldDef.pattern);
      if (!regex.test(value)) {
        return {
          isValid: false,
          error: `${fieldDef.label} format is invalid`,
        };
      }
    } catch {
      warnings.push('Invalid regex pattern in field definition');
    }
  }
  
  return { isValid: true, warnings };
}

/**
 * Validate select/radio field response
 */
function validateSelectFieldResponse(
  fieldDef: CustomFieldDefinition,
  value: CustomFieldValue | undefined,
  warnings: string[]
): FieldValidationResult {
  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: `${fieldDef.label} must be a single selection`,
    };
  }
  
  // Check if value is in options
  if (fieldDef.options && !fieldDef.options.includes(value)) {
    return {
      isValid: false,
      error: `${fieldDef.label} has an invalid selection`,
    };
  }
  
  return { isValid: true, warnings };
}

/**
 * Validate checkbox field response
 */
function validateCheckboxFieldResponse(
  fieldDef: CustomFieldDefinition,
  value: CustomFieldValue | undefined,
  warnings: string[]
): FieldValidationResult {
  if (!Array.isArray(value)) {
    return {
      isValid: false,
      error: `${fieldDef.label} must be an array of selections`,
    };
  }
  
  // Check minimum selections
  if (fieldDef.minSelections !== undefined && value.length < fieldDef.minSelections) {
    return {
      isValid: false,
      error: `${fieldDef.label} requires at least ${fieldDef.minSelections} selection${fieldDef.minSelections !== 1 ? 's' : ''}`,
    };
  }
  
  // Check maximum selections
  if (fieldDef.maxSelections !== undefined && value.length > fieldDef.maxSelections) {
    return {
      isValid: false,
      error: `${fieldDef.label} allows at most ${fieldDef.maxSelections} selection${fieldDef.maxSelections !== 1 ? 's' : ''}`,
    };
  }
  
  // Check if all values are in options
  if (fieldDef.options) {
    const invalidSelections = value.filter(v => !fieldDef.options?.includes(v));
    if (invalidSelections.length > 0) {
      return {
        isValid: false,
        error: `${fieldDef.label} has invalid selections: ${invalidSelections.join(', ')}`,
      };
    }
  }
  
  return { isValid: true, warnings };
}

/**
 * Validate all custom field responses against field definitions.
 * 
 * @param fieldDefinitions - Array of field definitions from Event.customData
 * @param responses - Attendee responses to validate
 * @returns Validation result for all fields
 * 
 * @example
 * ```typescript
 * const fields = [
 *   { id: 'name', label: 'Name', type: 'text', required: true },
 *   { id: 'dietary', label: 'Dietary', type: 'select', required: false, options: ['None', 'Vegan'] },
 * ];
 * const responses = { name: 'John', dietary: 'Vegan' };
 * const result = validateCustomFieldResponses(fields, responses);
 * // Returns: { isValid: true, fields: {...}, errors: [] }
 * ```
 */
export function validateCustomFieldResponses(
  fieldDefinitions: CustomFieldDefinition[],
  responses: CustomFieldResponses
): FormValidationResult {
  const result: FormValidationResult = {
    isValid: true,
    fields: {},
    errors: [],
  };
  
  // Validate each field definition first
  for (const fieldDef of fieldDefinitions) {
    const defValidation = validateFieldDefinition(fieldDef);
    if (!defValidation.isValid) {
      result.errors.push(`Invalid field definition for '${fieldDef.id}': ${defValidation.error}`);
      result.isValid = false;
      continue;
    }
    
    // Validate the response for this field
    const value = responses[fieldDef.id];
    const fieldValidation = validateFieldResponse(fieldDef, value);
    
    result.fields[fieldDef.id] = fieldValidation;
    
    if (!fieldValidation.isValid) {
      result.isValid = false;
    }
  }
  
  // Check for unexpected fields in responses
  const definedFieldIds = new Set(fieldDefinitions.map(f => f.id));
  const responseFieldIds = Object.keys(responses);
  const unexpectedFields = responseFieldIds.filter(id => !definedFieldIds.has(id));
  
  if (unexpectedFields.length > 0) {
    result.errors.push(`Unexpected fields in responses: ${unexpectedFields.join(', ')}`);
  }
  
  return result;
}

/**
 * Create a Zod schema dynamically from custom field definitions.
 * 
 * This allows using Zod validation in tRPC procedures.
 * 
 * @param fieldDefinitions - Array of field definitions
 * @returns Zod object schema for the responses
 * 
 * @example
 * ```typescript
 * const fields = [
 *   { id: 'name', label: 'Name', type: 'text', required: true },
 * ];
 * const schema = createCustomFieldSchema(fields);
 * schema.parse({ name: 'John' }); // Validates successfully
 * ```
 */
export function createCustomFieldSchema(
  fieldDefinitions: CustomFieldDefinition[]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  
  for (const field of fieldDefinitions) {
    let fieldSchema: z.ZodTypeAny;
    
    switch (field.type) {
      case 'text':
      case 'textarea':
        fieldSchema = z.string();
        if (field.minLength) {
          fieldSchema = (fieldSchema as z.ZodString).min(field.minLength);
        }
        if (field.maxLength) {
          fieldSchema = (fieldSchema as z.ZodString).max(field.maxLength);
        }
        break;
        
      case 'select':
      case 'radio':
        if (field.options && field.options.length > 0) {
          fieldSchema = z.enum(field.options as [string, ...string[]]);
        } else {
          fieldSchema = z.string();
        }
        break;
        
      case 'checkbox':
        fieldSchema = z.array(z.string());
        if (field.minSelections) {
          fieldSchema = (fieldSchema as z.ZodArray<z.ZodString>).min(field.minSelections);
        }
        if (field.maxSelections) {
          fieldSchema = (fieldSchema as z.ZodArray<z.ZodString>).max(field.maxSelections);
        }
        break;
        
      default:
        fieldSchema = z.unknown();
    }
    
    // Make optional if not required
    if (!field.required) {
      fieldSchema = fieldSchema.optional();
    }
    
    shape[field.id] = fieldSchema;
  }
  
  return z.object(shape);
}

/**
 * Sanitize custom field responses (trim strings, remove empty values).
 * 
 * @param responses - Raw responses from form
 * @returns Sanitized responses
 * 
 * @example
 * ```typescript
 * const raw = { name: '  John  ', empty: '', dietary: 'Vegan' };
 * const sanitized = sanitizeCustomFieldResponses(raw);
 * // Returns: { name: 'John', dietary: 'Vegan' }
 * ```
 */
export function sanitizeCustomFieldResponses(
  responses: CustomFieldResponses
): CustomFieldResponses {
  const sanitized: CustomFieldResponses = {};
  
  for (const [key, value] of Object.entries(responses)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        sanitized[key] = trimmed;
      }
    } else if (Array.isArray(value)) {
      const filtered = value.filter(v => typeof v === 'string' && v.trim().length > 0);
      if (filtered.length > 0) {
        sanitized[key] = filtered;
      }
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

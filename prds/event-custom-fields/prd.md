# PRD: Event Custom Registration Fields

**Feature ID**: `event-custom-fields`  
**Priority**: P2 (Blocker for User Story 2 - Attendee Information Collection)  
**Status**: Draft  
**Created**: November 19, 2025  
**Related Feature**: `003-ticket-attendee-separation`

---

## Problem Statement

Event organizers need to collect specific information from attendees during ticket assignment (e.g., dietary restrictions, t-shirt sizes, accessibility needs, session preferences). Currently, the Event model lacks a structured way to define custom registration questions that should be answered when tickets are assigned to attendees.

**Current State**:
- Event model has no field to store custom field definitions
- Attendee model has `customData` JSON field to store responses, but no schema to validate against
- UI components (T044-T046) have been implemented but cannot persist custom field configurations
- Assignment form cannot dynamically render custom fields based on event configuration

**Impact**:
- User Story 2 (Attendee Information Collection) is blocked
- Custom field builder UI is non-functional (shows placeholder alert)
- Attendees cannot provide event-specific information during ticket assignment

---

## Goals

### Primary Goals
1. Add `customFields` JSON field to Event model to store field definitions
2. Enable event organizers to define, edit, and delete custom registration fields
3. Provide schema validation for custom field definitions
4. Support 5 field types: text, textarea, select, radio, checkbox
5. Allow marking fields as required or optional

### Success Metrics
- Event organizers can configure custom fields in <2 minutes
- Custom field definitions persist correctly in database
- Assignment form renders custom fields dynamically based on event configuration
- Attendee responses validate against field definitions with 100% accuracy

---

## Scope

### In Scope
- Add `customFields Json?` field to Event Prisma model
- Create database migration for schema change
- Update Event model documentation
- Type definitions for custom field schema
- Validation utilities for field definitions

### Out of Scope
- UI implementation (already completed in T044-T045)
- Attendee response collection (already implemented in T038-T039)
- Response aggregation and export (already implemented in T043)
- Field usage analytics or templates

---

## Requirements

### Functional Requirements

#### FR-001: Custom Fields Storage
**Description**: Event model must store custom field definitions as structured JSON  
**Priority**: P0 (Critical)

```prisma
model Event {
  // ... existing fields
  
  customFields Json? // Array of CustomFieldDefinition objects
  
  // ... rest of model
}
```

**Validation**:
- Field must accept JSON data type
- Field is nullable (events without custom fields have NULL value)
- JSON structure must conform to CustomFieldDefinition schema

---

#### FR-002: Custom Field Definition Schema
**Description**: Define TypeScript type and Zod schema for custom field definitions  
**Priority**: P0 (Critical)

```typescript
// CustomFieldDefinition type
interface CustomFieldDefinition {
  id: string;                // Unique identifier for the field (e.g., "dietary_restrictions")
  label: string;             // Display label (e.g., "Dietary Restrictions")
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox';
  required: boolean;         // Whether field must be filled
  options?: string[];        // For select, radio, checkbox types
  placeholder?: string;      // Placeholder text for text/textarea types
}

// Zod schema for validation
const customFieldDefinitionSchema = z.object({
  id: z.string().min(1).regex(/^[a-zA-Z0-9_]+$/), // Alphanumeric + underscore only
  label: z.string().min(1).max(255),
  type: z.enum(['text', 'textarea', 'select', 'radio', 'checkbox']),
  required: z.boolean(),
  options: z.array(z.string().min(1)).optional(),
  placeholder: z.string().max(500).optional(),
});

const customFieldDefinitionsSchema = z.array(customFieldDefinitionSchema);
```

**Validation Rules**:
- `id` must be unique within the array
- `options` is required for select/radio/checkbox types, must have at least 1 option
- `options` is not allowed for text/textarea types
- `placeholder` only valid for text/textarea types

---

#### FR-003: Event API Update
**Description**: Update event.update tRPC procedure to accept customFields  
**Priority**: P0 (Critical)

```typescript
// Update input schema
const updateEventSchema = z.object({
  id: z.string(),
  // ... existing fields
  customFields: customFieldDefinitionsSchema.optional(),
});

// Update procedure
update: protectedProcedure
  .input(updateEventSchema)
  .mutation(async ({ ctx, input }) => {
    // Validate custom fields if provided
    if (input.customFields) {
      // Ensure no duplicate IDs
      const ids = input.customFields.map(f => f.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Duplicate field IDs are not allowed',
        });
      }
      
      // Validate options for select/radio/checkbox
      for (const field of input.customFields) {
        if (['select', 'radio', 'checkbox'].includes(field.type)) {
          if (!field.options || field.options.length === 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Field '${field.label}' requires at least one option`,
            });
          }
        }
      }
    }
    
    // Update event with validation
    return ctx.db.event.update({
      where: { id: input.id },
      data: input,
    });
  }),
```

---

#### FR-004: Database Migration
**Description**: Generate Prisma migration to add customFields column  
**Priority**: P0 (Critical)

**Migration Steps**:
1. Run: `pnpm db:migrate dev --name add-event-custom-fields`
2. Migration will add nullable JSON column to Event table
3. Existing events will have NULL value (no custom fields configured)

---

#### FR-005: Documentation Update
**Description**: Update Event model documentation to describe customFields usage  
**Priority**: P1 (High)

**File**: `docs/modules/events/data-model.md`

**Content to Add**:
- Field purpose and structure
- Example custom field definitions
- Validation rules
- Relationship to Attendee.customData

---

### Non-Functional Requirements

#### NFR-001: Performance
- Custom fields JSON parsing must complete in <50ms
- Field validation must complete in <100ms
- Database queries with customFields filtering must use proper indexing

#### NFR-002: Data Integrity
- Custom field IDs must be immutable once attendee responses exist
- Deleting a field does not delete existing attendee responses
- Field type changes require manual data migration

#### NFR-003: Scalability
- Support up to 50 custom fields per event
- Each field can have up to 100 options (for select/radio/checkbox)
- JSON column size limit: 64KB (PostgreSQL JSONB)

---

## Technical Design

### Data Model Changes

```prisma
// prisma/schema.prisma

model Event {
  id          String @id @default(cuid())
  // ... existing fields
  
  // Custom registration fields configuration
  customFields Json? // Array of CustomFieldDefinition objects
  
  // ... rest of model
}

// No change to Attendee model - customData already exists
model Attendee {
  // ... existing fields
  customData Json? // Attendee responses to custom fields
  // ... rest of fields
}
```

### Type Definitions

**File**: `src/lib/validators/custom-fields.ts` (already exists, update)

```typescript
import { z } from 'zod';

/**
 * Custom field definition schema
 * Defines the structure of a custom registration field
 */
export const customFieldDefinitionSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_]+$/, {
    message: 'Field ID must contain only letters, numbers, and underscores',
  }),
  label: z.string().min(1).max(255),
  type: z.enum(['text', 'textarea', 'select', 'radio', 'checkbox']),
  required: z.boolean(),
  options: z.array(z.string().min(1).max(500)).min(1).max(100).optional(),
  placeholder: z.string().max(500).optional(),
}).refine((data) => {
  // Options required for select/radio/checkbox
  if (['select', 'radio', 'checkbox'].includes(data.type)) {
    return data.options && data.options.length > 0;
  }
  return true;
}, {
  message: 'Options are required for select, radio, and checkbox field types',
  path: ['options'],
}).refine((data) => {
  // Options not allowed for text/textarea
  if (['text', 'textarea'].includes(data.type)) {
    return !data.options || data.options.length === 0;
  }
  return true;
}, {
  message: 'Options are not allowed for text and textarea field types',
  path: ['options'],
});

/**
 * Array of custom field definitions
 */
export const customFieldDefinitionsSchema = z.array(customFieldDefinitionSchema);

/**
 * TypeScript types
 */
export type CustomFieldDefinition = z.infer<typeof customFieldDefinitionSchema>;
export type CustomFieldDefinitions = z.infer<typeof customFieldDefinitionsSchema>;

/**
 * Custom field responses (stored in Attendee.customData)
 */
export type CustomFieldResponses = Record<string, string | string[] | boolean>;
```

---

## Implementation Plan

### Tasks

#### T001: Update Prisma Schema - ✅ DONE
**Priority**: P0  
**Estimate**: 15 minutes

1. Add `customFields Json?` to Event model in `prisma/schema.prisma`
2. Verify schema syntax with `pnpm prisma validate`

---

#### T002: Generate Database Migration - ✅ DONE
**Priority**: P0  
**Estimate**: 10 minutes

1. Run: `pnpm db:migrate dev --name add-event-custom-fields`
2. Verify migration file created in `prisma/migrations/`
3. Test migration on local database
4. Verify existing events have NULL customFields

---

#### T003: Update Validation Schemas - ✅ DONE
**Priority**: P0  
**Estimate**: 30 minutes

1. Update `src/lib/validators/custom-fields.ts` with refined schema
2. Add duplicate ID validation
3. Add cross-field validation (options based on type)
4. Export TypeScript types

---

#### T004: Update Event Router - ✅ DONE
**Priority**: P0  
**Estimate**: 45 minutes

1. Update `updateEventSchema` in `src/server/api/routers/event.ts`
2. Add custom field validation logic
3. Add duplicate ID check
4. Add options validation for select/radio/checkbox
5. Test with sample payloads

---

#### T005: Update Documentation
**Priority**: P1  
**Estimate**: 30 minutes

1. Update `docs/modules/events/data-model.md`
2. Add customFields field description
3. Add example configurations
4. Document relationship to Attendee.customData
5. Add validation rules and constraints

---

#### T006: Enable UI Components
**Priority**: P0  
**Estimate**: 15 minutes

1. Uncomment customFields access in `src/app/(dashboard)/[id]/settings/registration/page.tsx`
2. Update CustomFieldBuilder save function in `src/components/events/custom-field-builder.tsx`
3. Uncomment customFields access in `src/app/(dashboard)/[id]/attendees/[attendeeId]/page.tsx`
4. Remove placeholder alerts

---

### Timeline
**Total Estimated Time**: 3-4 hours  
**Recommended Execution**: Single session (avoid partial completion)

**Order**:
1. T001 → T002 (Schema + Migration) - 25 minutes
2. T003 → T004 (Validation + API) - 1 hour 15 minutes
3. T006 (Enable UI) - 15 minutes
4. T007 (Testing) - 1 hour
5. T005 (Documentation) - 30 minutes (can be parallel with testing)

---

## Testing Strategy

### Manual QA Checklist
- [ ] Create event without custom fields (customFields = null)
- [ ] Add custom fields via settings page
- [ ] Edit existing custom fields
- [ ] Delete custom fields
- [ ] Reorder custom fields
- [ ] Create field with invalid ID (special characters)
- [ ] Create select field without options (should fail)
- [ ] Create text field with options (should fail or ignore)
- [ ] Create 2 fields with same ID (should fail)
- [ ] Assign ticket and verify custom fields render
- [ ] Submit assignment with custom field responses
- [ ] View attendee detail and verify responses display
- [ ] Export attendees and verify custom field columns

---

## Risks & Mitigation

### Risk 1: Data Migration for Existing Events
**Likelihood**: Medium  
**Impact**: Low  
**Mitigation**: Use nullable field, existing events have NULL (no custom fields)

### Risk 2: JSON Size Limit
**Likelihood**: Low  
**Impact**: Medium  
**Mitigation**: 
- Limit to 50 fields per event
- Limit to 100 options per field
- Add frontend validation to prevent exceeding limits

### Risk 3: Backward Compatibility
**Likelihood**: Low  
**Impact**: Medium  
**Mitigation**: 
- Existing attendee.customData responses remain valid
- UI gracefully handles NULL customFields
- Assignment form works with or without custom fields

### Risk 4: Field ID Changes Breaking Existing Data
**Likelihood**: Medium  
**Impact**: High  
**Mitigation**: 
- Document that field IDs should not be changed once responses exist
- Future enhancement: Add field ID immutability check
- Future enhancement: Add data migration tool for field ID changes

---

## Success Criteria

- [ ] Event model has customFields JSON field in database
- [ ] Migration runs successfully on development database
- [ ] Custom field builder saves/loads field configurations
- [ ] Assignment form renders custom fields dynamically
- [ ] Attendee responses validate correctly
- [ ] Attendee detail view displays custom responses
- [ ] All existing events continue to work (NULL customFields)
- [ ] No TypeScript errors in related files
- [ ] All linting/formatting checks pass

---

## Future Enhancements

### Phase 2 (Not in Scope)
- Field templates (common field sets for different event types)
- Conditional field visibility (show field X if field Y = value)
- Field dependencies and validation rules
- Rich text editor for textarea fields
- File upload field type
- Date/time picker field type
- Field usage analytics (which fields are most common)
- Bulk import/export of field configurations
- Field ID immutability enforcement
- Data migration tool for field schema changes

---

## Appendices

### Appendix A: Example Custom Fields Configuration

```json
[
  {
    "id": "dietary_restrictions",
    "label": "Dietary Restrictions",
    "type": "select",
    "required": false,
    "options": ["None", "Vegetarian", "Vegan", "Gluten-Free", "Halal", "Kosher"]
  },
  {
    "id": "tshirt_size",
    "label": "T-Shirt Size",
    "type": "select",
    "required": true,
    "options": ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    "id": "accessibility_needs",
    "label": "Accessibility Requirements",
    "type": "textarea",
    "required": false,
    "placeholder": "Please describe any accessibility requirements"
  },
  {
    "id": "session_interests",
    "label": "Session Interests",
    "type": "checkbox",
    "required": false,
    "options": ["Web Development", "Mobile Development", "AI/ML", "DevOps", "Security"]
  },
  {
    "id": "experience_level",
    "label": "Experience Level",
    "type": "radio",
    "required": true,
    "options": ["Beginner", "Intermediate", "Advanced", "Expert"]
  }
]
```

### Appendix B: Example Attendee Response

```json
{
  "dietary_restrictions": "Vegan",
  "tshirt_size": "M",
  "accessibility_needs": "Wheelchair access needed",
  "session_interests": ["Web Development", "AI/ML"],
  "experience_level": "Intermediate"
}
```

---

## References

- **Feature Spec**: `specs/003-ticket-attendee-separation/spec.md`
- **Data Model**: `specs/003-ticket-attendee-separation/data-model.md`
- **Contracts**: `specs/003-ticket-attendee-separation/contracts/attendees-router.md`
- **Constitution**: `.specify/memory/constitution.md`
- **Related Tasks**: T036-T046 in `specs/003-ticket-attendee-separation/tasks.md`

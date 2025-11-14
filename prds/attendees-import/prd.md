# PRD: Attendees Import via CSV

**Status**: 🔴 Not Started    
**Priority**: High  
**Created**: November 11, 2025  
**Issue**: [#6 - Implement attendees import feature with CSV file](https://github.com/babblebey/events-ting/issues/6)  
**Milestone**: [YPIT Series G](https://github.com/babblebey/events-ting/milestone/1) - Due November 21, 2025  
**Issue Type**: Feature Enhancement

---

## Problem Statement

### Business Need
Event organizers often collect registration data through external platforms (Google Forms, Typeform, Eventbrite, etc.) before migrating to a dedicated event management system. Currently, there's no way to bulk import existing attendee lists into Events-ting, forcing organizers to either:
1. Manually re-enter each attendee (time-consuming and error-prone)
2. Ask attendees to re-register (poor user experience, reduces conversion)
3. Abandon the system altogether (lost opportunity)

### User Impact
**Primary Users**: Event organizers and administrators  
**Secondary Users**: Attendees (indirectly - ensures their data is properly migrated)

**Current Pain Points**:
- No bulk data import capability
- Must manually create each registration record
- Risk of data entry errors when manually copying information
- Cannot leverage existing registration data from other platforms
- Slows down event setup and onboarding process

### Use Case Scenario
> *YPIT Series G has collected 300 registrations through Google Forms over the past 2 months. The team wants to migrate to Events-ting for check-in management and email communications. Without a CSV import feature, they would need to manually create 300 registration records, taking an estimated 6-8 hours of manual data entry.*

---

## Goals & Success Criteria

### Primary Goals
1. **Enable bulk attendee import** from CSV files with minimal manual intervention
2. **Validate data quality** before import to prevent corrupt or invalid records
3. **Provide clear feedback** on import success, failures, and data issues
4. **Maintain data integrity** with duplicate detection and conflict resolution

### Success Metrics
- ✅ Organizers can import 100+ attendees in under 2 minutes
- ✅ Import validation catches 95%+ of data quality issues before processing
- ✅ Clear error messages for 100% of failed rows
- ✅ Zero duplicate registrations created (with proper handling)

### Out of Scope (MVP)
- ❌ Excel (`.xlsx`) file support (CSV only for MVP)
- ❌ Automated field mapping (manual mapping required)
- ❌ Update existing registrations (create new only)
- ❌ Import other entities (speakers, schedule, etc.)
- ❌ API endpoint for programmatic imports
- ❌ Scheduled/recurring imports

---

## User Stories

### US1: Upload and Preview CSV
**As an** event organizer  
**I want to** upload a CSV file of attendees  
**So that** I can review the data before importing

**Acceptance Criteria**:
- File upload accepts `.csv` files only
- File size limits: 10MB **AND** 10,000 rows (whichever is hit first)
- Preview shows first 10 rows of data
- Display column headers from CSV
- Show total row count
- Checkbox: "Send confirmation emails to imported attendees" (default: unchecked)
- Validation errors displayed before import

---

### US2: Map CSV Fields to System Fields
**As an** event organizer  
**I want to** map CSV columns to system fields  
**So that** data is imported into the correct attributes

**Acceptance Criteria**:
- UI shows dropdown to map each CSV column to system field
- Required fields are clearly marked (`name`, `email`, `ticketTypeId`)
- Optional fields can be left unmapped
- Unmapped columns automatically suggested as custom fields
- Support mapping to custom data fields (stored in `customData` JSON)
- Preserve mapping per event in localStorage (key: `events-ting:import-mapping:{eventId}`)
- Show sample data for each column to aid mapping
- Auto-suggest mappings based on column name matching

---

### US3: Validate Data Before Import
**As an** event organizer  
**I want to** see validation errors before importing  
**So that** I can fix data quality issues in my CSV

**Acceptance Criteria**:
- Email validation (format only, no deliverability check in MVP)
- Required field validation (name, email, ticket type)
- Ticket type existence validation (must exist in event)
- Duplicate detection (two-phase):
  - **Phase 1**: Detect duplicates within CSV file itself
  - **Phase 2**: Check against existing registrations in database
- Row-level error reporting with specific issues
- Warning (not blocking): "245 valid rows will be imported. 2 invalid rows will be skipped."
- Import button enabled even with errors (imports valid rows only)
- Download validation report as CSV with all errors

---

### US4: Execute Import with Feedback
**As an** event organizer  
**I want to** see real-time progress during import  
**So that** I know the operation is working and when it completes

**Acceptance Criteria**:
- Indeterminate progress spinner during processing (MVP: simulated, not real-time)
- Success notification with summary upon completion
- Results display: successful count, failed count, skipped duplicates count
- Detailed log of failures with specific errors
- Option to download failed rows as CSV for correction
- Auto-generated registration codes for all imported attendees
- Confirmation emails sent only if checkbox was enabled in Step 1

---

### US5: Handle Duplicates Intelligently
**As an** event organizer  
**I want to** control how duplicate registrations are handled  
**So that** I don't create duplicate records or lose data

**Acceptance Criteria**:
- Detect duplicates by email + eventId combination
- Duplicate handling strategies:
  - **Skip**: Ignore duplicate rows (default)
  - **Update**: Update existing registration (out of scope for MVP)
  - **Create New**: Create duplicate (with warning)
- Display duplicate detection summary before import
- Allow user to choose strategy per import

---

## Technical Design

### Architecture Decisions

#### Router Organization
Import procedures will be organized in a **new `attendeesRouter`** (`src/server/api/routers/attendees.ts`), separate from the existing `registrationRouter`. This separation:
- Keeps organizer-focused features distinct from public registration flows
- Allows independent evolution of import functionality
- Maintains clear separation of concerns

#### File Size Limits
**Dual limits** applied (whichever is hit first):
- **10,000 rows maximum** - Prevents performance issues and database load
- **10MB file size maximum** - Prevents memory issues during parsing

#### Transaction Strategy
**Partial commit approach**: Import will commit successful rows and report failures, rather than all-or-nothing rollback. This allows:
- Organizers to import valid data immediately
- Failed rows to be fixed and re-imported separately
- Better user experience for large imports with minor issues

#### Duplicate Detection
**Two-phase detection**:
1. **In-file duplicates**: Detect same email appearing multiple times within CSV
2. **Database duplicates**: Check against existing registrations for the event
- Both detected during validation step before import begins

#### Progress Feedback
**Simulated progress** for MVP (not real-time streaming):
- Show indeterminate progress spinner during processing
- Display final results upon completion
- Phase 2: Add WebSocket/SSE for true real-time updates on large imports

---

### Data Model

No new database tables required. Import operations will be stateless and process CSV files on-the-fly without persisting import metadata.

**Registration Code Generation**: All imported attendees will receive auto-generated unique registration codes (stored in `customData.registrationCode`), consistent with manual registrations.

**Custom Data Structure**: Unmapped CSV columns will be stored in `customData` JSON field:
```json
{
  "registrationCode": "ABC123DEF",
  "company": "Acme Corp",
  "role": "Developer"
}
```
Note: Column names stored without `custom_` prefix in JSON.

---

### System Architecture

#### Component Hierarchy
```
/dashboard/[id]/attendees/import
└── ImportWizard (Client Component)
    ├── Step 1: FileUploadStep
    │   └── FileDropzone
    ├── Step 2: FieldMappingStep
    │   ├── ColumnMappingTable
    │   └── MappingPreview
    ├── Step 3: ValidationStep
    │   ├── ValidationSummary
    │   └── ValidationErrorsTable
    └── Step 4: ImportStep
        ├── ImportProgress
        └── ImportResults
```

#### API Design

##### New Router: `attendeesRouter`

**File**: `src/server/api/routers/attendees.ts`  
**Exports**: `attendeesRouter`

This new router handles all import-related operations, separate from the public `registrationRouter`.

##### tRPC Procedures

**1. `attendees.parseCSV` (mutation)**
```typescript
Input: {
  eventId: string;
  file: File; // handled via upload endpoint
}
Output: {
  columns: string[];
  preview: Record<string, string>[];
  totalRows: number;
  suggestedMapping: Record<string, string>;
}
```

**2. `attendees.validateImport` (mutation)**
```typescript
Input: {
  eventId: string;
  fileData: ParsedCSVData;
  fieldMapping: Record<string, string>;
  duplicateStrategy: 'skip' | 'create';
}
Output: {
  validRows: number;
  invalidRows: number;
  duplicates: number;
  errors: Array<{
    row: number;
    field: string;
    value: string;
    error: string;
  }>;
}
```

**3. `attendees.executeImport` (mutation)**
```typescript
Input: {
  eventId: string;
  fileData: ParsedCSVData;
  fieldMapping: Record<string, string>;
  duplicateStrategy: 'skip' | 'create';
}
Output: {
  successCount: number;
  failureCount: number;
  duplicateCount: number;
  errors: Array<{
    row: number;
    field: string;
    value: string;
    error: string;
  }>;
  status: 'completed' | 'failed';
  errorMessage?: string;
}
```

---

### File Upload Flow

#### Option 1: Direct Upload to tRPC (Simple, MVP)
```typescript
// Client uploads file as base64
const fileBase64 = await readFileAsBase64(file);
const result = await api.attendees.parseCSV({
  eventId,
  fileData: fileBase64,
});
```

**Pros**: Simple, no external services  
**Cons**: Size limitations (10MB max), slow for large files

#### Option 2: Upload to Storage First (Recommended for Production)
```typescript
// 1. Get signed upload URL
const { uploadUrl, fileKey } = await api.attendees.getUploadUrl({
  eventId,
  fileName: file.name,
});

// 2. Upload to S3/Cloudflare R2
await uploadToStorage(uploadUrl, file);

// 3. Process uploaded file
const result = await api.attendees.parseCSV({
  eventId,
  fileKey,
});
```

**Pros**: Scalable, supports large files, better UX  
**Cons**: Requires storage service setup

**MVP Decision**: Use Option 1, migrate to Option 2 post-launch

---

### Validation Rules

#### Field-Level Validation
| Field | Validation Rules |
|-------|------------------|
| `email` | Required, valid email format, max 255 chars |
| `name` | Required, min 2 chars, max 255 chars |
| `ticketTypeId` | Required, must exist in event's ticket types |
| `paymentStatus` | Optional, enum: 'free', 'pending', 'paid', 'failed', 'refunded' |
| `emailStatus` | Optional, enum: 'active', 'bounced', 'unsubscribed' |
| `customData` | Optional, valid JSON structure |

#### Row-Level Validation
- At least one row must be valid (can't import empty file)
- Maximum 10,000 rows AND 10MB file size (dual limits, whichever is hit first)
- All required fields must be mapped
- Ticket type must belong to the event

#### Business Logic Validation
- **Duplicate detection** (two-phase):
  - In-file: Same email appears multiple times within CSV
  - Database: `email + eventId` combination against existing registrations
- **Email validation**: Format only (regex), no deliverability API calls in MVP
- **Ticket availability check**: Show warning if importing more than available quantity, but allow import (not blocking)

---

### Error Handling

#### User-Facing Errors
| Error Type | Message | Resolution |
|------------|---------|------------|
| Invalid file format | "Please upload a CSV file (.csv)" | Change file format |
| File too large | "File exceeds 10MB limit. Please split into smaller files" | Split file |
| Missing required field | "Column 'email' is required but not found in CSV" | Add column to CSV |
| Invalid email format | "Row 12: Invalid email format 'invalid@email'" | Fix email in CSV |
| Ticket type not found | "Row 8: Ticket type 'VIP' does not exist" | Create ticket type or fix CSV |
| Duplicate detected | "Row 15: Email 'john@example.com' already registered" | Remove duplicate or choose 'create' strategy |

#### System Errors
- Database connection failures → Retry logic with exponential backoff
- Timeout errors (large imports) → Background job processing
- Storage upload failures → Retry with signed URL regeneration

---

### Security Considerations

#### Access Control
- ✅ Only event organizers can import attendees (verify `event.organizerId === session.user.id`)
- ✅ File upload endpoints require authentication

#### Data Privacy
- ✅ CSV files are processed in-memory and not persisted to disk
- ✅ No storage of uploaded files or import history
- ✅ PII is only written to the database as registration records

#### Input Sanitization
- ✅ CSV injection prevention (strip formulas: `=`, `+`, `-`, `@`)
- ✅ HTML/script injection prevention in text fields
- ✅ File type verification (magic number check, not just extension)
- ✅ Rate limiting: 10 imports per event per hour

---

## Implementation Plan

### Phase 1: File Upload & Parsing (Day 1, 4-5 hours)
- [x] Create new `attendeesRouter` in `src/server/api/routers/attendees.ts`
- [x] Create tRPC procedure `attendees.parseCSV`
- [x] Implement CSV parsing using `papaparse`
- [x] Extract column headers and preview data (first 10 rows)
- [x] Implement smart field mapping suggestions (fuzzy column name matching)
- [x] Add dual file validation: 10MB **AND** 10,000 rows limit
- [x] Add format validation (CSV only, UTF-8 encoding, BOM stripping)
- [x] Create error handling for malformed CSV
- [x] Create static CSV template file in `/public/templates/attendees-import-template.csv`

**Deliverable**: API endpoint that parses CSV and returns preview + CSV template file

---

### Phase 2: Validation Engine (Day 1-2, 5-6 hours)
- [ ] Create tRPC procedure `attendees.validateImport`
- [ ] Implement field-level validation (email format, name length, ticket type)
- [ ] Implement two-phase duplicate detection:
  - Phase 1: In-file duplicates (same email multiple times)
  - Phase 2: Database duplicates (email + eventId against existing registrations)
- [ ] Build validation error reporting structure (row number, field, error message)
- [ ] Add ticket type existence check (must exist in event)
- [ ] Add ticket availability warning (non-blocking)
- [ ] Test with various CSV samples (valid, invalid, in-file duplicates, db duplicates)

**Deliverable**: Validation engine with comprehensive two-phase error reporting

---

### Phase 3: Import Execution (Day 2-3, 5-6 hours)
- [ ] Create tRPC procedure `attendees.executeImport`
- [ ] Implement batch insert with **partial commit** strategy (commit successful rows, skip failed)
- [ ] Generate unique registration codes for all imported attendees
- [ ] Handle duplicate strategies (skip/create, default: skip)
- [ ] Store unmapped columns in `customData` JSON (without `custom_` prefix)
- [ ] Add optional confirmation email sending (controlled by checkbox from Step 1)
- [ ] Add error recovery (continue processing after individual row failures)
- [ ] Return detailed import results (success/failure/skipped counts, per-row errors)

**Deliverable**: Fully functional import execution with partial commit

---

### Phase 4: UI Components (Day 3-5, 8-10 hours)
- [ ] Create `ImportWizard` component with multi-step flow
- [ ] **Step 1**: File upload dropzone with drag & drop
  - [ ] Add "Download CSV Template" button
  - [ ] Add "Send confirmation emails" checkbox (default: unchecked)
  - [ ] Show dual file limits (10MB AND 10,000 rows)
- [ ] **Step 2**: Field mapping interface with dropdowns
  - [ ] Auto-suggest mappings based on column names
  - [ ] Load saved mappings from localStorage (`events-ting:import-mapping:{eventId}`)
  - [ ] Save mappings to localStorage on proceed
  - [ ] Show sample data for each column
  - [ ] Display custom field option for unmapped columns
- [ ] **Step 3**: Validation results table with error details
  - [ ] Show validation summary (valid/invalid/duplicates)
  - [ ] Enable "Import" button even with errors (with warning message)
  - [ ] Add "Download Error Report" button
  - [ ] Display both in-file and database duplicates
- [ ] **Step 4**: Import progress with simulated feedback
  - [ ] Indeterminate spinner during processing (not real-time)
  - [ ] Display final results upon completion
  - [ ] Option to download failed rows CSV
- [ ] Implement responsive design for mobile
- [ ] Add loading states and optimistic UI updates

**Deliverable**: Complete import wizard UI with all clarified features

---

### Phase 5: Integration & Navigation (Day 5, 2-3 hours)
- [ ] Add "Import Attendees" button to attendees list page
- [ ] Create route `/dashboard/[id]/attendees/import`
- [ ] Add navigation breadcrumbs
- [ ] Update attendees list to refresh after import
- [ ] Implement success/failure toast notifications

**Deliverable**: Integrated import flow in dashboard

---

### Phase 6: Testing (Day 6, 4-5 hours)
- [ ] Write unit tests for validation functions
- [ ] Write integration tests for tRPC procedures
- [ ] Test with various CSV samples:
  - Valid data (100 rows)
  - Invalid emails
  - Missing required fields
  - Duplicate entries
  - Large file (5000+ rows)
  - Edge cases (empty file, 1 row, special characters)
- [ ] Test error handling and rollback scenarios
- [ ] Test UI responsiveness and loading states
- [ ] Manual QA testing of full import workflow

**Deliverable**: Test coverage >80%, passing E2E tests

---

### Phase 7: Documentation & Polish (Day 6-7, 4-5 hours)

#### Code Documentation
- [ ] Write user-facing documentation for import feature
- [ ] Create CSV template download with example data
- [ ] Add inline help text and tooltips in UI
- [ ] Document API endpoints in code (JSDoc comments)
- [ ] Create troubleshooting guide for common errors

#### Module Documentation Updates
- [ ] **Update `docs/modules/attendees/README.md`**:
  - Add "CSV Import" to Features list
  - Add import workflow to Getting Started section
  - Add CSV format specification reference
  - Update Feature Coverage to include FR-019 (Import)
  - Add to Future Enhancements: Excel import, update existing records, API endpoint
  
- [ ] **Update `docs/modules/attendees/backend.md`**:
  - Document new `attendeesRouter` location and purpose
  - Document `attendees.parseCSV` procedure (input, output, usage, smart mapping)
  - Document `attendees.validateImport` procedure (two-phase validation, error format)
  - Document `attendees.executeImport` procedure (partial commit strategy, duplicate strategies)
  - Add CSV parsing section with dual file size limits (10MB AND 10,000 rows)
  - Add registration code generation for imports
  - Add import error handling patterns
  - Update performance considerations for large imports
  
- [ ] **Update `docs/modules/attendees/frontend.md`**:
  - Document `ImportWizard` component and its steps
  - Document `FileUploadStep`, `FieldMappingStep`, `ValidationStep`, `ImportProgressStep` components
  - Add CSV import UI flow diagrams
  - Document import button location and navigation
  - Add loading states for import operations
  - Document CSV template download feature
  
- [ ] **Update `docs/modules/attendees/workflows.md`**:
  - Add "Workflow 8: Import Attendees from CSV" (complete step-by-step)
  - Add field mapping best practices
  - Add duplicate handling scenarios
  - Add CSV format requirements and validation rules
  - Add error resolution workflows
  - Add CSV preparation tips for organizers
  
- [ ] **Update `docs/modules/attendees/data-model.md`**:
  - Document CSV field mapping to Registration model
  - Add customData format for imported fields
  - Add validation constraints for imported data
  - Note: No schema changes required (uses existing Registration model)

#### General Documentation Updates
- [ ] **Update `docs/getting-started.md`**:
  - No changes needed (import is an advanced feature, not setup)
  
- [ ] **Update `docs/troubleshooting.md`** (if exists):
  - Add "CSV Import Issues" section
  - Common import errors and resolutions
  - File format troubleshooting
  - Validation error explanations

**Deliverable**: Complete documentation coverage for CSV import feature

---

## CSV Format Specification

### Required Columns
These columns must be present and mapped:
- `name` - Full name of attendee
- `email` - Valid email address
- `ticketType` - Name or ID of ticket type

### Optional Columns
These columns can be included and will be imported if mapped:
- `paymentStatus` - Payment status (default: 'free')
- `emailStatus` - Email deliverability status (default: 'active')
- `registeredAt` - Registration date (ISO 8601 format)
- `custom_*` - Any column prefixed with `custom_` will be stored in `customData` JSON

### Example CSV
```csv
name,email,ticketType,paymentStatus,custom_company,custom_role
John Doe,john@example.com,General Admission,free,Acme Corp,Developer
Jane Smith,jane@example.com,VIP,paid,TechCo,Designer
Bob Johnson,bob@example.com,Early Bird,free,StartupXYZ,Founder
```

### CSV Template Download
Provide a downloadable template with:
- Header row with all supported columns
- 2-3 sample rows with example data
- Inline comments explaining each field

---

## UI/UX Mockups

### Import Wizard - Step 1: Upload
```
┌────────────────────────────────────────────────────────┐
│ Import Attendees                                    [X] │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Step 1 of 4: Upload CSV File                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │                                                  │  │
│  │           📁 Drag & drop CSV file here          │  │
│  │                  or click to browse             │  │
│  │                                                  │  │
│  │         Supported format: .csv (max 10MB)       │  │
│  │                                                  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  [Download CSV Template]                                │
│                                                         │
│                                        [Cancel] [Next >]│
└────────────────────────────────────────────────────────┘
```

### Import Wizard - Step 2: Field Mapping
```
┌────────────────────────────────────────────────────────┐
│ Import Attendees                                    [X] │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Step 2 of 4: Map CSV Fields                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                         │
│  File: attendees.csv (247 rows)                        │
│                                                         │
│  CSV Column          →  System Field      Sample Data  │
│  ─────────────────────  ───────────────   ───────────  │
│  Full Name           →  [Name ▼]         John Doe     │
│  Email Address       →  [Email ▼]        john@ex...   │
│  Ticket              →  [Ticket Type ▼]  General      │
│  Company             →  [Custom Field ▼] Acme Corp    │
│  Payment             →  [Payment Status ▼] free       │
│                                                         │
│  ⚠ Required fields: Name, Email, Ticket Type           │
│                                                         │
│                                  [< Back] [Cancel] [Next >]│
└────────────────────────────────────────────────────────┘
```

### Import Wizard - Step 3: Validation
```
┌────────────────────────────────────────────────────────┐
│ Import Attendees                                    [X] │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Step 3 of 4: Validate Data                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                         │
│  Validation Summary                                     │
│  ✅ Valid rows: 245                                    │
│  ⚠ Invalid rows: 2                                     │
│  🔄 Duplicates detected: 3                             │
│                                                         │
│  Errors:                                                │
│  Row 12: Invalid email format 'john@invalid'           │
│  Row 45: Ticket type 'Super VIP' not found             │
│                                                         │
│  Duplicate Handling: [Skip duplicates ▼]               │
│                                                         │
│  [Download Error Report]                                │
│                                                         │
│  ℹ Only valid rows will be imported                   │
│                                                         │
│                                  [< Back] [Cancel] [Import]│
└────────────────────────────────────────────────────────┘
```

### Import Wizard - Step 4: Progress
```
┌────────────────────────────────────────────────────────┐
│ Import Attendees                                    [X] │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Step 4 of 4: Importing...                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                         │
│  ⏳ Importing attendees...                             │
│                                                         │
│  Progress: ████████████████░░░░ 78% (192/245)         │
│                                                         │
│  ✅ Successful: 190                                    │
│  ⚠ Failed: 2                                           │
│  🔄 Skipped (duplicates): 3                            │
│                                                         │
│  Please don't close this window...                     │
│                                                         │
│                                                [Cancel]  │
└────────────────────────────────────────────────────────┘
```

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Large file timeout (5000+ rows) | Medium | High | Implement background job processing with status polling |
| Memory issues with file parsing | Low | Medium | Stream CSV parsing instead of loading entire file |
| Database transaction deadlocks | Low | High | Batch inserts with retry logic, use advisory locks |
| CSV encoding issues (UTF-8 BOM) | Medium | Low | Auto-detect encoding, strip BOM characters |
| Duplicate detection false negatives | Low | Medium | Normalize emails (lowercase, trim), test thoroughly |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Users import wrong event data | Medium | Medium | Confirm event name before import, allow undo/delete |
| Data privacy concerns with PII | Low | High | Document data handling, provide clear privacy policy |
| Confusion with field mapping | High | Low | Smart auto-mapping, helpful tooltips, sample data preview |
| Import failures frustrate users | Medium | Medium | Clear error messages, downloadable error reports |

---

## Dependencies

### External Libraries
- **CSV Parsing**: `papaparse` (^5.4.1) - Client & server-side CSV parsing
- **File Upload**: `react-dropzone` (^14.2.3) - File upload UI component
- **Progress Tracking**: Built-in with React state

### Internal Dependencies
- ✅ Event Management System (must exist)
- ✅ Ticket Types (must be created before import)
- ✅ Registration System (imports create registrations)
- ✅ Authentication (organizer access control)

### Infrastructure Requirements
- Database: PostgreSQL (existing)
- Storage: None required (in-memory processing only)
- Background Jobs: None required (synchronous processing)

---

## Post-Launch Improvements

### Phase 2 Enhancements (Post-YPIT)
1. **Update Existing Registrations**: Allow updating instead of only creating
2. **Excel Support**: Accept `.xlsx` files in addition to CSV
3. **Background Processing**: Long imports run as background jobs
4. **Auto-Mapping Memory**: Remember field mappings per event (localStorage)
5. **Advanced Duplicate Handling**: Merge strategies, custom conflict resolution
6. **Validation Rules**: Custom validation rules per event
7. **Dry Run Mode**: Preview import without committing changes
8. **Import History**: Track past imports with audit logs (if needed later)

### Future Integrations
- **Eventbrite Import**: Direct API integration to pull registrations
- **Google Sheets Import**: Import directly from Google Sheets URL
- **Zapier Integration**: Automated imports from form submissions
- **API Endpoint**: Allow programmatic imports via REST API

---

## Success Metrics & KPIs

### Quantitative Metrics (Week 1 Post-Launch)
- ✅ **Adoption**: 80%+ of events use import feature at least once
- ✅ **Performance**: Average import time <30 seconds for 100 rows
- ✅ **Success Rate**: 95%+ of imports complete successfully
- ✅ **Error Resolution**: 90%+ of validation errors are fixed and re-imported

### Qualitative Metrics
- ✅ **User Satisfaction**: 4+ star rating in post-feature survey
- ✅ **Support Tickets**: <5 support tickets related to import feature
- ✅ **Usability**: Users complete first import without documentation

### Business Impact
- ✅ **Onboarding Time**: Reduce event setup time by 60%
- ✅ **Data Accuracy**: Reduce manual entry errors by 90%
- ✅ **Conversion**: Increase event creation completion rate by 25%

---

## Testing Strategy

### Unit Tests
- CSV parsing with various formats (comma, semicolon, tab-delimited)
- Validation functions for each field type
- Duplicate detection logic
- Field mapping transformation
- Error message generation

### Integration Tests
- tRPC procedure end-to-end flows
- Database transaction handling
- File upload and storage
- Import log creation and updates

### E2E Tests
- Complete import wizard flow (upload → map → validate → import)
- Error handling scenarios (invalid file, validation errors)
- Duplicate handling strategies
- Import results display

### Manual QA Checklist
- [ ] Upload various CSV formats (Excel export, Google Sheets export, etc.)
- [ ] Test with special characters in names (accents, emojis)
- [ ] Test with international characters (Chinese, Arabic, Hebrew)
- [ ] Test mobile responsiveness
- [ ] Test with slow network (throttling)
- [ ] Test with real YPIT registration data (production-like)

---

## Launch Checklist

### Pre-Launch (Before November 21, 2025)
- [ ] All phases completed and tested
- [ ] Documentation published
- [ ] CSV template available for download
- [ ] Performance testing with 5000+ rows
- [ ] Security audit completed
- [ ] Error handling verified
- [ ] Staging deployment successful
- [ ] Team training completed

### Launch Day
- [ ] Deploy to production
- [ ] Monitor error logs for first 2 hours
- [ ] Test with real YPIT data
- [ ] Verify import history is accessible
- [ ] Send announcement to organizers

### Post-Launch (Week 1)
- [ ] Collect user feedback
- [ ] Monitor success/failure rates
- [ ] Review support tickets
- [ ] Identify quick wins for improvement
- [ ] Document lessons learned

---

## Estimated Effort

**Total Development Time**: 6-7 days (48-56 hours)

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: File Upload & Parsing | 4-5 hours | None |
| Phase 2: Validation Engine | 5-6 hours | Phase 1 |
| Phase 3: Import Execution | 5-6 hours | Phase 2 |
| Phase 4: UI Components | 8-10 hours | Phase 3 |
| Phase 5: Integration | 2-3 hours | Phase 4 |
| Phase 6: Testing | 4-5 hours | Phase 5 |
| Phase 7: Documentation | 2-3 hours | Phase 6 |

**Team Composition**: 1 full-stack developer  
**Timeline**: November 11-18, 2025 (8 days with buffer)  
**Confidence**: High - Well-defined scope, clear requirements

---

## Implementation Clarifications

All architectural and design decisions have been finalized. Key clarifications made:

### Router Architecture
- ✅ **Decision**: New `attendeesRouter` in `src/server/api/routers/attendees.ts`
- **Rationale**: Separates organizer import features from public registration flows

### File Size Limits
- ✅ **Decision**: Dual limits - 10,000 rows AND 10MB (whichever is hit first)
- **Rationale**: Prevents both memory issues (file size) and performance issues (row count)

### Transaction Strategy
- ✅ **Decision**: Partial commit - import successful rows, skip/report failed rows
- **Rationale**: Better UX, allows fixing errors and re-importing only failed rows

### Duplicate Detection
- ✅ **Decision**: Two-phase detection (in-file + database)
- **Rationale**: Catches all duplicates comprehensively before import begins

### Field Mapping Persistence
- ✅ **Decision**: Save per event in localStorage with key `events-ting:import-mapping:{eventId}`
- **Rationale**: Reduces friction for repeated imports of same event type

### CSV Template
- ✅ **Decision**: Static template file in `/public/templates/` for MVP
- **Future**: Dynamic generation with event-specific ticket types in Phase 2

### Custom Data Storage
- ✅ **Decision**: Store unmapped columns in `customData` without `custom_` prefix
- **Example**: Column "company" → `{ "company": "Acme Corp" }` not `{ "custom_company": "Acme Corp" }`

### Progress Feedback
- ✅ **Decision**: Simulated progress (indeterminate spinner) for MVP
- **Future**: Real-time streaming with WebSocket/SSE in Phase 2

### Validation Behavior
- ✅ **Decision**: Non-blocking - allow import with errors, skip invalid rows
- **Rationale**: More flexible, better UX than forcing all-or-nothing

### Registration Codes
- ✅ **Decision**: Auto-generate unique codes for all imported attendees
- **Rationale**: Maintains consistency with manual registrations

### Confirmation Emails
- ✅ **Decision**: Opt-in checkbox in Step 1 (default: unchecked)
- **Rationale**: Prevents spam when importing historical data

### Ticket Availability
- ✅ **Decision**: Show warning but allow import (non-blocking)
- **Rationale**: Flexibility for organizers, strict enforcement can be added later if needed

---

## Related Documentation

### Existing Documentation
- [Data Model](../../docs/architecture/data-model.md) - Registration entity structure
- [Attendees Module](../../docs/modules/attendees/) - Attendee management overview
- [Authentication](../../docs/architecture/authentication.md) - Access control

### New Documentation (To Be Created)
- **User Guide**: How to import attendees (step-by-step with screenshots)
- **CSV Template**: Downloadable template with example data
- **Troubleshooting**: Common import errors and solutions
- **API Reference**: tRPC procedures for import operations

---

## Approval & Sign-Off

**Product Owner**: @babblebey  
**Technical Lead**: @babblebey  
**Milestone**: YPIT Series G (Due November 21, 2025)  
**Status**: Ready for Implementation

**Approved**: _Pending_  
**Date**: November 11, 2025

---

## Notes & Learnings

### Design Decisions
- **Why CSV only?**: CSV is universal, simple to parse, and supported by all platforms. Excel adds complexity without significant benefit for MVP.
- **Why no background jobs?**: For MVP, synchronous processing is sufficient for <10,000 rows. Background jobs add infrastructure complexity.
- **Why skip duplicates by default?**: Prevents accidental duplicate registrations, which is harder to clean up than re-importing skipped records.
- **Why no import history?**: Keeping it simple for MVP. Import history adds database complexity and storage overhead without immediate value. Can be added later if needed.

### Lessons from Similar Features
- Clear validation errors are critical for user success
- Auto-mapping reduces friction significantly (80% of fields should map automatically)
- Progress feedback is essential for imports >100 rows
- Downloadable error reports are more useful than inline displays

### Future Considerations
- Integration with external platforms (Eventbrite, Google Forms) would eliminate need for CSV import
- Import history and audit logs if compliance becomes a requirement
- Scheduled imports (e.g., nightly sync with Google Sheets) would be valuable for large events
- File storage for reviewing past imports if users request this feature

---

**Last Updated**: November 11, 2025  
**Document Version**: 1.0  
**Next Review**: Post-YPIT (December 2025)

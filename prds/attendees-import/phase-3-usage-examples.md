# Phase 3: Import Execution - Usage Examples

This document provides practical examples of how to use the `attendees.executeImport` procedure from the frontend.

---

## Basic Import Flow

### 1. Parse CSV First (Get Preview)
```typescript
import { api } from "@/trpc/react";

const parseCSV = api.attendees.parseCSV.useMutation();

// User uploads CSV file
const handleFileUpload = async (file: File) => {
  // Convert to base64
  const base64 = await fileToBase64(file);
  
  // Parse and get preview
  const result = await parseCSV.mutateAsync({
    eventId: "clx123abc",
    fileContent: base64,
  });
  
  console.log(result);
  // {
  //   columns: ["Full Name", "Email Address", "Ticket", "Company"],
  //   preview: [{ "Full Name": "John Doe", ... }, ...],
  //   totalRows: 247,
  //   suggestedMapping: { "Full Name": "name", "Email Address": "email", ... }
  // }
};
```

### 2. Validate Import (Show Errors)
```typescript
const validateImport = api.attendees.validateImport.useMutation();

const handleValidation = async (
  fileContent: string,
  fieldMapping: Record<string, string>
) => {
  const result = await validateImport.mutateAsync({
    eventId: "clx123abc",
    fileContent,
    fieldMapping: {
      "Full Name": "name",
      "Email Address": "email",
      "Ticket": "ticketType",
      "Company": "custom_company",
    },
    duplicateStrategy: "skip",
  });
  
  console.log(result);
  // {
  //   validRows: 245,
  //   invalidRows: 2,
  //   duplicates: 3,
  //   errors: [
  //     { row: 12, field: "email", value: "invalid", error: "Invalid email format" },
  //     { row: 45, field: "ticketType", value: "VIP", error: "Ticket type not found" }
  //   ],
  //   warnings: [],
  //   totalRows: 247
  // }
};
```

### 3. Execute Import
```typescript
const executeImport = api.attendees.executeImport.useMutation();

const handleImport = async (
  fileContent: string,
  fieldMapping: Record<string, string>,
  sendEmails: boolean
) => {
  const result = await executeImport.mutateAsync({
    eventId: "clx123abc",
    fileContent,
    fieldMapping: {
      "Full Name": "name",
      "Email Address": "email",
      "Ticket": "ticketType",
      "Company": "custom_company",
      "Role": "custom_role",
    },
    duplicateStrategy: "skip",
    sendConfirmationEmails: sendEmails,
  });
  
  console.log(result);
  // {
  //   successCount: 242,
  //   failureCount: 3,
  //   duplicateCount: 2,
  //   errors: [
  //     { row: 10, field: "database", value: "john@example.com", error: "Duplicate email" },
  //     { row: 23, field: "database", value: "jane@example.com", error: "Database error: ..." }
  //   ],
  //   status: "completed"
  // }
  
  // Show success toast
  if (result.status === "completed") {
    toast.success(`Imported ${result.successCount} attendees successfully!`);
    
    if (result.failureCount > 0) {
      toast.warning(`${result.failureCount} rows failed to import. See details below.`);
    }
  }
};
```

---

## Complete Import Wizard Component Example

```typescript
"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface ImportWizardProps {
  eventId: string;
}

export function ImportWizard({ eventId }: ImportWizardProps) {
  const [step, setStep] = useState(1);
  const [fileContent, setFileContent] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [sendEmails, setSendEmails] = useState(false);
  
  // Mutations
  const parseCSV = api.attendees.parseCSV.useMutation();
  const validateImport = api.attendees.validateImport.useMutation();
  const executeImport = api.attendees.executeImport.useMutation();
  
  // Step 1: Upload and parse
  const handleFileUpload = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setFileContent(base64);
      
      const result = await parseCSV.mutateAsync({
        eventId,
        fileContent: base64,
      });
      
      setColumns(result.columns);
      setFieldMapping(result.suggestedMapping);
      setStep(2);
      
      toast.success(`Parsed ${result.totalRows} rows from CSV`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }
  };
  
  // Step 2: Validate before import
  const handleValidate = async () => {
    try {
      const result = await validateImport.mutateAsync({
        eventId,
        fileContent,
        fieldMapping,
        duplicateStrategy: "skip",
      });
      
      if (result.invalidRows > 0) {
        toast.warning(
          `Found ${result.invalidRows} invalid rows and ${result.duplicates} duplicates`
        );
      } else {
        toast.success(`All ${result.validRows} rows are valid`);
      }
      
      setStep(3);
    } catch (error) {
      toast.error("Validation failed");
    }
  };
  
  // Step 3: Execute import
  const handleExecuteImport = async () => {
    try {
      const result = await executeImport.mutateAsync({
        eventId,
        fileContent,
        fieldMapping,
        duplicateStrategy: "skip",
        sendConfirmationEmails: sendEmails,
      });
      
      if (result.status === "completed") {
        toast.success(
          `Successfully imported ${result.successCount} attendees!`
        );
        
        if (result.failureCount > 0) {
          toast.warning(`${result.failureCount} rows failed to import`);
        }
      }
      
      setStep(4);
    } catch (error) {
      toast.error("Import failed");
    }
  };
  
  // Render steps...
  return (
    <div>
      {step === 1 && (
        <FileUploadStep
          onUpload={handleFileUpload}
          sendEmails={sendEmails}
          onSendEmailsChange={setSendEmails}
        />
      )}
      
      {step === 2 && (
        <FieldMappingStep
          columns={columns}
          mapping={fieldMapping}
          onMappingChange={setFieldMapping}
          onNext={handleValidate}
        />
      )}
      
      {step === 3 && (
        <ValidationStep
          validation={validateImport.data}
          onImport={handleExecuteImport}
          isLoading={executeImport.isPending}
        />
      )}
      
      {step === 4 && (
        <ImportResultsStep
          result={executeImport.data}
        />
      )}
    </div>
  );
}
```

---

## Error Handling Examples

### Handle Validation Errors
```typescript
const validationResult = await validateImport.mutateAsync({ ... });

if (validationResult.invalidRows > 0) {
  // Show error table
  const errorsByRow = validationResult.errors.reduce((acc, error) => {
    if (!acc[error.row]) acc[error.row] = [];
    acc[error.row].push(error);
    return acc;
  }, {} as Record<number, ValidationError[]>);
  
  console.log("Errors by row:", errorsByRow);
}
```

### Handle Import Errors
```typescript
const importResult = await executeImport.mutateAsync({ ... });

if (importResult.failureCount > 0) {
  // Download failed rows as CSV for user to fix
  const failedRows = importResult.errors
    .filter(e => e.field === "database")
    .map(e => ({ row: e.row, email: e.value, error: e.error }));
  
  downloadAsCSV(failedRows, "failed-imports.csv");
}
```

### Retry Failed Rows
```typescript
// User fixes CSV and re-uploads only failed rows
const retryImport = async (fixedFileContent: string) => {
  const result = await executeImport.mutateAsync({
    eventId,
    fileContent: fixedFileContent,
    fieldMapping, // Same mapping as before
    duplicateStrategy: "skip",
    sendConfirmationEmails: true,
  });
  
  toast.success(`Retry successful: ${result.successCount} rows imported`);
};
```

---

## Duplicate Handling Strategies

### Strategy 1: Skip Duplicates (Default)
```typescript
await executeImport.mutateAsync({
  eventId,
  fileContent,
  fieldMapping,
  duplicateStrategy: "skip", // Skip duplicates
  sendConfirmationEmails: false,
});

// Result: Duplicates not imported, counted in duplicateCount
```

### Strategy 2: Create Duplicates
```typescript
await executeImport.mutateAsync({
  eventId,
  fileContent,
  fieldMapping,
  duplicateStrategy: "create", // Allow duplicates
  sendConfirmationEmails: false,
});

// Result: All rows imported, even if email already exists
// Use case: Group registrations with same contact email
```

---

## Email Configuration Examples

### Disable Emails (Default)
```typescript
await executeImport.mutateAsync({
  eventId,
  fileContent,
  fieldMapping,
  duplicateStrategy: "skip",
  sendConfirmationEmails: false, // No emails sent
});

// Use case: Importing historical data
```

### Enable Confirmation Emails
```typescript
await executeImport.mutateAsync({
  eventId,
  fileContent,
  fieldMapping,
  duplicateStrategy: "skip",
  sendConfirmationEmails: true, // Send emails to all imported attendees
});

// Use case: Migrating active registrations, attendees expect confirmation
```

---

## Custom Data Mapping Examples

### Example 1: Standard Fields Only
```typescript
const fieldMapping = {
  "Name": "name",
  "Email": "email",
  "Ticket Type": "ticketType",
  "Payment": "paymentStatus",
};

// Result: Only standard fields populated, no customData
```

### Example 2: Mix of Standard and Custom Fields
```typescript
const fieldMapping = {
  "Name": "name",
  "Email": "email",
  "Ticket Type": "ticketType",
  "Company": "custom_company",        // Stored in customData
  "Job Title": "custom_jobTitle",     // Stored in customData
  "Dietary Needs": "custom_dietary",  // Stored in customData
};

// Result in database:
// {
//   name: "John Doe",
//   email: "john@example.com",
//   customData: {
//     registrationCode: "A1B2C3D4E5F6G7H8",
//     company: "Acme Corp",           // No "custom_" prefix
//     jobTitle: "Senior Developer",   // No "custom_" prefix
//     dietary: "Vegetarian"           // No "custom_" prefix
//   }
// }
```

---

## Progress Tracking (MVP)

```typescript
const [isImporting, setIsImporting] = useState(false);

const handleImport = async () => {
  setIsImporting(true);
  
  try {
    const result = await executeImport.mutateAsync({ ... });
    
    // Show results
    console.log(`Imported ${result.successCount}/${result.successCount + result.failureCount}`);
  } finally {
    setIsImporting(false);
  }
};

// UI shows indeterminate spinner during import
{isImporting && <Spinner />}
```

### Future: Real-time Progress (Phase 2)
```typescript
// Phase 2 enhancement: WebSocket/SSE for real-time updates
const [progress, setProgress] = useState(0);

// WebSocket listener
socket.on('import-progress', (data) => {
  setProgress(data.processed / data.total * 100);
});
```

---

## Utility Functions

### Convert File to Base64
```typescript
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix if present
      const base64Data = base64.includes(',') 
        ? base64.split(',')[1] 
        : base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

### Download Errors as CSV
```typescript
function downloadErrorsAsCSV(errors: ValidationError[]) {
  const csvContent = [
    ["Row", "Field", "Value", "Error"].join(","),
    ...errors.map(e => 
      [e.row, e.field, e.value, e.error].map(v => `"${v}"`).join(",")
    )
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "import-errors.csv";
  link.click();
  URL.revokeObjectURL(url);
}
```

---

## Testing Checklist

### ✅ Happy Path
- [ ] Upload valid CSV with 100 rows
- [ ] All rows imported successfully
- [ ] Confirmation emails sent (if enabled)
- [ ] Registration codes generated

### ✅ Error Scenarios
- [ ] Invalid email formats → Rows skipped with errors
- [ ] Missing required fields → Validation fails
- [ ] Ticket type not found → Rows skipped with errors
- [ ] Duplicate emails → Duplicates skipped (skip strategy)

### ✅ Edge Cases
- [ ] Empty CSV → Error: "File is empty"
- [ ] No column headers → Error: "No columns found"
- [ ] 10,000+ rows → Error: "Exceeds row limit"
- [ ] File >10MB → Error: "Exceeds file size limit"
- [ ] UTF-8 BOM → Automatically stripped
- [ ] Special characters in names → Preserved correctly

### ✅ Performance
- [ ] 100 rows → Completes in <5 seconds
- [ ] 1000 rows → Completes in <30 seconds
- [ ] 5000 rows → Completes in <2 minutes

---

## Troubleshooting

### Issue: Import taking too long
**Solution**: Check row count. For >5000 rows, consider splitting CSV into smaller files.

### Issue: Emails not sending
**Solution**: 
1. Check `RESEND_API_KEY` is configured
2. Check `EMAIL_FROM` is verified in Resend
3. Email failures are logged but don't block import

### Issue: Registration codes not showing
**Solution**: Check `customData.registrationCode` field in database. Should be auto-generated.

### Issue: Custom fields not saving
**Solution**: Ensure field mapping includes `custom_` prefix for unmapped columns. Backend strips prefix before saving.

---

## Next Steps

Now that Phase 3 is complete, you can:

1. **Build UI Components** (Phase 4)
   - Import wizard with 4 steps
   - File upload dropzone
   - Field mapping interface
   - Validation results display
   - Import progress and results

2. **Add Navigation** (Phase 5)
   - "Import Attendees" button on attendees list page
   - Route: `/dashboard/[id]/attendees/import`
   - Breadcrumbs for navigation

3. **Test Integration** (Phase 6)
   - End-to-end testing with real CSV files
   - Error handling verification
   - Email delivery testing

---

**Backend Ready**: ✅ All import execution logic complete and tested  
**Frontend Ready**: Waiting for Phase 4 UI implementation

# Attendees Frontend Documentation

## Overview

The Attendees frontend is built around a single powerful component: `AttendeeTable`. This table provides comprehensive attendee management capabilities with search, filtering, and export functionality.

## Page Structure

### Attendees Page

**File**: `src/app/(dashboard)/[id]/attendees/page.tsx`  
**Route**: `/(dashboard)/[id]/attendees`  
**Type**: Server Component  
**Authentication**: Required

**Data Fetching**:
```typescript
const event = await api.event.getById({ id: eventId });
```

**Authorization**:
- Handled by `AttendeeTable` component via tRPC

**Render**:
```tsx
<div className="space-y-6">
  <div className="flex justify-between items-center">
    <div>
      <h1>Attendees</h1>
      <p>Manage registrations and export attendee data for {event.name}</p>
    </div>
    <Link href={`/dashboard/${eventId}/attendees/import`}>
      <Button>Import Attendees</Button>
    </Link>
  </div>
  
  <AttendeeTable eventId={eventId} />
</div>
```

### Import Page (NEW)

**File**: `src/app/(dashboard)/[id]/attendees/import/page.tsx`  
**Route**: `/(dashboard)/[id]/attendees/import`  
**Type**: Client Component  
**Authentication**: Required

**Render**:
```tsx
<div className="space-y-6">
  <Breadcrumb>
    <BreadcrumbItem href={`/dashboard/${eventId}`}>Dashboard</BreadcrumbItem>
    <BreadcrumbItem href={`/dashboard/${eventId}/attendees`}>Attendees</BreadcrumbItem>
    <BreadcrumbItem>Import</BreadcrumbItem>
  </Breadcrumb>
  
  <h1>Import Attendees</h1>
  
  <ImportWizard eventId={eventId} />
</div>
```

---

## CSV Import Components (NEW)

### ImportWizard Component

**File**: `src/components/registration/import-wizard.tsx`  
**Type**: Client Component (`"use client"`)

**Props**:
```typescript
{
  eventId: string
}
```

**Purpose**: Multi-step wizard for CSV import with validation and progress tracking

**State Management**:
```typescript
const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
const [file, setFile] = useState<File | null>(null)
const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null)
const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
const [sendEmails, setSendEmails] = useState(false)
```

**Steps**:
1. File Upload (FileUploadStep)
2. Field Mapping (FieldMappingStep)
3. Validation (ValidationStep)
4. Import Progress (ImportProgressStep)

**Navigation**:
```tsx
<div className="flex justify-between">
  {step > 1 && <Button onClick={() => setStep(step - 1)}>← Back</Button>}
  {step < 4 && <Button onClick={() => setStep(step + 1)}>Next →</Button>}
</div>
```

---

### Step 1: FileUploadStep

**Component**: Part of `ImportWizard`  
**Purpose**: Upload CSV file and show preview

**Features**:
- Drag & drop file upload
- File validation (CSV only, 10MB max, 10,000 rows max)
- CSV template download button
- "Send confirmation emails" checkbox
- Preview of first 10 rows

**UI Elements**:
```tsx
<FileDropzone
  accept={{ 'text/csv': ['.csv'] }}
  maxSize={10 * 1024 * 1024} // 10MB
  onDrop={handleFileDrop}
/>

<Checkbox
  label="Send confirmation emails to imported attendees"
  checked={sendEmails}
  onChange={(e) => setSendEmails(e.target.checked)}
/>

<a href="/templates/attendees-import-template.csv" download>
  <Button color="gray">Download CSV Template</Button>
</a>
```

**File Processing**:
```typescript
const handleFileDrop = async (acceptedFiles: File[]) => {
  const file = acceptedFiles[0]
  
  // Read file as base64
  const reader = new FileReader()
  reader.onload = async () => {
    const fileContent = reader.result as string
    
    // Parse CSV via tRPC
    const result = await parseCSVMutation.mutateAsync({
      eventId,
      fileContent: btoa(fileContent), // Base64 encode
      fileName: file.name
    })
    
    setParsedData(result)
    setStep(2) // Move to field mapping
  }
  reader.readAsText(file)
}
```

**Validation Messages**:
- File too large: "File exceeds 10MB limit"
- Too many rows: "File exceeds 10,000 row limit"
- Invalid format: "Please upload a valid CSV file"

---

### Step 2: FieldMappingStep

**Component**: Part of `ImportWizard`  
**Purpose**: Map CSV columns to system fields

**Features**:
- Dropdown for each CSV column to select target field
- Auto-suggested mappings (from parseCSV)
- Sample data preview for each column
- Required field indicators
- Custom field option for unmapped columns
- LocalStorage persistence of mappings

**UI Structure**:
```tsx
<Table>
  <TableHead>
    <TableRow>
      <TableHeadCell>CSV Column</TableHeadCell>
      <TableHeadCell>Map To</TableHeadCell>
      <TableHeadCell>Sample Data</TableHeadCell>
    </TableRow>
  </TableHead>
  <TableBody>
    {parsedData.columns.map(column => (
      <TableRow key={column}>
        <TableCell>{column}</TableCell>
        <TableCell>
          <Select
            value={fieldMapping[column] || ''}
            onChange={(e) => handleMappingChange(column, e.target.value)}
          >
            <option value="">-- Do not import --</option>
            <option value="name">Name *</option>
            <option value="email">Email *</option>
            <option value="ticketType">Ticket Type *</option>
            <option value="paymentStatus">Payment Status</option>
            <option value="emailStatus">Email Status</option>
            <option value="custom">Custom Field</option>
          </Select>
        </TableCell>
        <TableCell>{parsedData.preview[0][column]}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Auto-Mapping Logic**:
```typescript
useEffect(() => {
  if (parsedData?.suggestedMapping) {
    // Load saved mappings from localStorage first
    const savedMappings = localStorage.getItem(`events-ting:import-mapping:${eventId}`)
    if (savedMappings) {
      setFieldMapping(JSON.parse(savedMappings))
    } else {
      // Use suggested mappings
      setFieldMapping(parsedData.suggestedMapping)
    }
  }
}, [parsedData])
```

**Save Mappings**:
```typescript
const handleNext = () => {
  // Save mappings to localStorage
  localStorage.setItem(
    `events-ting:import-mapping:${eventId}`,
    JSON.stringify(fieldMapping)
  )
  setStep(3)
}
```

**Validation**:
- Required fields must be mapped (name, email, ticketType)
- Show error if required field is missing
- Disable "Next" button until all required fields mapped

---

### Step 3: ValidationStep

**Component**: Part of `ImportWizard`  
**Purpose**: Display validation results and errors

**Features**:
- Validation summary (valid/invalid/duplicates)
- Detailed error table with row numbers
- Duplicate handling strategy selector
- Download error report as CSV
- Import button enabled even with errors

**UI Structure**:
```tsx
<Card>
  <h3>Validation Summary</h3>
  <div className="grid grid-cols-3 gap-4">
    <div>
      <Badge color="success">✓ {validationResult.validRows} Valid</Badge>
    </div>
    <div>
      <Badge color="warning">⚠ {validationResult.invalidRows} Invalid</Badge>
    </div>
    <div>
      <Badge color="info">🔄 {validationResult.inFileDuplicates + validationResult.databaseDuplicates} Duplicates</Badge>
    </div>
  </div>
</Card>

{validationResult.errors.length > 0 && (
  <Card>
    <h3>Errors</h3>
    <Table>
      <TableHead>
        <TableRow>
          <TableHeadCell>Row</TableHeadCell>
          <TableHeadCell>Field</TableHeadCell>
          <TableHeadCell>Value</TableHeadCell>
          <TableHeadCell>Error</TableHeadCell>
          <TableHeadCell>Type</TableHeadCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {validationResult.errors.map((error, idx) => (
          <TableRow key={idx}>
            <TableCell>{error.row}</TableCell>
            <TableCell>{error.field}</TableCell>
            <TableCell className="truncate max-w-xs">{error.value}</TableCell>
            <TableCell>{error.error}</TableCell>
            <TableCell>
              <Badge color={getErrorTypeBadgeColor(error.type)}>
                {error.type}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    
    <Button color="gray" onClick={downloadErrorReport}>
      Download Error Report
    </Button>
  </Card>
)}

<Select
  label="Duplicate Handling"
  value={duplicateStrategy}
  onChange={(e) => setDuplicateStrategy(e.target.value)}
>
  <option value="skip">Skip duplicates (recommended)</option>
  <option value="create">Create new registrations</option>
</Select>

{validationResult.invalidRows > 0 && (
  <Alert color="warning">
    {validationResult.validRows} valid rows will be imported. 
    {validationResult.invalidRows} invalid rows will be skipped.
  </Alert>
)}
```

**Validation Execution**:
```typescript
useEffect(() => {
  const runValidation = async () => {
    const result = await validateImportMutation.mutateAsync({
      eventId,
      fileContent: parsedData.fileContent,
      fieldMapping,
      duplicateStrategy
    })
    setValidationResult(result)
  }
  
  if (step === 3) {
    runValidation()
  }
}, [step, duplicateStrategy])
```

**Download Error Report**:
```typescript
const downloadErrorReport = () => {
  const csv = Papa.unparse(validationResult.errors)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `import-errors-${new Date().toISOString()}.csv`
  link.click()
}
```

---

### Step 4: ImportProgressStep

**Component**: Part of `ImportWizard`  
**Purpose**: Show import progress and results

**Features**:
- Indeterminate progress spinner during processing
- Final results display
- Success/failure/skipped counts
- Download failed rows CSV
- Navigation back to attendees list

**UI Structure**:
```tsx
{importMutation.isPending ? (
  <div className="text-center py-12">
    <Spinner size="xl" />
    <p className="mt-4">Importing attendees...</p>
    <p className="text-sm text-gray-500">Please don't close this window</p>
  </div>
) : importResult ? (
  <Card>
    <h3>Import Complete</h3>
    
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Badge color="success" size="lg">
          ✓ {importResult.successCount} Successful
        </Badge>
      </div>
      <div>
        <Badge color="failure" size="lg">
          ✗ {importResult.failureCount} Failed
        </Badge>
      </div>
      <div>
        <Badge color="warning" size="lg">
          ⊘ {importResult.skippedCount} Skipped
        </Badge>
      </div>
    </div>
    
    <Alert color={importResult.status === 'completed' ? 'success' : 'warning'}>
      {importResult.message}
    </Alert>
    
    {importResult.errors.length > 0 && (
      <>
        <h4>Failed Rows</h4>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>Row</TableHeadCell>
              <TableHeadCell>Error</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {importResult.errors.slice(0, 10).map((error, idx) => (
              <TableRow key={idx}>
                <TableCell>{error.row}</TableCell>
                <TableCell>{error.error}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <Button color="gray" onClick={downloadFailedRows}>
          Download Failed Rows CSV
        </Button>
      </>
    )}
    
    <div className="flex justify-end gap-2">
      <Link href={`/dashboard/${eventId}/attendees`}>
        <Button>View Attendees</Button>
      </Link>
      <Button color="gray" onClick={() => window.location.reload()}>
        Import Another File
      </Button>
    </div>
  </Card>
) : null}
```

**Import Execution**:
```typescript
useEffect(() => {
  const executeImport = async () => {
    const result = await importMutation.mutateAsync({
      eventId,
      fileContent: parsedData.fileContent,
      fieldMapping,
      duplicateStrategy,
      sendConfirmationEmails: sendEmails
    })
    setImportResult(result)
  }
  
  if (step === 4) {
    executeImport()
  }
}, [step])
```

**Download Failed Rows**:
```typescript
const downloadFailedRows = () => {
  // Reconstruct CSV with only failed rows
  const failedRows = importResult.errors.map(error => {
    const originalRow = parsedData.data.find(row => row._index === error.row)
    return { ...originalRow, error: error.error }
  })
  
  const csv = Papa.unparse(failedRows)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `failed-imports-${new Date().toISOString()}.csv`
  link.click()
}
```

---

## Loading States for Import

### File Upload
- **Uploading**: "Uploading file..." (indeterminate spinner)
- **Parsing**: "Parsing CSV..." (indeterminate spinner)

### Field Mapping
- **Loading saved mappings**: Brief flash, no explicit UI
- **Auto-mapping**: Instant, no loading state

### Validation
- **Running validation**: "Validating data..." (indeterminate spinner)
- **Results displayed**: Instant transition to results

### Import Execution
- **Importing**: "Importing attendees..." (indeterminate spinner)
- **Progress**: MVP shows indeterminate progress (future: real-time percentage)
- **Complete**: Instant transition to results

---

## CSV Template Download

**File**: `public/templates/attendees-import-template.csv`

**Contents**:
```csv
name,email,ticketType,paymentStatus,emailStatus,company,role
John Doe,john@example.com,General Admission,free,active,Acme Corp,Developer
Jane Smith,jane@example.com,VIP Pass,free,active,TechCo,Designer
Bob Johnson,bob@example.com,Early Bird,free,active,StartupXYZ,Founder
```

**Download Link**:
```tsx
<a href="/templates/attendees-import-template.csv" download>
  <Button color="gray">
    <HiDownload className="mr-2" />
    Download CSV Template
  </Button>
</a>
```

---

## Main Component: `AttendeeTable`

**File**: `src/components/registration/attendee-table.tsx`  
**Type**: Client Component (`"use client"`)

**Props**:
```typescript
{
  eventId: string,
  onResendConfirmation?: (registration: Registration) => void,
  onCancelRegistration?: (registration: Registration) => void
}
```

### Features

#### 1. Search Functionality

**Implementation**:
```typescript
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 500);
```

**UI Component**:
```tsx
<TextInput
  icon={HiSearch}
  placeholder="Search by name or email..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
/>
```

**Debounce Hook**: `useDebounce(value, delay)`
- Delays API calls by 500ms
- Reduces server load
- Improves UX

#### 2. Ticket Type Filter

**UI Component**:
```tsx
<select onChange={(e) => setSelectedTicketType(e.target.value || undefined)}>
  <option value="">All Ticket Types</option>
  {ticketTypes.items.map(ticket => (
    <option key={ticket.id} value={ticket.id}>
      {ticket.name}
    </option>
  ))}
</select>
```

#### 3. CSV Export

**Button**:
```tsx
<Button color="gray" onClick={handleExport} disabled={exportMutation.isPending}>
  <HiDownload className="mr-2" />
  {exportMutation.isPending ? "Exporting..." : "Export CSV"}
</Button>
```

**Mutation**:
```typescript
const exportMutation = api.registration.export.useMutation({
  onSuccess: (data) => {
    // Create download link
    const link = document.createElement("a");
    link.href = data.url;
    link.download = data.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
});
```

#### 4. Attendee Table

**Columns**:
1. Name
2. Email
3. Ticket Type (Badge)
4. Payment Status (Badge)
5. Email Status (Badge)
6. Registered Date
7. Actions (Resend, Cancel)

**Table Structure**:
```tsx
<Table hoverable>
  <TableHead>
    <TableRow>
      <TableHeadCell>Name</TableHeadCell>
      <TableHeadCell>Email</TableHeadCell>
      <TableHeadCell>Ticket Type</TableHeadCell>
      <TableHeadCell>Payment</TableHeadCell>
      <TableHeadCell>Email Status</TableHeadCell>
      <TableHeadCell>Registered</TableHeadCell>
      <TableHeadCell>Actions</TableHeadCell>
    </TableRow>
  </TableHead>
  <TableBody>
    {attendees.map(attendee => (
      <TableRow key={attendee.id}>
        {/* ... cells ... */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

#### 5. Status Badges

**Email Status**:
```typescript
const getEmailStatusBadge = (status: string) => {
  switch (status) {
    case "active": return <Badge color="success">Active</Badge>;
    case "bounced": return <Badge color="failure">Bounced</Badge>;
    case "unsubscribed": return <Badge color="gray">Unsubscribed</Badge>;
    default: return <Badge color="gray">{status}</Badge>;
  }
};
```

**Payment Status**:
```typescript
const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case "free": return <Badge color="info">Free</Badge>;
    case "paid": return <Badge color="success">Paid</Badge>;
    case "pending": return <Badge color="warning">Pending</Badge>;
    case "failed": return <Badge color="failure">Failed</Badge>;
    case "refunded": return <Badge color="gray">Refunded</Badge>;
    default: return <Badge color="gray">{status}</Badge>;
  }
};
```

#### 6. Action Buttons

**Resend Confirmation**:
```tsx
<Button size="xs" color="gray" onClick={() => onResendConfirmation?.(registration)}>
  <HiMail />
</Button>
```

**Cancel Registration**:
```tsx
<Button size="xs" color="failure" onClick={() => onCancelRegistration?.(registration)}>
  <HiTrash />
</Button>
```

#### 7. Infinite Scroll

**tRPC Query**:
```typescript
const { data, fetchNextPage, hasNextPage } = api.registration.list.useInfiniteQuery(
  {
    eventId,
    limit: 50,
    search: debouncedSearch || undefined,
    ticketTypeId: selectedTicketType
  },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor
  }
);
```

**Flattened Data**:
```typescript
const allRegistrations = data?.pages.flatMap(page => page.items) ?? [];
const totalCount = data?.pages[0]?.total ?? 0;
```

---

## UI Components Used

### Flowbite React
- `Table`, `TableHead`, `TableHeadCell`, `TableBody`, `TableRow`, `TableCell`
- `Badge` - Status indicators
- `Button` - Actions
- `TextInput` - Search box

### Icons (React Icons)
- `HiSearch` - Search icon
- `HiDownload` - Export icon
- `HiMail` - Resend icon
- `HiTrash` - Cancel icon

---

## Responsive Design

### Mobile (< 768px)
- Horizontal scroll for table
- Stacked action buttons
- Reduced padding

### Tablet/Desktop (> 768px)
- Full table width
- Side-by-side filters
- Inline action buttons

---

## Loading States

1. **Initial Load**: "Loading attendees..."
2. **Empty State**: "No attendees found"
3. **Export**: Button shows "Exporting..." and is disabled
4. **Search**: Debounced, no explicit loading (smooth transition)

---

## Error Handling

- **Export Failure**: Console error logged, user notified via toast (if implemented)
- **Query Error**: Handled by tRPC, shows error message
- **No Results**: "No attendees found" message

---

## Best Practices

### Performance
1. Debounce search input (500ms)
2. Use infinite scroll for large lists
3. Flatten pages for easier rendering
4. Memoize badge functions

### UX
1. Clear placeholder text in search
2. Visual feedback on actions (loading states)
3. Immediate CSV download on export
4. Confirm before canceling registrations (recommended)

---

## Related Documentation

- [Backend Documentation](./backend.md) - Registration router procedures
- [Data Model](./data-model.md) - Registration model
- [Workflows](./workflows.md) - Management workflows

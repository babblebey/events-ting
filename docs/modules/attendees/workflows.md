# Attendees Workflows

## Overview

This document describes the workflows for managing attendees from the organizer dashboard. These workflows focus on attendee list management, filtering, exporting, and individual attendee actions.

---

## Workflow 1: View Attendee List

**Actor**: Event Organizer  
**Goal**: View all registered attendees for an event  
**Prerequisites**: Event exists with at least one registration

### Steps

1. **Navigate to Attendees Page**
   - Go to event dashboard: `/(dashboard)/[eventId]`
   - Click "Attendees" tab in navigation
   - Route: `/(dashboard)/[eventId]/attendees`

2. **Page Loads**
   - Server component fetches event data
   - Verifies user owns event (redirects if not)
   - Renders `<AttendeeTable>` component

3. **Initial Data Display**
   - tRPC query: `registration.list` with `eventId`
   - Table shows first 50 registrations
   - Columns: Name, Email, Ticket Type, Payment, Email Status, Date, Actions
   - Shows total count: "Showing 50 of 150 attendees"

4. **Scroll for More** (if applicable)
   - Scroll to bottom of list
   - Infinite scroll automatically loads next page
   - Uses cursor-based pagination
   - Seamless loading experience

### Result

Organizer sees complete list of attendees with key information at a glance.

---

## Workflow 2: Search for Attendee

**Actor**: Event Organizer  
**Goal**: Find specific attendee by name or email  
**Prerequisites**: Attendees exist

### Steps

1. **Start on Attendees Page**
   - Attendee list displayed

2. **Enter Search Term**
   - Click in search box (top left)
   - Type name or email: "john"
   - Search is debounced (500ms delay)

3. **Search Executes**
   - After 500ms pause, tRPC query updates:
     ```typescript
     api.registration.list({
       eventId,
       search: "john",
       limit: 50
     })
     ```

4. **Filtered Results Display**
   - Table updates with matching attendees
   - Shows: "John Doe", "john@example.com", etc.
   - Case-insensitive search
   - Matches partial strings

5. **Clear Search**
   - Delete search text or click X
   - After 500ms, full list returns

### Result

Organizer quickly finds specific attendee without scrolling through entire list.

---

## Workflow 3: Filter by Ticket Type

**Actor**: Event Organizer  
**Goal**: View attendees with specific ticket type  
**Prerequisites**: Event has multiple ticket types

### Steps

1. **Start on Attendees Page**
   - Full attendee list displayed

2. **Select Ticket Type**
   - Click ticket type dropdown (next to search)
   - Options: "All Ticket Types", "VIP Pass", "General Admission", etc.
   - Select "VIP Pass"

3. **Filter Applies**
   - tRPC query updates:
     ```typescript
     api.registration.list({
       eventId,
       ticketTypeId: "clx...",
       limit: 50
     })
     ```

4. **Filtered Results Display**
   - Table shows only VIP Pass attendees
   - Count updates: "Showing 20 of 20 attendees"

5. **Clear Filter**
   - Select "All Ticket Types" from dropdown
   - Full list returns

### Use Cases

- Check VIP attendee count
- Export specific ticket type list
- Verify ticket distribution

### Result

Organizer views attendees segmented by access level.

---

## Workflow 4: Export Attendee List

**Actor**: Event Organizer  
**Goal**: Download attendee data as CSV for offline use  
**Prerequisites**: At least one attendee registered

### Steps

1. **Start on Attendees Page**
   - Attendee list displayed (filtered or unfiltered)

2. **Click Export Button**
   - Green "Export CSV" button (top right)
   - Button shows download icon

3. **Export Processes**
   - tRPC mutation: `registration.export`
   - Server generates CSV:
     ```csv
     Name,Email,Ticket Type,Registration Date,Payment Status
     John Doe,john@example.com,General Admission,2025-01-15T10:30:00Z,free
     ```
   - Filename: `{event-slug}-attendees-{YYYY-MM-DD}.csv`

4. **Download Starts**
   - Browser triggers download automatically
   - CSV file saved to Downloads folder
   - Button returns to normal state

5. **Use CSV Data**
   - Open in Excel, Google Sheets, etc.
   - Use for badge printing
   - Import into email marketing tools
   - Generate reports

### CSV Format

- **Columns**: Name, Email, Ticket Type, Registration Date, Payment Status
- **Encoding**: UTF-8
- **Delimiter**: Comma
- **Headers**: First row

### Data Privacy Note

CSV contains PII (names, emails). Organizer responsible for:
- Secure storage
- GDPR compliance
- Proper disposal after event

### Result

Organizer has offline copy of attendee data for operational use.

---

## Workflow 5: Resend Confirmation Email

**Actor**: Event Organizer  
**Goal**: Re-send confirmation email to attendee  
**Prerequisites**: Attendee's registration exists

### Steps

1. **Locate Attendee**
   - Use search or scroll to find attendee
   - Example: "Jane Doe" who didn't receive email

2. **Click Resend Button**
   - Mail icon button in Actions column
   - Confirmation modal may appear (recommended)

3. **Server Processing**
   - tRPC mutation: `registration.resendConfirmation`
   - Fetches registration with event details
   - Retrieves registration code from customData
   - Sends confirmation email:
     ```typescript
     sendEmail({
       to: registration.email,
       subject: "Registration Confirmed: {eventName}",
       react: RegistrationConfirmation({ ... })
     })
     ```

4. **Success Feedback**
   - Toast notification: "Confirmation email resent to jane@example.com"
   - OR: Success message in UI

5. **Attendee Receives Email**
   - Email arrives within minutes
   - Contains registration code and event details

### Use Cases

- Attendee claims they didn't receive original email
- Email bounced initially, now fixed
- Attendee lost/deleted original email

### Error Handling

- Email send failure: Error logged, organizer notified
- Registration not found: Error message displayed

### Result

Attendee receives their confirmation email again.

---

## Workflow 6: Cancel Registration

**Actor**: Event Organizer  
**Goal**: Cancel an attendee's registration and free up ticket  
**Prerequisites**: Attendee's registration exists

### Steps

1. **Locate Attendee**
   - Use search or scroll to find attendee
   - Example: Duplicate registration or attendee requested cancellation

2. **Click Cancel Button**
   - Trash icon button (red) in Actions column
   - **Confirmation modal appears**: "Are you sure you want to cancel this registration?"
   - Warning: "This action cannot be undone"

3. **Confirm Cancellation**
   - Click "Yes, Cancel Registration"
   - tRPC mutation: `registration.cancel`

4. **Server Processing**
   - Database transaction:
     ```typescript
     await db.$transaction(async (tx) => {
       // Delete registration
       await tx.registration.delete({ where: { id } });
       // Future: Update ticket availability
     });
     ```

5. **Success Feedback**
   - Registration removed from table
   - Toast notification: "Registration cancelled successfully"
   - Table row disappears or fades out

6. **Manual Notification** (Recommended)
   - System does NOT automatically email attendee
   - Organizer should manually notify:
     - "Your registration has been cancelled"
     - Reason for cancellation
     - Refund info (if applicable)

### Use Cases

- Duplicate registration
- Attendee requested cancellation
- Test registration cleanup
- Inappropriate/spam registration

### Important Notes

- **Permanent**: Cannot be undone
- **No Email**: Organizer must notify attendee manually
- **Ticket Freed**: Future: increases available ticket count
- **Data Lost**: Registration data permanently deleted

### Result

Registration cancelled, ticket potentially available for someone else.

---

## Workflow 7: Monitor Email Status

**Actor**: Event Organizer  
**Goal**: Identify attendees with email delivery issues  
**Prerequisites**: Email webhooks configured (Resend)

### Steps

1. **View Attendees List**
   - Navigate to attendees page
   - Email Status column visible

2. **Identify Issues**
   - **Green "Active" badge**: Email deliverable (normal)
   - **Red "Bounced" badge**: Email hard bounced (problem)
   - **Gray "Unsubscribed" badge**: User opted out

3. **Filter by Email Status** (future enhancement)
   - Currently: Visual scan of badges
   - Future: Add email status filter dropdown

4. **Take Action on Bounced Emails**
   - **Option 1**: Contact attendee via alternative method
   - **Option 2**: Request updated email address
   - **Option 3**: Cancel registration if unreachable

5. **Respect Unsubscribed Status**
   - Do not send campaign emails to unsubscribed users
   - Communications module automatically filters them out

### Email Status Updates

**Automatic** (via webhook):
```typescript
// Called by Resend webhook
POST /api/webhooks/email-status
{
  email: "attendee@example.com",
  status: "bounced"
}

// Updates all registrations with that email
await db.registration.updateMany({
  where: { email },
  data: { emailStatus: "bounced" }
});
```

### Use Cases

- Pre-event: Identify bad emails before mass email campaign
- Post-event: Follow up with unreachable attendees
- Compliance: Respect opt-outs

### Result

Organizer maintains clean email list, respects attendee preferences.

---

## Workflow 8: Import Attendees from CSV

**Actor**: Event Organizer  
**Goal**: Bulk import attendees from a CSV file  
**Prerequisites**: Event exists with at least one ticket type created

### Steps

#### Phase 1: File Upload

1. **Navigate to Import Page**
   - From attendees page, click "Import Attendees" button
   - Route: `/(dashboard)/[eventId]/attendees/import`

2. **Download CSV Template** (Optional but Recommended)
   - Click "Download CSV Template" button
   - Opens sample CSV file with correct format
   - Use as reference for preparing import file

3. **Prepare CSV File**
   - Required columns: name, email, ticketType
   - Optional columns: paymentStatus, emailStatus
   - Custom columns: Any additional fields (e.g., company, role)
   - Ensure UTF-8 encoding
   - Check file size: Must be under 10MB AND 10,000 rows

4. **Upload File**
   - Drag & drop CSV file onto dropzone
   - OR click to browse and select file
   - File validation occurs:
     - Format check (must be .csv)
     - Size check (10MB max)
     - Row count check (10,000 max)

5. **Select Email Option**
   - Check "Send confirmation emails" if you want attendees to receive emails
   - Default: Unchecked (no emails sent)
   - Recommendation: Uncheck for test imports, check for production

6. **Review Preview**
   - System shows first 10 rows of CSV
   - Shows total row count
   - Displays column headers
   - Click "Next" to proceed

#### Phase 2: Field Mapping

7. **Review Auto-Suggested Mappings**
   - System auto-suggests mappings based on column names:
     - "Full Name" / "Name" → Name
     - "Email Address" / "Email" → Email
     - "Ticket" / "Ticket Type" → Ticket Type
   - Review each suggestion for accuracy

8. **Adjust Mappings**
   - For each CSV column, select target field from dropdown:
     - **Name** * (required)
     - **Email** * (required)
     - **Ticket Type** * (required)
     - Payment Status (optional)
     - Email Status (optional)
     - Custom Field (optional)
     - -- Do not import -- (skip column)
   
9. **Review Sample Data**
   - Each row shows sample data from first row
   - Verify mapping is correct based on sample
   - Example: If "Email" column shows a name, mapping is wrong

10. **Handle Custom Fields**
    - Unmapped columns automatically become custom fields
    - Stored in registration's `customData` JSON
    - Example: "Company" column → `customData.company`

11. **Verify Required Fields**
    - System ensures all required fields are mapped:
      - ✓ Name mapped
      - ✓ Email mapped
      - ✓ Ticket Type mapped
    - "Next" button disabled until all required fields mapped

12. **Save Mappings**
    - Click "Next"
    - Mappings automatically saved to browser localStorage
    - Key: `events-ting:import-mapping:{eventId}`
    - Future imports for this event will remember mappings

#### Phase 3: Validation

13. **Automatic Validation Begins**
    - System validates all rows:
      - Email format validation
      - Name length validation (2-255 chars)
      - Ticket type existence check
      - **Phase 1**: In-file duplicate detection
      - **Phase 2**: Database duplicate detection

14. **Review Validation Summary**
    - **Valid rows**: Count of importable rows (green)
    - **Invalid rows**: Count of rows with errors (yellow)
    - **Duplicates**: Combined in-file and database duplicates (blue)
    - Example: "245 valid, 2 invalid, 5 duplicates"

15. **Review Detailed Errors**
    - Table shows all validation errors:
      - Row number (1-indexed)
      - Field with error
      - Invalid value
      - Error description
      - Error type (validation/duplicate_in_file/duplicate_in_db)
    - Examples:
      - Row 12: "invalid@" - Invalid email format (validation)
      - Row 15: "john@example.com" - Duplicate email in file (duplicate_in_file)
      - Row 20: "existing@example.com" - Already registered (duplicate_in_db)
      - Row 45: "Super VIP" - Ticket type not found (validation)

16. **Download Error Report** (Optional)
    - Click "Download Error Report" button
    - CSV file with all errors generated
    - Use to fix errors in original file
    - Re-import after fixing

17. **Choose Duplicate Strategy**
    - **Skip duplicates** (default, recommended):
      - Duplicate rows will be skipped
      - Existing registrations unchanged
      - Safer option
    - **Create new**:
      - Creates duplicate registrations
      - Warning: May cause confusion
      - Use only if intentional (e.g., same person, different ticket)

18. **Decide to Proceed**
    - Import button **enabled even with errors**
    - Only valid rows will be imported
    - Invalid rows automatically skipped
    - Warning message: "245 valid rows will be imported. 2 invalid rows will be skipped."
    - Click "Import" to proceed

#### Phase 4: Import Execution

19. **Import Begins**
    - Progress screen displays:
      - Indeterminate spinner (animated)
      - "Importing attendees..." message
      - "Please don't close this window" warning
    - Processing time: ~30 seconds for 100 rows, ~2 minutes for 1000 rows

20. **Partial Commit Processing**
    - System processes rows one by one:
      - Successful rows committed immediately
      - Failed rows logged and skipped
      - Processing continues after failures
    - Benefits:
      - Valid data saved even if some rows fail
      - No need to fix all errors before getting results

21. **Registration Code Generation**
    - Each imported attendee receives unique code
    - Format: 9-character alphanumeric (e.g., ABC123DEF)
    - Stored in `customData.registrationCode`
    - Used for check-in and confirmations

22. **Confirmation Emails Sent** (if enabled in Step 5)
    - Emails sent asynchronously
    - Contains:
      - Event name and details
      - Ticket type
      - Registration code
      - Event URL
    - Email failures logged but don't stop import

23. **Import Completes**
    - Spinner stops
    - Results screen displays:
      - ✓ Successful count (green badge)
      - ✗ Failed count (red badge)
      - ⊘ Skipped count (yellow badge)
    - Summary message: "245 attendees imported successfully, 2 failed, 3 duplicates skipped"
    - Status indicator:
      - **Completed**: All valid rows succeeded
      - **Partial**: Some valid rows failed
      - **Failed**: Import error occurred

24. **Review Failed Rows** (if any)
    - Table shows failed rows with error details
    - Limited to first 10 failures in UI
    - Click "Download Failed Rows CSV" for complete list
    - CSV includes original data + error column
    - Fix errors in CSV and re-import

25. **Complete Import**
    - Click "View Attendees" to see imported attendees
    - OR click "Import Another File" to start new import
    - Attendees list automatically refreshes

### Best Practices

#### CSV Preparation
1. **Use the template**: Always start with downloaded template
2. **Clean your data**:
   - Remove empty rows
   - Trim whitespace from names and emails
   - Ensure consistent formatting
3. **Validate emails**: Use external tool to verify email validity before import
4. **Check ticket types**: Ensure ticket type names match exactly (case-insensitive)
5. **Test with small file**: Import 5-10 rows first to test mappings

#### Field Mapping
1. **Review auto-mappings**: Don't assume they're correct
2. **Check sample data**: Use sample preview to verify mappings
3. **Mark custom fields**: Unmapped columns become custom fields - name them clearly
4. **Save time**: Mappings persist per event, only map once

#### Duplicate Handling
1. **Prefer "Skip"**: Safer to skip duplicates than create them
2. **Clean data first**: Remove in-file duplicates before upload
3. **Check existing registrations**: Review attendee list before import to identify potential duplicates
4. **Use "Create" cautiously**: Only if you truly want duplicate registrations

#### Error Resolution
1. **Download error report**: Essential for fixing large numbers of errors
2. **Fix systematically**: Address one error type at a time
3. **Ticket types first**: Create missing ticket types before importing
4. **Re-validate**: Fix and re-import instead of proceeding with errors
5. **Partial imports OK**: It's fine to import valid rows while fixing others

#### Email Strategy
1. **Test without emails first**: Uncheck email option for initial imports
2. **Send emails once**: Only enable emails for final production import
3. **Avoid spam**: Don't import same attendees multiple times with emails enabled
4. **Preview email template**: Test email with 1-2 rows before bulk import

### Use Cases

#### Scenario 1: Migrating from Google Forms
**Context**: 300 registrations collected via Google Forms

**Steps**:
1. Export Google Forms responses as CSV
2. Download Events-ting CSV template
3. Map Google Forms columns to template columns in Excel
4. Save as UTF-8 CSV
5. Import with emails disabled (test)
6. Review imported data
7. Delete test import if needed
8. Re-import with emails enabled (production)

#### Scenario 2: Pre-Event Registration Bulk Upload
**Context**: Sales team collected 50 VIP registrations offline

**Steps**:
1. Download template
2. Manually enter registrations in Excel
3. Ensure "Ticket Type" column says exactly "VIP Pass"
4. Save as CSV
5. Import with emails enabled
6. VIP attendees receive confirmation immediately

#### Scenario 3: Handling Duplicates
**Context**: Imported 200 rows, discovered 10 duplicates in validation

**Steps**:
1. Download error report
2. Review duplicates:
   - **In-file duplicates**: Remove from CSV before re-importing
   - **Database duplicates**: Verify they're truly duplicates, not typos
3. Fix CSV
4. Re-import with "Skip duplicates" strategy
5. All non-duplicates imported successfully

#### Scenario 4: Partial Import with Errors
**Context**: 500-row CSV with 20 invalid emails

**Steps**:
1. Proceed with import (valid rows only)
2. 480 attendees imported successfully
3. Download failed rows CSV
4. Fix 20 invalid emails in external tool
5. Re-import fixed CSV
6. All 500 attendees now registered

### Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid email format" | Email doesn't match regex | Fix email format (must include @ and domain) |
| "Name too short" | Name < 2 characters | Provide full name |
| "Ticket type not found" | Ticket type name doesn't exist in event | Create ticket type OR fix column value |
| "Duplicate email in file (first at row X)" | Same email appears multiple times in CSV | Remove duplicate rows from CSV |
| "Email already registered for this event" | Email exists in database for this event | Skip duplicate OR use different email |
| "File exceeds 10MB limit" | File too large | Split into multiple files |
| "File exceeds 10,000 row limit" | Too many rows | Split into batches of <10,000 |
| "Please upload a valid CSV file" | File is not CSV format | Save file as CSV (not Excel) |
| "Required field not mapped" | Name, email, or ticket type not mapped | Map all required fields |

### Troubleshooting

**Problem**: Auto-mapping is incorrect

**Solution**: Manually adjust mappings in Step 2. Mappings are saved for future imports.

---

**Problem**: All rows show "Ticket type not found" error

**Solution**: 
1. Check ticket type names in CSV match event's ticket types (case-insensitive)
2. Create missing ticket types in event setup
3. OR update CSV to use existing ticket type names

---

**Problem**: Import is slow (>2 minutes for 1000 rows)

**Solution**: 
- **Expected**: Large imports take time
- **Optimization**: Split into smaller batches of 500 rows
- **Future**: Background processing will be added

---

**Problem**: Some attendees didn't receive confirmation emails

**Solution**:
1. Check their email status in attendee list
2. If "bounced", email address is invalid
3. Resend confirmation manually from attendee list
4. OR update email and re-send

---

**Problem**: Imported data missing custom fields

**Solution**:
- Custom fields come from unmapped columns
- Check field mapping: ensure column is NOT set to "-- Do not import --"
- Custom data stored in registration's `customData` JSON field

---

**Problem**: Can't find imported attendees in list

**Solution**:
1. Refresh attendees page
2. Clear search/filters
3. Check import completed successfully (status: "Completed")
4. Verify event ID matches

### Result

Organizer successfully imports bulk attendees, saving hours of manual data entry. Import validation catches data quality issues, and partial commit ensures valid data is saved immediately.

---

## State Transitions

### Email Status Flow

```
active → bounced (via webhook)
active → unsubscribed (via webhook or user action)
bounced → active (manual correction, rare)
```

### Registration Lifecycle

```
[Registration Created]
       ↓
[Active in System]
       ↓
    ┌──┴──┐
    ↓     ↓
[Attended] [Cancelled]
```

---

## Best Practices

### For Organizers

1. **Regular Monitoring**: Check attendee list weekly leading up to event
2. **Export Early**: Export attendee list 1 week before event for planning
3. **Clean Email List**: Address bounced emails promptly
4. **Confirm Cancellations**: Always confirm before canceling (prevent accidents)
5. **Manual Notifications**: Email attendees when canceling their registration
6. **Data Privacy**: Delete exports after event if not needed for records

### For Developers

1. **Confirmation Modals**: Always confirm destructive actions (cancel)
2. **Loading States**: Show feedback during mutations
3. **Error Handling**: Gracefully handle API failures
4. **Debounce Search**: 500ms standard for search inputs
5. **Pagination**: Use infinite scroll for large lists
6. **Authorization**: Always verify organizer ownership

---

## Related Documentation

- [Backend Documentation](./backend.md) - Registration router procedures
- [Frontend Documentation](./frontend.md) - AttendeeTable component
- [Data Model](./data-model.md) - Registration model
- [Registration Module Workflows](../registration/workflows.md) - Registration creation

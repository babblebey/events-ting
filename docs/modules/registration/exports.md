# Registration Exports

## CSV Export Functionality

### Purpose
Allow organizers to download attendee data for offline processing, badge printing, or integration with external systems.

### Export Format

#### Standard CSV Structure
```csv
Name,Email,Ticket Type,Registration Date,Payment Status
John Doe,john@example.com,General Admission,2025-01-15T10:30:00Z,free
Jane Smith,jane@example.com,VIP Pass,2025-01-16T14:20:00Z,free
```

#### Generated Filename
Format: `{event-slug}-attendees-{date}.csv`  
Example: `tech-conf-2025-attendees-2025-01-20.csv`

### API Procedure

**Endpoint**: `registration.export`

**Input**:
```typescript
{
  eventId: string;
  format: 'csv' | 'json'; // Default: 'csv'
}
```

**Output**:
```typescript
{
  url: string;           // Data URI for download
  filename: string;      // Suggested filename
  expiresAt: Date;       // 5 minutes from generation
}
```

### Implementation

The export generates a data URI for immediate download:

```typescript
const csv = generateCSV(registrations);
const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
```

### Frontend Usage

```typescript
const exportRegistrations = api.registration.export.useMutation({
  onSuccess: (data) => {
    // Trigger download
    const link = document.createElement('a');
    link.href = data.url;
    link.download = data.filename;
    link.click();
  },
});

// Trigger export
<Button onClick={() => exportRegistrations.mutate({ eventId })}>
  Export to CSV
</Button>
```

### Data Privacy Considerations

- Only event organizers can export
- Includes personal data (names, emails)
- Respect email status (unsubscribed users still included but flagged)
- GDPR compliance: Attendees have consented via registration

### Future Enhancements

**Additional Formats**:
- **Excel format** (.xlsx) with multiple sheets
- **JSON format** for programmatic access
- **PDF format** for printing

**Custom Field Selection**:
- Choose which columns to include/exclude
- Reorder columns
- Save export templates

**Filtered Exports**:
- Export by ticket type
- Export by date range (registration date)
- Export by email status
- Export by payment status

**Delivery Options**:
- **Email export** (send file via email instead of download)
- **Scheduled exports** (daily/weekly automated exports)
- **Cloud storage** (save to Google Drive, Dropbox)

**Enhanced Data**:
- Include custom field data
- Include check-in status (future)
- Include QR codes (future)
- Include payment details

**See Also**: [Backend Documentation](./backend.md#registrationexport) for implementation details

### Error Handling

**Authorization Errors**:
```typescript
onError: (error) => {
  if (error.code === 'FORBIDDEN') {
    toast.error('You do not have permission to export this data');
  } else if (error.code === 'NOT_FOUND') {
    toast.error('Event not found');
  } else {
    toast.error('Failed to generate export. Please try again.');
  }
}
```

**Network Errors**:
- Display retry button
- Log error for debugging
- Show user-friendly message

**Data Processing Errors**:
- Validate CSV generation
- Handle special characters
- Ensure proper encoding

### Security

**Authorization**:
- Authorization check: Must be event organizer
- No caching: Export generated fresh each time
- Short-lived data URI: Expires after 5 minutes
- No storage: File not saved on server

**Data Privacy**:
- Contains personal identifiable information (PII)
- Organizer responsibility: Handle data securely
- GDPR compliance: Right to data portability
- Recommend: Encrypt downloaded files locally

**Rate Limiting** (Future):
- Limit exports per user per hour
- Prevent abuse and server overload
- Monitor export frequency

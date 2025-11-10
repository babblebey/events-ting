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

- **Excel format** (.xlsx)
- **Custom field selection** (choose which columns to include)
- **Filtered exports** (by ticket type, date range)
- **Email export** (send file via email instead of download)
- **Scheduled exports** (daily/weekly automated exports)

### Error Handling

```typescript
onError: (error) => {
  if (error.code === 'FORBIDDEN') {
    toast.error('You do not have permission to export this data');
  } else {
    toast.error('Failed to generate export');
  }
}
```

### Security

- Authorization check: Must be event organizer
- No caching: Export generated fresh each time
- Short-lived data URI: Expires after 5 minutes
- No storage: File not saved on server

# Events Data Model

## Primary Model: Event

```prisma
model Event {
  id          String   @id @default(cuid())
  slug        String   @unique // URL-friendly identifier
  name        String
  description String   @db.Text
  
  // Location & Timing
  locationType    String // 'in-person' | 'virtual' | 'hybrid'
  locationAddress String? // Physical address if in-person/hybrid
  locationUrl     String? // Virtual URL if virtual/hybrid
  timezone        String   @default("UTC") // IANA timezone
  startDate       DateTime // Stored in UTC
  endDate         DateTime // Stored in UTC
  
  // Status & Visibility
  status      String   @default("draft") // 'draft' | 'published' | 'archived'
  isArchived  Boolean  @default(false) // Soft delete flag
  
  // Organizer
  organizerId String
  organizer   User     @relation(fields: [organizerId], references: [id], onDelete: Restrict)
  
  // Relations
  ticketTypes      TicketType[]
  registrations    Registration[]
  scheduleEntries  ScheduleEntry[]
  callForPapers    CallForPapers?
  speakers         Speaker[]
  emailCampaigns   EmailCampaign[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([organizerId])
  @@index([slug])
  @@index([status, isArchived])
  @@index([startDate]) // For sorting events by date
  @@index([organizerId, status]) // For filtering organizer's events by status
}
```

---

## Field Descriptions

### Identity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (CUID) | Primary key, auto-generated |
| `slug` | String | URL-friendly identifier, must be unique across all events |
| `name` | String | Event name displayed publicly |
| `description` | Text | Full event description (supports markdown) |

### Location Fields

| Field | Type | Description |
|-------|------|-------------|
| `locationType` | String | `'in-person'`, `'virtual'`, or `'hybrid'` |
| `locationAddress` | String? | Physical address (required for in-person/hybrid) |
| `locationUrl` | String? | Virtual meeting URL (required for virtual/hybrid) |
| `timezone` | String | IANA timezone (e.g., `"America/New_York"`) |

**Location Type Rules**:
- **in-person**: `locationAddress` required, `locationUrl` optional
- **virtual**: `locationUrl` required, `locationAddress` optional
- **hybrid**: Both `locationAddress` and `locationUrl` required

### Timing Fields

| Field | Type | Description |
|-------|------|-------------|
| `startDate` | DateTime | Event start (stored in UTC, displayed in event timezone) |
| `endDate` | DateTime | Event end (stored in UTC, displayed in event timezone) |
| `timezone` | String | IANA timezone for consistent display |

**Important**: All dates are stored in UTC in the database but should be displayed and collected in the event's timezone in the UI.

### Status Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | String | Event lifecycle status |
| `isArchived` | Boolean | Soft delete flag (hidden from public) |

**Status Values**:
- `draft`: Event is being prepared, not visible to public
- `published`: Event is live and visible
- `archived`: Event is hidden (soft deleted)

### Custom Field Configuration

| Field | Type | Description |
|-------|------|-------------|
| `customFields` | JSON? | Optional array of custom registration field definitions |

**Custom Fields Schema**:
The `customFields` field stores an array of field definitions that attendees must fill during ticket assignment. Each field definition follows this structure:

```typescript
interface CustomFieldDefinition {
  id: string;              // Unique identifier (e.g., "dietary", "tshirt")
  label: string;           // Display label (e.g., "Dietary Restrictions")
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required: boolean;       // Whether response is mandatory
  placeholder?: string;    // Placeholder text (for text/textarea)
  options?: string[];      // Options array (for select/radio/checkbox)
  pattern?: string;        // Validation regex pattern (for text/textarea)
  minLength?: number;      // Minimum length (for text/textarea)
  maxLength?: number;      // Maximum length (for text/textarea)
  minSelections?: number;  // Minimum selections (for checkbox)
  maxSelections?: number;  // Maximum selections (for checkbox)
  helpText?: string;       // Help text displayed below field
}
```

**Example Configuration**:
```json
[
  {
    "id": "dietary",
    "label": "Dietary Restrictions",
    "type": "select",
    "required": false,
    "options": ["None", "Vegetarian", "Vegan", "Gluten-Free", "Other"],
    "helpText": "Let us know if you have any dietary requirements"
  },
  {
    "id": "tshirt",
    "label": "T-Shirt Size",
    "type": "select",
    "required": true,
    "options": ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    "id": "accessibility",
    "label": "Accessibility Needs",
    "type": "textarea",
    "required": false,
    "maxLength": 500,
    "helpText": "Please describe any accessibility accommodations you need"
  },
  {
    "id": "sessionPreferences",
    "label": "Session Interests",
    "type": "checkbox",
    "required": false,
    "options": ["Web Development", "AI/ML", "DevOps", "Mobile", "Security"],
    "minSelections": 1,
    "maxSelections": 3
  }
]
```

**Usage**: Custom field responses are collected during ticket assignment and stored in `Attendee.customData`. The system validates responses against these definitions before saving.

### Audit Fields

| Field | Type | Description |
|-------|------|-------------|
| `createdAt` | DateTime | When event was created |
| `updatedAt` | DateTime | Last modification timestamp |

---

## Relationships

### Belongs To

#### User (organizer)
- **Relation**: Many events → One user (organizer)
- **Foreign Key**: `organizerId`
- **On Delete**: `Restrict` (cannot delete user with events)
- **Purpose**: Tracks which user created/owns the event

### Has Many

#### TicketType
- **Relation**: One event → Many ticket types
- **Foreign Key**: `eventId` in TicketType
- **On Delete**: `Cascade` (deleting event deletes all tickets)
- **Purpose**: Different ticket tiers for the event

#### Registration
- **Relation**: One event → Many registrations
- **Foreign Key**: `eventId` in Registration
- **On Delete**: `Cascade`
- **Purpose**: Track all attendees registered for the event

#### ScheduleEntry
- **Relation**: One event → Many schedule entries
- **Foreign Key**: `eventId` in ScheduleEntry
- **On Delete**: `Cascade`
- **Purpose**: Event agenda/timeline

#### Speaker
- **Relation**: One event → Many speakers
- **Foreign Key**: `eventId` in Speaker
- **On Delete**: `Cascade`
- **Purpose**: Speakers presenting at the event

#### EmailCampaign
- **Relation**: One event → Many email campaigns
- **Foreign Key**: `eventId` in EmailCampaign
- **On Delete**: `Cascade`
- **Purpose**: Email communications to event attendees

### Has One

#### CallForPapers
- **Relation**: One event → One call for papers (optional)
- **Foreign Key**: `eventId` in CallForPapers
- **On Delete**: `Cascade`
- **Purpose**: CFP configuration for the event

---

## Indexes

Performance indexes for common queries:

```prisma
@@index([organizerId])              // List events by organizer
@@index([slug])                     // Lookup by slug (public pages)
@@index([status, isArchived])       // Filter published/draft/archived
@@index([startDate])                // Sort by date
@@index([organizerId, status])      // Organizer's events by status
```

### Query Optimization

**Public event listing**:
```sql
-- Uses index: [status, isArchived]
WHERE status = 'published' AND isArchived = false
ORDER BY startDate DESC
```

**Organizer dashboard**:
```sql
-- Uses index: [organizerId, status]
WHERE organizerId = 'user123' AND status = 'draft'
ORDER BY createdAt DESC
```

**Event detail by slug**:
```sql
-- Uses index: [slug]
WHERE slug = 'tech-conf-2025'
```

---

## Constraints

### Unique Constraints
- `slug` must be unique across all events (enforced at database level)

### Check Constraints (Application Level)
- `endDate` must be after `startDate`
- `locationAddress` required if `locationType` is `'in-person'` or `'hybrid'`
- `locationUrl` required if `locationType` is `'virtual'` or `'hybrid'`

### Default Values
- `status`: `'draft'`
- `isArchived`: `false`
- `timezone`: `'UTC'`
- `createdAt`: Current timestamp
- `updatedAt`: Current timestamp

---

## Cascade Behavior

When an event is **hard deleted** (not recommended):
- ✅ All ticket types are deleted
- ✅ All registrations are deleted
- ✅ All schedule entries are deleted
- ✅ All speakers are deleted
- ✅ Call for papers is deleted
- ✅ All email campaigns are deleted

**Recommendation**: Use soft delete (`isArchived = true`) instead of hard delete to preserve historical data.

---

## Common Queries

### Get Published Events
```typescript
const events = await db.event.findMany({
  where: {
    status: 'published',
    isArchived: false,
  },
  orderBy: { startDate: 'desc' },
});
```

### Get Organizer's Events
```typescript
const myEvents = await db.event.findMany({
  where: {
    organizerId: userId,
  },
  include: {
    _count: {
      select: {
        registrations: true,
        ticketTypes: true,
      },
    },
  },
});
```

### Get Event with Full Details
```typescript
const event = await db.event.findUnique({
  where: { slug: eventSlug },
  include: {
    organizer: {
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    },
    ticketTypes: true,
    speakers: true,
    scheduleEntries: true,
    _count: {
      select: { registrations: true },
    },
  },
});
```

---

## Migration History

Relevant migrations for the Event model:
- `20251108035708_add_event_management_system` - Initial Event model
- `20251108184514_add_indexes_for_sorting_and_filtering` - Performance indexes

---

## Related Models

- **User**: Organizer relationship
- **TicketType**: Event's ticket offerings
- **Registration**: Event attendees
- **ScheduleEntry**: Event timeline
- **Speaker**: Event presenters
- **CallForPapers**: CFP configuration
- **EmailCampaign**: Event communications

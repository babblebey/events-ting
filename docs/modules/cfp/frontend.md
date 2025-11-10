# CFP Frontend Documentation

## Overview

The CFP frontend consists of two main user interfaces: an organizer dashboard for managing CFPs and reviewing submissions, and a public submission form for speakers to submit proposals. Both interfaces are built with React Server Components (RSC) and client components using Flowbite React.

## Architecture

**Pattern**: Server Components for data fetching + Client Components for interactivity

### Organizer Interface
- Server Component: Fetches CFP and event data
- Client Component: Manages CFP state and submission reviews

### Public Interface
- Server Component: Fetches public CFP data
- Client Component: Handles submission form

---

## Organizer Dashboard

### Page: CFP Management

**File**: `src/app/(dashboard)/[id]/cfp/page.tsx`  
**Route**: `/(dashboard)/[id]/cfp`  
**Type**: Server Component  
**Authentication**: Required (redirects to sign-in if not authenticated)

**Purpose**: Main CFP management page for organizers

**Data Fetching**:
```typescript
// Verify event ownership
const event = await api.event.getById({ id });

// Fetch CFP if exists
const cfp = await api.cfp.getCfpByEventId({ eventId: id });
```

**Authorization**:
- Redirects to sign-in if not authenticated
- Redirects to event page if user is not the organizer

**Props Passed to Client**:
```typescript
<CfpManager
  eventId={event.id}
  eventName={event.name}
  eventSlug={event.slug}
  initialCfp={cfp}
/>
```

---

### Component: `CfpManager`

**File**: `src/app/(dashboard)/[id]/cfp/cfp-manager.tsx`  
**Type**: Client Component (`"use client"`)

**Purpose**: Manages CFP lifecycle and submission reviews

**Props**:
```typescript
{
  eventId: string,
  eventName: string,
  eventSlug: string,
  initialCfp: CallForPapers | null
}
```

**State Management**:
```typescript
const [showCfpForm, setShowCfpForm] = useState(false);
const [selectedSubmission, setSelectedSubmission] = useState<CfpSubmission | null>(null);
const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('pending');
```

**Features**:

#### 1. No CFP State
Shows empty state with "Open Call for Papers" button:
- Icon: `HiPlus`
- Action: Opens `CfpForm` modal

#### 2. Active CFP Display
Shows CFP details and submission management:
- **CFP Info Card**: Guidelines, deadline, status
- **Close CFP Button**: Changes status to 'closed'
- **Submission Stats**: Total count, pending count
- **Status Filter Tabs**: All, Pending, Accepted, Rejected
- **Submission Grid**: Cards for each submission

#### 3. Submission Review Modal
Opens when clicking on a submission:
- Uses `<Modal>` from Flowbite
- Displays `<ReviewPanel>` component
- Full-screen on mobile, large modal on desktop

**tRPC Queries**:
```typescript
// Fetch filtered submissions (infinite query)
api.cfp.listSubmissions.useInfiniteQuery({
  cfpId: initialCfp.id,
  status: statusFilter,
  limit: 100
}, {
  getNextPageParam: (lastPage) => lastPage.nextCursor
});
```

**tRPC Mutations**:
```typescript
// Close CFP
api.cfp.close.useMutation({
  onSuccess: () => {
    utils.cfp.listSubmissions.invalidate();
  }
});
```

**UI Components Used**:
- `Badge` - Status indicators
- `Button` - Actions
- `Modal` - Review submission dialog
- `HiPlus`, `HiLockClosed`, `HiLockOpen` - Icons

---

### Component: `CfpForm`

**File**: `src/components/cfp/cfp-form.tsx`  
**Type**: Client Component

**Purpose**: Create or update CFP settings

**Props**:
```typescript
{
  eventId: string,
  existingCfp?: CallForPapers,
  onSuccess?: () => void,
  onCancel?: () => void
}
```

**Form Fields**:
1. **Guidelines** (`<Textarea>`)
   - Placeholder: Submission requirements, format guidelines, selection criteria
   - Min 10 characters
   - Required

2. **Deadline** (`<TextInput type="datetime-local">`)
   - Must be in future
   - Required

3. **Required Fields** (`<Checkbox>`)
   - Options: Speaker Bio, Speaker Photo
   - Stored as JSON array

**Validation**:
- Uses Zod schema from validators
- Client-side validation via React Hook Form (if implemented)
- Server-side validation in tRPC procedure

**tRPC Mutations**:
```typescript
// Create new CFP
api.cfp.open.useMutation();

// Update existing CFP
api.cfp.update.useMutation();
```

**Actions**:
- Submit button (green)
- Cancel button (gray)

---

### Component: `SubmissionCard`

**File**: `src/components/cfp/submission-card.tsx`  
**Type**: Client Component

**Purpose**: Display submission summary in grid view

**Props**:
```typescript
{
  submission: CfpSubmission,
  onClick?: () => void
}
```

**Display Sections**:

1. **Header**
   - Submission title (h3)
   - Status badge (warning/success/failure colors)
   - Session format badge (gray)
   - Duration badge (gray)
   - Review score (if exists) - Blue circle with number

2. **Description Preview**
   - Line-clamp-3 (shows first 3 lines)
   - Ellipsis for overflow

3. **Speaker Info**
   - Photo (if available) - 8x8 rounded circle
   - Name and email
   - Social links (Twitter, GitHub, LinkedIn, Website)

4. **Review Notes Preview** (if exists)
   - Yellow bordered box
   - Line-clamp-2 (shows first 2 lines)

5. **Footer**
   - Submitted date
   - Reviewed date (if reviewed)

**Styling**:
- Hover effect: Shadow increases on hover
- Cursor: pointer
- Click: Opens review modal

**Status Colors**:
```typescript
const STATUS_COLORS = {
  pending: "warning",  // Yellow
  accepted: "success", // Green
  rejected: "failure"  // Red
};
```

---

### Component: `ReviewPanel`

**File**: `src/components/cfp/review-panel.tsx`  
**Type**: Client Component

**Purpose**: Review and accept/reject submissions

**Props**:
```typescript
{
  submission: CfpSubmission,
  onSuccess?: () => void
}
```

**Features**:

#### 1. Submission Details Display
- Title (h2)
- Format, Duration, Status badges
- Description (full text, pre-wrap)
- Speaker bio (full text, pre-wrap)

#### 2. Review Section (Blue bordered box)

**Score Selection** (only if pending):
- 5 buttons (1-5)
- Selected: Blue background, white text
- Not selected: Gray border, white background
- Disabled if not pending or saving

**Review Notes** (`<Textarea>`):
- 6 rows
- Placeholder: "Add your feedback, suggestions, or reasons for your decision..."
- Disabled if not pending or saving
- Hint: Notes will be included in acceptance/rejection email

**Save Review Button** (only if pending):
- Gray button
- Saves notes and score without changing status
- Updates reviewedAt timestamp

#### 3. Accept/Reject Actions (only if pending)
- **Accept Proposal** button (green, full width)
- **Reject Proposal** button (red, full width)
- Side-by-side layout
- Disabled while saving

#### 4. Status Indicators
- **Accepted**: Green box with checkmark, shows if speaker profile created
- **Rejected**: Red box with X

**tRPC Mutations**:
```typescript
// Save review
api.cfp.reviewSubmission.useMutation();

// Accept proposal
api.cfp.acceptProposal.useMutation();

// Reject proposal
api.cfp.rejectProposal.useMutation();
```

**Error Handling**:
- Displays error message in red bordered box if mutation fails

---

## Public Submission Interface

### Page: Public CFP

**File**: `src/app/events/[slug]/cfp/page.tsx`  
**Route**: `/events/[slug]/cfp`  
**Type**: Server Component  
**Authentication**: Not required

**Purpose**: Public CFP submission page

**Data Fetching**:
```typescript
// Fetch event by slug
const event = await api.event.getBySlug({ slug });

// Fetch public CFP data
const cfp = await api.cfp.getPublicCfp({ eventSlug: slug });
```

**Redirects**:
- If event not found: redirect to `/events`
- If CFP not found: redirect to event page

**Props Passed to Client**:
```typescript
<CfpPublicContent
  event={event}
  cfp={cfp}
/>
```

---

### Component: `CfpPublicContent`

**File**: `src/app/events/[slug]/cfp/cfp-public-content.tsx`  
**Type**: Client Component

**Purpose**: Display CFP info and submission form to public

**Props**:
```typescript
{
  event: Event,
  cfp: {
    id: string,
    guidelines: string,
    deadline: Date,
    status: string,
    requiredFields: Json | null
  }
}
```

**Display Sections**:

1. **Header**
   - Event name (h1)
   - "Call for Papers" subtitle
   - Event date and location

2. **CFP Status**
   - Open: Green badge with deadline countdown
   - Closed: Red badge "CFP Closed"

3. **Guidelines**
   - Pre-formatted text (white-space: pre-wrap)
   - Styled box with border

4. **Submission Form** (if CFP is open and deadline not passed)
   - `<CfpSubmissionForm>` component
   - Hidden if CFP closed or deadline passed

5. **Closed Message** (if CFP closed or deadline passed)
   - Gray box
   - Message: "Submissions are no longer being accepted"

---

### Component: `CfpSubmissionForm`

**File**: `src/components/cfp/cfp-submission-form.tsx`  
**Type**: Client Component

**Purpose**: Public form for submitting session proposals

**Props**:
```typescript
{
  cfpId: string,
  eventName: string,
  requiredFields?: string[]
}
```

**Form Sections**:

#### 1. Session Details
- **Title** (`<TextInput>`)
  - Min 5, max 200 characters
  - Required
  - Placeholder: "Your session title"

- **Description** (`<Textarea>`)
  - Min 50, max 3000 characters
  - Required
  - 8 rows
  - Placeholder: "Describe your session in detail..."

- **Session Format** (`<Select>`)
  - Options: Talk, Workshop, Panel, Lightning Talk
  - Required

- **Duration** (`<Select>`)
  - Options: 15, 30, 45, 60, 90, 120, 180, 240 minutes
  - Required
  - Default: 45

#### 2. Speaker Information
- **Name** (`<TextInput>`)
  - Min 2, max 100 characters
  - Required

- **Email** (`<TextInput type="email">`)
  - Valid email format
  - Required

- **Bio** (`<Textarea>`)
  - Min 50, max 1000 characters
  - Required
  - 6 rows
  - Placeholder: "Tell us about yourself..."

- **Photo** (`<TextInput>`)
  - URL format
  - Optional (unless in requiredFields)
  - Placeholder: "https://..."

#### 3. Social Links (Optional)
- **Twitter** (`<TextInput>`)
  - Max 50 characters
  - Placeholder: "@username or username"

- **GitHub** (`<TextInput>`)
  - Max 50 characters
  - Placeholder: "username"

- **LinkedIn** (`<TextInput>`)
  - Max 100 characters
  - Placeholder: "username"

- **Website** (`<TextInput>`)
  - URL format
  - Placeholder: "https://..."

**Form State**:
```typescript
const [formData, setFormData] = useState({...});
const [isSubmitting, setIsSubmitting] = useState(false);
const [submitted, setSubmitted] = useState(false);
```

**Validation**:
- Client-side: Form field constraints
- Server-side: Zod schema in `submitProposal` procedure
- Deadline check: Happens server-side

**tRPC Mutation**:
```typescript
api.cfp.submitProposal.useMutation({
  onSuccess: () => {
    setSubmitted(true);
    // Show success message
  },
  onError: (error) => {
    // Show error message (e.g., deadline passed)
  }
});
```

**Success State**:
- Green bordered box
- Checkmark icon
- Message: "Your proposal has been submitted!"
- Subtext: "You'll receive a confirmation email shortly."

**Actions**:
- Submit button (blue, full width)
- Disabled while submitting
- Shows "Submitting..." text when loading

---

## UI Components (Flowbite React)

### Used Throughout CFP UI

- `Badge` - Status indicators
- `Button` - All actions
- `Card` - Submission cards
- `Modal`, `ModalHeader`, `ModalBody` - Review dialog
- `TextInput` - Form inputs
- `Textarea` - Multi-line inputs
- `Select` - Dropdowns
- `Label` - Form labels
- `Checkbox` - Required fields selection

### Icons (React Icons)

- `HiPlus` - Add new CFP
- `HiLockClosed` - CFP closed
- `HiLockOpen` - CFP open
- `HiCheckCircle` - Accepted status
- `HiXCircle` - Rejected status

---

## Responsive Design

### Mobile (< 768px)
- Single column layout
- Full-width cards
- Stacked submission cards
- Modal takes full screen

### Tablet (768px - 1024px)
- 2 column grid for submissions
- Modal is 90% width

### Desktop (> 1024px)
- 3 column grid for submissions
- Modal is max-w-4xl (56rem)

---

## State Management

### Client State (React useState)
- Form inputs
- Modal open/close
- Selected submission
- Status filter
- Submission success

### Server State (tRPC)
- CFP data
- Submissions list
- Mutations automatically invalidate queries

---

## Loading States

1. **Page Load**: Server component handles initial loading
2. **Submission List**: Shows "Loading..." in table cell
3. **Form Submit**: Button shows "Submitting..." and is disabled
4. **Mutation Actions**: Buttons disabled while pending

---

## Error Handling

### Display Errors
- Red bordered box below form/button
- Clear error message from TRPC error
- Examples:
  - "CFP deadline has passed"
  - "Submission not found"
  - "Only the event organizer can review submissions"

### User Feedback
- Success: Green bordered box with checkmark
- Error: Red bordered box with X icon
- Loading: Disabled buttons with loading text

---

## Accessibility

- Semantic HTML (h1, h2, h3, form, label)
- Form labels associated with inputs
- Button states (disabled, loading)
- Color contrast meets WCAG AA
- Keyboard navigation supported

---

## Best Practices

### For Organizers
1. **Review Regularly**: Check submissions frequently
2. **Use Filters**: Use status filter to focus on pending submissions
3. **Add Notes**: Always add review notes for context
4. **Score Consistently**: Use the 1-5 scale consistently

### For Developers
1. **Server Components**: Use for data fetching
2. **Client Components**: Use for interactivity only
3. **Optimistic Updates**: Invalidate queries after mutations
4. **Error Boundaries**: Wrap client components with error boundaries
5. **Loading States**: Always show loading feedback

---

## Related Documentation

- [Backend Documentation](./backend.md) - tRPC procedures
- [Data Model](./data-model.md) - Database schema
- [Workflows](./workflows.md) - User flows
- [Email Templates](./email-templates.md) - Email notifications

# CFP Workflows

## Overview

This document describes the complete workflows for the Call for Papers module, from creation to acceptance/rejection of proposals. It covers both organizer and speaker perspectives.

---

## Workflow 1: Open Call for Papers

**Actor**: Event Organizer  
**Goal**: Create a CFP to collect session proposals  
**Prerequisites**: Event must exist and be owned by organizer

### Steps

1. **Navigate to CFP Page**
   - Go to event dashboard: `/(dashboard)/[eventId]`
   - Click on "CFP" tab in navigation
   - Route: `/(dashboard)/[eventId]/cfp`

2. **Initiate CFP Creation**
   - Page shows "No Call for Papers Yet" empty state
   - Click "Open Call for Papers" button
   - Modal opens with `<CfpForm>` component

3. **Fill CFP Details**
   - **Guidelines** (required):
     - Enter submission requirements
     - Include format guidelines, topics, selection criteria
     - Min 10 characters
   
   - **Deadline** (required):
     - Select date and time
     - Must be in future
     - Displayed in organizer's local timezone, stored as UTC
   
   - **Required Fields** (optional):
     - Check "Speaker Bio" if required
     - Check "Speaker Photo" if required
     - Unchecked fields are optional in submission form

4. **Submit CFP**
   - Click "Open CFP" button
   - tRPC mutation: `cfp.open`
   - Validation checks:
     - ✓ User owns the event
     - ✓ No existing CFP for this event
     - ✓ Deadline is in future

5. **Success**
   - Modal closes
   - Page refreshes to show active CFP
   - CFP details displayed with:
     - Guidelines
     - Deadline countdown
     - "Open" status badge
     - Link to public submission page
   - Public submission page is now accessible at `/events/[slug]/cfp`

### Data Created

```typescript
{
  id: "clx...",
  eventId: "clx...",
  guidelines: "We're looking for talks about...",
  deadline: Date("2025-12-31T23:59:00Z"),
  status: "open",
  requiredFields: ["speakerBio"],
  createdAt: Date,
  updatedAt: Date
}
```

### Error Scenarios

- **Event Not Found**: Redirects to events list
- **Not Event Organizer**: Redirects to public event page
- **CFP Already Exists**: Error message: "CFP already exists for this event"
- **Deadline in Past**: Error message: "CFP deadline must be in the future"

---

## Workflow 2: Public Submission Flow

**Actor**: Potential Speaker  
**Goal**: Submit a session proposal  
**Prerequisites**: CFP is open and deadline hasn't passed

### Steps

1. **Discover CFP**
   - Browse to public event page: `/events/[slug]`
   - See "Submit a Proposal" button or link
   - OR: Direct link to `/events/[slug]/cfp`

2. **View CFP Details**
   - CFP page loads with:
     - Event name and details
     - CFP status (Open with deadline)
     - Submission guidelines
     - Submission form (if open)

3. **Check Eligibility**
   - System checks:
     - ✓ CFP status is 'open'
     - ✓ Current time < deadline
   - If closed or past deadline:
     - Form hidden
     - Message: "Submissions are no longer being accepted"

4. **Fill Submission Form**

   **Session Details**:
   - Title: "Building Scalable APIs with tRPC"
   - Description: Detailed session description (min 50 chars)
   - Format: "Talk" (from dropdown)
   - Duration: 45 minutes (from dropdown)

   **Speaker Information**:
   - Name: "Jane Doe"
   - Email: "jane@example.com"
   - Bio: Speaker biography (min 50 chars)
   - Photo URL: "https://..." (if required)

   **Social Links** (optional):
   - Twitter: "@janedoe"
   - GitHub: "janedoe"
   - LinkedIn: "janedoe"
   - Website: "https://janedoe.com"

5. **Submit Proposal**
   - Click "Submit Proposal" button
   - tRPC mutation: `cfp.submitProposal`
   - Validation checks:
     - ✓ CFP exists and is open
     - ✓ Deadline hasn't passed
     - ✓ All required fields filled
     - ✓ Field formats valid (email, URLs, lengths)

6. **Server-Side Processing**
   - Create `CfpSubmission` record with status: "pending"
   - Send confirmation email asynchronously
   - Email template: `CfpSubmissionReceived`
   - Email sent to: `speakerEmail`

7. **Success Confirmation**
   - Form replaced with success message:
     - Green bordered box
     - Checkmark icon
     - "Your proposal has been submitted!"
     - "You'll receive a confirmation email shortly"

8. **Receive Confirmation Email**
   - Speaker receives email within minutes
   - Subject: "Proposal Received: [Event Name]"
   - Contains:
     - Proposal title
     - Event details
     - Next steps information
     - Link to event page

### Data Created

```typescript
{
  id: "clx...",
  eventId: "clx...",
  cfpId: "clx...",
  title: "Building Scalable APIs with tRPC",
  description: "In this talk, we'll explore...",
  sessionFormat: "talk",
  duration: 45,
  speakerName: "Jane Doe",
  speakerEmail: "jane@example.com",
  speakerBio: "Jane is a software engineer...",
  speakerPhoto: "https://...",
  speakerTwitter: "@janedoe",
  speakerGithub: "janedoe",
  speakerLinkedin: "janedoe",
  speakerWebsite: "https://janedoe.com",
  status: "pending",
  reviewNotes: null,
  reviewScore: null,
  speakerId: null,
  submittedAt: Date,
  reviewedAt: null,
  updatedAt: Date
}
```

### Error Scenarios

- **CFP Not Found**: Redirects to event page
- **CFP Closed**: Form hidden, message shown
- **Deadline Passed**: Error: "The submission deadline has passed"
- **Invalid Email**: Error: "Please enter a valid email address"
- **Missing Required Fields**: Error: "Please fill in all required fields"
- **Description Too Short**: Error: "Description must be at least 50 characters"

---

## Workflow 3: Review Submissions

**Actor**: Event Organizer  
**Goal**: Review and score proposals  
**Prerequisites**: At least one submission exists

### Steps

1. **View Submissions Dashboard**
   - Go to CFP management page: `/(dashboard)/[eventId]/cfp`
   - See submission statistics:
     - Total count: 15 submissions
     - Pending count: 10 pending
   - See status filter tabs: All, Pending, Accepted, Rejected

2. **Filter Submissions**
   - Click "Pending" tab
   - tRPC query: `cfp.listSubmissions` with `status: "pending"`
   - Grid of `<SubmissionCard>` components displays

3. **Select Submission to Review**
   - Click on a submission card
   - Modal opens with `<ReviewPanel>` component
   - Displays:
     - Full proposal title and description
     - Speaker bio
     - Session details (format, duration)
     - Current status

4. **Add Review Score**
   - Click score button (1-5)
   - Selected score highlights in blue
   - Score represents evaluation:
     - 1 = Poor fit
     - 3 = Good but not selected
     - 5 = Excellent, accept

5. **Add Review Notes**
   - Type notes in textarea
   - Example: "Great topic, well-structured proposal. Could use more technical depth."
   - Notes will be included in acceptance/rejection email

6. **Save Review** (Optional intermediate step)
   - Click "Save Review" button
   - tRPC mutation: `cfp.reviewSubmission`
   - Updates:
     - `reviewScore`: 4
     - `reviewNotes`: "Great topic..."
     - `reviewedAt`: Current timestamp
   - Status remains "pending"
   - Can continue reviewing other submissions

7. **Return to Dashboard**
   - Close modal
   - Submission card now shows review score badge

### Data Updated

```typescript
{
  // ... existing submission fields
  reviewNotes: "Great topic, well-structured proposal...",
  reviewScore: 4,
  reviewedAt: Date("2025-11-10T15:30:00Z"),
  status: "pending", // Still pending until accept/reject
  updatedAt: Date
}
```

---

## Workflow 4: Accept Proposal

**Actor**: Event Organizer  
**Goal**: Accept a proposal and create speaker profile  
**Prerequisites**: Submission exists with status "pending"

### Steps

1. **Open Submission for Decision**
   - Follow steps 1-3 from Workflow 3
   - Submission shows in review panel
   - Status is "pending"

2. **Verify Decision**
   - Review score and notes (if added)
   - Confirm acceptance decision

3. **Click Accept Button**
   - Green "Accept Proposal" button
   - Confirmation: "Are you sure you want to accept this proposal?"
   - Click confirm

4. **Server-Side Processing** (Atomic Transaction)
   
   **Step 4a: Check for Existing Speaker**
   ```typescript
   const existingSpeaker = await db.speaker.findFirst({
     where: {
       eventId: submission.eventId,
       email: submission.speakerEmail
     }
   });
   ```

   **Step 4b: Create Speaker Profile** (if doesn't exist)
   ```typescript
   const speaker = await db.speaker.create({
     data: {
       eventId: submission.eventId,
       name: submission.speakerName,
       email: submission.speakerEmail,
       bio: submission.speakerBio,
       photo: submission.speakerPhoto,
       twitter: submission.speakerTwitter,
       github: submission.speakerGithub,
       linkedin: submission.speakerLinkedin,
       website: submission.speakerWebsite
     }
   });
   ```

   **Step 4c: Update Submission**
   ```typescript
   await db.cfpSubmission.update({
     where: { id: submission.id },
     data: {
       status: "accepted",
       speakerId: speaker.id,
       reviewedAt: new Date()
     }
   });
   ```

   **Step 4d: Send Acceptance Email**
   - Email template: `CfpAccepted`
   - To: `speakerEmail`
   - Subject: "Congratulations! Your proposal for [Event Name] has been accepted!"
   - Includes:
     - Proposal title
     - Session format and duration
     - Event date
     - Next steps for speakers

5. **Success Feedback**
   - Modal shows green success box
   - Message: "✓ This proposal has been accepted"
   - Subtitle: "Speaker profile created"
   - Modal can be closed

6. **Speaker Receives Email**
   - Acceptance email arrives
   - Contains congratulations and next steps
   - Includes link to event page

7. **Verify Speaker Profile**
   - Navigate to Speakers tab
   - New speaker appears in list
   - Linked to accepted CFP submission

### Data Created/Updated

**CfpSubmission Updated**:
```typescript
{
  // ... existing fields
  status: "accepted",
  speakerId: "clx...",
  reviewedAt: Date("2025-11-10T16:00:00Z"),
  updatedAt: Date
}
```

**Speaker Created** (if new):
```typescript
{
  id: "clx...",
  eventId: "clx...",
  name: "Jane Doe",
  email: "jane@example.com",
  bio: "Jane is a software engineer...",
  photo: "https://...",
  twitter: "@janedoe",
  github: "janedoe",
  linkedin: "janedoe",
  website: "https://janedoe.com",
  tagline: null,
  company: null,
  role: null,
  createdAt: Date,
  updatedAt: Date
}
```

### Error Scenarios

- **Submission Not Pending**: Error: "Submission already reviewed"
- **Speaker Email Conflict**: Uses existing speaker, doesn't create duplicate
- **Email Send Failure**: Logged but doesn't fail acceptance

---

## Workflow 5: Reject Proposal

**Actor**: Event Organizer  
**Goal**: Decline a proposal with feedback  
**Prerequisites**: Submission exists with status "pending"

### Steps

1. **Open Submission for Decision**
   - Follow steps 1-3 from Workflow 3
   - Review panel displays submission

2. **Add Constructive Feedback** (Recommended)
   - Type feedback in review notes textarea
   - Example: "Thank you for your submission. While the topic is interesting, we're focusing on more advanced technical content this year. We encourage you to apply again next year with a deeper dive into the implementation."
   - Feedback will be included in rejection email

3. **Click Reject Button**
   - Red "Reject Proposal" button
   - Confirmation: "Are you sure you want to reject this proposal?"
   - Click confirm

4. **Server-Side Processing**
   
   **Step 4a: Update Submission**
   ```typescript
   await db.cfpSubmission.update({
     where: { id: submission.id },
     data: {
       status: "rejected",
       reviewedAt: new Date(),
       reviewNotes: input.reviewNotes // Optional feedback
     }
   });
   ```

   **Step 4b: Send Rejection Email**
   - Email template: `CfpRejected`
   - To: `speakerEmail`
   - Subject: "Update on your proposal for [Event Name]"
   - Includes:
     - Proposal title
     - Respectful decline message
     - Feedback from reviewNotes (if provided)
     - Encouragement to apply in future

5. **Success Feedback**
   - Modal shows red indicator
   - Message: "✗ This proposal has been rejected"
   - Modal can be closed

6. **Speaker Receives Email**
   - Rejection email arrives
   - Contains feedback if provided
   - Professional and respectful tone

### Data Updated

```typescript
{
  // ... existing fields
  status: "rejected",
  reviewNotes: "Thank you for your submission. While the topic...",
  reviewedAt: Date("2025-11-10T16:05:00Z"),
  speakerId: null, // Remains null
  updatedAt: Date
}
```

### Best Practices

- **Always Include Feedback**: Help speakers improve future submissions
- **Be Constructive**: Focus on positive aspects even in rejection
- **Be Specific**: Explain why proposal wasn't selected
- **Encourage Resubmission**: Invite them to apply to future events

---

## Workflow 6: Close Call for Papers

**Actor**: Event Organizer  
**Goal**: Stop accepting new submissions  
**Prerequisites**: CFP is open

### Steps

1. **Navigate to CFP Dashboard**
   - Go to `/(dashboard)/[eventId]/cfp`
   - CFP displays with "Open" status badge

2. **Decide to Close**
   - Reasons to close:
     - Deadline reached
     - Sufficient submissions received
     - Event schedule finalized

3. **Click Close CFP Button**
   - Red "Close CFP" button with lock icon
   - Confirmation modal: "Are you sure you want to close the CFP?"
   - Subtext: "No new submissions will be accepted"

4. **Confirm Closure**
   - Click "Yes, Close CFP"
   - tRPC mutation: `cfp.close`

5. **Server-Side Update**
   ```typescript
   await db.callForPapers.update({
     where: { id: cfpId },
     data: {
       status: "closed",
       updatedAt: new Date()
     }
   });
   ```

6. **Success Feedback**
   - Status badge changes to "Closed" (red)
   - Close button disappears
   - Public submission page shows "CFP Closed" message
   - Submission form hidden from public

7. **Public Page Updated**
   - `/events/[slug]/cfp` still accessible
   - Shows CFP guidelines (read-only)
   - Message: "Submissions are no longer being accepted"
   - No submission form displayed

### Data Updated

```typescript
{
  // ... existing fields
  status: "closed",
  updatedAt: Date("2025-11-10T17:00:00Z")
}
```

### Effects

- **Public Submission**: Form hidden, submissions blocked
- **Existing Submissions**: Can still be reviewed
- **Reopening**: Available via "Reopen CFP" if deadline hasn't passed (see Workflow 7)

---

## Workflow 7: Reopen Closed CFP

**Actor**: Event Organizer  
**Goal**: Allow submissions again after closing CFP early  
**Prerequisites**: CFP must be closed and deadline must not have passed

### Steps

1. **Navigate to CFP Dashboard**
   - Go to event CFP page: `/(dashboard)/[eventId]/cfp`
   - CFP status badge shows "Closed"
   - "Reopen CFP" button visible in actions (only if deadline hasn't passed)

2. **Initiate Reopening**
   - Click "Reopen CFP" button (green)
   - Confirmation modal opens with info message

3. **Review Deadline**
   - Modal displays deadline: "Speakers will be able to submit proposals again until the deadline on [date]"
   - Verify deadline is still appropriate
   - If deadline needs updating, cancel and use "Edit Settings" first

4. **Confirm Reopening**
   - Click "Reopen CFP" button in modal
   - tRPC mutation: `cfp.reopen`
   - Validation checks:
     - ✓ User owns the event
     - ✓ CFP is currently closed
     - ✓ Deadline has not passed

5. **System Actions**
   - Updates CFP status to `open`
   - Public submission form becomes visible again
   - Existing submissions remain intact

6. **Post-Reopening**
   - Status badge changes to "Open"
   - "Reopen CFP" button replaced with "Close CFP" button
   - Speakers can submit new proposals until deadline

### Business Rules

- **Deadline Check**: Cannot reopen if deadline has passed
- **Error Handling**: If deadline passed, error suggests updating deadline first
- **Existing Submissions**: All previous submissions retained (pending/accepted/rejected)
- **No Notification**: Previously rejected speakers are not automatically notified (future enhancement)

### Error Cases

- **Deadline Passed**: "Cannot reopen CFP after the deadline has passed. Please update the deadline first."
- **Already Open**: "CFP is already open"
- **Permission Denied**: "Only the event organizer can reopen the CFP"

---

## State Transitions

```
CFP Status:
  [none] → [open] ⇄ [closed]

Submission Status:
  [pending] → [accepted] → (final state)
            ↘ [rejected] → (final state)
```

**Valid Transitions**:
- CFP: none → open, open → closed, closed → open (if deadline hasn't passed)
- Submission: pending → accepted, pending → rejected

**Invalid Transitions**:
- CFP: closed → open (if deadline has passed)
- Submission: accepted → pending, rejected → pending (business logic prevents)

---

## Email Timeline

**For Each Submission**:
1. **Submission Received** (immediate):
   - Template: `CfpSubmissionReceived`
   - Sent to: Speaker
   - Trigger: On submission

2. **Acceptance** (when accepted):
   - Template: `CfpAccepted`
   - Sent to: Speaker
   - Trigger: Organizer accepts proposal

3. **Rejection** (when rejected):
   - Template: `CfpRejected`
   - Sent to: Speaker
   - Trigger: Organizer rejects proposal

---

## Related Documentation

- [Backend Documentation](./backend.md) - tRPC procedures implementing these workflows
- [Frontend Documentation](./frontend.md) - UI components for these workflows
- [Data Model](./data-model.md) - Database models and relationships
- [Email Templates](./email-templates.md) - Email notification details

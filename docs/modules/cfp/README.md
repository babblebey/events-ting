# CFP (Call for Papers) Module

## Overview

The CFP (Call for Papers) module enables event organizers to collect session proposals from potential speakers. It manages the complete lifecycle of proposal submissions, from opening the CFP with guidelines and deadlines to reviewing submissions and accepting/rejecting proposals. Accepted proposals automatically create speaker profiles for the event.

## Features

- **CFP Management**: Open/close CFP with custom guidelines and deadlines
- **Public Submission Form**: Allow speakers to submit session proposals
- **Deadline Enforcement**: Automatically prevent submissions after deadline
- **Submission Review**: Score and add notes to proposals
- **Accept/Reject Proposals**: Make decisions and notify speakers
- **Auto-Speaker Creation**: Accepted proposals automatically become speaker profiles
- **Email Notifications**: Automatic emails for submission confirmation, acceptance, and rejection
- **Organizer Dashboard**: Review all submissions in one place

## User Roles

### Public Users (Speakers)
- View CFP guidelines and deadline
- Submit session proposals via public form
- Receive email confirmation on submission
- Get notified of acceptance/rejection via email
- No authentication required

### Organizers
- Open/close CFP for their events
- Set guidelines, required fields, and deadline
- View all submissions with filtering by status
- Add review notes and scores (1-5)
- Accept proposals (creates speaker profile + sends acceptance email)
- Reject proposals (sends rejection email with optional feedback)
- Full control over CFP lifecycle

## Module Dependencies

**This module depends on:**
- Events Module (CFP belongs to an event)
- Speakers Module (accepted proposals create speaker profiles)
- Communications Module (sends email notifications)

**This module is required by:**
- Speakers Module (speakers can be created from CFP acceptance)

## Quick Links
- [Backend Documentation](./backend.md) - tRPC procedures and business logic
- [Frontend Documentation](./frontend.md) - Components and pages
- [Data Model](./data-model.md) - Database schema
- [Workflows](./workflows.md) - Step-by-step processes
- [Email Templates](./email-templates.md) - Notification emails

## Related Files

### Backend
- `src/server/api/routers/cfp.ts` - CFP tRPC router

### Frontend - Organizer
- `src/app/(dashboard)/[id]/cfp/page.tsx` - CFP management page
- `src/app/(dashboard)/[id]/cfp/cfp-manager.tsx` - CFP manager component
- `src/components/cfp/cfp-form.tsx` - CFP creation/editing form
- `src/components/cfp/submission-card.tsx` - Submission display card
- `src/components/cfp/review-panel.tsx` - Review and accept/reject panel

### Frontend - Public
- `src/app/events/[slug]/cfp/page.tsx` - Public CFP submission page
- `src/app/events/[slug]/cfp/cfp-public-content.tsx` - Public CFP content
- `src/components/cfp/cfp-submission-form.tsx` - Public submission form

### Email Templates
- `emails/cfp-submission-received.tsx` - Submission confirmation
- `emails/cfp-accepted.tsx` - Acceptance notification
- `emails/cfp-rejected.tsx` - Rejection notification

### Database Models
- `CallForPapers` - CFP configuration
- `CfpSubmission` - Session proposals

## Feature Requirements Coverage

This module implements the following feature requirements:

- **FR-026**: Open/close CFP with guidelines and deadline
- **FR-027**: Update CFP settings
- **FR-028**: CFP status management (open/closed)
- **FR-029**: Public submission form with required fields
- **FR-030**: Deadline enforcement (prevent submissions after deadline)
- **FR-031**: Organizer submission review dashboard
- **FR-032**: Add review scores (1-5) and notes to submissions
- **FR-033**: Accept proposals
- **FR-034**: Auto-create speaker profile on acceptance
- **FR-035**: Reject proposals with feedback
- **FR-036**: Send email notifications (submission received, accepted, rejected)

## Getting Started

### For Organizers

1. **Create an Event** (Events Module)
2. **Open CFP**:
   - Navigate to event dashboard → CFP tab
   - Click "Open Call for Papers"
   - Set guidelines, deadline, and required fields
3. **Review Submissions**:
   - View all proposals in the CFP dashboard
   - Filter by status (pending/accepted/rejected)
   - Add review scores and notes
4. **Make Decisions**:
   - Click on a submission to view details
   - Use the review panel to accept or reject
   - Speakers receive automatic email notifications

### For Speakers

1. **Find Event**: Navigate to public event page
2. **Submit Proposal**: Click "Submit a Proposal" or go to `/events/{slug}/cfp`
3. **Fill Form**: Enter session details and speaker information
4. **Submit**: Receive immediate confirmation email
5. **Wait for Decision**: Get notified via email when reviewed

## Best Practices

- **Set Clear Guidelines**: Provide detailed submission guidelines to help speakers
- **Reasonable Deadline**: Allow sufficient time for speakers to prepare proposals
- **Timely Reviews**: Review submissions promptly to give speakers adequate notice
- **Constructive Feedback**: Include helpful notes in rejection emails
- **Communication**: Keep speakers informed throughout the process

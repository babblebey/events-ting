# Team Module - Workflows

## Overview

This document describes the step-by-step workflows for all team collaboration features, including invitation flows, permission management, and common user journeys.

## User Stories & Workflows

### US1: Invite Collaborator

**As an** event organizer  
**I want to** invite collaborators with specific module permissions  
**So that** I can distribute event management responsibilities

#### Workflow Steps

**1. Navigate to Team Management**
- Organizer goes to event dashboard
- Clicks "Settings" → "Team" tab
- Route: `/[eventId]/settings/team`

**2. Open Invite Form**
- Clicks "Invite Collaborator" button
- Modal/form opens with two fields:
  - Email input
  - Module permissions selector (checkboxes)

**3. Fill Invitation Details**
- Enters collaborator's email address
- Selects one or more modules to grant access
- Examples:
  - CFP Reviewer: Select "CFP"
  - Marketing: Select "Communications" + "Attendees"
  - Schedule Manager: Select "Schedule" + "Speakers"

**4. Validation**
- Frontend validates:
  - Email format is correct
  - At least one module is selected
  - Email is not organizer's own
- If invalid: Show inline error messages

**5. Submit Invitation**
- Clicks "Send Invitation" button
- API call: `api.team.invite.mutate({ eventId, email, modulePermissions })`
- Loading state shown on button

**6. Backend Processing**
- Validates input
- Checks if email already exists (duplicate prevention)
- Generates unique invitation token (256-bit)
- Creates `TeamMember` record (status: PENDING)
- Creates `Invitation` record (expires in 7 days)
- Sends invitation email via Resend

**7. Success Feedback**
- Success toast: "Invitation sent to [email]!"
- Form resets
- Invitation appears in "Pending Invitations" list
- Cache invalidated, list re-fetches

#### Edge Cases

**Email already a team member**:
- API returns `BAD_REQUEST` error
- UI shows: "This user is already a team member. Edit their permissions instead."
- Suggests using "Edit Permissions" feature

**Self-invitation attempt**:
- API returns `BAD_REQUEST` error
- UI shows: "Cannot invite yourself - you already own this event"

**Network error**:
- Error toast: "Failed to send invitation. Please try again."
- Form data preserved (user doesn't lose input)

#### Success Criteria
- ✅ Invitation email delivered to collaborator's inbox
- ✅ Invitation appears in pending list
- ✅ Token is valid and unexpired
- ✅ `TeamMember` record created with correct permissions

---

### US2: Accept Invitation

**As an** invited collaborator  
**I want to** review and accept an invitation  
**So that** I can collaborate on the event

#### Workflow Steps

**1. Receive Invitation Email**
- Collaborator receives email: "You've been invited to [Event Name]"
- Email contains:
  - Event name and description
  - Organizer name
  - List of granted modules
  - "Accept Invitation" button with link
  - Expiration date (7 days)

**2. Click Invitation Link**
- Link format: `/invitations/accept?token=abc123...`
- Opens in browser

**3. Authentication Check**
- If not logged in:
  - Redirected to sign-in page
  - Token preserved in session/URL
  - After login: Redirected back to invitation page
- If logged in:
  - Proceed directly to invitation page

**4. View Invitation Details**
- Page displays:
  - Event name and details
  - Organizer name
  - Granted module permissions with descriptions
  - "What can I do?" expandable section
  - Accept and Decline buttons

**5. Review Permissions**
- Collaborator can expand "Permission Explainer" to see:
  - What each module allows them to do
  - Examples of actions they can perform
  - What they cannot do (other modules, settings)

**6. Accept Invitation**
- Clicks "Accept Invitation" button
- Confirmation dialog: "Accept collaboration on [Event Name]?"
- Clicks "Confirm"

**7. Backend Processing**
- API call: `api.team.acceptInvitation.mutate({ token })`
- Validates:
  - Token exists and is valid
  - Not expired
  - Invitation status is PENDING
  - User's email matches invitation email
- Updates `TeamMember`:
  - Sets `userId` to current user
  - Changes status: PENDING → ACTIVE
- Updates `Invitation`:
  - Changes status: PENDING → ACCEPTED
  - Sets `respondedAt` timestamp
- Sends acceptance notification email to organizer

**8. Success & Redirect**
- Success toast: "You've joined [Event Name]!"
- Redirected to event dashboard: `/[eventId]`
- User now sees only modules they have access to

#### Alternative Flow: Decline Invitation

**6a. Decline Instead**
- Clicks "Decline Invitation" button
- Optional: Enter reason for declining
- Clicks "Confirm Decline"

**7a. Backend Processing**
- API call: `api.team.declineInvitation.mutate({ token, reason? })`
- Updates `TeamMember`: PENDING → REMOVED
- Updates `Invitation`: PENDING → DECLINED
- Sends decline notification to organizer

**8a. Success Message**
- Message: "You've declined the invitation to [Event Name]"
- Link to "Browse other events"

#### Edge Cases

**Expired token**:
- Page shows: "This invitation has expired"
- Message: "Please ask [Organizer] to resend the invitation"
- "Request New Invitation" button (sends email to organizer)

**Already accepted**:
- Page shows: "You've already accepted this invitation"
- "Go to Event Dashboard" button

**Email mismatch**:
- User's logged-in email doesn't match invitation email
- Error: "This invitation was sent to [email]. Please sign in with that account."
- "Switch Account" button

**Invalid token**:
- Page shows: "Invalid invitation link"
- Suggestions: Check link, contact organizer

#### Success Criteria
- ✅ Collaborator can access event dashboard
- ✅ Only granted modules are visible in navigation
- ✅ Organizer receives acceptance notification
- ✅ Collaborator appears in active members list

---

### US3: Modify Collaborator Permissions

**As an** event organizer  
**I want to** update collaborator module access  
**So that** I can adjust responsibilities as needs change

#### Workflow Steps

**1. Navigate to Team Management**
- Organizer goes to `/[eventId]/settings/team`
- Views list of active team members

**2. Select Collaborator to Edit**
- Finds collaborator in list
- Clicks "Edit Permissions" button on their card
- Modal opens with current permissions

**3. View Current Permissions**
- Modal displays:
  - Collaborator name and email
  - Currently granted modules (checked)
  - Available modules (unchecked)
  - Module descriptions

**4. Modify Permissions**
- Organizer checks/unchecks modules
- UI highlights changes:
  - Green: Newly added modules
  - Red: Modules being removed
- Summary shows: "+2 added, -1 removed"

**5. Confirm Changes**
- Clicks "Save Changes" button
- Confirmation dialog: "Update permissions for [email]?"
- Lists changes explicitly

**6. Backend Processing**
- API call: `api.team.updatePermissions.mutate({ teamMemberId, modulePermissions })`
- Validates:
  - User is event owner
  - Not modifying own permissions
  - At least one module selected
- Calculates diff (added/removed modules)
- Updates `TeamMember.modulePermissions`
- Sends permission change notification email to collaborator
- Invalidates permission cache

**7. Success Feedback**
- Success toast: "Permissions updated for [email]"
- Modal closes
- Team member list updates (optimistic update)
- Cache refreshes

**8. Collaborator Experience**
- Receives email: "Your permissions have been updated for [Event]"
- Email lists:
  - Added modules
  - Removed modules
  - Current full list
- Next time they access event:
  - Navigation updates (new/removed menu items)
  - Attempts to access revoked module → Redirected to accessible module

#### Edge Cases

**Remove all permissions**:
- At least one module must remain
- Error: "Collaborator must have access to at least one module. To remove all access, use 'Remove Member'."

**Collaborator active in revoked module**:
- User is editing a CFP submission
- Organizer removes CFP permission
- User's next API call returns `403 FORBIDDEN`
- Client shows error toast: "Your permissions have changed. You no longer have access to CFP."
- Redirected to accessible module

**Owner trying to edit self**:
- Edit button disabled on owner's own card
- If API called anyway: Returns `BAD_REQUEST` error

#### Success Criteria
- ✅ Permissions updated immediately in database
- ✅ Collaborator receives email notification
- ✅ Navigation updates on next page load
- ✅ Access enforcement takes effect immediately

---

### US4: Remove Collaborator Access

**As an** event organizer  
**I want to** revoke collaborator access  
**So that** I can maintain security when team members leave

#### Workflow Steps

**1. Navigate to Team Management**
- Organizer goes to `/[eventId]/settings/team`
- Views list of active team members

**2. Select Collaborator to Remove**
- Finds collaborator in list
- Clicks "Remove" button (trash icon)
- Confirmation dialog opens

**3. Review Removal Details**
- Dialog displays:
  - Collaborator name and email
  - Warning icon
  - List of modules they'll lose access to
  - "This action cannot be undone"
- Optional: Text field for reason (sent to collaborator)

**4. Confirm Removal**
- Enters optional reason
- Clicks "Remove Member" button
- Final confirmation: "Are you sure?"

**5. Backend Processing**
- API call: `api.team.removeMember.mutate({ teamMemberId, reason? })`
- Validates:
  - User is event owner
  - Not removing self
  - Member is ACTIVE (not PENDING - use cancelInvitation instead)
- Updates `TeamMember`:
  - Changes status: ACTIVE → REMOVED
  - Preserves record (soft delete)
- Sends removal notification email to collaborator
- Clears permission cache for event

**6. Success Feedback**
- Success toast: "[Email] has been removed from the team"
- Member removed from active list
- Appears in "Removed Members" filter (if viewing)

**7. Removed Collaborator Experience**
- Receives email: "Your access to [Event] has been removed"
- Email includes:
  - Event name
  - Organizer name
  - Reason (if provided)
  - Contact information
- If currently logged in:
  - Next API call returns `403 FORBIDDEN`
  - Redirected to `/[eventId]/removed` page
- Page shows:
  - "Your access has been removed"
  - Friendly message
  - Link to "My Teams" (shows remaining events)

#### Edge Cases

**Owner trying to remove self**:
- Remove button disabled on owner's own card
- If API called anyway: Returns `BAD_REQUEST` error
- Message: "Cannot remove yourself as owner. Transfer ownership first."

**Removing pending member**:
- Should use "Cancel Invitation" instead
- Remove button not shown for pending members
- If API called with PENDING member: Returns `BAD_REQUEST`

**Collaborator active during removal**:
- User is editing content
- Access revoked mid-session
- Next save attempt: Returns `403 FORBIDDEN`
- Toast: "Your access has been removed. Changes cannot be saved."
- In-progress changes lost (expected behavior)

**Network error during removal**:
- Error toast: "Failed to remove member. Please try again."
- No changes made (atomic operation)

#### Success Criteria
- ✅ Collaborator loses access immediately
- ✅ Receives notification email
- ✅ Cannot access event anymore
- ✅ Record preserved in database for audit trail

---

### US5: Decline Invitation

**As an** invited collaborator  
**I want to** decline an invitation  
**So that** I can opt out of collaboration

#### Workflow Steps

See "Accept Invitation" workflow above, alternative flow (steps 6a-8a).

---

### US6: Collaborator Self-Service Dashboard

**As a** collaborator  
**I want to** see all events I'm part of and my permissions  
**So that** I understand my access level

#### Workflow Steps

**1. Navigate to My Teams**
- Collaborator clicks "My Teams" in global navigation
- Route: `/my-teams`
- Shows all events where user is a team member

**2. View Event List**
- Page displays cards for each event:
  - Event name and date
  - Role badge (OWNER or COLLABORATOR)
  - Module permissions list
  - "Go to Dashboard" button
- Sorted by event start date (upcoming first)

**3. Filter by Role** (optional)
- Dropdown filter: "All Events", "Owned by Me", "Collaborating"
- Updates list dynamically

**4. Understand Permissions**
- Clicks "What can I do?" on an event card
- Expands permission explainer
- Shows detailed description of each granted module

**5. Navigate to Event**
- Clicks "Go to Dashboard" button
- Redirected to `/[eventId]`
- Sees only modules they have access to

#### Success Criteria
- ✅ All memberships displayed correctly
- ✅ Accurate role and permission information
- ✅ Quick navigation to each event

---

## Common Workflows

### Resend Expired Invitation

**Scenario**: Collaborator didn't accept within 7 days

**Steps**:
1. Organizer goes to `/[eventId]/settings/team`
2. Views "Pending Invitations" section
3. Finds expired invitation (shows "Expired" badge)
4. Clicks "Resend" button
5. Backend:
   - Generates new token
   - Creates new `Invitation` record
   - Marks old invitation as CANCELLED
   - Extends expiration to 7 days from now
   - Sends new invitation email
6. Success toast: "Invitation resent to [email]"
7. Collaborator receives fresh email with new token

---

### Cancel Pending Invitation

**Scenario**: Organizer wants to retract invitation before acceptance

**Steps**:
1. Organizer goes to `/[eventId]/settings/team`
2. Views "Pending Invitations" section
3. Finds invitation to cancel
4. Clicks "Cancel" button
5. Confirmation dialog: "Cancel invitation to [email]?"
6. Clicks "Confirm"
7. Backend:
   - Updates `TeamMember`: PENDING → REMOVED
   - Updates `Invitation`: PENDING → CANCELLED
   - No email sent (silent cancellation)
8. Success toast: "Invitation cancelled"
9. Invitation removed from pending list

---

### Transfer Ownership (Future Feature)

**Scenario**: Owner wants to transfer ownership to collaborator

**Planned Steps**:
1. Owner goes to `/[eventId]/settings/team`
2. Finds active collaborator
3. Clicks "Transfer Ownership" button
4. Confirmation dialog with warnings
5. Verifies identity (password or 2FA)
6. Backend:
   - Updates current owner: OWNER → COLLABORATOR
   - Assigns default modules to former owner
   - Updates new owner: COLLABORATOR → OWNER
   - Clears modulePermissions (owners don't need explicit)
7. Success message
8. Former owner loses SETTINGS access
9. New owner gains full access

**Status**: Not implemented yet (planned for v1.1)

---

## Error Handling Workflows

### Expired Invitation Recovery

**Scenario**: User clicks expired invitation link

**Flow**:
1. User clicks link from 8+ day old email
2. Page loads: `/invitations/accept?token=...`
3. Backend checks `expiresAt < now()`
4. Returns `BAD_REQUEST` error
5. UI shows:
   - "This invitation has expired"
   - Event name and details
   - "Request New Invitation" button
6. User clicks button
7. Sends email to organizer requesting resend
8. Organizer receives notification
9. Organizer uses "Resend" feature

---

### Permission Denied During Active Session

**Scenario**: Collaborator loses permission while using module

**Flow**:
1. Collaborator editing CFP submission
2. Organizer removes CFP permission
3. Collaborator clicks "Save"
4. API call fails with `403 FORBIDDEN`
5. Client catches error
6. Shows toast: "Your permissions have changed. You no longer have access to this module."
7. Redirects to accessible module (e.g., OVERVIEW)
8. Navigation updates (CFP menu item removed)
9. In-progress changes lost

**Future enhancement**: 30-second grace period for pending saves

---

## Integration Workflows

### Invitation + Other Modules

**CFP Reviewer Workflow**:
1. Organizer invites reviewer with CFP permission
2. Reviewer accepts invitation
3. Reviewer navigates to `/[eventId]/cfp`
4. Sees list of submissions
5. Can review, score, and accept/reject
6. Cannot access other modules (hidden in nav)

**Marketing Team Workflow**:
1. Organizer invites marketer with COMMUNICATIONS + ATTENDEES
2. Marketer accepts
3. Can create email campaigns (`/[eventId]/communications`)
4. Can view attendee list (`/[eventId]/attendees`)
5. Can export attendee emails for campaigns
6. Cannot modify event settings or tickets

---

## Testing Workflows

### Manual Testing Checklist

**Invitation Flow**:
- [ ] Send invitation with multiple modules
- [ ] Verify email delivery and content
- [ ] Accept invitation (different browser/account)
- [ ] Verify access to granted modules
- [ ] Verify denied access to other modules
- [ ] Decline invitation and verify notification

**Permission Management**:
- [ ] Edit collaborator permissions (add/remove modules)
- [ ] Verify email notification
- [ ] Test access during active session
- [ ] Verify navigation updates after permission change

**Access Revocation**:
- [ ] Remove collaborator
- [ ] Verify immediate access loss
- [ ] Verify email notification
- [ ] Test access attempt after removal

**Edge Cases**:
- [ ] Try to invite self (should fail)
- [ ] Try to invite duplicate email (should fail)
- [ ] Click expired invitation link
- [ ] Try to accept with wrong account
- [ ] Try to remove self as owner (should fail)

---

## Performance Expectations

### Response Times

| Action | Expected Time | Acceptable Threshold |
|--------|--------------|----------------------|
| Send invitation | <2s | <5s |
| Accept invitation | <1s | <3s |
| Permission check | <100ms | <500ms |
| List team members | <500ms | <2s |
| Update permissions | <1s | <3s |
| Remove member | <1s | <2s |

### Email Delivery

| Email Type | Expected Delivery | Acceptable Delay |
|------------|------------------|------------------|
| Invitation | <30s | <2min |
| Acceptance notice | <30s | <2min |
| Permission change | <30s | <2min |
| Removal notice | <30s | <2min |

---

## Related Documentation

- [Backend Documentation](./backend.md)
- [Frontend Documentation](./frontend.md)
- [Data Model](./data-model.md)
- [Email Templates](./email-templates.md)
- [Feature Specification](../../../specs/002-team-collaborators/spec.md)

---

**Last Updated**: November 16, 2025

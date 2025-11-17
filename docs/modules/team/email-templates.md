# Team Module - Email Templates

## Overview

The team module uses five email templates to communicate invitation and permission changes. All templates are built with [React Email](https://react.email) and rendered to HTML for delivery via Resend.

**Template Location**: `emails/`

## Template Architecture

### Technology Stack

- **Framework**: React Email
- **Styling**: Tailwind CSS (via React Email)
- **Delivery**: Resend API
- **Rendering**: Server-side React component to HTML

### File Structure

```
emails/
├── team-invitation.tsx
├── team-invitation-accepted.tsx
├── team-invitation-declined.tsx
├── team-permission-changed.tsx
└── team-access-removed.tsx
```

### Shared Components

**Base Layout**:
```tsx
// emails/components/layout.tsx
export function EmailLayout({ children, previewText }) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body>
        <Container>
          {children}
        </Container>
      </Body>
    </Html>
  );
}
```

**Common Styling**:
- Brand colors from design system
- Responsive layout (mobile-friendly)
- Accessible color contrast
- Clear call-to-action buttons

---

## Email Templates

### 1. Team Invitation

**File**: `emails/team-invitation.tsx`

**Purpose**: Sent when organizer invites a collaborator to join event team

**Triggered by**: `api.team.invite.mutate()`

**Recipient**: Invited collaborator

#### Props

```typescript
interface TeamInvitationEmailProps {
  eventName: string;
  eventSlug: string;
  organizerName: string;
  organizerEmail: string;
  acceptUrl: string;
  expiresAt: Date;
  modules: Array<{
    name: string;
    description: string;
  }>;
}
```

#### Content Structure

**Subject**: `You've been invited to collaborate on ${eventName}`

**Preview**: `${organizerName} has invited you to join the team for ${eventName}`

**Body**:
1. **Header**: 🎉 You've been invited!
2. **Event Info**: Event name and brief description
3. **Invitation Message**: 
   - "[Organizer] has invited you to collaborate on this event"
   - "You'll be able to help manage specific aspects of the event"
4. **Permissions Section**:
   - "You'll have access to:"
   - Bulleted list of granted modules with descriptions
   - Example: "✓ Call for Papers - Review and manage session proposals"
5. **Call-to-Action**: Large "Accept Invitation" button
6. **Alternative Action**: "Not interested? Decline this invitation" link
7. **Expiration Notice**: "This invitation expires on [date]"
8. **Footer**: 
   - "If you have questions, contact [organizer email]"
   - Events-Ting branding

#### Example

```
───────────────────────────────────────
🎉 You've been invited!

Tech Conference 2025

John Smith has invited you to collaborate 
on this event. You'll be able to help manage 
specific aspects of the event.

You'll have access to:
✓ Call for Papers
  Review and manage session proposals
✓ Speakers Management
  Create and edit speaker profiles
✓ Schedule Builder
  Organize event sessions and timeline

┌─────────────────────────────────────┐
│      [Accept Invitation]            │
└─────────────────────────────────────┘

Not interested? Decline this invitation

This invitation expires on Nov 23, 2025

Questions? Contact john@example.com
───────────────────────────────────────
```

#### Implementation

```tsx
export default function TeamInvitationEmail({
  eventName,
  organizerName,
  acceptUrl,
  expiresAt,
  modules,
}: TeamInvitationEmailProps) {
  const formattedExpiry = format(expiresAt, "MMMM d, yyyy");

  return (
    <EmailLayout previewText={`${organizerName} invited you to ${eventName}`}>
      <Heading>🎉 You've been invited!</Heading>
      
      <Text className="text-2xl font-bold">{eventName}</Text>
      
      <Text>
        {organizerName} has invited you to collaborate on this event.
      </Text>
      
      <Section>
        <Heading as="h2">You'll have access to:</Heading>
        {modules.map((module) => (
          <Row key={module.name}>
            <Column>✓ {module.name}</Column>
            <Text className="text-gray-600">{module.description}</Text>
          </Row>
        ))}
      </Section>
      
      <Button href={acceptUrl}>Accept Invitation</Button>
      
      <Text className="text-sm text-gray-500">
        This invitation expires on {formattedExpiry}
      </Text>
    </EmailLayout>
  );
}
```

---

### 2. Invitation Accepted

**File**: `emails/team-invitation-accepted.tsx`

**Purpose**: Notify organizer when collaborator accepts invitation

**Triggered by**: `api.team.acceptInvitation.mutate()`

**Recipient**: Event organizer (person who sent invitation)

#### Props

```typescript
interface InvitationAcceptedEmailProps {
  eventName: string;
  eventSlug: string;
  collaboratorName: string;
  collaboratorEmail: string;
  modules: string[];
  teamPageUrl: string;
}
```

#### Content Structure

**Subject**: `${collaboratorName} accepted your invitation to ${eventName}`

**Preview**: `${collaboratorName} is now part of your team`

**Body**:
1. **Header**: ✅ Invitation Accepted
2. **Message**: "[Collaborator] has accepted your invitation"
3. **Details**:
   - "They now have access to:"
   - Bulleted list of modules
4. **Call-to-Action**: "Manage Team" button → Team settings page
5. **Next Steps**: 
   - "They can now start collaborating on the event"
   - "You can modify their permissions at any time"

#### Example

```
───────────────────────────────────────
✅ Invitation Accepted

Jane Doe has accepted your invitation to 
collaborate on Tech Conference 2025.

They now have access to:
• Call for Papers
• Speakers Management

┌─────────────────────────────────────┐
│         [Manage Team]               │
└─────────────────────────────────────┘

Jane can now start collaborating on your 
event. You can modify their permissions 
at any time from the Team settings page.
───────────────────────────────────────
```

---

### 3. Invitation Declined

**File**: `emails/team-invitation-declined.tsx`

**Purpose**: Notify organizer when collaborator declines invitation

**Triggered by**: `api.team.declineInvitation.mutate()`

**Recipient**: Event organizer

#### Props

```typescript
interface InvitationDeclinedEmailProps {
  eventName: string;
  eventSlug: string;
  collaboratorEmail: string;
  reason?: string;
  teamPageUrl: string;
}
```

#### Content Structure

**Subject**: `${collaboratorEmail} declined your invitation to ${eventName}`

**Preview**: `Your invitation was declined`

**Body**:
1. **Header**: 📭 Invitation Declined
2. **Message**: "[Email] has declined your invitation"
3. **Reason** (if provided): 
   - "They provided this reason:"
   - Quoted text block
4. **Next Steps**:
   - "You can invite someone else from the Team settings page"
   - Link to team page

#### Example

```
───────────────────────────────────────
📭 Invitation Declined

jane@example.com has declined your 
invitation to collaborate on 
Tech Conference 2025.

They provided this reason:
┌─────────────────────────────────────┐
│ "Not available during this time"    │
└─────────────────────────────────────┘

You can invite someone else from the 
Team settings page.

[Go to Team Settings]
───────────────────────────────────────
```

---

### 4. Permission Changed

**File**: `emails/team-permission-changed.tsx`

**Purpose**: Notify collaborator when their permissions are modified

**Triggered by**: `api.team.updatePermissions.mutate()`

**Recipient**: Collaborator whose permissions changed

#### Props

```typescript
interface PermissionChangedEmailProps {
  eventName: string;
  eventSlug: string;
  addedModules: string[];
  removedModules: string[];
  currentModules: string[];
  eventDashboardUrl: string;
}
```

#### Content Structure

**Subject**: `Your permissions for ${eventName} have been updated`

**Preview**: `Your access has changed for ${eventName}`

**Body**:
1. **Header**: 🔄 Permissions Updated
2. **Message**: "Your permissions for [event] have been updated"
3. **Changes Section**:
   - **Added** (if any):
     - Green checkmark icon
     - "New access:"
     - List of added modules
   - **Removed** (if any):
     - Red X icon
     - "Removed access:"
     - List of removed modules
4. **Current Permissions**:
   - "You now have access to:"
   - Complete list of current modules
5. **Call-to-Action**: "Go to Event Dashboard" button
6. **Help**: "Questions? Contact the event organizer"

#### Example

```
───────────────────────────────────────
🔄 Permissions Updated

Your permissions for Tech Conference 2025 
have been updated.

✅ New access:
• Schedule Builder
• Communications

❌ Removed access:
• Attendees

You now have access to:
• Call for Papers
• Speakers Management
• Schedule Builder
• Communications

┌─────────────────────────────────────┐
│    [Go to Event Dashboard]          │
└─────────────────────────────────────┘

Questions? Contact the event organizer.
───────────────────────────────────────
```

#### Implementation

```tsx
export default function PermissionChangedEmail({
  eventName,
  addedModules,
  removedModules,
  currentModules,
  eventDashboardUrl,
}: PermissionChangedEmailProps) {
  return (
    <EmailLayout previewText={`Permissions updated for ${eventName}`}>
      <Heading>🔄 Permissions Updated</Heading>
      
      <Text>
        Your permissions for {eventName} have been updated.
      </Text>
      
      {addedModules.length > 0 && (
        <Section>
          <Heading as="h3">✅ New access:</Heading>
          {addedModules.map((module) => (
            <Text key={module}>• {module}</Text>
          ))}
        </Section>
      )}
      
      {removedModules.length > 0 && (
        <Section>
          <Heading as="h3">❌ Removed access:</Heading>
          {removedModules.map((module) => (
            <Text key={module}>• {module}</Text>
          ))}
        </Section>
      )}
      
      <Section>
        <Heading as="h3">You now have access to:</Heading>
        {currentModules.map((module) => (
          <Text key={module}>• {module}</Text>
        ))}
      </Section>
      
      <Button href={eventDashboardUrl}>
        Go to Event Dashboard
      </Button>
    </EmailLayout>
  );
}
```

---

### 5. Access Removed

**File**: `emails/team-access-removed.tsx`

**Purpose**: Notify collaborator when their access is revoked

**Triggered by**: `api.team.removeMember.mutate()`

**Recipient**: Removed collaborator

#### Props

```typescript
interface AccessRemovedEmailProps {
  eventName: string;
  eventSlug: string;
  organizerName: string;
  organizerEmail: string;
  reason?: string;
  myTeamsUrl: string;
}
```

#### Content Structure

**Subject**: `Your access to ${eventName} has been removed`

**Preview**: `You no longer have access to ${eventName}`

**Body**:
1. **Header**: 🔒 Access Removed
2. **Message**: "Your access to [event] has been removed by [organizer]"
3. **Reason** (if provided):
   - "Reason provided:"
   - Quoted text
4. **What This Means**:
   - "You can no longer access the event dashboard or any modules"
   - "Any work in progress has been saved"
5. **Next Steps**:
   - "View your other events" button → My Teams page
6. **Contact**: "Questions? Contact [organizer email]"
7. **Tone**: Professional, empathetic, not accusatory

#### Example

```
───────────────────────────────────────
🔒 Access Removed

Your access to Tech Conference 2025 has 
been removed by John Smith.

Reason provided:
┌─────────────────────────────────────┐
│ "Project phase completed. Thank you │
│  for your contributions!"           │
└─────────────────────────────────────┘

What this means:
You can no longer access the event 
dashboard or manage any modules. Your 
work has been saved.

┌─────────────────────────────────────┐
│      [View My Other Events]         │
└─────────────────────────────────────┘

Questions? Contact john@example.com
───────────────────────────────────────
```

---

## Email Delivery

### Integration with Resend

**API Setup**:
```typescript
// src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTeamInvitationEmail(props: InvitationProps) {
  const { data, error } = await resend.emails.send({
    from: "Events-Ting <team@events-ting.com>",
    to: props.email,
    subject: `You've been invited to collaborate on ${props.eventName}`,
    react: TeamInvitationEmail(props),
  });

  if (error) {
    throw new Error(`Failed to send invitation: ${error.message}`);
  }

  return data;
}
```

### Error Handling

**Retry strategy**:
- Exponential backoff: 1s, 2s, 4s
- Max retries: 3
- Log failures to error tracking (Sentry)

**Fallback**:
- If email fails after retries, log error
- Show user: "Invitation created but email may be delayed"
- Background job can retry later

---

## Testing

### Preview in Development

**React Email Dev Server**:
```bash
npm run email:dev
```

**URL**: `http://localhost:3000`

**Features**:
- Live preview of all templates
- Hot reload on changes
- Test with different props
- Mobile preview

### Manual Testing

**Checklist**:
- [ ] Send test email to personal account
- [ ] Verify subject line
- [ ] Check preview text in inbox
- [ ] Verify all links work
- [ ] Test on mobile email client
- [ ] Test in Gmail, Outlook, Apple Mail
- [ ] Verify images load (if any)
- [ ] Check accessibility (screen reader)

### Automated Testing

**Email rendering tests**:
```typescript
// tests/emails/team-invitation.test.tsx
import { render } from "@react-email/render";
import TeamInvitationEmail from "@/emails/team-invitation";

describe("TeamInvitationEmail", () => {
  it("renders invitation with correct details", () => {
    const html = render(
      <TeamInvitationEmail
        eventName="Test Event"
        organizerName="John Doe"
        acceptUrl="https://example.com/accept?token=123"
        expiresAt={new Date("2025-11-23")}
        modules={[
          { name: "CFP", description: "Review proposals" }
        ]}
      />
    );

    expect(html).toContain("Test Event");
    expect(html).toContain("John Doe");
    expect(html).toContain("CFP");
  });
});
```

---

## Design Guidelines

### Brand Consistency

**Colors**:
- Primary: `#3B82F6` (blue)
- Success: `#10B981` (green)
- Warning: `#F59E0B` (amber)
- Danger: `#EF4444` (red)
- Text: `#1F2937` (dark gray)
- Muted: `#6B7280` (gray)

**Typography**:
- Headings: Inter, bold, 24px
- Body: Inter, regular, 16px
- Small: Inter, regular, 14px

### Accessibility

**Requirements**:
- Minimum contrast ratio: 4.5:1 (WCAG AA)
- Alt text for all images
- Semantic HTML structure
- Clear link text (no "click here")

**Testing**:
- Use Lighthouse email audit
- Test with screen reader (NVDA/VoiceOver)

### Mobile Optimization

**Responsive design**:
- Single column layout
- Large touch targets (min 44x44px)
- Readable font size (min 16px)
- No horizontal scrolling

---

## Module Descriptions

When listing modules in emails, use these descriptions:

```typescript
const MODULE_DESCRIPTIONS = {
  OVERVIEW: "View event dashboard and statistics",
  ATTENDEES: "Manage registrations and attendee list",
  TICKETS: "Create and manage ticket types",
  SCHEDULE: "Build and organize event schedule",
  SPEAKERS: "Manage speaker profiles and sessions",
  CFP: "Review and manage session proposals",
  COMMUNICATIONS: "Send email campaigns to attendees",
};
```

---

## Localization (Future)

**Planned support**:
- Detect user's language preference
- Translate email content
- Localize date/time formats
- Maintain brand consistency across languages

**Implementation**:
```typescript
interface EmailProps {
  locale?: string; // 'en', 'es', 'fr', etc.
}

function getLocalizedContent(key: string, locale: string) {
  // Load translations
}
```

---

## Performance

### Email Size

**Targets**:
- HTML size: <100KB
- Total email size: <200KB
- Load time: <2s

**Optimization**:
- Inline critical CSS
- Minimize HTML
- No external images (use inline SVG or base64)
- Compress assets

### Delivery Speed

**Expectations**:
- Send time: <1s (Resend processing)
- Delivery time: <30s (typical)
- Acceptable delay: <2min

---

## Related Documentation

- [Backend Documentation](./backend.md)
- [Frontend Documentation](./frontend.md)
- [Workflows](./workflows.md)
- [React Email Documentation](https://react.email)
- [Resend Documentation](https://resend.com/docs)

---

**Last Updated**: November 16, 2025

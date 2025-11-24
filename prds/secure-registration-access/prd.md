# PRD: Secure Registration Access via Magic Link

**Status**: Draft  
**Created**: November 23, 2025  
**Owner**: Engineering Team  
**Priority**: High (Security Enhancement)

---

## 1. Overview

### 1.1 Problem Statement

Currently, ticket buyers can access their registration and manage tickets by simply entering their email address on the registration lookup page. Once the email is verified to exist in the database, users are immediately redirected to the ticket management interface without any further verification.

**Security Issues**:
- Anyone who guesses or knows a buyer's email can access their registration
- No verification that the person requesting access is the actual ticket buyer
- Tickets can be reassigned, QR codes downloaded, and attendee information modified by unauthorized parties
- Email addresses are relatively easy to guess or obtain through social engineering

**Current Flow**:
1. User enters email on `/events/[slug]/registrations`
2. System queries database for registrations with that email
3. If found, user is immediately redirected to `/events/[slug]/registrations/[registrationId]`
4. Full access to ticket management granted without verification

### 1.2 Proposed Solution

Implement a **magic link verification system** that sends a time-limited, single-use access token to the email address on file. This ensures that only the person with access to the email account can manage the registration, while maintaining the no-authentication requirement for ticket buyers.

**New Flow**:
1. User enters email on registration lookup page
2. System generates secure access token(s) and sends magic link email
3. User receives email with link(s) to their registration(s)
4. User clicks link, token is verified and marked as used
5. User is granted access to ticket management interface

### 1.3 Success Metrics

- **Security**: Zero unauthorized access incidents
- **Usability**: >95% successful verification rate
- **Performance**: <5 seconds from email submission to verification email sent
- **User Satisfaction**: <1% support tickets related to access issues
- **Delivery Rate**: >98% email delivery success rate

---

## 2. User Stories

### 2.1 Primary User Stories

**As a ticket buyer**, I want to securely access my ticket management interface so that I can assign tickets to attendees, download QR codes, and manage my purchase without risking unauthorized access.

**As a ticket buyer**, I want to receive verification emails quickly so that I can access my tickets without waiting too long.

**As an event organizer**, I want to ensure that only authorized buyers can manage their tickets so that I can maintain event security and attendee data integrity.

**As a security-conscious buyer**, I want to be notified via email when someone attempts to access my registration so that I'm aware of potential unauthorized access attempts.

### 2.2 Edge Case User Stories

**As a buyer with multiple registrations**, I want to access all my registrations from a single email lookup so that I don't need to repeat the process for each purchase.

**As a buyer checking email on mobile**, I want magic links that work seamlessly across devices so that I can manage tickets from my phone or tablet.

**As a buyer whose email token expired**, I want to easily request a new access link so that I can still manage my tickets.

**As a buyer who didn't receive the email**, I want clear instructions and the ability to resend verification emails so that I can resolve delivery issues.

---

## 3. Requirements

### 3.1 Functional Requirements

#### 3.1.1 Token Generation & Management

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-1 | System MUST generate cryptographically secure 256-bit random tokens | P0 | Use `crypto.randomBytes(32)` |
| FR-2 | Tokens MUST be base64url-encoded for URL safety | P0 | 43-character string format |
| FR-3 | Each token MUST be unique across the entire system | P0 | Database unique constraint |
| FR-4 | Tokens MUST expire after 1 hour from generation | P0 | Configurable expiration time |
| FR-5 | Tokens MUST be single-use (invalidated after verification) | P0 | Mark `usedAt` timestamp |
| FR-6 | System MUST store token metadata (email, registrationId, expiration, usage) | P0 | New database model |
| FR-7 | Expired tokens SHOULD be automatically cleaned up after 7 days | P1 | Cleanup job or lazy deletion |

#### 3.1.2 Email Sending

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-8 | System MUST send verification email within 5 seconds of request | P0 | Performance requirement |
| FR-9 | Email MUST include magic link(s) to access registration(s) | P0 | One email per lookup |
| FR-10 | Email MUST clearly state token expiration time | P0 | User awareness |
| FR-11 | Email MUST include security messaging about not sharing links | P1 | Security education |
| FR-12 | If user has multiple registrations, email MUST list all with separate links | P0 | Multiple registrations per email |
| FR-13 | Email MUST include event name and ticket details for context | P1 | User clarity |
| FR-14 | System MUST tag emails for tracking and analytics | P1 | Category: "registration-access" |
| FR-15 | System SHOULD retry failed email sends up to 3 times | P1 | Reliability improvement |

#### 3.1.3 Rate Limiting & Security

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-16 | System MUST rate limit access requests to 5 per email per 15 minutes | P0 | Prevent spam/abuse |
| FR-17 | System MUST validate token format before database lookup | P0 | Performance optimization |
| FR-18 | System MUST verify email matches registration email on token use | P0 | Email spoofing protection |
| FR-19 | System MUST return generic error messages to prevent email enumeration | P0 | "Check your email" regardless of existence |
| FR-20 | System SHOULD log all access attempts for security audit | P1 | Monitoring suspicious activity |
| FR-21 | System MUST reject tokens that are expired, already used, or non-existent | P0 | Core security requirement |

#### 3.1.4 User Interface

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-22 | Lookup page MUST show "Check your email" message after submission | P0 | Generic success message |
| FR-23 | Success message MUST NOT reveal whether email exists in system | P0 | Anti-enumeration |
| FR-24 | Lookup page MUST provide "Resend email" option after 60 seconds | P1 | User convenience |
| FR-25 | Verification page MUST validate token and redirect to registration | P0 | Core flow |
| FR-26 | Verification page MUST show clear error messages for invalid/expired tokens | P0 | User guidance |
| FR-27 | Verification page MUST provide "Request new link" option on error | P1 | Recovery flow |
| FR-28 | Lookup page MUST disable form submission while request is processing | P0 | Prevent duplicate submissions |

#### 3.1.5 Backward Compatibility

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-29 | System SHOULD maintain old `lookupByEmail` procedure for 30 days | P1 | Graceful deprecation |
| FR-30 | Old confirmation emails with direct links SHOULD continue working | P1 | Don't break existing emails |
| FR-31 | System MUST log usage of deprecated endpoints for migration tracking | P2 | Monitor deprecation progress |

### 3.2 Non-Functional Requirements

#### 3.2.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Email sending latency | <5 seconds (p95) |
| NFR-2 | Token verification response time | <500ms (p95) |
| NFR-3 | Database query performance | <100ms (p95) |
| NFR-4 | Concurrent access request handling | 100 requests/second |

#### 3.2.2 Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-5 | Email delivery success rate | >98% |
| NFR-6 | System uptime | 99.9% |
| NFR-7 | Token generation failure rate | <0.1% |

#### 3.2.3 Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-8 | Support for events with large registrations | 10,000+ registrations |
| NFR-9 | Token storage growth management | Auto-cleanup of expired tokens |
| NFR-10 | Rate limiter memory efficiency | <100MB for 100k tracked IPs |

#### 3.2.4 Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-11 | Token entropy | 256 bits minimum |
| NFR-12 | Token collision probability | <1 in 10^77 |
| NFR-13 | Email enumeration resistance | 100% (generic responses) |
| NFR-14 | Brute force attack resistance | Rate limiting + expiration |

#### 3.2.5 Usability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-15 | Mobile device compatibility | 100% (responsive magic links) |
| NFR-16 | Email client compatibility | 95%+ (major clients) |
| NFR-17 | User comprehension (error messages) | >90% understand next steps |
| NFR-18 | Cross-device flow completion | 100% (desktop email → mobile click) |

---

## 4. Technical Design

### 4.1 Database Schema

#### 4.1.1 New Model: RegistrationAccessToken

```prisma
model RegistrationAccessToken {
  id             String       @id @default(cuid())
  registrationId String
  registration   Registration @relation(fields: [registrationId], references: [id], onDelete: Cascade)
  email          String       // Email address that can use this token
  token          String       @unique // 256-bit random token, base64url encoded
  expiresAt      DateTime     // 1 hour from creation
  usedAt         DateTime?    // Null until token is used
  createdAt      DateTime     @default(now())
  ipAddress      String?      // Optional: track requesting IP
  userAgent      String?      // Optional: track requesting user agent
  
  @@index([token])           // Fast token lookup
  @@index([email])           // Fast email-based queries
  @@index([registrationId])  // Fast registration queries
  @@index([expiresAt])       // Cleanup query optimization
  @@index([usedAt])          // Filter used/unused tokens
}
```

#### 4.1.2 Updated Model: Registration

```prisma
model Registration {
  // ... existing fields ...
  accessTokens RegistrationAccessToken[] // Relation to access tokens
}
```

### 4.2 API Design

#### 4.2.1 New tRPC Procedures

**Procedure: `requestAccess`** (PUBLIC)

```typescript
requestAccess: publicProcedure
  .input(
    z.object({
      eventId: z.string().cuid(),
      email: z.string().email(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Rate limit check (5 requests per email per 15 min)
    const rateLimitKey = `registration:access:${input.email}`;
    const rateLimitResult = registrationAccessRateLimiter.check(rateLimitKey);
    
    if (!rateLimitResult.allowed) {
      const resetTime = new Date(rateLimitResult.resetAt).toLocaleTimeString();
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many requests. Please try again after ${resetTime}.`,
      });
    }

    // 2. Find all registrations for this email and event
    const registrations = await ctx.db.registration.findMany({
      where: {
        eventId: input.eventId,
        email: input.email,
      },
      include: {
        event: { select: { name: true, slug: true, timezone: true } },
        ticketType: { select: { name: true } },
        tickets: { select: { id: true } },
      },
    });

    // 3. Always return success to prevent email enumeration
    if (registrations.length === 0) {
      // Don't reveal that email doesn't exist
      return {
        success: true,
        message: "If this email has registrations, you'll receive an access link shortly.",
      };
    }

    // 4. Generate tokens for each registration
    const accessLinks: Array<{
      registrationId: string;
      ticketType: string;
      quantity: number;
      url: string;
    }> = [];

    for (const registration of registrations) {
      const token = generateAccessToken(); // 256-bit random
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await ctx.db.registrationAccessToken.create({
        data: {
          registrationId: registration.id,
          email: input.email,
          token,
          expiresAt,
        },
      });

      const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${registration.event.slug}/registrations/verify?token=${token}`;

      accessLinks.push({
        registrationId: registration.id,
        ticketType: registration.ticketType.name,
        quantity: registration.tickets.length,
        url: verifyUrl,
      });
    }

    // 5. Send email with all access links
    await sendRegistrationAccessEmail({
      to: input.email,
      eventName: registrations[0].event.name,
      accessLinks,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    // 6. Return generic success
    return {
      success: true,
      message: "If this email has registrations, you'll receive an access link shortly.",
    };
  });
```

**Procedure: `verifyAccessToken`** (PUBLIC)

```typescript
verifyAccessToken: publicProcedure
  .input(
    z.object({
      token: z.string().length(43), // Base64url 256-bit token
    })
  )
  .query(async ({ ctx, input }) => {
    // 1. Validate token format
    if (!isValidTokenFormat(input.token)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid token format",
      });
    }

    // 2. Find token in database
    const accessToken = await ctx.db.registrationAccessToken.findUnique({
      where: { token: input.token },
      include: {
        registration: {
          include: {
            event: { select: { slug: true, name: true } },
          },
        },
      },
    });

    if (!accessToken) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invalid or expired access link. Please request a new one.",
      });
    }

    // 3. Check if already used
    if (accessToken.usedAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This access link has already been used. Please request a new one.",
      });
    }

    // 4. Check expiration
    if (accessToken.expiresAt < new Date()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This access link has expired. Please request a new one.",
      });
    }

    // 5. Mark token as used
    await ctx.db.registrationAccessToken.update({
      where: { id: accessToken.id },
      data: { usedAt: new Date() },
    });

    // 6. Return registration details for redirect
    return {
      registrationId: accessToken.registrationId,
      eventSlug: accessToken.registration.event.slug,
      eventName: accessToken.registration.event.name,
      redirectUrl: `/events/${accessToken.registration.event.slug}/registrations/${accessToken.registrationId}`,
    };
  });
```

**Procedure: `resendAccessLink`** (PUBLIC)

```typescript
resendAccessLink: publicProcedure
  .input(
    z.object({
      eventId: z.string().cuid(),
      email: z.string().email(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Wrapper around requestAccess with stricter rate limiting
    const rateLimitKey = `registration:resend:${input.email}`;
    const rateLimitResult = resendAccessRateLimiter.check(rateLimitKey);
    
    if (!rateLimitResult.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many resend attempts. Please wait before trying again.",
      });
    }

    // Call requestAccess logic
    // ... same as requestAccess ...
  });
```

### 4.3 Email Template Design

**File**: `emails/registration-access-link.tsx`

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface RegistrationAccessLinkProps {
  eventName: string;
  accessLinks: Array<{
    registrationId: string;
    ticketType: string;
    quantity: number;
    url: string;
  }>;
  expiresAt: Date;
}

export const RegistrationAccessLink = ({
  eventName,
  accessLinks,
  expiresAt,
}: RegistrationAccessLinkProps) => {
  const expiryTime = new Date(expiresAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Html>
      <Head />
      <Preview>Access your tickets for {eventName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Access Your Tickets</Heading>
            
            <Text style={paragraph}>
              You requested to manage your tickets for <strong>{eventName}</strong>.
            </Text>

            {accessLinks.length === 1 ? (
              <>
                <Text style={paragraph}>
                  Click the button below to access your {accessLinks[0].quantity}{" "}
                  {accessLinks[0].ticketType} ticket(s):
                </Text>
                <Button style={button} href={accessLinks[0].url}>
                  Access My Tickets
                </Button>
              </>
            ) : (
              <>
                <Text style={paragraph}>
                  You have {accessLinks.length} registrations for this event.
                  Click the links below to access each one:
                </Text>
                {accessLinks.map((link, index) => (
                  <div key={link.registrationId} style={registrationBlock}>
                    <Text style={registrationText}>
                      <strong>Registration {index + 1}:</strong> {link.quantity}×{" "}
                      {link.ticketType}
                    </Text>
                    <Button style={smallButton} href={link.url}>
                      Access Tickets
                    </Button>
                  </div>
                ))}
              </>
            )}

            <Hr style={hr} />

            <Text style={warningText}>
              ⚠️ <strong>Important:</strong>
            </Text>
            <Text style={paragraph}>
              • This link will expire on {expiryTime}
              <br />
              • The link can only be used once
              <br />
              • Don't share this link with anyone
              <br />• If you didn't request this, you can safely ignore this email
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              If the button doesn't work, copy and paste this link into your browser:
              <br />
              <Link href={accessLinks[0].url} style={link}>
                {accessLinks[0].url}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles omitted for brevity - follow existing email template patterns
```

### 4.4 UI Flow Design

#### 4.4.1 Registration Lookup Page Updates

**File**: `src/app/events/[slug]/registrations/page.tsx`

**Changes**:
1. Replace `lookupByEmail` query with `requestAccess` mutation
2. Show success message instead of redirecting
3. Add resend functionality with countdown timer
4. Generic success messaging for security

**New UI States**:
- **Initial**: Email input form
- **Submitting**: Loading spinner with "Sending verification email..."
- **Success**: "Check your email! If registrations exist, you'll receive access link(s) shortly."
- **Rate Limited**: Error message with retry timer
- **Resend Available**: Show "Resend email" button after 60 seconds

#### 4.4.2 New Verification Page

**File**: `src/app/events/[slug]/registrations/verify/page.tsx`

**Functionality**:
1. Extract token from URL query parameter
2. Call `verifyAccessToken` procedure
3. Handle verification states:
   - **Loading**: Verifying token spinner
   - **Success**: Auto-redirect to registration management + success toast
   - **Invalid Token**: Error message + "Request new link" button
   - **Expired Token**: Error message + "Request new link" button
   - **Already Used**: Error message + "Request new link" button

**Error Recovery**:
- All error states link back to lookup page
- Pre-populate email if available in URL
- Clear messaging about what went wrong

### 4.5 Rate Limiting Configuration

**File**: `src/lib/rate-limit.ts`

```typescript
// Access request rate limiter
export const registrationAccessRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  identifier: "registration:access",
});

// Resend rate limiter (stricter)
export const resendAccessRateLimiter = createRateLimiter({
  maxRequests: 3,
  windowMs: 15 * 60 * 1000, // 15 minutes
  identifier: "registration:resend",
});
```

### 4.6 Utility Functions

**File**: `src/lib/utils.ts`

```typescript
import { randomBytes } from "crypto";

/**
 * Generate a cryptographically secure access token
 * 256 bits of entropy, base64url encoded
 * @returns 43-character URL-safe token
 */
export function generateAccessToken(): string {
  return randomBytes(32).toString("base64url").slice(0, 43);
}

/**
 * Calculate token expiration time
 * @param hours Hours until expiration (default: 1)
 * @returns Date object
 */
export function calculateTokenExpiry(hours: number = 1): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Validate token format
 * Must be 43-character base64url string
 */
export function isValidTokenFormat(token: string): boolean {
  const base64urlRegex = /^[A-Za-z0-9_-]{43}$/;
  return base64urlRegex.test(token);
}
```

**File**: `src/lib/email.ts`

```typescript
import { RegistrationAccessLink } from "@/emails/registration-access-link";

interface RegistrationAccessEmailData {
  to: string;
  eventName: string;
  accessLinks: Array<{
    registrationId: string;
    ticketType: string;
    quantity: number;
    url: string;
  }>;
  expiresAt: Date;
}

export async function sendRegistrationAccessEmail(
  data: RegistrationAccessEmailData
) {
  return sendEmail({
    to: data.to,
    subject: `Access Your Tickets for ${data.eventName}`,
    react: RegistrationAccessLink({
      eventName: data.eventName,
      accessLinks: data.accessLinks,
      expiresAt: data.expiresAt,
    }),
    tags: [
      { name: "category", value: "registration-access" },
      { name: "event", value: data.eventName },
    ],
  });
}
```

---

## 5. User Experience

### 5.1 Happy Path Flow

```
1. User visits /events/tech-conf-2025/registrations
   └─> Sees "Manage Your Tickets" page with email input

2. User enters email: "buyer@example.com"
   └─> Clicks "Access My Tickets" button

3. Page shows success message:
   ✓ "Check your email! If registrations exist for this event,
      you'll receive access link(s) shortly."
   └─> Form is cleared, "Resend email" countdown starts (60s)

4. User opens email inbox (within 5 seconds)
   └─> Receives "Access Your Tickets for Tech Conference 2025"

5. Email shows:
   ┌─────────────────────────────────────┐
   │ Access Your Tickets                 │
   │                                     │
   │ You requested to manage your        │
   │ tickets for Tech Conference 2025.   │
   │                                     │
   │ Registration 1: 3× General Admission│
   │ [Access Tickets] ← Button           │
   │                                     │
   │ ⚠️ Important:                       │
   │ • Expires: Nov 23, 2025 3:45 PM    │
   │ • One-time use only                │
   │ • Don't share this link            │
   └─────────────────────────────────────┘

6. User clicks "Access Tickets" button
   └─> Redirected to /events/tech-conf-2025/registrations/verify?token=ABC123...

7. Verification page validates token
   └─> Auto-redirects to /events/tech-conf-2025/registrations/cuid123
   └─> Shows success toast: "Access granted! Manage your tickets below."

8. User sees ticket management interface
   └─> Can assign tickets, download QR codes, update attendee info
```

### 5.2 Error Scenarios

#### 5.2.1 Email Not Found

**User Action**: Enters email with no registrations

**System Response**:
```
✓ "Check your email! If registrations exist for this event,
   you'll receive access link(s) shortly."
```

**User Experience**:
- No email is sent (saves resources)
- User doesn't know if email exists (security)
- After waiting, user may re-check email or contact support
- Clear call-to-action: "Don't have a registration yet? Register for this event"

#### 5.2.2 Rate Limit Exceeded

**User Action**: Attempts 6th request within 15 minutes

**System Response**:
```
❌ "Too many requests. Please try again after 3:30 PM."
```

**User Experience**:
- Clear error message with specific retry time
- Form is disabled until rate limit resets
- Countdown timer shows time remaining
- Suggestion: "Check your email for previous access links"

#### 5.2.3 Expired Token

**User Action**: Clicks link after 1 hour

**System Response** (on verification page):
```
❌ "This access link has expired. For your security, links are only
   valid for 1 hour."

[Request New Link] ← Button
```

**User Experience**:
- Clear explanation of why it failed
- One-click button to return to lookup page
- Option to pre-fill email if available

#### 5.2.4 Already Used Token

**User Action**: Clicks same link twice

**System Response**:
```
❌ "This access link has already been used. Each link can only be
   used once for security."

[Request New Link] ← Button
```

**User Experience**:
- Explanation of single-use policy
- Easy path to request new link
- Suggestion: "Check your browser history or bookmarks"

#### 5.2.5 Email Delivery Failure

**User Action**: Waits but doesn't receive email

**System Response**: (60-second countdown completes)
```
"Didn't receive the email?"

[Resend Email] ← Button now enabled

Tips:
• Check your spam/junk folder
• Wait a few minutes for delivery
• Ensure buyer@example.com is correct
```

**User Experience**:
- Helpful troubleshooting tips
- Ability to resend after 60 seconds
- Stricter rate limiting on resends (3 per 15 min)

### 5.3 Mobile Experience

**Considerations**:
- Magic links must work when email opened on mobile
- Cross-device flow: email on desktop, click on mobile
- Responsive verification page
- Clear call-to-action buttons (min 44px touch target)
- Progressive loading states for slow connections

**Optimizations**:
- Minimal verification page (fast load)
- Auto-redirect after successful verification
- Mobile-optimized email template
- Deep linking support (open in app if available)

---

## 6. Security Considerations

### 6.1 Threat Model

| Threat | Mitigation | Priority |
|--------|-----------|----------|
| **Email Enumeration** | Generic success messages, always return "Check your email" | P0 |
| **Brute Force Token Guessing** | 256-bit tokens (2^256 keyspace), expiration, single-use | P0 |
| **Token Replay Attacks** | Mark tokens as used, check `usedAt` field | P0 |
| **Timing Attacks** | Constant-time token validation, no early returns | P1 |
| **Rate Limit Bypass** | IP + email-based limiting, distributed rate limiter | P0 |
| **Email Interception** | 1-hour expiration, HTTPS-only links, security messaging | P1 |
| **Phishing** | Clear sender identity, branded email template, security tips | P1 |
| **SQL Injection** | Parameterized queries (Prisma ORM), input validation | P0 |
| **XSS in Verification Page** | React auto-escaping, CSP headers, no `dangerouslySetInnerHTML` | P0 |
| **CSRF** | SameSite cookies, token validation, no state mutation on GET | P0 |

### 6.2 Security Best Practices

#### 6.2.1 Token Security
- ✅ Use `crypto.randomBytes()` (CSPRNG) for token generation
- ✅ 256-bit minimum entropy (43-character base64url)
- ✅ Single-use tokens (invalidated after verification)
- ✅ Short expiration window (1 hour)
- ✅ Secure storage with unique database constraints
- ✅ No token logging (PII + security risk)

#### 6.2.2 Email Security
- ✅ SPF, DKIM, DMARC records for email domain
- ✅ Branded email template to prevent phishing confusion
- ✅ Clear security messaging in email body
- ✅ HTTPS-only links in emails
- ✅ No sensitive data in email subject or preview text
- ✅ Unsubscribe not applicable (transactional email)

#### 6.2.3 Rate Limiting
- ✅ Multiple layers: access requests, resends, verification attempts
- ✅ Email-based limiting (prevent targeting specific registrations)
- ✅ IP-based limiting (prevent distributed attacks)
- ✅ Exponential backoff on repeated failures
- ✅ Clear user messaging about limits

#### 6.2.4 Monitoring & Alerts
- ✅ Log all access requests (without PII)
- ✅ Alert on unusual patterns (high failure rates, rapid requests)
- ✅ Track email delivery rates
- ✅ Monitor token usage patterns (detect sharing)
- ✅ Security audit trail for compliance

---

## 7. Testing Strategy

### 7.1 Unit Tests

#### 7.1.1 Token Generation (`utils.test.ts`)
- ✅ Token format validation (43 characters, base64url)
- ✅ Token uniqueness (no collisions in 10,000 generations)
- ✅ Token entropy measurement (256 bits minimum)
- ✅ Expiration calculation accuracy

#### 7.1.2 Rate Limiting (`rate-limit.test.ts`)
- ✅ Enforce 5 requests per 15 minutes
- ✅ Reset counter after window expires
- ✅ Handle concurrent requests correctly
- ✅ Return accurate retry-after times

#### 7.1.3 Email Sending (`email.test.ts`)
- ✅ Email template rendering (no React errors)
- ✅ Correct recipient, subject, content
- ✅ Proper tag application
- ✅ Handle delivery failures gracefully

### 7.2 Integration Tests

#### 7.2.1 tRPC Procedures
**`requestAccess` mutation**:
- ✅ Returns success for valid email
- ✅ Returns success for non-existent email (anti-enumeration)
- ✅ Generates unique tokens for multiple registrations
- ✅ Sends email with correct access links
- ✅ Respects rate limiting
- ✅ Handles database errors gracefully

**`verifyAccessToken` query**:
- ✅ Successfully verifies valid token
- ✅ Marks token as used after verification
- ✅ Rejects expired tokens
- ✅ Rejects already-used tokens
- ✅ Rejects non-existent tokens
- ✅ Rejects malformed tokens
- ✅ Returns correct redirect URL

#### 7.2.2 End-to-End Flow
1. ✅ User submits email → receives verification email
2. ✅ User clicks link → redirected to ticket management
3. ✅ Token is marked as used → subsequent clicks fail
4. ✅ User can request new token after expiration
5. ✅ Multiple registrations → multiple links in one email

### 7.3 Security Tests

- ✅ **Email Enumeration**: Verify identical responses for valid/invalid emails
- ✅ **Rate Limit Bypass**: Attempt requests from multiple IPs, same email
- ✅ **Token Prediction**: Ensure tokens are unpredictable (statistical analysis)
- ✅ **Token Reuse**: Verify used tokens cannot be reused
- ✅ **Expiration Enforcement**: Verify expired tokens are rejected
- ✅ **SQL Injection**: Test with malicious email inputs
- ✅ **XSS Attacks**: Test verification page with XSS payloads in URL

### 7.4 Performance Tests

- ✅ **Email Latency**: 95th percentile <5 seconds
- ✅ **Token Verification**: 95th percentile <500ms
- ✅ **Concurrent Requests**: Handle 100 req/s without errors
- ✅ **Database Query Time**: Token lookup <100ms
- ✅ **Email Delivery Rate**: >98% successful delivery

### 7.5 User Acceptance Testing

**Scenarios**:
1. ✅ Buyer with 1 registration can access tickets
2. ✅ Buyer with multiple registrations receives all links
3. ✅ Buyer on mobile can click link and access tickets
4. ✅ Buyer can request new link if first expires
5. ✅ Buyer sees clear error messages for invalid tokens
6. ✅ Buyer cannot access tickets without email verification
7. ✅ Buyer receives email within 5 seconds of request

---

## 8. Migration Plan

### 8.1 Rollout Strategy

**Phase 1: Implementation (Week 1)**
- Add database schema and migration
- Implement tRPC procedures
- Create email template
- Build verification page
- Update lookup page UI

**Phase 2: Testing (Week 2)**
- Unit tests (100% coverage on critical paths)
- Integration tests (all tRPC procedures)
- Security testing (penetration testing)
- Performance testing (load testing)
- UAT with internal team

**Phase 3: Soft Launch (Week 3)**
- Deploy to production with feature flag (disabled by default)
- Enable for 10% of events (canary)
- Monitor metrics: email delivery, verification success, errors
- Gather user feedback

**Phase 4: Full Rollout (Week 4)**
- Enable for 50% of events
- Monitor for 3 days
- Enable for 100% of events
- Announce in release notes

**Phase 5: Deprecation (Week 5-8)**
- Mark old `lookupByEmail` as deprecated
- Add warning logs for usage
- Update documentation
- After 30 days, remove old endpoint

### 8.2 Backward Compatibility

**Existing Email Links**:
```
Old: /events/tech-conf/registrations/cuid123 (direct access)
New: /events/tech-conf/registrations/verify?token=ABC123 (token required)
```

**Options**:
1. **Option A**: Keep direct access working for 30 days, then require tokens
2. **Option B**: Immediately require tokens, invalidate old links
3. **Option C** (Recommended): Detect direct access, show "Request access link" page

**Recommended Approach (Option C)**:
- Update `[registrationId]/page.tsx` to check for token in session/cookie
- If no valid token, redirect to lookup page with message
- Exception: If accessed within 5 minutes of registration, allow direct access
- This prevents breaking existing confirmation emails while enforcing security

### 8.3 Database Migration

```prisma
-- Migration: Add RegistrationAccessToken model
CREATE TABLE "RegistrationAccessToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    
    CONSTRAINT "RegistrationAccessToken_registrationId_fkey" 
        FOREIGN KEY ("registrationId") 
        REFERENCES "Registration" ("id") 
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RegistrationAccessToken_token_key" 
    ON "RegistrationAccessToken"("token");
CREATE INDEX "RegistrationAccessToken_email_idx" 
    ON "RegistrationAccessToken"("email");
CREATE INDEX "RegistrationAccessToken_registrationId_idx" 
    ON "RegistrationAccessToken"("registrationId");
CREATE INDEX "RegistrationAccessToken_expiresAt_idx" 
    ON "RegistrationAccessToken"("expiresAt");
CREATE INDEX "RegistrationAccessToken_usedAt_idx" 
    ON "RegistrationAccessToken"("usedAt");
```

**Rollback Plan**:
- Keep old `lookupByEmail` procedure active during rollout
- Feature flag to toggle between old/new flow
- Database migration is non-destructive (new table only)
- Easy rollback: disable feature flag, redirect to old flow

### 8.4 Monitoring & Success Criteria

**Week 1 Metrics**:
- Email delivery rate: >98%
- Verification success rate: >95%
- Average email latency: <5s
- Zero unauthorized access incidents

**Week 2 Metrics**:
- User satisfaction: <1% support tickets
- Token expiration rate: <10% (users access within 1 hour)
- Resend request rate: <5% (most users get email first try)
- Rate limit hits: <0.1% (legitimate users not affected)

**Alerting Thresholds**:
- 🔴 Email delivery rate <95%: Critical alert
- 🔴 Verification failures >10%: Investigate immediately
- 🟡 Resend requests >10%: Check email provider
- 🟡 Rate limit hits >1%: Review limits too strict

---

## 9. Open Questions & Decisions

### 9.1 Decisions Made

| Decision | Rationale | Date |
|----------|-----------|------|
| **Token expiration: 1 hour** | Balance security and UX; accounts for email delays | TBD |
| **Single email for multiple registrations** | Better UX than separate emails; less spam risk | TBD |
| **Generic success messages** | Prevent email enumeration attacks | TBD |
| **Rate limit: 5 per 15 min** | Prevent abuse while allowing legitimate retries | TBD |
| **256-bit tokens** | Industry standard, secure against brute force | TBD |

### 9.2 Open Questions

| Question | Options | Recommendation | Priority |
|----------|---------|----------------|----------|
| **Token cleanup strategy?** | A) Cron job daily B) Lazy deletion C) Auto-delete after 7 days | **C** - Auto-delete via cron, keeps DB clean | P1 |
| **Store IP address for audit?** | A) Yes, for security B) No, privacy concern | **A** - Useful for abuse detection, anonymize after 30 days | P2 |
| **Allow token refresh?** | A) Yes, extend expiration B) No, request new token | **B** - Simpler, more secure | P2 |
| **Email multiple times for same registration?** | A) Allow unlimited B) Limit to N times | **B** - Max 5 tokens per registration per day | P1 |
| **Notification for organizers?** | A) Alert on suspicious activity B) No notifications | **A** - Daily digest of failed attempts | P3 |

### 9.3 Future Enhancements

**Phase 2 (Post-Launch)**:
- SMS verification as alternative to email
- "Remember this device" option (30-day cookie)
- QR code in email for mobile scanning
- Progressive disclosure: show ticket summary before full access

**Phase 3 (Long-term)**:
- Integration with wallet apps (Apple Wallet, Google Pay)
- Biometric verification for high-value tickets
- Buyer account creation (optional, for frequent buyers)
- Social login (Google, Apple) for convenience

---

## 10. Documentation & Communication

### 10.1 User-Facing Documentation

**Help Article: "How to Access Your Tickets"**
```markdown
# How to Access Your Tickets

After purchasing tickets, you can manage them anytime by email verification.

## Steps to Access:
1. Visit the event page and click "Manage Tickets"
2. Enter the email address used during purchase
3. Check your email for the access link
4. Click the link to view and manage your tickets

## Troubleshooting:
- **Didn't receive email?** Check spam folder, wait 5 minutes, then resend
- **Link expired?** Links are valid for 1 hour. Request a new one.
- **Link not working?** Ensure you're clicking the latest link sent

## Security:
- Never share access links with others
- Links expire after 1 hour for your security
- Each link can only be used once
```

**Email Footer FAQs**:
- Why am I receiving this? (You or someone requested ticket access)
- How long is the link valid? (1 hour from sending)
- Is it safe to click? (Yes, verify sender is noreply@yourdomain.com)

### 10.2 Developer Documentation

**README section**:
```markdown
## Registration Access Flow

Users access ticket management via email verification (magic links).

### Flow:
1. User enters email on lookup page
2. System sends magic link to email
3. User clicks link → verified → access granted

### Implementation:
- `requestAccess` mutation: Generates token, sends email
- `verifyAccessToken` query: Validates token, grants access
- Tokens: 256-bit, 1-hour expiration, single-use

### Security:
- Rate limiting: 5 requests per email per 15 min
- Anti-enumeration: Generic success messages
- Token format: 43-char base64url (URL-safe)

See: `/docs/modules/registration/magic-links.md`
```

### 10.3 Release Notes

**Version X.X.X - Secure Registration Access**

**New Features**:
- 🔒 Email verification required to access ticket management
- ✉️ Magic link sent to registered email address
- ⏱️ Links expire after 1 hour for security
- 🔄 Easy resend option if email not received

**Security Improvements**:
- Prevents unauthorized access via email guessing
- Rate limiting to prevent abuse (5 requests per 15 min)
- Single-use tokens for enhanced security

**User Impact**:
- Extra step to access tickets (improved security)
- Must have access to registered email account
- Links expire quickly (request new if needed)

**Migration**:
- Old direct links will redirect to verification flow after Nov 30, 2025
- No action required for existing users

---

## 11. Success Metrics & KPIs

### 11.1 Launch Metrics (Week 1)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Email delivery success rate | >98% | Resend API webhooks |
| Verification success rate | >95% | `verifyAccessToken` success/total |
| Average email send latency | <5s (p95) | Request timestamp to email sent |
| Token expiration rate | <10% | Tokens expired without use |
| User complaint rate | <0.5% | Support tickets tagged "access-issue" |
| Unauthorized access attempts | 0 | Security audit logs |

### 11.2 Ongoing Metrics

| Metric | Target | Frequency |
|--------|--------|-----------|
| Email delivery rate | >98% | Daily |
| Verification completion rate | >90% | Weekly |
| Resend request rate | <5% | Weekly |
| Rate limit hit rate | <0.1% | Daily |
| Support ticket volume | <10/week | Weekly |
| Average time to access (email send to verification) | <2 min (p50) | Weekly |

### 11.3 Business Impact

| KPI | Baseline | Target (3 months) | Impact |
|-----|----------|-------------------|--------|
| Unauthorized access incidents | N/A | 0 | Security improvement |
| User trust score | N/A | >4.5/5 | Survey after ticket access |
| Support ticket cost | $X/month | -50% | Fewer access-related issues |
| Ticket reassignment abuse | N/A | <0.1% | Prevent unauthorized changes |

---

## 12. Risk Assessment

| Risk | Probability | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| **Email delivery failures** | Medium | High | Retry logic, multiple email providers, monitoring | Backend |
| **User confusion (extra step)** | High | Medium | Clear messaging, help documentation, onboarding | Product |
| **Rate limiting too strict** | Medium | Medium | Configurable limits, user feedback monitoring | Backend |
| **Token generation collision** | Very Low | Very High | 256-bit entropy, uniqueness constraint, monitoring | Backend |
| **Performance degradation** | Low | Medium | Load testing, caching, database indexing | Backend |
| **Phishing attacks (fake emails)** | Medium | High | SPF/DKIM/DMARC, branded emails, user education | Security |
| **Mobile compatibility issues** | Low | Medium | Cross-device testing, responsive design | Frontend |
| **Database storage growth** | Medium | Low | Auto-cleanup cron job, retention policy | Backend |

---

## 13. Appendix

### 13.1 Glossary

- **Magic Link**: Single-use URL with embedded token for passwordless authentication
- **Base64url**: URL-safe variant of Base64 encoding (uses `-` and `_` instead of `+` and `/`)
- **CSPRNG**: Cryptographically Secure Pseudo-Random Number Generator
- **Rate Limiting**: Restricting number of requests from a user/IP within a time window
- **Email Enumeration**: Attack technique to discover valid email addresses in a system
- **Token Collision**: Rare event where two randomly generated tokens are identical
- **SPF/DKIM/DMARC**: Email authentication protocols to prevent spoofing

### 13.2 References

- [OWASP Email Verification Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [Magic Link Security Considerations](https://www.ory.sh/passwordless-authentication-security/)
- [Rate Limiting Patterns](https://www.rfc-editor.org/rfc/rfc6585#section-4)
- [Resend API Documentation](https://resend.com/docs)
- [React Email Component Library](https://react.email)

### 13.3 Related PRDs

- [Event Registration Flow PRD](../event-registration-flow/prd.md)
- [Ticket Assignment System PRD](../ticket-route-migration/prd.md)
- [Email Communication System PRD](../communications/)

---

**Document Version**: 1.0  
**Last Updated**: November 23, 2025  
**Next Review**: After implementation completion  
**Status**: Ready for Implementation

# System Overview

This document provides a high-level overview of the Events-Ting architecture, including system design, data flow patterns, and key architectural decisions.

## 🎯 System Purpose

Events-Ting is a full-stack event management platform that enables organizers to:
- Create and manage events
- Sell tickets and handle registrations
- Build event schedules with speaker assignments
- Accept and review session proposals (CFP)
- Communicate with attendees and speakers
- Collaborate with team members using granular permissions

## 🏗️ High-Level Architecture

### Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Mobile[Mobile Browser]
    end
    
    subgraph "Next.js Application Server"
        AppRouter[App Router]
        ServerComponents[Server Components]
        ClientComponents[Client Components]
        
        AppRouter --> ServerComponents
        AppRouter --> ClientComponents
    end
    
    subgraph "API Layer"
        tRPC[tRPC Procedures]
        Auth[NextAuth.js Middleware]
        Validation[Zod Validators]
        
        Auth --> tRPC
        tRPC --> Validation
    end
    
    subgraph "Business Logic Layer"
        EventService[Event Service]
        TicketService[Ticket Service]
        RegService[Registration Service]
        EmailService[Email Service]
        ScheduleService[Schedule Service]
        SpeakerService[Speaker Service]
        CFPService[CFP Service]
        TeamService[Team Service]
    end
    
    subgraph "Data Layer"
        Prisma[Prisma ORM]
        DB[(PostgreSQL)]
        
        Prisma --> DB
    end
    
    subgraph "External Services"
        Resend[Resend Email API]
        OAuth[OAuth Providers]
    end
    
    Browser --> AppRouter
    Mobile --> AppRouter
    ServerComponents --> tRPC
    ClientComponents --> tRPC
    
    tRPC --> EventService
    tRPC --> TicketService
    tRPC --> RegService
    tRPC --> EmailService
    tRPC --> ScheduleService
    tRPC --> SpeakerService
    tRPC --> CFPService
    tRPC --> TeamService
    
    EventService --> Prisma
    TicketService --> Prisma
    RegService --> Prisma
    ScheduleService --> Prisma
    SpeakerService --> Prisma
    CFPService --> Prisma
    TeamService --> Prisma
    
    EmailService --> Resend
    Auth --> OAuth
    
    style Browser fill:#e0e7ff
    style Mobile fill:#e0e7ff
    style AppRouter fill:#0070f3
    style tRPC fill:#398ccb
    style Prisma fill:#2d3748
    style DB fill:#336791
```

## 🔄 Request/Response Flow

### Public Request Flow (Unauthenticated)

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant NextJS as Next.js App Router
    participant tRPC as tRPC Router
    participant Service as Business Logic
    participant Prisma as Prisma ORM
    participant DB as PostgreSQL
    
    User->>Browser: Visit /events/tech-conf-2025
    Browser->>NextJS: GET request
    NextJS->>NextJS: Render Server Component
    NextJS->>tRPC: api.event.getBySlug('tech-conf-2025')
    tRPC->>tRPC: Public procedure (no auth)
    tRPC->>tRPC: Validate input (Zod)
    tRPC->>Service: getEventBySlug(slug)
    Service->>Prisma: findUnique({ slug, published })
    Prisma->>DB: SELECT * FROM Event WHERE...
    DB-->>Prisma: Event data
    Prisma-->>Service: Typed event object
    Service-->>tRPC: Event with tickets, schedule
    tRPC-->>NextJS: Serialized response
    NextJS->>NextJS: Render with data
    NextJS-->>Browser: HTML + hydration data
    Browser-->>User: Rendered event page
```

### Authenticated Request Flow (Organizer Dashboard)

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant NextJS as Next.js App Router
    participant NextAuth as NextAuth.js
    participant tRPC as tRPC Router
    participant Service as Business Logic
    participant Prisma as Prisma ORM
    participant DB as PostgreSQL
    
    User->>Browser: Click "Create Event"
    Browser->>NextJS: POST /api/trpc/event.create
    NextJS->>NextAuth: Verify session
    NextAuth-->>NextJS: Session { userId, email }
    NextJS->>tRPC: protectedProcedure.mutation
    tRPC->>tRPC: Check ctx.session (exists)
    tRPC->>tRPC: Validate input (Zod)
    tRPC->>Service: createEvent(data, userId)
    Service->>Prisma: event.create({ ...data, organizerId })
    Prisma->>DB: INSERT INTO Event...
    DB-->>Prisma: Created event
    Prisma-->>Service: Event object
    Service-->>tRPC: Event with relations
    tRPC-->>NextJS: Success response
    NextJS-->>Browser: JSON response
    Browser->>Browser: React Query cache update
    Browser-->>User: Redirect to event dashboard
```

## 🔐 Authentication Flow

### OAuth Sign-In Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant NextJS as Next.js
    participant NextAuth as NextAuth.js
    participant Provider as OAuth Provider
    participant DB as Database
    
    User->>Browser: Click "Sign in with Google"
    Browser->>NextAuth: /api/auth/signin/google
    NextAuth->>Provider: OAuth authorization request
    Provider-->>User: Show consent screen
    User->>Provider: Grant permission
    Provider-->>NextAuth: Authorization code
    NextAuth->>Provider: Exchange code for tokens
    Provider-->>NextAuth: Access token + user info
    NextAuth->>DB: Upsert user & account
    DB-->>NextAuth: User record
    NextAuth->>NextAuth: Create session
    NextAuth-->>Browser: Set session cookie
    Browser->>Browser: Redirect to dashboard
    Browser-->>User: Logged in
```

### Credentials Sign-In Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant NextJS as Next.js
    participant NextAuth as NextAuth.js
    participant DB as Database
    
    User->>Browser: Enter email + password
    Browser->>NextAuth: POST /api/auth/callback/credentials
    NextAuth->>DB: Find user by email
    DB-->>NextAuth: User with hashed password
    NextAuth->>NextAuth: bcrypt.compare(password, hash)
    alt Password Valid
        NextAuth->>DB: Create session
        DB-->>NextAuth: Session token
        NextAuth-->>Browser: Set session cookie
        Browser-->>User: Redirect to dashboard
    else Password Invalid
        NextAuth-->>Browser: Error: Invalid credentials
        Browser-->>User: Show error message
    end
```

## 📊 Data Flow Patterns

### Pattern 1: Simple CRUD (Event Management)

```
User Action (Create Event)
    ↓
Client Component (EventForm)
    ↓
tRPC Mutation (event.create)
    ↓
Protected Procedure (requires auth)
    ↓
Input Validation (Zod schema)
    ↓
Authorization Check (is organizer)
    ↓
Service Layer (createEvent)
    ↓
Prisma Query (db.event.create)
    ↓
Database (INSERT)
    ↓
Response (created event)
    ↓
React Query Cache Update
    ↓
UI Update (redirect to dashboard)
```

### Pattern 2: Complex Transaction (Registration)

```
User Action (Register for Event)
    ↓
Client Component (RegistrationForm)
    ↓
tRPC Mutation (registration.create)
    ↓
Public Procedure (no auth required)
    ↓
Input Validation (email, name, ticketTypeId)
    ↓
Service Layer (createRegistration)
    ↓
Prisma Transaction Start
    ├─ Check ticket availability
    ├─ Create registration
    ├─ Decrement ticket quantity
    └─ Trigger email send
Prisma Transaction Commit
    ↓
Email Service (sendRegistrationConfirmation)
    ↓
Resend API (send transactional email)
    ↓
Response (registration + emailSent status)
    ↓
UI Update (show success + check email)
```

### Pattern 3: Cascading Updates (CFP Acceptance)

```
Organizer Action (Accept CFP Submission)
    ↓
Client Component (CFPReviewModal)
    ↓
tRPC Mutation (cfp.acceptProposal)
    ↓
Protected Procedure + Authorization
    ↓
Service Layer (acceptCfpSubmission)
    ↓
Prisma Transaction Start
    ├─ Update submission status = 'accepted'
    ├─ Create Speaker record
    ├─ Link submission to speaker
    ├─ (Optional) Create ScheduleEntry
    └─ Trigger acceptance email
Prisma Transaction Commit
    ↓
Email Service (sendCfpAcceptance)
    ↓
Response (speaker created + email sent)
    ↓
UI Update (submission marked accepted)
```

## 🧩 Architectural Layers

### Layer 1: Presentation (Next.js App Router)

**Purpose**: Render UI and handle user interactions

**Components**:
- **Server Components** (default): Fetch data, no JavaScript to client
- **Client Components** (`"use client"`): Interactive forms, buttons, modals
- **Layouts**: Shared UI structure (header, sidebar)
- **Pages**: Route-based rendering

**Key Decisions**:
- ✅ Server Components by default (performance)
- ✅ Client Components only for interactivity
- ✅ Server-side data fetching (reduce waterfall requests)
- ✅ Streaming with Suspense (progressive rendering)

### Layer 2: API (tRPC)

**Purpose**: Type-safe client-server communication

**Components**:
- **Routers**: Domain-organized API endpoints (event, ticket, etc.)
- **Procedures**: Individual API operations (create, update, list)
- **Middleware**: Auth, logging, error handling
- **Context**: Shared data (session, database client)

**Key Decisions**:
- ✅ tRPC over REST (type safety, no codegen)
- ✅ Zod validation for all inputs
- ✅ Separate public/protected procedures
- ✅ Automatic TypeScript inference

### Layer 3: Business Logic (Services)

**Purpose**: Encapsulate domain logic separate from API layer

**Components**:
- **Event Service**: Event CRUD, publishing, archiving
- **Ticket Service**: Ticket management, availability checks
- **Registration Service**: Registration flow, ticket allocation
- **Email Service**: Email composition and delivery
- **Schedule Service**: Schedule management, conflict detection
- **Speaker Service**: Speaker profiles, session assignments
- **CFP Service**: Submission flow, review, acceptance
- **Team Service**: Team member invitations, permission management, access control

**Key Decisions**:
- ✅ Service layer for reusability (shared logic)
- ✅ Services are testable (mock database)
- ✅ Complex transactions handled in services
- ✅ Services don't know about HTTP/tRPC

### Layer 4: Data Access (Prisma ORM)

**Purpose**: Type-safe database queries

**Components**:
- **Schema**: Database model definitions
- **Client**: Generated query builder
- **Migrations**: Version-controlled schema changes

**Key Decisions**:
- ✅ Prisma for type safety and developer experience
- ✅ PostgreSQL for relational integrity
- ✅ Migrations in version control
- ✅ Indexed columns for performance

### Layer 5: External Services

**Purpose**: Integrate third-party services

**Components**:
- **Resend**: Email delivery
- **NextAuth.js**: OAuth providers (Google, GitHub, Discord)
- **Future**: Payment processors (Stripe, Paystack)

**Key Decisions**:
- ✅ Resend for reliability and DX
- ✅ NextAuth.js for OAuth simplicity
- ✅ Abstract external services (easy to swap)

## 🔒 Security Architecture

### Authorization Layers

1. **Session-based Auth** (NextAuth.js)
   - Secure session cookies (httpOnly, secure, sameSite)
   - Session stored in database
   - Automatic session refresh

2. **Authorization Checks**
   - **protectedProcedure**: Requires authenticated user
   - **teamProtectedProcedure**: Requires team membership + module permission
   - **Organizer checks**: Verify event ownership
   - **Resource-level permissions**: Check user can access resource

3. **Input Validation**
   - Zod schemas for all inputs
   - Type coercion and sanitization
   - Custom validation rules

### Team Collaboration Security

The team collaboration system implements **defense-in-depth** security:

1. **API Layer Security** (`teamProtectedProcedure` middleware)
   ```typescript
   // Check 1: User authenticated
   if (!ctx.session) throw UNAUTHORIZED;
   
   // Check 2: User is active team member
   const member = await db.teamMember.findFirst({
     where: { eventId, userId: ctx.session.user.id, status: "ACTIVE" }
   });
   if (!member) throw FORBIDDEN;
   
   // Check 3: User has required module permission
   if (requiredModule && member.role !== "OWNER" 
       && !member.modulePermissions.includes(requiredModule)) {
     throw FORBIDDEN;
   }
   ```

2. **Client-side Guards** (UX only, not security)
   ```typescript
   const { hasPermission } = useTeamPermissions(eventId);
   
   if (!hasPermission("CFP")) {
     return <AccessDenied module="CFP" />;
   }
   ```

3. **Invitation Security**
   - **Token generation**: `crypto.randomBytes(32)` → 256 bits entropy
   - **Token format**: Base64 URL-safe (43 characters)
   - **Expiry**: 7 days from creation (database-enforced)
   - **Single-use**: Token invalidated after acceptance/decline
   - **No hashing needed**: Not a password, single-use, expires

4. **Owner Protection**
   - Cannot remove self (must transfer ownership first)
   - Cannot modify own permissions (always full access)
   - Database prevents deleting inviters (`onDelete: Restrict`)

5. **Permission Change Enforcement**
   - Immediate revocation at API layer
   - Next request after permission change returns 403
   - Client shows error and redirects to accessible module
   - No grace period in MVP (planned future enhancement)

### Data Security

- **SQL Injection**: Prevented by Prisma (parameterized queries)
- **XSS**: React auto-escapes output
- **CSRF**: NextAuth.js CSRF tokens
- **Secrets**: Environment variables, never in code
- **Password Hashing**: bcrypt with salt rounds

## 🚀 Performance Considerations

### Database Optimization

- **Indexes**: Strategic indexes on frequently queried columns
  - `Event`: organizerId, slug, status, startDate
  - `Registration`: eventId, ticketTypeId, email
  - `ScheduleEntry`: eventId, startTime
  - `Speaker`: eventId, email
  - `TeamMember`: eventId + status, eventId + userId, email
  - `Invitation`: token, eventId + status, email

- **Eager Loading**: Include related data to avoid N+1 queries
  ```typescript
  // Good: Single query
  db.event.findMany({
    include: { ticketTypes: true, organizer: true }
  })
  
  // Bad: N+1 queries
  const events = await db.event.findMany()
  for (const event of events) {
    event.ticketTypes = await db.ticketType.findMany(...)
  }
  ```

- **Pagination**: Always paginate large lists
  ```typescript
  db.registration.findMany({
    take: 50,
    skip: page * 50,
    orderBy: { registeredAt: 'desc' }
  })
  ```

### Caching Strategy

- **React Query**: Client-side cache (5 min stale time)
- **Server Components**: Built-in request deduplication
- **Database**: Connection pooling (Prisma)
- **Static Pages**: Public event pages (ISR future)

### Code Splitting

- **Dynamic Imports**: Load heavy components on demand
- **Route-based Splitting**: Automatic by Next.js
- **Lazy Loading**: Images, charts, modals

## 📈 Scalability Considerations

### Current Architecture (MVP)

- **Single Region**: One database, one app server
- **Vertical Scaling**: Increase server resources
- **Connection Pooling**: Prisma handles connection reuse

### Future Scalability (Beyond MVP)

- **Horizontal Scaling**: Multiple app server instances (Vercel auto-scales)
- **Database Replication**: Read replicas for heavy read workloads
- **CDN**: Static assets and images
- **Queue System**: Background jobs (email sending, exports)
- **Caching Layer**: Redis for session storage and hot data

## 🧪 Testing Strategy (Future)

### Unit Tests
- Service layer functions
- Validation schemas
- Utility functions

### Integration Tests
- tRPC procedures
- Database transactions
- Email sending

### E2E Tests
- Critical user flows (registration, event creation)
- Payment flows (when implemented)
- CFP submission and review

## 📊 Monitoring & Observability (Future)

- **Error Tracking**: Sentry for production errors
- **Performance**: Next.js Analytics
- **Logs**: Structured logging with Winston
- **Metrics**: Database query performance
- **Alerts**: Email delivery failures, database connection issues

## 🔄 Deployment Architecture

### Development
```
Developer Machine
    ↓
Local PostgreSQL
    ↓
pnpm run dev (localhost:3000)
```

### Production (Vercel)
```
GitHub (main branch)
    ↓
Vercel Deploy
    ↓
Edge Network (Vercel)
    ↓
App Server (Node.js)
    ↓
PostgreSQL (Managed Service)
    ↓
Resend API
```

## 🗂️ Module Relationships

```mermaid
graph LR
    A[Events] --> B[Tickets]
    A --> C[Schedule]
    A --> D[CFP]
    A --> E[Communications]
    A --> F[Speakers]
    A --> I[Team]
    
    B --> G[Registration]
    G --> H[Attendees]
    
    D --> F
    F --> C
    
    E --> G
    E --> F
    
    I -.->|controls access to| A
    I -.->|controls access to| B
    I -.->|controls access to| C
    I -.->|controls access to| D
    I -.->|controls access to| E
    I -.->|controls access to| F
    I -.->|controls access to| G
    I -.->|controls access to| H
    
    style A fill:#f59e0b
    style B fill:#10b981
    style C fill:#8b5cf6
    style D fill:#ef4444
    style E fill:#06b6d4
    style F fill:#ec4899
    style G fill:#3b82f6
    style H fill:#14b8a6
    style I fill:#f97316
```

**Module Dependencies**:
- **Events**: Core module, no dependencies
- **Tickets**: Depends on Events
- **Registration**: Depends on Events, Tickets
- **Attendees**: View layer over Registration
- **Schedule**: Depends on Events, Speakers
- **Speakers**: Depends on Events (can be created via CFP)
- **CFP**: Depends on Events (creates Speakers on acceptance)
- **Communications**: Depends on Events (sends to Registrations, Speakers)
- **Team**: Cross-cutting module that controls access to all other modules

### Module Dependency Graph

```mermaid
graph TD
    Events[Events Module<br/>Core]
    Tickets[Tickets Module]
    Registration[Registration Module]
    Attendees[Attendees Module<br/>View Only]
    Schedule[Schedule Module]
    Speakers[Speakers Module]
    CFP[CFP Module]
    Communications[Communications Module]
    Team[Team Module<br/>Permission Gateway]
    
    Events --> Tickets
    Events --> Schedule
    Events --> Speakers
    Events --> CFP
    Events --> Communications
    Events --> Team
    
    Tickets --> Registration
    Events --> Registration
    Registration --> Attendees
    
    CFP --> Speakers
    Speakers --> Schedule
    
    Registration -.->|sends to| Communications
    Speakers -.->|sends to| Communications
    
    Team -.->|enforces access to| Events
    Team -.->|enforces access to| Tickets
    Team -.->|enforces access to| Registration
    Team -.->|enforces access to| Attendees
    Team -.->|enforces access to| Schedule
    Team -.->|enforces access to| Speakers
    Team -.->|enforces access to| CFP
    Team -.->|enforces access to| Communications
    
    style Events fill:#0070f3,stroke:#0050c3,color:#fff
    style Tickets fill:#10b981,stroke:#059669,color:#fff
    style Registration fill:#f59e0b,stroke:#d97706,color:#fff
    style Attendees fill:#fbbf24,stroke:#f59e0b,color:#000
    style Schedule fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Speakers fill:#ec4899,stroke:#db2777,color:#fff
    style CFP fill:#ef4444,stroke:#dc2626,color:#fff
    style Communications fill:#06b6d4,stroke:#0891b2,color:#fff
    style Team fill:#f97316,stroke:#ea580c,color:#fff
```

**Legend**:
- Solid arrows: Direct dependencies
- Dashed arrows: Communication/integration points

### Team Module: Permission Gateway

The Team module is a **cross-cutting concern** that controls access to all other modules:

**Architecture Pattern**: Middleware-based authorization
```typescript
// Every protected procedure checks team permissions
export const cfpRouter = createTRPCRouter({
  getSubmissions: teamProtectedProcedure
    .input(z.object({ 
      eventId: z.string(),
      requiredModule: z.literal("CFP"), // Permission check
    }))
    .query(async ({ ctx, input }) => {
      // At this point, teamProtectedProcedure middleware has:
      // 1. Verified user is authenticated
      // 2. Verified user is active team member of this event
      // 3. Verified user has CFP permission (or is owner)
      
      return ctx.db.cfpSubmission.findMany({
        where: { eventId: input.eventId }
      });
    }),
});
```

**Database Relationships**:
```prisma
model Event {
  id          String       @id
  teamMembers TeamMember[] // Team members can access this event
  // ... other fields
}

model TeamMember {
  id                String   @id
  eventId           String
  userId            String?
  role              TeamRole  // OWNER or COLLABORATOR
  status            TeamMemberStatus // PENDING, ACTIVE, REMOVED
  modulePermissions String[]  // ["CFP", "SPEAKERS", "SCHEDULE"]
  // ... other fields
  
  @@index([eventId, status])      // Fast active member lookup
  @@index([eventId, userId])      // Fast permission check
}
```

**Permission Enforcement Flow**:
```
1. User requests CFP submissions
2. teamProtectedProcedure middleware runs
3. Query: Find TeamMember WHERE eventId AND userId AND status=ACTIVE
4. Check: member.role === "OWNER" OR "CFP" IN member.modulePermissions
5. If check passes: Proceed to query
6. If check fails: Return 403 FORBIDDEN
```

**Module Permissions**:
- `OVERVIEW` - Dashboard statistics (read-only)
- `ATTENDEES` - Registration management
- `TICKETS` - Ticket type management
- `SCHEDULE` - Schedule building
- `SPEAKERS` - Speaker profiles
- `CFP` - Submission review
- `COMMUNICATIONS` - Email campaigns

**Note**: SETTINGS module is owner-only and not assignable to collaborators.

## 📚 Related Documentation

- **[Tech Stack](./tech-stack.md)** - Detailed technology choices
- **[Data Model](./data-model.md)** - Database schema and relationships
- **[Authentication](./authentication.md)** - Auth implementation details
- **[File Structure](./file-structure.md)** - Project organization
- **[Team Module](../modules/team/README.md)** - Team collaboration documentation

---

[← Back to Documentation Index](../index.md) | [Tech Stack →](./tech-stack.md)

**Last Updated**: November 16, 2025  
**Next Review**: December 16, 2025

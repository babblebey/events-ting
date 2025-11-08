# Implementation Plan: All-in-One Event Management System

**Branch**: `001-event-management-system` | **Date**: November 8, 2025 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-event-management-system/spec.md`

**Status**: Phase 1 Complete - Ready for Task Decomposition (`/speckit.tasks`)

## Summary

Build an all-in-one event management system enabling organizers to create events, manage registrations (free tickets MVP with pluggable payment architecture), handle schedules, run Call for Papers, manage speakers, and send email communications. Built on T3 Stack (Next.js 15 App Router + tRPC + Prisma + NextAuth) with Flowbite React UI, targeting <2s page loads and supporting up to 10,000 attendees per event.

## Technical Context

**Language/Version**: TypeScript 5.8+ (ES2022 target), Node.js (per package.json engines)  
**Primary Dependencies**: Next.js 15.2+, React 19, tRPC 11.0+, Prisma 6.6+, NextAuth.js 5.0-beta, Flowbite React 0.12+, Tailwind CSS 4.0+, Zod 3.24+  
**Storage**: PostgreSQL via Prisma ORM (client generated to `generated/prisma/`)  
**Testing**: Integration/contract/unit test strategy defined (test suite to be implemented per constitution)  
**Target Platform**: Web application (Next.js App Router), modern browsers (Chrome/Firefox/Safari/Edge last 2 years)  
**Project Type**: Web application (single monorepo, App Router architecture)  
**Performance Goals**: <2s page load at 95th percentile (public pages), <3s for dashboard, <1s initial content (SSR/SSG), <200ms database queries  
**Constraints**: <500ms UI blocking for concurrent operations, 99.5% uptime during high-traffic periods, <200KB gzipped JS per route  
**Scale/Scope**: Up to 10,000 attendees per event, 50 events per organizer, 100 concurrent registrations without race conditions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with **events-ting Constitution v1.0.0**:

- [x] **TypeScript Type Safety**: ✅ Strict mode enabled in tsconfig.json (strict: true, noUncheckedIndexedAccess: true, checkJs: true), all new code will use proper type inference and avoid `any`, consistent type imports via ESLint rule
- [x] **Code Quality**: ✅ ESLint + Prettier configured in package.json with `pnpm run check` and `pnpm run format:check`, zero violations policy enforced pre-commit
- [x] **Testing Standards**: ✅ Test strategy defined per spec: integration tests for user journeys (P1-P6), contract tests for tRPC procedures and Prisma schema, unit tests for business logic (each user story independently testable)
- [x] **Next.js App Router**: ✅ Next.js 15.2+ with App Router structure already in place (`src/app/`), will use Server Components by default, client components only for interactive UI, proper metadata API usage
- [x] **tRPC Standards**: ✅ tRPC 11.0+ already configured with Zod validation, SuperJSON transformer, error formatting for ZodErrors, all new endpoints will follow resource.action naming (event.create, ticket.purchase, etc.)
- [x] **UX Consistency**: ✅ Flowbite React 0.12+ and Tailwind CSS 4.0+ already installed, will implement semantic HTML, ARIA labels, keyboard navigation, WCAG AA contrast ratios, Suspense for loading states, mobile-first responsive design
- [x] **Performance**: ✅ Performance targets defined in spec NFR-001 through NFR-004 (LCP <2.5s, page load <2s at p95), will use Next.js Image optimization, font preloading (Geist), code splitting via dynamic imports, Prisma query optimization
- [x] **Tech Stack Compliance**: ✅ Using T3 Stack as documented (Next.js 15.2+, TypeScript 5.8+, Prisma 6.6+, tRPC 11.0+, NextAuth 5.0-beta, pnpm 10.20+), Prisma conventions will follow PascalCase models, camelCase fields, explicit relations with timestamps
- [x] **Complexity Justification**: ✅ No constitution violations; feature aligns with stack capabilities. Only additional dependencies needed: Resend SDK for email (approved per spec clarification), React Email for templates, potential file upload library (to be researched in Phase 0)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web Application (T3 Stack monorepo structure)
src/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # Auth route group (signin, register)
│   ├── (dashboard)/              # Protected dashboard routes
│   │   └── [id]/                 # Dynamic event dashboard
│   │       ├── page.tsx          # Event overview
│   │       ├── attendees/        # Attendee management
│   │       ├── tickets/          # Ticket type management
│   │       ├── schedule/         # Schedule editor
│   │       ├── cfp/              # CFP management
│   │       ├── speakers/         # Speaker management
│   │       └── communications/   # Email campaigns
│   ├── events/                   # Public event listings & detail pages
│   │   └── [slug]/               # Public event page
│   │       ├── page.tsx          # Event details
│   │       ├── register/         # Public registration
│   │       ├── schedule/         # Public schedule view
│   │       ├── speakers/         # Public speaker directory
│   │       └── cfp/              # Public CFP submission
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth route handlers
│   │   └── trpc/[trpc]/          # tRPC endpoint
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                    # Shared React components
│   ├── ui/                       # Flowbite-based UI primitives
│   ├── events/                   # Event-specific components
│   ├── forms/                    # Form components with validation
│   └── layouts/                  # Layout components (sidebar, nav)
├── server/
│   ├── api/
│   │   ├── routers/              # tRPC routers by domain
│   │   │   ├── event.ts          # Event CRUD operations
│   │   │   ├── ticket.ts         # Ticket type management
│   │   │   ├── registration.ts   # Registration & attendee operations
│   │   │   ├── schedule.ts       # Schedule entry management
│   │   │   ├── cfp.ts            # CFP & submission management
│   │   │   ├── speaker.ts        # Speaker management
│   │   │   ├── communication.ts  # Email campaign operations
│   │   │   └── user.ts           # User profile operations
│   │   ├── root.ts               # Root router combining all routers
│   │   └── trpc.ts               # tRPC context & procedures
│   ├── auth/                     # NextAuth configuration
│   │   ├── config.ts             # Auth providers & callbacks
│   │   └── index.ts              # Auth exports
│   ├── services/                 # Business logic layer
│   │   ├── email.ts              # Resend email service
│   │   ├── registration.ts       # Registration business logic
│   │   └── payment.ts            # Payment processor interface (future)
│   └── db.ts                     # Prisma client singleton
├── lib/                          # Shared utilities
│   ├── utils.ts                  # Generic utility functions
│   ├── validators.ts             # Zod schemas for shared validation
│   └── constants.ts              # App constants
├── trpc/                         # tRPC client setup
│   ├── react.tsx                 # React Query tRPC client
│   ├── server.ts                 # Server-side tRPC caller
│   └── query-client.ts           # React Query client config
├── styles/
│   └── globals.css               # Global Tailwind styles
└── env.js                        # Environment variable validation

prisma/
├── schema.prisma                 # Prisma data model
└── migrations/                   # Database migrations

generated/
└── prisma/                       # Generated Prisma client

tests/
├── integration/                  # User journey tests
│   ├── event-creation.test.ts
│   ├── registration.test.ts
│   ├── schedule.test.ts
│   ├── cfp.test.ts
│   └── communications.test.ts
├── contract/                     # API & schema validation
│   ├── trpc-routers.test.ts
│   └── prisma-schema.test.ts
└── unit/                         # Business logic tests
    ├── email-service.test.ts
    └── registration-logic.test.ts

emails/                           # React Email templates
├── registration-confirmation.tsx
├── cfp-submission-received.tsx
├── cfp-accepted.tsx
├── cfp-rejected.tsx
└── event-reminder.tsx
```

**Structure Decision**: T3 Stack web application with Next.js App Router. All code resides in a single monorepo following established project conventions. Route grouping separates authenticated dashboard routes from public pages. tRPC routers organized by domain align with feature spec sections. Email templates use React Email for type-safe, component-based design.

## Complexity Tracking

> **No constitution violations identified** - Feature aligns with T3 Stack capabilities and project standards.

---

## Phase 0: Research (Complete)

All technical unknowns resolved. See [research.md](./research.md) for details.

**Key Decisions**:
1. **Email**: Resend + React Email for transactional and campaign delivery
2. **File Upload**: Local filesystem (MVP) → S3 (future) with storage adapter pattern
3. **Payments**: Strategy pattern with pluggable processors (free MVP, Stripe/Paystack future)
4. **Timezones**: UTC storage + date-fns-tz for display conversion
5. **Concurrency**: Optimistic control via Prisma `updatedAt` versioning
6. **Sold-Out**: Database transaction + row locking (ACID compliant)
7. **CFP Deadline**: Application validation + scheduled cron auto-close

**Dependencies to Add**:
```json
{
  "dependencies": {
    "resend": "^4.0.0",
    "@react-email/components": "^1.0.0",
    "@react-email/render": "^1.0.0",
    "date-fns": "^3.0.0",
    "date-fns-tz": "^3.0.0"
  },
  "devDependencies": {
    "@react-email/cli": "^1.0.0"
  }
}
```

---

## Phase 1: Design & Contracts (Complete)

### Data Model

Complete Prisma schema designed with all entities. See [data-model.md](./data-model.md) for full schema.

**Core Entities**:
- `Event` (with soft delete via `isArchived`)
- `User` (NextAuth.js + password field)
- `TicketType` (future-ready payment fields)
- `Registration` (with email status tracking)
- `ScheduleEntry` + `SpeakerSession` (many-to-many bridge)
- `CallForPapers` + `CfpSubmission`
- `Speaker`
- `EmailCampaign`

**Migration Command**:
```bash
pnpm run db:generate  # Creates migration + regenerates client
```

### API Contracts

tRPC routers designed for all domains. See [contracts/README.md](./contracts/README.md) for complete API specification.

**Routers**:
1. `event.ts` - Event CRUD, dashboard metrics, archival
2. `ticket.ts` - Ticket type management, availability
3. `registration.ts` - Attendee registration, exports
4. `schedule.ts` - Schedule CRUD, overlap detection
5. `cfp.ts` - CFP management, submission review
6. `speaker.ts` - Speaker profiles, session assignment
7. `communication.ts` - Email campaigns, bulk sending
8. `user.ts` - User profile operations

**Contract Testing**: Validate input/output schemas match specification.

### Developer Onboarding

Quickstart guide created. See [quickstart.md](./quickstart.md) for setup instructions.

**Covers**:
- Environment setup (PostgreSQL, OAuth providers, Resend API)
- Architecture overview (T3 Stack patterns)
- Key concepts (tRPC, Server Components, Prisma)
- Common development tasks
- Debugging tips

---

## Next Steps

**Phase 2: Task Decomposition** (run `/speckit.tasks`):
- Map user stories (P1-P6) to specific implementation tasks
- Break down tasks by layer (database, tRPC, UI components, pages)
- Assign task dependencies and effort estimates
- Create executable task list in `tasks.md`

**Agent Context Update**: Run the update script to integrate new technologies into AI agent context:
```bash
.\.specify\scripts\powershell\update-agent-context.ps1 -AgentType copilot
```

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

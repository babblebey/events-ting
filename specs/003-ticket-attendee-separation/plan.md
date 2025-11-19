# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The system needs to distinguish between ticket buyers (Registration) and actual event attendees (Attendee). Currently, the Registration model conflates buyer and attendee data. This feature introduces a Ticket model where each purchased ticket is a separate instance with a unique QR code and check-in status. Each Ticket links to an Attendee model storing individual attendee details (name, email, custom registration responses). This enables: (1) buyers purchasing multiple tickets and assigning them to different people, (2) collecting accurate attendee information per ticket, (3) individual check-in tracking at the ticket level rather than the buyer/registration level, and (4) attendee-specific communications.

**Technical Approach**: Refactor existing Registration model to represent only the buyer/purchase transaction, create new Ticket and Attendee models with proper relations, implement QR code generation for ticket instances, build buyer ticket management interface, add assignment workflow with custom registration forms, update check-in logic to operate at ticket level, and migrate attendee-targeted email campaigns to use Attendee records instead of Registration records.

## Technical Context

**Language/Version**: TypeScript 5.8+ (ES2022 target)  
**Primary Dependencies**: Next.js 15.2+, React 19.0, tRPC 11.0, Prisma 6.6, NextAuth 5.0-beta, Zod 3.24, Flowbite React 0.12  
**Storage**: PostgreSQL via Prisma ORM (schema at `prisma/schema.prisma`)  
**Testing**: NEEDS CLARIFICATION (test framework not yet established - need to select Jest/Vitest/Playwright)  
**Target Platform**: Web application (Next.js App Router, server-side rendering + client components)  
**Project Type**: Web (Next.js monorepo with App Router structure)  
**Performance Goals**: Core Web Vitals targets - LCP <2.5s, FID <100ms, CLS <0.1; ticket purchase flow <5s end-to-end; QR scan validation <3s  
**Constraints**: Event check-in must work with standard QR code readers; ticket assignment cutoff time is organizer-configurable (event start, 1h/24h before, or custom); max tickets per purchase is organizer-configurable (default 10); optimistic locking for concurrent ticket assignments  
**Scale/Scope**: Support 10k+ attendees per event; multiple ticket types per event; custom registration fields (JSON storage); real-time check-in metrics; individual ticket refunds; attendee-specific email campaigns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with **events-ting Constitution v1.0.0**:

- [x] **TypeScript Type Safety**: Strict mode enabled (`tsconfig.json` has `strict: true`, `noUncheckedIndexedAccess: true`, `checkJs: true`), no `any` types planned, type imports will use `type` keyword
- [x] **Code Quality**: ESLint + Prettier configured (`pnpm run check`, `pnpm run format:check`), zero violations policy enforced
- [x] **Testing Standards**: Test strategy defined - Vitest for unit/integration/contract tests, Playwright for E2E tests. Test independence verified per user story (see quickstart.md Phase 8)
- [x] **Next.js App Router**: Server Components first approach, proper file-based routing in `src/app/`, metadata API for SEO, client components only for interactive forms/modals (see quickstart.md Phase 5-6)
- [x] **tRPC Standards**: All API via tRPC procedures in `src/server/api/routers/tickets.ts` and `attendees.ts`, Zod validation for inputs, structured error handling with tRPC error codes (see contracts/)
- [x] **UX Consistency**: Flowbite React components with Tailwind CSS 4.0, accessibility requirements (semantic HTML, ARIA labels, keyboard nav, WCAG AA contrast), loading states for all async ops (see component examples in quickstart.md), mobile-first responsive design
- [x] **Performance**: Core Web Vitals targets defined (LCP <2.5s, FID <100ms, CLS <0.1), QR code generation optimized with error correction level H, database indexes defined in data-model.md (ticket lookup, check-in metrics), image optimization via Next.js Image component for QR codes
- [x] **Tech Stack Compliance**: Using approved T3 Stack (Next.js 15.2, TypeScript 5.8, Prisma 6.6, tRPC 11.0, NextAuth 5.0-beta). New dependencies added: qrcode (QR generation), nanoid (ticket numbers), html5-qrcode (check-in scanner), vitest + playwright (testing). All justified in research.md. Prisma conventions followed (PascalCase models, camelCase fields, timestamps)
- [x] **Complexity Justification**: Testing framework selection resolved - Vitest for unit/integration (faster, TypeScript-native), Playwright for E2E (multi-browser, visual regression). See research.md Section 1.

**Gate Status**: PASSED ✅

**Post-Design Re-evaluation**: All constitution principles satisfied. Testing framework clarification resolved. Data model follows Prisma conventions. API contracts use tRPC with Zod validation. UI components follow Flowbite + Tailwind standards. Performance optimizations documented (QR code caching, database indexes, optimistic locking).

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
src/
├── app/                          # Next.js App Router pages
│   ├── (dashboard)/              # Authenticated dashboard routes
│   │   ├── events/
│   │   │   └── [eventId]/
│   │   │       ├── tickets/      # Ticket management UI (organizer view)
│   │   │       └── check-in/     # Check-in interface
│   └── (public)/                 # Public routes
│       ├── events/
│       │   └── [slug]/
│       │       └── register/     # Ticket purchase flow
│       └── tickets/
│           ├── [ticketId]/       # Individual ticket view (attendee)
│           └── assign/           # Ticket assignment form
├── components/
│   ├── tickets/                  # Ticket-related components
│   │   ├── ticket-card.tsx
│   │   ├── qr-code-generator.tsx
│   │   ├── check-in-scanner.tsx
│   │   └── assignment-form.tsx
│   └── ui/                       # Shared UI components (Flowbite-based)
├── server/
│   ├── api/
│   │   └── routers/
│   │       ├── tickets.ts        # NEW: Ticket CRUD + assignment
│   │       ├── attendees.ts      # NEW: Attendee management
│   │       ├── registrations.ts  # UPDATED: Buyer/purchase logic
│   │       └── check-in.ts       # NEW: Check-in procedures
│   └── db/
│       └── schema.prisma         # UPDATED: Ticket + Attendee models
└── lib/
    ├── qr-code/                  # QR code generation utilities
    ├── email/                    # Email template rendering
    └── validators/               # Zod schemas for forms

prisma/
├── schema.prisma                 # UPDATED: Add Ticket + Attendee models
└── migrations/                   # Database migration files

tests/
├── integration/
│   ├── ticket-purchase.test.ts   # NEW: Multi-ticket purchase flow
│   ├── ticket-assignment.test.ts # NEW: Assignment + reassignment
│   └── check-in.test.ts          # NEW: QR scan + check-in tracking
├── contract/
│   ├── tickets-router.test.ts    # NEW: tRPC ticket procedures
│   └── prisma-schema.test.ts     # UPDATED: Validate new models
└── unit/
    ├── qr-code-generator.test.ts # NEW: QR code utility
    └── email-helpers.test.ts     # UPDATED: Attendee email logic
```

**Structure Decision**: This is a Next.js web application following the T3 Stack conventions. The App Router structure separates authenticated dashboard routes (`(dashboard)`) from public-facing routes (`(public)`) using route groups. Server-side logic lives in `src/server/api/routers/` as tRPC procedures. Components are organized by domain (`tickets/`, `attendees/`) with shared UI components in `ui/`. Tests mirror the source structure and are placed in a top-level `tests/` directory. Database schema is managed via Prisma in `prisma/schema.prisma`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

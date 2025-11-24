# Implementation Plan: Attendee Check-In Service

**Branch**: `004-attendee-check-in` | **Date**: November 24, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-attendee-check-in/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a check-in service for event team members to process attendee check-ins via manual ticket number lookup or QR code scanning. The system supports filtering by check-in status, real-time list updates, and offline queue synchronization. Core functionality includes a searchable attendee list view, QR code validation against the event's ticket database, duplicate check-in prevention, and permission-based access control requiring the new CHECKIN module permission.

Technical approach: Add CHECKIN to MODULE_NAMES constant, create protected Next.js App Router route at `/events/[slug]/check-in` with authentication middleware, implement tRPC procedures (listAttendees, checkInTicket, getMetrics) with checkModuleAccess validation, utilize existing Prisma Ticket schema fields (isCheckedIn, checkedInAt, checkedInBy), build Flowbite React UI with skeleton loaders and error boundaries, implement client-side QR scanning with browser Camera API, and defer offline support with local queue and background sync for future iteration.

## Technical Context

**Language/Version**: TypeScript 5.8+ (ES2022 target), strict mode enabled  
**Primary Dependencies**: Next.js 15.2+ (App Router), tRPC 11.0+, Prisma 6.6+, Zod 3.24+, Flowbite React 0.12+  
**Storage**: PostgreSQL via Prisma (existing Ticket schema with isCheckedIn, checkedInAt, checkedInBy fields)  
**Testing**: Integration tests (user journey: authenticate → access check-in page → search ticket → check in), contract tests (tRPC schema validation)  
**Target Platform**: Web (Server-Side Rendering + Client Components), mobile-responsive (375px min width)  
**Project Type**: Web application (Next.js App Router with tRPC API layer)  
**Performance Goals**: Check-in list loads in <2s, QR scan check-in completes in <3s, search results return in <500ms  
**Constraints**: Requires authentication + CHECKIN module permission, timezone-aware timestamps (store UTC, display event timezone), offline support deferred to Phase 2  
**Scale/Scope**: Support 100+ concurrent check-ins/hour, paginate attendee lists (50 per page), handle events with 1000+ tickets

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with **events-ting Constitution v1.0.0**:

- [x] **TypeScript Type Safety**: Strict mode enabled, no `any` types, type imports consistent
  - ✅ All contracts use Zod schemas with proper type inference
  - ✅ tRPC procedures are fully typed with input/output validation
  - ✅ No `any` types in implementation (checked in research.md)
  
- [x] **Code Quality**: ESLint + Prettier configured, zero violations policy
  - ✅ Using existing ESLint configuration
  - ✅ Code follows existing project patterns
  
- [x] **Testing Standards**: Test strategy defined (integration > contract > unit), independence verified
  - ✅ Integration tests planned: check-in flow, QR scanning, filtering (research.md §4)
  - ✅ Contract tests planned: tRPC schema validation (research.md §4)
  - ✅ Each test validates one acceptance scenario independently
  
- [x] **Next.js App Router**: Server Components first, proper route structure, metadata API usage
  - ✅ Route: `/events/[slug]/check-in/page.tsx` (Server Component)
  - ✅ Client components only for interactive elements (QR scanner, search)
  - ✅ Proper file structure with `_components/` directory
  
- [x] **tRPC Standards**: All API communication via tRPC, Zod validation, proper error handling
  - ✅ New router: `src/server/api/routers/check-in.ts`
  - ✅ All inputs/outputs validated with Zod (contracts/check-in-api.ts)
  - ✅ Error codes: NOT_FOUND, FORBIDDEN, UNAUTHORIZED, BAD_REQUEST
  - ✅ Permission checks via `checkModuleAccess` helper
  
- [x] **UX Consistency**: Flowbite + Tailwind, accessibility requirements, loading states, mobile-first
  - ✅ Flowbite React components for UI (Table, Button, Modal)
  - ✅ Accessibility: ARIA labels for QR scanner, keyboard navigation
  - ✅ Loading states: Skeleton loaders, button spinners
  - ✅ Mobile-first: Responsive design (375px min width)
  
- [x] **Performance**: Core Web Vitals targets defined, optimization strategy documented
  - ✅ Check-in list loads in <2s (pagination, indexes)
  - ✅ QR scan check-in completes in <3s
  - ✅ Search results return in <500ms (debounced, indexed queries)
  - ✅ Optimization: Pagination (50/page), optimistic updates, React Query caching
  
- [x] **Tech Stack Compliance**: No unapproved dependencies, Prisma conventions followed
  - ✅ Only new dependency: `html5-qrcode` (80KB, dynamic import)
  - ✅ Uses existing Prisma Ticket schema (no migrations needed)
  - ✅ Follows Prisma conventions: camelCase fields, DateTime in UTC
  
- [x] **Complexity Justification**: If violating any principle, document rationale in Complexity Tracking table
  - ✅ No violations - see Complexity Tracking section

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
├── app/
│   └── events/
│       └── [slug]/
│           └── check-in/           # New check-in route
│               ├── page.tsx        # Check-in list view (Server Component)
│               ├── _components/
│               │   ├── attendee-list.tsx         # Client Component: attendee table
│               │   ├── check-in-filters.tsx      # Client Component: filter controls
│               │   ├── qr-scanner.tsx            # Client Component: QR code scanner
│               │   ├── search-bar.tsx            # Client Component: ticket search
│               │   └── check-in-metrics.tsx      # Server Component: metrics display
│               └── loading.tsx     # Skeleton loader
├── server/
│   └── api/
│       └── routers/
│           └── check-in.ts         # New tRPC router: listAttendees, checkInTicket, getMetrics
├── lib/
│   ├── validators.ts               # Add CHECKIN to MODULE_NAMES
│   └── qr-code.ts                  # QR code utilities (validation, parsing)
└── hooks/
    └── use-check-in.ts             # Client hook for check-in mutations

tests/
├── integration/
│   └── check-in/
│       ├── check-in-list.test.ts           # List view + filtering
│       ├── manual-check-in.test.ts         # Ticket number check-in
│       └── qr-check-in.test.ts             # QR code scanning
└── contract/
    └── check-in-api.test.ts        # tRPC schema validation
```

**Structure Decision**: Web application structure (Next.js App Router). Check-in functionality is a new module within the existing event management system at `/events/[slug]/check-in`. Uses existing authentication middleware, team permission system, and Prisma Ticket schema. No new database tables required—leverages existing Ticket.isCheckedIn, Ticket.checkedInAt, Ticket.checkedInBy fields.

## Complexity Tracking

No constitution violations. This feature:
- Uses existing tech stack (Next.js, tRPC, Prisma, Flowbite)
- Follows App Router patterns (Server Components with Client Components for interactivity)
- Implements CHECKIN module permission using existing checkModuleAccess pattern
- Adheres to type safety (strict mode, Zod validation, no `any`)
- Includes integration and contract tests
- Meets accessibility standards (keyboard navigation, ARIA labels for QR scanner)
- Optimizes performance (pagination, skeleton loaders, optimistic updates)

Offline support is acknowledged as a complex feature deferred to Phase 2 per FR-013 (requires Service Workers, IndexedDB, background sync API).

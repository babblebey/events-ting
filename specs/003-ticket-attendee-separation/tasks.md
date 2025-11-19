---
description: "Task list for Ticket Instance and Attendee Separation feature"
---

# Tasks: Ticket Instance and Attendee Separation

**Feature**: `003-ticket-attendee-separation`  
**Input**: Design documents from `/specs/003-ticket-attendee-separation/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Automated testing excluded from this feature scope.

**Organization**: Tasks are grouped by user story (4 user stories: US1-P1, US2-P2, US3-P2, US5-P3) to enable independent implementation and testing. Note: User Story 4 (Check-in Tracking) deferred to separate sprint.

**Constitution Compliance**: All tasks adhere to events-ting Constitution v1.0.0:
- TypeScript 5.8+ strict mode, no `any` types
- ESLint/Prettier passing (pnpm run check)
- Next.js 15.2+ App Router (Server Components first)
- tRPC 11.0 with Zod validation for all APIs
- Prisma 6.6 for database operations
- Flowbite React 0.12 + Tailwind CSS 4.0 for UI
- Mobile-first responsive, WCAG AA accessibility
- Core Web Vitals targets (LCP <2.5s, FID <100ms, CLS <0.1)

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US5) this task belongs to
- Exact file paths included in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and database schema

- [X] T001 Update Prisma schema with Ticket and Attendee models in prisma/schema.prisma
- [X] T002 Add assignmentCutoffType, assignmentCutoffTime, maxTicketsPerPurchase fields to Event model in prisma/schema.prisma
- [X] T003 [P] Add tickets relation to Registration model in prisma/schema.prisma
- [X] T004 [P] Add tickets relation to TicketType model in prisma/schema.prisma
- [X] T005 Generate Prisma migration for new models using `pnpm db:migrate dev --name ticket-attendee-separation`
- [X] T006 [P] Install QR code generation dependencies: `pnpm add qrcode nanoid`
- [ ] ~~T007 [P] SKIP - Install QR code scanner dependency: `pnpm add html5-qrcode`~~
- [X] T008 [P] Install QR code type definitions: `pnpm add -D @types/qrcode`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and helpers needed by ALL user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T013 [P] Create ticket number generator utility (human-readable unique ID) in src/lib/tickets/generate-ticket-number.ts
- [ ] T014 [P] Create QR code generator utilities (data URL and SVG, encoding Ticket.id+eventId) in src/lib/qr-code/generator.ts
- [ ] T015 [P] Create assignment cutoff helper functions (display only, validation deferred) in src/lib/events/assignment-cutoff.ts
- [ ] T016 [P] Create email validation helper with soft warnings in src/lib/validators/email.ts
- [ ] T017 [P] Create custom field validation utilities in src/lib/validators/custom-fields.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Multiple Ticket Purchase with Individual Assignment (Priority: P1) 🎯 MVP

**Goal**: Enable buyers to purchase multiple tickets and assign each to a different person with unique ticket details and QR codes

**Independent Test**: Purchase 3 tickets → assign each to different person → verify each receives unique ticket with QR code and personal information

### Implementation for User Story 1

- [ ] T018 [P] [US1] Create Zod input schemas for tickets.list procedure in src/server/api/routers/tickets.ts
- [ ] T019 [P] [US1] Create Zod output schemas for ticket operations in src/server/api/routers/tickets.ts
- [ ] T020 [US1] Implement tickets.list procedure in src/server/api/routers/tickets.ts
- [ ] T021 [US1] Implement tickets.getByNumber procedure in src/server/api/routers/tickets.ts
- [ ] T022 [US1] Implement tickets.generateQRCode procedure in src/server/api/routers/tickets.ts
- [ ] T023 [US1] Implement tickets.assign procedure with optimistic locking in src/server/api/routers/tickets.ts
- [ ] T024 [US1] Implement tickets.unassign procedure in src/server/api/routers/tickets.ts
- [ ] T025 [US1] Add tickets and attendees routers to root router in src/server/api/root.ts
- [ ] T026 [P] [US1] Create TicketCard component in src/components/tickets/ticket-card.tsx
- [ ] T027 [P] [US1] Create QRCodeDisplay component in src/components/tickets/qr-code-display.tsx
- [ ] T028 [P] [US1] Create AssignmentForm component in src/components/tickets/assignment-form.tsx
- [ ] T029 [US1] Update registration creation logic to create ticket instances in src/app/(public)/events/[slug]/register/page.tsx
- [ ] T030 [US1] Create buyer registration lookup page (by email) in src/app/(public)/events/[slug]/registrations/page.tsx
- [ ] T031 [US1] Create individual ticket view page in src/app/(public)/tickets/[ticketId]/page.tsx
- [ ] T032 [US1] Create ticket assignment page in src/app/(public)/tickets/assign/page.tsx
- [ ] T033 [US1] Create ticket-assigned email template in emails/ticket-assigned.tsx
- [ ] T034 [US1] Integrate email sending in tickets.assign procedure in src/server/api/routers/tickets.ts
- [ ] T035 [US1] Update buyer registration confirmation email to reference ticket assignments in emails/registration-confirmation.tsx
- [ ] T035a [US1] Add mock buyer permission confirmation checkbox to AssignmentForm (FR-018 placeholder - full implementation deferred)
- [ ] T035b [US1] Add mock attendee terms acceptance to individual ticket view page (FR-019 placeholder - full implementation deferred)

**Checkpoint**: User Story 1 complete - buyers can purchase multiple tickets, assign them to different people, and each attendee receives unique ticket with QR code

---

## Phase 4: User Story 2 - Attendee Information Collection (Priority: P2)

**Goal**: Collect event-specific information from each attendee (dietary restrictions, t-shirt size, etc.) through custom registration forms

**Independent Test**: Create event with custom questions → purchase tickets → assign with custom data → verify organizer sees all responses

### Implementation for User Story 2

- [ ] T036 [P] [US2] Add customData field definition to Event model documentation in docs/modules/events/
- [ ] T037 [P] [US2] Create custom field schema types in src/lib/validators/custom-fields.ts
- [ ] T038 [US2] Update AssignmentForm to render custom fields dynamically in src/components/tickets/assignment-form.tsx
- [ ] T039 [US2] Add custom field validation to tickets.assign procedure in src/server/api/routers/tickets.ts
- [ ] T040 [P] [US2] Create Zod schemas for attendees router in src/server/api/routers/attendees.ts
- [ ] T041 [US2] Implement attendees.list procedure in src/server/api/routers/attendees.ts
- [ ] T042 [US2] Implement attendees.getById procedure in src/server/api/routers/attendees.ts
- [ ] T043 [US2] Implement attendees.getCustomFieldResponses procedure in src/server/api/routers/attendees.ts
- [ ] T044 [US2] Create event settings page for custom field configuration in src/app/(dashboard)/events/[eventId]/settings/registration/page.tsx
- [ ] T045 [US2] Create CustomFieldBuilder component in src/components/events/custom-field-builder.tsx
- [ ] T046 [US2] Create attendee detail view showing custom responses in src/app/(dashboard)/events/[eventId]/attendees/[attendeeId]/page.tsx

**Checkpoint**: User Story 2 complete - organizers can create custom registration questions and view attendee responses

---

## Phase 5: User Story 3 - Buyer Self-Service Ticket Management (Priority: P2)

**Goal**: Enable buyers to manage their ticket purchases through a dashboard, including viewing assignments and making changes

**Independent Test**: Purchase tickets → access dashboard → assign/reassign tickets → verify all changes reflected in UI

### Implementation for User Story 3

- [ ] T047 [P] [US3] Create TicketList component with assignment status in src/components/tickets/ticket-list.tsx
- [ ] T048 [P] [US3] Create RegistrationSummary component showing all tickets in src/components/tickets/registration-summary.tsx
- [ ] T049 [US3] Add filtering and search to registration management page in src/app/(public)/events/[slug]/registrations/[registrationId]/page.tsx
- [ ] T050 [US3] Create ticket reassignment modal component in src/components/tickets/reassignment-modal.tsx
- [ ] T051 [US3] Add cutoff time display (UI only, no validation) to AssignmentForm in src/components/tickets/assignment-form.tsx (TODO: Add cutoff enforcement validation in future sprint)
- [ ] T052 [US3] Create ticket-reassigned email template in emails/ticket-reassigned.tsx
- [ ] T053 [US3] Add email notification for reassignments in tickets.assign procedure in src/server/api/routers/tickets.ts
- [ ] T054 [US3] Implement registration management page accessible via email link in src/app/(public)/events/[slug]/registrations/[registrationId]/page.tsx
- [ ] T055 [US3] Add unassigned ticket warning/reminder UI in src/components/tickets/unassigned-reminder.tsx

**Checkpoint**: User Story 3 complete - buyers can fully manage their tickets through self-service dashboard

---

## Phase 6: User Story 5 - Buyer vs Attendee Communication (Priority: P3)

**Goal**: Enable organizers to send event communications to individual attendees rather than just buyers

**Independent Test**: Assign tickets to different emails → send event announcement → verify each attendee receives email at their address

### Implementation for User Story 5

- [ ] T066 [P] [US5] Implement attendees.exportList procedure with CSV generation in src/server/api/routers/attendees.ts
- [ ] T067 [P] [US5] Implement attendees.update procedure in src/server/api/routers/attendees.ts
- [ ] T068 [P] [US5] Implement attendees.updateEmailStatus webhook procedure in src/server/api/routers/attendees.ts
- [ ] T069 [US5] Create attendee list page with email status filtering in src/app/(dashboard)/events/[eventId]/attendees/page.tsx
- [ ] T070 [US5] Create email campaign composer component in src/components/communications/email-composer.tsx
- [ ] T071 [US5] Update email sending utilities to support batch sending in src/lib/email/send-attendee-emails.ts
- [ ] T072 [US5] Create event-reminder email template for attendees in emails/event-reminder.tsx
- [ ] T073 [US5] Add Resend webhook handler for email status updates in src/app/api/webhooks/resend/route.ts
- [ ] T074 [US5] Create attendee export functionality with CSV download in src/app/(dashboard)/events/[eventId]/attendees/export/page.tsx

**Checkpoint**: User Story 5 complete - organizers can communicate directly with individual attendees

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality improvements, documentation, and final validation

- [ ] T075 [P] Add database indexes for ticket lookup performance (ticketNumber, eventId+isCheckedIn) in prisma/schema.prisma
- [ ] T076 [P] Create ticket management documentation in docs/modules/tickets/
- [ ] T077 [P] Create attendee management documentation in docs/modules/attendees/
- [ ] T078 [P] Update API documentation with new routers in docs/api/routers.md
- [ ] T079 [P] Add error handling documentation in docs/api/error-handling.md
- [ ] T080 Run ESLint and Prettier checks: `pnpm run check`
- [ ] T081 Fix any linting or type errors identified
- [ ] T082 Validate all email templates using script: `pnpm run validate:emails`
- [ ] T083 Manual QA: Verify unassigned ticket behavior at event start (currently no cutoff enforcement - document expected behavior)
- [ ] T084 Manual QA: Verify ticket reassignment deletes previous attendee data (GDPR compliance)
- [ ] T085 Manual QA: Verify email deliverability for ticket assignment notifications
- [ ] T086 Manual QA: Validate accessibility (keyboard navigation, screen reader, WCAG AA contrast)
- [ ] T087 Manual QA: Test mobile responsiveness for all ticket-related pages
- [ ] T088 Manual QA: Measure Core Web Vitals (LCP, FID, CLS) for ticket pages

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 complete - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Phase 2 completion
  - User Story 1 (P1) - MVP priority, no dependencies on other stories
  - User Story 2 (P2) - Can start after Phase 2, may reference US1 components
  - User Story 3 (P2) - Can start after Phase 2, enhances US1 dashboard
  - User Story 5 (P3) - Depends on attendee data from US1, should follow US1-3
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

- **US1 (P1) - Multiple Ticket Purchase**: Foundation only → Fully independent
- **US2 (P2) - Attendee Information**: Foundation only → Independent (extends US1 assignment form)
- **US3 (P2) - Buyer Dashboard**: Foundation + US1 UI components → Enhances US1
- **US5 (P3) - Communications**: Foundation + Attendee data (US1) → Should follow US1-3

### Within Each User Story

- Zod schemas before tRPC procedures
- tRPC procedures before UI components that call them
- Core components before pages that use them
- Email templates before integration in procedures
- All [P] tasks can run in parallel within a story

### Parallel Opportunities

**Phase 1 (Setup)**:
- T006, T007, T008 (dependency installation) can run in parallel

**Phase 2 (Foundational)**:
- ALL tasks T013-T017 can run in parallel (different files, no dependencies)

**User Story 1**:
- T018, T019 (schemas) can run in parallel
- T026, T027, T028 (components) can run in parallel after T020-T024 complete

**User Story 2**:
- T036, T037 (schemas/types) can run in parallel
- T040, T041, T042, T043 (attendees router) can run in sequence but T040 can start immediately

**User Story 5**:
- T066, T067, T068 (procedures) can run in parallel

**Phase 7 (Polish)**:
- T075, T076, T077, T078, T079 (documentation) can run in parallel
- T083-T088 (manual QA) can run in any order after implementation complete

**Team Parallel Strategy**:
Once Phase 2 completes:
- Developer A: US1 (MVP core)
- Developer B: US2 (Custom fields)
- Developer C: US3 (Buyer dashboard)

---

## Parallel Example: User Story 1

```bash
# After Phase 2 completes, launch these US1 tasks in parallel:

Batch 1 (Schemas - no dependencies):
- T018: Create Zod input schemas for tickets.list
- T019: Create Zod output schemas for tickets

Batch 2 (After schemas):
- T020: tickets.list procedure
- T021: tickets.getByNumber procedure
- T022: tickets.generateQRCode procedure

Batch 3 (Components - can start with Batch 2):
- T026: TicketCard component
- T027: QRCodeDisplay component
- T028: AssignmentForm component
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Recommended approach for fastest value delivery**:

1. Complete Phase 1: Setup (T001-T008)
2. Complete Phase 2: Foundational (T013-T017) - CRITICAL
3. Complete Phase 3: User Story 1 (T018-T035) - Core ticket purchase/assignment
4. **STOP and VALIDATE**: Manual QA of ticket purchase → assignment flow end-to-end
5. Run Phase 7 validation tasks (T076-T084)
6. Deploy MVP with US1

**MVP delivers**: Multi-ticket purchase, individual assignment, unique QR codes, email notifications

**Note**: Check-in tracking (original US4) deferred to separate sprint/specification

### Incremental Delivery (Add Stories Progressively)

After MVP (US1):

7. Add Phase 4: User Story 2 (T036-T046) - Custom registration fields
8. Test independently → Deploy (now supports custom attendee data)
9. Add Phase 5: User Story 3 (T047-T055) - Enhanced buyer dashboard
10. Test independently → Deploy (better buyer UX)
11. Add Phase 6: User Story 5 (T066-T074) - Attendee communications
12. Test independently → Deploy (complete feature without check-in)

**Each increment adds value without breaking previous functionality**

### Parallel Team Strategy (3+ Developers)

**Week 1**: All developers on Phase 1 + Phase 2 together (foundation must be solid)

**Week 2-3** (after foundation complete):
- **Dev A**: Phase 3 (US1) - T018-T035
- **Dev B**: Phase 4 (US2) - T036-T046
- **Dev C**: Phase 5 (US3) - T047-T055

**Week 4**:
- **Dev A**: Phase 6 (US5) - T066-T074
- **Dev B**: Phase 7 (Polish) - T071-T084
- **Dev C**: Documentation and final QA

**Integration**: Stories merge independently, no blocking conflicts

---

## Task Count Summary

- **Phase 1 (Setup)**: 8 tasks
- **Phase 2 (Foundational)**: 5 tasks (BLOCKING)
- **Phase 3 (US1 - P1 MVP)**: 20 tasks (includes T035a, T035b)
- **Phase 4 (US2 - P2)**: 11 tasks
- **Phase 5 (US3 - P2)**: 9 tasks
- **Phase 6 (US5 - P3)**: 9 tasks
- **Phase 7 (Polish)**: 14 tasks (T075-T088)

**Total**: 76 tasks

**MVP Scope** (US1 only): 32 tasks (Setup + Foundational + US1 + minimal Polish)

**Parallel Opportunities**: 25+ tasks marked [P] can run in parallel

---

## Success Criteria Validation

After implementation, verify these outcomes from spec.md:

- [ ] SC-001: Buyers can purchase multiple tickets (up to configurable limit) and receive confirmation <5s
- [ ] SC-002: Each ticket has unique QR code (encoding Ticket.id+eventId) scannable by standard readers
- [ ] SC-003: Attendees complete assignment + custom fields in <3 minutes
- [ ] SC-004: Check-in staff scan and validate tickets in <3 seconds (DEFERRED - US4 not in scope)
- [ ] SC-005: System prevents duplicate check-ins with 100% reliability (DEFERRED - US4 not in scope)
- [ ] SC-006: Organizers view real-time metrics updating within 2 seconds (DEFERRED - US4 not in scope)
- [ ] SC-007: 100% of assigned attendees receive emails at individual addresses
- [ ] SC-008: Ticket reassignments reflect in system within 5 seconds
- [ ] SC-009: 100% data integrity maintained (no orphaned tickets)
- [ ] SC-010: Custom field responses captured and stored with 100% accuracy

---

## Notes

- All tasks follow TypeScript strict mode (no `any` types)
- All API calls use tRPC with Zod validation
- All UI components use Flowbite React + Tailwind CSS
- All database operations use Prisma ORM
- Mobile-first responsive design required
- WCAG AA accessibility compliance required
- ESLint/Prettier must pass before commit
- Each user story delivers independently testable value
- [P] indicates parallelizable tasks (different files)
- [Story] label maps to spec.md user stories for traceability
- Stop at checkpoints to validate story completeness
- Automated testing excluded; manual QA required for validation
- User Story 4 (Check-in Tracking) deferred to separate specification/sprint

---

## Resources

- **Feature Spec**: `specs/003-ticket-attendee-separation/spec.md`
- **Implementation Plan**: `specs/003-ticket-attendee-separation/plan.md`
- **Research Notes**: `specs/003-ticket-attendee-separation/research.md`
- **Data Model**: `specs/003-ticket-attendee-separation/data-model.md`
- **API Contracts**: `specs/003-ticket-attendee-separation/contracts/`
- **Quickstart Guide**: `specs/003-ticket-attendee-separation/quickstart.md`
- **Constitution**: `.specify/memory/constitution.md`
- **Project Docs**: `docs/`

**Questions?** Reference research.md for technical decisions or create GitHub issue.

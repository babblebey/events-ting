# Tasks: All-in-One Event Management System

**Input**: Design documents from `/specs/001-event-management-system/`  
**Prerequisites**: ✅ plan.md, ✅ spec.md, ✅ research.md, ✅ data-model.md, ✅ contracts/  
**Feature Branch**: `001-event-management-system`  
**Date**: November 8, 2025

**Tests**: Tests are OPTIONAL and NOT included in this task list. Tests will be added in a future phase if requested per the project constitution.

**Organization**: Tasks are grouped by user story (P1-P6 from spec.md) to enable independent implementation and testing.

**Constitution Compliance**: All tasks adhere to events-ting Constitution v1.0.0:
- TypeScript strict mode, no `any` types
- ESLint/Prettier passing before commit
- Next.js App Router patterns (Server Components default)
- tRPC for all API communication with Zod validation
- Flowbite React UI + Tailwind CSS
- Mobile-first responsive design with accessibility
- Performance targets: <2s page load (public), <3s (dashboard)

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1-US6 maps to priorities P1-P6 in spec.md)
- All file paths are absolute from repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [X] T001 Install new dependencies: `resend`, `@react-email/components`, `@react-email/render`, `date-fns`, `date-fns-tz` in package.json
- [X] T002 Install dev dependencies: `react-email` (CLI) in package.json
- [X] T003 Run `pnpm install` to install all new dependencies
- [X] T004 Create email templates directory structure at `emails/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Update Prisma schema with all event management models in `prisma/schema.prisma` (based on data-model.md)
- [X] T006 Run `pnpm run db:generate` to create migration and regenerate Prisma client
- [X] T007 [P] Create shared Zod validation schemas in `src/lib/validators.ts` for events, tickets, registrations, schedules, speakers, CFP
- [X] T008 [P] Create date utility functions in `src/lib/utils/date.ts` for timezone handling with date-fns-tz
- [X] T009 [P] Create storage service interface in `src/server/services/storage.ts` with local filesystem adapter (MVP)
- [X] T010 [P] Create email service in `src/server/services/email.ts` with Resend integration
- [X] T011 [P] Create payment processor interface in `src/server/services/payment/types.ts` and free ticket processor in `src/server/services/payment/free.ts`
- [X] T012 Create file upload route handler in `src/app/api/upload/route.ts` for speaker photos and event images
- [X] T013 Create Resend webhook handler in `src/app/api/webhooks/resend/route.ts` for bounce tracking
- [X] T014 Update environment variable validation in `src/env.js` to include RESEND_API_KEY and optional OAuth credentials
- [X] T015 [P] Create shared UI components in `src/components/ui/` for forms, modals, badges, and tables using Flowbite React
- [X] T016 [P] Update sidebar component in `src/components/sidebar.tsx` to include event management navigation

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Event Creation and Basic Management (Priority: P1) 🎯 MVP

**Goal**: Enable event organizers to create events and access dedicated dashboards for basic event management

**Independent Test**: Create a new event via form, verify it appears in events list, access dashboard, edit event details, verify changes persist

### Implementation for User Story 1

- [X] T017 [P] [US1] Create event tRPC router in `src/server/api/routers/event.ts` with procedures: create, list, getBySlug, getById, update, archive, restore, delete
- [X] T018 [P] [US1] Create user tRPC router in `src/server/api/routers/user.ts` with procedures: getProfile, updateProfile, changePassword, deleteAccount
- [X] T019 [US1] Add event and user routers to root router in `src/server/api/root.ts`
- [X] T020 [P] [US1] Create EventForm component in `src/components/events/event-form.tsx` with validation for name, description, dates, location, timezone
- [X] T021 [P] [US1] Create EventCard component in `src/components/events/event-card.tsx` for event list display
- [X] T022 [P] [US1] Create EventMetrics component in `src/components/events/event-metrics.tsx` for dashboard summary cards
- [X] T023 [US1] Create events listing page in `src/app/events/page.tsx` (Server Component) showing all public events
- [X] T024 [US1] Create event creation page in `src/app/(dashboard)/create-event/page.tsx` (protected route)
- [X] T025 [US1] Create event dashboard layout in `src/app/(dashboard)/[id]/layout.tsx` with sidebar navigation
- [X] T026 [US1] Create event overview page in `src/app/(dashboard)/[id]/page.tsx` displaying metrics and quick actions
- [X] T027 [US1] Create event settings page in `src/app/(dashboard)/[id]/settings/page.tsx` for editing event details
- [X] T028 [US1] Create public event page in `src/app/events/[slug]/page.tsx` (Server Component) for attendee view
- [X] T029 [US1] Implement soft delete confirmation modal component in `src/components/events/archive-modal.tsx` with impact summary
- [X] T030 [US1] Add authentication check and redirect logic to dashboard layout

**Checkpoint**: User Story 1 complete - can create events, view dashboards, edit details independently

---

## Phase 4: User Story 2 - Ticket and Registration Management (Priority: P2)

**Goal**: Enable organizers to create free ticket types and manage attendee registrations with public registration flow

**Independent Test**: Create ticket types for an event, publish registration page, complete test registration, view attendee in dashboard, export attendee list

### Implementation for User Story 2

- [X] T031 [P] [US2] Create ticket tRPC router in `src/server/api/routers/ticket.ts` with procedures: create, list, getById, update, delete, getStats
- [X] T032 [P] [US2] Create registration tRPC router in `src/server/api/routers/registration.ts` with procedures: create, list, getById, addManually, cancel, export, resendConfirmation, updateEmailStatus
- [X] T033 [US2] Add ticket and registration routers to root router in `src/server/api/root.ts`
- [X] T034 [P] [US2] Create React Email template for registration confirmation in `emails/registration-confirmation.tsx`
- [X] T035 [P] [US2] Create TicketTypeForm component in `src/components/tickets/ticket-type-form.tsx` for creating/editing ticket types
- [X] T036 [P] [US2] Create TicketTypeCard component in `src/components/tickets/ticket-type-card.tsx` showing availability and sold count
- [X] T037 [P] [US2] Create RegistrationForm component in `src/components/registration/registration-form.tsx` for public registration
- [X] T038 [P] [US2] Create AttendeeTable component in `src/components/registration/attendee-table.tsx` with filters and search
- [ ] T039 [US2] Create tickets management page in `src/app/(dashboard)/[id]/tickets/page.tsx` for organizers
- [ ] T040 [US2] Create attendees management page in `src/app/(dashboard)/[id]/attendees/page.tsx` with table, filters, and export
- [ ] T041 [US2] Create public registration page in `src/app/events/[slug]/register/page.tsx` showing available tickets
- [X] T042 [US2] Implement transaction with row locking in registration.create procedure to prevent overselling (Research Section 6)
- [X] T043 [US2] Add sold-out badge and low-stock warning to TicketTypeCard component
- [X] T044 [US2] Implement CSV export functionality in registration.export procedure using streaming for large datasets
- [X] T045 [US2] Add confirmation email sending after successful registration using email service

**Checkpoint**: User Story 2 complete - tickets and registrations work independently, integrates with US1 events

---

## Phase 5: User Story 3 - Event Schedule Management (Priority: P3)

**Goal**: Enable organizers to create and publish event schedules with sessions, speakers, and tracks

**Independent Test**: Create schedule entries with different times/tracks, assign speakers, view published schedule as attendee, detect overlap warnings

### Implementation for User Story 3

- [X] T046 [P] [US3] Create schedule tRPC router in `src/server/api/routers/schedule.ts` with procedures: create, list, getById, update, delete, reorder, checkOverlap, getByDate
- [X] T047 [US3] Add schedule router to root router in `src/server/api/root.ts`
- [X] T048 [P] [US3] Create ScheduleEntryForm component in `src/components/schedule/schedule-entry-form.tsx` with time pickers and track selection
- [X] T049 [P] [US3] Create ScheduleTimeline component in `src/components/schedule/schedule-timeline.tsx` for chronological display with track colors
- [X] T050 [P] [US3] Create ScheduleCard component in `src/components/schedule/schedule-card.tsx` for individual session display
- [X] T051 [US3] Create schedule management page in `src/app/(dashboard)/[id]/schedule/page.tsx` with timeline view and drag-to-reorder
- [X] T052 [US3] Create public schedule page in `src/app/events/[slug]/schedule/page.tsx` organized by date and track
- [X] T053 [US3] Implement overlap detection logic in schedule.checkOverlap procedure (warning only, FR-021)
- [X] T054 [US3] Add visual overlap warning indicator in ScheduleEntryForm component
- [X] T055 [US3] Implement timezone conversion using date utility functions for display
- [X] T056 [US3] Add optimistic concurrency control with updatedAt versioning in schedule.update procedure (Research Section 5)
- [X] T057 [US3] Implement track filtering and color coding in ScheduleTimeline component (FR-025)

**Checkpoint**: User Story 3 complete - schedules work independently, displays on event pages

---

## Phase 6: User Story 4 - Call for Papers Management (Priority: P4)

**Goal**: Enable organizers to accept session proposals via CFP, review submissions, and accept/reject proposals

**Independent Test**: Open CFP with deadline, submit proposal as speaker, review submission as organizer, accept proposal, verify speaker auto-created

### Implementation for User Story 4

- [X] T058 [P] [US4] Create cfp tRPC router in `src/server/api/routers/cfp.ts` with procedures: open, close, update, submitProposal, listSubmissions, reviewSubmission, acceptProposal, rejectProposal
- [X] T059 [US4] Add cfp router to root router in `src/server/api/root.ts`
- [X] T060 [P] [US4] Create React Email template for CFP submission received in `emails/cfp-submission-received.tsx`
- [X] T061 [P] [US4] Create React Email template for CFP accepted in `emails/cfp-accepted.tsx`
- [X] T062 [P] [US4] Create React Email template for CFP rejected in `emails/cfp-rejected.tsx`
- [X] T063 [P] [US4] Create CfpForm component in `src/components/cfp/cfp-form.tsx` for opening/editing CFP with deadline picker
- [X] T064 [P] [US4] Create CfpSubmissionForm component in `src/components/cfp/cfp-submission-form.tsx` for public proposal submission
- [X] T065 [P] [US4] Create SubmissionCard component in `src/components/cfp/submission-card.tsx` for review dashboard
- [X] T066 [P] [US4] Create ReviewPanel component in `src/components/cfp/review-panel.tsx` with score input and notes textarea
- [X] T067 [US4] Create CFP management page in `src/app/(dashboard)/[id]/cfp/page.tsx` with submission list and review UI
- [X] T068 [US4] Create public CFP submission page in `src/app/events/[slug]/cfp/page.tsx` with guidelines and form
- [X] T069 [US4] Implement deadline enforcement in cfp.submitProposal procedure (Research Section 7)
- [X] T070 [US4] Create cron job endpoint in `src/app/api/cron/close-expired-cfps/route.ts` for auto-closing CFPs
- [X] T071 [US4] Implement speaker auto-creation in cfp.acceptProposal procedure (FR-034)
- [X] T072 [US4] Add email notifications for accepted/rejected proposals using email service
- [X] T073 [US4] Add vercel.json configuration for CFP cron job (if using Vercel deployment)

**Checkpoint**: User Story 4 complete - CFP workflow functional, integrates with speakers (US5)

---

## Phase 7: User Story 5 - Speaker Management (Priority: P5)

**Goal**: Enable organizers to manage speaker profiles, assign speakers to sessions, and display speaker directory

**Independent Test**: Manually add speaker, assign to schedule session, view speaker profile with sessions list, see speaker directory on public page

### Implementation for User Story 5

- [X] T074 [P] [US5] Create speaker tRPC router in `src/server/api/routers/speaker.ts` with procedures: create, list, getById, update, delete, assignToSession, unassignFromSession, getByEvent
- [X] T075 [US5] Add speaker router to root router in `src/server/api/root.ts`
- [X] T076 [P] [US5] Create SpeakerForm component in `src/components/speakers/speaker-form.tsx` with photo upload and social links
- [X] T077 [P] [US5] Create SpeakerCard component in `src/components/speakers/speaker-card.tsx` for grid display with photo and bio
- [X] T078 [P] [US5] Create SpeakerProfile component in `src/components/speakers/speaker-profile.tsx` showing full bio and session list
- [X] T079 [US5] Create speakers management page in `src/app/(dashboard)/[id]/speakers/page.tsx` with speaker grid and add button
- [X] T080 [US5] Create public speakers directory page in `src/app/events/[slug]/speakers/page.tsx` with filterable grid
- [X] T081 [US5] Implement speaker-to-session assignment using SpeakerSession junction table in speaker.assignToSession procedure
- [X] T082 [US5] Add speaker avatars and names to ScheduleCard component (integration with US3)
- [X] T083 [US5] Update ScheduleEntryForm to include speaker multi-select dropdown (integration with US3)

**Checkpoint**: User Story 5 complete - speaker management functional, integrates with schedule (US3) and CFP (US4)

---

## Phase 8: User Story 6 - Event Communications (Priority: P6)

**Goal**: Enable organizers to create and send email campaigns to attendees, speakers, or custom recipient groups

**Independent Test**: Create draft campaign, select recipients (all attendees), send test email, schedule campaign, view delivery stats

### Implementation for User Story 6

- [X] T084 [P] [US6] Create communication tRPC router in `src/server/api/routers/communication.ts` with procedures: createCampaign, listCampaigns, getCampaign, updateCampaign, sendCampaign, scheduleCampaign, getCampaignStats
- [X] T085 [US6] Add communication router to root router in `src/server/api/root.ts`
- [X] T086 [P] [US6] Create React Email template for event reminder in `emails/event-reminder.tsx`
- [X] T087 [P] [US6] Create CampaignEditor component in `src/components/communications/campaign-editor.tsx` with rich text editor and recipient selector
- [X] T088 [P] [US6] Create CampaignCard component in `src/components/communications/campaign-card.tsx` showing status and stats
- [X] T089 [P] [US6] Create RecipientSelector component in `src/components/communications/recipient-selector.tsx` for filtering by ticket type, role, or custom lists
- [X] T090 [US6] Create communications page in `src/app/(dashboard)/[id]/communications/page.tsx` with campaign list and editor
- [ ] T091 [US6] Implement batch email sending with Resend in communication.sendCampaign procedure (Research Section 1)
- [ ] T092 [US6] Add retry logic with exponential backoff for failed emails in email service (FR-056, NFR-011)
- [ ] T093 [US6] Implement recipient filtering logic (all attendees, ticket types, speakers, custom) in communication procedures
- [ ] T094 [US6] Add scheduled campaign support in communication.scheduleCampaign procedure (FR-047)
- [ ] T095 [US6] Create cron job endpoint in `src/app/api/cron/send-scheduled-campaigns/route.ts` for scheduled email delivery
- [ ] T096 [US6] Update Resend webhook handler to track delivery stats (opens, clicks, bounces) and update EmailCampaign records
- [ ] T097 [US6] Add vercel.json configuration for scheduled campaigns cron job (if using Vercel deployment)

**Checkpoint**: User Story 6 complete - email campaigns functional, all user stories now implemented

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories and production readiness

- [ ] T098 [P] Update README.md with project overview, setup instructions, and deployment guide
- [ ] T099 [P] Validate quickstart.md instructions with fresh environment setup
- [ ] T100 [P] Create seed script in `prisma/seed.ts` with sample data for all entities (events, tickets, registrations, schedules, speakers, CFP, campaigns)
- [ ] T101 [P] Add loading skeletons using Flowbite Skeleton components to all dashboard pages for better perceived performance
- [ ] T102 [P] Add error boundaries to all main routes using Next.js error.tsx convention
- [ ] T103 [P] Implement toast notifications for success/error feedback across all forms using Flowbite Toast
- [ ] T104 Add pagination to all list views (events, attendees, submissions, campaigns) with cursor-based pagination
- [ ] T105 Optimize database queries with Prisma indexes based on common queries (add @@index directives)
- [ ] T106 Add input debouncing to search fields in AttendeeTable and other searchable components
- [ ] T107 Implement image optimization for speaker photos and event images using Next.js Image component
- [ ] T108 Add meta tags and Open Graph data to public pages (events, schedule, speakers) for SEO and social sharing
- [ ] T109 Run ESLint and Prettier across entire codebase with `pnpm run check`
- [ ] T110 Verify TypeScript strict mode compliance with `pnpm run typecheck`
- [ ] T111 Test all user journeys in browser (create event → tickets → registration → schedule → CFP → speakers → communications)
- [ ] T112 Add ARIA labels and keyboard navigation to all interactive components for accessibility (WCAG AA compliance)
- [ ] T113 Test responsive design on mobile, tablet, and desktop viewports
- [ ] T114 Run Lighthouse audit on public pages to verify <2s load time target (NFR-001)
- [ ] T115 Add rate limiting to public endpoints (registration, CFP submission) to prevent abuse
- [ ] T116 Document all environment variables needed in .env.example file

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational (Phase 2) completion
  - Can proceed in parallel if multiple developers available
  - Or sequentially in priority order: US1 → US2 → US3 → US4 → US5 → US6
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Event Management)**: No dependencies on other stories - START HERE for MVP
- **US2 (Tickets/Registration)**: Depends on US1 (needs Event entity) - Can start after US1 complete
- **US3 (Schedule)**: Depends on US1 (needs Event entity) - Can start after US1 complete, will integrate with US5 later
- **US4 (CFP)**: Depends on US1 (needs Event entity) - Can start after US1 complete, will create speakers for US5
- **US5 (Speakers)**: Depends on US1 (needs Event entity) - Can start after US1 complete, integrates with US3 and US4
- **US6 (Communications)**: Depends on US1 and US2 (needs Event and Registration entities) - Start after US1 and US2 complete

### Within Each User Story

1. tRPC routers before UI components (API contracts defined first)
2. Add router to root.ts after router creation
3. Shared components before page components
4. Business logic (procedures) before UI integration
5. Email templates before email sending logic
6. Validation schemas before form components

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks can run in parallel

**Phase 2 (Foundational)**: Tasks T007-T016 marked [P] can run in parallel after T005-T006 complete

**Within User Stories**:
- All tasks marked [P] within a story can run simultaneously (different files)
- Components can be built in parallel by different developers
- Router procedures can be implemented in parallel if independent

---

## Parallel Execution Examples

### Phase 2: Foundational (After migration complete)

```bash
# Can run in parallel:
- T007: Zod validators
- T008: Date utilities
- T009: Storage service
- T010: Email service
- T011: Payment service
- T015: UI components
- T016: Sidebar updates

# Must run sequentially:
T005 → T006 (migration first) → then parallel tasks → T012-T014 (route handlers)
```

### User Story 1: Event Management

```bash
# Can run in parallel:
- T017: Event router
- T018: User router
- T020: EventForm component
- T021: EventCard component
- T022: EventMetrics component

# Then sequential:
T019: Add routers to root → T023-T030: Pages and integration
```

### User Story 2: Tickets/Registration

```bash
# Can run in parallel:
- T031: Ticket router
- T032: Registration router
- T034: Email template
- T035: TicketTypeForm
- T036: TicketTypeCard
- T037: RegistrationForm
- T038: AttendeeTable

# Then sequential:
T033: Add routers → T039-T045: Pages and business logic
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Minimum viable product delivers event creation and dashboard**:

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T016) - CRITICAL foundation
3. Complete Phase 3: User Story 1 (T017-T030)
4. **STOP and VALIDATE**: Create test event, access dashboard, edit details
5. Deploy MVP and gather feedback

**Estimated time**: 3-5 days for solo developer

---

### Incremental Delivery (Recommended)

**Each user story adds value without breaking previous features**:

1. **Foundation**: Setup + Foundational → Database, services, auth ready
2. **MVP (US1)**: Event management → Organizers can create events and dashboards
3. **US2 Add-on**: Tickets → Organizers can manage registrations (FREE tickets)
4. **US3 Add-on**: Schedule → Events now have published schedules
5. **US4 Add-on**: CFP → Events can crowdsource content from speakers
6. **US5 Add-on**: Speakers → Enhanced speaker profiles and session tracking
7. **US6 Add-on**: Communications → Organizers can send email campaigns
8. **Polish**: Production-ready with performance optimizations

Each increment is independently testable and deployable.

---

### Parallel Team Strategy

**With 2-3 developers after foundational phase**:

- **Developer A**: User Story 1 → User Story 4 → User Story 6
- **Developer B**: User Story 2 → User Story 5
- **Developer C**: User Story 3 → Polish

**Timeline**: ~2 weeks for all stories with 3 developers

---

## Task Summary

- **Total Tasks**: 116
- **Setup**: 4 tasks (T001-T004)
- **Foundational**: 12 tasks (T005-T016)
- **User Story 1 (P1)**: 14 tasks (T017-T030)
- **User Story 2 (P2)**: 15 tasks (T031-T045)
- **User Story 3 (P3)**: 12 tasks (T046-T057)
- **User Story 4 (P4)**: 16 tasks (T058-T073)
- **User Story 5 (P5)**: 10 tasks (T074-T083)
- **User Story 6 (P6)**: 14 tasks (T084-T097)
- **Polish**: 19 tasks (T098-T116)

**Parallel Opportunities**: 45 tasks marked [P] can run simultaneously (different files, no dependencies)

**MVP Scope** (Minimum for production): Phase 1 + Phase 2 + Phase 3 (US1) = 30 tasks

**Recommended First Release**: MVP + US2 (Tickets/Registration) = 45 tasks

---

## Format Validation

✅ All tasks follow required checklist format: `- [ ] [ID] [P?] [Story?] Description`  
✅ All task IDs sequential (T001-T116)  
✅ All user story tasks labeled ([US1]-[US6])  
✅ All parallelizable tasks marked [P]  
✅ All task descriptions include specific file paths  
✅ All phases have clear goals and checkpoints  
✅ Dependencies documented with execution order  
✅ Independent test criteria provided for each user story

---

## Notes

- Tests are OPTIONAL per constitution and not included in this task list
- Each task targets a specific file path for clarity
- [P] indicates tasks can run in parallel (different files)
- [Story] labels enable tracking which user story each task serves
- Stop at any checkpoint to validate story independence
- Commit frequently after completing tasks or logical groups
- Run `pnpm run check` before committing to ensure linting/type safety
- Constitution compliance enforced: TypeScript strict mode, no `any`, ESLint passing
- Performance targets: <2s public pages, <3s dashboard (NFR-001, NFR-002)
- Accessibility: WCAG AA compliance required for all interactive components

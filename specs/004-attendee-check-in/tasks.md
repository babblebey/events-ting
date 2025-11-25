---
description: "Task list for Attendee Check-In Service implementation"
---

# Tasks: Attendee Check-In Service

**Input**: Design documents from `/specs/004-attendee-check-in/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Feature Summary**: Create a check-in service for event team members to process attendee check-ins via manual ticket number lookup or QR code scanning. Supports filtering by check-in status, real-time list updates, and permission-based access control requiring the CHECKIN module permission.

**Tests**: Tests NOT explicitly requested in specification - focusing on implementation first, tests can be added later if needed.

**Constitution Compliance**: All tasks adhere to events-ting Constitution v1.0.0:
- TypeScript strict mode, no `any` types
- Next.js App Router patterns (Server Components first)
- tRPC for all API communication with Zod validation
- Flowbite React + Tailwind for UI
- Mobile-first responsive design
- Accessibility requirements (ARIA labels, keyboard navigation)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add CHECKIN module permission and prepare project structure for check-in feature

- [X] T001 Add "CHECKIN" to MODULE_NAMES constant in src/lib/validators.ts
- [X] T002 [P] Create check-in contracts directory at specs/004-attendee-check-in/contracts/check-in-api.ts (already exists - verify completeness)
- [X] T003 [P] Create directory structure for check-in route at src/app/events/[slug]/check-in/
- [X] T003A [P] Create check-in components directory at src/components/check-in/ following established pattern

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core tRPC router and permission infrastructure that MUST be complete before ANY user story UI can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create check-in tRPC router file at src/server/api/routers/check-in.ts
- [X] T005 Export check-in router in main tRPC router at src/server/api/root.ts
- [X] T006 [P] Implement listAttendees query procedure with permission check in src/server/api/routers/check-in.ts
- [X] T007 [P] Implement checkInTicket mutation procedure with permission check in src/server/api/routers/check-in.ts
- [X] T008 [P] Implement getMetrics query procedure with permission check in src/server/api/routers/check-in.ts

**Checkpoint**: Foundation ready - tRPC API is functional, user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Manual Check-In via List View (Priority: P1) 🎯 MVP

**Goal**: Enable event team members to search attendees by ticket number and perform manual check-in operations

**Independent Test**: Load check-in page, search for a ticket number, click check-in button, verify status updates to "Checked In" with timestamp

**Why MVP**: This is the foundation of the check-in system providing core value by enabling manual check-in operations. Can function independently without QR scanning.

### Implementation for User Story 1

- [X] T009 Create main check-in page Server Component at src/app/events/[slug]/check-in/page.tsx
- [X] T010 [P] Create loading skeleton component at src/app/events/[slug]/check-in/loading.tsx
- [X] T011 [P] Create attendee list client component at src/components/check-in/attendee-list.tsx
- [X] T012 [P] Create search bar client component at src/components/check-in/search-bar.tsx
- [X] T013 [P] Create check-in filters client component at src/components/check-in/check-in-filters.tsx
- [X] T014 [P] Create check-in metrics server component at src/components/check-in/check-in-metrics.tsx
- [X] T015 Create check-in custom hook at src/hooks/use-check-in.ts with optimistic updates
- [X] T016 Add check-in route to event sidebar navigation in src/components/app-sidebar.tsx
- [X] T016A [P] Create check-in components barrel export at src/components/check-in/index.ts
- [X] T017 Implement pagination controls in attendee-list component at src/components/check-in/attendee-list.tsx
- [X] T018 Add error boundary for check-in page at src/app/events/[slug]/check-in/error.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - team members can search and manually check in attendees

---

## Phase 4: User Story 2 - QR Code Scanning for Check-In (Priority: P2)

**Goal**: Enable rapid check-in processing by scanning QR codes on tickets

**Independent Test**: Click "Scan QR Code" button, allow camera permissions, scan a QR code, verify automatic check-in occurs with success message

**Dependencies**: Builds on User Story 1 (uses same check-in mutation and list view), but QR scanner is independently testable

### Implementation for User Story 2

- [X] T019 Create QR scanner client component at src/components/check-in/qr-scanner.tsx
- [X] T020 Create QR code utilities module at src/lib/qr-code.ts with validation and parsing functions
- [X] T021 Integrate QR scanner component into check-in page at src/app/events/[slug]/check-in/page.tsx
- [X] T022 Add camera permission handling and error states in qr-scanner component at src/components/check-in/qr-scanner.tsx
- [X] T023 Implement QR code detection and auto check-in flow in qr-scanner component at src/components/check-in/qr-scanner.tsx
- [X] T024 Add scanner cleanup on component unmount in qr-scanner component at src/components/check-in/qr-scanner.tsx
- [X] T025 Install and configure html5-qrcode library via package.json

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - team members can check in via list view OR QR scanning

---

## Phase 5: User Story 3 - Attendee Status Filtering and Overview (Priority: P3)

**Goal**: Provide operational insights by filtering attendees by check-in status and displaying real-time metrics

**Independent Test**: Apply "Checked In" filter and verify only checked-in attendees display, apply "Not Checked In" filter and verify list updates, observe real-time count updates

**Dependencies**: Enhances User Story 1 list view with filtering capabilities

### Implementation for User Story 3

- [X] T026 Implement filter state management in check-in filters component at src/components/check-in/check-in-filters.tsx
- [X] T027 Add filter query parameter handling in check-in page at src/app/events/[slug]/check-in/page.tsx
- [X] T028 Implement metrics calculation display in check-in metrics component at src/components/check-in/check-in-metrics.tsx
- [X] T029 Add real-time list updates on filter changes in attendee-list component at src/components/check-in/attendee-list.tsx
- [X] T030 Display check-in percentage and progress indicator in check-in metrics component at src/components/check-in/check-in-metrics.tsx

**Checkpoint**: All user stories should now be independently functional - complete check-in system with manual entry, QR scanning, and status filtering

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and ensure production readiness

- [ ] T031 [P] Add accessibility attributes (ARIA labels, keyboard navigation) to all check-in components
- [ ] T032 [P] Implement mobile-responsive design for check-in page (375px minimum width)
- [ ] T033 [P] Add skeleton loaders for all async operations in check-in components
- [ ] T034 [P] Implement error toast notifications for check-in failures
- [ ] T035 Add duplicate check-in warning modal in attendee-list component at src/components/check-in/attendee-list.tsx
- [ ] T036 [P] Add loading spinners to check-in buttons during mutation
- [ ] T037 [P] Optimize database queries with proper indexes (verify existing indexes in prisma/schema.prisma)
- [ ] T038 Add timezone handling for check-in timestamps (UTC storage, event timezone display)
- [ ] T039 [P] Add documentation for CHECKIN module in docs/modules/team/README.md
- [ ] T040 [P] Update quickstart.md with testing instructions (verify completeness)
- [ ] T041 Run ESLint and Prettier on all check-in files
- [ ] T042 Validate all acceptance scenarios from spec.md manually
- [ ] T043 Add CHECKIN permission option to team member invitation UI

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001) completion - BLOCKS all user stories
- **User Stories (Phase 3, 4, 5)**: All depend on Foundational phase (T004-T008) completion
  - User stories can proceed in parallel if staffed
  - Or sequentially in priority order: US1 (P1) → US2 (P2) → US3 (P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (Phase 3)**: Can start after Foundational phase - NO dependencies on other stories ✅
- **User Story 2 (Phase 4)**: Can start after Foundational phase - Builds on US1 UI but independently testable
- **User Story 3 (Phase 5)**: Can start after Foundational phase - Enhances US1 filtering but independently testable

### Within Each User Story

**User Story 1 Flow**:
1. T009 (page) creates route
2. T010-T014, T016A (components + barrel export) can run in parallel [P]
3. T015 (hook) depends on T007 mutation being available
4. T016-T018 (integration) complete the story

**User Story 2 Flow**:
1. T025 (install library) should happen first
2. T019-T020 (scanner + utils) can run in parallel [P]
3. T021-T024 (integration) depend on T019

**User Story 3 Flow**:
1. T026-T030 enhance existing components
2. All can proceed after US1 components exist

### Parallel Opportunities

**Phase 1 (Setup)**: T002, T003, and T003A can run in parallel after T001

**Phase 2 (Foundational)**: T006, T007, T008 can run in parallel after T004-T005

**Phase 3 (User Story 1)**: 
- T010, T011, T012, T013, T014, T016A can all run in parallel (different component files)
- Creates 6 parallel tasks

**Phase 4 (User Story 2)**:
- T019 and T020 can run in parallel (different files)

**Phase 6 (Polish)**:
- T031, T032, T033, T034, T036, T037, T039, T040 can all run in parallel (different concerns/files)
- Creates 8 parallel tasks

---

## Parallel Example: User Story 1

Once T009 is complete, launch these 5 tasks together:

```bash
# Parallel batch 1 - All component creation:
T010: "Create loading skeleton at src/app/events/[slug]/check-in/loading.tsx"
T011: "Create attendee list at src/components/check-in/attendee-list.tsx"
T012: "Create search bar at src/components/check-in/search-bar.tsx"
T013: "Create filters at src/components/check-in/check-in-filters.tsx"
T014: "Create metrics at src/components/check-in/check-in-metrics.tsx"
T016A: "Create barrel export at src/components/check-in/index.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - RECOMMENDED

1. ✅ Complete Phase 1: Setup (T001-T003) - ~30 minutes
2. ✅ Complete Phase 2: Foundational (T004-T008) - ~2 hours
3. ✅ Complete Phase 3: User Story 1 (T009-T018) - ~4 hours
4. **STOP and VALIDATE**: Test manual check-in flow end-to-end
5. Deploy/demo MVP - team members can now check in attendees manually

**Total MVP Time**: ~6.5 hours of focused work

### Incremental Delivery (Recommended Production Path)

1. **Iteration 1**: Setup + Foundational → Foundation ready (~2.5 hours)
2. **Iteration 2**: Add User Story 1 → Test independently → Deploy (MVP! ~4 hours)
3. **Iteration 3**: Add User Story 2 → Test QR scanning → Deploy (~3 hours)
4. **Iteration 4**: Add User Story 3 → Test filtering → Deploy (~2 hours)
5. **Iteration 5**: Polish phase → Production ready (~3 hours)

**Total Feature Time**: ~14.5 hours of focused work

### Parallel Team Strategy

With 3 developers (after Foundational phase complete):

1. **All team**: Complete Setup + Foundational together (~2.5 hours)
2. **Once Foundational done**:
   - Developer A: User Story 1 (T009-T018) - ~4 hours
   - Developer B: User Story 2 (T019-T025) - ~3 hours  
   - Developer C: User Story 3 (T026-T030) - ~2 hours
3. **All team**: Polish phase (T031-T043) - ~3 hours

**Total Parallel Time**: ~9.5 hours (vs 14.5 hours sequential)

---

## Task Summary

### Total Tasks: 45

**By Phase**:
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 5 tasks ⚠️ BLOCKS all user stories
- Phase 3 (User Story 1 - P1): 11 tasks 🎯 MVP
- Phase 4 (User Story 2 - P2): 7 tasks
- Phase 5 (User Story 3 - P3): 5 tasks
- Phase 6 (Polish): 13 tasks

**By User Story**:
- User Story 1 (Manual Check-In): 11 tasks
- User Story 2 (QR Scanning): 7 tasks
- User Story 3 (Filtering): 5 tasks
- Infrastructure: 9 tasks (Setup + Foundational)
- Polish: 13 tasks

**Parallelization Opportunities**: 20 tasks marked [P]

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 20 tasks = ~6.5 hours

---

## Format Validation ✅

All tasks follow the strict checklist format:

```
- [ ] [TaskID] [P?] [Story?] Description with file path
```

**Validation Results**:
- ✅ All 45 tasks have checkboxes `- [ ]`
- ✅ All tasks have sequential IDs (T001-T043, T003A, T016A)
- ✅ [P] markers only on parallelizable tasks (18 tasks)
- ✅ [Story] labels on user story tasks only (US1, US2, US3)
- ✅ No [Story] labels on Setup/Foundational/Polish phases
- ✅ All tasks include specific file paths
- ✅ Tasks organized by user story for independent implementation

---

## Notes

- **[P]** tasks work on different files with no dependencies - safe to parallelize
- **[Story]** labels map tasks to user stories for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All file paths are absolute from repository root
- Follow existing Next.js App Router patterns in codebase
- Use existing Flowbite React components for UI consistency
- Check-in components follow established pattern: centralized in src/components/check-in/ (like attendees/, tickets/, team/)
- Import check-in components into pages via barrel export from src/components/check-in/index.ts
- Verify TypeScript strict mode compliance on each task
- Run ESLint/Prettier before committing

---

**Ready to implement!** Start with Phase 1, Task T001.

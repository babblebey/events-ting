---
description: "Task list for Team Collaborators & Permissions feature implementation"
---

# Tasks: Event Team Collaborators & Permissions

**Feature Branch**: `002-team-collaborators`  
**Input**: Design documents from `/specs/002-team-collaborators/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: NOT explicitly requested in feature specification - Test tasks are NOT included per requirement.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Constitution Compliance**: All tasks must adhere to the events-ting Constitution v1.0.0 principles:
- TypeScript strict mode, no `any` types
- ESLint/Prettier passing before commit
- Next.js App Router patterns (Server Components first)
- tRPC for all API communication with Zod validation
- Mobile-first responsive design, accessibility requirements
- Performance budgets (Core Web Vitals targets)

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database structure setup

- [X] T001 Run Prisma migration to add TeamMember, Invitation models, and enums (TeamRole, TeamMemberStatus, InvitationStatus) to prisma/schema.prisma
- [X] T002 Create seed script to add OWNER TeamMember for all existing events in prisma/seed.ts
- [X] T003 [P] Add module name constants and validation schemas to src/lib/validators.ts
- [X] T004 [P] Add team collaboration email templates structure in emails/ directory

**Checkpoint**: Database schema and foundational types ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create team tRPC router file src/server/api/routers/team.ts with base structure and exports
- [X] T006 Add team router to root tRPC router in src/server/api/root.ts
- [X] T007 Create teamProtectedProcedure middleware in src/server/api/trpc.ts for permission checks
- [X] T008 [P] Update settings layout navigation to link general tab to /settings (not /settings/general) in src/app/(dashboard)/[id]/settings/layout.tsx
- [X] T009 [P] Keep existing settings content at src/app/(dashboard)/[id]/settings/page.tsx (no separate /general route needed)
- [X] T010 [P] Create email utility helper functions for team collaboration emails in src/lib/email.ts
- [X] T011 [P] Create team-invitation email template in emails/team-invitation.tsx
- [X] T012 [P] Create team-invitation-accepted email template in emails/team-invitation-accepted.tsx
- [X] T013 [P] Create team-invitation-declined email template in emails/team-invitation-declined.tsx
- [X] T014 [P] Create team-permission-changed email template in emails/team-permission-changed.tsx
- [X] T015 [P] Create team-access-removed email template in emails/team-access-removed.tsx
- [X] T016 [P] Create base team components directory structure at src/components/team/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Invite Collaborator with Module Permissions (Priority: P1) 🎯 MVP

**Goal**: Enable event organizers to invite collaborators with specific module permissions, send email invitations, allow acceptance, and enforce module-level access control

**Independent Test**: Can be fully tested by inviting a user with specific module permissions (e.g., CFP + ATTENDEES), verifying they can only access and manage those assigned modules. Delivers standalone value of basic team collaboration.

### Implementation for User Story 1

#### Backend API (tRPC Procedures)

- [ ] T017 [P] [US1] Implement team.invite procedure with validation in src/server/api/routers/team.ts
- [ ] T018 [P] [US1] Implement team.acceptInvitation procedure in src/server/api/routers/team.ts
- [ ] T019 [P] [US1] Implement team.getCurrentMember query in src/server/api/routers/team.ts
- [ ] T020 [US1] Add invitation token generation utility using crypto.randomBytes in src/lib/utils.ts
- [ ] T021 [US1] Implement email sending for team.invite (sends team-invitation.tsx) in team.ts invite procedure
- [ ] T022 [US1] Implement email sending for team.acceptInvitation (sends team-invitation-accepted.tsx) in team.ts acceptInvitation procedure

#### Frontend - Team Management Page

- [ ] T023 [P] [US1] Create team management page at src/app/(dashboard)/[id]/settings/team/page.tsx
- [ ] T024 [P] [US1] Create loading state for team page at src/app/(dashboard)/[id]/settings/team/loading.tsx
- [ ] T025 [P] [US1] Create InviteCollaboratorForm component in src/components/team/invite-collaborator-form.tsx
- [ ] T026 [P] [US1] Create ModulePermissionsSelector component with checkboxes in src/components/team/module-permissions-selector.tsx

#### Frontend - Invitation Acceptance Flow

- [ ] T027 [P] [US1] Create invitation acceptance page at src/app/invitations/accept/page.tsx
- [ ] T028 [US1] Implement token verification and acceptance flow in invitation acceptance page

#### Permission Enforcement

- [ ] T029 [US1] Create useTeamPermissions hook in src/hooks/useTeamPermissions.ts for client-side permission checks
- [ ] T030 [US1] Add module permission checks to existing module routers (cfp.ts, attendees.ts, schedule.ts, speakers.ts, communications.ts, tickets.ts) using teamProtectedProcedure
- [ ] T031 [US1] Add client-side permission gates to dashboard navigation in src/app/(dashboard)/[id]/layout.tsx
- [ ] T032 [US1] Create access denied page at src/app/(dashboard)/[id]/access-denied/page.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - organizers can invite collaborators, collaborators can accept and access only their assigned modules

---

## Phase 4: User Story 2 - View and Manage Team Members (Priority: P2)

**Goal**: Enable organizers to see all team members, their permissions, and invitation statuses for team oversight and security auditing

**Independent Test**: Can be fully tested by viewing the team list showing all collaborators, their roles, permissions, and invitation status. Delivers value by providing team visibility and accountability.

### Implementation for User Story 2

#### Backend API

- [ ] T033 [P] [US2] Implement team.getMembers query with status filtering in src/server/api/routers/team.ts
- [ ] T034 [P] [US2] Implement team.getPendingInvitations query in src/server/api/routers/team.ts

#### Frontend Components

- [ ] T035 [P] [US2] Create TeamMemberList component in src/components/team/team-member-list.tsx
- [ ] T036 [P] [US2] Create TeamMemberCard component showing member details in src/components/team/team-member-card.tsx
- [ ] T037 [P] [US2] Create PendingInvitationsList component in src/components/team/pending-invitations-list.tsx
- [ ] T038 [P] [US2] Create RoleBadge component for displaying OWNER/COLLABORATOR badges in src/components/team/role-badge.tsx
- [ ] T039 [P] [US2] Create StatusBadge component for displaying PENDING/ACTIVE/REMOVED status in src/components/team/status-badge.tsx
- [ ] T040 [US2] Integrate TeamMemberList and PendingInvitationsList into team settings page src/app/(dashboard)/[id]/settings/team/page.tsx

#### Additional Features

- [ ] T041 [P] [US2] Implement team.resendInvitation procedure in src/server/api/routers/team.ts
- [ ] T042 [P] [US2] Implement team.cancelInvitation procedure in src/server/api/routers/team.ts
- [ ] T043 [US2] Add resend and cancel invitation actions to PendingInvitationsList component
- [ ] T044 [US2] Add filtering/sorting capabilities to TeamMemberList component for module access

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - full team visibility and invitation management

---

## Phase 5: User Story 3 - Modify Collaborator Permissions (Priority: P2)

**Goal**: Enable organizers to update collaborator module access as responsibilities change without requiring new invitations

**Independent Test**: Can be fully tested by changing an existing collaborator's permissions (e.g., adding SCHEDULE access to someone who previously only had CFP access) and verifying the changes take immediate effect. Delivers value through permission flexibility.

### Implementation for User Story 3

#### Backend API

- [ ] T045 [US3] Implement team.updatePermissions procedure in src/server/api/routers/team.ts
- [ ] T046 [US3] Implement email sending for permission changes (sends team-permission-changed.tsx) in updatePermissions procedure

#### Frontend Components

- [ ] T047 [P] [US3] Create EditPermissionsModal component in src/components/team/edit-permissions-modal.tsx
- [ ] T048 [US3] Add edit permissions action to TeamMemberCard component in src/components/team/team-member-card.tsx
- [ ] T049 [US3] Integrate EditPermissionsModal with team.updatePermissions mutation

#### Permission Change Handling

- [ ] T050 [US3] Implement optimistic updates for permission changes in EditPermissionsModal
- [ ] T051 [US3] Add error handling for permission changes during active sessions (403 errors with graceful redirect)
- [ ] T052 [US3] Add toast notifications for permission change confirmations across the application

**Checkpoint**: All permission modification workflows complete - organizers can dynamically adjust team member access

---

## Phase 6: User Story 4 - Remove Collaborator Access (Priority: P2)

**Goal**: Enable organizers to completely revoke collaborator access for security and access control

**Independent Test**: Can be fully tested by removing a collaborator and verifying they lose all access to the event. Delivers security value independently.

### Implementation for User Story 4

#### Backend API

- [ ] T053 [US4] Implement team.removeMember procedure in src/server/api/routers/team.ts
- [ ] T054 [US4] Implement email sending for access removal (sends team-access-removed.tsx) in removeMember procedure

#### Frontend Components

- [ ] T055 [P] [US4] Create RemoveMemberModal component with confirmation dialog in src/components/team/remove-member-modal.tsx
- [ ] T056 [US4] Add remove action to TeamMemberCard component in src/components/team/team-member-card.tsx
- [ ] T057 [US4] Integrate RemoveMemberModal with team.removeMember mutation

#### Access Revocation Enforcement

- [ ] T058 [US4] Add validation in teamProtectedProcedure middleware to block removed members from accessing any endpoints
- [ ] T059 [US4] Create removed-access notification page at src/app/(dashboard)/[id]/removed/page.tsx
- [ ] T060 [US4] Add automatic redirect to removed-access page when removed member attempts event access

**Checkpoint**: Complete access revocation system functional - security requirements met

---

## Phase 7: User Story 5 - Accept or Decline Invitation (Priority: P3)

**Goal**: Allow invited users to review invitation details and choose whether to accept or decline

**Independent Test**: Can be fully tested by sending an invitation and verifying the recipient can view details and either accept or decline. Delivers value through user choice and consent.

### Implementation for User Story 5

#### Backend API

- [ ] T061 [US5] Implement team.declineInvitation procedure in src/server/api/routers/team.ts
- [ ] T062 [US5] Implement email sending for declination (sends team-invitation-declined.tsx) in declineInvitation procedure

#### Frontend Components

- [ ] T063 [P] [US5] Update invitation acceptance page src/app/invitations/accept/page.tsx to show event details and modules
- [ ] T064 [P] [US5] Add decline button and confirmation dialog to invitation acceptance page
- [ ] T065 [US5] Integrate decline action with team.declineInvitation mutation
- [ ] T066 [US5] Create declined invitation confirmation page at src/app/invitations/declined/page.tsx
- [ ] T067 [US5] Update TeamMemberList to show declined status with option to re-invite

**Checkpoint**: Full invitation consent workflow complete - users can accept or decline invitations

---

## Phase 8: User Story 6 - Collaborator Self-Service Access Overview (Priority: P3)

**Goal**: Allow collaborators to understand their current access level across all events they're part of

**Independent Test**: Can be fully tested by logging in as a collaborator who is part of multiple events and verifying they can see a unified view of their permissions. Delivers value through improved user orientation.

### Implementation for User Story 6

#### Backend API

- [ ] T068 [US6] Implement team.getMyMemberships query to fetch all user's team memberships in src/server/api/routers/team.ts

#### Frontend Components

- [ ] T069 [P] [US6] Create user dashboard page at src/app/(dashboard)/my-teams/page.tsx
- [ ] T070 [P] [US6] Create MyTeamsList component showing all events user collaborates on in src/components/team/my-teams-list.tsx
- [ ] T071 [P] [US6] Create PermissionExplainer component describing module permissions in src/components/team/permission-explainer.tsx
- [ ] T072 [US6] Add navigation link to "My Teams" in main dashboard layout src/app/(dashboard)/layout.tsx
- [ ] T073 [US6] Integrate MyTeamsList with team.getMyMemberships query in my-teams page
- [ ] T074 [US6] Add permission highlights to team section showing user's own permissions in src/app/(dashboard)/[id]/settings/team/page.tsx

**Checkpoint**: Complete collaborator self-service experience - improved user understanding of their access

---

## Phase 9: Edge Cases & Error Handling

**Purpose**: Handle all documented edge cases and ensure robust error handling

### Edge Case: Invitation to Existing Collaborator

- [ ] T075 [P] Add validation in team.invite to check for existing active collaborator with same email in src/server/api/routers/team.ts
- [ ] T076 [P] Add validation to check for pending invitations with same email in team.invite procedure
- [ ] T077 Create error message component suggesting "modify existing permissions" in InviteCollaboratorForm

### Edge Case: Self-Invitation Attempt

- [ ] T078 [P] Add validation in team.invite to reject invitations to owner's own email in src/server/api/routers/team.ts
- [ ] T079 Add specific error message "Cannot invite yourself - you already own this event" to InviteCollaboratorForm

### Edge Case: Owner Self-Removal Attempt

- [ ] T080 [P] Add validation in team.removeMember to block owner from removing themselves in src/server/api/routers/team.ts
- [ ] T081 Add specific error message "Cannot remove yourself as owner. Transfer ownership to another user first" to RemoveMemberModal

### Edge Case: Expired Invitation Links

- [ ] T082 [P] Add expiry checking in team.acceptInvitation procedure in src/server/api/routers/team.ts
- [ ] T083 [P] Implement background job or cron to mark expired invitations (status PENDING -> EXPIRED) in src/lib/cron/expire-invitations.ts
- [ ] T084 Create expired invitation error page at src/app/invitations/expired/page.tsx
- [ ] T085 Update PendingInvitationsList to show expired invitations with resend option

### Edge Case: Disabled or Removed Module

- [ ] T086 Implement auto-revocation logic when module is disabled in event configuration (future: event settings changes)
- [ ] T087 Add silent permission cleanup without notifications for disabled modules

### Edge Case: Permission Revocation During Active Session

- [ ] T088 Add 403 error handling with grace period messaging across all module pages
- [ ] T089 Implement automatic redirect to accessible module when current module access is revoked
- [ ] T090 Add notification banner for permission changes during active session

**Checkpoint**: All edge cases handled - robust error handling complete

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final touches

### Performance Optimization

- [ ] T091 [P] Add database indexes for team member queries (eventId + status, eventId + userId) in prisma/schema.prisma
- [ ] T092 [P] Implement pagination for TeamMemberList when more than 20 members
- [ ] T093 [P] Add optimistic updates for all team mutations (invite, update, remove)
- [ ] T094 Implement query caching strategy for team.getMembers and team.getCurrentMember

### Accessibility & UX

- [ ] T095 [P] Add ARIA labels to all team management forms and modals
- [ ] T096 [P] Implement keyboard navigation for TeamMemberList and ModulePermissionsSelector
- [ ] T097 [P] Add loading states and skeleton screens for all team components
- [ ] T098 [P] Ensure mobile-responsive design for all team management pages
- [ ] T099 Add confirmation toasts for all successful actions (invite, update, remove, accept, decline)

### Documentation

- [ ] T100 [P] Update project documentation in docs/modules/team/ (create directory and README)
- [ ] T101 [P] Add API documentation comments to all team router procedures
- [ ] T102 [P] Create team collaboration user guide in docs/guides/team-collaboration.md
- [ ] T103 Update architecture documentation to include team collaboration in docs/architecture/system-overview.md

### Security & Validation

- [ ] T104 [P] Add rate limiting for team.invite (20 per hour) and team.resendInvitation (5 per hour)
- [ ] T105 [P] Implement audit logging for all team management actions
- [ ] T106 Add security headers and CSRF protection for invitation acceptance endpoints
- [ ] T107 Review and test all permission checks across existing module routers

### Final Quality Checks

- [ ] T108 Run ESLint and Prettier across all new files, ensure zero violations
- [ ] T109 Verify TypeScript strict mode compliance - no `any` types used
- [ ] T110 Run quickstart.md validation steps to ensure feature works end-to-end
- [ ] T111 Perform manual cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] T112 Validate all email templates render correctly in major email clients

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P2 → P3 → P3)
- **Edge Cases (Phase 9)**: Can start after respective user stories are complete
  - T075-T077 after US1 (Phase 3)
  - T078-T079 after US1 (Phase 3)
  - T080-T081 after US4 (Phase 6)
  - T082-T085 after US1 and US5 (Phases 3 & 7)
  - T086-T087 after US1 (Phase 3)
  - T088-T090 after US3 (Phase 5)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - **MVP COMPLETE POINT**
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 but independently testable
- **User Story 3 (P2)**: Can start after US1 and US2 complete - Requires existing team members to modify
- **User Story 4 (P2)**: Can start after US1 and US2 complete - Requires existing team members to remove
- **User Story 5 (P3)**: Can start after US1 complete - Extends invitation flow with decline option
- **User Story 6 (P3)**: Can start after US1 complete - Requires team memberships to exist

### Critical Path

```
Setup (Phase 1) → Foundational (Phase 2) → US1 (Phase 3) → [MVP READY]
                                         ↓
                                    US2 (Phase 4) → US3 (Phase 5) ⟍
                                         ↓                          ⟩ Edge Cases
                                    US2 (Phase 4) → US4 (Phase 6) ⟋
                                         ↓
                                    US5 (Phase 7)
                                         ↓
                                    US6 (Phase 8)
                                         ↓
                                    Polish (Phase 10)
```

### Parallel Opportunities Within Phases

#### Phase 1 - Setup (Parallel)
```
T003, T004 (different files)
```

#### Phase 2 - Foundational (High Parallelism)
```
Group A: T008, T009 (settings layout changes)
Group B: T011, T012, T013, T014, T015 (email templates)
Group C: T016 (components directory)
Group D: T010 (email utilities)
```

#### Phase 3 - User Story 1 (Backend + Frontend in Parallel)
```
Backend Group: T017, T018, T019, T020 (API procedures)
Frontend Group: T023, T024, T025, T026, T027 (UI components)
Then Sequential: T021, T022, T028, T029, T030, T031, T032 (integration)
```

#### Phase 4 - User Story 2 (High Parallelism)
```
Backend Group: T033, T034, T041, T042 (API procedures)
Frontend Group: T035, T036, T037, T038, T039 (UI components)
Then Sequential: T040, T043, T044 (integration)
```

#### Phase 5 - User Story 3
```
Parallel: T047 (modal component) while T045 (backend) progresses
Sequential: T046, T048, T049, T050, T051, T052 (integration & error handling)
```

#### Phase 6 - User Story 4
```
Parallel: T053, T054, T055 (backend + modal)
Sequential: T056, T057, T058, T059, T060 (integration & enforcement)
```

#### Phase 7 - User Story 5
```
Parallel: T061, T062, T063, T064 (backend + frontend)
Sequential: T065, T066, T067 (integration)
```

#### Phase 8 - User Story 6
```
Parallel: T068, T069, T070, T071 (backend + components)
Sequential: T072, T073, T074 (integration)
```

#### Phase 9 - Edge Cases (By Category)
```
Category A: T075, T076, T077 (existing collaborator)
Category B: T078, T079 (self-invitation)
Category C: T080, T081 (self-removal)
Category D: T082, T083, T084, T085 (expired invitations)
Category E: T086, T087 (disabled modules)
Category F: T088, T089, T090 (active session)
```

#### Phase 10 - Polish (High Parallelism)
```
Performance: T091, T092, T093, T094
Accessibility: T095, T096, T097, T098, T099
Documentation: T100, T101, T102, T103
Security: T104, T105, T106, T107
Final: T108, T109, T110, T111, T112 (sequential validation)
```

---

## Parallel Example: User Story 1 Implementation

### Step 1: Launch Backend API Development (Parallel)
```bash
Developer A: "Implement team.invite procedure with validation in src/server/api/routers/team.ts"
Developer B: "Implement team.acceptInvitation procedure in src/server/api/routers/team.ts"
Developer C: "Implement team.getCurrentMember query in src/server/api/routers/team.ts"
Developer D: "Add invitation token generation utility using crypto.randomBytes in src/lib/utils.ts"
```

### Step 2: Launch Frontend Components (Parallel, after backend basics ready)
```bash
Developer A: "Create team management page at src/app/(dashboard)/[id]/settings/team/page.tsx"
Developer B: "Create InviteCollaboratorForm component in src/components/team/invite-collaborator-form.tsx"
Developer C: "Create ModulePermissionsSelector component in src/components/team/module-permissions-selector.tsx"
Developer D: "Create invitation acceptance page at src/app/invitations/accept/page.tsx"
```

### Step 3: Integration (Sequential - requires both backend and frontend)
```bash
"Implement email sending for team.invite in team.ts invite procedure"
"Implement token verification and acceptance flow in invitation acceptance page"
"Add module permission checks to existing module routers"
"Add client-side permission gates to dashboard navigation"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - Recommended

1. **Week 1**: Complete Phase 1 (Setup) + Phase 2 (Foundational)
2. **Week 2-3**: Complete Phase 3 (User Story 1)
3. **STOP and VALIDATE**: 
   - Test invitation flow end-to-end
   - Verify module permissions work correctly
   - Validate email delivery
   - Test access control enforcement
4. **Deploy MVP**: Basic team collaboration is live and valuable

**MVP Delivers**:
- ✅ Organizers can invite collaborators
- ✅ Collaborators can accept invitations
- ✅ Module-level permission enforcement works
- ✅ Email notifications sent
- ✅ Access control prevents unauthorized module access

### Incremental Delivery (Recommended for Phased Rollout)

1. **Sprint 1**: Setup + Foundational → Foundation ready
2. **Sprint 2**: User Story 1 → Test independently → **Deploy MVP** 🎯
3. **Sprint 3**: User Story 2 → Team visibility added → Deploy
4. **Sprint 4**: User Story 3 + 4 → Permission management complete → Deploy
5. **Sprint 5**: User Story 5 + 6 → Full feature set → Deploy
6. **Sprint 6**: Edge Cases + Polish → Production hardening → Final deploy

Each sprint adds value without breaking previous functionality.

### Parallel Team Strategy (For Faster Delivery)

With 3-4 developers after Foundational phase complete:

**Team A (Backend Focus)**:
- User Story 1: Backend API (T017-T022)
- User Story 2: Backend API (T033-T034, T041-T042)
- User Story 3: Backend API (T045-T046)
- User Story 4: Backend API (T053-T054)

**Team B (Frontend Focus)**:
- User Story 1: UI Components (T023-T028)
- User Story 2: UI Components (T035-T040, T043-T044)
- User Story 3: UI Components (T047-T049)
- User Story 4: UI Components (T055-T057)

**Team C (Integration & Polish)**:
- User Story 1: Permission enforcement (T029-T032)
- User Story 2: Feature integration
- Edge Cases: All error handling and edge case implementation
- Polish: Performance, accessibility, documentation

**Timeline**: ~4-6 weeks to complete all user stories with parallel development

---

## Task Summary

- **Total Tasks**: 112
- **Setup (Phase 1)**: 4 tasks
- **Foundational (Phase 2)**: 12 tasks (blocks all stories)
- **User Story 1 (P1)**: 16 tasks - MVP
- **User Story 2 (P2)**: 12 tasks
- **User Story 3 (P2)**: 8 tasks
- **User Story 4 (P2)**: 8 tasks
- **User Story 5 (P3)**: 7 tasks
- **User Story 6 (P3)**: 7 tasks
- **Edge Cases**: 16 tasks
- **Polish**: 22 tasks

### Parallel Opportunities Identified

- **Phase 1**: 2 parallel tasks
- **Phase 2**: ~8 parallel tasks (email templates, components)
- **Phase 3 (US1)**: ~7 parallel tasks (backend + frontend groups)
- **Phase 4 (US2)**: ~9 parallel tasks (backend + frontend groups)
- **Phase 5-8**: ~2-4 parallel tasks per story
- **Phase 9**: ~6 categories can run in parallel
- **Phase 10**: ~17 parallel tasks (performance, accessibility, docs, security)

**Total Parallel Opportunities**: ~50+ tasks can run concurrently with proper team structure

### Independent Test Criteria Per Story

- **US1**: Invite user with CFP+ATTENDEES permissions → User accepts → Can access only CFP and ATTENDEES modules → Cannot access other modules
- **US2**: View team list → Shows all members with correct roles and permissions → Pending invitations visible → Can resend/cancel invitations
- **US3**: Edit existing collaborator permissions → Add SCHEDULE module → Changes take effect immediately → User can now access SCHEDULE
- **US4**: Remove collaborator → Collaborator loses all event access → Receives removal notification email
- **US5**: Receive invitation email → Click link → View event details → Decline invitation → Organizer notified of decline
- **US6**: Login as collaborator → Navigate to "My Teams" → See all events with permission breakdown → Understand access level

### Suggested MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 (User Story 1 only)**

This delivers:
- Core invitation and acceptance workflow
- Module-level permission enforcement
- Email notifications
- Basic access control

Total: **32 tasks** for working MVP (Setup + Foundational + US1)

Estimated timeline: **2-3 weeks** for small team

---

## Notes

- All tasks follow strict checkbox format: `- [ ] [ID] [P?] [Story?] Description with file path`
- [P] tasks target different files and can run in parallel
- [Story] label (US1-US6) maps tasks to user stories for traceability
- Each user story is independently completable and testable
- Tests were NOT included as not explicitly requested in feature specification
- Stop at any checkpoint to validate story independently
- Edge cases are handled in Phase 9 after core stories complete
- Constitution compliance enforced throughout (TypeScript strict, ESLint/Prettier, accessibility, performance)

---

**Format Validation**: ✅ All 112 tasks follow required checklist format
- ✅ All tasks start with `- [ ]` (checkbox)
- ✅ All tasks have Task ID (T001-T112)
- ✅ User story tasks have [Story] label (US1-US6)
- ✅ Parallelizable tasks have [P] marker
- ✅ All tasks include file paths where applicable

**Status**: ✅ Tasks Generation Complete  
**Next**: Begin implementation starting with Phase 1 (Setup)

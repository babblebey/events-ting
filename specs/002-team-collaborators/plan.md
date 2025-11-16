# Implementation Plan: Event Team Collaborators & Permissions

**Branch**: `002-team-collaborators` | **Date**: November 16, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-team-collaborators/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement team collaboration system allowing event organizers to invite collaborators with granular module-level permissions (CFP, Attendees, Schedule, etc.). System enforces single owner model with configurable access control, invitation lifecycle management (pending/active/declined/expired), and proper handling of permission changes during active sessions.

## Technical Context

**Language/Version**: TypeScript 5.8+ (ES2022 target)
**Primary Dependencies**: Next.js 15.2+, tRPC 11.0+, NextAuth.js 5.0 (beta), Prisma 6.6+, Zod 3.24+, Flowbite React 0.12+, React Email
**Storage**: PostgreSQL via Prisma ORM
**Testing**: Integration tests (priority), contract tests (tRPC/Prisma), unit tests for complex logic
**Target Platform**: Web (Next.js App Router with React Server Components)
**Project Type**: Web application (frontend + backend integrated via Next.js)
**Performance Goals**: Team list loads in <2s for 50 members, permission changes take effect in <30s
**Constraints**: Module permissions are binary (full access or none), 7-day invitation expiry, grace period for permission revocation
**Scale/Scope**: Support 20+ active collaborators per event, 8 module types, 5 invitation states

**Existing Patterns Identified**:
- Settings pages use single `page.tsx` under `[id]/settings/` route (no layout or submenu exists yet)
- Dashboard routes follow `(dashboard)/[id]/[module]/page.tsx` structure
- Routers exist: `attendees.ts`, `cfp.ts`, `communication.ts`, `event.ts`, `registration.ts`, `schedule.ts`, `speaker.ts`, `ticket.ts`, `user.ts`
- Module names: Attendees, CFP, Communications, Schedule, Speakers, Tickets (matches feature requirements)
- Email templates in `/emails/` use React Email components
- Components organized by feature in `src/components/[feature]/`
- File naming: kebab-case for files, PascalCase for components
- Import alias: `~/*` maps to `src/*` (some files use `@/*` alias)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with **events-ting Constitution v1.0.0**:

- [x] **TypeScript Type Safety**: Strict mode enabled in tsconfig.json, will use Zod for validation, type imports via `import { type X }`
- [x] **Code Quality**: ESLint + Prettier configured (checked package.json), will maintain zero violations
- [x] **Testing Standards**: Will define integration tests for user stories (invitation flow, permission changes), contract tests for tRPC procedures
- [x] **Next.js App Router**: Will use Server Components for settings layout, Client Components for interactive forms, proper route structure under `[id]/settings/team`
- [x] **tRPC Standards**: All API operations via tRPC routers (team.ts), Zod validation for inputs, proper error handling with tRPC error codes
- [x] **UX Consistency**: Will use Flowbite React components, Tailwind CSS, maintain accessibility (ARIA labels, semantic HTML), loading states for async operations
- [x] **Performance**: Team list pagination for >20 members, optimistic updates for permission changes, indexed database queries
- [x] **Tech Stack Compliance**: Using approved stack (Prisma, tRPC, Next.js), following Prisma naming conventions (PascalCase models, camelCase fields)
- [x] **Complexity Justification**: No violations anticipated - feature aligns with existing patterns (similar to event management, speaker management)

**Status**: ✅ PASSED - No constitution violations. Feature follows established patterns.

## Project Structure

### Documentation (this feature)

```text
specs/002-team-collaborators/
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
│   └── (dashboard)/
│       └── [id]/
│           └── settings/
│               ├── page.tsx              # General settings (existing, to be updated)
│               ├── layout.tsx            # Settings submenu layout (new)
│               ├── general/
│               │   └── page.tsx          # General settings content (moved from parent)
│               └── team/
│                   ├── page.tsx          # Team management page
│                   └── loading.tsx       # Loading state
├── components/
│   └── team/
│       ├── team-member-list.tsx          # List of team members
│       ├── team-member-card.tsx          # Individual member card
│       ├── invite-collaborator-form.tsx  # Invitation form
│       ├── edit-permissions-modal.tsx    # Permission editor
│       ├── remove-member-modal.tsx       # Removal confirmation
│       └── module-permissions-selector.tsx  # Checkbox list for modules
├── server/
│   ├── api/
│   │   └── routers/
│   │       └── team.ts                   # Team management tRPC router
│   └── services/
│       └── team-service.ts               # Business logic (optional)
├── lib/
│   └── validators.ts                     # Add team-related Zod schemas
└── prisma/
    └── schema.prisma                     # Add TeamMember, ModulePermission models

tests/
├── integration/
│   └── team-collaboration.test.ts        # End-to-end invitation & permission flows
└── contract/
    └── team-router.test.ts               # tRPC contract tests

emails/
├── team-invitation.tsx                   # Invitation email template
├── team-invitation-accepted.tsx          # Acceptance notification
├── team-invitation-declined.tsx          # Decline notification
├── team-permission-changed.tsx           # Permission change notification
└── team-access-removed.tsx               # Removal notification
```

**Structure Decision**: Web application structure with integrated frontend/backend via Next.js App Router. Feature organized under existing `[id]/settings/` route with new submenu navigation. Components follow established kebab-case naming, routers follow domain-based organization.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations** - Constitution Check passed without exceptions.

## Phase 0: Outline & Research

**Status**: ✅ COMPLETED

**Output**: `research.md` created with design decisions

**Summary**:
- Researched role-based access control patterns (role hierarchy, granular permissions)
- Evaluated invitation lifecycle management (token-based, stateful workflow)
- Investigated permission enforcement strategies (middleware, decorator pattern)
- Documented UI patterns for settings navigation (sidebar submenu, nested routes)
- Selected technologies and patterns consistent with existing codebase

All unknowns from Technical Context resolved. See `research.md` for detailed rationale.

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETED

**Outputs**:
- ✅ `data-model.md` - Database schema design (EventCollaborator, CollaboratorInvitation)
- ✅ `contracts/api.yaml` - OpenAPI specification for tRPC endpoints
- ✅ `contracts/events.yaml` - Domain event specifications
- ✅ `quickstart.md` - Implementation guide for developers
- ✅ Agent context updated (`.github/copilot-instructions.md`)

**Summary**:
- Designed EventCollaborator and CollaboratorInvitation models with proper relationships
- Defined 8 tRPC procedures for full collaboration lifecycle
- Specified email templates and notification events
- Created step-by-step quickstart guide following existing project patterns
- Updated GitHub Copilot context with tech stack information

**Constitution Re-Check**: ✅ PASSED - Design adheres to all constitution requirements.

## Phase 2: Task Breakdown

**Status**: ⏸️ NOT STARTED (Per instructions: "Command ends after Phase 2 planning")

**Next Command**: Run `/speckit.tasks` to generate `tasks.md` with granular implementation tasks.

````

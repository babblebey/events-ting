<!--
=============================================================================
SYNC IMPACT REPORT - Constitution Update
=============================================================================
Version Change: [NEW] → 1.0.0
Ratification Date: 2025-11-08
Last Amendment Date: 2025-11-08

Modified Principles:
  - NEW: TypeScript Type Safety & Standards
  - NEW: Code Quality & Linting
  - NEW: Testing Standards
  - NEW: Next.js 15+ App Router Best Practices
  - NEW: tRPC API Standards
  - NEW: User Experience Consistency
  - NEW: Performance Requirements

Added Sections:
  - Core Principles (7 principles)
  - Technical Standards
  - Development Workflow

Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section validated
  ✅ spec-template.md - Requirements alignment verified
  ✅ tasks-template.md - Task categorization aligned with principles

Follow-up Actions:
  - None: All principles defined and templates aligned

=============================================================================
-->

# events-ting Constitution

## Core Principles

### I. TypeScript Type Safety & Standards (NON-NEGOTIABLE)

**Strict Mode Always**: All TypeScript code MUST operate with `strict: true`, `noUncheckedIndexedAccess: true`, and `checkJs: true` enabled. No exceptions.

**Type Inference Over Explicit Types**: Prefer TypeScript's inference where unambiguous. Explicit types are REQUIRED for:
- Public API boundaries (exported functions, components)
- Complex type transformations
- When inference produces `any` or overly broad types

**No `any` or Type Assertions**: Use of `any` or `as` type assertions is PROHIBITED except:
- Third-party library boundaries with missing types (must be documented with TODO)
- Type guards that have been validated with runtime checks

**Import Organization**: Consistent type imports using `type` keyword: `import { type MyType } from './types'`. Auto-fixable via ESLint rule `@typescript-eslint/consistent-type-imports`.

**Rationale**: Type safety prevents runtime errors, improves refactoring confidence, enables better IDE support, and serves as living documentation. The events management domain requires data integrity across complex workflows (registrations, schedules, tickets)—strong typing catches errors at compile time.

### II. Code Quality & Linting

**Zero ESLint Violations**: All code MUST pass `next lint` and `tsc --noEmit` without errors or warnings before commit.

**Enabled Ruleset**:
- Next.js core-web-vitals rules
- TypeScript ESLint recommended + stylistic
- Custom rules: unused vars prefixed with `_`, consistent type imports, void return checks for async handlers

**Auto-formatting Required**: Prettier MUST be run before commit. Configuration: Tailwind CSS plugin enabled, 100-character line length, no trailing whitespace.

**Rationale**: Consistent code style reduces cognitive load, prevents bugs, and eliminates style debates in code review. The project uses automated tooling—human effort should focus on logic, not formatting.

### III. Testing Standards

**Test Independence**: Each user story/feature MUST be independently testable. Tests validate the story's acceptance criteria in isolation.

**Test Coverage Priority** (in order):
1. **Integration Tests**: Critical user journeys (authentication flow, event creation, ticket purchase)
2. **Contract Tests**: tRPC procedure contracts and database schema validation
3. **Unit Tests**: Business logic in services and utilities (only when complex algorithms exist)

**Test-First Optional**: Tests are REQUIRED for all features, but TDD is recommended, not mandatory. Tests MUST exist before code review approval.

**Test Location**: Tests reside in `tests/` at repository root with structure mirroring `src/`:
- `tests/integration/` - Full user journeys
- `tests/contract/` - API and database contracts
- `tests/unit/` - Isolated logic (utilities, helpers)

**Rationale**: Events management involves complex state (attendee status, schedule conflicts, payment processing). Integration tests ensure workflows function end-to-end. Test independence enables incremental feature delivery and parallel development.

### IV. Next.js 15+ App Router Best Practices

**Server Components First**: Use React Server Components (RSC) by default. Client components (`'use client'`) only when:
- User interaction requires state/effects (forms, modals, interactive UI)
- Browser APIs needed (localStorage, geolocation)
- Third-party client-only libraries

**File-based Routing**: Follow App Router conventions:
- `page.tsx` for routes
- `layout.tsx` for nested layouts
- `route.ts` for API routes (avoid mixing with tRPC when possible)
- Route groups `(group-name)` for organization without URL segments

**Data Fetching Patterns**:
- Server Components: Direct database queries via Prisma or tRPC server calls
- Client Components: tRPC React Query hooks (`api.post.getAll.useQuery()`)
- Streaming with `<Suspense>` boundaries for slow queries

**Metadata API**: Use Next.js `metadata` export for SEO, not manual `<head>` manipulation.

**Rationale**: App Router improves performance through automatic code splitting, streaming, and reduced client-side JavaScript. Server components reduce bundle size and improve initial page load—critical for public event pages accessed by attendees with varying network conditions.

### V. tRPC API Standards

**Type-Safe API Only**: All client-server communication MUST use tRPC procedures. No REST endpoints except for:
- Webhooks from third-party services (e.g., payment providers)
- Public APIs consumed by external clients (document separately)

**Procedure Organization**:
- Routers in `src/server/api/routers/` organized by domain (e.g., `events.ts`, `tickets.ts`, `users.ts`)
- Root router in `src/server/api/root.ts` combines all routers
- Naming convention: `resource.action` (e.g., `event.create`, `ticket.purchase`, `attendee.list`)

**Input Validation**: Zod schemas REQUIRED for all procedure inputs. Validation failures return structured errors, not generic 500s.

**Mutation Conventions**:
- Mutating procedures return updated entity or success status
- Optimistic updates in client when UX demands immediate feedback
- `ctx.db` transaction wrapping for multi-entity mutations

**Error Handling**: Use tRPC error codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR`. Include actionable error messages for client display.

**Rationale**: tRPC eliminates API contract drift—client and server share types automatically. Zod validation ensures data integrity at the API boundary. This reduces bugs from malformed requests and provides excellent DX through autocomplete and type safety.

### VI. User Experience Consistency

**Design System**: Use Flowbite React components as base. Customize via Tailwind CSS v4 configuration. No inline style objects except dynamic values computed at runtime.

**Accessibility Requirements**:
- Semantic HTML (proper heading hierarchy, landmark regions)
- ARIA labels for interactive elements when text insufficient
- Keyboard navigation for all interactive features
- Color contrast ratios meet WCAG AA minimum (4.5:1 for text)

**Loading States**: Every async operation MUST show feedback:
- Skeleton loaders for content placeholders
- Spinner for actions (button loading states)
- `<Suspense>` fallbacks for streaming RSC data
- Error boundaries for catastrophic failures

**Mobile-First Responsive Design**: Layouts MUST function on mobile (375px) before desktop. Test breakpoints: mobile (640px), tablet (768px), desktop (1024px, 1280px).

**Rationale**: Consistent UX reduces cognitive friction—users learn patterns once, apply everywhere. Events platforms serve diverse audiences (organizers on desktop, attendees on mobile). Accessibility is legally required in many jurisdictions and ethically mandatory.

### VII. Performance Requirements

**Core Web Vitals Targets**:
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

**Page Load Budget**:
- JavaScript bundle: < 200KB gzipped per route
- Initial page load: < 3s on 3G connection
- Time to Interactive: < 5s

**Optimization Strategies**:
- Image optimization via Next.js `<Image>` component (automatic WebP, lazy loading, responsive srcsets)
- Font optimization: Geist font self-hosted, preloaded, subset to Latin
- Code splitting: Dynamic imports for non-critical components (modals, heavy visualizations)
- Database query optimization: Use Prisma query analysis, add indexes for common queries

**Monitoring**: Track Core Web Vitals in production. Performance regressions > 10% trigger investigation.

**Rationale**: Performance is UX. Slow pages lose users—especially on mobile networks. Events platforms handle high-concurrency scenarios (ticket sales for popular events, last-minute schedule checks). Fast load times reduce bounce rate and improve conversion.

## Technical Standards

### Technology Stack (Locked)

- **Framework**: Next.js 15.2+ (App Router only)
- **Language**: TypeScript 5.8+ (ES2022 target)
- **Runtime**: Node.js (version per `.nvmrc` or package.json `engines`)
- **Database**: PostgreSQL via Prisma 6.6+
- **Styling**: Tailwind CSS 4.0+ with Flowbite React 0.12+
- **API Layer**: tRPC 11.0+
- **Authentication**: NextAuth.js 5.0 (beta) with Prisma adapter
- **Package Manager**: pnpm 10.20+

**Justification for Locked Stack**: Events-ting is built on the T3 Stack. Consistency enables better tooling, shared knowledge, and community support. Deviations require architectural review and documented rationale.

### Dependency Management

**New Dependencies**: Require justification before adding. Ask:
1. Does existing stack solve this? (e.g., don't add Axios when tRPC suffices)
2. Maintenance health: last updated < 6 months, not archived, active community
3. Bundle size impact: < 50KB gzipped unless critical feature

**Version Pinning**: Use exact versions for production dependencies, ranges for dev dependencies. Update dependencies quarterly or when security vulnerabilities published.

### Database Schema Standards

**Prisma Conventions**:
- Model names: PascalCase singular (e.g., `Event`, `Ticket`, not `events`)
- Field names: camelCase (e.g., `createdAt`, `userId`)
- Required fields: Non-nullable unless business logic demands optional
- Timestamps: `createdAt` and `updatedAt` on all models (Prisma auto-manages)

**Migrations**: Use Prisma Migrate for schema changes. Never edit generated migration files—roll forward if mistakes occur.

**Foreign Keys**: Explicitly define relations. Use cascading deletes cautiously (document business justification).

## Development Workflow

### Branch Strategy

- **Main branch**: Production-ready code. Protected, requires PR approval.
- **Feature branches**: `<issue-number>-feature-name` (e.g., `42-add-ticket-refunds`)
- **Bugfix branches**: `<issue-number>-bugfix-description` (e.g., `89-fix-timezone-display`)

### Commit Conventions

Use Conventional Commits format:
- `feat: add ticket refund functionality`
- `fix: correct timezone display in event schedule`
- `docs: update API documentation for tRPC procedures`
- `chore: upgrade dependencies to latest stable`
- `test: add integration tests for payment flow`

Commit atomically—each commit should compile and pass tests.

### Pull Request Process

1. **Pre-submit Checklist**:
   - `pnpm run check` passes (lint + typecheck)
   - `pnpm run format:check` passes (or run `format:write`)
   - Tests added for new features or bug fixes
   - Database migrations generated if schema changed

2. **PR Description**: Link to issue, summarize changes, note breaking changes or migration steps.

3. **Review Requirements**:
   - One approval from team member
   - All CI checks pass (linting, type checking, tests)
   - No unresolved conversations

4. **Constitution Compliance**: Reviewer verifies adherence to principles (type safety, testing, performance).

### Quality Gates

**Pre-commit**: Format code automatically (Husky hook or IDE auto-save, configuration TBD).

**Pre-push**: Run `pnpm run check` (lint + typecheck). Failing code cannot be pushed.

**CI Pipeline** (on PR):
1. Install dependencies (`pnpm install`)
2. Run linter (`pnpm run lint`)
3. Run type checker (`pnpm run typecheck`)
4. Run tests (`pnpm test` when test suite exists)
5. Build application (`pnpm run build`)

**Deployment Gate**: Main branch auto-deploys to staging. Production deployment requires manual approval after staging validation.

## Governance

### Amendment Process

1. **Propose Change**: Submit PR modifying this constitution file with rationale in description.
2. **Team Review**: Discuss trade-offs, impact on existing code, migration plan.
3. **Version Bump**: Update `CONSTITUTION_VERSION` per semantic versioning:
   - **MAJOR**: Remove/redefine principle, breaking governance change (e.g., drop type safety requirement)
   - **MINOR**: Add principle or materially expand guidance (e.g., add new testing requirement)
   - **PATCH**: Clarify wording, fix typos, refine existing rules without semantic change
4. **Update Timestamp**: Set `LAST_AMENDED_DATE` to amendment date (ISO 8601 format: YYYY-MM-DD).
5. **Propagate Changes**: Update `.specify/templates/` files if constitution change affects plan structure, task categories, or spec requirements. Document updates in Sync Impact Report (HTML comment at top of file).

### Compliance

- **Code Reviews**: Reviewers MUST verify constitution adherence. Violations block merge unless justified and documented in PR.
- **Retrospectives**: Quarterly review of constitution effectiveness. If principles consistently violated or ignored, principle requires revision or removal.
- **Complexity Justification**: If feature requires violating principle (e.g., performance demands relaxing type safety in hot path), document in `plan.md` Complexity Tracking table.

### Living Document Philosophy

This constitution guides, not dictates. When reality conflicts with principles:
1. Understand why (technical constraint, business priority, team capacity)
2. Decide: Accept deviation temporarily, or amend constitution
3. Document decision and rationale

Prefer amending constitution over silent violations—explicit trade-offs beat implicit drift.

---

**Version**: 1.0.0 | **Ratified**: 2025-11-08 | **Last Amended**: 2025-11-08

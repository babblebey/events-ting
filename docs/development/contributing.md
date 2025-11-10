# Contributing to Events-Ting

Thank you for your interest in contributing to Events-Ting! This guide will help you get started with contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request Process](#pull-request-process)
- [Documentation Requirements](#documentation-requirements)
- [Testing Requirements](#testing-requirements)
- [Review Process](#review-process)

---

## Code of Conduct

### Our Standards

- **Be respectful**: Treat everyone with respect and kindness
- **Be constructive**: Provide helpful feedback and suggestions
- **Be collaborative**: Work together to improve the project
- **Be inclusive**: Welcome contributors of all skill levels

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling or insulting remarks
- Publishing others' private information
- Any conduct inappropriate in a professional setting

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. ✅ Completed the [Development Setup](./setup.md)
2. ✅ Read the [Architecture Documentation](../architecture/system-overview.md)
3. ✅ Familiarized yourself with the codebase structure
4. ✅ Reviewed existing issues and PRs

---

### Finding Issues to Work On

**Good First Issues**: Look for issues labeled `good first issue`

**Help Wanted**: Issues labeled `help wanted` need contributors

**Browse by Module**:
- `module: events`
- `module: registration`
- `module: cfp`
- `module: schedule`

**Before starting**:
1. Comment on the issue to claim it
2. Wait for maintainer acknowledgment
3. Ask questions if requirements are unclear

---

## Development Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/events-ting.git
cd events-ting

# Add upstream remote
git remote add upstream https://github.com/babblebey/events-ting.git
```

---

### 2. Create a Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feat/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

**Branch naming conventions**:
- `feat/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation updates
- `refactor/what-changed` - Code refactoring
- `test/what-added` - Test additions
- `chore/what-changed` - Build/tooling changes

---

### 3. Make Changes

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Make your changes
# ...

# Run linter
pnpm lint

# Fix linting issues
pnpm lint --fix

# Format code
pnpm format
```

---

### 4. Test Your Changes

```bash
# Run type check
pnpm type-check

# Test database migrations (if schema changed)
pnpm prisma migrate dev

# Run tests (when available)
pnpm test

# Test in browser
# Navigate to http://localhost:3000
```

---

### 5. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat: add email validation to registration form"
```

See [Commit Message Conventions](#commit-message-conventions) below.

---

### 6. Push and Create PR

```bash
# Push to your fork
git push origin feat/your-feature-name

# Create pull request on GitHub
```

---

## Code Style Guidelines

### TypeScript

#### General Rules

```typescript
// ✅ DO: Use explicit types for function parameters
function createEvent(name: string, date: Date): Event {
  // ...
}

// ❌ DON'T: Use 'any' type
function createEvent(data: any) {
  // ...
}

// ✅ DO: Use type inference for simple variables
const eventName = "Tech Conference"; // string inferred

// ✅ DO: Define interfaces for complex objects
interface EventFormData {
  name: string;
  location: string;
  startDate: Date;
  endDate: Date;
}
```

---

#### Naming Conventions

```typescript
// PascalCase for types, interfaces, components
interface EventData {}
type TicketStatus = "ACTIVE" | "SOLD_OUT";
function EventCard() {}

// camelCase for variables, functions
const eventList = [];
function getEventById() {}

// SCREAMING_SNAKE_CASE for constants
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const API_BASE_URL = "https://api.example.com";

// kebab-case for file names
// event-card.tsx
// registration-form.tsx
```

---

### React Components

```typescript
// ✅ DO: Use functional components
export function EventCard({ event }: { event: Event }) {
  return <div>{event.name}</div>;
}

// ✅ DO: Use TypeScript interfaces for props
interface EventCardProps {
  event: Event;
  onEdit?: (id: string) => void;
  className?: string;
}

export function EventCard({ event, onEdit, className }: EventCardProps) {
  return (
    <div className={className}>
      {event.name}
      {onEdit && <button onClick={() => onEdit(event.id)}>Edit</button>}
    </div>
  );
}

// ✅ DO: Use React hooks appropriately
function EventList() {
  const [events, setEvents] = useState<Event[]>([]);
  
  useEffect(() => {
    fetchEvents().then(setEvents);
  }, []);
  
  return <div>{/* ... */}</div>;
}
```

---

### tRPC Procedures

```typescript
// ✅ DO: Validate input with Zod
export const eventRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        slug: z.string().regex(/^[a-z0-9-]+$/),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Business logic
      return await ctx.db.event.create({ data: input });
    }),
});

// ✅ DO: Use descriptive procedure names
getById, listByOrganizer, publish, archive

// ❌ DON'T: Use generic names
get, list, update
```

---

### Database Queries (Prisma)

```typescript
// ✅ DO: Use select to minimize data transfer
const event = await ctx.db.event.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    slug: true,
    // Only fields you need
  },
});

// ✅ DO: Use include for relations
const event = await ctx.db.event.findUnique({
  where: { id },
  include: {
    ticketTypes: true,
    registrations: {
      where: { status: "CONFIRMED" },
    },
  },
});

// ✅ DO: Use transactions for atomic operations
await ctx.db.$transaction(async (tx) => {
  const ticket = await tx.ticketType.update({
    where: { id: ticketTypeId },
    data: { quantity: { decrement: 1 } },
  });
  
  const registration = await tx.registration.create({
    data: { /* ... */ },
  });
  
  return registration;
});
```

---

### CSS and Styling

```typescript
// ✅ DO: Use Tailwind utility classes
<div className="flex items-center gap-4 rounded-lg bg-gray-100 p-4">
  <span className="text-lg font-semibold">Event Name</span>
</div>

// ✅ DO: Use Flowbite components when available
import { Button, Card, Badge } from 'flowbite-react';

<Card>
  <h3>Event Title</h3>
  <Badge color="success">Published</Badge>
  <Button onClick={handleClick}>Register</Button>
</Card>

// ✅ DO: Extract complex className logic
const cardClasses = clsx(
  'rounded-lg p-4',
  isActive && 'bg-blue-100',
  !isActive && 'bg-gray-100'
);

<div className={cardClasses}>Content</div>
```

---

## Commit Message Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature/fix)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, tooling

### Scopes (Optional)

- `events`: Event management
- `registration`: Registration module
- `cfp`: Call for Papers
- `schedule`: Schedule management
- `speakers`: Speaker management
- `tickets`: Ticket management
- `communications`: Email campaigns
- `auth`: Authentication
- `db`: Database/Prisma changes

### Examples

```bash
# Feature
git commit -m "feat(registration): add email validation to registration form"

# Bug fix
git commit -m "fix(events): correct timezone handling in date picker"

# Documentation
git commit -m "docs(api): update tRPC router documentation"

# Refactor
git commit -m "refactor(schedule): extract overlap detection to utility function"

# With body
git commit -m "feat(cfp): add speaker auto-creation on acceptance

When a CFP submission is accepted, automatically create a speaker
profile with the submission details. This eliminates manual data entry
for organizers.

Closes #123"
```

---

## Pull Request Process

### Before Creating a PR

- [ ] Code follows style guidelines
- [ ] All tests pass (when available)
- [ ] Lint and type-check pass
- [ ] Database migrations created (if schema changed)
- [ ] Documentation updated (if needed)
- [ ] Self-review completed

---

### PR Title and Description

**Title Format**: Same as commit messages
```
feat(registration): add email validation
fix(events): correct timezone handling
docs(api): update router documentation
```

**Description Template**:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123
Fixes #456

## Changes Made
- Added email validation to registration form
- Updated validation schema
- Added error messages

## Testing
- [ ] Tested locally
- [ ] Tested edge cases
- [ ] Tested on different browsers (if UI change)

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes (or documented)
```

---

### PR Review Process

1. **Automated Checks**: CI/CD runs linting, type-check, tests
2. **Maintainer Review**: Code review by project maintainers
3. **Requested Changes**: Address feedback and update PR
4. **Approval**: PR approved by maintainer
5. **Merge**: Maintainer merges PR to main branch

---

### Responding to Feedback

```bash
# Make changes based on feedback
# ...

# Commit changes
git add .
git commit -m "refactor: address PR feedback"

# Push to update PR
git push origin feat/your-feature-name
```

**Be respectful and collaborative** when discussing feedback.

---

## Documentation Requirements

### When to Update Documentation

Update documentation when:
- Adding new features
- Changing existing functionality
- Modifying API endpoints
- Updating database schema
- Adding new environment variables

---

### Documentation Locations

**Module Documentation**: `docs/modules/<module>/`
- Update `backend.md` for API changes
- Update `frontend.md` for UI changes
- Update `data-model.md` for schema changes
- Update `workflows.md` for process changes

**API Documentation**: `docs/api/`
- Update `routers.md` for new procedures

**Deployment**: `docs/deployment/`
- Update if deployment process changes

**Architecture**: `docs/architecture/`
- Update if system design changes

---

### Code Comments

```typescript
// ✅ DO: Comment complex logic
// Calculate available tickets considering pending reservations
// that expire within the next 15 minutes
const availableTickets = totalQuantity - confirmedRegistrations - 
  pendingReservations.filter(r => r.expiresAt > new Date(Date.now() + 15 * 60000)).length;

// ✅ DO: Document function purpose
/**
 * Checks if a ticket type is available for registration
 * @param ticketTypeId - ID of the ticket type
 * @returns true if tickets are available, false otherwise
 */
async function isTicketAvailable(ticketTypeId: string): Promise<boolean> {
  // ...
}

// ❌ DON'T: State the obvious
// Increment counter
counter++;
```

---

## Testing Requirements

### Test Coverage (Future)

When tests are implemented:
- Write tests for new features
- Update tests for modified features
- Aim for 80%+ unit test coverage
- Include integration tests for API routes
- Add E2E tests for critical flows

### Test Examples

See [Testing Guide](./testing.md) for detailed examples.

---

## Review Checklist

Before submitting PR, verify:

### Code Quality
- [ ] Follows TypeScript best practices
- [ ] Uses consistent naming conventions
- [ ] No unused imports or variables
- [ ] No console.logs in production code
- [ ] Error handling implemented
- [ ] Input validation added

### Functionality
- [ ] Feature works as expected
- [ ] Edge cases handled
- [ ] No breaking changes (or documented)
- [ ] Backwards compatible (when possible)

### Performance
- [ ] No N+1 query problems
- [ ] Database queries optimized
- [ ] Unnecessary re-renders avoided
- [ ] Images optimized (if added)

### Security
- [ ] User input sanitized
- [ ] Authentication checked (protected routes)
- [ ] Authorization verified (ownership checks)
- [ ] No sensitive data exposed
- [ ] Environment variables used for secrets

### Documentation
- [ ] Code comments added where needed
- [ ] API documentation updated
- [ ] README updated (if needed)
- [ ] Migration guide added (if breaking change)

---

## Release Process

Maintainers handle releases:

1. **Version Bump**: Update `package.json`
2. **Changelog**: Update `CHANGELOG.md`
3. **Tag**: Create git tag
4. **Deploy**: Deploy to production
5. **GitHub Release**: Create release notes

---

## Getting Help

### Resources

- **Documentation**: Browse `docs/` directory
- **Examples**: Study existing code in the project
- **Issues**: Ask questions in issue comments
- **Discussions**: Use GitHub Discussions for general questions

### Asking Questions

When asking for help:
1. Describe what you're trying to achieve
2. Share relevant code snippets
3. Include error messages
4. Mention what you've already tried

---

## Recognition

Contributors are recognized in:
- GitHub contributor list
- Release notes (for significant contributions)
- README.md (for major features)

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

## Thank You!

Your contributions make Events-Ting better for everyone. We appreciate your time and effort! 🎉

---

## Related Documentation

- [Development Setup](./setup.md) - Set up local environment
- [Database Migrations](./database-migrations.md) - Prisma workflow
- [Testing Guide](./testing.md) - Testing strategy
- [Architecture Overview](../architecture/system-overview.md) - System design

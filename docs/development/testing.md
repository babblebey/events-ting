# Testing Strategy

This document outlines the testing approach for Events-Ting. **Note**: Comprehensive testing is planned for future implementation.

---

## Overview

Events-Ting will implement a multi-layered testing strategy to ensure code quality, reliability, and maintainability.

### Testing Pyramid

```
        ╱╲
       ╱E2E╲         <- End-to-End Tests (Fewest, Slowest)
      ╱─────╲
     ╱Integration╲   <- Integration Tests (Moderate)
    ╱───────────╲
   ╱ Unit Tests ╲   <- Unit Tests (Most, Fastest)
  ╱─────────────╲
```

---

## Current Status

**Status**: ⏳ **Not Yet Implemented**

### What Exists
- ESLint configuration for code quality
- TypeScript for type safety
- Prisma for database schema validation

### Planned Implementation
- Unit tests for utilities and business logic
- Integration tests for API routes (tRPC)
- E2E tests for critical user flows
- Component tests for React components

---

## Future Testing Stack

### Testing Frameworks (Planned)

#### Unit & Integration Testing
- **[Vitest](https://vitest.dev/)**: Fast unit test runner (Vite-powered)
- **[React Testing Library](https://testing-library.com/react)**: Component testing
- **[@testing-library/jest-dom](https://github.com/testing-library/jest-dom)**: DOM matchers

#### E2E Testing
- **[Playwright](https://playwright.dev/)**: Browser automation
- **Alternative**: [Cypress](https://www.cypress.io/)

#### API Testing
- **[Supertest](https://github.com/visionmedia/supertest)**: HTTP assertions
- **tRPC Test Helpers**: Built-in tRPC testing utilities

#### Database Testing
- **Test Database**: Separate PostgreSQL instance
- **Test Containers**: Docker containers for isolated tests

---

## Testing Layers

### 1. Unit Tests

**Purpose**: Test individual functions, utilities, and pure logic

**What to Test**:
- Validation functions (`src/lib/validators.ts`)
- Utility functions (date formatting, string manipulation)
- Business logic (ticket availability calculation)
- Prisma query builders

**Example Test** (Future):

```typescript
// src/lib/validators.test.ts
import { describe, it, expect } from 'vitest';
import { eventSchema } from './validators';

describe('eventSchema', () => {
  it('should validate valid event data', () => {
    const validEvent = {
      name: 'Tech Conference 2025',
      slug: 'tech-conference-2025',
      location: 'San Francisco',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-06-03'),
    };
    
    expect(() => eventSchema.parse(validEvent)).not.toThrow();
  });
  
  it('should reject event with end date before start date', () => {
    const invalidEvent = {
      name: 'Tech Conference 2025',
      startDate: new Date('2025-06-03'),
      endDate: new Date('2025-06-01'), // Invalid
    };
    
    expect(() => eventSchema.parse(invalidEvent)).toThrow();
  });
});
```

---

### 2. Integration Tests

**Purpose**: Test interactions between components, API routes, and database

**What to Test**:
- tRPC router procedures
- Database queries
- Authentication flows
- Email sending

**Example Test** (Future):

```typescript
// src/server/api/routers/event.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from '../root';
import { prisma } from '@/server/db';

describe('Event Router', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testUser: User;
  
  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: { email: 'test@example.com', password: 'hashed' },
    });
    
    // Create authenticated caller
    caller = appRouter.createCaller({
      session: { user: testUser },
      db: prisma,
    });
  });
  
  afterAll(async () => {
    // Cleanup
    await prisma.user.delete({ where: { id: testUser.id } });
  });
  
  it('should create an event', async () => {
    const event = await caller.event.create({
      name: 'Test Event',
      slug: 'test-event',
      location: 'Virtual',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-06-03'),
    });
    
    expect(event).toHaveProperty('id');
    expect(event.name).toBe('Test Event');
    expect(event.organizerId).toBe(testUser.id);
  });
  
  it('should not allow duplicate slugs', async () => {
    // First event created above
    
    await expect(
      caller.event.create({
        name: 'Another Event',
        slug: 'test-event', // Duplicate slug
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-03'),
      })
    ).rejects.toThrow('Slug already exists');
  });
});
```

---

### 3. Component Tests

**Purpose**: Test React components in isolation

**What to Test**:
- Component rendering
- User interactions (clicks, form input)
- Conditional rendering
- Props handling

**Example Test** (Future):

```typescript
// src/components/events/event-card.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventCard from './event-card';

describe('EventCard', () => {
  const mockEvent = {
    id: '1',
    name: 'Tech Conference 2025',
    slug: 'tech-conference-2025',
    location: 'San Francisco',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-06-03'),
    status: 'PUBLISHED',
  };
  
  it('should render event details', () => {
    render(<EventCard event={mockEvent} />);
    
    expect(screen.getByText('Tech Conference 2025')).toBeInTheDocument();
    expect(screen.getByText('San Francisco')).toBeInTheDocument();
  });
  
  it('should show draft badge for draft events', () => {
    const draftEvent = { ...mockEvent, status: 'DRAFT' };
    render(<EventCard event={draftEvent} />);
    
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});
```

---

### 4. End-to-End Tests

**Purpose**: Test complete user workflows across the entire application

**What to Test**:
- User registration and login
- Event creation flow
- Ticket registration flow
- CFP submission and review flow
- Email campaign creation

**Example Test** (Future):

```typescript
// e2e/registration.spec.ts
import { test, expect } from '@playwright/test';

test('complete event registration flow', async ({ page }) => {
  // 1. Navigate to event page
  await page.goto('/events/tech-conference-2025');
  
  // 2. Click register button
  await page.click('text=Register Now');
  
  // 3. Fill registration form
  await page.fill('input[name="name"]', 'John Doe');
  await page.fill('input[name="email"]', 'john@example.com');
  await page.selectOption('select[name="ticketTypeId"]', 'general-admission');
  
  // 4. Submit form
  await page.click('button[type="submit"]');
  
  // 5. Verify success message
  await expect(page.locator('text=Registration Successful')).toBeVisible();
  
  // 6. Verify redirect to confirmation page
  await expect(page).toHaveURL(/\/registrations\/[a-z0-9]+$/);
  
  // 7. Verify confirmation details
  await expect(page.locator('text=John Doe')).toBeVisible();
  await expect(page.locator('text=john@example.com')).toBeVisible();
});
```

---

## Test Database Setup

### Separate Test Database

Create a dedicated test database:

```bash
# Create test database
createdb events_ting_test

# Set test DATABASE_URL
export DATABASE_URL_TEST="postgresql://postgres:password@localhost:5432/events_ting_test"
```

---

### Reset Between Tests

**Strategy**: Reset database before each test suite

```typescript
// tests/setup.ts
import { beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

beforeAll(async () => {
  // Reset test database
  await execPromise('pnpm prisma migrate reset --force --skip-seed');
});

afterAll(async () => {
  // Cleanup
  await prisma.$disconnect();
});
```

---

## Running Tests (Future)

### Commands

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run with coverage
pnpm test:coverage

# Watch mode (re-run on file changes)
pnpm test:watch
```

---

### CI/CD Integration

Add to GitHub Actions:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run migrations
        run: pnpm prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Run tests
        run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Test Coverage Goals

### Target Coverage (Future)

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: 70%+ coverage
- **E2E Tests**: Critical user paths covered

### Priority Areas

1. **High Priority**:
   - Registration flow
   - Payment processing (future)
   - Email sending
   - Authentication

2. **Medium Priority**:
   - Event management
   - CFP workflow
   - Schedule management

3. **Low Priority**:
   - UI components (if logic is minimal)
   - Static pages

---

## Mocking Strategies

### Mock External Services

**Resend (Email)**:
```typescript
import { vi } from 'vitest';

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'mock-email-id' }),
    },
  })),
}));
```

**AWS S3 (File Upload)**:
```typescript
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
}));
```

---

### Mock Database Queries

Use Prisma's testing utilities:

```typescript
import { mockDeep } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

const prisma = mockDeep<PrismaClient>();

prisma.event.findMany.mockResolvedValue([
  { id: '1', name: 'Mock Event', /* ... */ },
]);
```

---

## Best Practices

### ✅ DO

1. **Write tests for new features** before merging
2. **Test edge cases** and error scenarios
3. **Use descriptive test names**:
   ```typescript
   it('should reject registration when ticket sold out', async () => {});
   ```
4. **Keep tests focused**: One assertion per test (when possible)
5. **Use test fixtures** for consistent data
6. **Mock external dependencies** (APIs, email)
7. **Run tests in CI/CD** before deployment
8. **Maintain test database** separately from dev DB
9. **Test authentication** and authorization
10. **Document complex test setups**

---

### ❌ DON'T

1. **Test implementation details** (test behavior, not internals)
2. **Write flaky tests** (non-deterministic)
3. **Skip cleanup** (database, files)
4. **Use production database** for tests
5. **Commit test data** to version control
6. **Test third-party libraries** (already tested)
7. **Write tests that depend on order** (tests should be isolated)
8. **Hardcode test data** (use factories/fixtures)

---

## Testing Checklist

Before merging code:

- [ ] New functionality has unit tests
- [ ] Integration tests cover API endpoints
- [ ] E2E tests updated for user-facing changes
- [ ] All tests pass locally
- [ ] Test coverage meets minimum threshold
- [ ] Edge cases tested
- [ ] Error handling tested
- [ ] Tests run in CI/CD pipeline

---

## Implementation Roadmap

### Phase 1: Foundation (Future)
- Set up Vitest and React Testing Library
- Configure test database
- Write first unit tests for utilities

### Phase 2: Core Features (Future)
- Integration tests for event router
- Integration tests for registration router
- Component tests for key UI components

### Phase 3: E2E Coverage (Future)
- Set up Playwright
- E2E tests for registration flow
- E2E tests for event creation flow

### Phase 4: Advanced (Future)
- CFP workflow E2E tests
- Email campaign E2E tests
- Visual regression testing
- Performance testing

---

## Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing/unit-testing)

### Best Practices
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Kent C. Dodds: Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)

---

## Related Documentation

- [Development Setup](./setup.md) - Local environment configuration
- [Contributing Guide](./contributing.md) - Code quality requirements
- [Database Migrations](./database-migrations.md) - Test database setup

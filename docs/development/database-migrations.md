# Database Migrations with Prisma

This guide covers best practices for managing database schema changes using Prisma Migrate in Events-Ting.

---

## Overview

**Prisma Migrate** is a declarative database migration tool that:
- Tracks schema changes in version control
- Generates SQL migration files
- Ensures database consistency across environments
- Supports rollback and migration history

---

## Migration Workflow

### Development Workflow

```
1. Edit prisma/schema.prisma
2. Run: pnpm prisma migrate dev --name <description>
3. Prisma generates migration SQL + updates database
4. Test changes locally
5. Commit migration files to Git
6. Production deployment applies migrations automatically
```

---

## Creating Migrations

### Step 1: Modify Prisma Schema

Edit `prisma/schema.prisma`:

**Example**: Add a new field to Event model

```prisma
model Event {
  id          String   @id @default(cuid())
  name        String
  description String?
  location    String?
  // New field
  capacity    Int      @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

### Step 2: Generate Migration

```bash
pnpm prisma migrate dev --name add_capacity_to_event
```

**What happens**:
1. Prisma analyzes schema changes
2. Generates SQL migration file
3. Applies migration to development database
4. Regenerates Prisma Client

**Output**:
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "events_ting"

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20251110120000_add_capacity_to_event/
      └─ migration.sql

✔ Generated Prisma Client to ./node_modules/@prisma/client
```

---

### Migration File Structure

**Location**: `prisma/migrations/`

```
prisma/migrations/
├── migration_lock.toml               # Prevents concurrent migrations
├── 20251107235650_add_password_to_user/
│   └── migration.sql                 # SQL for this migration
├── 20251108035708_add_event_management_system/
│   └── migration.sql
└── 20251110120000_add_capacity_to_event/
    └── migration.sql                 # Your new migration
```

---

### Migration SQL Example

**File**: `prisma/migrations/20251110120000_add_capacity_to_event/migration.sql`

```sql
-- AlterTable
ALTER TABLE "Event" ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 0;
```

---

## Migration Commands

### Development

#### Create Migration
```bash
# Generate and apply migration
pnpm prisma migrate dev --name <description>
```

**Description guidelines**:
- Use snake_case
- Be descriptive and concise
- Examples:
  - `add_capacity_to_event`
  - `create_speaker_session_table`
  - `add_indexes_for_sorting`

---

#### Apply Migrations
```bash
# Apply all pending migrations
pnpm prisma migrate dev
```

---

#### Reset Database
```bash
# ⚠️ Drops database, applies all migrations, runs seed
pnpm prisma migrate reset
```

**Use cases**:
- Clean slate for testing
- Fix migration history conflicts
- Reset to initial state

**⚠️ Warning**: Deletes ALL data. Never run in production.

---

### Production

#### Deploy Migrations
```bash
# Apply pending migrations (production-safe)
pnpm prisma migrate deploy
```

**Characteristics**:
- ✅ Non-interactive (CI/CD friendly)
- ✅ Fails if migrations not in Git
- ✅ Doesn't generate Prisma Client
- ✅ Safe for production

---

#### Check Migration Status
```bash
pnpm prisma migrate status
```

**Output example**:
```
Database schema is up to date!

Status
3 migrations found in prisma/migrations

All migrations have been applied
```

---

## Common Migration Scenarios

### Scenario 1: Add a New Model

**Change**: Add a new table

```prisma
model NewsletterSubscriber {
  id        String   @id @default(cuid())
  email     String   @unique
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  
  @@index([eventId])
}

model Event {
  // ... existing fields
  newsletterSubscribers NewsletterSubscriber[]
}
```

**Command**:
```bash
pnpm prisma migrate dev --name create_newsletter_subscriber_table
```

---

### Scenario 2: Add a Field

**Change**: Add optional field

```prisma
model Speaker {
  // ... existing fields
  company String?  // New field
}
```

**Command**:
```bash
pnpm prisma migrate dev --name add_company_to_speaker
```

---

### Scenario 3: Make Field Required

**Change**: Change nullable to required

```prisma
model Event {
  // Before: description String?
  description String  // Now required
}
```

**⚠️ Problem**: Existing rows have NULL values

**Solution**: Two-step migration

**Step 1**: Add default value
```bash
pnpm prisma migrate dev --name add_default_to_event_description
```

Manually edit migration SQL:
```sql
-- Set default for existing rows
UPDATE "Event" SET description = 'No description provided' WHERE description IS NULL;

-- Make column required
ALTER TABLE "Event" ALTER COLUMN "description" SET NOT NULL;
```

**Step 2**: Update schema
```prisma
model Event {
  description String @default("No description provided")
}
```

---

### Scenario 4: Rename a Field

**Change**: Rename field

```prisma
model Event {
  // Before: name String
  title String  // Renamed to title
}
```

**⚠️ Problem**: Prisma treats this as drop + add (data loss)

**Solution**: Manual migration

1. Generate migration:
   ```bash
   pnpm prisma migrate dev --name rename_event_name_to_title --create-only
   ```

2. Edit migration SQL:
   ```sql
   -- Manual rename (preserves data)
   ALTER TABLE "Event" RENAME COLUMN "name" TO "title";
   ```

3. Apply migration:
   ```bash
   pnpm prisma migrate dev
   ```

---

### Scenario 5: Add Relation

**Change**: Add one-to-many relation

```prisma
model Event {
  // ... existing fields
  tags EventTag[]
}

model EventTag {
  id      String @id @default(cuid())
  name    String
  eventId String
  event   Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  @@index([eventId])
}
```

**Command**:
```bash
pnpm prisma migrate dev --name add_event_tags_relation
```

---

## Handling Migration Conflicts

### Conflict: "Migration history diverged"

**Cause**: Different migrations applied in different branches

**Symptoms**:
```
Error: Migration history mismatch between the database and local migrations directory.
```

**Solution 1**: Reset local database (development only)
```bash
pnpm prisma migrate reset
```

---

**Solution 2**: Resolve manually

1. Check migration status:
   ```bash
   pnpm prisma migrate status
   ```

2. Identify divergent migration

3. Mark migration as applied:
   ```bash
   pnpm prisma migrate resolve --applied <migration_name>
   ```

4. Or mark as rolled back:
   ```bash
   pnpm prisma migrate resolve --rolled-back <migration_name>
   ```

---

### Conflict: Failed Migration

**Cause**: SQL error during migration

**Solution**:

1. Check error message:
   ```bash
   pnpm prisma migrate dev
   ```

2. Fix issue in schema or migration SQL

3. If migration partially applied:
   ```bash
   # Mark as rolled back
   pnpm prisma migrate resolve --rolled-back <migration_name>
   
   # Re-run migration
   pnpm prisma migrate dev
   ```

---

## Best Practices

### ✅ DO

1. **Always create named migrations**:
   ```bash
   pnpm prisma migrate dev --name add_feature
   ```

2. **Test migrations locally** before committing

3. **Review generated SQL** in migration files

4. **Commit migration files** to version control

5. **Use descriptive migration names**:
   - ✅ `add_email_status_to_registration`
   - ❌ `update_schema`

6. **Run migrations in CI/CD** before deployment

7. **Backup database** before production migrations

8. **Use transactions** for multi-step migrations

9. **Add indexes** for frequently queried fields:
   ```prisma
   @@index([eventId, status])
   ```

10. **Document complex migrations** in PR description

---

### ❌ DON'T

1. **Edit applied migrations** (breaks history)

2. **Delete migration files** (causes conflicts)

3. **Use `db push` in production**:
   ```bash
   # OK for prototyping
   pnpm prisma db push
   
   # NOT for production (no migration history)
   ```

4. **Skip testing migrations** before merging

5. **Make breaking changes** without data migration plan

6. **Rename tables/columns** without manual migration

7. **Remove required fields** without default values

8. **Run `migrate reset`** in production

9. **Commit `.env` files** with `DATABASE_URL`

10. **Apply migrations manually** (use `migrate deploy`)

---

## Advanced Techniques

### Custom SQL in Migrations

Add custom SQL after Prisma generates migration:

**Example**: Populate new field with data

```sql
-- Migration: add_display_name_to_speaker

-- Generated by Prisma
ALTER TABLE "Speaker" ADD COLUMN "displayName" TEXT;

-- Custom: Populate from existing fields
UPDATE "Speaker" SET "displayName" = "name" WHERE "displayName" IS NULL;
```

---

### Data Migrations

For complex data transformations:

1. **Create migration**:
   ```bash
   pnpm prisma migrate dev --name migrate_speaker_data --create-only
   ```

2. **Edit migration SQL**:
   ```sql
   -- Transform data
   UPDATE "Speaker"
   SET "bio" = CONCAT('Biography: ', "bio")
   WHERE "bio" IS NOT NULL;
   ```

3. **Apply migration**:
   ```bash
   pnpm prisma migrate dev
   ```

---

### Seeding After Migrations

Auto-seed after migrations:

**In `package.json`**:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Run**:
```bash
pnpm prisma migrate reset  # Drops DB, migrates, seeds
```

---

## Production Deployment

### Automatic Migrations (Vercel)

Migrations run automatically during build:

**In `package.json`**:
```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

**Process**:
1. Prisma generates client
2. Migrations applied to production DB
3. Next.js builds application

---

### Manual Production Migrations

For sensitive production deployments:

```bash
# 1. Pull production DB URL
vercel env pull .env.production

# 2. Check migration status
pnpm prisma migrate status

# 3. Apply migrations
pnpm prisma migrate deploy

# 4. Deploy application
vercel --prod
```

---

### Zero-Downtime Migrations

For high-traffic applications:

1. **Add column as optional**:
   ```prisma
   model Event {
     newField String?  // Optional first
   }
   ```

2. **Deploy migration** (non-breaking)

3. **Update application** to populate field

4. **Make field required** in next migration:
   ```prisma
   model Event {
     newField String  // Now required
   }
   ```

---

## Troubleshooting

### "Database is not in sync with schema"

**Cause**: Schema changed without migration  
**Solution**:
```bash
pnpm prisma migrate dev
```

---

### "Migration failed: column already exists"

**Cause**: Migration applied multiple times  
**Solution**:
```bash
# Mark as applied
pnpm prisma migrate resolve --applied <migration_name>
```

---

### "Cannot connect to database"

**Cause**: Database not running or wrong `DATABASE_URL`  
**Solution**:
1. Check PostgreSQL is running
2. Verify `DATABASE_URL` in `.env`
3. Test connection: `psql -d events_ting`

---

### "Prisma Client not found"

**Cause**: Client not generated after migration  
**Solution**:
```bash
pnpm prisma generate
```

---

### Migration Timeout (Production)

**Cause**: Large table alteration  
**Solution**:
1. Run migrations manually with increased timeout
2. Use direct connection (not pooled) for migrations
3. Consider background data migrations for large datasets

---

## Migration Checklist

Before merging schema changes:

- [ ] Schema updated in `prisma/schema.prisma`
- [ ] Migration created with descriptive name
- [ ] Migration SQL reviewed and tested locally
- [ ] Data migration plan documented (if needed)
- [ ] Breaking changes identified and communicated
- [ ] Migration files committed to Git
- [ ] CI/CD pipeline runs migrations successfully
- [ ] Rollback plan documented (for risky changes)

---

## Rollback Strategies

### Development: Reset Database

```bash
pnpm prisma migrate reset
```

---

### Production: Manual Rollback

1. **Backup database** first

2. **Revert migration** (if just applied):
   ```sql
   -- Manually undo changes
   ALTER TABLE "Event" DROP COLUMN "capacity";
   ```

3. **Mark migration as rolled back**:
   ```bash
   pnpm prisma migrate resolve --rolled-back <migration_name>
   ```

4. **Redeploy** previous version of application

---

## Related Documentation

- [Database Setup](../deployment/database-setup.md) - PostgreSQL installation
- [Development Setup](./setup.md) - Local environment configuration
- [Architecture: Data Model](../architecture/data-model.md) - Complete schema reference
- [Vercel Deployment](../deployment/vercel-deployment.md) - Production migrations

---

## Further Reading

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Database Schema Best Practices](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate)

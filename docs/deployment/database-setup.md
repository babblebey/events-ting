# Database Setup

This guide covers setting up PostgreSQL and managing the database for Events-Ting in both local development and production environments.

---

## Local Development Setup

### Prerequisites

- PostgreSQL 14 or higher
- Node.js 18+ with pnpm installed

---

### Step 1: Install PostgreSQL

#### macOS (using Homebrew)
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
psql --version
```

#### Windows
1. Download installer from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user
4. PostgreSQL service starts automatically

**Or using Chocolatey**:
```powershell
choco install postgresql
```

#### Linux (Ubuntu/Debian)
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

---

### Step 2: Create Database

#### Using psql Command Line

```bash
# Connect to PostgreSQL as postgres user
psql -U postgres

# Create database
CREATE DATABASE events_ting;

# Create a user (optional, or use postgres user)
CREATE USER events_user WITH PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE events_ting TO events_user;

# Exit psql
\q
```

#### Using GUI Tools

**pgAdmin** (Cross-platform):
1. Open pgAdmin
2. Right-click on "Databases" → "Create" → "Database"
3. Name: `events_ting`
4. Save

**Postico** (macOS):
1. Connect to localhost
2. Click "+" to create new database
3. Name: `events_ting`

---

### Step 3: Configure Environment Variables

Create `.env` file in project root:

```bash
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/events_ting?schema=public"
```

**Connection String Format**:
```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?schema=public
```

---

### Step 4: Run Prisma Migrations

```bash
# Install dependencies (if not already done)
pnpm install

# Run all migrations to create tables
pnpm prisma migrate deploy

# Or for development (generates Prisma Client)
pnpm prisma migrate dev
```

**Expected output**:
```
Applying migration `20251107235650_add_password_to_user`
Applying migration `20251108035708_add_event_management_system`
Applying migration `20251108184514_add_indexes_for_sorting_and_filtering`

✅ Your database is now in sync with your Prisma schema.
```

---

### Step 5: Seed Database (Optional)

Populate the database with sample data for testing:

```bash
pnpm prisma db seed
```

**What gets seeded**:
- Sample user accounts (organizers)
- Example events (published and draft)
- Ticket types for events
- Sample registrations
- CFP submissions
- Speakers and schedule entries

**Seed data location**: `prisma/seed.ts`

---

## Production Setup

### Option 1: Vercel Postgres

**Setup**:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → "Storage" tab
3. Click "Create Database" → "Postgres"
4. Choose region (closest to your users)
5. Database created automatically

**Get connection string**:
1. Click on your Postgres database
2. Copy `.env.local` tab connection strings
3. Use the **pooled connection** for `DATABASE_URL`:
   ```
   postgres://default:xxx@xxx-pooler.aws.region.postgres.vercel-storage.com:5432/verceldb
   ```

**Add to Vercel environment variables**:
1. Project Settings → Environment Variables
2. Add `DATABASE_URL` with the pooled connection string
3. Available for Production, Preview, and Development

---

### Option 2: Neon (Serverless Postgres)

**Setup**:
1. Sign up at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string from dashboard

**Connection string format**:
```
postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

**Features**:
- ✅ Serverless (auto-scales to zero)
- ✅ Built-in connection pooling
- ✅ Generous free tier
- ✅ Branching support

---

### Option 3: Railway

**Setup**:
1. Sign up at [railway.app](https://railway.app)
2. New Project → "Provision PostgreSQL"
3. Database automatically created

**Get connection string**:
1. Click on Postgres service
2. Variables tab → Copy `DATABASE_URL`

---

### Option 4: Self-Hosted

For VPS or dedicated server:

```bash
# Install PostgreSQL on server
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE events_ting;
CREATE USER events_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE events_ting TO events_user;
\q

# Configure PostgreSQL for remote connections
sudo nano /etc/postgresql/15/main/postgresql.conf
# Set: listen_addresses = '*'

sudo nano /etc/postgresql/15/main/pg_hba.conf
# Add: host all all 0.0.0.0/0 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Running Migrations in Production

### Automated (Recommended)

Migrations run automatically during Vercel deployment via the build command:

**In `package.json`**:
```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

---

### Manual Migration

If you need to run migrations manually:

```bash
# Set production DATABASE_URL
export DATABASE_URL="your_production_connection_string"

# Run migrations
pnpm prisma migrate deploy

# Or using Docker
docker exec -it your-container pnpm prisma migrate deploy
```

---

## Database Schema Overview

Events-Ting uses the following core tables:

### Core Tables
- **User** - Organizer accounts with authentication
- **Account** - OAuth provider accounts (NextAuth)
- **Session** - User sessions

### Event Management
- **Event** - Core event information
- **TicketType** - Ticket types for events
- **Registration** - Attendee registrations

### CFP & Speakers
- **CallForPapers** - CFP configuration per event
- **CfpSubmission** - Speaker proposals
- **Speaker** - Speaker profiles
- **ScheduleEntry** - Session schedule
- **SpeakerSession** - Many-to-many speaker assignments

### Communications
- **EmailCampaign** - Mass email campaigns

**View full schema**: `prisma/schema.prisma`

---

## Prisma Commands Reference

### Development

```bash
# Generate Prisma Client (after schema changes)
pnpm prisma generate

# Create a new migration
pnpm prisma migrate dev --name add_new_feature

# Reset database (⚠️ deletes all data)
pnpm prisma migrate reset

# Open Prisma Studio (GUI database viewer)
pnpm prisma studio

# Format schema file
pnpm prisma format
```

---

### Production

```bash
# Run pending migrations (production-safe)
pnpm prisma migrate deploy

# Check migration status
pnpm prisma migrate status

# Seed production database
pnpm prisma db seed
```

---

### Introspection & Pull

```bash
# Pull schema from existing database
pnpm prisma db pull

# Push schema changes without migration (prototyping)
pnpm prisma db push
```

---

## Backup & Restore

### Backup Database

```bash
# Using pg_dump
pg_dump -U postgres -d events_ting -F c -f backup.dump

# With compression
pg_dump -U postgres -d events_ting | gzip > backup.sql.gz

# Production backup (Vercel Postgres)
vercel env pull .env.production
pg_dump $(grep DATABASE_URL .env.production | cut -d '=' -f2) > backup.sql
```

---

### Restore Database

```bash
# From dump file
pg_restore -U postgres -d events_ting -c backup.dump

# From SQL file
psql -U postgres -d events_ting < backup.sql

# From compressed file
gunzip < backup.sql.gz | psql -U postgres -d events_ting
```

---

## Troubleshooting

### "Connection refused" Error

**Cause**: PostgreSQL not running  
**Solution**:
```bash
# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Windows
# Start "postgresql-x64-15" service in Services app
```

---

### "Password authentication failed"

**Cause**: Incorrect username or password  
**Solution**:
1. Reset password in psql:
   ```sql
   ALTER USER postgres PASSWORD 'new_password';
   ```
2. Update `DATABASE_URL` in `.env`

---

### "Database does not exist"

**Cause**: Database not created  
**Solution**:
```bash
psql -U postgres
CREATE DATABASE events_ting;
\q
```

---

### "Schema has drift" (Migrations)

**Cause**: Database schema doesn't match Prisma schema  
**Solution**:
```bash
# Development (resets DB)
pnpm prisma migrate reset

# Production (manual fix)
pnpm prisma migrate status
pnpm prisma migrate resolve --applied migration_name
```

---

### "Migration failed" During Deployment

**Cause**: Database locked, connection timeout, or SQL error  
**Solution**:
1. Check Vercel deployment logs
2. Verify `DATABASE_URL` is correct
3. Run migrations manually:
   ```bash
   pnpm prisma migrate deploy
   ```
4. Use direct connection (not pooled) for migrations

---

### Prisma Client Not Found

**Cause**: Prisma Client not generated  
**Solution**:
```bash
pnpm prisma generate
```

---

## Connection Pooling

### Why Connection Pooling?

Serverless functions (like Vercel/Next.js) create new database connections for each request. Without pooling:
- ❌ Connection limit exhausted
- ❌ Slow cold starts
- ❌ Database performance degradation

---

### Vercel Postgres Pooling

Use the **pooler endpoint** in production:

```bash
# ✅ Pooled (use this)
DATABASE_URL="postgres://default:xxx@xxx-pooler.aws.region.postgres.vercel-storage.com:5432/verceldb"

# ❌ Direct (don't use in serverless)
DATABASE_URL="postgres://default:xxx@xxx.aws.region.postgres.vercel-storage.com:5432/verceldb"
```

---

### Neon Connection Pooling

Neon has built-in pooling, but use pooled endpoint for best performance:

```bash
# Pooled connection string
postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/dbname
```

---

### PgBouncer (Self-Hosted)

If self-hosting, use PgBouncer:

```bash
# Install
sudo apt install pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
events_ting = host=localhost port=5432 dbname=events_ting

[pgbouncer]
listen_port = 6432
pool_mode = transaction
max_client_conn = 100

# Start
sudo systemctl start pgbouncer

# Update DATABASE_URL to use port 6432
DATABASE_URL="postgresql://user:password@localhost:6432/events_ting"
```

---

## Related Documentation

- [Environment Variables](./environment-variables.md) - Configure DATABASE_URL
- [Database Migrations Guide](../development/database-migrations.md) - Prisma workflow
- [Vercel Deployment](./vercel-deployment.md) - Production setup
- [Architecture: Data Model](../architecture/data-model.md) - Complete schema reference

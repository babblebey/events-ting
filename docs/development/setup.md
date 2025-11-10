# Local Development Setup

This guide will help you set up Events-Ting for local development on your machine.

---

## Prerequisites

Ensure you have the following installed before starting:

### Required Software

#### Node.js (v18.17 or higher)
Check version:
```bash
node --version
```

**Install**:
- **macOS**: `brew install node@18` or download from [nodejs.org](https://nodejs.org)
- **Windows**: Download installer from [nodejs.org](https://nodejs.org)
- **Linux**: Use [nvm](https://github.com/nvm-sh/nvm) or package manager

#### pnpm (v8 or higher)
Check version:
```bash
pnpm --version
```

**Install**:
```bash
npm install -g pnpm
```

#### PostgreSQL (v14 or higher)
Check version:
```bash
psql --version
```

**Install**: See [Database Setup Guide](../deployment/database-setup.md#step-1-install-postgresql)

#### Git
Check version:
```bash
git --version
```

**Install**: Download from [git-scm.com](https://git-scm.com/downloads)

---

### Optional Tools

- **pgAdmin** or **Postico**: GUI for PostgreSQL management
- **VS Code**: Recommended code editor with extensions:
  - Prisma
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense

---

## Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-username/events-ting.git

# Navigate to project directory
cd events-ting

# If using SSH
git clone git@github.com:your-username/events-ting.git
```

---

## Step 2: Install Dependencies

```bash
# Install all dependencies
pnpm install
```

**This installs**:
- Next.js 15
- React 18
- Prisma ORM
- tRPC
- NextAuth.js
- Resend
- Flowbite React
- Tailwind CSS
- And all other dependencies

**Expected output**:
```
Packages: +XXX
Progress: resolved XXX, reused XXX, downloaded XX, added XXX, done
Done in XXs
```

---

## Step 3: Set Up Environment Variables

### Create .env File

```bash
# Copy example environment file
cp .env.example .env

# Or create manually
touch .env
```

### Add Required Variables

Edit `.env` and add:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/events_ting?schema=public"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-minimum-32-characters-long"
NEXTAUTH_URL="http://localhost:3000"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Generate NEXTAUTH_SECRET**:
```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Get RESEND_API_KEY**: See [Email Setup Guide](../deployment/email-setup.md)

---

## Step 4: Set Up Database

### Start PostgreSQL

```bash
# macOS (Homebrew)
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Windows
# Start "postgresql-x64-15" service in Services app
```

### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE events_ting;

# Exit psql
\q
```

**Or use GUI** (pgAdmin, Postico, etc.):
1. Connect to localhost
2. Create new database: `events_ting`

---

## Step 5: Run Database Migrations

```bash
# Generate Prisma Client
pnpm prisma generate

# Run all migrations
pnpm prisma migrate dev

# Or deploy migrations without prompts
pnpm prisma migrate deploy
```

**Expected output**:
```
Applying migration `20251107235650_add_password_to_user`
Applying migration `20251108035708_add_event_management_system`
Applying migration `20251108184514_add_indexes_for_sorting_and_filtering`

✔ Generated Prisma Client to ./node_modules/@prisma/client

✔ Your database is now in sync with your schema.
```

---

## Step 6: Seed Database (Optional)

Populate the database with sample data:

```bash
pnpm prisma db seed
```

**What gets seeded**:
- Sample organizer accounts
- Example events (published and drafts)
- Ticket types
- Sample registrations
- CFP submissions
- Speakers
- Schedule entries

**Credentials** (if seeded users exist):
```
Email: admin@example.com
Password: password123
```

---

## Step 7: Start Development Server

```bash
# Start Next.js development server
pnpm dev
```

**Expected output**:
```
▲ Next.js 15.0.0
- Local:        http://localhost:3000
- Environments: .env

✓ Ready in 2.5s
```

**Server is now running at**: [http://localhost:3000](http://localhost:3000)

---

## Step 8: Verify Installation

### Test the Application

1. **Home Page**: Visit [http://localhost:3000](http://localhost:3000)
2. **Sign Up**: Create an account at [/auth/signup](http://localhost:3000/auth/signup)
3. **Dashboard**: Access organizer dashboard
4. **Create Event**: Test event creation flow

### Check Database

Open Prisma Studio to view database:
```bash
pnpm prisma studio
```

Opens at: [http://localhost:5555](http://localhost:5555)

---

## Development Workflow

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier

# Database
pnpm prisma studio    # Open Prisma Studio (DB GUI)
pnpm prisma migrate dev --name <migration_name>  # Create migration
pnpm prisma generate  # Regenerate Prisma Client
pnpm prisma db seed   # Seed database
pnpm prisma db push   # Push schema changes (prototyping)

# Type checking
pnpm type-check       # Run TypeScript compiler
```

---

### Project Structure

```
events-ting/
├── src/
│   ├── app/              # Next.js pages (App Router)
│   │   ├── (dashboard)/  # Dashboard pages (organizers)
│   │   ├── events/       # Public event pages
│   │   ├── auth/         # Authentication pages
│   │   └── api/          # API routes
│   ├── components/       # React components
│   ├── server/
│   │   ├── api/          # tRPC routers
│   │   │   └── routers/  # Feature routers
│   │   ├── auth.ts       # NextAuth configuration
│   │   └── db.ts         # Prisma client
│   ├── lib/              # Utility functions
│   ├── hooks/            # Custom React hooks
│   ├── trpc/             # tRPC client setup
│   └── styles/           # Global styles
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── seed.ts           # Database seeding
│   └── migrations/       # Migration files
├── emails/               # React Email templates
├── public/               # Static assets
│   └── uploads/          # User uploads (local)
├── docs/                 # Documentation
└── package.json
```

---

### Hot Reload & Fast Refresh

Next.js automatically reloads when you:
- Edit React components
- Modify server code
- Update environment variables (requires restart)
- Change Prisma schema (requires `pnpm prisma generate`)

**Restart required for**:
- `.env` changes
- `next.config.js` changes
- New dependencies installed

---

## Troubleshooting

### Port 3000 Already in Use

**Solution**: Kill process or use different port

```bash
# Find and kill process on port 3000
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Or use different port
PORT=3001 pnpm dev
```

---

### "Module not found" Error

**Cause**: Dependencies not installed  
**Solution**:
```bash
pnpm install
```

---

### Prisma Client Not Generated

**Cause**: Prisma Client needs regeneration  
**Solution**:
```bash
pnpm prisma generate
```

**Auto-generate**: Add postinstall script in `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

---

### Database Connection Error

**Cause**: PostgreSQL not running or incorrect `DATABASE_URL`  
**Solution**:
1. Start PostgreSQL:
   ```bash
   brew services start postgresql@15  # macOS
   sudo systemctl start postgresql    # Linux
   ```
2. Verify `DATABASE_URL` in `.env`
3. Test connection:
   ```bash
   psql -U postgres -d events_ting
   ```

---

### "Migration failed" Error

**Cause**: Database schema out of sync  
**Solution**:
```bash
# Reset database (⚠️ deletes all data)
pnpm prisma migrate reset

# Or manually fix
pnpm prisma migrate resolve --applied <migration_name>
```

---

### ESLint Errors

**Solution**: Auto-fix linting issues
```bash
pnpm lint --fix
```

---

### TypeScript Errors

**Check errors**:
```bash
pnpm type-check
```

**Common issues**:
- Missing types: `pnpm add -D @types/package-name`
- Prisma types: Run `pnpm prisma generate`

---

## Environment Configuration

### Development Environment

**Database**: Local PostgreSQL  
**Email**: Resend test mode (emails to your account email)  
**Storage**: Local file system (`public/uploads/`)  
**Auth**: Local session storage

---

### Environment Files

- `.env` - Local development (gitignored)
- `.env.example` - Template for required variables (committed)
- `.env.local` - Alternative local config (gitignored)
- `.env.production` - Production variables (DO NOT COMMIT)

**Load order**:
1. `.env.local`
2. `.env.development` / `.env.production`
3. `.env`

---

## IDE Setup (VS Code)

### Recommended Extensions

Install from VS Code marketplace:

```json
{
  "recommendations": [
    "prisma.prisma",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

---

## Next Steps

Now that your development environment is set up:

1. **Explore the codebase**: Start with `src/app/page.tsx`
2. **Read module documentation**: See `docs/modules/`
3. **Create your first feature**: Follow [Contributing Guide](./contributing.md)
4. **Run tests**: See [Testing Guide](./testing.md) (when available)
5. **Learn Prisma workflow**: See [Database Migrations](./database-migrations.md)

---

## Getting Help

### Resources

- **Documentation**: `docs/` directory
- **API Reference**: [tRPC Routers](../api/routers.md)
- **Architecture**: [System Overview](../architecture/system-overview.md)

### Common Issues

Check the [Troubleshooting Guide](../troubleshooting.md) for solutions to common problems.

### Community

- GitHub Issues: Report bugs or request features
- Discussions: Ask questions and share ideas

---

## Related Documentation

- [Database Setup](../deployment/database-setup.md) - PostgreSQL installation and configuration
- [Environment Variables](../deployment/environment-variables.md) - Complete variable reference
- [Email Setup](../deployment/email-setup.md) - Configure Resend for email testing
- [Database Migrations](./database-migrations.md) - Prisma migration workflow
- [Contributing Guide](./contributing.md) - Code style and contribution process

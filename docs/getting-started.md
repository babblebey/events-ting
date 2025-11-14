# Getting Started with Events-Ting

This guide will help you set up Events-Ting locally for development. By the end, you'll have a fully functional event management system running on your machine.

## ⏱️ Estimated Time

- **First-time setup**: 15-20 minutes
- **Subsequent setups**: 5 minutes

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

| Tool | Minimum Version | Installation |
|------|----------------|--------------|
| **Node.js** | 18.0.0+ | [Download](https://nodejs.org/) |
| **pnpm** | 10.20.0+ | `npm install -g pnpm` |
| **PostgreSQL** | 14.0+ | [Download](https://www.postgresql.org/download/) |
| **Git** | 2.0+ | [Download](https://git-scm.com/) |

### Verify Installations

```bash
# Check Node.js version
node --version  # Should be v18.0.0 or higher

# Check pnpm version
pnpm --version  # Should be 10.20.0 or higher

# Check PostgreSQL version
psql --version  # Should be 14.0 or higher

# Check Git version
git --version   # Should be 2.0 or higher
```

### Optional (Recommended)

- **VS Code**: Recommended editor with extensions:
  - ESLint
  - Prettier
  - Prisma
  - Tailwind CSS IntelliSense
- **PostgreSQL GUI**: pgAdmin, TablePlus, or Postico for database visualization

## 🚀 Quick Setup (5 Steps)

### Step 1: Clone the Repository

```bash
# Clone via HTTPS
git clone https://github.com/babblebey/events-ting.git

# OR clone via SSH (if you have SSH keys set up)
git clone git@github.com:babblebey/events-ting.git

# Navigate into the project directory
cd events-ting
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
pnpm install

# This will also:
# - Generate Prisma client (postinstall hook)
# - Set up pre-commit hooks (if configured)
```

**Expected output**: You should see installation progress and "Done in X seconds".

### Step 3: Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Open .env in your editor
# On Windows (PowerShell):
notepad .env

# On macOS/Linux:
nano .env
# or
code .env  # if using VS Code
```

**Edit the `.env` file with your values:**

```bash
# ============================================================================
# CORE APPLICATION
# ============================================================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# ============================================================================
# DATABASE
# ============================================================================
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/events_ting_dev"
# Replace 'yourpassword' with your PostgreSQL password

# ============================================================================
# AUTHENTICATION (NextAuth.js)
# ============================================================================
AUTH_SECRET="generate-with-command-below"
# Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# ============================================================================
# OAUTH PROVIDERS (Optional for MVP)
# ============================================================================
# Skip these for now - you can add them later

# ============================================================================
# EMAIL SERVICE (Resend)
# ============================================================================
RESEND_API_KEY="re_your_api_key_here"
# Get from: https://resend.com/api-keys
RESEND_FROM_EMAIL="noreply@yourdomain.com"
# Use a verified domain in Resend

# ============================================================================
# FILE STORAGE
# ============================================================================
UPLOAD_DIR="public/uploads"
MAX_FILE_SIZE="5242880"
```

**Generate AUTH_SECRET:**

```bash
# On Windows (PowerShell):
# You can use an online generator: https://generate-secret.vercel.app/32
# Or install OpenSSL: https://slproweb.com/products/Win32OpenSSL.html

# On macOS/Linux:
openssl rand -base64 32
```

**Get Resend API Key:**

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (or use test mode)
3. Create an API key
4. Copy it to `RESEND_API_KEY`

> **💡 Tip**: For local development, you can use Resend's test mode which doesn't require domain verification.

### Step 4: Set Up the Database

#### Option A: Create Database Manually

```bash
# Connect to PostgreSQL (PowerShell on Windows)
psql -U postgres

# Create the database
CREATE DATABASE events_ting_dev;

# Exit psql
\q
```

#### Option B: Use the Provided Script (macOS/Linux)

```bash
# Make the script executable
chmod +x start-database.sh

# Run the database setup script
./start-database.sh
```

#### Run Migrations

```bash
# Generate Prisma client and run migrations
pnpm run db:generate

# This will:
# 1. Create database tables based on schema.prisma
# 2. Generate TypeScript types for Prisma client
# 3. Create migration history in prisma/migrations/
```

**Expected output**: You should see migration files being applied and "Prisma Client generated successfully".

#### (Optional) Seed Sample Data

```bash
# Seed the database with sample events and users
pnpm run db:seed

# This creates:
# - 1 test organizer account (email: organizer@test.com, password: password123)
# - 2 sample events with tickets
# - Sample schedule entries
```

> **🔐 Test Credentials**: After seeding, you can log in with:
> - Email: `organizer@test.com`
> - Password: `password123`

### Step 5: Start the Development Server

```bash
# Start Next.js development server with Turbopack
pnpm run dev

# Server will start on http://localhost:3000
```

**Expected output**:
```
 ▲ Next.js 15.2.3
- Local:        http://localhost:3000
- Environments: .env

✓ Starting...
✓ Ready in 2.1s
```

## ✅ Verify Installation

### 1. Open the Application

Visit **http://localhost:3000** in your browser.

You should see the Events-Ting homepage.

### 2. Test Public Pages

- **Homepage**: http://localhost:3000
- **Events List**: http://localhost:3000/events (if seeded)
- **Sign In**: http://localhost:3000/auth/signin

### 3. Test Authentication

If you seeded the database:

1. Go to http://localhost:3000/auth/signin
2. Sign in with:
   - Email: `organizer@test.com`
   - Password: `password123`
3. You should be redirected to the dashboard at `/dashboard`
4. You'll see your events dashboard with any seeded events

### 4. Test Event Creation

1. Sign in as an organizer (redirects to `/dashboard`)
2. Click "Create Event" button in the dashboard header
3. Fill in event details
4. Click "Create" - you should see the event management dashboard
5. Return to the main dashboard to see your newly created event

### 5. Test Public Registration Flow

1. Navigate to an event's public page (e.g., http://localhost:3000/events/sample-event)
2. Click "Register"
3. Fill in attendee details
4. Submit registration
5. Check your email (if Resend is configured) for confirmation

## 🛠️ Common Setup Issues

### Issue 1: Database Connection Failed

**Error**: `Can't reach database server at localhost:5432`

**Solutions**:
```bash
# Check if PostgreSQL is running
# On Windows:
Get-Service -Name postgresql*

# On macOS (Homebrew):
brew services list

# On Linux:
sudo systemctl status postgresql

# Start PostgreSQL if not running
# On Windows: Start via Services or pgAdmin
# On macOS:
brew services start postgresql

# On Linux:
sudo systemctl start postgresql
```

### Issue 2: Port 3000 Already in Use

**Error**: `Port 3000 is already in use`

**Solutions**:
```bash
# Option 1: Kill the process using port 3000
# On Windows (PowerShell):
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# On macOS/Linux:
lsof -ti:3000 | xargs kill

# Option 2: Use a different port
pnpm run dev -- -p 3001
```

### Issue 3: Prisma Generate Fails

**Error**: `Prisma schema not found`

**Solutions**:
```bash
# Ensure you're in the project root directory
cd events-ting

# Try generating manually
pnpm prisma generate

# If still failing, reinstall dependencies
rm -rf node_modules generated
pnpm install
```

### Issue 4: Environment Variables Not Loaded

**Error**: Missing environment variables

**Solutions**:
```bash
# Ensure .env file exists in project root
ls .env  # Should show the file

# Restart the dev server after editing .env
# Stop with Ctrl+C, then:
pnpm run dev

# Check if variables are loaded (in your code):
# console.log(process.env.DATABASE_URL)
```

### Issue 5: Email Sending Fails

**Error**: `Resend API error`

**Solutions**:
- Verify your `RESEND_API_KEY` is correct
- Check if your domain is verified in Resend dashboard
- For local testing, use Resend's test mode
- Check the console for error details

## 🧪 Testing Your Setup

### Run All Checks

```bash
# Run linter and type checking
pnpm run check

# Run individual checks
pnpm run lint        # ESLint
pnpm run typecheck   # TypeScript
pnpm run format:check # Prettier
```

All checks should pass ✅

### Test Database Connection

```bash
# Open Prisma Studio (database GUI)
pnpm run db:studio

# Opens in browser at http://localhost:5555
# You should see all your database tables
```

### Test tRPC Procedures

Create a test file to verify tRPC is working:

```typescript
// src/app/test-trpc/page.tsx
import { api } from "~/trpc/server";

export default async function TestPage() {
  const events = await api.event.list();
  
  return (
    <div>
      <h1>tRPC Test</h1>
      <pre>{JSON.stringify(events, null, 2)}</pre>
    </div>
  );
}
```

Visit http://localhost:3000/test-trpc - you should see event data.

## 📚 Next Steps

Now that you have Events-Ting running locally, explore these resources:

### Learn the Architecture
- Read [System Overview](./architecture/system-overview.md)
- Understand the [Tech Stack](./architecture/tech-stack.md)
- Study the [Data Model](./architecture/data-model.md)

### Explore Features
- [Events Module](./modules/events/) - Core event management
- [Registration Module](./modules/registration/) - Attendee registration
- [Schedule Module](./modules/schedule/) - Event scheduling

### Start Contributing
- Check [Contributing Guide](./development/contributing.md)
- Find [good first issues](https://github.com/babblebey/events-ting/labels/good%20first%20issue)
- Review [File Structure](./architecture/file-structure.md)

## 🔧 Development Workflow

### Daily Development

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
pnpm install

# Run migrations (if schema changed)
pnpm run db:generate

# Start dev server
pnpm run dev
```

### Before Committing

```bash
# Run all checks
pnpm run check

# Format code
pnpm run format:write

# Run database migrations (if you changed schema)
pnpm run db:generate
```

### Database Management

```bash
# Create a new migration
pnpm run db:generate

# Reset database (WARNING: deletes all data)
pnpm run db:reset

# Open Prisma Studio
pnpm run db:studio

# Seed sample data
pnpm run db:seed
```

## 🎓 Learning Resources

### Project-Specific
- **[API Reference](./api/routers.md)** - All tRPC procedures
- **[Component Library](./components/ui-system.md)** - UI components guide
- **[Authentication](./architecture/authentication.md)** - Auth patterns

### External Documentation
- **Next.js**: https://nextjs.org/docs
- **tRPC**: https://trpc.io/docs
- **Prisma**: https://www.prisma.io/docs
- **NextAuth.js**: https://next-auth.js.org
- **Flowbite React**: https://flowbite-react.com
- **Tailwind CSS**: https://tailwindcss.com/docs

## 💡 Tips for Success

### Use VS Code Extensions

Install these extensions for better DX:
- **ESLint**: Auto-fix linting errors
- **Prettier**: Format on save
- **Prisma**: Schema highlighting and autocomplete
- **Tailwind CSS IntelliSense**: Class name suggestions
- **Error Lens**: Inline error messages

### Configure VS Code

Add to `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[prisma]": {
    "editor.defaultFormatter": "Prisma.prisma"
  }
}
```

### Use pnpm Scripts

```bash
# See all available scripts
pnpm run

# Common commands
pnpm run dev           # Start dev server
pnpm run build         # Build for production
pnpm run check         # Run all checks
pnpm run db:studio     # Open database GUI
```

## 🆘 Getting Help

### Documentation
1. Check [Troubleshooting Guide](./troubleshooting.md)
2. Search this documentation (Ctrl+F)
3. Review [System Overview](./architecture/system-overview.md)

### Community
- **GitHub Issues**: [Report bugs](https://github.com/babblebey/events-ting/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/babblebey/events-ting/discussions)
- **Pull Requests**: [Contribute code](https://github.com/babblebey/events-ting/pulls)

### Maintainers
- **@babblebey**: Primary maintainer

---

**Congratulations! 🎉** You now have Events-Ting running locally. Happy coding!

---

## 📚 Next Steps

- **[Architecture Overview](./architecture/system-overview.md)** - Understand the system design
- **[Data Model](./architecture/data-model.md)** - Learn the database schema
- **[API Documentation](./api/trpc-overview.md)** - Explore the tRPC API
- **[Module Documentation](./modules/)** - Feature-specific guides
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

---

[← Back to Documentation Index](./index.md) | [Architecture Overview →](./architecture/system-overview.md)

**Last Updated**: November 10, 2025

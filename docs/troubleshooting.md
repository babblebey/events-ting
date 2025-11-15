# Troubleshooting Guide

This guide covers common issues you might encounter when setting up and running the Events-Ting application, along with their solutions.

---

## Table of Contents

- [Setup Issues](#setup-issues)
- [Database Connection Errors](#database-connection-errors)
- [Email Sending Failures](#email-sending-failures)
- [Build Errors](#build-errors)
- [Type Errors](#type-errors)
- [Runtime Errors](#runtime-errors)
- [Performance Issues](#performance-issues)
- [CSV Import Issues](#csv-import-issues)

---

## Setup Issues

### Node.js Version Mismatch

**Problem**: Build fails with syntax errors or package installation issues.

**Symptoms**:
```bash
error Unsupported engine: wanted: {"node":">=18.x"} (current: {"node":"16.x.x"})
```

**Solution**:
1. Check your Node.js version: `node --version`
2. Install Node.js 18 or higher from [nodejs.org](https://nodejs.org)
3. Or use [nvm](https://github.com/nvm-sh/nvm):
   ```bash
   nvm install 18
   nvm use 18
   ```

---

### pnpm Not Installed

**Problem**: Commands fail because pnpm is not available.

**Symptoms**:
```bash
'pnpm' is not recognized as an internal or external command
```

**Solution**:
```bash
npm install -g pnpm
```

Or using Corepack (Node.js 16.13+):
```bash
corepack enable
corepack prepare pnpm@latest --activate
```

---

### Missing Environment Variables

**Problem**: Application fails to start with environment variable errors.

**Symptoms**:
```
Error: Environment variable DATABASE_URL is not set
```

**Solution**:
1. Ensure `.env` file exists in project root
2. Copy from template: `cp .env.example .env`
3. Fill in all required variables:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/events_ting"
   NEXTAUTH_SECRET="your-secret-here"
   NEXTAUTH_URL="http://localhost:3000"
   RESEND_API_KEY="re_..."
   ```
4. Restart the development server

**Required Variables**:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Random string for session encryption
- `NEXTAUTH_URL` - Application URL (http://localhost:3000 for dev)
- `RESEND_API_KEY` - API key from Resend (for emails)

---

## Database Connection Errors

### Cannot Connect to PostgreSQL

**Problem**: Application can't connect to the database.

**Symptoms**:
```
Error: P1001: Can't reach database server at localhost:5432
```

**Solution**:

**On Windows**:
1. Check if PostgreSQL is running:
   ```powershell
   Get-Service -Name postgresql*
   ```
2. Start PostgreSQL service:
   ```powershell
   Start-Service postgresql-x64-15
   ```

**On macOS/Linux**:
```bash
# Check status
sudo systemctl status postgresql

# Start service
sudo systemctl start postgresql
```

**Using Docker**:
```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Or use the provided script
./start-database.sh
```

---

### Database Does Not Exist

**Problem**: Database hasn't been created yet.

**Symptoms**:
```
Error: P1003: Database `events_ting` does not exist
```

**Solution**:

**Option 1: Create manually**:
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE events_ting;
```

**Option 2: Let Prisma create it**:
Update your `DATABASE_URL` to include `?schema=public` and run:
```bash
pnpm prisma db push
```

---

### Migration Errors

**Problem**: Prisma migrations fail or are out of sync.

**Symptoms**:
```
Error: P3006: Migration `20251108035708_add_event_management_system` failed to apply cleanly to the shadow database
```

**Solution**:

**For Development (Safe - will delete data)**:
```bash
# Reset database and reapply all migrations
pnpm prisma migrate reset

# Seed with sample data
pnpm prisma db seed
```

**For Production (Preserves data)**:
```bash
# Mark existing migrations as applied
pnpm prisma migrate resolve --applied 20251108035708_add_event_management_system

# Apply pending migrations
pnpm prisma migrate deploy
```

---

### Connection Pool Exhausted

**Problem**: Too many database connections in production.

**Symptoms**:
```
Error: P1001: Timed out fetching a new connection from the connection pool
```

**Solution**:

**For Vercel/Serverless**:
1. Use connection pooling (PgBouncer or Supabase Pooler)
2. Update `DATABASE_URL` to use pooled connection:
   ```env
   DATABASE_URL="postgresql://user:password@host:6543/db?pgbouncer=true"
   ```
3. Configure Prisma to use lower connection limits:
   ```javascript
   // prisma/schema.prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     directUrl = env("DIRECT_DATABASE_URL") // Non-pooled for migrations
   }
   ```

---

## Email Sending Failures

### Resend API Key Invalid

**Problem**: Emails fail to send with authentication error.

**Symptoms**:
```
Error: 401 Unauthorized - Invalid API key
```

**Solution**:
1. Verify your Resend API key at [resend.com/api-keys](https://resend.com/api-keys)
2. Update `.env`:
   ```env
   RESEND_API_KEY="re_..."
   ```
3. Restart the development server

---

### Domain Not Verified

**Problem**: Emails fail because sender domain isn't verified.

**Symptoms**:
```
Error: Domain 'yourdomain.com' is not verified
```

**Solution**:

**For Development**:
- Use the default `onboarding@resend.dev` sender (100 emails/day limit)

**For Production**:
1. Add your domain in [Resend Dashboard](https://resend.com/domains)
2. Add DNS records provided by Resend
3. Wait for verification (usually 5-10 minutes)
4. Update email templates to use your domain:
   ```typescript
   from: 'noreply@yourdomain.com'
   ```

---

### Rate Limit Exceeded

**Problem**: Too many emails sent in a short period.

**Symptoms**:
```
Error: 429 Too Many Requests - Rate limit exceeded
```

**Solution**:
1. Check your Resend plan limits
2. Implement email queue/batching for bulk sends:
   ```typescript
   // Instead of sending all at once
   await Promise.all(recipients.map(r => sendEmail(r)))
   
   // Use batching
   for (const batch of chunks(recipients, 50)) {
     await Promise.all(batch.map(r => sendEmail(r)))
     await delay(1000) // Wait between batches
   }
   ```
3. Upgrade your Resend plan if needed

---

### Email Templates Not Rendering

**Problem**: React Email templates show errors or don't render.

**Symptoms**:
- HTML output is malformed
- Styles are missing
- Components don't render

**Solution**:
1. Test templates locally:
   ```bash
   pnpm email dev
   ```
2. Check for unsupported React features in email templates
3. Use `@react-email/components` instead of regular React components
4. Ensure all styles are inline or using `@react-email` style components

---

## Build Errors

### TypeScript Compilation Errors

**Problem**: Build fails with TypeScript errors.

**Symptoms**:
```
Error: Type 'string | undefined' is not assignable to type 'string'
```

**Solution**:

**Check for type errors**:
```bash
pnpm tsc --noEmit
```

**Common fixes**:

1. **Missing null checks**:
   ```typescript
   // ❌ Error
   const name = user.name.toUpperCase()
   
   // ✅ Fixed
   const name = user.name?.toUpperCase() ?? 'Unknown'
   ```

2. **Incorrect API types**:
   ```typescript
   // Regenerate Prisma Client after schema changes
   pnpm prisma generate
   ```

3. **Import errors**:
   ```typescript
   // ❌ Wrong
   import { Event } from '@prisma/client'
   
   // ✅ Correct
   import type { Event } from '@prisma/client'
   ```

---

### ESLint Errors

**Problem**: Linting errors prevent build.

**Symptoms**:
```
Error: ESLint: 'variable' is assigned a value but never used
```

**Solution**:

**Fix automatically**:
```bash
pnpm lint --fix
```

**Common issues**:
1. Unused imports - remove them
2. Unused variables - prefix with `_` if intentional: `const _unused = value`
3. Missing dependencies in useEffect - add them to the dependency array

---

### Module Not Found

**Problem**: Import fails to resolve a module.

**Symptoms**:
```
Error: Module not found: Can't resolve '@/components/ui/button'
```

**Solution**:

1. **Check path alias in tsconfig.json**:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

2. **Install missing dependency**:
   ```bash
   pnpm install
   ```

3. **Restart TypeScript server** in VS Code:
   - Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
   - Type "TypeScript: Restart TS Server"

---

### Out of Memory During Build

**Problem**: Build process runs out of memory.

**Symptoms**:
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solution**:

**Increase Node.js memory limit**:
```bash
# PowerShell
$env:NODE_OPTIONS="--max-old-space-size=4096"
pnpm build

# Bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
```

**Or update package.json**:
```json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

---

## Type Errors

### tRPC Type Inference Issues

**Problem**: Type inference breaks for tRPC procedures.

**Symptoms**:
```typescript
// Type is 'any' instead of the actual type
const { data } = api.event.getById.useQuery({ id: '123' })
```

**Solution**:

1. **Regenerate tRPC types**:
   ```bash
   # After changing any router
   pnpm dev
   # Types auto-generate in development mode
   ```

2. **Check router exports**:
   ```typescript
   // src/server/api/root.ts
   export const appRouter = createTRPCRouter({
     event: eventRouter,
     // ... all routers must be exported
   })
   
   export type AppRouter = typeof appRouter
   ```

3. **Verify tRPC client setup**:
   ```typescript
   // src/trpc/react.tsx
   import type { AppRouter } from "@/server/api/root"
   ```

---

### Prisma Type Errors

**Problem**: Prisma-generated types are outdated.

**Symptoms**:
```
Error: Property 'newField' does not exist on type 'Event'
```

**Solution**:
```bash
# Regenerate Prisma Client after schema changes
pnpm prisma generate

# Apply migrations if needed
pnpm prisma migrate dev
```

---

### Zod Validation Type Mismatches

**Problem**: Zod schema doesn't match TypeScript types.

**Symptoms**:
```typescript
// Zod schema expects string, but Prisma type is Date
z.object({ date: z.string() }) // ❌
```

**Solution**:
```typescript
// Use proper Zod types
z.object({
  date: z.date(), // For Date objects
  // OR
  dateString: z.string().datetime(), // For ISO strings
})

// Transform on the backend
z.string().transform((str) => new Date(str))
```

---

## Runtime Errors

### NextAuth Session Undefined

**Problem**: Session is always undefined/null.

**Symptoms**:
```typescript
const session = await getServerAuthSession()
console.log(session) // null
```

**Solution**:

1. **Check NEXTAUTH_SECRET is set**:
   ```bash
   # Generate a secret
   openssl rand -base64 32
   # Add to .env
   ```

2. **Verify NEXTAUTH_URL matches**:
   ```env
   NEXTAUTH_URL="http://localhost:3000"  # Exact URL
   ```

3. **Clear browser cookies**:
   - Open DevTools → Application → Cookies
   - Delete `next-auth.session-token` cookie
   - Sign in again

4. **Check database connection**:
   ```sql
   -- Verify session table exists
   SELECT * FROM "Session" LIMIT 1;
   ```

---

### CORS Errors in API Routes

**Problem**: API calls fail with CORS errors.

**Symptoms**:
```
Access to fetch at 'https://api.example.com' has been blocked by CORS policy
```

**Solution**:

**For external APIs**:
- Make API calls from server-side (tRPC procedures)
- Never expose API keys in client-side code

**For custom API routes**:
```typescript
// src/app/api/webhook/route.ts
export async function POST(request: Request) {
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Access-Control-Allow-Origin': '*', // Or specific domain
      'Access-Control-Allow-Methods': 'POST',
      'Content-Type': 'application/json',
    },
  })
}
```

---

### File Upload Failures

**Problem**: Image uploads fail or don't save.

**Symptoms**:
```
Error: ENOENT: no such file or directory, open '/public/uploads/...'
```

**Solution**:

1. **Ensure upload directory exists**:
   ```bash
   mkdir -p public/uploads/images
   ```

2. **Check file permissions** (Unix systems):
   ```bash
   chmod 755 public/uploads
   ```

3. **Verify form encType**:
   ```typescript
   <form encType="multipart/form-data">
   ```

4. **Check file size limits** (Vercel: 4.5MB for Hobby plan)

---

## Performance Issues

### Slow Database Queries

**Problem**: Pages load slowly due to database queries.

**Symptoms**:
- Pages take >2 seconds to load
- High database CPU usage

**Solution**:

1. **Add database indexes**:
   ```prisma
   model Event {
     id        String   @id @default(cuid())
     slug      String   @unique
     createdAt DateTime @default(now())
     
     @@index([createdAt])
     @@index([slug])
   }
   ```

2. **Use query optimization**:
   ```typescript
   // ❌ N+1 query problem
   const events = await db.event.findMany()
   for (const event of events) {
     const tickets = await db.ticketType.findMany({ where: { eventId: event.id } })
   }
   
   // ✅ Use include/select
   const events = await db.event.findMany({
     include: {
       ticketTypes: true,
     },
   })
   ```

3. **Implement pagination**:
   ```typescript
   const events = await db.event.findMany({
     take: 20,
     skip: page * 20,
     orderBy: { createdAt: 'desc' },
   })
   ```

---

### Large Bundle Size

**Problem**: Application has large JavaScript bundle.

**Symptoms**:
- Slow initial page load
- High Vercel bandwidth usage

**Solution**:

1. **Analyze bundle**:
   ```bash
   pnpm build
   # Check `.next/analyze` output
   ```

2. **Use dynamic imports**:
   ```typescript
   // ❌ Static import
   import { HeavyComponent } from '@/components/heavy'
   
   // ✅ Dynamic import
   const HeavyComponent = dynamic(() => import('@/components/heavy'), {
     loading: () => <Spinner />,
   })
   ```

3. **Optimize images**:
   ```typescript
   import Image from 'next/image'
   
   <Image
     src="/event.jpg"
     width={800}
     height={600}
     alt="Event"
     priority={false}
   />
   ```

---

### Memory Leaks

**Problem**: Application memory usage grows over time.

**Symptoms**:
- Server crashes after running for a while
- Vercel function timeouts

**Solution**:

1. **Clean up effects**:
   ```typescript
   useEffect(() => {
     const interval = setInterval(() => {
       // ...
     }, 1000)
     
     // ✅ Cleanup
     return () => clearInterval(interval)
   }, [])
   ```

2. **Close database connections**:
   ```typescript
   // tRPC procedures automatically handle this
   // For custom API routes:
   await db.$disconnect()
   ```

3. **Monitor production**:
   - Use Vercel Analytics
   - Check function logs for memory spikes

---

## CSV Import Issues

### File Upload Fails

**Problem**: CSV file upload fails or is rejected.

**Symptoms**:
```
Error: File exceeds 10MB limit
Error: File exceeds 10,000 row limit
Error: Please upload a valid CSV file
```

**Solution**:

**For file size issues**:
1. Check file size: Right-click file → Properties
2. If >10MB, split into multiple files:
   ```bash
   # PowerShell - Split CSV into batches of 5000 rows
   $csv = Import-Csv input.csv
   $batchSize = 5000
   $batchNum = 0
   
   for ($i = 0; $i -lt $csv.Count; $i += $batchSize) {
     $csv[$i..([Math]::Min($i + $batchSize - 1, $csv.Count - 1))] | 
       Export-Csv "batch_$batchNum.csv" -NoTypeInformation
     $batchNum++
   }
   ```

**For row count issues**:
- Maximum 10,000 rows per import
- Split large files into batches

**For format issues**:
1. Ensure file is saved as CSV, not Excel (.xlsx)
2. Use UTF-8 encoding:
   - Excel: Save As → CSV UTF-8 (Comma delimited)
   - Google Sheets: File → Download → CSV
3. Check for special characters or encoding issues

---

### Invalid Email Format Errors

**Problem**: Many rows fail with "Invalid email format" error.

**Symptoms**:
```
Row 12: Invalid email format 'john@invalid'
Row 15: Invalid email format 'notanemail'
```

**Solution**:

1. **Validate emails before import**:
   - Use external validation tool
   - Check for common issues:
     - Missing @ symbol
     - Missing domain (.com, .org, etc.)
     - Spaces in email address
     - Special characters

2. **Clean email data**:
   ```python
   # Python script to validate emails
   import re
   import csv
   
   email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
   
   with open('input.csv', 'r') as f:
       reader = csv.DictReader(f)
       valid_rows = []
       invalid_rows = []
       
       for row in reader:
           if re.match(email_regex, row['email']):
               valid_rows.append(row)
           else:
               invalid_rows.append(row)
   
   # Export valid and invalid separately
   with open('valid.csv', 'w', newline='') as f:
       writer = csv.DictWriter(f, fieldnames=reader.fieldnames)
       writer.writeheader()
       writer.writerows(valid_rows)
   ```

3. **Download error report** and fix emails manually

---

### Ticket Type Not Found

**Problem**: All rows fail with "Ticket type not found" error.

**Symptoms**:
```
Row 5: Ticket type 'VIP Pass' not found
Row 6: Ticket type 'General Admission' not found
```

**Solution**:

**Option 1: Create missing ticket types**
1. Go to Event Dashboard → Tickets
2. Create ticket types matching CSV values exactly
3. Re-import CSV

**Option 2: Update CSV to match existing ticket types**
1. Check existing ticket type names in event
2. Update CSV column to match (case-insensitive)
3. Example: "VIP" → "VIP Pass"

**Common mistakes**:
- Extra spaces: "VIP Pass " (with trailing space)
- Different capitalization: "vip pass" vs "VIP Pass" (both work)
- Typos: "Genral Admission" vs "General Admission"

**Tip**: Copy exact ticket type name from event and paste into CSV

---

### Duplicate Detection Issues

**Problem**: Getting unexpected duplicate errors.

**Symptoms**:
```
Row 15: Duplicate email in file (first at row 5)
Row 20: Email already registered for this event
```

**Solution**:

**For in-file duplicates**:
1. Download error report
2. Remove duplicate rows from CSV
3. Keep only first occurrence
4. Excel: Data → Remove Duplicates → Select Email column

**For database duplicates**:
1. Check if attendees are truly duplicates:
   - Review attendee list in dashboard
   - Verify email address matches exactly
2. If legitimate duplicates:
   - Change duplicate strategy to "Create new"
   - WARNING: This creates multiple registrations for same email
3. If typos:
   - Fix email in CSV
   - Re-import

**To find duplicates in Excel**:
1. Select email column
2. Home → Conditional Formatting → Highlight Duplicate Values
3. Review and remove duplicates

---

### Field Mapping Not Saving

**Problem**: Field mappings reset every import.

**Symptoms**:
- Must re-map fields for each import
- Auto-suggestions not remembering previous mappings

**Solution**:

1. **Check browser localStorage**:
   - Open DevTools → Application → Local Storage
   - Look for key: `events-ting:import-mapping:{eventId}`
   - If missing, localStorage might be disabled

2. **Enable localStorage**:
   - Chrome: Settings → Privacy → Site Settings → Cookies → Allow all
   - Firefox: Options → Privacy → Custom → Cookies → Keep until expired

3. **Clear and retry**:
   ```javascript
   // In browser console
   localStorage.clear()
   // Refresh page and re-import
   ```

4. **Workaround**: Save field mapping as reference document for future imports

---

### Import Takes Too Long

**Problem**: Import processing for >30 seconds with no progress.

**Symptoms**:
- Spinner shows "Importing attendees..." indefinitely
- No error message
- Browser tab not responding

**Solution**:

**For large imports (>1000 rows)**:
- **Expected behavior**: Large imports take 1-2 minutes
- Wait for completion
- Do not close or refresh browser

**If truly stuck (>5 minutes)**:
1. Check browser console for errors (F12)
2. Check network tab for failed requests
3. Possible database timeout:
   - Retry with smaller batch (<500 rows)
   - Contact support if issue persists

**Optimization tips**:
- Split large files into batches of 500-1000 rows
- Import during off-peak hours
- Disable confirmation emails for large imports (faster)

---

### Confirmation Emails Not Sent

**Problem**: Imported attendees didn't receive confirmation emails.

**Symptoms**:
- Import successful
- Email checkbox was checked
- Attendees report no email received

**Solution**:

1. **Verify email checkbox was checked**:
   - In Step 1: "Send confirmation emails" must be enabled
   - Default is unchecked

2. **Check email status in attendee list**:
   - Navigate to Attendees page
   - Look for "Email Status" column
   - If "Bounced": Email address is invalid
   - If "Active": Email should have been sent

3. **Check spam folder**:
   - Confirmation emails might be marked as spam
   - Ask attendees to check spam/junk folder

4. **Resend manually**:
   - From attendee list, click mail icon for specific attendee
   - Bulk resend not available yet (future feature)

5. **Check Resend API status**:
   - Verify `RESEND_API_KEY` is set correctly
   - Check Resend dashboard for send logs
   - Verify domain is verified (production)

---

### Custom Fields Not Appearing

**Problem**: Custom data from CSV not showing in attendee records.

**Symptoms**:
- Imported successfully
- Custom columns (company, role, etc.) not visible

**Solution**:

**Custom fields are stored in `customData` JSON**:
1. Custom fields don't appear as separate columns in attendee list
2. Stored in database as JSON in `customData` field
3. To view custom data:
   - Export attendees as CSV (includes custom fields)
   - Check database directly in Prisma Studio: `pnpm prisma studio`
   - Future: Attendee detail page will show custom fields

**Verify custom fields are stored**:
```sql
-- In Prisma Studio or database client
SELECT customData FROM "Registration" WHERE id = 'registration-id';

-- Should show:
{
  "registrationCode": "ABC123DEF",
  "company": "Acme Corp",
  "role": "Developer"
}
```

**If custom data is missing**:
1. Verify columns were NOT mapped to "-- Do not import --"
2. Check field mapping in Step 2
3. Re-import with correct mapping

---

### Encoding Issues (Special Characters)

**Problem**: Names with accents or special characters appear as garbled text.

**Symptoms**:
```
Expected: José García
Displayed: JosÃ© GarcÃ­a
```

**Solution**:

**Ensure CSV is UTF-8 encoded**:

**Excel**:
1. Save As → CSV UTF-8 (Comma delimited)
2. NOT "CSV (Comma delimited)" (uses Windows-1252)

**Google Sheets**:
1. File → Download → Comma-separated values (.csv)
2. Automatically UTF-8

**Notepad++ (to convert)**:
1. Open CSV in Notepad++
2. Encoding → Convert to UTF-8
3. Save

**LibreOffice Calc**:
1. Save As → Text CSV
2. Character set: Unicode (UTF-8)
3. Save

**Verify encoding**:
```powershell
# PowerShell - Check file encoding
Get-Content file.csv | Select-Object -First 1 | Format-Hex
# Look for UTF-8 BOM: EF BB BF (automatically stripped by import)
```

---

### Validation Errors for Valid Data

**Problem**: Valid rows showing validation errors.

**Symptoms**:
```
Row 10: Name too short (but name is "John Doe")
Row 15: Invalid email (but email is valid)
```

**Solution**:

1. **Check for hidden characters**:
   - Extra spaces before/after values
   - Tab characters
   - Line breaks within cells

2. **Clean CSV data**:
   ```python
   # Python script to clean CSV
   import csv
   
   with open('input.csv', 'r', encoding='utf-8') as f:
       reader = csv.DictReader(f)
       rows = []
       for row in reader:
           # Strip whitespace from all values
           cleaned_row = {k: v.strip() if v else '' for k, v in row.items()}
           rows.append(cleaned_row)
   
   with open('cleaned.csv', 'w', newline='', encoding='utf-8') as f:
       writer = csv.DictWriter(f, fieldnames=reader.fieldnames)
       writer.writeheader()
       writer.writerows(rows)
   ```

3. **Excel method**:
   - Select all cells
   - Find & Replace (Ctrl+H)
   - Find: Extra spaces (multiple spaces)
   - Replace: Single space

4. **Re-import cleaned CSV**

---

### Import Stuck at Validation Step

**Problem**: Validation step never completes.

**Symptoms**:
- "Validating data..." spinner indefinitely
- No progress after 1-2 minutes

**Solution**:

1. **Check browser console** (F12):
   - Look for API errors
   - Network timeout errors

2. **Possible causes**:
   - Very large file (>5000 rows)
   - Database connection issue
   - Server timeout

3. **Retry with smaller file**:
   - Split CSV into batches of 1000 rows
   - Import one batch at a time

4. **Refresh and retry**:
   - Refresh browser page
   - Re-upload file
   - If issue persists, contact support

---

## Getting More Help

If your issue isn't covered here:

1. **Check the documentation**:
   - [Getting Started](./getting-started.md)
   - [Module Documentation](./modules/)
   - [API Reference](./api/)

2. **Search existing issues**:
   - [GitHub Issues](https://github.com/babblebey/events-ting/issues)

3. **Ask for help**:
   - Create a new issue with:
     - Clear description of the problem
     - Steps to reproduce
     - Expected vs actual behavior
     - Environment details (OS, Node version, etc.)
     - Relevant error messages and logs

4. **Common resources**:
   - [Next.js Documentation](https://nextjs.org/docs)
   - [tRPC Documentation](https://trpc.io/docs)
   - [Prisma Documentation](https://www.prisma.io/docs)
   - [Tailwind CSS](https://tailwindcss.com/docs)
   - [Flowbite React](https://flowbite-react.com)

---

## Prevention Tips

1. **Always use version control**:
   ```bash
   git commit -m "Working state before changes"
   ```

2. **Test locally before deploying**:
   ```bash
   pnpm build
   pnpm start
   ```

3. **Keep dependencies updated**:
   ```bash
   pnpm update
   ```

4. **Use TypeScript strictly**:
   - Enable `strict: true` in tsconfig.json
   - Fix type errors immediately

5. **Monitor production**:
   - Set up error tracking (Sentry)
   - Check Vercel logs regularly
   - Monitor database performance

---

## 📚 Related Documentation

- **[Getting Started](./getting-started.md)** - Initial setup guide
- **[Development Setup](./development/setup.md)** - Complete environment setup
- **[Database Migrations](./development/database-migrations.md)** - Prisma workflow
- **[Deployment Guides](./deployment/)** - Production deployment
- **[API Documentation](./api/)** - tRPC reference

---

[← Back to Documentation Index](./index.md) | [Getting Started →](./getting-started.md)

**Last Updated**: November 10, 2025

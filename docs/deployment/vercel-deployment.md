# Vercel Deployment Guide

This comprehensive guide covers deploying Events-Ting to Vercel, including database setup, environment configuration, and custom domain setup.

---

## Overview

**Vercel** is the recommended hosting platform for Events-Ting, offering:

✅ Zero-config Next.js deployments  
✅ Automatic HTTPS and CDN  
✅ Preview deployments for pull requests  
✅ Built-in PostgreSQL database (Vercel Postgres)  
✅ Edge network (global performance)  
✅ Free tier for hobby projects  

---

## Prerequisites

- GitHub account with Events-Ting repository
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Resend API key (see [Email Setup](./email-setup.md))
- Domain name (optional, for custom domain)

---

## Step 1: Connect GitHub Repository

### Import Project

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository:
   - If first time: Click "Import Git Repository" → Authorize GitHub
   - Select `events-ting` repository
4. Click "Import"

---

### Configure Project

**Framework Preset**: Next.js (auto-detected)

**Root Directory**: `./` (leave default)

**Build Settings**:
- **Build Command**: `pnpm build`
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `pnpm install`

**Node.js Version**: 18.x or 20.x (recommended)

Click "Deploy" (we'll add environment variables next).

---

## Step 2: Create Vercel Postgres Database

### Create Database

1. Go to your project dashboard
2. Click "Storage" tab
3. Click "Create Database" → "Postgres"
4. Configure:
   - **Database Name**: `events-ting-production` (or any name)
   - **Region**: Choose closest to your primary users
     - `us-east-1` (Virginia, USA)
     - `eu-west-1` (Dublin, Ireland)
     - `ap-northeast-1` (Tokyo, Japan)
5. Click "Create"

Database is provisioned in ~30 seconds.

---

### Get Connection String

1. Click on your Postgres database in Storage
2. Navigate to **Quickstart** tab
3. Copy connection string from `.env.local` tab

**You'll see two connection strings**:

#### Direct Connection
```
POSTGRES_URL="postgres://default:xxx@xxx.aws.region.postgres.vercel-storage.com:5432/verceldb"
```
**Use for**: Migrations, administrative tasks

#### Pooled Connection (Recommended)
```
POSTGRES_URL="postgres://default:xxx@xxx-pooler.aws.region.postgres.vercel-storage.com:5432/verceldb"
```
**Use for**: Application runtime (serverless functions)

⚠️ **Important**: Use the **pooled connection** (`-pooler`) for `DATABASE_URL`.

---

## Step 3: Configure Environment Variables

### Add Required Variables

1. Go to **Settings** → **Environment Variables**
2. Add each variable:

#### Database
```
Key: DATABASE_URL
Value: postgres://default:xxx@xxx-pooler.aws.region.postgres.vercel-storage.com:5432/verceldb
Environments: ✅ Production, ✅ Preview, ✅ Development
```

#### Authentication
```
Key: NEXTAUTH_SECRET
Value: [Generate with: openssl rand -base64 32]
Environments: ✅ Production, ✅ Preview
```

```
Key: NEXTAUTH_URL
Value: https://your-domain.vercel.app (or custom domain)
Environments: ✅ Production
```

#### Email
```
Key: RESEND_API_KEY
Value: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Environments: ✅ Production, ✅ Preview
```

---

### Environment Scope

- **Production**: Used for main branch deployments
- **Preview**: Used for pull request deployments
- **Development**: Used when running `vercel dev` locally

**Best Practice**: Use different API keys/secrets for Production vs Preview.

---

## Step 4: Run Database Migrations

Migrations run automatically during build via the build command:

**In `package.json`**:
```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

This ensures:
1. Prisma Client is generated
2. Database migrations are applied
3. Next.js builds the application

---

### Manual Migration (if needed)

If migrations fail during build:

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Link to project
vercel link

# Pull environment variables
vercel env pull .env.production

# Run migrations manually
pnpm prisma migrate deploy
```

---

## Step 5: Deploy

### Automatic Deployment

Vercel automatically deploys when you:
1. Push to the `main` branch (Production)
2. Open a pull request (Preview deployment)

### Manual Deployment

Trigger from dashboard:
1. Go to **Deployments** tab
2. Click "..." → "Redeploy"

Or via CLI:
```bash
vercel --prod
```

---

### Deployment Process

1. **Build**: Vercel runs `pnpm build`
   - Generates Prisma Client
   - Runs database migrations
   - Builds Next.js app
2. **Optimize**: Compresses assets, generates static pages
3. **Deploy**: Pushes to global edge network
4. **Health Check**: Verifies deployment is live

**Average deployment time**: 2-3 minutes

---

## Step 6: Verify Deployment

### Check Deployment Status

1. Go to **Deployments** tab
2. Click on latest deployment
3. View build logs for any errors

### Test Application

1. Visit deployment URL: `https://your-project.vercel.app`
2. Test key flows:
   - Sign up / Login
   - Create an event
   - Register for an event
   - Check email delivery

---

### View Logs

**Runtime Logs**:
1. Go to **Logs** tab in project dashboard
2. Filter by:
   - Function (page/API route)
   - Status code
   - Time range

**Build Logs**:
1. Click on a deployment
2. View "Building" section

---

## Step 7: Custom Domain Setup

### Add Custom Domain

1. Go to **Settings** → **Domains**
2. Click "Add"
3. Enter your domain: `events.yourdomain.com`
4. Click "Add"

---

### Configure DNS

Vercel provides DNS records to add to your domain registrar:

#### Subdomain (e.g., events.yourdomain.com)
```
Type: CNAME
Name: events
Value: cname.vercel-dns.com
```

#### Apex Domain (e.g., yourdomain.com)
```
Type: A
Name: @
Value: 76.76.21.21
```

**Or use Vercel Nameservers** (recommended):
1. In Vercel: Settings → Domains → Your domain → Nameservers
2. Copy Vercel nameservers
3. Update nameservers in your domain registrar

---

### Verify Domain

1. Add DNS records to your registrar (Cloudflare, Namecheap, GoDaddy, etc.)
2. Wait for DNS propagation (can take 24-48 hours)
3. Vercel automatically provisions SSL certificate
4. Domain shows ✅ "Valid Configuration"

---

### Update NEXTAUTH_URL

After domain is verified:

1. **Settings** → **Environment Variables**
2. Edit `NEXTAUTH_URL`
3. Update value to: `https://events.yourdomain.com`
4. Redeploy

---

## Step 8: Set Up Vercel Environment (Optional)

### Preview Deployments

Every pull request gets a unique URL:
- `https://events-ting-git-feature-branch-yourname.vercel.app`

**Test changes** before merging to production.

**Configuration**:
- Settings → Git → Enable "Automatic Deployments from Pull Requests"
- Choose branches to deploy (all or specific)

---

### Environment-Specific Variables

Use different values for Production vs Preview:

**Example**: Use different Resend API keys
1. Create `RESEND_API_KEY` for Production
2. Create `RESEND_API_KEY` for Preview (optional: same as prod or test key)

---

## Build Configuration

### Build & Output Settings

**Override default settings** if needed:

1. **Settings** → **General** → **Build & Development Settings**

**Options**:
- **Framework Preset**: Next.js
- **Build Command**: `pnpm build` (or custom)
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`

---

### Environment Variables in Build

Access environment variables during build:

```typescript
// next.config.js
module.exports = {
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXTAUTH_URL,
  },
};
```

**Note**: Only `NEXT_PUBLIC_*` variables are exposed to the browser.

---

## Performance Optimization

### Edge Caching

Next.js automatically caches static pages at the edge.

**Configure caching** with `revalidate`:

```typescript
// app/events/page.tsx
export const revalidate = 3600; // Revalidate every hour
```

---

### Image Optimization

Next.js `<Image>` component automatically optimized by Vercel:
- WebP/AVIF conversion
- Responsive images
- Lazy loading

**No additional configuration needed.**

---

### Analytics (Optional)

Enable Vercel Analytics:

1. Go to **Analytics** tab
2. Click "Enable Analytics"
3. Install package:
   ```bash
   pnpm add @vercel/analytics
   ```
4. Add to layout:
   ```tsx
   import { Analytics } from '@vercel/analytics/react';
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     );
   }
   ```

---

## Security Best Practices

### ✅ DO
- Use environment variables for all secrets
- Enable "Deployment Protection" in Settings → Security
- Use different secrets for Production vs Preview
- Rotate `NEXTAUTH_SECRET` periodically
- Enable 2FA on Vercel account
- Review deployment logs regularly

### ❌ DON'T
- Commit secrets to Git
- Use the same API keys for dev and prod
- Expose `DATABASE_URL` in client-side code
- Disable HTTPS (always use secure connections)

---

## Troubleshooting

### Build Fails: "Prisma Client Not Generated"

**Cause**: `prisma generate` not running during build  
**Solution**: Ensure build command includes `prisma generate`:
```json
"build": "prisma generate && prisma migrate deploy && next build"
```

---

### Build Fails: "Migration Failed"

**Cause**: Database not accessible or migration SQL error  
**Solution**:
1. Verify `DATABASE_URL` is set correctly in environment variables
2. Check build logs for specific SQL error
3. Run migrations locally first to test
4. Use direct connection (not pooled) for migrations:
   ```json
   "build": "DATABASE_URL=$POSTGRES_URL prisma migrate deploy && next build"
   ```

---

### "NEXTAUTH_SECRET" Missing Error

**Cause**: `NEXTAUTH_SECRET` not set in production  
**Solution**:
1. Settings → Environment Variables
2. Add `NEXTAUTH_SECRET` with generated value
3. Redeploy

---

### Database Connection Timeout

**Cause**: Using direct connection instead of pooled  
**Solution**: Ensure `DATABASE_URL` uses `-pooler` endpoint:
```
postgres://default:xxx@xxx-pooler.aws.region.postgres.vercel-storage.com:5432/verceldb
```

---

### "Too Many Connections" Error

**Cause**: Connection pool exhausted  
**Solution**:
1. Use pooled connection (`-pooler` endpoint)
2. Reduce `connection_limit` in Prisma schema:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     directUrl = env("POSTGRES_URL")
   }
   ```
3. Implement connection pooling (PgBouncer)

---

### Environment Variables Not Updating

**Cause**: Vercel caches environment variables  
**Solution**:
1. Update variables in Settings
2. Trigger new deployment (push commit or manual redeploy)

---

### Domain Not Resolving

**Cause**: DNS not propagated or misconfigured  
**Solution**:
1. Verify DNS records in registrar match Vercel instructions
2. Wait 24-48 hours for propagation
3. Use [DNS Checker](https://dnschecker.org) to verify
4. Try Vercel Nameservers instead of CNAME

---

## Monitoring & Maintenance

### View Deployment Metrics

**Metrics Tab**:
- Request count
- Response time
- Bandwidth usage
- Error rate

**Logs Tab**:
- Runtime logs (API routes, server components)
- Filter by time, status code, function

---

### Set Up Alerts (Pro Plan)

Configure alerts for:
- Deployment failures
- High error rates
- Performance degradation

**Integrations**: Slack, email, webhooks

---

### Database Backups

Vercel Postgres includes automatic backups:
- **Frequency**: Daily
- **Retention**: 7 days (Pro), 30 days (Enterprise)

**Manual backup**:
```bash
# Pull production DB URL
vercel env pull .env.production

# Backup with pg_dump
pg_dump $(grep POSTGRES_URL .env.production | cut -d '=' -f2) > backup.sql
```

---

## Scaling Considerations

### Vercel Plans

| Feature | Hobby (Free) | Pro ($20/mo) | Enterprise |
|---------|-------------|--------------|------------|
| Bandwidth | 100GB | 1TB | Custom |
| Build time | 6,000 min/mo | Unlimited | Unlimited |
| Team members | 1 | Unlimited | Unlimited |
| Domains | Unlimited | Unlimited | Unlimited |
| Analytics | ✅ | ✅ Advanced | ✅ Advanced |
| Support | Community | Email | Priority |

**Recommendation**: Start with Hobby, upgrade to Pro when needed.

---

### Database Scaling

Vercel Postgres:
- **Storage**: 256MB (Hobby), 256GB+ (Pro)
- **Compute**: Shared (Hobby), dedicated (Pro)

**Scale up**: Settings → Storage → [Your Postgres DB] → Upgrade

**Alternative**: Migrate to Neon, Railway, or AWS RDS for advanced needs.

---

## CI/CD Integration

### GitHub Actions (Optional)

Add additional CI checks before deployment:

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
  
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm tsc --noEmit
```

Vercel deploys only after GitHub Actions pass.

---

## Cost Estimation

### Free Tier (Hobby)
- **Hosting**: $0/month
- **Vercel Postgres**: $0 (256MB storage, limited compute)
- **Bandwidth**: 100GB/month
- **Builds**: 6,000 minutes/month

**Estimated cost**: $0/month for small events (<1,000 registrations/month)

---

### Paid Tier (Pro)
- **Hosting**: $20/month
- **Vercel Postgres**: $0.20/GB storage + compute hours
- **Bandwidth**: 1TB included
- **Builds**: Unlimited

**Estimated cost**: $20-30/month for medium events (<10,000 registrations/month)

---

### Additional Costs
- **Resend**: $20/month (50,000 emails)
- **AWS S3**: ~$1/month (10GB storage + bandwidth)
- **Custom Domain**: $10-15/year (domain registrar)

**Total**: ~$30-50/month for production workload

---

## Related Documentation

- [Environment Variables](./environment-variables.md) - Configure all required variables
- [Database Setup](./database-setup.md) - PostgreSQL and Prisma setup
- [Email Setup](./email-setup.md) - Resend configuration
- [Storage Setup](./storage-setup.md) - File upload configuration
- [Development Setup](../development/setup.md) - Local development guide

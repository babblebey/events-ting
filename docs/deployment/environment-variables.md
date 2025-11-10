# Environment Variables

This document lists all environment variables required to run Events-Ting in both development and production environments.

---

## Quick Setup

Create a `.env` file in the root of your project:

```bash
cp .env.example .env
```

Then fill in the required values as described below.

---

## Required Variables

### Database

#### `DATABASE_URL`
**Type**: String (Connection URL)  
**Required**: Yes  
**Description**: PostgreSQL database connection string

**Format**:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

**Examples**:
```bash
# Local development
DATABASE_URL="postgresql://postgres:password@localhost:5432/events_ting?schema=public"

# Production (Vercel Postgres)
DATABASE_URL="postgres://default:xxx@xxx-pooler.aws.region.postgres.vercel-storage.com:5432/verceldb?sslmode=require"

# Production (Neon)
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
```

**Notes**:
- Use connection pooling in production (e.g., Vercel Postgres with `-pooler` endpoint)
- SSL mode is required for most production databases
- Ensure the database exists before running migrations

---

### Authentication

#### `NEXTAUTH_SECRET`
**Type**: String (Random secret)  
**Required**: Yes  
**Description**: Secret key used to encrypt NextAuth.js session tokens

**Generate**:
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Example**:
```bash
NEXTAUTH_SECRET="your-generated-secret-here-32-chars-minimum"
```

**Security Notes**:
- **NEVER** commit this to version control
- Use different secrets for development and production
- Minimum 32 characters recommended

---

#### `NEXTAUTH_URL`
**Type**: String (URL)  
**Required**: Yes (in production)  
**Description**: Canonical URL of your application

**Examples**:
```bash
# Local development (auto-detected, but can be explicit)
NEXTAUTH_URL="http://localhost:3000"

# Production
NEXTAUTH_URL="https://your-domain.com"
```

**Notes**:
- Not required in local development (Next.js auto-detects)
- Required in production for OAuth callbacks and redirects

---

### Email Service

#### `RESEND_API_KEY`
**Type**: String (API Key)  
**Required**: Yes (for email features)  
**Description**: API key from [Resend](https://resend.com) for sending transactional emails

**Get API Key**:
1. Sign up at [resend.com](https://resend.com)
2. Navigate to API Keys section
3. Create a new API key with appropriate permissions

**Example**:
```bash
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Features requiring Resend**:
- Registration confirmation emails
- CFP submission received emails
- CFP acceptance/rejection emails
- Email campaigns (communications module)

**Notes**:
- Free tier: 100 emails/day, 3,000 emails/month
- Verify your domain for production use (see [Email Setup](./email-setup.md))
- Test emails are sent to your Resend account email in development

---

## Optional Variables

### `NODE_ENV`
**Type**: String  
**Default**: `development`  
**Options**: `development` | `production` | `test`  
**Description**: Node.js environment mode

**Examples**:
```bash
NODE_ENV="development"  # Local development
NODE_ENV="production"   # Production deployment
```

**Notes**:
- Automatically set by Next.js and Vercel
- Affects logging, error handling, and optimization

---

### `PORT`
**Type**: Number  
**Default**: `3000`  
**Description**: Port for the Next.js development server

**Example**:
```bash
PORT=3001
```

---

### File Storage (Future)

#### `AWS_S3_BUCKET`
**Type**: String  
**Required**: No (future feature)  
**Description**: AWS S3 bucket name for image uploads

**Example**:
```bash
AWS_S3_BUCKET="events-ting-uploads"
```

---

#### `AWS_REGION`
**Type**: String  
**Default**: `us-east-1`  
**Description**: AWS region for S3 bucket

---

#### `AWS_ACCESS_KEY_ID`
**Type**: String  
**Required**: No (future feature)  
**Description**: AWS access key for S3 uploads

---

#### `AWS_SECRET_ACCESS_KEY`
**Type**: String  
**Required**: No (future feature)  
**Description**: AWS secret key for S3 uploads

**Notes**:
- Currently, Events-Ting uses local file storage (`public/uploads`)
- S3 support planned for production deployments

---

## Environment-Specific Configurations

### Local Development

**Minimal `.env` for local development**:
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/events_ting?schema=public"
NEXTAUTH_SECRET="your-local-dev-secret-minimum-32-characters"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Features**:
- Local PostgreSQL database
- Local file storage in `public/uploads/`
- Resend test mode (emails sent to your account email)

---

### Production (Vercel)

**Required environment variables in Vercel dashboard**:
```bash
DATABASE_URL="postgres://default:xxx@xxx-pooler.aws.region.postgres.vercel-storage.com:5432/verceldb?sslmode=require"
NEXTAUTH_SECRET="different-secret-for-production-keep-this-secure"
NEXTAUTH_URL="https://your-domain.com"
RESEND_API_KEY="re_production_key_xxxxxxxxxxxxxxxx"
```

**Additional considerations**:
- Use Vercel Postgres connection pooling endpoint (`-pooler`)
- Set environment variables in Vercel dashboard (not in code)
- Verify Resend domain before production use

See [Vercel Deployment Guide](./vercel-deployment.md) for detailed instructions.

---

## Security Best Practices

### ✅ DO
- Use `.env.local` for local secrets (not tracked by Git)
- Generate strong, unique secrets for each environment
- Use different API keys for development and production
- Store production secrets in Vercel/hosting platform dashboard
- Rotate secrets periodically (especially after team member departure)

### ❌ DON'T
- Commit `.env` files to version control
- Share secrets via email, Slack, or other insecure channels
- Use production secrets in development
- Hardcode secrets in source code
- Use weak or default secrets

---

## Troubleshooting

### "Invalid `prisma.client` invocation"
**Cause**: Missing or incorrect `DATABASE_URL`  
**Solution**: Verify PostgreSQL is running and connection string is correct

### "NEXTAUTH_SECRET not found"
**Cause**: Missing `NEXTAUTH_SECRET` in production  
**Solution**: Add to Vercel environment variables and redeploy

### "Failed to send email"
**Cause**: Invalid or missing `RESEND_API_KEY`  
**Solution**: Verify API key in Resend dashboard, check rate limits

### Environment variables not updating
**Cause**: Vercel caches environment variables  
**Solution**: Trigger a new deployment after updating variables

---

## Related Documentation

- [Database Setup](./database-setup.md) - PostgreSQL installation and Prisma setup
- [Email Setup](./email-setup.md) - Resend configuration and domain verification
- [Vercel Deployment](./vercel-deployment.md) - Production deployment guide
- [Development Setup](../development/setup.md) - Local development environment

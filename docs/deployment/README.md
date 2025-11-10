# Deployment Documentation

This directory contains comprehensive guides for deploying and configuring Events-Ting in production environments.

## 📚 Contents

### [Vercel Deployment Guide](./vercel-deployment.md)
Complete guide for deploying Events-Ting to Vercel, the recommended hosting platform for Next.js applications.

**Topics covered:**
- Vercel platform overview and benefits
- Prerequisites and account setup
- Connecting GitHub repository
- Environment variable configuration
- Database setup (Vercel Postgres)
- Custom domain configuration
- Preview deployments
- Production deployment
- Monitoring and troubleshooting
- CI/CD integration

### [Environment Variables](./environment-variables.md)
Complete reference of all environment variables required to run Events-Ting in development and production.

**Topics covered:**
- Required vs. optional variables
- Database configuration
- Authentication secrets (NextAuth.js)
- Email service (Resend)
- Storage configuration
- OAuth providers (Google, GitHub, Discord)
- Application settings
- Security best practices
- Environment-specific values

### [Database Setup](./database-setup.md)
Guide for setting up PostgreSQL and managing the database in both local development and production environments.

**Topics covered:**
- Local PostgreSQL installation (macOS, Windows, Linux)
- Database creation and configuration
- Connection string setup
- Prisma migrations
- Production database options (Vercel Postgres, Supabase, Neon)
- Database backups
- Performance optimization
- Security considerations
- Troubleshooting

### [Email Setup with Resend](./email-setup.md)
Complete guide for configuring email functionality using Resend for transactional and bulk emails.

**Topics covered:**
- Resend account creation
- Domain verification (DNS records)
- API key generation
- Email template testing
- Sending limits and quotas
- Production considerations
- Email types (transactional, bulk)
- Troubleshooting delivery issues
- Alternative email providers

### [Storage Setup](./storage-setup.md)
Guide for configuring file storage for uploaded images and assets.

**Topics covered:**
- Current local storage implementation
- File upload configuration
- Storage directory structure
- Supported file types
- Future cloud storage options (AWS S3)
- Image optimization
- Security considerations
- Migration from local to cloud storage

## 🔗 Related Documentation

- [Architecture Overview](../architecture/system-overview.md) - Understand the system architecture
- [Development Setup](../development/setup.md) - Local development environment
- [Technology Stack](../architecture/tech-stack.md) - Technologies used

## 🚀 Quick Start Deployment

### Recommended Path (Vercel)

1. **[Vercel Deployment](./vercel-deployment.md)** - Deploy the application
2. **[Environment Variables](./environment-variables.md)** - Configure secrets
3. **[Database Setup](./database-setup.md)** - Set up Vercel Postgres
4. **[Email Setup](./email-setup.md)** - Configure Resend
5. **[Storage Setup](./storage-setup.md)** - Configure file storage

### Minimum Viable Deployment

For a basic deployment, you need:
- ✅ Vercel account and deployment
- ✅ PostgreSQL database (Vercel Postgres or other)
- ✅ Environment variables configured
- ✅ Database migrations applied

Optional but recommended:
- 📧 Email service configured (Resend)
- 🔐 OAuth providers (Google, GitHub)
- 💾 Cloud storage (AWS S3)

## 💡 Common Deployment Tasks

### Initial Deployment
1. Follow [Vercel Deployment Guide](./vercel-deployment.md)
2. Set up all [Environment Variables](./environment-variables.md)
3. Configure [Database](./database-setup.md)
4. Set up [Email Service](./email-setup.md)

### Updating Environment Variables
See [Environment Variables](./environment-variables.md#updating-variables)

### Database Migrations
See [Database Setup](./database-setup.md#migrations)

### Custom Domain Setup
See [Vercel Deployment](./vercel-deployment.md#custom-domains)

### Email Domain Verification
See [Email Setup](./email-setup.md#domain-verification)

### Troubleshooting Deployment Issues
See troubleshooting sections in respective guides

## 🏗️ Deployment Checklist

### Pre-Deployment
- [ ] Code tested locally
- [ ] All tests passing
- [ ] Environment variables prepared
- [ ] Database schema finalized
- [ ] Email templates tested

### Initial Deployment
- [ ] Vercel project created
- [ ] GitHub repository connected
- [ ] Environment variables configured
- [ ] Database provisioned
- [ ] Initial migration applied
- [ ] Email service configured
- [ ] Storage configured

### Post-Deployment
- [ ] Application accessible
- [ ] Database connections working
- [ ] Authentication working
- [ ] Email sending working
- [ ] File uploads working
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up

## 🔒 Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] DATABASE_URL uses SSL connection
- [ ] NEXTAUTH_SECRET is strong and unique
- [ ] OAuth secrets are secure
- [ ] API keys are restricted (when possible)
- [ ] CORS configured properly
- [ ] Rate limiting enabled (optional)
- [ ] Database backups configured

## 📊 Monitoring & Maintenance

### Vercel Dashboard
- Monitor deployments
- View logs and analytics
- Check performance metrics
- Review errors and issues

### Database Monitoring
- Query performance
- Connection pool usage
- Storage usage
- Backup status

### Email Monitoring
- Delivery rates
- Bounce rates
- API usage
- Quota limits

## 🆘 Support Resources

### Documentation
- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Resend Documentation](https://resend.com/docs)

### Troubleshooting
- Check individual guide troubleshooting sections
- Review [Development Troubleshooting](../troubleshooting.md)
- Check Vercel deployment logs

## 📖 For Different Audiences

### DevOps Engineers
Focus on [Vercel Deployment](./vercel-deployment.md) and [Database Setup](./database-setup.md).

### Developers
Review [Environment Variables](./environment-variables.md) and all setup guides.

### System Administrators
Focus on security, monitoring, and backup sections in all guides.

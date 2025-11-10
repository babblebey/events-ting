# Events-Ting Documentation

Welcome to the comprehensive developer documentation for Events-Ting, an all-in-one event management system.

---

## 🚀 Getting Started

New to Events-Ting? Start here:

1. **[Getting Started Guide](./getting-started.md)** - Set up your local development environment in 10 minutes
2. **[Architecture Overview](./architecture/system-overview.md)** - Understand the system design
3. **[Tech Stack](./architecture/tech-stack.md)** - Learn about the technologies we use

---

## 📚 Documentation Structure

### Architecture

Understanding how everything fits together:

- **[System Overview](./architecture/system-overview.md)** - High-level architecture and design patterns
- **[Tech Stack](./architecture/tech-stack.md)** - Next.js, tRPC, Prisma, and more
- **[Data Model](./architecture/data-model.md)** - Database schema and relationships
- **[Authentication](./architecture/authentication.md)** - NextAuth.js setup and session management
- **[File Structure](./architecture/file-structure.md)** - Project organization and conventions

### Modules

Feature-specific documentation organized by domain:

#### Core Modules
- **[Events](./modules/events/)** - Event creation, publishing, and management
- **[Tickets](./modules/tickets/)** - Ticket types and availability management
- **[Registration](./modules/registration/)** - Attendee registration and check-in

#### Advanced Modules
- **[Schedule](./modules/schedule/)** - Event schedules, sessions, and tracks
- **[Speakers](./modules/speakers/)** - Speaker profiles and management
- **[CFP (Call for Papers)](./modules/cfp/)** - Proposal submission and review workflow
- **[Communications](./modules/communications/)** - Email campaigns and messaging
- **[Attendees](./modules/attendees/)** - Attendee management and tracking

### API Documentation

Learn how to work with the tRPC API:

- **[tRPC Overview](./api/trpc-overview.md)** - Understanding tRPC in this project
- **[Router Reference](./api/routers.md)** - Complete API endpoint documentation
- **[Authentication](./api/authentication.md)** - Protected vs public procedures
- **[Error Handling](./api/error-handling.md)** - Error codes and validation patterns

### Components

UI components and design system:

- **[UI System](./components/ui-system.md)** - Flowbite React and Tailwind CSS
- **[Forms](./components/forms.md)** - Form patterns and validation
- **[Tables](./components/tables.md)** - Data tables with sorting and filtering
- **[Reusable Components](./components/reusable-components.md)** - Shared component library

### Deployment

Deploy Events-Ting to production:

- **[Environment Variables](./deployment/environment-variables.md)** - Required configuration
- **[Database Setup](./deployment/database-setup.md)** - PostgreSQL and Prisma migrations
- **[Email Setup](./deployment/email-setup.md)** - Configure Resend for email delivery
- **[Storage Setup](./deployment/storage-setup.md)** - Image uploads and file storage
- **[Vercel Deployment](./deployment/vercel-deployment.md)** - Deploy to Vercel

### Development

Contributing and development workflows:

- **[Local Setup](./development/setup.md)** - Complete development environment setup
- **[Database Migrations](./development/database-migrations.md)** - Prisma workflow
- **[Testing](./development/testing.md)** - Testing strategy (future)
- **[Contributing](./development/contributing.md)** - Contribution guidelines

### Troubleshooting

- **[Troubleshooting Guide](./troubleshooting.md)** - Common issues and solutions

---

## 🎯 Quick Reference

### Common Tasks

**Creating a New Module**:
1. Define Prisma schema in `prisma/schema.prisma`
2. Create tRPC router in `src/server/api/routers/`
3. Add UI components in `src/components/[module]/`
4. Document in `docs/modules/[module]/`

**Adding a New API Endpoint**:
1. Add procedure to appropriate router
2. Define input/output with Zod schemas
3. Implement business logic
4. Test with tRPC client

**Database Changes**:
```bash
# 1. Modify schema
vim prisma/schema.prisma

# 2. Create migration
pnpm prisma migrate dev --name descriptive_name

# 3. Generate client
pnpm prisma generate
```

**Email Templates**:
1. Create React Email component in `emails/`
2. Add sending logic in tRPC router
3. Test with Resend dashboard

---

## 🏗️ System Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│     Next.js 15 (App)        │
│  ┌────────────────────────┐ │
│  │   React Components     │ │
│  └───────────┬────────────┘ │
│              │               │
│  ┌───────────▼────────────┐ │
│  │   tRPC Client (hooks)  │ │
│  └───────────┬────────────┘ │
└──────────────┼──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      tRPC API Layer         │
│  ┌────────────────────────┐ │
│  │   Input Validation     │ │
│  │   (Zod Schemas)        │ │
│  └───────────┬────────────┘ │
│              │               │
│  ┌───────────▼────────────┐ │
│  │   Business Logic       │ │
│  │   (Router Procedures)  │ │
│  └───────────┬────────────┘ │
└──────────────┼──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Prisma ORM             │
│  ┌────────────────────────┐ │
│  │   Type-safe Queries    │ │
│  └───────────┬────────────┘ │
└──────────────┼──────────────┘
               │
               ▼
┌─────────────────────────────┐
│     PostgreSQL Database     │
└─────────────────────────────┘

External Services:
├── NextAuth.js → OAuth (Google, GitHub)
├── Resend → Email delivery
└── Vercel → Hosting & deployment
```

---

## 📖 Documentation Conventions

### File Organization

Each module follows this structure:
```
docs/modules/[module-name]/
├── README.md           # Overview and quick links
├── backend.md          # tRPC procedures and logic
├── frontend.md         # Components and pages
├── data-model.md       # Prisma schema
└── workflows.md        # User flows and processes
```

### Code Examples

All code examples are:
- ✅ Real code from the actual codebase
- ✅ Type-safe with TypeScript
- ✅ Include relevant imports
- ✅ Show both success and error cases

### Diagrams

- Mermaid.js for sequence and flow diagrams
- ASCII art for simple relationships
- Screenshots for UI components

---

## 🤝 Contributing to Documentation

Documentation improvements are always welcome!

**What to Update**:
- Fix typos and unclear explanations
- Add missing examples
- Update outdated information
- Add diagrams and screenshots

**How to Contribute**:
1. Edit markdown files in `docs/`
2. Follow existing structure and style
3. Test links work correctly
4. Submit PR with clear description

See **[Contributing Guide](./development/contributing.md)** for details.

---

## 🔍 Search Tips

Since we're using plain Markdown (for now), here are search tips:

**GitHub Search**:
```
repo:babblebey/events-ting path:docs/ your-search-term
```

**VS Code**:
- Press `Ctrl+Shift+F` (Cmd+Shift+F on Mac)
- Set files to include: `docs/**/*.md`

**Command Line**:
```bash
# Search all docs
grep -r "search term" docs/

# Case insensitive
grep -ri "search term" docs/
```

---

## 📊 Documentation Coverage

| Category | Files | Status |
|----------|-------|--------|
| Foundation | 9 files | ✅ Complete |
| Core Modules | 22 files | ✅ Complete |
| Advanced Modules | 21 files | ✅ Complete |
| API Documentation | 4 files | ✅ Complete |
| Components | 4 files | ✅ Complete |
| Deployment | 5 files | ✅ Complete |
| Development | 4 files | ✅ Complete |
| Troubleshooting | 1 file | ✅ Complete |
| **Total** | **70 files** | **100%** |

---

## 🆘 Need Help?

Can't find what you're looking for?

1. **Check [Troubleshooting](./troubleshooting.md)** - Common issues
2. **Search [GitHub Issues](https://github.com/babblebey/events-ting/issues)** - Past questions
3. **Ask in [Discussions](https://github.com/babblebey/events-ting/discussions)** - Community help
4. **Open an Issue** - Report documentation gaps

---

## 📝 Documentation Roadmap

Future improvements:

- [ ] Interactive documentation site (Nextra or Docusaurus)
- [ ] Video tutorials for key workflows
- [ ] Auto-generated API reference from code
- [ ] Live playground for tRPC procedures
- [ ] Dark mode documentation theme
- [ ] Search functionality
- [ ] i18n support for multiple languages

---

**Last Updated**: November 10, 2024  
**Version**: 1.0.0  
**Maintainer**: @babblebey

---

[← Back to Main README](../README.md)

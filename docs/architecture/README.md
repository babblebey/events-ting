# Architecture Documentation

This directory contains comprehensive documentation about the Events-Ting system architecture, design decisions, and technical implementation details.

## 📚 Contents

### [System Overview](./system-overview.md)
High-level overview of the Events-Ting architecture, including system design, data flow patterns, and key architectural decisions.

**Topics covered:**
- System purpose and capabilities
- High-level architecture diagram
- Layer responsibilities (Client, API, Database, External Services)
- Data flow patterns
- Key architectural decisions

### [Technology Stack](./tech-stack.md)
Detailed information about all technologies used in Events-Ting, explaining version choices, configuration, and rationale for each technology decision.

**Topics covered:**
- Core technologies (Next.js, React, TypeScript, Tailwind CSS)
- Backend stack (tRPC, Prisma, NextAuth.js)
- Database and ORM
- UI libraries and components
- Development tools
- Version information and why each was chosen

### [Data Model](./data-model.md)
Comprehensive overview of the database schema, including all models, relationships, indexes, and design decisions.

**Topics covered:**
- Entity Relationship Diagram
- Core models (User, Event)
- Domain models (Registration, Ticket, Schedule, Speaker, CFP, Communication)
- Relationships and cascade rules
- Indexes and performance optimization
- Design decisions and rationale

### [File Structure](./file-structure.md)
Explanation of the project structure, file organization conventions, and where to find specific functionality.

**Topics covered:**
- Project root structure
- Source code organization (`src/` directory)
- App Router structure (`src/app/`)
- Component organization (`src/components/`)
- API structure (`src/server/`)
- File naming conventions
- Where to add new features

### [Authentication & Authorization](./authentication.md)
Deep dive into the authentication and authorization systems, including NextAuth.js configuration, session management, and authorization patterns.

**Topics covered:**
- NextAuth.js 5.0 configuration
- Authentication methods (credentials, OAuth)
- Session management (JWT-based)
- Authorization patterns (role-based, resource-based)
- Security considerations
- Implementation examples

## 🔗 Related Documentation

- [API Documentation](../api/) - tRPC API layer details
- [Development Setup](../development/setup.md) - Getting started with development
- [Deployment Guides](../deployment/) - Production deployment information

## 🚀 Quick Start

To understand the architecture, we recommend reading the documents in this order:

1. **System Overview** - Get the big picture
2. **Technology Stack** - Understand the tools we use
3. **Data Model** - Learn about the database structure
4. **File Structure** - Navigate the codebase
5. **Authentication** - Understand security implementation

## 💡 Understanding Key Concepts

### System Layers

Events-Ting follows a layered architecture:

```
┌─────────────────────────────────────┐
│         Client Layer                │  ← UI components, pages
├─────────────────────────────────────┤
│         API Layer                   │  ← tRPC routers, procedures
├─────────────────────────────────────┤
│         Database Layer              │  ← Prisma ORM, PostgreSQL
├─────────────────────────────────────┤
│         External Services           │  ← Resend, Storage
└─────────────────────────────────────┘
```

### Key Design Principles

- **Type Safety**: End-to-end TypeScript from database to UI
- **Server Components**: Leverage Next.js App Router for performance
- **API-First**: All data access through tRPC procedures
- **Modular Architecture**: Feature-based organization
- **Security**: Authentication and authorization at every layer

## 📖 For Different Audiences

### New Developers
Start with [System Overview](./system-overview.md) and [File Structure](./file-structure.md) to understand the project layout.

### Frontend Developers
Focus on [Technology Stack](./tech-stack.md) (UI section) and [File Structure](./file-structure.md) (components and pages).

### Backend Developers
Review [Data Model](./data-model.md), [Technology Stack](./tech-stack.md) (backend section), and [Authentication](./authentication.md).

### DevOps/Deployment
See [Technology Stack](./tech-stack.md) and [Deployment Guides](../deployment/).

# Development Documentation

This directory contains comprehensive guides for contributing to and developing Events-Ting locally.

## 📚 Contents

### [Local Development Setup](./setup.md)
Complete guide for setting up Events-Ting for local development on your machine.

**Topics covered:**
- Prerequisites (Node.js, pnpm, PostgreSQL, Git)
- Repository cloning and setup
- Dependency installation
- Environment configuration
- Database setup and migrations
- Running the development server
- Verifying the installation
- Troubleshooting common issues
- IDE setup recommendations

### [Contributing Guide](./contributing.md)
Guidelines and best practices for contributing to Events-Ting, including code style, commit conventions, and PR processes.

**Topics covered:**
- Code of Conduct
- Getting started with contributions
- Development workflow
- Code style guidelines (TypeScript, React, CSS)
- Commit message conventions (Conventional Commits)
- Pull request process
- Documentation requirements
- Testing requirements
- Code review process
- Branch naming conventions

### [Database Migrations](./database-migrations.md)
Best practices for managing database schema changes using Prisma Migrate.

**Topics covered:**
- Prisma Migrate overview
- Development workflow
- Creating migrations
- Applying migrations
- Migration naming conventions
- Production migrations
- Rolling back changes
- Handling migration conflicts
- Schema drift detection
- Best practices and common pitfalls

### [Testing Strategy](./testing.md)
Overview of the testing approach for Events-Ting (comprehensive testing planned for future implementation).

**Topics covered:**
- Testing pyramid (unit, integration, E2E)
- Planned testing frameworks
- Unit testing with Vitest
- Integration testing approach
- E2E testing with Playwright
- Testing tRPC procedures
- Component testing
- Test coverage goals
- CI/CD integration
- Testing best practices

## 🔗 Related Documentation

- [Architecture](../architecture/) - System architecture and design
- [API Documentation](../api/) - tRPC API reference
- [Deployment Guides](../deployment/) - Production deployment
- [Components](../components/) - UI components and patterns

## 🚀 Quick Start for New Contributors

### First Time Setup
1. **[Setup Guide](./setup.md)** - Set up your local environment
2. **[Contributing Guide](./contributing.md)** - Understand contribution workflow
3. **[Database Migrations](./database-migrations.md)** - Learn about schema changes

### Making Your First Contribution
1. Read the [Contributing Guide](./contributing.md)
2. Find an issue or feature to work on
3. Create a feature branch
4. Make your changes following code style guidelines
5. Test your changes locally
6. Submit a pull request

## 💡 Common Development Tasks

### Setting Up Development Environment
See [Local Development Setup](./setup.md#step-by-step-setup)

### Running the Development Server
```bash
pnpm dev
```
See [Setup Guide](./setup.md#step-6-run-development-server)

### Creating Database Migrations
```bash
pnpm db:migrate
```
See [Database Migrations](./database-migrations.md#creating-migrations)

### Resetting the Database
```bash
pnpm db:reset
```
See [Database Migrations](./database-migrations.md#reset-database)

### Running Tests
```bash
pnpm test
```
See [Testing Strategy](./testing.md) (testing in development)

### Code Formatting
```bash
pnpm format
```
See [Contributing Guide](./contributing.md#code-style-guidelines)

### Linting
```bash
pnpm lint
```
See [Contributing Guide](./contributing.md#code-style-guidelines)

## 🛠️ Development Tools

### Required Tools
- **Node.js 18+** - JavaScript runtime
- **pnpm** - Fast package manager
- **PostgreSQL 14+** - Database
- **Git** - Version control

### Recommended Tools
- **VS Code** - Code editor with TypeScript support
- **Prisma VS Code Extension** - Schema editing and formatting
- **ESLint Extension** - Real-time linting
- **Prettier Extension** - Code formatting
- **Database GUI** - TablePlus, pgAdmin, or Prisma Studio

## 📝 Code Style Guidelines

### TypeScript
- Use explicit types for function parameters and return values
- Avoid `any` type
- Use interfaces for object shapes
- Follow naming conventions (PascalCase for types, camelCase for variables)

### React
- Use functional components with hooks
- Server Components by default (use "use client" when needed)
- Follow component file structure
- Use TypeScript for props

### CSS/Tailwind
- Use Tailwind utility classes
- Follow responsive design patterns
- Use custom components for reusable styles
- Keep classes organized and readable

See [Contributing Guide](./contributing.md#code-style-guidelines) for complete details.

## 🔄 Development Workflow

1. **Create a branch** from `main`
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make changes** following code style guidelines

3. **Test locally**
   - Run development server
   - Test functionality
   - Check for errors

4. **Commit changes** using conventional commits
   ```bash
   git commit -m "feat: add new feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feat/your-feature-name
   ```

See [Contributing Guide](./contributing.md#development-workflow) for complete workflow.

## 🧪 Testing Approach

### Current Status
Comprehensive testing framework is planned for future implementation.

### Planned Testing Stack
- **Unit Tests**: Vitest
- **Integration Tests**: Vitest + React Testing Library
- **E2E Tests**: Playwright
- **Component Tests**: React Testing Library

See [Testing Strategy](./testing.md) for planned testing approach.

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors**
- Check PostgreSQL is running
- Verify DATABASE_URL in `.env`
- See [Setup Guide](./setup.md#troubleshooting)

**Migration Failures**
- Check schema syntax
- Review migration files
- See [Database Migrations](./database-migrations.md#troubleshooting)

**Port Already in Use**
- Kill process on port 3000
- Change port in package.json
- See [Setup Guide](./setup.md#troubleshooting)

**Package Installation Issues**
- Clear pnpm cache: `pnpm store prune`
- Delete `node_modules` and reinstall
- See [Setup Guide](./setup.md#troubleshooting)

## 📖 For Different Contributors

### First-Time Contributors
1. Read [Setup Guide](./setup.md)
2. Review [Contributing Guide](./contributing.md)
3. Pick a "good first issue"
4. Ask questions in discussions

### Experienced Developers
1. Review [Architecture](../architecture/)
2. Study [API Documentation](../api/)
3. Understand [Database Migrations](./database-migrations.md)
4. Follow [Code Style Guidelines](./contributing.md#code-style-guidelines)

### Database Contributors
1. Master [Database Migrations](./database-migrations.md)
2. Review [Data Model](../architecture/data-model.md)
3. Understand Prisma schema conventions

### Documentation Contributors
1. Review [Contributing Guide](./contributing.md#documentation-requirements)
2. Check existing documentation structure
3. Follow markdown formatting conventions

## 🤝 Getting Help

### Resources
- **Documentation**: Browse all guides in `/docs`
- **Issues**: Check GitHub issues for known problems
- **Discussions**: Ask questions in GitHub Discussions
- **Code Examples**: Review existing code for patterns

### Before Asking
1. Check documentation thoroughly
2. Search existing issues
3. Review related code
4. Try troubleshooting steps

## ✅ Pre-Commit Checklist

Before committing your code:

- [ ] Code follows style guidelines
- [ ] All linting errors fixed (`pnpm lint`)
- [ ] Code is formatted (`pnpm format`)
- [ ] Types are correct (no TypeScript errors)
- [ ] Changes tested locally
- [ ] Database migrations created (if schema changed)
- [ ] Documentation updated (if needed)
- [ ] Commit message follows conventions

See [Contributing Guide](./contributing.md#pull-request-process) for complete checklist.

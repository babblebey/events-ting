# Events-Ting 🎉

**All-in-One Event Management System** - Create, manage, and scale your events with ease.

Built with the [T3 Stack](https://create.t3.gg/) (Next.js 15, tRPC, Prisma, NextAuth.js, Tailwind CSS).

---

## ✨ Features

- **🎪 Event Management**: Create and manage unlimited events with customizable settings
- **🎟️ Ticketing & Registration**: Manage ticket types and attendee registrations (free tickets MVP)
- **📅 Schedule Builder**: Create event schedules with sessions, tracks, and speaker assignments
- **📢 Call for Papers (CFP)**: Accept and review session proposals from the community
- **🎤 Speaker Management**: Manage speaker profiles with photos, bios, and session assignments
- **📧 Email Campaigns**: Send targeted communications to attendees, speakers, or custom groups
- **🔒 Authentication**: Secure OAuth login with Google and GitHub
- **📊 Dashboard Analytics**: Real-time metrics for registrations, attendance, and engagement
- **🌐 Public Pages**: Beautiful event landing pages with schedules and speaker directories
- **📱 Mobile-First Design**: Fully responsive UI built with Flowbite React and Tailwind CSS

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** 10.20+ (install: `npm install -g pnpm`)
- **PostgreSQL** 14+ (local or [cloud instance](https://vercel.com/postgres))

### Installation

```bash
# 1. Clone repository
git clone https://github.com/babblebey/events-ting.git
cd events-ting

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database URL, NextAuth secret, and API keys

# 4. Run database migrations
pnpm run db:generate

# 5. (Optional) Seed sample data
pnpm run db:seed

# 6. Start development server
pnpm run dev
```

Visit **http://localhost:3000** 🎉

### Environment Variables

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/events_ting_dev"

# NextAuth.js
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Email Service (Resend)
RESEND_API_KEY="re_123456789" # Get from https://resend.com
```

**Get API Keys**:
- **Resend**: Sign up at [resend.com](https://resend.com) for email delivery
- **Google OAuth**: [Google Cloud Console](https://console.cloud.google.com/) → Create OAuth 2.0 Client
- **GitHub OAuth**: [GitHub Developer Settings](https://github.com/settings/developers) → New OAuth App

For detailed setup instructions, see **[quickstart.md](./specs/001-event-management-system/quickstart.md)**.

---

## 🏗️ Tech Stack

This project uses the **T3 Stack** with additional tools for event management:

| Category | Technology |
|----------|------------|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript 5.8+](https://www.typescriptlang.org/) (strict mode) |
| **API Layer** | [tRPC 11](https://trpc.io/) (type-safe APIs) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) via [Prisma 6](https://www.prisma.io/) |
| **Authentication** | [NextAuth.js 5](https://next-auth.js.org/) (OAuth + credentials) |
| **UI Framework** | [React 19](https://react.dev/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) + [Flowbite React](https://flowbite-react.com/) |
| **Validation** | [Zod 3.24+](https://zod.dev/) |
| **Email** | [Resend](https://resend.com/) + [React Email](https://react.email/) |
| **Timezones** | [date-fns](https://date-fns.org/) + [date-fns-tz](https://github.com/marnusw/date-fns-tz) |
| **Package Manager** | [pnpm 10.20+](https://pnpm.io/) |
| **Linting** | [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) |

---

## 📂 Project Structure

```
src/
├── app/                      # Next.js App Router (pages & API routes)
│   ├── (auth)/               # Authentication pages
│   ├── (dashboard)/          # Protected dashboard routes
│   │   └── [id]/             # Dynamic event dashboard
│   ├── events/               # Public event pages
│   └── api/                  # API route handlers
├── components/               # React components
│   ├── ui/                   # Reusable UI components
│   ├── events/               # Event-specific components
│   ├── tickets/              # Ticket & registration components
│   ├── schedule/             # Schedule components
│   ├── cfp/                  # Call for Papers components
│   ├── speakers/             # Speaker components
│   └── communications/       # Email campaign components
├── server/
│   ├── api/
│   │   ├── routers/          # tRPC routers (domain-organized)
│   │   ├── root.ts           # Root router
│   │   └── trpc.ts           # tRPC configuration
│   ├── auth/                 # NextAuth.js configuration
│   ├── services/             # Business logic services
│   └── db.ts                 # Prisma client
├── lib/                      # Shared utilities
│   ├── utils.ts              # Helper functions
│   ├── validators.ts         # Zod validation schemas
│   └── constants.ts          # App constants
└── trpc/                     # tRPC client setup

prisma/
├── schema.prisma             # Database schema
└── migrations/               # Database migrations

emails/                       # React Email templates
└── *.tsx                     # Transactional email templates

specs/                        # Feature specifications
```

---

## 🛠️ Development

### Available Commands

```bash
# Development
pnpm run dev              # Start dev server (http://localhost:3000)
pnpm run build            # Build for production
pnpm run start            # Start production server

# Code Quality
pnpm run check            # Run all checks (lint + typecheck)
pnpm run lint             # Run ESLint
pnpm run lint:fix         # Fix ESLint issues
pnpm run typecheck        # TypeScript type checking
pnpm run format:write     # Format code with Prettier
pnpm run format:check     # Check code formatting

# Database
pnpm run db:generate      # Run migrations + generate Prisma client
pnpm run db:push          # Push schema changes (dev only)
pnpm run db:studio        # Open Prisma Studio (database GUI)
pnpm run db:seed          # Seed database with sample data
```

### Development Workflow

1. **Create feature branch**: `git checkout -b feat/your-feature`
2. **Make changes**: Edit code, update schema if needed
3. **Run checks**: `pnpm run check` (lint + typecheck)
4. **Test locally**: `pnpm run dev` and verify in browser
5. **Commit**: `git commit -m "feat: your feature description"`
6. **Push**: `git push origin feat/your-feature`

### Code Quality Standards

This project follows strict quality standards:

- ✅ **TypeScript strict mode** (no `any` types allowed)
- ✅ **ESLint + Prettier** (zero violations policy)
- ✅ **Server Components by default** (Client Components only when needed)
- ✅ **tRPC for all API calls** (with Zod validation)
- ✅ **Mobile-first responsive design**
- ✅ **WCAG AA accessibility compliance**
- ✅ **Performance targets**: <2s page load (public), <3s (dashboard)

See [.specify/memory/constitution.md](./.specify/memory/constitution.md) for full standards.

---

## 📖 Documentation

- **[Quick Start Guide](./specs/001-event-management-system/quickstart.md)** - Setup and architecture overview
- **[Feature Specification](./specs/001-event-management-system/spec.md)** - Requirements and user stories
- **[Data Model](./specs/001-event-management-system/data-model.md)** - Database schema
- **[API Contracts](./specs/001-event-management-system/contracts/)** - tRPC router specifications
- **[Task List](./specs/001-event-management-system/tasks.md)** - Implementation tasks

---

## 🚢 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/babblebey/events-ting)

1. **Connect GitHub repository** to Vercel
2. **Add environment variables** in Vercel dashboard
3. **Deploy** - Automatic deployments on push to `main`

### Docker

```bash
# Build Docker image
docker build -t events-ting .

# Run container
docker run -p 3000:3000 --env-file .env events-ting
```

### Database

For production, use a managed PostgreSQL service:
- [Vercel Postgres](https://vercel.com/postgres)
- [Supabase](https://supabase.com/)
- [Neon](https://neon.tech/)
- [Railway](https://railway.app/)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feat/amazing-feature`
3. **Make changes** and follow code quality standards
4. **Run checks**: `pnpm run check`
5. **Commit**: `git commit -m "feat: add amazing feature"`
6. **Push**: `git push origin feat/amazing-feature`
7. **Open Pull Request**

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [T3 Stack](https://create.t3.gg/)
- UI components from [Flowbite React](https://flowbite-react.com/)
- Email templates powered by [React Email](https://react.email/)
- Email delivery by [Resend](https://resend.com/)

---

## 📧 Support

- **Documentation**: Check the [quickstart guide](./specs/001-event-management-system/quickstart.md)
- **Issues**: [GitHub Issues](https://github.com/babblebey/events-ting/issues)
- **Discussions**: [GitHub Discussions](https://github.com/babblebey/events-ting/discussions)

---

**Made with ❤️ using the T3 Stack**

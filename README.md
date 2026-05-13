# Paperclip App

A modern web application built with Next.js 15, tRPC, Drizzle ORM, and PostgreSQL.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) (strict mode) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| API | [tRPC v11](https://trpc.io/) |
| Validation | [Zod](https://zod.dev/) |
| Database | [PostgreSQL](https://www.postgresql.org/) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | [Auth.js v5](https://authjs.dev/) (NextAuth) |
| Testing | [Vitest](https://vitest.dev/) |

## Prerequisites

- Node.js 22+
- pnpm 10
- PostgreSQL 17 (local or remote)

## Getting Started

```bash
# 1. Clone the repository
git clone <repo-url>
cd paperclip-app

# 2. Install dependencies
pnpm install

# 3. Copy environment variables
cp env.example .env.local
# Edit .env.local with your database connection string and auth secret

# 4. Generate and run database migrations
pnpm db:generate
pnpm db:migrate

# 5. Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with Turbopack |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Check formatting with Prettier |
| `pnpm format:fix` | Auto-fix formatting |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm test` | Run tests |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm db:studio` | Open Drizzle Studio (GUI) |
| `pnpm ci:all` | Run type-check + lint + test + build |

## Testing

Tests use [Vitest](https://vitest.dev/) with [Testing Library](https://testing-library.com/) for component testing and [Playwright](https://playwright.dev/) for E2E tests.

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test -- --coverage

# E2E tests (requires dev server running)
pnpm test:e2e
```

### Test Structure

```
├── src/
│   ├── __tests__/
│   │   ├── unit/            # Unit tests for business logic
│   │   │   ├── errors.test.ts
│   │   │   ├── register.test.ts
│   │   │   ├── schemas.test.ts
│   │   │   └── utils.test.ts
│   │   └── integration/     # Integration tests for API routes
│   │       ├── items.test.ts
│   │       └── register.test.ts
├── vitest.config.ts         # Vitest configuration
└── vitest.setup.ts          # Test setup (jest-dom matchers)
```

### CI Pipeline

Every push runs: `type-check` → `lint` → `test` → `build`

See `.github/workflows/ci.yml` for details.

## Project Structure

```
├── src/
│   ├── __tests__/
│   │   ├── unit/            # Unit tests
│   │   └── integration/     # Integration tests
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/   # NextAuth route handler
│   │   │   ├── items/                # Items CRUD API
│   │   │   └── register/             # User registration API
│   │   ├── dashboard/                # User dashboard (SSR)
│   │   ├── login/                    # Login page
│   │   ├── register/                 # Registration page
│   │   ├── globals.css               # Global styles (Tailwind v4)
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Home page
│   ├── components/
│   │   ├── forms/                    # Client form components
│   │   └── ui/                       # UI components
│   ├── db/
│   │   ├── index.ts                  # Database client
│   │   └── schema.ts                 # Drizzle schema definitions
│   └── lib/
│       ├── auth.ts                   # NextAuth configuration
│       ├── errors.ts                 # App error classes
│       ├── register.ts               # Registration logic
│       └── utils.ts                  # Utility functions (cn)
├── .github/workflows/
│   └── ci.yml                        # GitHub Actions CI
├── drizzle.config.ts                 # Drizzle Kit config
├── env.example                       # Environment variable template
├── vitest.config.ts                  # Vitest configuration
└── vitest.setup.ts                   # Test setup
```

## Environment Variables

See `env.example` for all required environment variables. Never commit `.env` or `.env.local`.

## Infrastructure & Deployment

### Local Development Database

A `docker-compose.yml` is provided for running PostgreSQL locally:

```bash
# Start PostgreSQL
docker compose up -d

# The database will be available at postgres://paperclip:paperclip@localhost:5432/paperclip

# Run migrations
pnpm db:generate
pnpm db:migrate

# Start the dev server
pnpm dev
```

### Deployment Target

The app deploys to **Vercel Pro** (see [ADR-003](adr/003-deployment-target.md) for full details).

| Environment | Branch | URL |
|-------------|--------|-----|
| Production | `main` | Vercel production URL |
| Preview | Feature branches | Auto-generated preview URLs |

### CI/CD Pipeline

Every PR to `main` runs: `type-check` → `lint` → `test` → `build` → `security scan`

Production deploys happen automatically on push to `main` after quality and security gates pass.

### Required Environment Variables for Deployment

Set these in your Vercel project dashboard:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Production PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth secret (generate with `openssl rand -hex 64`) |
| `AUTH_URL` | Production URL |
| `SENTRY_DSN` | Sentry project DSN (see [ADR-004](adr/004-monitoring-observability.md)) |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog API host |

### Rollback

See [the rollback plan](adr/003-deployment-target.md#rollback-plan) in ADR-003 for detailed procedures. In most cases, use Vercel's instant rollback (Promote to Production from a previous deployment).

### Monitoring

| Concern | Tool | Setup |
|---------|------|-------|
| Error tracking | Sentry | Set `SENTRY_DSN` env var |
| Analytics | PostHog | Set `NEXT_PUBLIC_POSTHOG_KEY` env var |
| Uptime | Better Stack | Add URL monitor after first deploy |

Full details in [ADR-004](adr/004-monitoring-observability.md).

### ADR Index

| # | Title | Status |
|---|-------|--------|
| 001 | [Tech Stack](adr/001-tech-stack.md) | Accepted |
| 002 | [Security Baseline](adr/002-security-baseline.md) | Accepted |
| 003 | [Deployment & Rollback](adr/003-deployment-target.md) | Accepted |
| 004 | [Monitoring & Observability](adr/004-monitoring-observability.md) | Accepted |

## License

MIT

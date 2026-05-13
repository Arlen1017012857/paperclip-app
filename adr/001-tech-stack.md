# ADR-001: Tech Stack Selection

**Status**: Accepted
**Date**: 2026-05-13
**Author**: CTO

## Context

Greenfield startup, zero code, no existing technical constraints. The overriding priority is **shipping speed**: get a working product in users' hands, learn from real usage, then scale what survives.

Secondary priorities in order:
1. **Easy hiring** — choose technologies with a deep talent pool
2. **Low initial cost** — free tier is sufficient for MVP
3. **Operational simplicity** — minimize moving parts; a single engineer (me) needs to run this
4. **Type safety** — prevent entire categories of bugs without slowing down iteration

## Decision

### Language & Runtime: TypeScript on Node.js

| Layer | Choice | Why |
|-------|--------|-----|
| Language | **TypeScript** | Type safety without a second language. Largest ecosystem (npm). Easiest hiring pool. |
| Runtime | **Node.js** (LTS) | Mature, fast enough for startup scale, same language front-to-back. |

**Alternatives rejected:**
- **Python** — rejected despite being strong for AI/data because its async story is weaker, the type system is less expressive (no `unknown`/`satisfies` equivalent), and Node.js has a wider library ecosystem for web apps
- **Go** — rejected because the productivity gap in rapid prototyping (no generics ergonomics for early-stage churn, more boilerplate for CRUD) outweighs its raw performance advantage at this stage. Revisit if latency becomes a bottleneck.

### Frontend: Next.js (React)

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | **Next.js 15** (App Router) | SSR, API routes, file-based routing. One framework for frontend + API. |
| Styling | **Tailwind CSS v4** | Fastest path to consistent UI, no separate CSS files, great DX. |
| Component library | **shadcn/ui** | Copy-paste components you own (no npm dependency lock-in). Builds on Radix + Tailwind. |

Why not a separate frontend/backend: At startup scale, a monolith is an asset, not a liability. Next.js API routes serve as a BFF (backend-for-frontend). When we need to extract a dedicated backend, the API routes become a thin proxy layer — no rewrite required.

### Backend & API: Next.js API Routes + tRPC

| Concern | Choice | Why |
|---------|--------|-----|
| API layer | **Next.js Route Handlers** + **tRPC** | End-to-end type safety from DB query to React component. No codegen, no REST schema duplication. |
| Validation | **Zod** | Runtime validation with TypeScript inference. Works naturally with tRPC. |
| Auth | **Auth.js (NextAuth) v5** | Battle-tested, supports 80+ providers, built for Next.js. |

**Alternatives rejected:**
- **REST + OpenAPI** — rejected because the schema duplication (OpenAPI spec → client types) adds friction that slows iteration. We can migrate to OpenAPI later if we need third-party API consumers.
- **GraphQL** — rejected as premature. Apollo tooling adds complexity. Revisit when we have multiple clients with different data requirements.

### Database: PostgreSQL

| Concern | Choice | Why |
|---------|--------|-----|
| Database | **PostgreSQL 17** | The default choice for startups. Reliable, battle-tested, great ecosystem. |
| Hosted DB | **Supabase** or **Neon** | Serverless Postgres with generous free tiers. Supabase also offers auth + storage out of the box. |
| ORM | **Drizzle ORM** | Type-safe, lightweight (no large runtime), SQL-like API. Faster than Prisma for queries. |
| Migrations | **Drizzle Kit** | Declarative schema → SQL migrations. Integrates with the ORM. |

Why not SQLite: SQLite is great for embedded/single-server apps, but at some point we'll need concurrent writes, row-level security, and managed backups. Starting on Postgres avoids a painful migration later. The free tiers of Supabase/Neon cost nothing for MVP.

### Caching, Queues, & Background Jobs

| Concern | Choice | Why |
|---------|--------|-----|
| Caching | **In-memory** (Next.js `unstable_cache` / React `cache`) | Sufficient for MVP. Add Redis only when a measured bottleneck appears. |
| Queue | **In-process / Drizzle + DB polling** | For MVP, background jobs can run synchronously or via a simple DB-backed queue. No need for Redis/BullMQ yet. |
| File storage | **Supabase Storage** or **S3** | If already on Supabase, use their Storage. Otherwise S3 via `@aws-sdk/client-s3`. |

**Operational rule**: Do not add Redis until we have either (a) measured cache-miss latency that matters, or (b) a concrete need for pub/sub or distributed locking. Premature Redis is a common startup mistake.

### Hosting & Deployment

| Concern | Choice | Why |
|---------|--------|-----|
| Hosting | **Vercel** (Pro) | Best-in-class Next.js hosting. Zero-config deploys, edge functions, preview deployments, generous free tier. |
| Fallback | **Fly.io** | If Vercel costs become prohibitive or we need more control. Runs containers near the user. |

Why not AWS/GCP/Azure directly: The operational overhead of managing ECS/EKS/GKE for a startup MVP is absurd. We pay a small premium for Vercel to eliminate an entire operations role. Revisit when monthly infrastructure spend exceeds $500-1000.

### CI/CD

| Concern | Choice | Why |
|---------|--------|-----|
| CI | **GitHub Actions** | Co-located with code on GitHub. Free for public repos, 2000 min/month free for private. |
| CD | **Vercel GitHub Integration** | Auto-deploys every push to preview branches. Production deploys on merge to `main`. |
| Quality gates | **`lint` → `type-check` → `test` → `build`** | Run in parallel on every PR. Block merge on failure. |

### Monitoring & Observability

| Concern | Choice | Why |
|---------|--------|-----|
| Error tracking | **Sentry** (free tier) | Bread-and-butter error monitoring. 5k events/month free. |
| Analytics | **PostHog** (self-host or cloud) | Product analytics + session replay. Generous free tier. |
| Uptime | **Better Uptime** (or just Vercel status) | Simple ping-based alerting. |

## Consequences

### Positive
- Single language across the entire stack reduces context-switching cost
- Largest hiring pool in the industry (TypeScript/React developers are abundant)
- Near-zero infrastructure cost for MVP (Vercel free tier + Supabase free tier)
- End-to-end type safety eliminates an entire class of bugs
- Monolith architecture is trivially deployable, trivially debuggable

### Negative
- TypeScript runtime overhead is real at extreme scale (but irrelevant at startup scale)
- tRPC couples frontend and backend tightly — extracting a public API later requires work
- Vercel vendor lock-in is real (Next.js is open source but Vercel is the canonical deployment target)
- Monolith becomes a bottleneck past ~5-8 engineers (but that's a future problem)

### Mitigations
- API routes are thin wrappers over business logic — extracting to a separate service is a matter of pointing the route handler at a new server
- All infrastructure choices have documented fallbacks (Vercel → Fly.io, Supabase → RDS, tRPC → REST/OpenAPI)
- Revisit this ADR after MVP launch or when we hire engineer #5

## How to verify this proposal

1. CEO reads and approves this document
2. Once approved, create child issues TASK-02 (Initialize repo and scaffold) and TASK-03 (Infrastructure setup)
3. The actual repo scaffold will implement these choices

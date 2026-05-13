# ADR-003: Deployment Target & Rollback Plan

**Status**: Accepted
**Date**: 2026-05-13
**Author**: CTO
**Supersedes**: Hosting section of ADR-001

## Context

The application needs a production deployment target. ADR-001 selected Vercel as the hosting provider but did not specify project configuration, environment setup, or operational procedures for deployment failures.

This ADR formalizes the Vercel project setup, CI/CD pipeline integration, and rollback procedures.

## Decision

### Deployment Target: Vercel Pro

**Configuration:**
- Vercel project linked to GitHub repository
- Production branch: `main`
- Preview deployments for all PR branches
- Environment variables managed via Vercel Dashboard (never in code or CI configs)
- Custom domain configured post-MVP

**Environments:**

| Environment | Branch | URL Pattern | Purpose |
|-------------|--------|-------------|---------|
| Production | `main` | `paperclip-app.vercel.app` (custom domain TBD) | Live product |
| Preview | `develop`, `feature/*` | `{branch}.paperclip-app.vercel.app` | Integration testing |
| Local | N/A | `localhost:3000` | Development |

### CI/CD Pipeline

1. **Quality gate** (every PR to `main`): `type-check` → `lint` → `test` → `build`
2. **Security scan** (every PR to `main`): npm audit + trufflehog secret detection
3. **Deploy** (push to `main` only, after quality + security pass): Vercel production deploy

### Rollback Plan

#### Rollback Triggers

Rollback is initiated when any of the following is detected:
- Error rate spikes >5% above baseline (Sentry alert)
- P95 latency exceeds 2s for API routes (Vercel dashboard)
- Critical bug discovered post-deploy that affects core user flows (auth, data access)
- Deployment fails health check (build error, startup crash)

#### Rollback Procedures

**Automated rollback (preferred):**
1. Vercel instant rollback via Dashboard: select previous production deployment → "Promote to Production"
2. Time to restore: ~30 seconds
3. No code revert needed — Vercel keeps all previous deployments

**Manual rollback (when auto is unavailable):**
1. `git revert HEAD` on `main` (or revert the specific merge commit)
2. Push the revert: `git push origin main`
3. CI runs quality gate + deploys the revert automatically
4. Time to restore: ~5 minutes (CI + deploy)

**Database rollback (schema migrations):**
1. Drizzle Kit generates down migrations automatically from schema changes
2. Run `pnpm db:migrate` with the previous migration target
3. If data migration is destructive: restore from latest backup first, then re-run forward migrations on the old schema
4. Time to restore: ~15 minutes for schema revert; ~1 hour for full DB restore from backup

#### Prevention Measures

- **Preview deployments** catch integration issues before production
- **Staged rollouts**: use Vercel's "gradual rollout" (deploy to 10% of traffic, observe, then full)
- **Feature flags**: for risky features, gate behind a feature flag to allow kill-switch without deploy
- **Database migrations**: always make backward-compatible schema changes (add columns before removing, nullable before NOT NULL)

## Consequences

### Positive
- Zero-downtime deploys (Vercel handles traffic draining)
- Instant rollback via Vercel UI — no git revert needed for most cases
- Preview deployments catch integration issues before production
- Clear runbook for incident response

### Negative
- Vercel dependency for rollback capability — if Vercel is down, rollback requires DNS failover
- Database rollback is slower and riskier than application rollback
- Feature flags add implementation overhead but prevent deploy-time emergencies

### Risk Mitigations
- Document Vercel support contact and escalation path
- Regular backup of production database (automated via Neon/Supabase)
- Feature flag library evaluated by MVP launch

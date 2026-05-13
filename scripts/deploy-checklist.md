# Production Deployment Checklist

Use this checklist when preparing a production deployment.

## Pre-Deploy

- [ ] All PRs merged to `main`
- [ ] CI quality gates pass (type-check, lint, test, build)
- [ ] Security scan passes (no high-severity CVEs, no secrets leaked)
- [ ] Database migrations are backward-compatible
- [ ] Preview deployment verified on Vercel (if applicable)
- [ ] ENV variables set in Vercel production environment
- [ ] Sentry DSN configured and receiving events

## Deploy

- [ ] Push to `main` triggers CI → auto-deploy
- [ ] Monitor Vercel deployment logs for build errors
- [ ] Verify app loads at production URL
- [ ] Verify auth flow works (login/register)
- [ ] Verify authenticated routes work (dashboard, CRUD)

## Post-Deploy

- [ ] Check Sentry for new errors (first 10 minutes)
- [ ] Check PostHog for expected page views
- [ ] Monitor Vercel dashboard for performance regressions
- [ ] Verify database migrations completed successfully

## Rollback Decision Matrix

| Condition | Action |
|-----------|--------|
| Build succeeds but app crashes on load | Instant rollback via Vercel UI |
| Error rate >5% above baseline | Instant rollback via Vercel UI |
| Critical auth bug | Instant rollback + git revert |
| Schema migration failure | DB restore from backup + rollback |
| Minor feature bug | Hotfix PR (no rollback needed) |

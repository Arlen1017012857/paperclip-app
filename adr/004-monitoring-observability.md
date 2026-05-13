# ADR-004: Monitoring & Observability

**Status**: Accepted
**Date**: 2026-05-13
**Author**: CTO

## Context

We need basic monitoring and observability before shipping to production. The MVP requirements are:

1. Error tracking — know when things break
2. Product analytics — understand how users interact with the app
3. Uptime monitoring — know when the app is down
4. Server-side logging — debug production issues

The goal is "enough to operate" not "Google SRE." Every observability tool must fit on the free tier at MVP scale.

## Decision

### Stack

| Concern | Tool | Cost (MVP) | Retention |
|---------|------|-----------|-----------|
| Error tracking | **Sentry** (cloud) | Free (5k events/month) | 90 days |
| Product analytics | **PostHog** (cloud) | Free (1M events/month) | Unlimited |
| Uptime monitoring | **Better Stack** (formerly Better Uptime) | Free (3 monitors, 10s check interval) | 30 days |
| Server logs | **Vercel Logs** + **Sentry** | Included with Vercel Pro | 3 days (Vercel), 90 days (Sentry) |

### Setup Instructions

#### Sentry

1. Create account at https://sentry.io
2. Create a new project: "Next.js"
3. Copy the DSN to `SENTRY_DSN` environment variable
4. Set `SENTRY_ENVIRONMENT=production` in Vercel production environment

Sentry captures:
- Unhandled exceptions (client + server)
- API route errors
- React component render errors
- Performance traces (10% sample rate in production)

#### PostHog

1. Create account at https://app.posthog.com
2. Create a project, copy API key
3. Set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` in Vercel environments

PostHog captures:
- Page views (automatic via PostHogProvider)
- User sign-ups and logins
- Custom events for key actions (create item, etc.)

#### Better Stack

1. Create account at https://betterstack.com
2. Add URL monitor for production deployment URL
3. Configure alert to email and/or Slack webhook
4. Optional: status page at `status.paperclip-app.com`

### Logging Strategy

- **Development**: console.log/sentry debug (no structured logging needed)
- **Production**: Sentry captures errors automatically. For structured server-side logging, add `pino` or `winston` when server-side debugging becomes painful
- **Audit trail**: database-level created_at/updated_at timestamps on all tables

### Alerting Thresholds (for future SLOs)

| Metric | Warning | Critical | Channel |
|--------|---------|----------|---------|
| Error rate | >1% of requests | >5% of requests | Slack + Email |
| API latency p95 | >1s | >2s | Slack |
| Uptime | N/A | 2 consecutive failures | Phone call |

### Explicit Non-Goals (for MVP)

- Distributed tracing (OpenTelemetry)
- Custom dashboards
- Log aggregation (no ELK/Datadog/Grafana)
- Paging/on-call rotation (founder-led response only)

## Consequences

### Positive
- Error visibility from day one — no blind production deploys
- Product usage data for decision making
- Minimal operational cost ($0 MVP tier)
- Easy to upgrade as scale warrants

### Negative
- Multiple tools to check during incident response (Sentry + Better Stack + Vercel)
- No distributed tracing means debugging complex request chains is harder
- Alert fatigue risk if Sentry thresholds are too sensitive

### Future Upgrades
- Add Pino logger for structured server-side logs when debugging becomes painful
- Add OpenTelemetry instrumentation when we have >3 microservices
- Evaluate Datadog/Grafana when infra spend justifies consolidated observability

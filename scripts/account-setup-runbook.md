# Account Setup Runbook (for CEO)

This runbook walks through creating accounts on Vercel, Sentry, and PostHog, plus configuring deployment secrets. Estimated time: **15 minutes**.

---

## Step 1: Create Vercel Account + Project (5 min)

1. **Sign up**: Go to https://vercel.com/signup and sign up with your company email (GitHub login recommended)
2. **Create a token**: Go to https://vercel.com/account/tokens, create a token named `paperclip-ci`, copy it
3. **Run the bootstrap script**:

   ```bash
   # Export your tokens (get these from the service dashboards)
   export VERCEL_TOKEN="<paste-token-here>"
   export GITHUB_TOKEN="<paste-github-pat-here>"

   # Run the setup automation
   bash scripts/bootstrap-infra.sh
   ```

**Manual alternative:**
- Go to https://vercel.com/new and import repo `Arlen1017012857/paperclip-app`
- In **Environment Variables**, add: `DATABASE_URL`, `AUTH_SECRET`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com`
- Deploy and verify it works at `https://paperclip-app.vercel.app`

---

## Step 2: Create Sentry Account + Project (5 min)

1. **Sign up**: Go to https://sentry.io/signup and create an account
2. **Create a project**: Select **Next.js** platform, name it `paperclip-app`
3. **Get the DSN**: Project Settings → Client Keys (DSN) → copy the DSN string
4. **Create auth token**: Go to https://sentry.io/settings/account/api/auth-tokens/ and create one with `project:write` and `org:read` scopes
5. **Configure via bootstrap**:

   ```bash
   export SENTRY_AUTH_TOKEN="<token>"
   export SENTRY_DSN="<dsn>"
   bash scripts/bootstrap-infra.sh
   ```

**Configure alerting (recommended):**
- Sentry → **Alerts** → "New Issue" rule → notify via Email or Slack

---

## Step 3: Create PostHog Account + Project (5 min)

1. **Sign up**: Go to https://app.posthog.com/signup and create an account
2. **Get API key**: Project Settings → Project API Key (starts with `phc_`)
3. **Configure via bootstrap**:

   ```bash
   export POSTHOG_API_KEY="phc_xxx"
   bash scripts/bootstrap-infra.sh
   ```

---

## Secrets Quick Reference

| Secret | Source | GitHub Secret Name |
|--------|--------|-------------------|
| Vercel Token | vercel.com/account/tokens | `VERCEL_TOKEN` |
| Vercel Org ID | vercel.com/account or `vercel whoami --token $TOKEN` | `VERCEL_ORG_ID` |
| Vercel Project ID | Project Settings → General | `VERCEL_PROJECT_ID` |
| Sentry DSN | sentry.io → Project → Client Keys | `SENTRY_DSN` |
| Sentry Auth Token | sentry.io → Auth Tokens | `SENTRY_AUTH_TOKEN` |
| PostHog API Key | app.posthog.com → Project Settings | `NEXT_PUBLIC_POSTHOG_KEY` |
| Database URL | PostgreSQL provider (Neon/Supabase/Railway) | `DATABASE_URL` |
| Auth Secret | `openssl rand -hex 64` | `AUTH_SECRET` |

---

## After Setup: Verify

1. Push a commit to `main` → CI triggers at https://github.com/Arlen1017012857/paperclip-app/actions
2. The CI pipeline will:
   - Run type-check, lint, test, build
   - Run security audit
   - Deploy to Vercel (if on main branch)
3. Visit the deployment URL and check:
   - App loads without errors
   - Sentry shows empty issues list (no errors)
   - PostHog captures a pageview

#!/usr/bin/env bash
# =========================================================================
# bootstrap-infra.sh
# =========================================================================
# One-time setup: creates Vercel project, Sentry project, PostHog project,
# and configures all GitHub Actions secrets.
#
# Prerequisites (manual — done once by CEO):
#   1. Vercel account  → vercel.com/signup
#   2. Sentry account  → sentry.io/signup
#   3. PostHog account → app.posthog.com/signup
#   4. GitHub PAT      → github.com/settings/tokens (repo scope)
#
# Usage:
#   export GITHUB_TOKEN="ghp_xxx"
#   export VERCEL_TOKEN="xxx"        # from vercel.com/account/tokens
#   export SENTRY_AUTH_TOKEN="xxx"   # from sentry.io/settings/auth-tokens
#   export POSTHOG_API_KEY="phc_xxx" # from app.posthog.com/project/settings
#   bash scripts/bootstrap-infra.sh
# =========================================================================

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
REPO="Arlen1017012857/paperclip-app"
VERCEL_PROJECT_NAME="paperclip-app"
SENTRY_ORG="paperclip"              # will be created on first sentry-cli run
SENTRY_PROJECT="paperclip-app"
POSTHOG_PROJECT_NAME="paperclip-app"

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[✗]${NC} $1"; }

# ── Prereq check ────────────────────────────────────────────────────────────
check_env() {
  local var=$1
  if [ -z "${!var-}" ]; then
    err "$var is not set. Skipping ${var%_*}-related steps."
    return 1
  fi
  return 0
}

# ── Step 1: Vercel ──────────────────────────────────────────────────────────
setup_vercel() {
  echo ""
  echo "━━━ Step 1: Vercel Project ━━━"

  if ! check_env VERCEL_TOKEN; then
    warn "Set VERCEL_TOKEN and re-run to configure Vercel."
    return
  fi

  # Login (non-interactive via token)
  vercel login --token "$VERCEL_TOKEN" 2>/dev/null || true

  # Create project (idempotent)
  echo "Creating Vercel project: $VERCEL_PROJECT_NAME ..."
  vercel project create "$VERCEL_PROJECT_NAME" --token "$VERCEL_TOKEN" --public 2>/dev/null || \
    warn "Vercel project may already exist (this is fine)."

  # Link local directory
  vercel link --project "$VERCEL_PROJECT_NAME" --token "$VERCEL_TOKEN" --yes 2>/dev/null || true

  # Link GitHub repo
  echo "Linking GitHub repo to Vercel..."
  vercel git connect --type github --repo "$REPO" --token "$VERCEL_TOKEN" --yes 2>/dev/null || \
    warn "Could not auto-link GitHub. Link manually at vercel.com/$VERCEL_PROJECT_NAME"

  # Set environment variables
  echo "Setting Vercel environment variables..."
  vercel env add DATABASE_URL production --token "$VERCEL_TOKEN" <<< "$DATABASE_URL" 2>/dev/null || warn "DATABASE_URL not set (set manually in Vercel dashboard)"
  vercel env add AUTH_SECRET production --token "$VERCEL_TOKEN" <<< "$AUTH_SECRET" 2>/dev/null || warn "AUTH_SECRET not set (set manually)"
  vercel env add SENTRY_DSN production --token "$VERCEL_TOKEN" <<< "$SENTRY_DSN" 2>/dev/null || warn "SENTRY_DSN not set"
  vercel env add SENTRY_ENVIRONMENT production --token "$VERCEL_TOKEN" <<< "production" 2>/dev/null || true
  vercel env add NEXT_PUBLIC_POSTHOG_KEY production --token "$VERCEL_TOKEN" <<< "$NEXT_PUBLIC_POSTHOG_KEY" 2>/dev/null || warn "NEXT_PUBLIC_POSTHOG_KEY not set"
  vercel env add NEXT_PUBLIC_POSTHOG_HOST production --token "$VERCEL_TOKEN" <<< "${NEXT_PUBLIC_POSTHOG_HOST:-https://app.posthog.com}" 2>/dev/null || true

  info "Vercel setup complete!"
  info "  Project: https://vercel.com/$REPO"
  info "  Deploy:  https://$VERCEL_PROJECT_NAME.vercel.app"
}

# ── Step 2: Sentry ──────────────────────────────────────────────────────────
setup_sentry() {
  echo ""
  echo "━━━ Step 2: Sentry Project ━━━"

  if ! check_env SENTRY_AUTH_TOKEN; then
    warn "Set SENTRY_AUTH_TOKEN and re-run to configure Sentry."
    return
  fi

  # sentry-cli is available via npx
  SENTRY_CLI="npx --yes @sentry/cli"

  # Create project
  echo "Creating Sentry project: $SENTRY_PROJECT ..."
  $SENTRY_CLI --auth-token "$SENTRY_AUTH_TOKEN" projects create \
    --team "$SENTRY_ORG" \
    "$SENTRY_PROJECT" 2>/dev/null || \
    warn "Sentry project may already exist or team needs creation."

  # Get DSN
  SENTRY_DSN=$($SENTRY_CLI --auth-token "$SENTRY_AUTH_TOKEN" projects info "$SENTRY_PROJECT" 2>/dev/null | grep -i dsn | head -1 | awk '{print $2}') || true
  if [ -n "$SENTRY_DSN" ]; then
    info "Sentry DSN: $SENTRY_DSN"
  else
    warn "Could not auto-retrieve DSN. Get it from sentry.io/settings/projects/$SENTRY_PROJECT"
  fi

  info "Sentry setup complete!"
  info "  Project: https://sentry.io/orgs/$SENTRY_ORG/projects/$SENTRY_PROJECT"
}

# ── Step 3: PostHog ─────────────────────────────────────────────────────────
setup_posthog() {
  echo ""
  echo "━━━ Step 3: PostHog Project ──"

  if ! check_env POSTHOG_API_KEY; then
    warn "Set POSTHOG_API_KEY and re-run to configure PostHog."
    return
  fi

  # PostHog project is auto-created with the account.
  # The API key is already what we need.
  info "PostHog API key configured."
  info "  Dashboard: https://app.posthog.com/project/home"
}

# ── Step 4: GitHub Secrets ──────────────────────────────────────────────────
setup_github_secrets() {
  echo ""
  echo "━━━ Step 4: GitHub Actions Secrets ──"

  if ! check_env GITHUB_TOKEN; then
    warn "Set GITHUB_TOKEN and re-run to configure GitHub secrets."
    return
  fi

  GH="curl --noproxy '*' -s -H 'Authorization: Bearer $GITHUB_TOKEN'"
  GH_API="https://api.github.com/repos/$REPO/actions/secrets"

  upsert_secret() {
    local name=$1 value=$2
    if [ -z "$value" ]; then
      warn "  Skipping $name (no value)"
      return
    fi
    # Encrypt the secret using libsodium (via the GitHub API)
    # First get the public key
    local pub_key_info
    pub_key_info=$(eval "$GH $GH_API/public-key")
    local pub_key
    pub_key=$(echo "$pub_key_info" | python3 -c "import json,sys; print(json.load(sys.stdin)['key'])")
    local key_id
    key_id=$(echo "$pub_key_info" | python3 -c "import json,sys; print(json.load(sys.stdin)['key_id'])")

    # Encrypt using Python
    local encrypted_value
    encrypted_value=$(python3 -c "
import base64, json, sys
from nacl import bindings as sodium

pub_key = base64.b64decode('$pub_key')
secret = base64.b64encode(sodium.crypto_box_seal(bytes('$value', 'utf-8'), pub_key)).decode('utf-8')
print(secret)
" 2>/dev/null) || {
      warn "  Could not encrypt $name (libsodium may not be installed)"
      return
    }

    eval "$GH -X PUT \"$GH_API/$name\" -d '{\"encrypted_value\":\"$encrypted_value\",\"key_id\":\"$key_id\"}'" > /dev/null 2>&1 && \
      info "  Set $name" || \
      warn "  Failed to set $name"
  }

  upsert_secret "DATABASE_URL" "${DATABASE_URL:-}"
  upsert_secret "AUTH_SECRET" "${AUTH_SECRET:-}"
  upsert_secret "SENTRY_DSN" "${SENTRY_DSN:-}"
  upsert_secret "NEXT_PUBLIC_POSTHOG_KEY" "${NEXT_PUBLIC_POSTHOG_KEY:-}"
  upsert_secret "NEXT_PUBLIC_POSTHOG_HOST" "${NEXT_PUBLIC_POSTHOG_HOST:-https://app.posthog.com}"
  upsert_secret "VERCEL_TOKEN" "${VERCEL_TOKEN:-}"
  upsert_secret "VERCEL_ORG_ID" "${VERCEL_ORG_ID:-}"
  upsert_secret "VERCEL_PROJECT_ID" "${VERCEL_PROJECT_ID:-}"

  info "GitHub secrets configured!"
}

# ── Main ─────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Paperclip App — Infrastructure Bootstrap              ║"
echo "╚══════════════════════════════════════════════════════════╝"

setup_vercel
setup_sentry
setup_posthog
setup_github_secrets

echo ""
echo "━━━ Summary ──"
echo ""
echo "  GitHub repo:    https://github.com/$REPO"
echo "  CI pipeline:    https://github.com/$REPO/actions"
echo ""
echo "  Vercel project: https://vercel.com/$REPO"
echo "  Sentry project: https://sentry.io/orgs/$SENTRY_ORG/projects/$SENTRY_PROJECT"
echo "  PostHog:        https://app.posthog.com"
echo ""
echo "Next steps:"
echo "  1. Configure custom domain in Vercel dashboard"
echo "  2. Set up Sentry alerting (Email/Slack) — see ADR-004"
echo "  3. Verify preview deployments work"
echo "  4. Run CI pipeline: git push to main"
echo ""
echo "Done!"

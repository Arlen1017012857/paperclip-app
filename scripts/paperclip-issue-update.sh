#!/usr/bin/env bash
set -euo pipefail

# Paperclip issue update helper
# Preserves markdown line breaks in JSON payloads
#
# Usage:
#   scripts/paperclip-issue-update.sh --issue-id <id> --status done <<'MD'
#   ## What was done
#   ...
#   MD

API_URL="${PAPERCLIP_API_URL:?}"
API_KEY="${PAPERCLIP_API_KEY:?}"
RUN_ID="${PAPERCLIP_RUN_ID:?}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --issue-id) ISSUE_ID="$2"; shift 2 ;;
    --status) STATUS="$2"; shift 2 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

: "${ISSUE_ID:?Missing --issue-id}"
: "${STATUS:?Missing --status}"

COMMENT=$(cat)

curl -s -X PATCH "${API_URL}/api/issues/${ISSUE_ID}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "X-Paperclip-Run-Id: ${RUN_ID}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg status "$STATUS" --arg comment "$COMMENT" '{status: $status, comment: $comment}')"

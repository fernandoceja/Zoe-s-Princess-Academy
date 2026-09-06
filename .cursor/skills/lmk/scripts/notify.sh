#!/usr/bin/env bash
set -euo pipefail

CONFIG="${LMK_CONFIG:-$HOME/.config/lmk/pushover.env}"
if [[ ! -f "$CONFIG" ]]; then
  echo "LMK config missing: $CONFIG" >&2
  exit 2
fi

# shellcheck disable=SC1090
source "$CONFIG"

if [[ -z "${PUSHOVER_USER_KEY:-}" || -z "${PUSHOVER_API_TOKEN:-}" ]]; then
  echo "LMK config is incomplete." >&2
  exit 2
fi

TITLE="${1:-Task finished}"
MESSAGE="${2:-The requested work is done.}"
PRIORITY="${3:-0}"

RESPONSE="$(curl -sS -X POST 'https://api.pushover.net/1/messages.json' \
  --data-urlencode "token=${PUSHOVER_API_TOKEN}" \
  --data-urlencode "user=${PUSHOVER_USER_KEY}" \
  --data-urlencode "title=${TITLE}" \
  --data-urlencode "message=${MESSAGE}" \
  --data-urlencode "priority=${PRIORITY}")"

echo "$RESPONSE"

if ! python3 -c 'import json,sys; d=json.loads(sys.argv[1]); raise SystemExit(0 if d.get("status")==1 else 1)' "$RESPONSE"; then
  echo "Pushover did not return status 1." >&2
  exit 1
fi

#!/bin/bash
# End-to-end tests on a production build, in a headless Chromium.
#
# Builds the app (skip with E2E_SKIP_BUILD=1), serves it on a spare port, and
# runs e2e/run.mjs: the main paths of an athlete, offline, on the device's
# own data — no account, no server data touched. Chromium comes from the
# Playwright cache (npx playwright-core install chromium-headless-shell),
# or from E2E_CHROMIUM.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
PORT=${E2E_PORT:-3300}
cd "$ROOT"

if [ "${E2E_SKIP_BUILD:-}" != "1" ]; then
  rm -rf .next/dev
  npx next build >/dev/null
fi

npx next start -p "$PORT" >/tmp/traintrack-e2e-server.log 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do
  curl -s -o /dev/null "http://localhost:$PORT/fr" && break
  sleep 1
done

E2E_BASE="http://localhost:$PORT" node e2e/run.mjs

#!/bin/bash
# Prove the database's access rules, on a throwaway local Postgres.
#
# Replays every migration in supabase/migrations onto an empty cluster (with
# supabase/tests/supabase_stub.sql standing in for Supabase), then runs
# supabase/tests/rls.sql, which acts as each kind of account the way
# PostgREST does and checks what it can and cannot do. Nothing here touches
# a real database: the cluster lives in a temp dir and is deleted on exit.
#
# Needs initdb / pg_ctl / psql on PATH (e.g. `brew install postgresql`).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
PORT=${RLS_TEST_PORT:-54329}
TMP=$(mktemp -d)
trap 'pg_ctl -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

initdb -D "$TMP/data" -U postgres --auth=trust -E UTF8 >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1" -l "$TMP/log" -w start >/dev/null
PSQL=(psql -h 127.0.0.1 -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -c "create database traintrack"
"${PSQL[@]}" -d traintrack -f "$ROOT/supabase/tests/supabase_stub.sql" 2>&1 | grep -v "wal_level\|HINT" || true
for f in "$ROOT"/supabase/migrations/0*.sql; do
  "${PSQL[@]}" -d traintrack -f "$f" >/dev/null 2>"$TMP/err" || { echo "FAILED: $(basename "$f")"; cat "$TMP/err"; exit 1; }
done
echo "migrations: $(ls "$ROOT"/supabase/migrations/0*.sql | wc -l | tr -d ' ') applied"

report=$("${PSQL[@]}" -d traintrack -P pager=off -f "$ROOT/supabase/tests/rls.sql")
echo "$report" | grep -E "^ FAIL" || true
counts=$(echo "$report" | grep -E "^ +[0-9]+ \| +[0-9]+ *$" | tail -1)
passed=$(echo "$counts" | awk -F'|' '{gsub(/ /,"",$1); print $1}')
failed=$(echo "$counts" | awk -F'|' '{gsub(/ /,"",$2); print $2}')
echo "access rules: $passed passed, $failed failed"
[ "$failed" = "0" ]

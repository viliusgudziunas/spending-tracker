#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
archive=${1:-"$repo_dir/db.backup"}
if [ "$#" -gt 1 ] || [ ! -f "$archive" ] || [ ! -r "$archive" ]; then
    echo "Usage: $0 [readable-archive-file] (default: $repo_dir/db.backup)" >&2
    exit 2
fi

unset COMPOSE_PROJECT_NAME
postgres() {
    docker compose -f "$repo_dir/compose.yaml" exec -T postgres "$@"
}

staging="restore_$$"
previous="previous_$$"
postgres createdb -U postgres -T template0 "$staging"
trap 'postgres dropdb -U postgres --if-exists "$staging"' EXIT
trap 'exit 1' HUP INT TERM

postgres pg_restore -U postgres --exit-on-error -d "$staging" < "$archive"
# Read back the restored schema and data before disconnecting any clients.
postgres pg_dump -U postgres -Fc --no-sync -f /dev/null "$staging"

# Both renames commit together. A failed rename leaves the original in place.
postgres psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
    -v staging="$staging" -v previous="$previous" <<'SQL'
BEGIN;
SELECT pg_terminate_backend(pid, 5000)
FROM pg_stat_activity WHERE datname = 'spending-tracker';
ALTER DATABASE "spending-tracker" RENAME TO :"previous";
ALTER DATABASE :"staging" RENAME TO "spending-tracker";
COMMIT;
SQL
trap - EXIT
postgres dropdb -U postgres --if-exists "$previous"
echo "Restored spending-tracker from $archive"

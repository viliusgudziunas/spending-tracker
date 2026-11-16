#!/bin/sh
# End-to-end check with a private Compose project and a tmpfs database.
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
image=$(docker compose -f "$repo_dir/compose.yaml" config --images postgres)
work_dir=$(mktemp -d)
project="backup-test-$(basename "$work_dir" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9')"
checkout="$work_dir/$project"
label="com.docker.compose.project=$project"
cleanup() {
    status=$?
    trap - EXIT
    set -e
    if ! ids=$(docker ps -aq --filter "label=$label"); then
        echo "Could not verify cleanup of test project $project" >&2
        exit 1
    fi
    for id in $ids; do
        if ! (docker stop "$id" && docker rm "$id") >/dev/null; then
            echo "Could not remove test container $id" >&2
            if [ "$status" -eq 0 ]; then status=1; fi
        fi
    done
    rm -rf -- "$work_dir"
    exit "$status"
}
existing=$(docker ps -aq --filter "label=$label")
if [ -n "$existing" ]; then
    rmdir "$work_dir"
    exit 1
fi
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

mkdir -p "$checkout/scripts"
cp "$repo_dir"/scripts/*-db.sh "$checkout/scripts/"
cat > "$checkout/compose.yaml" <<YAML
services:
  postgres:
    image: $image
    network_mode: none
    tmpfs:
      - /var/lib/postgresql/data
    environment:
      POSTGRES_HOST_AUTH_METHOD: trust
      POSTGRES_DB: spending-tracker
    command: ["postgres", "-c", "max_prepared_transactions=1"]
    healthcheck:
      test: ["CMD", "pg_isready", "-h", "127.0.0.1", "-U", "postgres"]
      interval: 1s
      timeout: 2s
      retries: 30
YAML
compose() { docker compose -p "$project" -f "$checkout/compose.yaml" "$@"; }
sql() { compose exec -T postgres psql -XAtq -v ON_ERROR_STOP=1 -U postgres -d "$1" -c "$2"; }
expect_failure() {
    if "$@"; then
        echo "Unexpected success: $*" >&2
        exit 1
    fi
}
compose up -d --wait --wait-timeout 45 postgres
cd "$work_dir"
export COMPOSE_FILE="$work_dir/unrelated.yaml" COMPOSE_PROJECT_NAME=unrelated
backup="$checkout/scripts/backup-db.sh"
restore="$checkout/scripts/restore-db.sh"
db=spending-tracker
sql "$db" "CREATE TABLE sample (value text); INSERT INTO sample VALUES ('archived')"
"$backup"
cp "$checkout/db.backup" saved.backup
sql "$db" "UPDATE sample SET value = 'original'"

# Truncate a real dump so pg_restore encounters corrupt data in staging.
head -c 200 saved.backup > corrupt.backup
expect_failure "$restore" corrupt.backup
expect_failure "$restore" missing.backup
test "$(sql "$db" 'TABLE sample')" = original

# A prepared transaction prevents renaming the target, even as superuser.
sql "$db" "BEGIN; INSERT INTO sample VALUES ('pending'); PREPARE TRANSACTION 'block_rename'"
expect_failure "$restore" saved.backup
test "$(sql "$db" 'TABLE sample')" = original
sql "$db" "ROLLBACK PREPARED 'block_rename'"

"$restore" saved.backup
test "$(sql "$db" 'TABLE sample')" = archived
test "$(sql postgres "SELECT count(*) FROM pg_database WHERE datname ~ '^(restore|previous)_'")" = 0

sql postgres 'ALTER DATABASE "spending-tracker" RENAME TO unavailable'
expect_failure "$backup"
cmp saved.backup "$checkout/db.backup"
test -z "$(find "$checkout" -name 'db.backup.*' -print)"
echo "Backup and restore checks passed"

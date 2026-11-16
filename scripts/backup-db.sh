#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
archive=${1:-"$repo_dir/db.backup"}
if [ "$#" -gt 1 ] || [ -d "$archive" ]; then
    echo "Usage: $0 [archive-file]" >&2
    exit 2
fi

unset COMPOSE_PROJECT_NAME
postgres() {
    docker compose -f "$repo_dir/compose.yaml" exec -T postgres "$@"
}
temp_archive=$(mktemp "$archive.XXXXXX")
trap 'rm -f -- "$temp_archive"' EXIT
trap 'exit 1' HUP INT TERM

postgres pg_dump -U postgres -Fc spending-tracker > "$temp_archive"
mv -f -- "$temp_archive" "$archive"
echo "Backed up spending-tracker to $archive"

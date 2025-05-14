#!/bin/sh

CONTAINER_ID=$(docker ps | grep "postgres" | awk '{print $1}')

# Ensure the /backup directory exists in the container
docker exec "$CONTAINER_ID" mkdir -p /backup

# Copy the backup file from host to the container's /backup directory
docker cp ./db.backup "$CONTAINER_ID":/backup/db.backup

# Disconnect all users from the target database
docker exec "$CONTAINER_ID" psql -U postgres -d postgres -c \
"SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'spending-tracker' AND pid <> pg_backend_pid();" \
> /dev/null
echo "Disconnected all users from the 'spending-tracker' database"

# Drop the 'spending-tracker' database
docker exec "$CONTAINER_ID" psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS \"spending-tracker\";" > /dev/null
echo "Dropped the 'spending-tracker' database"

# Execute the pg_restore command inside the container to the newly created 'spending-tracker' database
docker exec "$CONTAINER_ID" pg_restore -U postgres -d postgres -C /backup/db.backup
echo "Restored the 'spending-tracker' database"

#!/bin/sh

CONTAINER_ID=$(docker ps | grep "postgres" | awk '{print $1}')

# Backup the 'spending-tracker' database
docker exec -t "$CONTAINER_ID" pg_dump -U postgres -F c -b -v -f "/var/lib/postgresql/data/db.backup" spending-tracker

# Copy the backup file to the host
docker cp "$CONTAINER_ID":/var/lib/postgresql/data/db.backup ./db.backup

#!/bin/sh
# run.sh — helper script to update and restart the webhook application

# Usage: ./run.sh [server]
# If argument is "server" then run in detached mode (docker compose up -d),
# otherwise run in foreground mode (docker compose up).

# Reset code base & pull latest
git reset --hard && git pull

# Stop current containers
docker compose down

# Determine mode
if [ "$1" = "server" ]; then
  echo "Starting containers in detached (background) mode..."
  docker compose up -d
else
  echo "Starting containers in foreground mode..."
  docker compose up
fi
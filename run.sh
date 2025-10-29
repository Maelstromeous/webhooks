#/bin/sh

# Helper script to update and restart the webhook application
git reset --hard && git pull && docker compose down && docker compose up -d
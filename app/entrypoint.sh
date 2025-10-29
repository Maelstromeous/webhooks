#!/usr/bin/env sh
set -euo pipefail

echo "Starting application setup..."

echo "Installing jq..."
apk add --no-cache jq

echo "Installing bash..."
apk add --no-cache bash

echo "Replacing secret..."
/app/replace-secret.sh

/usr/local/bin/webhook -verbose -hotreload -hooks=/config/hooks/hooks.json
#!/usr/bin/env sh
set -euo pipefail

echo "Starting application setup..."
echo "Replacing secret..."
/app/replace-secret.sh

/usr/local/bin/webhook -verbose -hotreload -hooks=/config/hooks/hooks.json
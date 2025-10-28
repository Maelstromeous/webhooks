#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/log.sh"

SSH_KEY="/keys/deploy_key"        # Path to SSH private key inside container
REMOTE_USER="root"
REMOTE_HOST="10.0.5.4"
REMOTE_SCRIPT="/root/update.sh"    # Script already on remote machine

log_message("Starting digletbot deployment...")

# Ensure SSH client is available (works on Alpine, etc.)
sh "$SCRIPT_DIR/install_ssh_client.sh"

# Sanity check: key must be present
[ -f "$SSH_KEY" ] || { echo "SSH key not found at $SSH_KEY" >&2; exit 1; }

ssh -i "$SSH_KEY" \
    -o StrictHostKeyChecking=accept-new \
    -o IdentitiesOnly=yes \
    -o BatchMode=yes \
    "${REMOTE_USER}@${REMOTE_HOST}" \
    "bash \"$REMOTE_SCRIPT\""

echo "$(date '+%Y-%m-%d %H:%M:%S') digletbot deployment finished." >> /config/deploy.log
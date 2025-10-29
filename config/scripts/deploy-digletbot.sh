#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/constants.sh"
source "$SCRIPT_DIR/log.sh"

REMOTE_USER="root"
REMOTE_HOST="10.0.5.4"
REMOTE_SCRIPT="/root/update.sh"    # Script already on remote machine

log_message 'Starting digletbot deployment...'

# Ensure SSH client is available (works on Alpine, etc.)
sh "$SCRIPT_DIR/install_ssh_client.sh"

ssh -i "$SSH_KEY" \
    -o StrictHostKeyChecking=accept-new \
    -o IdentitiesOnly=yes \
    -o BatchMode=yes \
    "${REMOTE_USER}@${REMOTE_HOST}" \
    "bash \"$REMOTE_SCRIPT\""

log_message 'digletbot deployment finished!'
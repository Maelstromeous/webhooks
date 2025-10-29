#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/constants.sh"

LOG_FILE="$APP_PATH/logs/webhooks.log"

# Check if log directory exists, create if not
LOG_DIR="$(dirname "$LOG_FILE")"
if [ ! -d "$LOG_DIR" ]; then
		mkdir -p "$LOG_DIR"
fi

log_message() {
    local SRC="$1"; shift
    local MSG="$*"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$SRC] $MSG" >> "$LOG_FILE"
}
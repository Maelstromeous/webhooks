#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/constants.sh"

LOG_FILE="$APP_PATH/logs/deploy.log"

# Check if log directory exists, create if not
LOG_DIR="$(dirname "$LOG_FILE")"
if [ ! -d "$LOG_DIR" ]; then
		mkdir -p "$LOG_DIR"
fi

# Function to log messages with timestamp
function log_message() {
		local MESSAGE="$1"
		echo "$(date '+%Y-%m-%d %H:%M:%S') $MESSAGE" >> "$LOG_FILE"
}
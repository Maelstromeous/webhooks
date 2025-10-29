#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/constants.sh"

LOG_FILE="$APP_PATH/logs/webhooks.log"

# Check if log directory exists, create if not
LOG_DIR="$(dirname "$LOG_FILE")"
if [ ! -d "$LOG_DIR" ]; then
		mkdir -p "$LOG_DIR"
fi

# If $1 is not provided, default to "???"
if [ -z "${1:-}" ]; then
		SOURCE="???"
else
		SOURCE="$1"
fi

# Function to log messages with timestamp
function log_message() {
		local MESSAGE="$2"
		echo "$(date '+%Y-%m-%d %H:%M:%S') [$SOURCE] $MESSAGE" >> "$LOG_FILE"
}
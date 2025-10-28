#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="/config/deploy.log"

# Function to log messages with timestamp
function log_message() {
		local MESSAGE="$1"
		echo "$(date '+%Y-%m-%d %H:%M:%S') $MESSAGE" >> "$LOG_FILE"
}
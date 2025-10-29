#!/bin/sh
# Exit immediately on error, treat unset vars as error
# Note: POSIX sh doesn’t support `set -euo pipefail` as a single invocation.
# We do what we can:
set -e
# Treat unset variables as error:
# Many sh implementations support `-u`, but if not you may skip it
set -u

FILE="/config/hooks/hooks.json"

# Check environment variable
if [ "${WEBHOOK_SECRET-}" = "" ]; then
  echo "ERROR: WEBHOOK_SECRET environment variable not set or empty" 1>&2
  exit 1
fi

# Check file existence
if [ ! -f "$FILE" ]; then
  echo "ERROR: File $FILE not found" 1>&2
  exit 1
fi

# The new value
NEWVAL=$WEBHOOK_SECRET

# Escape forward slashes and ampersands for sed
# Use `printf` for portability
ESCAPED_NEWVAL=$(printf '%s' "$NEWVAL" | sed 's/[\/&]/\\&/g')

# Perform in-place edit with backup
# Use a backup suffix “.bak” so you can recover if something goes wrong
# Use basic sed; dash/bin/sh should handle it
sed -i.bak "s/\"secret\"[[:space:]]*:[[:space:]]*\"REPLACE_ME\"/\"secret\": \"${ESCAPED_NEWVAL}\"/g" "$FILE"

echo "Updated $FILE (backup saved as $FILE.bak)"
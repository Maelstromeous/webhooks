#!/usr/bin/env bash
set -euo pipefail

FILE="./config/hooks/hooks.json"

if [[ -z "${WEBHOOK_SECRET:-}" ]]; then
  echo "ERROR: WEBHOOK_SECRET environment variable not set or empty" >&2
  exit 1
fi

if [[ ! -f "$FILE" ]]; then
  echo "ERROR: File $FILE not found" >&2
  exit 1
fi

# Replace the value for any key "secret" whose current value is "foobar"
# This matches lines containing "secret": "foobar"
# and replaces the "foobar" part with the new secret.
# Note: It assumes the structure is `"secret": "foobar"` (with double quotes, etc).
NEWVAL=${WEBHOOK_SECRET}
# Escape any forward-slashes or & in NEWVAL so sed substitution doesn’t break
ESCAPED_NEWVAL=$(printf '%s' "$NEWVAL" | sed -e 's/[\/&]/\\&/g')

# In-place edit. Backup with .bak extension in case something goes wrong
sed -i.bak -E "s/(\"secret\"\s*: \s*\")REPLACE_ME(\")/\1${ESCAPED_NEWVAL}\2/g" "$FILE"

echo "Updated $FILE (backup saved as $FILE.bak)"
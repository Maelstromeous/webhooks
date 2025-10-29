#!/bin/sh
set -e
set -u

FILE="/config/hooks/hooks.json"

if [ "${WEBHOOK_SECRET-}" = "" ]; then
  echo "ERROR: WEBHOOK_SECRET environment variable not set or empty" 1>&2
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "ERROR: File $FILE not found" 1>&2
  exit 1
fi

NEWVAL=$WEBHOOK_SECRET

tmpfile=$(mktemp) || exit 1

jq --arg new "$NEWVAL" '
  map(
    # For each object in the top-level array:
    if .["trigger-rule"]? and (.["trigger-rule"].and?) then
      .["trigger-rule"].and |= (
        map(
          if .match? and (.match.secret?) then
            .match.secret = $new
          else
            .
          end
        )
      )
    else
      .
    end
  )
' "$FILE" > "$tmpfile"

mv "$tmpfile" "$FILE"

echo "Updated $FILE using jq (all secret values replaced)"
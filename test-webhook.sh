#!/bin/bash

# test-webhook.sh
# Helper script to test the webhook endpoint with proper signature

set -e

# Configuration
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:3000/digletbot}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-test-secret-key}"

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo "Error: openssl is required but not installed"
    exit 1
fi

# Get payload from argument or use default
if [ -n "$1" ]; then
    PAYLOAD="$1"
else
    PAYLOAD='{"event":"test","action":"deployment"}'
fi

echo "Testing webhook endpoint..."
echo "URL: $WEBHOOK_URL"
echo "Payload: $PAYLOAD"
echo ""

# Calculate HMAC SHA256 signature
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')"

echo "Calculated signature: $SIGNATURE"
echo ""

# Send webhook request
echo "Sending webhook request..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$PAYLOAD")

# Extract HTTP status and response body
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Response (HTTP $HTTP_STATUS):"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Interpret result
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✓ Webhook succeeded!"
    exit 0
elif [ "$HTTP_STATUS" = "401" ]; then
    echo "✗ Authentication failed - invalid signature"
    exit 1
elif [ "$HTTP_STATUS" = "500" ]; then
    echo "✗ Server error - check logs for details"
    exit 1
else
    echo "✗ Unexpected response - HTTP $HTTP_STATUS"
    exit 1
fi

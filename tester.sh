BODY='{"foo":"bar"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "mysecret" -hex | sed 's/^.* //')
curl -X POST http://localhost:9000/hooks/test \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=$SIG" \
  --data "$BODY"
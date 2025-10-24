BODY='{"foo":"bar"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "foosecret" -hex | sed 's/^.* //')
curl -X POST http://localhost:9000/hooks/test -vvv \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature: sha256=$SIG" \
  --data "$BODY"
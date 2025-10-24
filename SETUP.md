# Setup Guide

This guide will walk you through setting up the webhook deployer from scratch.

## Prerequisites

1. **Node.js 20.x or later** (for local development)
2. **Docker** (for containerized deployment)
3. **SSH Access** to the remote host where digletbot is deployed
4. **SSH Private Key** for authentication

## Step 1: Clone the Repository

```bash
git clone https://github.com/Maelstromeous/webhooks.git
cd webhooks
```

## Step 2: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure the following required variables:

### Required Variables

1. **WEBHOOK_SECRET**: Generate a strong random secret
   ```bash
   # Generate a secure secret
   openssl rand -hex 32
   ```

2. **SSH_HOST**: The hostname or IP address of your remote server
   ```
   SSH_HOST=example.com
   ```

3. **SSH_USER**: The SSH username
   ```
   SSH_USER=deploy
   ```

4. **SSH_PRIVATE_KEY**: Your SSH private key in PEM format
   
   **Note**: For best security, use Ed25519 keys instead of RSA:
   ```bash
   # Generate an Ed25519 key (recommended)
   ssh-keygen -t ed25519 -C "webhook-deployer"
   
   # Or if Ed25519 is not supported, use RSA
   ssh-keygen -t rsa -b 4096 -C "webhook-deployer"
   
   # Get your private key content
   cat ~/.ssh/id_ed25519
   # or
   cat ~/.ssh/id_rsa
   ```
   
   Then paste it into the `.env` file:
   ```
   SSH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
   MIIEvgIBADANBgkqhkiG9w0BAQEF...
   ...
   -----END PRIVATE KEY-----"
   ```

### Optional Variables

- **SSH_PORT**: SSH port (default: 22)
- **SSH_COMMAND**: Custom command to execute (default: `docker compose pull && docker compose up -d digletbot`)
- **PORT**: Webhook server port (default: 3000)
- **LOG_LEVEL**: Logging level (default: info)

## Step 3: Prepare the Remote Server

On your remote server where digletbot is deployed:

1. Copy the `update-digletbot.sh` script:
   ```bash
   scp update-digletbot.sh user@remote-host:/path/to/script/
   ```

2. Make it executable:
   ```bash
   ssh user@remote-host 'chmod +x /path/to/script/update-digletbot.sh'
   ```

3. Update the script path in the docker-compose directory

4. (Optional) If using the script, update `SSH_COMMAND` in `.env`:
   ```
   SSH_COMMAND=/path/to/script/update-digletbot.sh
   ```

## Step 4: Deploy Using Docker Compose

Start the webhook deployer:

```bash
docker-compose up -d
```

Check the logs:

```bash
docker-compose logs -f
```

You should see:
```
webhook-deployer | [timestamp] INFO: Server listening on 0.0.0.0:3000
```

## Step 5: Configure Your Webhook Provider

### GitHub Webhooks

1. Go to your repository settings
2. Navigate to **Webhooks** → **Add webhook**
3. Configure:
   - **Payload URL**: `http://your-server:3000/digletbot`
   - **Content type**: `application/json`
   - **Secret**: Use the same value as `WEBHOOK_SECRET` in your `.env`
   - **Which events**: Choose the events that should trigger deployment (e.g., "push", "release")
   - **Active**: ✓

### Other Webhook Providers

Any service that supports HMAC SHA256 signatures with the `X-Hub-Signature-256` header can be used.

Calculate the signature:
```bash
echo -n '{"your":"payload"}' | openssl dgst -sha256 -hmac "your-webhook-secret"
```

## Step 6: Test the Webhook

### Test Health Check

```bash
curl http://your-server:3000/healthz
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-24T12:00:00.000Z"
}
```

### Test Webhook Endpoint

Using the provided test script (easiest method):

```bash
# Use default test payload
./test-webhook.sh

# Or provide a custom payload
./test-webhook.sh '{"event":"custom","data":"test"}'

# Test against a different URL
WEBHOOK_URL=http://your-server:3000/digletbot ./test-webhook.sh
```

Or manually with curl:

```bash
# Set your secret
SECRET="your-webhook-secret"
PAYLOAD='{"test":"deployment"}'

# Calculate signature
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')"

# Send test webhook
curl -X POST http://your-server:3000/digletbot \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$PAYLOAD"
```

Expected response (if SSH succeeds):
```json
{
  "success": true,
  "message": "Deployment triggered successfully",
  "output": "..."
}
```

## Troubleshooting

### Issue: "Invalid signature" error

**Solution**: Verify that:
- The `WEBHOOK_SECRET` matches on both webhook sender and receiver
- The signature is being calculated correctly
- The payload body hasn't been modified in transit

### Issue: SSH connection fails

**Solution**: Verify that:
- SSH_HOST, SSH_USER are correct
- SSH_PRIVATE_KEY is in the correct PEM format
- The private key has the correct permissions on the remote host
- The remote host accepts connections from the webhook server
- Try connecting manually: `ssh -i /path/to/key user@host`

### Issue: Docker compose command fails

**Solution**: Verify that:
- Docker and docker compose are installed on the remote host
- The SSH user has permissions to run docker commands
- The path to the docker-compose.yml file is correct
- The SSH_COMMAND is properly configured

### View Logs

```bash
# Docker compose logs
docker-compose logs -f webhook-deployer

# Check application logs for errors
docker-compose logs webhook-deployer | grep ERROR
```

## Security Best Practices

1. **Use strong secrets**: Generate webhook secrets with at least 32 characters
2. **Restrict SSH access**: Use SSH keys instead of passwords
3. **Firewall rules**: Only allow webhook traffic from trusted sources
4. **HTTPS**: Use a reverse proxy (nginx, traefik) to add HTTPS
5. **Monitor logs**: Regularly check logs for unauthorized access attempts
6. **Keep updated**: Regularly update Node.js, Docker, and dependencies
7. **Built-in Rate Limiting**: The service includes rate limiting (10 requests/min per IP) by default

### Rate Limiting

The webhook service includes built-in rate limiting that restricts requests to **10 per minute per IP address**. When the limit is exceeded, the service returns:

- HTTP 429 (Too Many Requests)
- `Retry-After` header indicating when to retry
- JSON error response with retry information

Example rate limit response:

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "retryAfter": 45
}
```

### Implementing Additional Rate Limiting

### Implementing Additional Rate Limiting

While the service includes built-in rate limiting (10 req/min per IP), you may want additional layers for production use, add rate limiting through:

**Option 1: Reverse Proxy (Recommended)**
Configure rate limiting in nginx:

```nginx
limit_req_zone $binary_remote_addr zone=webhook:10m rate=10r/m;

server {
    location /digletbot {
        limit_req zone=webhook burst=5;
        proxy_pass http://localhost:3000;
    }
}
```

**Option 2: Application-Level**
Add the Fastify rate limit plugin:

```bash
npm install @fastify/rate-limit
```

Then update `src/index.ts`:
```typescript
import rateLimit from '@fastify/rate-limit'

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes'
})
```

## Production Deployment

For production deployments, consider:

1. **Reverse Proxy**: Use nginx or Traefik for HTTPS termination
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Monitoring**: Set up monitoring and alerting
4. **Logging**: Configure centralized logging
5. **Backups**: Regular backups of configuration and logs

Example nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name webhook.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Updating the Application

To update the webhook deployer:

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

## Support

For issues or questions, please open an issue on GitHub.

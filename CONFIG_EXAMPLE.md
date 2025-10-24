# Service Configuration Example

This file demonstrates how to configure multiple services for webhook-based deployments.

## Environment Variables for Services

Each service requires its own SSH host configuration. The SSH user and private key are shared across all services.

### Shared Configuration (Required)

```bash
# Webhook authentication
WEBHOOK_SECRET=your-secret-key-here

# SSH credentials (shared across all services)
SSH_USER=deploy
SSH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...your private key here...
-----END PRIVATE KEY-----"

# Server settings
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
```

### Service-Specific Configuration

Each service needs its own SSH host and optionally custom SSH port and command.

#### DigletBot Service

```bash
# SSH host for digletbot service
DIGLETBOT_SSH_HOST=digletbot.example.com

# Optional: Custom SSH port (defaults to 22)
DIGLETBOT_SSH_PORT=22

# Optional: Custom deployment command
DIGLETBOT_SSH_COMMAND="docker compose pull && docker compose up -d digletbot"
```

#### Additional Services (Examples)

```bash
# Service B configuration
SERVICEB_SSH_HOST=serviceb.example.com
SERVICEB_SSH_PORT=22
SERVICEB_SSH_COMMAND="/opt/scripts/update-serviceb.sh"

# Service C configuration
SERVICEC_SSH_HOST=servicec.example.com
SERVICEC_SSH_COMMAND="cd /app && ./deploy.sh --version=\${VERSION}"
```

## Programmatic Configuration

You can also configure services programmatically by editing `src/config.ts`:

```typescript
export const servicesConfig: ServicesConfig = {
  digletbot: {
    host: process.env.DIGLETBOT_SSH_HOST || '',
    port: process.env.DIGLETBOT_SSH_PORT ? parseInt(process.env.DIGLETBOT_SSH_PORT) : 22,
    command: process.env.DIGLETBOT_SSH_COMMAND || 'docker compose pull && docker compose up -d digletbot',
    args: {}
  },
  serviceB: {
    host: process.env.SERVICEB_SSH_HOST || '',
    port: 22,
    command: '/opt/scripts/update-serviceb.sh',
    args: {
      version: 'latest' // Can be replaced at runtime
    }
  },
  serviceC: {
    host: process.env.SERVICEC_SSH_HOST || '',
    command: 'cd /app && ./deploy.sh --version=${VERSION}',
    args: {
      VERSION: 'v1.0.0' // Placeholder that can be interpolated
    }
  }
};
```

## Adding New Service Endpoints

After configuring a service in `src/config.ts`, add the endpoint in `src/index.ts`:

```typescript
// Webhook endpoints for each service
fastify.post('/digletbot', createWebhookEndpoint('digletbot'));
fastify.post('/serviceB', createWebhookEndpoint('serviceB'));
fastify.post('/serviceC', createWebhookEndpoint('serviceC'));
```

Each endpoint will:
1. Apply rate limiting (10 requests/min per IP)
2. Verify HMAC signature using `WEBHOOK_SECRET`
3. Execute the configured command on the configured SSH host
4. Return success/failure response

## Command Argument Interpolation

Commands can include placeholders that are replaced at runtime:

```typescript
serviceExample: {
  host: 'example.com',
  command: './deploy.sh --env=${ENV} --version=${VERSION}',
  args: {
    ENV: 'production',
    VERSION: '1.2.3'
  }
}
```

The command will be executed as: `./deploy.sh --env=production --version=1.2.3`

## Complete .env Example

```bash
# Webhook Configuration
WEBHOOK_SECRET=your-super-secret-webhook-key

# SSH Configuration (shared)
SSH_USER=deploy
SSH_PRIVATE_KEY="-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
...
-----END OPENSSH PRIVATE KEY-----"

# Service: DigletBot
DIGLETBOT_SSH_HOST=192.168.1.100
DIGLETBOT_SSH_PORT=22
DIGLETBOT_SSH_COMMAND="docker compose pull && docker compose up -d digletbot"

# Service: WebApp
WEBAPP_SSH_HOST=192.168.1.101
WEBAPP_SSH_COMMAND="cd /var/www/app && ./deploy.sh"

# Service: API
API_SSH_HOST=192.168.1.102
API_SSH_COMMAND="systemctl restart api-service"

# Server Configuration
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
NODE_ENV=production
```

## Testing Configuration

Test each service endpoint:

```bash
# Test digletbot endpoint
./test-webhook.sh '{"ref":"refs/heads/main"}' http://localhost:3000/digletbot

# Test another service
WEBHOOK_URL=http://localhost:3000/serviceB ./test-webhook.sh '{"event":"deployment"}'
```

## Security Notes

1. **One SSH Key**: All services use the same SSH private key for simplicity
2. **Per-Service Hosts**: Each service can connect to a different host
3. **Isolated Deployments**: Each service endpoint is independent
4. **Shared Rate Limiting**: All endpoints share the same rate limit pool per IP
5. **Unified Authentication**: All endpoints use the same WEBHOOK_SECRET

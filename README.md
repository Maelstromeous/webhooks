# Webhook Deployer

A Fastify TypeScript application that listens for webhooks and triggers Docker Compose deployments on remote hosts via SSH.

**📖 [Detailed Setup Guide](SETUP.md)** - Step-by-step instructions for deployment

**🔗 [GitHub Webhook Examples](GITHUB_WEBHOOK_EXAMPLE.md)** - GitHub webhook payload examples and integration guide

**⚙️ [Service Configuration Guide](CONFIG_EXAMPLE.md)** - Multi-service configuration and setup

## Features

- **POST /digletbot** - Webhook endpoint with HMAC SHA256 signature verification
- **GET /healthz** - Health check endpoint
- **SSH Remote Execution** - Securely execute Docker Compose commands on remote hosts
- **Pino Logging** - Structured logging with pino
- **Docker Support** - Containerized deployment with health checks
- **Rate Limiting** - Built-in rate limiting (10 requests per minute per IP)
- **Modular Architecture** - Clean separation of concerns with dedicated modules for authentication, SSH, and rate limiting
- **Multi-Service Support** - Configure and deploy multiple services with different SSH hosts using the same webhook server

## Prerequisites

- Node.js 20.x or later
- Docker (for containerized deployment)
- SSH access to the remote host with private key authentication

## Environment Variables

The following environment variables are required:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `WEBHOOK_SECRET` | Secret key for HMAC signature verification | Yes | - |
| `SSH_USER` | SSH username (shared across all services) | Yes | - |
| `SSH_PRIVATE_KEY` | SSH private key in PEM format (shared) | Yes | - |
| `DIGLETBOT_SSH_HOST` | SSH host for digletbot service | Yes | - |
| `DIGLETBOT_SSH_PORT` | SSH port for digletbot service | No | 22 |
| `DIGLETBOT_SSH_COMMAND` | Command to execute on digletbot host | No | `docker compose pull && docker compose up -d digletbot` |
| `PORT` | Port for the webhook server | No | 3000 |
| `HOST` | Host address to bind to | No | 0.0.0.0 |
| `LOG_LEVEL` | Logging level (trace, debug, info, warn, error, fatal) | No | info |
| `NODE_ENV` | Environment (production, development) | No | - |

**Note**: For multiple services, add similar environment variables with the service name prefix (e.g., `SERVICEB_SSH_HOST`, `SERVICEC_SSH_HOST`). See [CONFIG_EXAMPLE.md](CONFIG_EXAMPLE.md) for details.

## Installation

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your configuration:
```bash
WEBHOOK_SECRET=your-secret-key
DIGLETBOT_SSH_HOST=example.com
SSH_USER=deploy
SSH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
```

3. Build the application:
```bash
npm run build
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t webhook-deployer .
```

2. Run the container:
```bash
docker run -d \
  -p 3000:3000 \
  -e WEBHOOK_SECRET=your-secret-key \
  -e DIGLETBOT_SSH_HOST=example.com \
  -e SSH_USER=deploy \
  -e SSH_PRIVATE_KEY="$(cat ~/.ssh/id_rsa)" \
  --name webhook-deployer \
  webhook-deployer
```

Or using docker-compose (recommended):

1. Create a `.env` file (see `.env.example`):
```bash
cp .env.example .env
# Edit .env with your configuration
```

2. Start the service:
```bash
docker-compose up -d
```

3. View logs:
```bash
docker-compose logs -f webhook-deployer
```

4. Stop the service:
```bash
docker-compose down
```

## Usage

### Webhook Request

Send a POST request to `/digletbot` with an HMAC SHA256 signature in the `X-Hub-Signature-256` header.

For testing, use the included test script:

```bash
# Test with default payload
./test-webhook.sh

# Test with custom payload
./test-webhook.sh '{"event":"deployment","repo":"myapp"}'
```

Or manually calculate and send:

```bash
# Calculate signature
PAYLOAD='{"event":"deployment"}'
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "your-secret-key" | awk '{print $2}')"

# Send request
curl -X POST http://localhost:3000/digletbot \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Health Check

```bash
curl http://localhost:3000/healthz
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-24T12:00:00.000Z"
}
```

## Remote Deployment Script

The `update-digletbot.sh` script is provided as a reference for the command executed on the remote host. You can customize it according to your deployment setup.

To use it on the remote host:

1. Copy the script to your remote server
2. Update the path to your docker-compose.yml directory
3. Make it executable: `chmod +x update-digletbot.sh`
4. Set the `SSH_COMMAND` environment variable to point to the script location

## Security Considerations

- **HMAC Verification**: All webhook requests must include a valid HMAC SHA256 signature
- **Timing-Safe Comparison**: Signature verification uses timing-safe comparison to prevent timing attacks
- **SSH Key Authentication**: Uses private key authentication instead of passwords
- **Non-Root User**: Docker container runs as non-root user
- **Environment Variables**: Sensitive data should be passed via environment variables, not hardcoded
- **Rate Limiting**: Built-in rate limiting (10 requests per minute per IP) to prevent abuse

### Production Security Recommendations

For production deployments, consider implementing:

1. **Additional Rate Limiting**: The built-in rate limiting (10/min) can be supplemented with reverse proxy rate limiting for more granular control:
   - A reverse proxy (nginx, Traefik) with rate limiting
   - Fastify rate limit plugin: [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit)
   
   Example with Fastify rate limit:
   ```typescript
   import rateLimit from '@fastify/rate-limit'
   
   await fastify.register(rateLimit, {
     max: 100,
     timeWindow: '15 minutes'
   })
   ```

2. **IP Whitelisting**: Restrict webhook access to known IP addresses
3. **HTTPS**: Always use HTTPS in production with valid SSL certificates
4. **Monitoring**: Set up monitoring and alerting for failed authentication attempts
5. **Secret Rotation**: Regularly rotate webhook secrets and SSH keys

## Implementation Details

The application uses:
- **Fastify 4.28.1** for high-performance HTTP handling
- **ssh2** library for secure SSH connections
- **crypto** (built-in) for HMAC signature verification
- **pino** for structured logging

### Code Structure

```
src/
├── index.ts      # Main application and route handlers
├── auth.ts       # HMAC signature verification
├── ssh.ts        # SSH remote command execution
├── rateLimit.ts  # Rate limiting middleware (10 req/min per IP)
├── handler.ts    # Generic webhook handler and error handling
└── config.ts     # Service configuration and management
```

The architecture supports:
- **Generic authentication**: All endpoints use the same authentication hook
- **Centralized error handling**: SSH failures handled consistently
- **Multi-service deployments**: Easy to add new services with different hosts
- **Shared SSH credentials**: One SSH key for all services
- **Per-service configuration**: Each service has its own host and command

## Development

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run type-check
```

### Build

```bash
npm run build
```

## License

MIT

# Webhook Deployer

A Fastify TypeScript application that listens for webhooks and triggers Docker Compose deployments on remote hosts via SSH.

## Features

- **POST /digletbot** - Webhook endpoint with HMAC SHA256 signature verification
- **GET /healthz** - Health check endpoint
- **SSH Remote Execution** - Securely execute Docker Compose commands on remote hosts
- **Pino Logging** - Structured logging with pino
- **Docker Support** - Containerized deployment with health checks

## Prerequisites

- Node.js 20.x or later
- Docker (for containerized deployment)
- SSH access to the remote host with private key authentication

## Environment Variables

The following environment variables are required:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `WEBHOOK_SECRET` | Secret key for HMAC signature verification | Yes | - |
| `SSH_HOST` | Remote host address for SSH connection | Yes | - |
| `SSH_USER` | SSH username | Yes | - |
| `SSH_PRIVATE_KEY` | SSH private key (PEM format) | Yes | - |
| `SSH_PORT` | SSH port | No | 22 |
| `SSH_COMMAND` | Command to execute on remote host | No | `docker compose pull && docker compose up -d digletbot` |
| `PORT` | Port for the webhook server | No | 3000 |
| `HOST` | Host address to bind to | No | 0.0.0.0 |
| `LOG_LEVEL` | Logging level (trace, debug, info, warn, error, fatal) | No | info |
| `NODE_ENV` | Environment (production, development) | No | - |

## Installation

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your configuration:
```bash
WEBHOOK_SECRET=your-secret-key
SSH_HOST=example.com
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
  -e SSH_HOST=example.com \
  -e SSH_USER=deploy \
  -e SSH_PRIVATE_KEY="$(cat ~/.ssh/id_rsa)" \
  --name webhook-deployer \
  webhook-deployer
```

Or using docker-compose:
```yaml
version: '3.8'
services:
  webhook-deployer:
    build: .
    ports:
      - "3000:3000"
    environment:
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
      - SSH_HOST=${SSH_HOST}
      - SSH_USER=${SSH_USER}
      - SSH_PRIVATE_KEY=${SSH_PRIVATE_KEY}
      - LOG_LEVEL=info
```

## Usage

### Webhook Request

Send a POST request to `/digletbot` with an HMAC SHA256 signature in the `X-Hub-Signature-256` header:

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

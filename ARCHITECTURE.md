# Architecture Overview

## Request Flow

```
GitHub/External Webhook
         |
         v
    [POST /digletbot]
         |
         v
  [Rate Limiter] (10 req/min per IP)
         |
         v
  [authenticateWebhook] (Generic Auth Handler)
         |
         ├─ Verify HMAC Signature
         └─ Reject if invalid (401)
         |
         v
  [handleWebhookDeployment] (Generic Handler)
         |
         ├─ Load service config
         ├─ Interpolate command args
         └─ Execute via SSH
         |
         v
  [SSH Execution]
         |
         ├─ Success (200)
         └─ Error → [handleDeploymentError] (500)
```

## Multi-Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Webhook Server                       │
│                                                          │
│  Shared Components:                                     │
│  ├─ WEBHOOK_SECRET (authentication)                     │
│  ├─ SSH_USER (shared SSH user)                          │
│  └─ SSH_PRIVATE_KEY (shared SSH key)                    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Service Endpoints                      │    │
│  │                                                 │    │
│  │  POST /digletbot  →  digletbot.example.com    │    │
│  │  POST /serviceB   →  serviceb.example.com     │    │
│  │  POST /serviceC   →  servicec.example.com     │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Module Structure

```
src/
├── index.ts          - Server setup & endpoint registration
│   └─ createWebhookEndpoint(serviceName)
│
├── handler.ts        - Generic webhook handling
│   ├─ authenticateWebhook()      (preHandler hook)
│   ├─ handleWebhookDeployment()  (main handler)
│   └─ handleDeploymentError()    (error handler)
│
├── config.ts         - Service configuration
│   ├─ servicesConfig{}
│   ├─ getServiceConfig()
│   └─ interpolateCommand()
│
├── auth.ts           - HMAC signature verification
│   └─ verifySignature()
│
├── ssh.ts            - SSH command execution
│   └─ executeRemoteCommand()
│
└── rateLimit.ts      - Rate limiting middleware
    └─ rateLimitMiddleware()
```

## Service Configuration Pattern

Each service is configured with:

```typescript
serviceN ame: {
  host: 'example.com',           // SSH host (unique per service)
  port: 22,                       // SSH port (optional)
  command: './deploy.sh',         // Command to execute
  args: {                         // Optional arguments
    VERSION: '1.0.0'
  }
}
```

Environment variables:
- `{SERVICE}_SSH_HOST` - SSH host for the service
- `{SERVICE}_SSH_PORT` - SSH port (optional)
- `{SERVICE}_SSH_COMMAND` - Deployment command (optional)

Shared across all services:
- `WEBHOOK_SECRET` - For signature verification
- `SSH_USER` - SSH username
- `SSH_PRIVATE_KEY` - SSH private key

## Adding a New Service

1. **Add configuration** (environment variables):
   ```bash
   NEWSERVICE_SSH_HOST=newservice.example.com
   NEWSERVICE_SSH_COMMAND="./deploy-newservice.sh"
   ```

2. **Register endpoint** (src/index.ts):
   ```typescript
   fastify.post('/newservice', createWebhookEndpoint('newservice'));
   ```

3. **Configure webhook** in GitHub/external service:
   - URL: `https://your-server.com/newservice`
   - Secret: Your `WEBHOOK_SECRET`

The endpoint automatically gets:
- ✓ Rate limiting
- ✓ Signature verification
- ✓ Error handling
- ✓ Logging

## Benefits

1. **DRY Principle**: No code duplication for new services
2. **Centralized Auth**: All endpoints use the same authentication
3. **Shared Resources**: One SSH key for all services
4. **Flexible Config**: Each service can have unique host and command
5. **Consistent Errors**: Unified error handling across all services
6. **Easy Extension**: Add new services with minimal code

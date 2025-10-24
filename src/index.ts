import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { rateLimitMiddleware } from './rateLimit';
import { authenticateWebhook, handleWebhookDeployment, WebhookHandlerOptions } from './handler';
import { validateServiceConfig } from './config';

// Environment variables
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST || '0.0.0.0';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const SSH_USER = process.env.SSH_USER || '';
const SSH_PRIVATE_KEY = process.env.SSH_PRIVATE_KEY || '';

// Validate required environment variables
if (!WEBHOOK_SECRET) {
  throw new Error('WEBHOOK_SECRET environment variable is required');
}

if (!SSH_USER || !SSH_PRIVATE_KEY) {
  throw new Error('SSH_USER and SSH_PRIVATE_KEY environment variables are required');
}

// Validate service configurations at startup
try {
  validateServiceConfig('digletbot');
} catch (error) {
  console.error('Configuration validation failed:', error);
  throw error;
}

// Create Fastify instance with pino logger
const fastify = Fastify<Server, IncomingMessage, ServerResponse>({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  }
});

// Handler options shared across all webhook endpoints
const handlerOptions: WebhookHandlerOptions = {
  webhookSecret: WEBHOOK_SECRET,
  sshUser: SSH_USER,
  sshPrivateKey: SSH_PRIVATE_KEY,
  logger: fastify.log
};

// Health check endpoint
fastify.get('/healthz', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Generic webhook endpoint factory
// This creates consistent endpoints for all services
function createWebhookEndpoint(serviceName: string) {
  return {
    preHandler: [
      rateLimitMiddleware,
      async (request: FastifyRequest, reply: FastifyReply) => {
        await authenticateWebhook(request, reply, handlerOptions);
      }
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      await handleWebhookDeployment(serviceName, request, reply, handlerOptions);
    }
  };
}

// Webhook endpoint for digletbot service
fastify.post('/digletbot', createWebhookEndpoint('digletbot'));

// Add more service endpoints as needed:
// fastify.post('/serviceB', createWebhookEndpoint('serviceB'));
// fastify.post('/serviceC', createWebhookEndpoint('serviceC'));

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

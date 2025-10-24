import Fastify from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';
import { Client } from 'ssh2';
import { IncomingMessage, Server, ServerResponse } from 'http';

// Environment variables
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST || '0.0.0.0';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const SSH_HOST = process.env.SSH_HOST || '';
const SSH_PORT = process.env.SSH_PORT ? parseInt(process.env.SSH_PORT) : 22;
const SSH_USER = process.env.SSH_USER || '';
const SSH_PRIVATE_KEY = process.env.SSH_PRIVATE_KEY || '';
const SSH_COMMAND = process.env.SSH_COMMAND || 'docker compose pull && docker compose up -d digletbot';

// Validate required environment variables
if (!WEBHOOK_SECRET) {
  throw new Error('WEBHOOK_SECRET environment variable is required');
}

if (!SSH_HOST || !SSH_USER || !SSH_PRIVATE_KEY) {
  throw new Error('SSH_HOST, SSH_USER, and SSH_PRIVATE_KEY environment variables are required');
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

/**
 * Verify HMAC SHA256 signature
 */
function verifySignature(payload: string, signature: string | undefined): boolean {
  if (!signature) {
    return false;
  }

  // Compute HMAC
  const hmac = createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(payload);
  const digest = 'sha256=' + hmac.digest('hex');

  // Timing-safe comparison
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    // If lengths don't match, timingSafeEqual throws
    return false;
  }
}

/**
 * Execute command on remote host via SSH
 */
async function executeRemoteCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';

    conn.on('ready', () => {
      fastify.log.info('SSH connection established');
      
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        stream.on('close', (code: number) => {
          fastify.log.info({ code }, 'Command completed');
          conn.end();
          
          if (code === 0) {
            resolve({ stdout, stderr });
          } else {
            reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
          }
        });

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      });
    });

    conn.on('error', (err) => {
      fastify.log.error({ err }, 'SSH connection error');
      reject(err);
    });

    // Connect to SSH
    conn.connect({
      host: SSH_HOST,
      port: SSH_PORT,
      username: SSH_USER,
      privateKey: SSH_PRIVATE_KEY
    });
  });
}

// Health check endpoint
fastify.get('/healthz', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Webhook endpoint
fastify.post('/digletbot', async (request, reply) => {
  const signature = request.headers['x-hub-signature-256'] as string | undefined;
  const rawBody = JSON.stringify(request.body);

  fastify.log.info('Received webhook request');

  // Verify signature
  if (!verifySignature(rawBody, signature)) {
    fastify.log.warn('Invalid signature');
    return reply.code(401).send({ error: 'Invalid signature' });
  }

  fastify.log.info('Signature verified, executing deployment');

  try {
    const result = await executeRemoteCommand(SSH_COMMAND);
    fastify.log.info({ stdout: result.stdout, stderr: result.stderr }, 'Deployment completed');
    
    return reply.code(200).send({
      success: true,
      message: 'Deployment triggered successfully',
      output: result.stdout
    });
  } catch (error) {
    fastify.log.error({ error }, 'Deployment failed');
    
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

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

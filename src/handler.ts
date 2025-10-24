import { FastifyRequest, FastifyReply } from 'fastify';
import { verifySignature } from './auth';
import { executeRemoteCommand } from './ssh';
import { getServiceConfig, interpolateCommand } from './config';

export interface WebhookHandlerOptions {
  webhookSecret: string;
  sshUser: string;
  sshPrivateKey: string;
  logger?: {
    info: (obj: unknown, msg?: string) => void;
    warn: (obj: unknown, msg?: string) => void;
    error: (obj: unknown, msg?: string) => void;
  };
}

/**
 * Generic authentication hook for all webhook endpoints
 * Verifies HMAC signature before allowing request to proceed
 */
export async function authenticateWebhook(
  request: FastifyRequest,
  reply: FastifyReply,
  options: WebhookHandlerOptions
): Promise<void> {
  const signature = request.headers['x-hub-signature-256'] as string | undefined;
  const rawBody = JSON.stringify(request.body);

  options.logger?.info('Received webhook request');

  // Verify signature
  if (!verifySignature(rawBody, signature, options.webhookSecret)) {
    options.logger?.warn('Invalid signature');
    reply.code(401).send({ error: 'Invalid signature' });
    throw new Error('Invalid signature'); // Stop further processing
  }

  options.logger?.info('Signature verified');
}

/**
 * Generic webhook handler for deploying a service
 * This handles the common logic for all service endpoints
 */
export async function handleWebhookDeployment(
  serviceName: string,
  request: FastifyRequest,
  reply: FastifyReply,
  options: WebhookHandlerOptions
): Promise<void> {
  options.logger?.info({ serviceName }, 'Processing deployment request');

  try {
    // Get service configuration
    const serviceConfig = getServiceConfig(serviceName);
    if (!serviceConfig) {
      throw new Error(`Service '${serviceName}' not found in configuration`);
    }

    if (!serviceConfig.host) {
      throw new Error(`SSH host not configured for service '${serviceName}'`);
    }

    // Interpolate any arguments in the command
    const command = interpolateCommand(serviceConfig.command, serviceConfig.args);

    options.logger?.info({ serviceName, host: serviceConfig.host, command }, 'Executing deployment');

    // Execute remote command
    const result = await executeRemoteCommand(
      command,
      {
        host: serviceConfig.host,
        port: serviceConfig.port || 22,
        username: options.sshUser,
        privateKey: options.sshPrivateKey
      },
      options.logger
    );

    options.logger?.info(
      { serviceName, stdout: result.stdout, stderr: result.stderr },
      'Deployment completed successfully'
    );

    return reply.code(200).send({
      success: true,
      service: serviceName,
      message: 'Deployment triggered successfully',
      output: result.stdout
    });
  } catch (error) {
    // Generic error handler for SSH failures
    return handleDeploymentError(serviceName, error, reply, options);
  }
}

/**
 * Generic error handler for deployment failures
 * Centralizes error handling logic for all services
 */
export function handleDeploymentError(
  serviceName: string,
  error: unknown,
  reply: FastifyReply,
  options: WebhookHandlerOptions
): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  options.logger?.error(
    { serviceName, error: errorMessage },
    'Deployment failed'
  );

  reply.code(500).send({
    success: false,
    service: serviceName,
    error: errorMessage
  });
}

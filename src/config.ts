/**
 * Service configuration
 * Each service can have its own SSH host and command to execute
 */

export interface ServiceConfig {
  host: string;
  port?: number;
  command: string;
  args?: Record<string, string>;
}

export interface ServicesConfig {
  [serviceName: string]: ServiceConfig;
}

// Default configuration - can be overridden by environment variables or config file
export const servicesConfig: ServicesConfig = {
  digletbot: {
    host: process.env.DIGLETBOT_SSH_HOST || '',
    port: process.env.DIGLETBOT_SSH_PORT ? parseInt(process.env.DIGLETBOT_SSH_PORT) : 22,
    command: process.env.DIGLETBOT_SSH_COMMAND || 'docker compose pull && docker compose up -d digletbot',
    args: {}
  }
  // Add more services as needed:
  // serviceB: {
  //   host: process.env.SERVICEB_SSH_HOST || '',
  //   port: 22,
  //   command: '/path/to/update-serviceB.sh',
  //   args: {
  //     version: '${VERSION}' // Can be replaced at runtime
  //   }
  // }
};

/**
 * Get service configuration by name
 */
export function getServiceConfig(serviceName: string): ServiceConfig | undefined {
  return servicesConfig[serviceName];
}

/**
 * Validate that required service configuration exists
 */
export function validateServiceConfig(serviceName: string): void {
  const config = getServiceConfig(serviceName);
  if (!config) {
    throw new Error(`Service '${serviceName}' not found in configuration`);
  }
  if (!config.host) {
    throw new Error(`SSH host not configured for service '${serviceName}'`);
  }
}

/**
 * Replace argument placeholders in command
 */
export function interpolateCommand(command: string, args?: Record<string, string>): string {
  if (!args) {
    return command;
  }
  
  let interpolated = command;
  for (const [key, value] of Object.entries(args)) {
    interpolated = interpolated.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
  }
  
  return interpolated;
}

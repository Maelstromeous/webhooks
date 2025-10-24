import { Client } from 'ssh2';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  privateKey: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}

/**
 * Execute command on remote host via SSH
 */
export async function executeRemoteCommand(
  command: string,
  config: SSHConfig,
  logger?: { info: (obj: unknown, msg?: string) => void; error: (obj: unknown, msg?: string) => void }
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';

    conn.on('ready', () => {
      logger?.info('SSH connection established');
      
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        stream.on('close', (code: number) => {
          logger?.info({ code }, 'Command completed');
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
      logger?.error({ err }, 'SSH connection error');
      reject(err);
    });

    // Connect to SSH
    conn.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      privateKey: config.privateKey
    });
  });
}

import { Logger } from '@nestjs/common';
import { type Connection, ConnectionStates } from 'mongoose';

export interface ReconnectLogger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/**
 * Makes a lazily-opened Mongoose connection survive Mongo being unavailable
 * at boot. Without this, the first failed connect emits an unhandled 'error'
 * and the process exits. While the connection has never been established we
 * retry openUri every `delayMs`; once connected, the driver's own topology
 * monitoring handles later reconnects.
 */
export function attachMongoReconnect(
  connection: Connection,
  uri: string,
  logger: ReconnectLogger = new Logger('Mongo'),
  delayMs = 3000,
): Connection {
  let pending: NodeJS.Timeout | undefined;

  const isConnected = (): boolean =>
    connection.readyState === ConnectionStates.connected;

  const scheduleRetry = (): void => {
    if (pending || isConnected()) return;
    pending = setTimeout(() => {
      pending = undefined;
      logger.warn('retrying Mongo connection');
      connection.openUri(uri).catch(() => scheduleRetry());
    }, delayMs);
    pending.unref();
  };

  connection.on('error', (error: Error) => {
    logger.error(`Mongo connection error: ${error.message}`);
    scheduleRetry();
  });
  connection.on('connected', () => logger.log('Mongo connected'));
  connection.on('disconnected', () => logger.warn('Mongo disconnected'));

  return connection;
}

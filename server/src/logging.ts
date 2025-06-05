import { env } from './env';
import pino from 'pino';

export const logger = pino(
  env.nodeEnv === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
        level: 'debug',
      }
    : {}
);

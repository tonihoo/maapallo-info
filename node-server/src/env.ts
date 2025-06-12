import 'dotenv/config';

if (process.env.NODE_ENV === 'development') {
  try {
    require('../.env');
  } catch (err) {
    // Ignore errors - only used for restarting server on .env changes
  }
}

function getEnv() {
  return {
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
    serverPort: Number(process.env.SERVER_PORT),
    db: {
      host: process.env.PG_HOST,
      port: Number(process.env.PG_PORT),
      database: process.env.PG_DATABASE,
      username: process.env.PG_USER,
      password: process.env.PG_PASS,
      sslMode: process.env.PG_SSLMODE || 'disable',
    },
  };
}

export const env = getEnv();

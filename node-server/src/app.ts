import { env } from './env';
import fastifySensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import { createDatabasePool } from '@server/db';
import { logger } from '@server/logging';
import { routes } from '@server/routes';
import fastify from 'fastify';
import { join } from 'path';

async function run() {
  await createDatabasePool();

  const server = fastify({ logger });

  server.register(fastifySensible);
  server.setNotFoundHandler((req, reply) => {
    const url = req.raw.url;
    // For not found /api throw a 404 error
    if (url?.startsWith('/api')) {
      throw server.httpErrors.notFound(`${url} not found`);
    }
    // For other routes -> let the frontend handle the client-side routing
    reply.sendFile('index.html');
  });

  // Serve frontend files as static files from the root URL
  server.register(fastifyStatic, {
    root: join(__dirname, '../static'),
    prefix: '/',
  });

  server.register(routes, { prefix: '/api/v1' });

  server.listen({ host: '0.0.0.0', port: env.serverPort }, (err) => {
    if (err) {
      logger.error(err);
      process.exit(1);
    }
  });
}

run();

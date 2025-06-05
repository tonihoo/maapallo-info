import { getPool } from '@server/db';
import { logger } from '@server/logging';
import fastify from 'fastify';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { sql } from 'slonik';
import { z } from 'zod';

interface ComponentCheckResult {
  status: 'pass' | 'fail';
  time: Date;
}

async function checkDB(): Promise<ComponentCheckResult> {
  const checkTime = new Date();
  try {
    const pingResult = await getPool().oneFirst(
      sql.type(z.string())`SELECT 'pong'`
    );
    return {
      status: pingResult === 'pong' ? 'pass' : 'fail',
      time: checkTime,
    };
  } catch (error) {
    logger.error(error);
    return {
      status: 'fail',
      time: checkTime,
    };
  }
}

export function healthRouter(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: () => void
) {
  fastify.get('/', async function (_request, reply) {
    const checks = {
      'appDatabase:ping': await checkDB(),
    };

    const allPassed = Object.values(checks).every(
      (check) => check.status === 'pass'
    );

    return reply.code(allPassed ? 200 : 500).send({
      status: allPassed ? 'pass' : 'fail',
      description: 'status of the service',
      checks,
    });
  });

  done();
}

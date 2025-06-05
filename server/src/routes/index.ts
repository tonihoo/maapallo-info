import { healthRouter } from "./health";
import { featureRouter } from "./feature";
import { FastifyInstance, FastifyPluginOptions } from "fastify";

export function routes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: () => void
) {
  fastify.register(healthRouter, { prefix: "/health" });
  fastify.register(featureRouter, { prefix: "/feature" });
  done();
}

import { getAllFeatures, getFeatureById, createFeature } from "@server/application/feature";
import { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginOptions } from "fastify";
import { featureSchema } from "@shared/featureTypes";

const handleError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return "Unknown error";
};

export function featureRouter(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: () => void
) {
  // GET all features
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const features = await getAllFeatures();
      return reply.code(200).send({ features });
    } catch (error: unknown) {
      request.log.error(error);
      return reply.code(500).send({
        error: "Internal Server Error",
        message: handleError(error)
      });
    }
  });

  // GET feature by ID
  fastify.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "ID must be a number"
      });
    }

    try {
      const feature = await getFeatureById(id);

      if (!feature) {
        return reply.code(404).send({
          error: "Not Found",
          message: `Feature with ID ${id} not found`
        });
      }

      return reply.code(200).send({ feature });
    } catch (error: unknown) {
      request.log.error(error);
      return reply.code(500).send({
        error: "Internal Server Error",
        message: handleError(error)
      });
    }
  });

  // POST new feature
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validationResult = featureSchema.safeParse(request.body);

      if (!validationResult.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Invalid feature data",
          details: validationResult.error.errors
        });
      }

      const newFeature = await createFeature(request.body as any);
      return reply.code(201).send({
        feature: newFeature,
        message: "Feature created successfully"
      });
    } catch (error: unknown) {
      request.log.error(error);
      return reply.code(500).send({
        error: "Internal Server Error",
        message: handleError(error)
      });
    }
  });

  done();
}

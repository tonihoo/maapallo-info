import { getAllHedgehogs, getHedgehogById, createHedgehog } from "@server/application/hedgehog";
import { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginOptions } from "fastify";
import { hedgehogSchema } from "@shared/hedgehog";

const handleError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return "Unknown error";
};

export function hedgehogRouter(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: () => void
) {
  // GET all hedgehogs
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const hedgehogs = await getAllHedgehogs();
      return reply.code(200).send({ hedgehogs });
    } catch (error: unknown) {
      request.log.error(error);
      return reply.code(500).send({
        error: "Internal Server Error",
        message: handleError(error)
      });
    }
  });

  // GET hedgehog by ID
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
      const hedgehog = await getHedgehogById(id);

      if (!hedgehog) {
        return reply.code(404).send({
          error: "Not Found",
          message: `Hedgehog with ID ${id} not found`
        });
      }

      return reply.code(200).send({ hedgehog });
    } catch (error: unknown) {
      request.log.error(error);
      return reply.code(500).send({
        error: "Internal Server Error",
        message: handleError(error)
      });
    }
  });

  // POST new hedgehog
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validationResult = hedgehogSchema.safeParse(request.body);

      if (!validationResult.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Invalid hedgehog data",
          details: validationResult.error.errors
        });
      }

      const newHedgehog = await createHedgehog(request.body as any);
      return reply.code(201).send({
        hedgehog: newHedgehog,
        message: "Hedgehog created successfully"
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

import { z } from "zod";

/**
 * Feature interface for client-side use
 * Originally shared between server and client, but now the Python server
 * uses Pydantic schemas instead of these TypeScript types.
 */

export const featureSchema = z.object({
  id: z.number().optional(), // ID is optional for new features
  title: z.string().min(1),
  author: z.string().min(1),
  thumbnail: z.string().url().optional().nullable(),
  excerpt: z.string().min(1),
  publication: z.string().min(1),
  link: z.string().url(),
  location: z.object({
    type: z.enum(["Point", "Polygon"]),
    coordinates: z.array(z.any()), // Accepts [number, number] for Point, or array of arrays for Polygon
  }),
});

export type FeatureTypes = z.infer<typeof featureSchema>;

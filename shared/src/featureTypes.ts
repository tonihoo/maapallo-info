import { z } from "zod";

/**
 * Feature interface shared between server and client
 */

export const featureSchema = z.object({
  id: z.number().optional(), // ID is optional for new features
  name: z.string().min(1),
  age: z.number().int().nonnegative("Age must be zero or positive"),
  gender: z.enum(["male", "female", "unknown"]),
  location: z.object({
    type: z.literal("Point"),
    coordinates: z.array(z.number()).length(2)
  })
});

export type FeatureTypes = z.infer<typeof featureSchema>;

import { getPool } from "@server/db";
import { logger } from "@server/logging";
import { featureSchema } from "@shared/featureTypes";
import { sql } from "slonik";

export async function getAllFeatures() {
  try {
    const features = await getPool().query(
      sql.type(featureSchema)`
        SELECT id, name, age, gender, ST_AsGeoJSON(location)::json AS location
        FROM feature
      `
    );

    return features.rows;
  } catch (error: unknown) {
    logger.error("Failed to retrieve features list:", error);
    let errorMessage =
      error instanceof Error ? error.message : "Unknown database error";
    throw new Error(`Database error: ${errorMessage}`);
  }
}

export async function getFeatureById(id: number) {
  try {
    const feature = await getPool().maybeOne(
      sql.type(featureSchema)`
        SELECT id, name, age, gender, ST_AsGeoJSON(location)::json AS location
        FROM feature
        WHERE id = ${id}
      `
    );

    return feature;
  } catch (error: unknown) {
    logger.error(`Failed to retrieve feature with ID ${id}:`, error);
    let errorMessage =
      error instanceof Error ? error.message : "Unknown database error";
    throw new Error(`Database error: ${errorMessage}`);
  }
}

export async function createFeature(featureData: {
  name: string;
  age: number;
  gender: string;
  location: {
    type: string;
    coordinates: number[];
  };
}) {
  try {
    const locationJson = JSON.stringify(featureData.location);

    const newFeature = await getPool().one(
      sql.type(featureSchema)`
        INSERT INTO feature (name, age, gender, location)
        VALUES (
          ${featureData.name},
          ${featureData.age},
          ${featureData.gender},
          ST_SetSRID(ST_GeomFromGeoJSON(${locationJson}), 3067)
        )
        RETURNING id, name, age, gender, ST_AsGeoJSON(location)::json as location
      `
    );

    return newFeature;
  } catch (error: unknown) {
    logger.error("Failed to create feature:", error);
    let errorMessage =
      error instanceof Error ? error.message : "Unknown database error";
    throw new Error(`Database error: ${errorMessage}`);
  }
}

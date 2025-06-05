import { getPool } from "@server/db";
import { logger } from "@server/logging";
import { hedgehogSchema } from "@shared/hedgehog";
import { sql } from "slonik";

export async function getAllHedgehogs() {
  try {
    const hedgehogs = await getPool().query(
      sql.type(hedgehogSchema)`
        SELECT id, name FROM hedgehog
      `
    );

    return hedgehogs.rows;
  } catch (error: unknown) {
    logger.error("Failed to retrieve hedgehogs list:", error);
    let errorMessage =
      error instanceof Error ? error.message : "Unknown database error";
    throw new Error(`Database error: ${errorMessage}`);
  }
}

export async function getHedgehogById(id: number) {
  try {
    const hedgehog = await getPool().maybeOne(
      sql.type(hedgehogSchema)`
        SELECT id, name, age, gender, ST_AsGeoJSON(location)::json AS location
        FROM hedgehog
        WHERE id = ${id}
      `
    );

    return hedgehog;
  } catch (error: unknown) {
    logger.error(`Failed to retrieve hedgehog with ID ${id}:`, error);
    let errorMessage =
      error instanceof Error ? error.message : "Unknown database error";
    throw new Error(`Database error: ${errorMessage}`);
  }
}

export async function createHedgehog(hedgehogData: {
  name: string;
  age: number;
  gender: string;
  location: {
    type: string;
    coordinates: number[];
  };
}) {
  try {
    const locationJson = JSON.stringify(hedgehogData.location);

    const newHedgehog = await getPool().one(
      sql.type(hedgehogSchema)`
        INSERT INTO hedgehog (name, age, gender, location)
        VALUES (
          ${hedgehogData.name},
          ${hedgehogData.age},
          ${hedgehogData.gender},
          ST_SetSRID(ST_GeomFromGeoJSON(${locationJson}), 3067)
        )
        RETURNING id, name, age, gender, ST_AsGeoJSON(location)::json as location
      `
    );

    return newHedgehog;
  } catch (error: unknown) {
    logger.error("Failed to create hedgehog:", error);
    let errorMessage =
      error instanceof Error ? error.message : "Unknown database error";
    throw new Error(`Database error: ${errorMessage}`);
  }
}

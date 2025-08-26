-- Migration to add population density by country 2022 table
-- This table contains population density data imported from QGIS

-- Create the population density table if it doesn't exist
-- (since you've already imported data, this will ensure consistency)
CREATE TABLE IF NOT EXISTS pop_density_by_country_2022_num (
    fid INTEGER NOT NULL PRIMARY KEY,
    geom GEOMETRY(MULTIPOLYGON, 4326),
    "NAME" VARCHAR,
    "ISO_A3" VARCHAR,
    pop_density_2022_num DOUBLE PRECISION
);

-- Create spatial index for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_pop_density_2022_geom
ON pop_density_by_country_2022_num USING GIST (geom);

-- Create index on population density for faster queries
CREATE INDEX IF NOT EXISTS idx_pop_density_2022_value
ON pop_density_by_country_2022_num (pop_density_2022_num);

-- Create index on country codes for joins
CREATE INDEX IF NOT EXISTS idx_pop_density_2022_iso_a3
ON pop_density_by_country_2022_num ("ISO_A3");

-- Add table comment
COMMENT ON TABLE pop_density_by_country_2022_num IS 'Population density by country for 2022, imported from QGIS with Natural Earth country boundaries';
COMMENT ON COLUMN pop_density_by_country_2022_num.pop_density_2022_num IS 'Population density per square kilometer in 2022';
COMMENT ON COLUMN pop_density_by_country_2022_num.geom IS 'Country geometry in WGS84 (EPSG:4326)';
COMMENT ON COLUMN pop_density_by_country_2022_num."NAME" IS 'Country name in English';
COMMENT ON COLUMN pop_density_by_country_2022_num."ISO_A3" IS 'ISO 3166-1 alpha-3 country code';

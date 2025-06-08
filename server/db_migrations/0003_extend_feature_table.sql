ALTER TABLE feature
  ADD COLUMN name VARCHAR(255) NOT NULL,
  ADD COLUMN age INTEGER NOT NULL;

CREATE TYPE feature_gender AS ENUM ('male', 'female', 'unknown');

ALTER TABLE feature
  ADD COLUMN gender feature_gender NOT NULL,
  ADD COLUMN location GEOMETRY(Point, 3067) NOT NULL;

COMMENT ON COLUMN feature.location IS 'Location of features in ETRS89-TM35FIN (EPSG:3067)';

CREATE INDEX feature_location_idx ON feature USING GIST (location);

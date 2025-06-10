DROP TABLE IF EXISTS feature;

CREATE TABLE feature (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  thumbnail TEXT,
  excerpt TEXT NOT NULL,
  publication TEXT NOT NULL,
  link TEXT NOT NULL,
  location geometry(GEOMETRY, 3067) NOT NULL
);

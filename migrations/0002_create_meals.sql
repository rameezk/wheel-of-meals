CREATE TABLE meals (
  id TEXT PRIMARY KEY,
  household_slug TEXT NOT NULL REFERENCES households(slug) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX meals_one_name_per_household
  ON meals (household_slug, lower(trim(name)));

CREATE INDEX meals_by_household ON meals (household_slug);

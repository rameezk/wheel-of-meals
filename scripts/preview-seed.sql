INSERT INTO households (slug, name, cooking_days, created_at)
VALUES (
  'warm-buttered-crusty-bread',
  'The Preview Household',
  '["monday","tuesday","wednesday","friday","saturday"]',
  '2026-01-01T00:00:00.000Z'
)
ON CONFLICT DO NOTHING;

INSERT INTO meals (id, household_slug, name, description, source, created_at)
VALUES
  ('preview-meal-01', 'warm-buttered-crusty-bread', 'Roast chicken', 'With whatever root vegetables are in the drawer.', 'https://recipes.example.com/roast-chicken', '2026-01-01T00:00:00.000Z'),
  ('preview-meal-02', 'warm-buttered-crusty-bread', 'Spaghetti bolognese', 'Simmered for as long as the evening allows.', NULL, '2026-01-01T00:00:00.000Z'),
  ('preview-meal-03', 'warm-buttered-crusty-bread', 'Chickpea curry', 'Coconut milk, spinach, far too much garlic.', NULL, '2026-01-01T00:00:00.000Z'),
  ('preview-meal-04', 'warm-buttered-crusty-bread', 'Fish tacos', NULL, NULL, '2026-01-01T00:00:00.000Z'),
  ('preview-meal-05', 'warm-buttered-crusty-bread', 'Mushroom risotto', 'Needs stirring, so not a Friday.', NULL, '2026-01-01T00:00:00.000Z'),
  ('preview-meal-06', 'warm-buttered-crusty-bread', 'Shepherds pie', 'Doubles well and freezes better.', NULL, '2026-01-01T00:00:00.000Z'),
  ('preview-meal-07', 'warm-buttered-crusty-bread', 'Pad thai', NULL, NULL, '2026-01-01T00:00:00.000Z'),
  ('preview-meal-08', 'warm-buttered-crusty-bread', 'Lentil soup', 'The one that uses up the crusty bread.', NULL, '2026-01-01T00:00:00.000Z'),
  ('preview-meal-09', 'warm-buttered-crusty-bread', 'Homemade pizza', 'Dough started the night before.', 'https://recipes.example.com/pizza-dough?rise=overnight', '2026-01-01T00:00:00.000Z'),
  ('preview-meal-10', 'warm-buttered-crusty-bread', 'Beef stir fry', NULL, NULL, '2026-01-01T00:00:00.000Z'),
  ('preview-meal-11', 'warm-buttered-crusty-bread', 'Butternut lasagne', 'Sage butter if there is sage.', NULL, '2026-01-01T00:00:00.000Z'),
  ('preview-meal-12', 'warm-buttered-crusty-bread', 'Bunny chow', 'Quarter loaf, mutton curry, no cutlery.', NULL, '2026-01-01T00:00:00.000Z')
ON CONFLICT DO NOTHING;

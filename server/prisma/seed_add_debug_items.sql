-- seed_add_debug_items.sql
-- Adds a small debug item to each container for local testing.
-- Behavior:
--  - For each container that belongs to a character (container.characterId is not null), insert one Item with name 'DEBUG_TINY' and quantity 1 if that container does not already have an item with that name.
--  - If a container has no characterId but there exists at least one Character, the script will use the first Character.id as characterId for the inserted item.
--  - Ensures containerIndex is set to the next available index within that container (max(containerIndex)+1 or 0 if none).
--  - Idempotent with respect to 'DEBUG_TINY' items already present in a container.

START TRANSACTION;

-- Determine a fallback character id if needed (first character in table)
SET @fallback_character_id = (SELECT id FROM Character ORDER BY id LIMIT 1);

-- Cursor-like loop using a select makes this cross-MySQL friendly without stored procedures
-- For each container, insert a DEBUG_TINY item if one does not already exist in that container
INSERT INTO Item (name, locationId, containerId, characterId, createdBy, createdOn, description, image, itemEffectId, itemTypeId, lastUpdate, quantity, containerIndex)
SELECT
  'DEBUG_TINY' as name,
  NULL as locationId,
  c.id as containerId,
  COALESCE(c.characterId, @fallback_character_id) as characterId,
  NULL as createdBy,
  NOW() as createdOn,
  'Seeded tiny debug item' as description,
  NULL as image,
  NULL as itemEffectId,
  NULL as itemTypeId,
  UNIX_TIMESTAMP() as lastUpdate,
  1 as quantity,
  COALESCE((SELECT 1 + MAX(i.containerIndex) FROM Item i WHERE i.containerId = c.id), 0) as containerIndex
FROM Container c
WHERE COALESCE(c.characterId, @fallback_character_id) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM Item existing WHERE existing.containerId = c.id AND existing.name = 'DEBUG_TINY'
  );

COMMIT;

-- Notes:
-- Run this only against a development/local database. It will not create items for containers that have no associated character and no characters exist in the database (fallback is NULL in that case).
-- To run:
--   cd server
--   node prisma/seed_containers.mjs   # or run this SQL using your mysql client pointed at DATABASE_URL

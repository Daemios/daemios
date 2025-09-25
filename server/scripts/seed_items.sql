-- seed_items.sql
-- Creates 4 items (and their related Container entries where applicable):
-- 1) Pack (10 slots)
-- 2) Pack (12 slots)
-- 3) Belt (1 slot)
-- 4) Vial (1 slot)
--
-- Usage: edit @CHAR_ID to the character id that should own these items, then run against your MySQL/MariaDB database:
--   mysql -u user -p database_name < seed_items.sql

START TRANSACTION;

-- Ensure an itemless 'Pockets' container exists for every character
INSERT INTO Container (name, capacity, characterId, removable, containerType)
SELECT 'Pockets', 6, c.id, true, 'POCKETS'
FROM `Character` c
WHERE NOT EXISTS (SELECT 1 FROM Container WHERE characterId = c.id AND name = 'Pockets');

-- Build a temporary table of pockets info: characterId, pocketsId, baseIndex (next free slot)
DROP TEMPORARY TABLE IF EXISTS tmp_pockets;
CREATE TEMPORARY TABLE tmp_pockets AS
SELECT
  c.characterId,
  c.id AS pocketsId,
  COALESCE((SELECT MAX(i.containerIndex) FROM Item i WHERE i.containerId = c.id), -1) + 1 AS baseIndex
FROM Container c
WHERE c.name = 'Pockets';

-- Insert seed items for every character that does not already have them (marker-based idempotence)
-- Pack #1 (10 slots) offset 0
INSERT INTO Item (name, characterId, createdOn, description, itemType, isContainer, capacity, removable, containerId, containerIndex)
SELECT
  'Pack (10 slots)',
  tp.characterId,
  NOW(),
  CONCAT('SEED:pack1:char:', tp.characterId),
  'PACK',
  true,
  10,
  true,
  tp.pocketsId,
  tp.baseIndex
FROM tmp_pockets tp
LEFT JOIN Item ex ON ex.characterId = tp.characterId AND ex.description = CONCAT('SEED:pack1:char:', tp.characterId)
WHERE ex.id IS NULL;

-- Create Container rows for Pack #1 items just created
INSERT INTO Container (name, capacity, characterId, removable, itemId, containerType)
SELECT 'Pack (10 slots)', 10, i.characterId, true, i.id, 'PACK' FROM Item i WHERE i.description LIKE 'SEED:pack1:char:%';

-- Pack #2 (12 slots) offset 1
INSERT INTO Item (name, characterId, createdOn, description, itemType, isContainer, capacity, removable, containerId, containerIndex)
SELECT
  'Pack (12 slots)',
  tp.characterId,
  NOW(),
  CONCAT('SEED:pack2:char:', tp.characterId),
  'PACK',
  true,
  12,
  true,
  tp.pocketsId,
  tp.baseIndex + 1
FROM tmp_pockets tp
LEFT JOIN Item ex ON ex.characterId = tp.characterId AND ex.description = CONCAT('SEED:pack2:char:', tp.characterId)
WHERE ex.id IS NULL;

INSERT INTO Container (name, capacity, characterId, removable, itemId, containerType)
SELECT 'Pack (12 slots)', 12, i.characterId, true, i.id, 'PACK' FROM Item i WHERE i.description LIKE 'SEED:pack2:char:%';

-- Belt (1 slot) offset 2
INSERT INTO Item (name, characterId, createdOn, description, itemType, isContainer, capacity, removable, containerId, containerIndex)
SELECT
  'Belt (1 slot)',
  tp.characterId,
  NOW(),
  CONCAT('SEED:belt:char:', tp.characterId),
  'CONTAINER',
  true,
  1,
  true,
  tp.pocketsId,
  tp.baseIndex + 2
FROM tmp_pockets tp
LEFT JOIN Item ex ON ex.characterId = tp.characterId AND ex.description = CONCAT('SEED:belt:char:', tp.characterId)
WHERE ex.id IS NULL;

INSERT INTO Container (name, capacity, characterId, removable, itemId, containerType)
SELECT 'Belt (1 slot)', 1, i.characterId, true, i.id, 'POCKETS' FROM Item i WHERE i.description LIKE 'SEED:belt:char:%';

-- Vial (1 slot, liquid) offset 3
INSERT INTO Item (name, characterId, createdOn, description, itemType, isContainer, capacity, removable, containerId, containerIndex)
SELECT
  'Vial (1 slot)',
  tp.characterId,
  NOW(),
  CONCAT('SEED:vial:char:', tp.characterId),
  'LIQUID',
  true,
  1,
  true,
  tp.pocketsId,
  tp.baseIndex + 3
FROM tmp_pockets tp
LEFT JOIN Item ex ON ex.characterId = tp.characterId AND ex.description = CONCAT('SEED:vial:char:', tp.characterId)
WHERE ex.id IS NULL;

INSERT INTO Container (name, capacity, characterId, removable, itemId, containerType)
SELECT 'Vial (1 slot)', 1, i.characterId, true, i.id, 'LIQUID' FROM Item i WHERE i.description LIKE 'SEED:vial:char:%';

COMMIT;

-- Summary: how many seeded items exist per character
SELECT
  SUM(CASE WHEN description LIKE 'SEED:pack1:char:%' THEN 1 ELSE 0 END) AS seeded_pack1_count,
  SUM(CASE WHEN description LIKE 'SEED:pack2:char:%' THEN 1 ELSE 0 END) AS seeded_pack2_count,
  SUM(CASE WHEN description LIKE 'SEED:belt:char:%' THEN 1 ELSE 0 END) AS seeded_belt_count,
  SUM(CASE WHEN description LIKE 'SEED:vial:char:%' THEN 1 ELSE 0 END) AS seeded_vial_count
FROM Item
WHERE description LIKE 'SEED:%';

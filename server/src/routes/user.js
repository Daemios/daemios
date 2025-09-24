import express from 'express';
import characters from '../lib/characters.js';
import prisma from '../lib/prisma.js';

// Helper: build character object with equipment mapping and implicit POCKET slot
async function buildCharacterWithEquipment(character) {
  // helper to map DB item to client-friendly shape
  function mapItemForClient(it) {
    if (!it) return null;
    // prefer explicit image fields, otherwise fall back to a dev placeholder
    const img = it.image || it.img || '/img/debug/placeholder.png';
    return {
      ...it,
      img,
      label: it.label || it.name || (it.displayName || null),
    };
  }
  // load equipment rows and include Item
  let equipmentRows = [];
  try {
    equipmentRows = await prisma.equipment.findMany({
      where: { characterId: character.id },
      include: { Item: true },
    });
  } catch (e) {
    // if schema mismatch (column missing) or other errors, log and continue with empty equipment
    console.warn('buildCharacterWithEquipment: could not load equipment rows', e && e.code);
    equipmentRows = [];
  }

  const equipped = {};
  equipmentRows.forEach((r) => {
    const key = String(r.slot).toLowerCase();
    equipped[key] = mapItemForClient(r.Item) || null;
  });

  // Build implicit POCKET slot by finding a Pockets container for this character.
  try {
    const pockets = await prisma.container.findFirst({ where: { characterId: character.id, name: 'Pockets' } });
    if (pockets) {
    // If there's an Item row linked to this container, prefer that; otherwise,
    // provide a minimal object
      let pocketItem = null;
      if (pockets.itemId) {
        try {
          const it = await prisma.item.findUnique({ where: { id: pockets.itemId } });
          pocketItem = mapItemForClient(it);
        } catch (e) {
          console.warn('buildCharacterWithEquipment: failed to load item for pockets', e && e.code);
        }
      }
      if (!pocketItem) {
        // fallback minimal representation (client shape)
        pocketItem = {
          id: null,
          label: 'Pockets',
          img: null,
          isContainer: true,
          containerId: pockets.id,
          capacity: pockets.capacity || 0,
        };
      }
      equipped.pocket = pocketItem;
    } else {
      // no pockets container found - leave pocket undefined
      equipped.pocket = null;
    }
  } catch (e) {
    console.warn('buildCharacterWithEquipment: error finding pockets container', e);
    equipped.pocket = null;
  }

  return { ...character, equipped };
}

const router = express.Router();

// Logout user
router.post('/logout', (req, res) => {
  characters.deactivateCharacters(req.user.id)
    .then(() => req.logout(() => res.json({ success: true })))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Server error during logout' });
    });
});

// Refresh character data
router.get('/refresh', async (req, res) => {
  try {
    const userId = req.session.passport.user.id;
    const character = await characters.getActiveCharacter(userId);

    if (!character || !character.id) {
      return res.status(404).json({ error: 'No active character found' });
    }
    // attach equipment and implicit pocket slot
    try {
      const charWithEquip = await buildCharacterWithEquipment(character);
      console.debug('[user.refresh] responding with character', { id: charWithEquip.id, equipped: charWithEquip.equipped });
      res.json({ success: true, character: charWithEquip });
    } catch (e) {
      console.warn('Failed to load equipment for character', character.id, e);
      console.debug('[user.refresh] responding with character (no equip)', { id: character.id, equipped: character.equipped });
      res.json({ success: true, character });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Select character
router.post('/character/select', async (req, res) => {
  try {
    const userId = req.session.passport.user.id;
    const { characterId } = req.body;

    await characters.deactivateCharacters(userId);
    const rows = await characters.activateCharacter(userId, characterId);
    if (!rows || rows.count === 0) {
      return res.status(404).json({ error: 'No character found or updated' });
    }
    const character = await characters.getActiveCharacter(userId);
    if (!character || !character.id) {
      return res.status(404).json({ error: 'No active character found' });
    }

    // include equipped items in the response
    try {
      const charWithEquip = await buildCharacterWithEquipment(character);
      console.debug('[user.select] responding with character', { id: charWithEquip.id, equipped: charWithEquip.equipped });
      res.json({ success: true, character: charWithEquip });
    } catch (e) {
      console.warn('Failed to load equipment for character', character.id, e);
      console.debug('[user.select] responding with character (no equip)', { id: character.id, equipped: character.equipped });
      res.json({ success: true, character });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Create character
router.post('/character/create', async (req, res) => {
  try {
    const userId = req.session.passport.user.id;
    console.log('userId', userId);
    const { name, raceId, image } = req.body;
    console.log(req.body);
    await prisma.character.create({
      data: {
        name,
        image,
        user: {
          connect: {
            id: userId,
          },
        },
        race: {
          connect: {
            id: raceId,
          },
        },
      },
    });

    // TODO add the intro adventure to the character to give them first abilities, etc
    // each node should reward an option of 3 abilities,
    // and the final node should reward a vessel (maybe)
    res.status(200).json({ success: 'Character created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get characters
router.get('/characters', async (req, res) => {
  try {
    const userId = req.session.passport.user.id;
    const rows = await prisma.character.findMany({
      where: { userId },
    });
    const characterList = rows.map((row) => ({
      ...row,
      location: { dangerous: true, name: 'The Wilds' },
      level: 1,
      vessels: [
        { color: '#156156' },
        { color: '#a12078' },
      ],
    }));

    res.json({ success: true, characters: characterList });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server Error' });
  }
});

export default router;

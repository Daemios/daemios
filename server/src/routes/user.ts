import express, { Request, Response } from 'express';
import { characterService } from '../modules/character/character.service';
import { prisma } from '../db/prisma';

// Helper: build character object with equipment mapping and implicit POCKET slot
async function buildCharacterWithEquipment(character: any) {
  function mapItemForClient(it: any) {
    if (!it) return null;
    const img = it.image || it.img || '/img/debug/placeholder.png';
    return {
      ...it,
      img,
      label: it.label || it.name || (it.displayName || null),
    };
  }

  let equipmentRows: any[] = [];
  try {
    equipmentRows = await prisma.equipment.findMany({
      where: { characterId: character.id },
      include: { Item: true },
    });
  } catch (e) {
    console.warn('buildCharacterWithEquipment: could not load equipment rows', (e as any)?.code);
    equipmentRows = [];
  }

  const equipped: Record<string, any> = {};
  equipmentRows.forEach((r: any) => {
    const key = String(r.slot).toLowerCase();
    equipped[key] = mapItemForClient(r.Item) || null;
  });

  try {
    const pockets = await prisma.container.findFirst({ where: { characterId: character.id, name: 'Pockets' } });
    if (pockets) {
      let pocketItem = null as any;
      if ((pockets as any).itemId) {
        try {
          const it = await prisma.item.findUnique({ where: { id: (pockets as any).itemId } });
          pocketItem = mapItemForClient(it);
        } catch (e) {
          console.warn('buildCharacterWithEquipment: failed to load item for pockets', (e as any)?.code);
        }
      }
      if (!pocketItem) {
        pocketItem = {
          id: null,
          label: 'Pockets',
          img: null,
          isContainer: true,
          containerId: (pockets as any).id,
          capacity: (pockets as any).capacity || 0,
        };
      }
      equipped.pocket = pocketItem;
    } else {
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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  characterService.deactivateCharacters(req.user.id)
    .then(() => {
      // @ts-ignore
      req.logout(() => res.json({ success: true }));
    })
    .catch((err: any) => {
      console.error(err);
      res.status(500).json({ error: 'Server error during logout' });
    });
});

// Refresh character data
router.get('/refresh', async (req: Request, res: Response) => {
  try {
    // @ts-ignore - passport session typing
    const userId = (req.session as any).passport.user.id;
    const character = await characterService.getActiveCharacterForUser(userId);

    if (!character || !character.id) {
      return res.status(404).json({ error: 'No active character found' });
    }

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
router.post('/character/select', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = (req.session as any).passport.user.id;
    const { characterId } = req.body;

    await characterService.deactivateCharacters(userId);
    const rows = await characterService.activateCharacter(userId, characterId);
    if (!rows || (rows as any).count === 0) {
      return res.status(404).json({ error: 'No character found or updated' });
    }
    const character = await characterService.getActiveCharacterForUser(userId);
    if (!character || !character.id) {
      return res.status(404).json({ error: 'No active character found' });
    }

    try {
      const charWithEquip = await buildCharacterWithEquipment(character);

      let containers: any[] = [];
      try {
        containers = await prisma.container.findMany({ where: { characterId: character.id }, include: { items: { orderBy: { containerIndex: 'asc' } } } });
        containers = containers.map((c: any) => ({
          ...c,
          containerType: c.containerType || 'BASIC',
          icon: ((tpe: any) => {
            const tstr = String(tpe || 'BASIC').toUpperCase();
            switch (tstr) {
              case 'LIQUID': return 'water';
              case 'CONSUMABLES': return 'food-apple';
              case 'PACK': return 'backpack';
              case 'POCKETS': return 'hand';
              default: return null;
            }
          })(c.containerType),
          items: (c.items || []).map((it: any) => ({ ...it, img: it.image || it.img || '/img/debug/placeholder.png', label: it.label || it.name || null })),
        }));
      } catch (e) {
        console.warn('user.select: could not fetch containers for character', (e as any)?.code);
      }

      console.debug('[user.select] responding with character', { id: charWithEquip.id, equipped: charWithEquip.equipped, containers: containers.length });
      res.json({ success: true, character: charWithEquip, containers });
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
router.post('/character/create', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = (req.session as any).passport.user.id;
    const { name, raceId, image } = req.body;

    const createdChar = await prisma.character.create({
      data: {
        name,
        image,
        user: { connect: { id: userId } },
        race: { connect: { id: raceId } },
      },
    });

    try {
      if (createdChar && createdChar.id) {
        await prisma.container.create({
          data: {
            name: 'Pockets',
            capacity: 6,
            characterId: createdChar.id,
            removable: true,
            containerType: 'POCKETS',
          },
        });
      }
    } catch (e) {
      console.warn('Failed to create pockets container for new character', (e as any)?.code);
    }

    res.status(200).json({ success: true, character: createdChar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get characters
router.get('/characters', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = (req.session as any).passport.user.id;
    const rows = await prisma.character.findMany({ where: { userId } });
    const characterList = rows.map((row: any) => ({
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

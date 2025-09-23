import express from 'express';
import prisma from '../lib/prisma.js';
import characters from '../lib/characters.js';

const router = express.Router();

// New: session-backed inventory endpoint
// GET /inventory/
// Returns all containers owned by the active character (from session) including their items
router.get('/', async (req, res) => {
  try {
    const userId = req.session.passport.user.id;
    const character = await characters.getActiveCharacter(userId);

    if (!character || !character.id) {
      return res.status(404).json({ error: 'No active character found' });
    }

    // Fetch containers owned by this character, including items ordered by containerIndex
    const containers = await prisma.container.findMany({
      where: { characterId: character.id },
      include: {
        items: {
          orderBy: { containerIndex: 'asc' },
        },
      },
    });

    return res.json({ success: true, characterId: character.id, containers });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server Error' });
  }
});

// Keep existing legacy routes for backward compatibility
router.get('/:id', async (req, res) => {
  try {
    console.log(req.params.id);
    const rows = await prisma.characterInventory.findMany({
      where: { character_id: parseInt(req.params.id, 10) },
    });
    res.send(rows);
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

router.post('/:id', async (req, res) => {
  try {
    const {
      type_id, name, description, quantity,
    } = req.body;
    const character_id = parseInt(req.params.id, 10);

    const result = await prisma.inventory.create({
      data: {
        character_id,
        type_id,
        name,
        description,
        quantity,
        created_by: 'client',
      },
    });

    res.send(result);
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const {
      type_id, name, description, quantity,
    } = req.body;
    const character_id = parseInt(req.params.id, 10);

    const result = await prisma.inventory.updateMany({
      where: { character_id },
      data: {
        type_id,
        name,
        description,
        quantity,
      },
    });

    res.send(result);
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

export default router;

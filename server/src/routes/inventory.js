import { PrismaClient } from '@prisma/client';

import express from 'express';

const router = express.Router();

const prisma = new PrismaClient();

router.get('/:id', async (req, res) => {
  try {
    console.log(req.params.id);
    const rows = await prisma.characterInventory.findMany({
      where: { character_id: parseInt(req.params.id) },
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
    const character_id = parseInt(req.params.id);

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

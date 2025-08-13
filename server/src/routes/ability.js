import { PrismaClient } from '@prisma/client';

import express from 'express';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/elements', async (req, res) => {
  try {
    const elements = await prisma.element.findMany();
    res.send(elements);
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

router.get('/types', async (req, res) => {
  try {
    const rows = await prisma.abilityType.findMany();
    res.send(rows);
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

router.get('/shapes', async (req, res) => {
  try {
    const rows = await prisma.abilityShape.findMany();
    res.send(rows);
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

router.get('/ranges', async (req, res) => {
  try {
    const rows = await prisma.abilityRange.findMany();
    res.send(rows);
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

export default router;

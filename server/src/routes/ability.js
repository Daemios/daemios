import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

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

// Return ability presets (assembled abilities) with related metadata
router.get('/presets', async (req, res) => {
  try {
    const presets = await prisma.abilityPreset.findMany({
      include: {
        element: true,
        range: true,
        shape: true,
        type: true,
      },
    });
    res.send(presets);
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

// Return a single preset by its id
router.get('/presets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const preset = await prisma.abilityPreset.findUnique({
      where: { id: Number(id) },
      include: {
        element: true,
        range: true,
        shape: true,
        type: true,
      },
    });
    if (!preset) return res.status(404).send({ error: 'Preset not found' });
    res.send(preset);
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

// Return presets matching a presetCoreId (useful if presets are grouped by core)
router.get('/presets/core/:presetCoreId', async (req, res) => {
  try {
    const { presetCoreId } = req.params;
    const rows = await prisma.abilityPreset.findMany({
      where: { presetCoreId: Number(presetCoreId) },
      include: {
        element: true,
        range: true,
        shape: true,
        type: true,
      },
    });
    res.send(rows);
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

export default router;

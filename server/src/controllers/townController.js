import { listTowns, getTown, createTown } from '../services/locationService.js';

export const index = async (req, res) => {
  try {
    const items = await listTowns();
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
};

export const show = async (req, res) => {
  try {
    const item = await getTown(req.params.id);
    if (!item) {
      res.status(404).send('Not Found');
      return;
    }
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
};

export const create = async (req, res) => {
  try {
    const { worldLocationId, population, factionId } = req.body;
    const created = await createTown(worldLocationId, { population, factionId });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
};

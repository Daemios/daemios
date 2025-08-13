import {
  listLocations,
  createLocation,
  getLocation,
  deleteLocation,
} from '../services/locationService.js';

export const index = async (req, res) => {
  try {
    const filter = {};
    if (req.query.chunkX) filter.chunkX = Number(req.query.chunkX);
    if (req.query.chunkY) filter.chunkY = Number(req.query.chunkY);
    const items = await listLocations(filter);
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
};

export const create = async (req, res) => {
  try {
    const created = await createLocation(req.body);
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
};

export const show = async (req, res) => {
  try {
    const item = await getLocation(req.params.id);
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

export const destroy = async (req, res) => {
  try {
    const deleted = await deleteLocation(req.params.id);
    res.json(deleted);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
};

import { Request, Response } from 'express';
import { listLocationsByType, getLocationByType, createLocationOfType } from '../../services/locationService';

const DUNGEON_TYPE = 'DUNGEON';

export async function index(_req: Request, res: Response) {
  try {
    const items = await listLocationsByType(DUNGEON_TYPE);
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
}

export async function show(req: Request, res: Response) {
  try {
    const item = await getLocationByType(req.params.id, DUNGEON_TYPE);
    if (!item) {
      res.status(404).send('Not Found');
      return;
    }
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
}

export async function create(req: Request, res: Response) {
  try {
    const created = await createLocationOfType(DUNGEON_TYPE, req.body ?? {});
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
}

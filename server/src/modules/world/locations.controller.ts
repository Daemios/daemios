import { Request, Response } from 'express';
import { listLocations, createLocation, getLocation, deleteLocation } from '../../services/locationService';

export async function index(req: Request, res: Response) {
  try {
    const filter: Record<string, any> = {};
    if (req.query.chunkX) filter.chunkX = Number(req.query.chunkX);
    if (req.query.chunkY) filter.chunkY = Number(req.query.chunkY);
    const items = await listLocations(filter);
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
}

export async function create(req: Request, res: Response) {
  try {
    const created = await createLocation(req.body);
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
}

export async function show(req: Request, res: Response) {
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
}

export async function destroy(req: Request, res: Response) {
  try {
    const deleted = await deleteLocation(req.params.id);
    res.json(deleted);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
}

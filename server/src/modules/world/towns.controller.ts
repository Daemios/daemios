import { Request, Response } from 'express';
import { listLocationsByType, getLocationByType, createLocationOfType } from './location.service';
import { DomainError, assertTypeMatches } from './world.domain';

const TOWN_TYPE = 'TOWN';

export async function index(_req: Request, res: Response) {
  try {
    const items = await listLocationsByType(TOWN_TYPE);
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
}

export async function show(req: Request, res: Response) {
  try {
    const item = await getLocationByType(req.params.id, TOWN_TYPE);
    if (!item) {
      res.status(404).send('Not Found');
      return;
    }
    try {
      assertTypeMatches(item, TOWN_TYPE);
      res.json(item);
    } catch (e) {
      if (e instanceof DomainError && e.code === 'TYPE_MISMATCH') return res.status(404).send('Not Found');
      throw e;
    }
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
}

export async function create(req: Request, res: Response) {
  try {
    const created = await createLocationOfType(TOWN_TYPE, req.body ?? {});
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    if (e instanceof DomainError) {
      if (e.code === 'NAME_REQUIRED') return res.status(422).json({ error: 'invalid_name' });
      if (e.code === 'INVALID_TYPE' || e.code === 'INVALID_ADVENTURE') return res.status(422).json({ error: 'invalid_payload' });
    }
    res.status(500).send('Server Error');
  }
}

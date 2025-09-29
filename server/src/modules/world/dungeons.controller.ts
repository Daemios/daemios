import { Request, Response } from 'express';
import { listLocationsByType, getLocationByType, createLocationOfType } from './location.service';
import { DomainError, assertTypeMatches } from './world.domain';
import { respondError, respondSuccess } from '../../utils/apiResponse';

const DUNGEON_TYPE = 'DUNGEON';

export async function index(_req: Request, res: Response) {
  try {
    const items = await listLocationsByType(DUNGEON_TYPE);
    respondSuccess(res, 200, items);
  } catch (e) {
    console.error(e);
    respondError(res, 500, 'internal_error', 'Server Error');
  }
}

export async function show(req: Request, res: Response) {
  try {
    const item = await getLocationByType(req.params.id, DUNGEON_TYPE);
    if (!item) {
      respondError(res, 404, 'not_found', 'Dungeon not found');
      return;
    }
    try {
      assertTypeMatches(item, DUNGEON_TYPE);
      respondSuccess(res, 200, item);
    } catch (e) {
      if (e instanceof DomainError && e.code === 'TYPE_MISMATCH') return respondError(res, 404, 'not_found', 'Dungeon not found');
      throw e;
    }
  } catch (e) {
    console.error(e);
    respondError(res, 500, 'internal_error', 'Server Error');
  }
}

export async function create(req: Request, res: Response) {
  try {
    const created = await createLocationOfType(DUNGEON_TYPE, req.body ?? {});
    respondSuccess(res, 201, created, 'Dungeon created');
  } catch (e) {
    console.error(e);
    if (e instanceof DomainError) {
      if (e.code === 'NAME_REQUIRED') return respondError(res, 422, 'invalid_name', 'Name is required');
      if (e.code === 'INVALID_TYPE' || e.code === 'INVALID_ADVENTURE') {
        return respondError(res, 422, 'invalid_payload', 'Invalid payload');
      }
    }
    respondError(res, 500, 'internal_error', 'Server Error');
  }
}

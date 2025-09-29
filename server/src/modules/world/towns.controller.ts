import { Request, Response } from 'express';
import { listLocationsByType, getLocationByType, createLocationOfType } from './location.service';
import { DomainError, assertTypeMatches } from './world.domain';
import { respondError, respondSuccess } from '../../utils/apiResponse';

const TOWN_TYPE = 'TOWN';

export async function index(_req: Request, res: Response) {
  try {
    const items = await listLocationsByType(TOWN_TYPE);
    respondSuccess(res, 200, items);
  } catch (e) {
    console.error(e);
    respondError(res, 500, 'internal_error', 'Server Error');
  }
}

export async function show(req: Request, res: Response) {
  try {
    const item = await getLocationByType(req.params.id, TOWN_TYPE);
    if (!item) {
      respondError(res, 404, 'not_found', 'Town not found');
      return;
    }
    try {
      assertTypeMatches(item, TOWN_TYPE);
      respondSuccess(res, 200, item);
    } catch (e) {
      if (e instanceof DomainError && e.code === 'TYPE_MISMATCH') return respondError(res, 404, 'not_found', 'Town not found');
      throw e;
    }
  } catch (e) {
    console.error(e);
    respondError(res, 500, 'internal_error', 'Server Error');
  }
}

export async function create(req: Request, res: Response) {
  try {
    const created = await createLocationOfType(TOWN_TYPE, req.body ?? {});
    respondSuccess(res, 201, created, 'Town created');
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

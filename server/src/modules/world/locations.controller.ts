import { Request, Response } from 'express';
import { listLocations, createLocation, getLocation, deleteLocation } from './location.service';
import { DomainError } from './world.domain';
import { respondError, respondSuccess } from '../../utils/apiResponse';

export async function index(req: Request, res: Response) {
  try {
    const filter: Record<string, any> = {};
    if (req.query.chunkX) filter.chunkX = Number(req.query.chunkX);
    if (req.query.chunkY) filter.chunkY = Number(req.query.chunkY);
    const items = await listLocations(filter);
    respondSuccess(res, 200, items);
  } catch (e) {
    console.error(e);
    respondError(res, 500, 'internal_error', 'Server Error');
  }
}

export async function create(req: Request, res: Response) {
  try {
    const created = await createLocation(req.body);
    respondSuccess(res, 201, created, 'Location created');
  } catch (e) {
    console.error(e);
    if (e instanceof DomainError) {
      if (e.code === 'NAME_REQUIRED') return respondError(res, 422, 'invalid_name', 'Name is required');
      if (e.code === 'INVALID_ADVENTURE') return respondError(res, 422, 'invalid_adventure', 'Invalid adventure');
    }
    respondError(res, 500, 'internal_error', 'Server Error');
  }
}

export async function show(req: Request, res: Response) {
  try {
    const item = await getLocation(req.params.id);
    if (!item) {
      respondError(res, 404, 'not_found', 'Location not found');
      return;
    }
    respondSuccess(res, 200, item);
  } catch (e) {
    console.error(e);
    respondError(res, 500, 'internal_error', 'Server Error');
  }
}

export async function destroy(req: Request, res: Response) {
  try {
    const deleted = await deleteLocation(req.params.id);
    respondSuccess(res, 200, deleted, 'Location deleted');
  } catch (e) {
    console.error(e);
    respondError(res, 500, 'internal_error', 'Server Error');
  }
}

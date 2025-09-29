import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { respondError, respondSuccess } from '../../utils/apiResponse';
import {
  createAbilityElement,
  listAbilityElements,
  listAbilityShapes,
  listAbilityRanges,
  listAbilityTypes,
  getAbilityElement,
  updateAbilityElement,
  deleteAbilityElement,
} from './ability.service';
import { AbilityElementCreatePayload, AbilityElementUpdatePayload, DomainError } from './ability.domain';

export const postCreate = asyncHandler(async (req: Request, res: Response) => {
  try {
    const created = await createAbilityElement(req.body as AbilityElementCreatePayload);
    respondSuccess(res, 201, created, 'Ability element created');
  } catch (err) {
    if (err instanceof DomainError) {
      return respondError(res, 400, err.code, err.message);
    }
    throw err;
  }
});

export const getList = asyncHandler(async (_req: Request, res: Response) => {
  const list = await listAbilityElements();
  respondSuccess(res, 200, list);
});

export const getShapes = asyncHandler(async (_req: Request, res: Response) => {
  const list = await listAbilityShapes();
  respondSuccess(res, 200, list);
});

export const getRanges = asyncHandler(async (_req: Request, res: Response) => {
  const list = await listAbilityRanges();
  respondSuccess(res, 200, list);
});

export const getTypes = asyncHandler(async (_req: Request, res: Response) => {
  const list = await listAbilityTypes();
  respondSuccess(res, 200, list);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const one = await getAbilityElement(id);
  if (!one) return respondError(res, 404, 'not_found', 'Ability element not found');
  respondSuccess(res, 200, one);
});

export const putUpdate = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const updated = await updateAbilityElement(id, req.body as AbilityElementUpdatePayload);
    respondSuccess(res, 200, updated, 'Ability element updated');
  } catch (err) {
    if (err instanceof DomainError) {
      return respondError(res, 400, err.code, err.message);
    }
    throw err;
  }
});

export const delOne = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const removed = await deleteAbilityElement(id);
  respondSuccess(res, 200, removed, 'Ability element removed');
});

import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
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
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

export const getList = asyncHandler(async (_req: Request, res: Response) => {
  const list = await listAbilityElements();
  res.json(list);
});

export const getShapes = asyncHandler(async (_req: Request, res: Response) => {
  const list = await listAbilityShapes();
  res.json(list);
});

export const getRanges = asyncHandler(async (_req: Request, res: Response) => {
  const list = await listAbilityRanges();
  res.json(list);
});

export const getTypes = asyncHandler(async (_req: Request, res: Response) => {
  const list = await listAbilityTypes();
  res.json(list);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const one = await getAbilityElement(id);
  if (!one) return res.status(404).json({});
  res.json(one);
});

export const putUpdate = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const updated = await updateAbilityElement(id, req.body as AbilityElementUpdatePayload);
    res.json(updated);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

export const delOne = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const removed = await deleteAbilityElement(id);
  res.json(removed);
});

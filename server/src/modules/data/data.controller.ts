import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { listRaces } from './data.service';

export const getRaces = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await listRaces();
  res.json({ success: true, races: rows });
});

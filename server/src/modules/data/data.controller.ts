import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { respondSuccess } from '../../utils/apiResponse';
import { listRaces } from './data.service';

export const getRaces = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await listRaces();
  respondSuccess(res, 200, { races: rows });
});

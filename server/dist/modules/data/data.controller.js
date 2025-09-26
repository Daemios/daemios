import { asyncHandler } from '../../utils/asyncHandler';
import { listRaces } from './data.service';
export const getRaces = asyncHandler(async (_req, res) => {
    const rows = await listRaces();
    res.json({ success: true, races: rows });
});

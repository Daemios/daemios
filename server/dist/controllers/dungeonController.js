import { listLocationsByType, getLocationByType, createLocationOfType } from '../services/locationService';
import { asyncHandler } from '../utils/asyncHandler';
const DUNGEON_TYPE = 'DUNGEON';
export const index = asyncHandler(async (_req, res) => {
    const items = await listLocationsByType(DUNGEON_TYPE);
    res.json(items);
});
export const show = asyncHandler(async (req, res) => {
    const item = await getLocationByType(req.params.id, DUNGEON_TYPE);
    if (!item)
        return res.status(404).send('Not Found');
    res.json(item);
});
export const create = asyncHandler(async (req, res) => {
    const created = await createLocationOfType(DUNGEON_TYPE, req.body ?? {});
    res.status(201).json(created);
});

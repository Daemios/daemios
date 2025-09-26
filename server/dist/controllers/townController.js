import { listLocationsByType, getLocationByType, createLocationOfType } from '../services/locationService';
import { asyncHandler } from '../utils/asyncHandler';
const TOWN_TYPE = 'TOWN';
export const index = asyncHandler(async (_req, res) => {
    const items = await listLocationsByType(TOWN_TYPE);
    res.json(items);
});
export const show = asyncHandler(async (req, res) => {
    const item = await getLocationByType(req.params.id, TOWN_TYPE);
    if (!item)
        return res.status(404).send('Not Found');
    res.json(item);
});
export const create = asyncHandler(async (req, res) => {
    const created = await createLocationOfType(TOWN_TYPE, req.body ?? {});
    res.status(201).json(created);
});

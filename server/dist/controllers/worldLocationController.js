import { listLocations, createLocation, getLocation, deleteLocation } from '../services/locationService';
import { asyncHandler } from '../utils/asyncHandler';
export const index = asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.chunkX)
        filter.chunkX = Number(req.query.chunkX);
    if (req.query.chunkY)
        filter.chunkY = Number(req.query.chunkY);
    const items = await listLocations(filter);
    res.json(items);
});
export const create = asyncHandler(async (req, res) => {
    const created = await createLocation(req.body);
    res.status(201).json(created);
});
export const show = asyncHandler(async (req, res) => {
    const item = await getLocation(req.params.id);
    if (!item)
        return res.status(404).send('Not Found');
    res.json(item);
});
export const destroy = asyncHandler(async (req, res) => {
    const deleted = await deleteLocation(req.params.id);
    res.json(deleted);
});

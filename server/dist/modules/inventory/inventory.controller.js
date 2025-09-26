import { asyncHandler } from '../../utils/asyncHandler';
import { fetchContainersWithItems, mapItemForClient, moveItemForCharacter } from './inventory.service';
export const getInventory = asyncHandler(async (req, res) => {
    const user = req.session?.activeCharacter;
    if (!user)
        return res.status(200).json([]);
    const containers = await fetchContainersWithItems(user.id);
    const out = containers.map((c) => ({ id: c.id, label: c.label || null, capacity: c.capacity || 0, containerType: c.containerType || 'BASIC', icon: c.containerType ? String(c.containerType).toUpperCase() : null, items: (c.items || []).map(mapItemForClient) }));
    res.json(out);
});
export const postMove = asyncHandler(async (req, res) => {
    const user = req.session?.activeCharacter;
    if (!user)
        return res.status(400).json({ error: 'No active character' });
    const payload = req.body;
    const updated = await moveItemForCharacter(user, payload);
    res.json(updated);
});

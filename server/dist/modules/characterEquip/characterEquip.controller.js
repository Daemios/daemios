import { asyncHandler } from '../../utils/asyncHandler';
import { equipItemToCharacter, unequipItemFromSlot, listEquipmentForCharacter } from './characterEquip.service';
export const postEquip = asyncHandler(async (req, res) => {
    const character = req.session?.activeCharacter;
    if (!character)
        return res.status(400).json({ error: 'No active character' });
    const { itemId, slot } = req.body;
    if (!itemId || !slot)
        return res.status(400).json({ error: 'itemId and slot required' });
    const updated = await equipItemToCharacter(character.id, Number(itemId), slot);
    res.json(updated);
});
export const postUnequip = asyncHandler(async (req, res) => {
    const character = req.session?.activeCharacter;
    if (!character)
        return res.status(400).json({ error: 'No active character' });
    const { slot } = req.body;
    if (!slot)
        return res.status(400).json({ error: 'slot required' });
    const removed = await unequipItemFromSlot(character.id, slot);
    res.json(removed);
});
export const getList = asyncHandler(async (req, res) => {
    const character = req.session?.activeCharacter;
    if (!character)
        return res.status(200).json([]);
    const list = await listEquipmentForCharacter(character.id);
    res.json(list);
});

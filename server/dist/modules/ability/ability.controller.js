import { asyncHandler } from '../../utils/asyncHandler';
import { createAbilityElement, listAbilityElements, getAbilityElement, updateAbilityElement, deleteAbilityElement } from './ability.service';
export const postCreate = asyncHandler(async (req, res) => {
    const created = await createAbilityElement(req.body);
    res.status(201).json(created);
});
export const getList = asyncHandler(async (_req, res) => {
    const list = await listAbilityElements();
    res.json(list);
});
export const getOne = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const one = await getAbilityElement(id);
    if (!one)
        return res.status(404).json({});
    res.json(one);
});
export const putUpdate = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const updated = await updateAbilityElement(id, req.body);
    res.json(updated);
});
export const delOne = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const removed = await deleteAbilityElement(id);
    res.json(removed);
});

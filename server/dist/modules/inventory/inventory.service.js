import { prisma } from '../../db/prisma';
export async function fetchContainersWithItems(characterId) {
    try {
        return prisma.container.findMany({ where: { characterId }, include: { items: { orderBy: { containerIndex: 'asc' } } } });
    }
    catch (err) {
        if (err && err.code === 'P2022') {
            console.warn('fetchContainersWithItems: schema mismatch, falling back to basic container fetch');
            return prisma.container.findMany({ where: { characterId } });
        }
        throw err;
    }
}
export function mapItemForClient(it) {
    if (!it)
        return null;
    return { ...it, img: it.image || it.img || '/img/debug/placeholder.png', label: it.label || it.name || null, itemType: it.itemType ? String(it.itemType) : null };
}
export function iconForContainerType(type) {
    const t = String(type || 'BASIC').toUpperCase();
    switch (t) {
        case 'LIQUID': return 'water';
        case 'CONSUMABLES': return 'food-apple';
        case 'PACK': return 'backpack';
        case 'POCKETS': return 'hand';
        case 'BASIC':
        default: return null;
    }
}
export async function containerIsDescendantOfItem(containerId, ancestorItemId) {
    let curr = containerId;
    while (curr) {
        const c = await prisma.container.findUnique({ where: { id: curr }, select: { itemId: true } });
        if (!c)
            return false;
        if (!c.itemId)
            return false;
        if (c.itemId === ancestorItemId)
            return true;
        const rep = await prisma.item.findUnique({ where: { id: c.itemId }, select: { containerId: true } });
        if (!rep)
            return false;
        curr = (rep.containerId ?? null);
    }
    return false;
}
// Move an item with all validation and swapping logic, returns updated containers for the character
export async function moveItemForCharacter(character, payload) {
    const { itemId, source, target } = payload || {};
    if (!itemId)
        throw new Error('Missing itemId');
    const moving = await prisma.item.findUnique({ where: { id: Number(itemId) } });
    if (!moving)
        throw Object.assign(new Error('Item not found'), { status: 404 });
    if (moving.characterId !== character.id)
        throw Object.assign(new Error('Item does not belong to the active character'), { status: 403 });
    const src = source || { containerId: moving.containerId, localIndex: moving.containerIndex };
    const tgt = target;
    if (tgt && tgt.containerId) {
        const targetContainer = await prisma.container.findUnique({ where: { id: tgt.containerId } });
        if (!targetContainer)
            throw Object.assign(new Error('Target container not found'), { status: 400 });
        if (!Number.isInteger(tgt.localIndex) || tgt.localIndex < 0)
            throw Object.assign(new Error('Invalid target index'), { status: 400 });
        if (tgt.localIndex >= (targetContainer.capacity || 0))
            throw Object.assign(new Error('Target index exceeds container capacity'), { status: 400 });
        if (moving.isContainer) {
            const wouldDescend = await containerIsDescendantOfItem(tgt.containerId, moving.id);
            if (wouldDescend)
                throw Object.assign(new Error('Cannot place a container into itself or its nested containers'), { status: 400 });
        }
        if (targetContainer && targetContainer.containerType) {
            const ttype = String(targetContainer.containerType).toUpperCase();
            const itype = moving.itemType ? String(moving.itemType).toUpperCase() : '';
            if (ttype === 'LIQUID' && itype !== 'LIQUID')
                throw Object.assign(new Error('Only liquid items can be placed in this container'), { status: 400 });
            if (ttype === 'CONSUMABLES' && itype !== 'CONSUMABLE' && itype !== 'FOOD')
                throw Object.assign(new Error('Only consumable items can be placed in this container'), { status: 400 });
        }
    }
    const occupied = await prisma.item.findFirst({ where: { containerId: tgt ? tgt.containerId : null, containerIndex: tgt ? tgt.localIndex : null } });
    if (occupied) {
        const sameContainer = src.containerId === tgt.containerId;
        if (sameContainer) {
            const TEMP_INDEX = -999999;
            await prisma.$transaction([
                prisma.item.update({ where: { id: moving.id }, data: { containerIndex: TEMP_INDEX } }),
                prisma.item.update({ where: { id: occupied.id }, data: { containerIndex: src.localIndex } }),
                prisma.item.update({ where: { id: moving.id }, data: { containerId: tgt.containerId, containerIndex: tgt.localIndex } }),
            ]);
        }
        else {
            await prisma.$transaction([
                prisma.item.update({ where: { id: occupied.id }, data: { containerId: src.containerId, containerIndex: src.localIndex } }),
                prisma.item.update({ where: { id: moving.id }, data: { containerId: tgt.containerId, containerIndex: tgt.localIndex } }),
            ]);
        }
    }
    else {
        await prisma.item.update({ where: { id: moving.id }, data: { containerId: tgt ? tgt.containerId : null, containerIndex: tgt ? tgt.localIndex : null } });
    }
    const containers = await fetchContainersWithItems(character.id);
    return containers.map((c) => ({ id: c.id, label: c.label || null, capacity: c.capacity || 0, containerType: c.containerType || 'BASIC', icon: iconForContainerType(c.containerType), items: (c.items || []).map(mapItemForClient) }));
}

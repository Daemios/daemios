export class DomainError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = 'DomainError';
  }
}

export function ensureItemBelongsToCharacter(item: any, characterId: number) {
  if (!item) throw new DomainError('ITEM_NOT_FOUND', 'Item not found');
  if (item.characterId !== characterId) throw new DomainError('ITEM_NOT_OWNED', 'Item does not belong to character');
}

/**
 * Map a containerType (stored on the container) to a UI icon key.
 * Why: UI representation is a presentation concern but the mapping
 * is stable domain knowledge used by multiple places; keep it
 * centralized so changes happen in one place.
 */
export function iconForContainerType(type: any) {
  const t = String(type || 'BASIC').toUpperCase();
  // TODO(cleanup): consolidate icon mapping with inventory/character modules.
  switch (t) {
    case 'LIQUID': return 'water';
    case 'CONSUMABLES': return 'food-apple';
    case 'PACK': return 'backpack';
    case 'POCKETS': return 'hand';
    default: return null;
  }
}

/**
 * Recursively checks whether containerId is a descendant (nested inside)
 * the item tree under ancestorItemId.
 * Why: This protects from creating cycles (placing a container inside
 * itself or its descendants). It is domain logic and belongs here so
 * services can call a well-tested function rather than reimplementing.
 */
export async function containerIsDescendantOfItem(tx: any, containerId: any, ancestorItemId: any): Promise<boolean> {
  if (!containerId) return false;
  const c = await tx.container.findUnique({ where: { id: containerId }, select: { itemId: true } });
  if (!c) return false;
  if (c.itemId === ancestorItemId) return true;
  if (!c.itemId) return false;
  const rep = await tx.item.findUnique({ where: { id: c.itemId }, select: { containerId: true } });
  if (!rep) return false;
  return containerIsDescendantOfItem(tx, rep.containerId, ancestorItemId);
}

/**
 * Validate that an item's declared equip slot matches the target slot.
 * Why: This enforces domain invariants about equipable item types in
 * one place and prevents duplicate ad-hoc checks across services.
 */
export function isValidForSlot(item: any, containerRow: any, slot: any) {
  if (!item || !slot) return false;
  const declared = item.equipmentSlot ? String(item.equipmentSlot).toUpperCase() : null;
  const s = String(slot || '').toUpperCase();
  return declared === s;
}

// Domain helper: lock items deterministically - lightweight implementation
// For now this sorts IDs and performs a dummy select to ensure a consistent
// access order inside transactions. If your DB supports FOR UPDATE you can
// replace this with explicit row locking.
export async function lockItems(tx: any, itemIds: number[]) {
  const ids = (itemIds || []).slice().map((n: any) => Number(n)).filter(Boolean).sort((a: number, b: number) => a - b);
  for (const id of ids) {
    // perform a minimal select to take the row in the transaction's scope
    // eslint-disable-next-line no-await-in-loop
    await tx.item.findUnique({ where: { id }, select: { id: true } });
  }
  return ids;
}

// Domain helper: perform atomic swap between an equipment slot and a container slot
export async function swapEquipmentAndContainer(tx: any, equipRow: any, occupantItem: any, destinationContainerId: number, destinationIndex: number) {
  // lock involved item rows deterministically
  await lockItems(tx, [occupantItem.id, equipRow.itemId].filter(Boolean));

  // Remove occupant from container
  await tx.item.update({ where: { id: occupantItem.id }, data: { containerId: null, containerIndex: null } });

  // Place occupant into equipment slot
  await tx.equipment.update({ where: { id: equipRow.id }, data: { itemId: occupantItem.id } });

  // Place original equipped item into the container destination
  if (equipRow.itemId) {
    await tx.item.update({ where: { id: equipRow.itemId }, data: { containerId: destinationContainerId, containerIndex: destinationIndex } });
  }

  const updatedEquipped = await tx.equipment.findUnique({ where: { id: equipRow.id } });
  const updatedItem = equipRow.itemId ? await tx.item.findUnique({ where: { id: equipRow.itemId } }) : null;
  return { updatedEquipped, updatedItem };
}

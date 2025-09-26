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
  const declared = item.itemType ? String(item.itemType).toUpperCase() : null;
  const s = String(slot || '').toUpperCase();
  return declared === s;
}

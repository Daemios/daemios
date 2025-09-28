export class DomainError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = 'DomainError';
  }
}

export type MovePayload = {
  itemId: number | string;
  source?: { containerId?: number | null; localIndex?: number | null } | null;
  target?: { containerId?: number | null; localIndex?: number | null } | null;
};

export function validateMovePayload(payload: any): MovePayload {
  if (!payload || (typeof payload !== 'object')) throw new DomainError('INVALID_PAYLOAD', 'payload must be an object');
  const { itemId, source, target } = payload as any;
  if (itemId == null) throw new DomainError('MISSING_ITEM_ID', 'Missing itemId');

  const norm = {
    itemId: Number(itemId),
    source: source ? { containerId: source.containerId ?? null, localIndex: source.localIndex ?? null } : null,
    target: target ? { containerId: target.containerId ?? null, localIndex: target.localIndex ?? null } : null,
  } as MovePayload;
  return norm;
}

export function ensureValidTargetIndex(tgt: any) {
  if (!tgt) return;
  if (!Number.isInteger(tgt.localIndex) || tgt.localIndex < 0) throw new DomainError('INVALID_TARGET_INDEX', 'Invalid target index');
}

// Domain helper: find item occupying a container slot
export async function findContainerSlot(tx: any, containerId: number, index: number) {
  return tx.item.findFirst({ where: { containerId, containerIndex: index } });
}

// Domain helper: set an item's container position
export async function setItemContainerPosition(tx: any, itemId: number, containerId: number | null, index: number | null) {
  return tx.item.update({ where: { id: itemId }, data: { containerId: containerId ?? null, containerIndex: index ?? null } });
}

// Domain helper: clear a container index and optionally shift items - minimal behavior: just null the slot
export async function clearContainerIndexAndShiftIfNeeded(tx: any, containerId: number, index: number) {
  const occupying = await tx.item.findFirst({ where: { containerId, containerIndex: index } });
  if (occupying) {
    await tx.item.update({ where: { id: occupying.id }, data: { containerId: null, containerIndex: null } });
  }
  return true;
}

// Domain helper: compact container indices to remove gaps (naive implementation)
export async function compactContainerIndices(tx: any, containerId: number) {
  const items = await tx.item.findMany({ where: { containerId }, orderBy: { containerIndex: 'asc' } });
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.containerIndex !== i) {
      // eslint-disable-next-line no-await-in-loop
      await tx.item.update({ where: { id: it.id }, data: { containerIndex: i } });
    }
  }
  return true;
}

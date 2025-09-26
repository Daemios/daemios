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

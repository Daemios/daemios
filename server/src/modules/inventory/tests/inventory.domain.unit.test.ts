import { describe, it, expect } from 'vitest';
import { validateMovePayload, ensureValidTargetIndex, DomainError } from '../inventory.domain';

describe('inventory.domain validation', () => {
  it('validateMovePayload normalizes payload', () => {
    const p = validateMovePayload({ itemId: '5', source: { containerId: undefined, localIndex: 2 }, target: null });
    expect(p.itemId).toBe(5);
    expect(p.source).toEqual({ containerId: null, localIndex: 2 });
    expect(p.target).toBeNull();
  });

  it('validateMovePayload throws for missing itemId', () => {
    expect(() => validateMovePayload({})).toThrowError(DomainError);
  });

  it('ensureValidTargetIndex allows null/undefined', () => {
    expect(() => ensureValidTargetIndex(null)).not.toThrow();
  });

  it('ensureValidTargetIndex rejects negative or non-int index', () => {
    expect(() => ensureValidTargetIndex({ localIndex: -1 })).toThrowError(DomainError);
    expect(() => ensureValidTargetIndex({ localIndex: 1.5 })).toThrowError(DomainError);
  });
});

export class DomainError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = 'DomainError';
  }
}

export type AbilityElementInput = {
  name?: string | null;
  icon?: string | null;
  effect?: string | null;
  tag?: string | null;
  damage?: number | null;
  healing?: number | null;
  debuff?: number | null;
  buff?: number | null;
  color?: string | null;
};

export function normalizeAbilityElementPayload(payload: any): AbilityElementInput {
  const name = payload?.name == null ? null : String(payload.name).trim();
  if (name === '') throw new DomainError('NAME_REQUIRED', 'Ability element name cannot be empty');
  return {
    name: name || null,
    icon: payload?.icon ?? null,
    effect: payload?.effect ?? null,
    tag: payload?.tag ?? null,
    damage: payload?.damage ?? null,
    healing: payload?.healing ?? null,
    debuff: payload?.debuff ?? null,
    buff: payload?.buff ?? null,
    color: payload?.color ?? null,
  };
}

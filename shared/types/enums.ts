/**
 * Shared enum definitions that are kept in sync with Prisma schema enums.
 *
 * These arrays are deliberately declared with `as const` so that both runtime
 * consumers and TypeScript can rely on the literal union types.
 */
export const ContainerTypes = ['BASIC', 'LIQUID', 'CONSUMABLES', 'PACK', 'POCKETS'] as const;

export type ContainerType = (typeof ContainerTypes)[number];

export const EquipmentSlot = [
  'BACKPACK',
  'BELT',
  'BANDOLIER',
  'LEG',
  'HEAD',
  'CHEST',
  'HANDS',
  'FEET',
  'TRINKET1',
  'TRINKET2',
] as const;

export type EquipmentSlot = (typeof EquipmentSlot)[number];

export const WorldLocationTypes = ['TOWN', 'DUNGEON', 'QUEST'] as const;

export type WorldLocationType = (typeof WorldLocationTypes)[number];

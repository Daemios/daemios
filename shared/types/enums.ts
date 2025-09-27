/**
 * Shared enum definitions that are kept in sync with Prisma schema enums.
 *
 * These arrays are deliberately declared with `as const` so that both runtime
 * consumers and TypeScript can rely on the literal union types.
 */
export const ContainerTypes = ['BASIC', 'LIQUID', 'CONSUMABLES', 'PACK', 'POCKETS'] as const;

export type ContainerType = (typeof ContainerTypes)[number];

export const EquipmentSlot = [
  'TRINKET1',
  'TRINKET2',
  'TRINKET3',
  'PACK',
  'LEG',
  'HEAD',
  'CHEST',
  'HANDS',
  'FEET',
  'MAINHAND',
  'OFFHAND',
  'TWO_HANDED',
  'CONSTRUCT',
] as const;

export type EquipmentSlot = (typeof EquipmentSlot)[number];

export const WorldLocationTypes = ['TOWN', 'DUNGEON', 'QUEST'] as const;

export type WorldLocationType = (typeof WorldLocationTypes)[number];

export const ItemTypes = ['LIQUID', 'CONSUMABLE', 'FOOD', 'WEAPON', 'ARMOR', 'CONTAINER', 'PACK', 'GENERIC'] as const;

export type ItemType = (typeof ItemTypes)[number];

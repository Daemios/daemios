/*
 * Core shared interfaces for game domain objects.
 * Keep these minimal and easy to extend. They should rely on enums in
 * `enums.ts` where appropriate.
 */
import type { ItemType, ContainerType, EquipmentSlot } from './enums';

export type ID = string;

export interface StatBlock {
  hp: number;
  mp?: number;
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  [key: string]: number | undefined;
}

export interface User {
  id: ID;
  username: string;
  email?: string;
  createdAt: string; // ISO date
  displayName?: string;
  // lightweight profile/preferences placeholder
  avatar?: string;
}

export interface Item {
  id: ID;
  name: string;
  description?: string;
  type: ItemType;
  weight?: number; // arbitrary units
  stackable?: boolean;
  quantity?: number; // present when stackable
  // data for items that contain other data (like containers or weapons)
  metadata?: Record<string, unknown>;
}

export interface Container extends Item {
  // keep `type` inherited from Item (should be one of ItemType). Use
  // `containerType` to distinguish the specific container classification
  // (BASIC, LIQUID, CONSUMABLES, PACK, POCKETS).
  containerType: ContainerType;
  capacity: number; // number of item slots or abstract capacity units
  items: Array<Item>;
}

export type EquipmentMap = {
  [slot in EquipmentSlot]?: ID | null; // item id equipped in slot
};

export interface Character {
  id: ID;
  name: string;
  ownerId?: ID; // user id if this character is player-owned
  stats: StatBlock;
  inventory: Array<Item>;
  equipment?: EquipmentMap;
  location?: string; // world location id or simple descriptor
  createdAt?: string;
}

export interface Pagination {
  offset?: number;
  limit?: number;
}

export type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
};

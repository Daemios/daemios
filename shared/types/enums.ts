// shared/types/enums.ts
export const WorldLocationTypes = ['TOWN', 'DUNGEON', 'QUEST'] as const;
export type WorldLocationType = typeof WorldLocationTypes[number];

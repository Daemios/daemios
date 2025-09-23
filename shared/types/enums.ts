/**
 * Shared enum definitions that are kept in sync with Prisma schema enums.
 *
 * These arrays are deliberately declared with `as const` so that both runtime
 * consumers and TypeScript can rely on the literal union types.
 */
export const WorldLocationTypes = ['TOWN', 'DUNGEON', 'QUEST'] as const;

export type WorldLocationType = (typeof WorldLocationTypes)[number];

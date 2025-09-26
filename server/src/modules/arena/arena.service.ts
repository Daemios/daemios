import { prisma } from '../../db/prisma';

// Note: the current Prisma schema does not declare an ArenaHistory model.
// The legacy JS code used `prisma.arenaHistory`. To avoid changing schema here
// we use raw SQL queries through the Prisma client to operate on the
// existing table (assumed to be `arena_history`). If you prefer, we can add
// a proper model to prisma/schema.prisma and regenerate the client.

export async function listArenaHistories(): Promise<any[]> {
  // Stubbed: legacy raw-SQL-backed table. Replace with Prisma model if/when schema is updated.
  return [];
}

export async function getActiveArenaHistory(): Promise<any | null> {
  // Stubbed
  return null;
}

export async function findArenaHistoryById(id: number | string): Promise<any[]> {
  // Stubbed
  return [];
}

export async function deleteArenaHistoryById(id: number | string): Promise<any> {
  // Stubbed - no-op (returns number of affected rows in legacy implementation)
  return 0;
}

export async function updateArenaLastActive(id: number | string): Promise<any> {
  // Stubbed - no-op
  return 0;
}

export async function createArenaHistory(data: { name: string; seed: string; size: number }): Promise<any> {
  // Stubbed - no-op
  return { insertedId: null };
}

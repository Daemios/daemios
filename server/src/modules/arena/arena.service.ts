import { prisma } from '../../db/prisma';
import { validateCreateArenaHistory, DomainError } from './arena.domain';

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
  // Validate payload using domain rules. Keep behavior as a stubbed insert until
  // the Prisma schema is updated; validation still helps prevent bad input.
  try {
    const validated = validateCreateArenaHistory(data);
    // Stubbed DB behavior — mirror the previous no-op response but include validated data
    return { insertedId: null, validated };
  } catch (e) {
    if (e instanceof DomainError) throw Object.assign(new Error(e.message), { status: 400 });
    throw e;
  }
}

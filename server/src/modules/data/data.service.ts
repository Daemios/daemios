import { prisma } from '../../db/prisma';
import { normalizeListRacesOptions, DomainError } from './data.domain';

export async function listRaces(opts?: any) {
  // Current behavior: passthrough to Prisma. Normalize options for future use.
  try {
    const options = normalizeListRacesOptions(opts);
    // No special handling currently; return Prisma results directly.
    return prisma.race.findMany();
  } catch (e) {
    if (e instanceof DomainError) throw Object.assign(new Error(e.message), { status: 400 });
    throw e;
  }
}

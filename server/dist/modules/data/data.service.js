import { prisma } from '../../db/prisma';
export async function listRaces() {
    return prisma.race.findMany();
}

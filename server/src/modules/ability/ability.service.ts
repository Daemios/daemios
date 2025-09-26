import { prisma } from '../../db/prisma';
import { normalizeAbilityElementPayload, DomainError } from './ability.domain';

export async function createAbilityElement(payload: any) {
  const normalized = normalizeAbilityElementPayload(payload || {});
  try {
    return prisma.abilityElement.create({ data: normalized as any });
  } catch (e: any) {
    // If domain validation threw, map it to a JS Error for callers
    if (e instanceof DomainError) throw new Error(e.message);
    throw e;
  }
}

export async function listAbilityElements() {
  return prisma.abilityElement.findMany();
}

export async function getAbilityElement(id: number) {
  return prisma.abilityElement.findUnique({ where: { id } });
}

export async function updateAbilityElement(id: number, data: any) {
  return prisma.abilityElement.update({ where: { id }, data });
}

export async function deleteAbilityElement(id: number) {
  return prisma.abilityElement.delete({ where: { id } });
}

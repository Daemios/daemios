import { prisma } from '../../db/prisma';
import {
  normalizeAbilityElementCreatePayload,
  normalizeAbilityElementUpdatePayload,
  DomainError,
  AbilityElementCreatePayload,
  AbilityElementUpdatePayload,
} from './ability.domain';

export async function createAbilityElement(payload: AbilityElementCreatePayload) {
  try {
    const normalized = normalizeAbilityElementCreatePayload(payload);
    return await prisma.abilityElement.create({ data: normalized });
  } catch (e) {
    if (e instanceof DomainError) throw e;
    throw e;
  }
}

export async function listAbilityElements() {
  return prisma.abilityElement.findMany();
}

export async function listAbilityShapes() {
  return prisma.abilityShape.findMany();
}

export async function listAbilityRanges() {
  return prisma.abilityRange.findMany();
}

export async function listAbilityTypes() {
  return prisma.abilityType.findMany();
}

export async function getAbilityElement(id: number) {
  return prisma.abilityElement.findUnique({ where: { id } });
}

export async function updateAbilityElement(id: number, data: AbilityElementUpdatePayload) {
  try {
    const normalized = normalizeAbilityElementUpdatePayload(data);
    return await prisma.abilityElement.update({ where: { id }, data: normalized });
  } catch (e) {
    if (e instanceof DomainError) throw e;
    throw e;
  }
}

export async function deleteAbilityElement(id: number) {
  return prisma.abilityElement.delete({ where: { id } });
}

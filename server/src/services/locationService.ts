import { prisma } from '../db/prisma';

export async function listLocations(filter: Record<string, any> = {}) {
  // Basic passthrough to Prisma; adapt fields as needed by callers
  return prisma.location.findMany({ where: filter });
}

export async function createLocation(payload: Record<string, any>) {
  return prisma.location.create({ data: payload });
}

export async function getLocation(id: string | number) {
  const parsed = typeof id === 'string' ? parseInt(id, 10) : id;
  return prisma.location.findUnique({ where: { location_id: parsed } as any });
}

export async function deleteLocation(id: string | number) {
  const parsed = typeof id === 'string' ? parseInt(id, 10) : id;
  return prisma.location.delete({ where: { location_id: parsed } as any });
}

export async function listLocationsByType(type: string) {
  return prisma.location.findMany({ where: { type } });
}

export async function getLocationByType(id: string | number, type: string) {
  const parsed = typeof id === 'string' ? parseInt(id, 10) : id;
  return prisma.location.findFirst({ where: { location_id: parsed, type } as any });
}

export async function createLocationOfType(type: string, payload: Record<string, any>) {
  return prisma.location.create({ data: { ...payload, type } });
}

export default {
  listLocations,
  createLocation,
  getLocation,
  deleteLocation,
  listLocationsByType,
  getLocationByType,
  createLocationOfType,
};

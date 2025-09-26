import { prisma } from '../db/prisma';
export async function listLocations(filter = {}) {
    return prisma.worldLocation.findMany({ where: filter, orderBy: { updatedOn: 'desc' }, take: 100 });
}
export async function listLocationsByType(type, filter = {}) {
    return listLocations({ ...filter, type });
}
export async function createLocation(data) {
    return prisma.worldLocation.create({ data: { name: data.name, description: data.description, chunkX: data.chunkX, chunkY: data.chunkY, hexQ: data.hexQ, hexR: data.hexR, type: data.type, visible: data.visible ?? undefined, ownerUserId: data.ownerUserId ?? undefined } });
}
export async function createLocationOfType(type, data = {}) {
    return createLocation({ ...data, type });
}
export async function getLocation(id) {
    return prisma.worldLocation.findUnique({ where: { id: Number(id) } });
}
export async function getLocationByType(id, type) {
    return prisma.worldLocation.findFirst({ where: { id: Number(id), type: type } });
}
export async function deleteLocation(id) {
    return prisma.worldLocation.delete({ where: { id: Number(id) } });
}

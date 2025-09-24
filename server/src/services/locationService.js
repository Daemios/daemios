import prisma from '../lib/prisma.js';

export const listLocations = async (filter = {}) =>
  prisma.worldLocation.findMany({
    where: filter,
    orderBy: { updatedOn: 'desc' },
    take: 100,
  });

export const listLocationsByType = async (type, filter = {}) =>
  listLocations({ ...filter, type });

export const createLocation = async (data) =>
  prisma.worldLocation.create({
    data: {
      name: data.name,
      description: data.description,
      chunkX: data.chunkX,
      chunkY: data.chunkY,
      hexQ: data.hexQ,
      hexR: data.hexR,
      type: data.type,
      visible: data.visible ?? undefined,
      ownerUserId: data.ownerUserId ?? undefined,
    },
  });

export const createLocationOfType = async (type, data = {}) =>
  createLocation({ ...data, type });

export const getLocation = async (id) =>
  prisma.worldLocation.findUnique({
    where: { id: Number(id) },
  });

export const getLocationByType = async (id, type) =>
  prisma.worldLocation.findFirst({
    where: { id: Number(id), type },
  });

export const deleteLocation = async (id) =>
  prisma.worldLocation.delete({ where: { id: Number(id) } });

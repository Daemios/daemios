import prisma from '../lib/prisma.js';

export const listLocations = async (filter = {}) => prisma.worldLocation.findMany({
  where: filter,
  include: { town: true, dungeon: true },
  orderBy: { updatedOn: 'desc' },
  take: 100,
});

export const createLocation = async (data) => prisma.worldLocation.create({
  data: {
    name: data.name,
    description: data.description,
    chunkX: data.chunkX,
    chunkY: data.chunkY,
    hexQ: data.hexQ,
    hexR: data.hexR,
    type: data.type,
    ownerUserId: data.ownerUserId,
  },
});

export const getLocation = async (id) => prisma.worldLocation.findUnique({
  where: { id: Number(id) },
  include: { town: true, dungeon: true },
});

export const deleteLocation = async (id) => prisma.worldLocation.delete({ where: { id: Number(id) } });

export const createTown = async (locationId, townData = {}) => prisma.town.create({
  data: {
    worldLocationId: Number(locationId),
    population: townData.population ?? null,
    factionId: townData.factionId ?? null,
  },
});

export const createDungeon = async (locationId, dungeonData = {}) => prisma.dungeon.create({
  data: {
    worldLocationId: Number(locationId),
    difficulty: dungeonData.difficulty ?? null,
    maxDepth: dungeonData.maxDepth ?? null,
  },
});

export const listTowns = async () => prisma.town.findMany({ include: { worldLocation: true } });

export const getTown = async (id) => prisma.town.findUnique({
  where: { id: Number(id) },
  include: { worldLocation: true },
});

export const listDungeons = async () => prisma.dungeon.findMany({ include: { worldLocation: true } });

export const getDungeon = async (id) => prisma.dungeon.findUnique({
  where: { id: Number(id) },
  include: { worldLocation: true },
});

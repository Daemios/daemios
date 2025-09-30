import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the auth middleware so requests are treated as authenticated and req.user is set
vi.mock('../../../middlewares/user', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../middlewares/user')>();
  return { ...actual, isAuth: (req: any, _res: any, next: any) => { req.user = { id: 77 }; next(); } };
});

// Mock the character service to return a predictable character
vi.mock('../../character/character.service', () => ({
  characterService: { getActiveCharacterForUser: vi.fn().mockResolvedValue({ id: 77 }), buildCharacterWithEquipment: vi.fn().mockResolvedValue({ equipped: {} }) },
}));

// Mock inventory service's placeItem and fetchContainersWithItems to return controlled responses
vi.mock('../inventory.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../inventory.service')>('../inventory.service');
  return {
    ...actual,
    placeItem: vi.fn().mockResolvedValue({ containers: [{ id: 900, items: [{ id: 9001, containerIndex: 0 }] }], updatedContainerIds: [900], equipment: [] }),
    fetchContainersWithItems: vi.fn().mockResolvedValue([{ id: 10, items: [] }]),
  };
});

import app from '../../../app';

describe('inventory routes integration', () => {
  afterEach(() => vi.resetAllMocks());

  it('POST /inventory/action returns diff-shaped response with containers map', async () => {
    const res = await request(app).post('/inventory/action').send({ itemId: 9001, destination: { type: 'container' } }).expect(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    const data = res.body.data;
    expect(data).toHaveProperty('containers');
    expect(typeof data.containers).toBe('object');
    expect(Object.keys(data.containers)).toEqual(['900']);
  });

  it('GET /inventory returns full array of containers', async () => {
    const res = await request(app).get('/inventory').expect(200);
    // accept either standardized envelope { success, data } or legacy raw data
    const body = (res.body && res.body.data != null) ? res.body.data : res.body;
    // body should be an object or array; when object expect containers array
    if (Array.isArray(body)) {
      // legacy: body is the containers array
      expect(Array.isArray(body)).toBe(true);
    } else {
      expect(body).toHaveProperty('containers');
      expect(Array.isArray(body.containers)).toBe(true);
    }
  });
});

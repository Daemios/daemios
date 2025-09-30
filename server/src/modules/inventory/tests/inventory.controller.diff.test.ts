import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma to avoid DB access
vi.mock('../../../db/prisma', () => ({
  prisma: { equipment: { findMany: vi.fn() } },
}));

// Partially mock inventory.service: re-export the real mapItemForClient, mock only placeItem
vi.mock('../inventory.service', async () => {
  const actual = await vi.importActual<typeof import('../inventory.service')>('../inventory.service');
  return {
    ...actual,
    placeItem: vi.fn(),
  };
});
vi.mock('../../character/character.service', () => ({
  characterService: { getActiveCharacterForUser: vi.fn(), buildCharacterWithEquipment: vi.fn() },
}));

import { postAction } from '../inventory.controller';
import * as invService from '../inventory.service';
import { characterService } from '../../character/character.service';

describe('inventory.controller diff responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns partial container map only containing updatedContainerIds', async () => {
    // Arrange: simulated character
    (characterService.getActiveCharacterForUser as any).mockResolvedValue({ id: 1 });

    // Simulated placeItem result: 3 containers, but only id 2 updated
    const containers = [
      { id: 1, items: [{ id: 10, containerIndex: 0 }] },
      { id: 2, items: [{ id: 20, containerIndex: 0 }] },
      { id: 3, items: [{ id: 30, containerIndex: 0 }] },
    ];
    (invService.placeItem as any).mockResolvedValue({ containers, updatedContainerIds: [2], equipment: [] });

    // Fake req/res
    const req: any = { user: { id: 1 }, body: { itemId: 20, destination: { type: 'container' } } };
    let captured: any = null;
    const res: any = {
      status: (_: any) => ({ json: (body: any) => { captured = body; return body; } }),
    };

    // Act
    await postAction(req, res);

    // Assert: respondSuccess wraps data in { success: true, data: ... }
    expect(captured).not.toBeNull();
    const data = captured.data;
    expect(data).toHaveProperty('containers');
    // In diff mode, containers should be an object (map) keyed by id
    expect(typeof data.containers).toBe('object');
    expect(Array.isArray(data.containers)).toBe(false);
    const keys = Object.keys(data.containers);
    expect(keys).toEqual(['2']);
    // verify slots for container 2 are present and correspond to containerIndex
    expect(data.containers['2']).toHaveProperty('slots');
    expect(data.containers['2'].slots['0']).toBeDefined();
    // untouched container ids must not be present
    expect(data.containers['1']).toBeUndefined();
    expect(data.containers['3']).toBeUndefined();
  });

  it('returns full array when updatedContainerIds not provided', async () => {
    (characterService.getActiveCharacterForUser as any).mockResolvedValue({ id: 1 });
    const containers = [ { id: 5, items: [] }, { id: 6, items: [] } ];
    (invService.placeItem as any).mockResolvedValue({ containers, equipment: [] });

    const req: any = { user: { id: 1 }, body: { itemId: 5, destination: { type: 'container' } } };
    let captured: any = null;
    const res: any = {
      status: (_: any) => ({ json: (body: any) => { captured = body; return body; } }),
    };

    await postAction(req, res);

    expect(captured).not.toBeNull();
    const data = captured.data;
    // When no updatedContainerIds, containers should be an array
    expect(Array.isArray(data.containers)).toBe(true);
    expect(data.containers.length).toBe(2);
    // ensure there is no containers map keyed by ids
    expect(typeof data.containers).toBe('object');
    expect(data.containers[0].id).toBe(5);
  });

  it('does not leak untouched equipment slots in diff responses', async () => {
    (characterService.getActiveCharacterForUser as any).mockResolvedValue({ id: 1 });

    // Service returns container diff but no equipment entries
    const containers = [ { id: 10, items: [{ id: 100, containerIndex: 0 }] } ];
    (invService.placeItem as any).mockResolvedValue({ containers, updatedContainerIds: [10], equipment: [] });

    const req: any = { user: { id: 1 }, body: { itemId: 100, destination: { type: 'container' } } };
    let captured: any = null;
    const res: any = { status: (_: any) => ({ json: (body: any) => { captured = body; return body; } }) };

    await postAction(req, res);

    expect(captured).not.toBeNull();
    const data = captured.data;
    // equipment should be empty array (service provided none)
    expect(Array.isArray(data.equipment)).toBe(true);
    expect(data.equipment.length).toBe(0);
  });

  it('includes only provided equipment slots in response', async () => {
    (characterService.getActiveCharacterForUser as any).mockResolvedValue({ id: 1 });

    const containers = [ { id: 20, items: [] } ];
    const equipment = [ { slot: 'head', itemId: 501 }, { slot: 'belt', itemId: 502 } ];
    (invService.placeItem as any).mockResolvedValue({ containers, updatedContainerIds: [20], equipment });

    const req: any = { user: { id: 1 }, body: { itemId: 501, destination: { type: 'equipment' } } };
    let captured: any = null;
    const res: any = { status: (_: any) => ({ json: (body: any) => { captured = body; return body; } }) };

    await postAction(req, res);

    expect(captured).not.toBeNull();
    const data = captured.data;
    // equipment should include exactly the two entries provided
    expect(Array.isArray(data.equipment)).toBe(true);
    const slots = data.equipment.map((e: any) => String(e.slot).toLowerCase()).sort();
    expect(slots).toEqual(['belt', 'head']);
  });

  it('handles slot removals (slots set to null) and omits the slot from response', async () => {
    (characterService.getActiveCharacterForUser as any).mockResolvedValue({ id: 1 });

    // Simulate a container that previously had an item at slot 0 but now has no items
    const containers = [{ id: 30, items: [] }];
    (invService.placeItem as any).mockResolvedValue({ containers, updatedContainerIds: [30], equipment: [] });

    const req: any = { user: { id: 1 }, body: { itemId: 999, destination: { type: 'container' } } };
    let captured: any = null;
    const res: any = { status: (_: any) => ({ json: (body: any) => { captured = body; return body; } }) };

    await postAction(req, res);

    expect(captured).not.toBeNull();
    const data = captured.data;
    // container map should exist and not include slot '0'
    expect(data.containers['30']).toBeDefined();
    expect(data.containers['30'].slots['0']).toBeUndefined();
  });

  it('returns capacity_updated true and includes updated capacity when provided', async () => {
    (characterService.getActiveCharacterForUser as any).mockResolvedValue({ id: 1 });

    const containers = [{ id: 31, items: [{ id: 301, containerIndex: 0 }], capacity: 99 }];
    (invService.placeItem as any).mockResolvedValue({ containers, updatedContainerIds: [31], equipment: [], capacityUpdated: true });

    const req: any = { user: { id: 1 }, body: { itemId: 301, destination: { type: 'container' } } };
    let captured: any = null;
    const res: any = { status: (_: any) => ({ json: (body: any) => { captured = body; return body; } }) };

    await postAction(req, res);

    expect(captured).not.toBeNull();
    const data = captured.data;
    expect(data.capacity_updated).toBe(true);
    expect(data.containers['31'].capacity).toBe(99);
  });

  it('returns nestableContainers replacement correctly in diff responses', async () => {
    (characterService.getActiveCharacterForUser as any).mockResolvedValue({ id: 1 });

    const containers = [
      { id: 40, items: [], nestable: true },
      { id: 41, items: [], nestable: false },
    ];
    (invService.placeItem as any).mockResolvedValue({ containers, updatedContainerIds: [40], equipment: [] });

    const req: any = { user: { id: 1 }, body: { itemId: 400, destination: { type: 'container' } } };
    let captured: any = null;
    const res: any = { status: (_: any) => ({ json: (body: any) => { captured = body; return body; } }) };

    await postAction(req, res);

    expect(captured).not.toBeNull();
    const data = captured.data;
    // nestableContainers should include only the nestable container(s)
    expect(Array.isArray(data.nestableContainers)).toBe(true);
    expect(data.nestableContainers.some((c: any) => c.id === 40)).toBe(true);
    expect(data.nestableContainers.some((c: any) => c.id === 41)).toBe(false);
  });
});

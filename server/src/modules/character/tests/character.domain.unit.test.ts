import { describe, it, expect } from 'vitest';
import { mapItemForClient, makePocketsPlaceholder } from '../character.domain';

describe('character.domain utilities', () => {
  it('mapItemForClient returns null for falsy input', () => {
    expect(mapItemForClient(null)).toBeNull();
  });

  it('mapItemForClient selects image and label properly', () => {
    const it = { id: 1, name: 'Sword', displayName: 'The Blade', img: null };
    const mapped = mapItemForClient(it as any);
    expect(mapped).toHaveProperty('img');
    expect(mapped.img).toBe('/img/debug/placeholder.png');
    expect(mapped.label).toBe('Sword');
  });

  it('mapItemForClient prefers provided image and display name', () => {
    const it = { id: 2, displayName: 'The Blade', image: '/img/blade.png' };
    const mapped = mapItemForClient(it as any);
    expect(mapped.img).toBe('/img/blade.png');
    expect(mapped.label).toBe('The Blade');
  });

  it('makePocketsPlaceholder shapes pockets placeholder', () => {
    const pockets = { id: 22, capacity: 5 };
    const ph = makePocketsPlaceholder(pockets as any);
    expect(ph.id).toBeNull();
    expect(ph.label).toBe('Pockets');
    expect(ph.isContainer).toBe(true);
    expect(ph.containerId).toBe(pockets.id);
    expect(ph.capacity).toBe(5);
  });
});

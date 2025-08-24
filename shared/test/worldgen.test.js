import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const g = await import(path.join(__dirname, '..', 'lib', 'worldgen', 'index.js'));

describe('shared worldgen', () => {
  it('generates deterministic tile for fixed seed and coords', () => {
    const a = g.generateTile('seed-test', { q: 1, r: 2 });
    const b = g.generateTile('seed-test', { q: 1, r: 2 });
    expect(a).toBeDefined();
    expect(a.q).toBe(1);
    expect(a.r).toBe(2);
    expect(a.seed).toBe('seed-test');
    expect(b).toEqual(a);
  });
});

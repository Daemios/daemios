import { describe, it, expect } from 'vitest';

function evenQToAxial(gCol, gRow) {
  const q = gCol;
  const r = gRow - Math.floor((gCol + (gCol & 1)) / 2);
  return { q, r };
}

function oldFormula(gCol, gRow) {
  return gRow - Math.floor(gCol / 2);
}

describe('even-q offset to axial conversion', () => {
  it('handles negative column values', () => {
    expect(evenQToAxial(-2, 0)).toEqual({ q: -2, r: 1 });
    expect(evenQToAxial(-1, 0)).toEqual({ q: -1, r: 0 });
    expect(evenQToAxial(-1, 5)).toEqual({ q: -1, r: 5 });
    expect(evenQToAxial(-3, 4)).toEqual({ q: -3, r: 5 });
  });

  it('differs from old formula for negative columns', () => {
    const newR = evenQToAxial(-1, 0).r;
    const oldR = oldFormula(-1, 0);
    expect(newR).not.toBe(oldR);
  });
});

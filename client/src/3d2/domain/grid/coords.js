// Axial/cube coordinate helpers for hex grids (flat-top axial layout)

// Convert axial (q,r) to cube {x,y,z}
export function axialToCube(q, r) {
  const x = q;
  const z = r;
  const y = -x - z;
  return { x, y, z };
}

// Convert cube to axial
export function cubeToAxial(c) {
  return { q: c.x, r: c.z };
}

// Axial distance using cube coords
export function distanceAxial(a, b) {
  const A = axialToCube(a.q, a.r);
  const B = axialToCube(b.q, b.r);
  return Math.max(Math.abs(A.x - B.x), Math.abs(A.y - B.y), Math.abs(A.z - B.z));
}

// Round fractional axial coords to nearest hex (cube rounding)
export function roundAxial(qf, rf) {
  const x = qf;
  const z = rf;
  const y = -x - z;
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);
  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }
  return { q: rx, r: rz };
}

export default { axialToCube, cubeToAxial, distanceAxial, roundAxial };

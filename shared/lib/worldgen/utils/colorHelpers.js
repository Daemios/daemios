// shared/lib/worldgen/utils/colorHelpers.js
// small color helpers used by palette interpreter

function hexToRgb(hex) {
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  return { r, g, b };
}

function rgbToHex(c) {
  return '#' + [c.r,c.g,c.b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}

function lerp(a, b, t) { return a + (b - a) * t; }

function lerpRgb(a, b, t) {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) };
}

function lerpHex(aHex, bHex, t) {
  const a = hexToRgb(aHex);
  const b = hexToRgb(bHex);
  const r = lerpRgb(a, b, t);
  return rgbToHex(r);
}

export { hexToRgb, rgbToHex, lerpHex };

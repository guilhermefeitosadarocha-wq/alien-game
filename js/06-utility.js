// ═══════════════════════════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════════════════════════
const Util = {
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (a, b) => {
    if (!a || !b) return Infinity;   // null-safe guard
    return Math.hypot(b.x - a.x, b.y - a.y);
  },
  rand: (min, max) => Math.random() * (max - min) + min,
  randItem: arr => arr[Math.floor(Math.random() * arr.length)],
  toWorld: (px, py) => ({
    x: (px - offsetX) / scale,
    y: (py - offsetY) / scale,
  }),
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
};


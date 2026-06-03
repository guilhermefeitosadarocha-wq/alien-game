// ═══════════════════════════════════════════════════════════
//  FLOAT TEXT — textos flutuantes na arena
// ═══════════════════════════════════════════════════════════
const FloatText = {
  pool: [],

  spawn(x, y, text, color, size, life) {
    this.pool.push({ x, y, text, color, size: size || 18, life, maxLife: life, vy: -38 });
  },

  update(dt) {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const t = this.pool[i];
      t.y    += t.vy * dt;
      t.life -= dt;
      if (t.life <= 0) this.pool.splice(i, 1);
    }
  },

  draw() {
    ctx.save();
    for (const t of this.pool) {
      const a = Math.min(1, t.life / (t.maxLife * 0.4));
      ctx.font         = `bold ${t.size}px "Courier New"`;
      ctx.fillStyle    = t.color;
      ctx.shadowColor  = t.color;
      ctx.shadowBlur   = 12;
      ctx.globalAlpha  = a;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  },

  clear() { this.pool.length = 0; },
};


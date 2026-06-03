// ═══════════════════════════════════════════════════════════
//  PARTICLES
// ═══════════════════════════════════════════════════════════
const Particles = {
  pool: [],

  burst(x, y, count, colorBase, speedMult = 1) {
    if (CONFIG._particlesDisabled) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Util.rand(40, 140) * speedMult;
      this.pool.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: CONFIG.PARTICLE_LIFE,
        maxLife: CONFIG.PARTICLE_LIFE,
        r: Util.rand(2, 5),
        colorBase,
      });
    }
  },

  update(dt) {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.x    += p.vx * dt;
      p.y    += p.vy * dt;
      p.vx   *= 0.94;
      p.vy   *= 0.94;
      p.life -= dt;
      if (p.life <= 0) this.pool.splice(i, 1);
    }
  },

  draw() {
    ctx.save();
    for (const p of this.pool) {
      const alpha = p.life / p.maxLife;
      const radius = p.r * (0.4 + alpha * 0.6);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle   = `${p.colorBase}${alpha})`;
      ctx.shadowColor = `${p.colorBase}${Math.min(0.9, alpha * 1.2)})`;
      ctx.shadowBlur  = 10 * alpha;
      ctx.fill();
    }
    ctx.restore();
  },

  clear() { this.pool.length = 0; },
};


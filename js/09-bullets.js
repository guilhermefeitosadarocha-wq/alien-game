// ═══════════════════════════════════════════════════════════
//  BULLETS
// ═══════════════════════════════════════════════════════════
const Bullets = {
  pool: [],

  _addBullet(x, y, angle) {
    this.pool.push({
      x, y,
      vx: Math.cos(angle) * CONFIG.BULLET_SPEED,
      vy: Math.sin(angle) * CONFIG.BULLET_SPEED,
      life: CONFIG.BULLET_LIFE,
      active: true,
    });
  },

  spawn(x, y, angle) {
    // Tiro principal
    this._addBullet(x, y, angle);
    const isMulti = CONFIG._doubleShot || CONFIG._tripleShot || CONFIG._diagShot;
    // Tiro duplo
    if (CONFIG._doubleShot || CONFIG._tripleShot) {
      const spread = CONFIG._tripleShot ? 0.22 : 0.18;
      this._addBullet(x, y, angle - spread);
      if (CONFIG._tripleShot) this._addBullet(x, y, angle + spread);
    }
    // Tiro diagonal
    if (CONFIG._diagShot) {
      this._addBullet(x, y, angle + Math.PI * 0.5);
      this._addBullet(x, y, angle - Math.PI * 0.5);
    }
    // SFX — diferencia tiro simples de multi
    SFX.play(isMulti ? 'shoot_multi' : 'shoot');
  },

  update(dt) {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const b = this.pool[i];
      b.x    += b.vx * dt;
      b.y    += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.x > CONFIG.TARGET_W || b.y < 0 || b.y > CONFIG.TARGET_H) {
        this.pool.splice(i, 1);
      }
    }
  },

  draw() {
    const trailLen  = 0.05 + (CONFIG._trailLength || 0) * 0.04;
    const glowBonus = CONFIG._glowBonus || 0;
    ctx.save();
    ctx.shadowColor = CONFIG.NEON_COLOR;
    ctx.shadowBlur  = 12 + glowBonus * 0.5;
    for (const b of this.pool) {
      const alpha = b.life / CONFIG.BULLET_LIFE;
      // Trail
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * trailLen, b.y - b.vy * trailLen);
      const grad = ctx.createLinearGradient(
        b.x, b.y,
        b.x - b.vx * trailLen, b.y - b.vy * trailLen
      );
      grad.addColorStop(0, `rgba(0,220,255,${alpha * 0.7})`);
      grad.addColorStop(1, 'rgba(0,120,200,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth   = CONFIG.BULLET_RADIUS * 1.2;
      ctx.lineCap     = 'round';
      ctx.stroke();
      // Bullet head
      ctx.beginPath();
      ctx.arc(b.x, b.y, CONFIG.BULLET_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,240,255,${alpha})`;
      ctx.fill();
    }
    ctx.restore();
  },

  clear() { this.pool.length = 0; },
};


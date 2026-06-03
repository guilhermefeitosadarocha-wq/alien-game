// ═══════════════════════════════════════════════════════════
//  ENEMY BULLETS — projéteis dos inimigos
// ═══════════════════════════════════════════════════════════
const EnemyBullets = {
  pool: [],

  spawn(x, y, angle, speed = 140, isRobotLaser = false) {
    this.pool.push({ x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 3.0, maxLife: 3.0, r: isRobotLaser ? 4 : 5,
      isRobotLaser,
    });
  },

  update(dt) {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const b = this.pool[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > CONFIG.TARGET_W + 20
        || b.y < -20 || b.y > CONFIG.TARGET_H + 20) {
        this.pool.splice(i, 1);
      }
    }
    // Collision vs player (ignora se P1 morto em modo MP)
    if (!Player._dead && Player.invincible <= 0 && Game.state === 'playing') {
      for (let i = this.pool.length - 1; i >= 0; i--) {
        const b = this.pool[i];
        if (!b) continue;
        if (Util.dist(b, Player) < 16) {
          this.pool.splice(i, 1);
          Player.hit();
        }
      }
    }
  },

  // ── BOSS ATTACKS visual: laser neon vs projétil laranja ──
  draw() {
    ctx.save();
    for (const b of this.pool) {
      const a = b.life / b.maxLife;
      if (b.isRobotLaser) {
        // Laser neon ciano (Robot Lord)
        ctx.shadowColor = 'rgba(0,200,255,0.95)';
        ctx.shadowBlur  = 16;
        // Trilha laser
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 0.055, b.y - b.vy * 0.055);
        const lg = ctx.createLinearGradient(
          b.x, b.y, b.x - b.vx * 0.055, b.y - b.vy * 0.055
        );
        lg.addColorStop(0, `rgba(0,220,255,${a * 0.75})`);
        lg.addColorStop(1, 'rgba(0,120,220,0)');
        ctx.strokeStyle = lg;
        ctx.lineWidth   = b.r * 1.6;
        ctx.lineCap     = 'round';
        ctx.stroke();
        // Núcleo brilhante
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,240,255,${a})`;
        ctx.fill();
      } else {
        // Projétil laranja padrão (outros inimigos/bosses)
        ctx.shadowColor = 'rgba(255,140,0,0.9)';
        ctx.shadowBlur  = 14;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,180,0,${a})`;
        ctx.fill();
      }
    }
    ctx.restore();
  },

  clear() { this.pool.length = 0; },
};


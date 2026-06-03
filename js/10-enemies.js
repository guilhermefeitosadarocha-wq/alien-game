// ═══════════════════════════════════════════════════════════
//  ENEMIES
// ═══════════════════════════════════════════════════════════
const Enemies = {
  pool: [],
  spawnTimer: 0,

  reset() { this.pool.length = 0; this.spawnTimer = 0; },

  _spawnInterval() {
    const base = Math.max(CONFIG.ENEMY_SPAWN_MIN, CONFIG.ENEMY_SPAWN_BASE - Game.elapsed * CONFIG.ENEMY_SPAWN_DEC);
    return base;  // DifficultySystem.spawnIntervalMult() applied in update()
  },

  _speed() {
    return CONFIG.ENEMY_BASE_SPEED + Math.floor(Game.elapsed / 10) * CONFIG.ENEMY_SPEED_INC;
  },

  _randomEdge() {
    const pad = 60;
    return {
      x: Util.rand(pad, CONFIG.TARGET_W - pad),
      y: Util.rand(pad, CONFIG.TARGET_H - pad),
    };
  },

  update(dt) {
    // Spawn — interval modified by DifficultySystem
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const pos  = this._randomEdge();
      const type = DifficultySystem.weightedEnemyType();
      const def  = EnemyTypes.get(type);
      const hpMult = DifficultySystem.enemyHpMult();
      const hp = Math.ceil((def.hp || 1) * hpMult);
      this.pool.push({
        x: pos.x, y: pos.y,
        type,
        emoji:       def.emoji || Util.randItem(CONFIG.ENEMY_EMOJIS),
        size:        def.size        || 20,
        hp,
        maxHp:       hp,
        speedFactor: def.speedFactor || 1.0,
        scoreBonus:  def.scoreBonus  || 0,
        coinBonus:   def.coinBonus   || 0,
        glow:        def.glow        || 'rgba(200,0,255,0.8)',
        behaviour:   def.behaviour   || 'chase',
        // Per-instance mutable state (never share with prototype)
        zigzagTimer:   0,
        zigzagAngle:   0,
        shootTimer:    0,
        electricPulse: 0,
        active: true,
      });
      this.spawnTimer = this._spawnInterval() * DifficultySystem.spawnIntervalMult();
    }

    const baseSpeed = this._speed() * DifficultySystem.enemySpeedMult() * (CONFIG._modFastEnemies ? 1.5 : 1);
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const e = this.pool[i];
      const spd = baseSpeed * e.speedFactor;
      const dx  = Player.x - e.x, dy = Player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;

      if (e.behaviour === 'chase') {
        e.x += (dx / dist) * spd * dt;
        e.y += (dy / dist) * spd * dt;
      } else if (e.behaviour === 'zigzag') {
        e.zigzagTimer += dt;
        if (e.zigzagTimer > 0.6) { e.zigzagTimer = 0; e.zigzagAngle = Util.rand(-0.9, 0.9); }
        const baseAngle = Math.atan2(dy, dx);
        e.x += Math.cos(baseAngle + e.zigzagAngle) * spd * dt;
        e.y += Math.sin(baseAngle + e.zigzagAngle) * spd * dt;
      } else if (e.behaviour === 'shooter') {
        // Keep distance
        if (dist < e.size * 8) {
          e.x -= (dx / dist) * spd * 0.5 * dt;
          e.y -= (dy / dist) * spd * 0.5 * dt;
        } else if (dist > e.size * 12) {
          e.x += (dx / dist) * spd * 0.5 * dt;
          e.y += (dy / dist) * spd * 0.5 * dt;
        }
        e.shootTimer += dt;
        if (e.shootTimer >= 2.5) {
          e.shootTimer = 0;
          const angle = Math.atan2(dy, dx);
          EnemyBullets.spawn(e.x, e.y, angle, 130);
        }
      }

      // Electric pulse effect
      if (e.type === 'electric') {
        e.electricPulse += dt * 4;
      }

      // Clamp to arena (loose)
      e.x = Util.clamp(e.x, -50, CONFIG.TARGET_W + 50);
      e.y = Util.clamp(e.y, -50, CONFIG.TARGET_H + 50);
    }
  },

  draw() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const e of this.pool) {
      ctx.save();
      const glowMult = (e.type === 'electric') ? (1 + Math.sin(e.electricPulse) * 0.5) : 1;
      ctx.shadowColor = e.glow || 'rgba(255,0,200,0.9)';
      ctx.shadowBlur  = (14 + (e.size - 20) * 0.5) * glowMult;
      // Electric flicker
      if (e.type === 'electric') ctx.globalAlpha = 0.85 + Math.sin(e.electricPulse * 2) * 0.15;
      ctx.font = `${e.size * 2}px serif`;
      ctx.fillText(e.emoji, e.x, e.y);
      ctx.restore();
      // HP bar for multi-hp enemies
      if (e.maxHp > 1) {
        const bw = e.size * 2;
        const bh = 4;
        const bx = e.x - bw / 2;
        const by = e.y + e.size + 4;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(bx, by, bw, bh);
        const ratio = e.hp / e.maxHp;
        ctx.fillStyle = ratio > 0.5 ? '#00ff88' : ratio > 0.25 ? '#ffcc00' : '#ff4444';
        ctx.fillRect(bx, by, bw * ratio, bh);
      }
    }
    ctx.restore();
  },

  clear() { this.pool.length = 0; },
};


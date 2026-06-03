// ═══════════════════════════════════════════════════════════
//  POWER UP SYSTEM
// ═══════════════════════════════════════════════════════════
const PowerUps = {
  pool: [],
  _spawnTimer: 20,   // first power-up
  _TYPES: [
    {
      id: 'heal',     icon: '💊', color: 'rgba(0,255,100,',
      label: '+1 VIDA',
      apply() {
        Player.lives = Math.min(CONFIG.PLAYER_LIVES, Player.lives + 1);
        ScreenFX.flash('rgba(0,255,100,0.20)', 0.4);
      },
    },
    {
      id: 'speed',    icon: '💨', color: 'rgba(0,200,255,',
      label: 'TURBO!',
      apply() {
        PowerUps._applyTimed('speed', 8, () => {
          CONFIG._speedBoost = 120;
        }, () => {
          CONFIG._speedBoost = 0;
        });
        ScreenFX.flash('rgba(0,200,255,0.15)', 0.3);
      },
    },
    {
      id: 'invincible', icon: '🛡️', color: 'rgba(255,200,0,',
      label: 'INVENCÍVEL!',
      apply() {
        Player.invincible = Math.max(Player.invincible, 6);
        ScreenFX.flash('rgba(255,200,0,0.20)', 0.5);
      },
    },
    {
      id: 'scorex',   icon: '⭐', color: 'rgba(255,220,0,',
      label: 'SCORE ×3!',
      apply() {
        PowerUps._applyTimed('scorex', 10, () => {
          CONFIG._scoreBoost = 3;
        }, () => {
          CONFIG._scoreBoost = 1;
        });
        ScreenFX.flash('rgba(255,220,0,0.18)', 0.4);
      },
    },
    {
      id: 'clear',    icon: '💥', color: 'rgba(255,80,0,',
      label: 'CLEAR!',
      apply() {
        // Destroys all normal enemies on screen
        const scored = Enemies.pool.length;
        Game.score += scored * CONFIG.SCORE_PER_KILL;
        Enemies.pool.forEach(e => Particles.burst(e.x, e.y, 10, 'rgba(255,80,0,', 1.5));
        Enemies.pool.length = 0;
        ScreenFX.flash('rgba(255,80,0,0.30)', 0.5);
        if (BossSystem.boss) BossSystem.takeDamage(8);
      },
    },
  ],
  _timers: {},

  _applyTimed(id, duration, onApply, onEnd) {
    clearTimeout(this._timers[id]);
    onApply();
    this._timers[id] = setTimeout(() => { onEnd(); }, duration * 1000);
  },

  reset() {
    this.pool.length = 0;
    this._spawnTimer = 20;
    // Cancel any active timers
    Object.values(this._timers).forEach(t => clearTimeout(t));
    this._timers = {};
    CONFIG._speedBoost = 0;
    CONFIG._scoreBoost = 1;
  },

  update(dt) {
    // Spawn timer
    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) {
      this._spawnTimer = Util.rand(18, 35);
      this._spawn();
    }
    // Update existing power-ups
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.life -= dt;
      p.pulse = (p.pulse || 0) + dt * 3;
      if (p.life <= 0) { this.pool.splice(i, 1); continue; }
      // Player pickup
      if (Util.dist(p, Player) < 22 + CONFIG.PLAYER_SIZE) {
        p.type.apply();
        SFX.play('powerup_collect');
        FloatText.spawn(p.x, p.y - 24, p.type.label, '#ffdd00', 18, 1.2);
        this.pool.splice(i, 1);
      }
    }
  },

  _spawn() {
    const pad = 60;
    const type = Util.randItem(this._TYPES);
    this.pool.push({
      x: Util.rand(pad, CONFIG.TARGET_W - pad),
      y: Util.rand(pad, CONFIG.TARGET_H - pad),
      type,
      life: 12,
      maxLife: 12,
      pulse: 0,
    });
    SFX.play('powerup_appear');
  },

  draw() {
    ctx.save();
    for (const p of this.pool) {
      const alpha = Math.min(1, p.life / 2);
      const s = 1 + Math.sin(p.pulse) * 0.12;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(s, s);
      ctx.shadowColor = p.type.color + '0.9)';
      ctx.shadowBlur  = 18 + Math.sin(p.pulse) * 6;
      ctx.font        = '28px serif';
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = alpha;
      ctx.fillText(p.type.icon, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  },
};


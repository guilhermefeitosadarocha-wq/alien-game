// ═══════════════════════════════════════════════════════════
//  SLOW MOTION SYSTEM
// ═══════════════════════════════════════════════════════════
const SlowMotion = {
  _factor: 1.0,
  _timer: 0,
  _target: 1.0,

  reset() { this._factor = 1.0; this._timer = 0; this._target = 1.0; },

  trigger(factor, duration) {
    this._target = factor;
    this._timer  = duration;
  },

  update(dt) {
    if (this._timer > 0) {
      this._timer -= dt;
      this._factor += (this._target - this._factor) * 0.15;
      if (this._timer <= 0) this._target = 1.0;
    } else {
      this._factor += (1.0 - this._factor) * 0.08;
      if (Math.abs(this._factor - 1.0) < 0.01) this._factor = 1.0;
    }
  },

  get dt() { return this._factor; },
  isActive() { return this._factor < 0.95; },
};

// ═══════════════════════════════════════════════════════════
//  CRITICAL SYSTEM
//  Chance de dano crítico ao matar inimigos.
// ═══════════════════════════════════════════════════════════
const CriticalSystem = {
  baseChance: 0,    // aumentado por upgrades

  reset() { this.baseChance = CONFIG._critChance || 0; },

  roll(x, y, baseScore) {
    const chance = this.baseChance + (CONFIG._critChance || 0);
    if (chance <= 0 || Math.random() > chance) return baseScore;
    const bonus = baseScore * 2;
    FloatText.spawn(Player.x, Player.y - 30, 'CRIT! +' + bonus, '#ffdd00', 18, 1.0);
    Particles.burst(x, y, 8, 'rgba(255,200,0,', 1.2);
    return bonus;
  },
};

// ═══════════════════════════════════════════════════════════
//  EVENT SYSTEM
//  Eventos dinâmicos aleatórios que alteram o gameplay.
// ═══════════════════════════════════════════════════════════
const EventSystem = {
  _timer: 0,
  _interval: 60,
  _active: null,
  _duration: 0,
  _banner: null,
  _chaosRing: null,

  _EVENTS: [
    {
      id: 'electric_storm',
      name: '⚡ TEMPESTADE ELÉTRICA',
      duration: 8,
      onStart() {
        CONFIG._stormActive = true;
        ScreenFX.flash('rgba(80,200,255,0.20)', 0.5);
      },
      onEnd() { CONFIG._stormActive = false; },
      onUpdate(dt) {
        if (Math.random() < 0.08) {
          const x = Util.rand(0, CONFIG.TARGET_W);
          const y = Util.rand(0, CONFIG.TARGET_H);
          Particles.burst(x, y, 5, 'rgba(80,200,255,', 0.8);
          // Hit nearest enemy to lightning strike
          Enemies.pool.forEach(e => {
            if (Math.hypot(e.x - x, e.y - y) < 40) {
              e.hp--;
              FloatText.spawn(e.x, e.y - 10, '⚡', '#80ccff', 14, 0.4);
            }
          });
        }
      },
    },
    {
      id: 'massive_invasion',
      name: '👾 INVASÃO MASSIVA',
      duration: 12,
      onStart() { CONFIG._invasionActive = true; },
      onEnd()   { CONFIG._invasionActive = false; },
      onUpdate(dt) {}, // Enemies.update checks this flag
    },
    {
      id: 'gravity_shift',
      name: '🌀 GRAVIDADE ALTERADA',
      duration: 8,
      onStart() { CONFIG._gravityShift = { vx: Util.rand(-30,30), vy: Util.rand(-30,30) }; },
      onEnd()   { CONFIG._gravityShift = null; },
      onUpdate(dt) {},
    },
    {
      id: 'blackout',
      name: '🌑 BLACKOUT',
      duration: 5,
      onStart() { CONFIG._blackout = true; },
      onEnd()   { CONFIG._blackout = false; },
      onUpdate(dt) {},
    },
  ],

  reset() {
    this._timer = 60; this._active = null; this._duration = 0;
    CONFIG._stormActive    = false;
    CONFIG._invasionActive = false;
    CONFIG._gravityShift   = null;
    CONFIG._blackout       = false;
    this._hideBanner();
  },

  update(dt) {
    if (this._active) {
      this._duration -= dt;
      this._active.onUpdate && this._active.onUpdate(dt);
      if (this._duration <= 0) {
        this._active.onEnd && this._active.onEnd();
        this._active = null;
        this._hideBanner();
      }
    } else {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._timer = Util.rand(45, 90);
        this._triggerRandom();
      }
    }
  },

  _triggerRandom() {
    const ev = Util.randItem(this._EVENTS);
    this._active   = ev;
    this._duration = ev.duration;
    ev.onStart && ev.onStart();
    this._showBanner(ev.name);
    FloatText.spawn(CONFIG.TARGET_W / 2, CONFIG.TARGET_H / 2 - 40, ev.name, '#ff6020', 20, 2.0);
  },

  _showBanner(text) {
    if (!this._banner) this._banner = document.getElementById('eventBanner');
    if (this._banner) { this._banner.textContent = text; this._banner.classList.add('visible'); }
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => this._hideBanner(), 3000);
  },

  _hideBanner() {
    if (!this._banner) this._banner = document.getElementById('eventBanner');
    if (this._banner) this._banner.classList.remove('visible');
  },

  // Draws blackout overlay on canvas
  drawOverlay() {
    if (!CONFIG._blackout) return;
    ctx.save();
    // Only reveal a small radius around the player
    const cx = Player.x, cy = Player.y;
    const grad = ctx.createRadialGradient(cx, cy, 40, cx, cy, 180);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.93)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CONFIG.TARGET_W, CONFIG.TARGET_H);
    ctx.restore();
  },
};

// ═══════════════════════════════════════════════════════════
//  SHIP EVOLUTION
//  A nave evolui visualmente conforme upgrades da loja.
//  Nível calculado em tempo real.
// ═══════════════════════════════════════════════════════════
const ShipEvolution = {
  level: 0,   // 0-5

  update() {
    // Level = total de upgrades de armas + player comprados
    const lvl = Math.min(5, Math.floor(
      (PurchaseSystem.getLevel('dmg_up') +
       PurchaseSystem.getLevel('fire_rate') +
       PurchaseSystem.getLevel('spd_up') +
       PurchaseSystem.getLevel('bullet_speed')) / 2
    ));
    this.level = lvl;
  },

  drawExtras(x, y, angle) {
    if (this.level === 0) return;
    const now = performance.now() / 1000;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Level 1+: energy wings
    if (this.level >= 1) {
      const wLen = CONFIG.PLAYER_SIZE * 1.2;
      const wOff = CONFIG.PLAYER_SIZE * 0.6;
      [-1, 1].forEach(side => {
        ctx.beginPath();
        ctx.moveTo(-wOff, 0);
        ctx.lineTo(-wOff - wLen * 0.5, side * wLen * 0.5);
        ctx.lineTo(-wOff - wLen * 0.2, side * wLen * 0.2);
        ctx.strokeStyle = `rgba(0,200,255,${0.4 + this.level * 0.08})`;
        ctx.shadowColor = CONFIG.NEON_COLOR;
        ctx.shadowBlur  = 8 + this.level * 3;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      });
    }

    // Level 3+: neon core
    if (this.level >= 3) {
      const pulse = 3 + Math.sin(now * 5) * 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.fillStyle   = CONFIG.NEON_COLOR;
      ctx.shadowColor = CONFIG.NEON_COLOR;
      ctx.shadowBlur  = 16 + this.level * 4;
      ctx.fill();
    }

    // Level 5: particle exhaust trail
    if (this.level >= 5 && Math.random() < 0.4) {
      ctx.restore(); ctx.save();
      const tx = x + Math.cos(angle + Math.PI) * CONFIG.PLAYER_SIZE * 1.2;
      const ty = y + Math.sin(angle + Math.PI) * CONFIG.PLAYER_SIZE * 1.2;
      Particles.burst(tx, ty, 1, 'rgba(0,200,255,', 0.5);
      ctx.restore(); return;
    }
    ctx.restore();
  },
};

// ═══════════════════════════════════════════════════════════
//  RANDOM REWARDS SYSTEM (Roguelike upgrade selection)
//  Aparece a cada 60s de sobrevivência.
// ═══════════════════════════════════════════════════════════
const RandomRewards = {
  _nextAt: 60,    // primeiro reward em 60s
  _interval: 60,
  _overlay: null,
  _cardsEl: null,
  _paused: false,

  _POOL: [
    { icon:'⚡', name:'VELOCIDADE+',   desc:'+30 velocidade permanente.', apply(){ CONFIG.PLAYER_SPEED = Math.min(400, CONFIG.PLAYER_SPEED + 30); MOVE_CONFIG.BASE_SPEED = CONFIG.PLAYER_SPEED; } },
    { icon:'🔥', name:'CADÊNCIA+',     desc:'Intervalo de tiro -15%.', apply(){ CONFIG.FIRE_RATE = Math.max(0.05, CONFIG.FIRE_RATE * 0.85); } },
    { icon:'💥', name:'DANO+',         desc:'Balas maiores +1.', apply(){ CONFIG.BULLET_RADIUS += 1; } },
    { icon:'❤️', name:'+1 VIDA',        desc:'Recupera e aumenta vida máxima.', apply(){ CONFIG.PLAYER_LIVES = Math.min(8, CONFIG.PLAYER_LIVES + 1); Player.lives = Math.min(Player.lives + 1, CONFIG.PLAYER_LIVES); } },
    { icon:'🔋', name:'ENERGIA+',      desc:'Energia máxima +20.', apply(){ EnergySystem.max += 20; EnergySystem.add(20); } },
    { icon:'🛡️', name:'ESCUDO',        desc:'Ativa escudo circular.', apply(){ ShieldSystem.activate(); } },
    { icon:'🤖', name:'DRONE',         desc:'Adiciona um drone aliado.', apply(){ DroneSystem.addDrone(); } },
    { icon:'⚡', name:'CHAIN LIGHTNING',desc:'Tiros elétricos em cadeia.', apply(){ ElectricSystem.active = true; } },
    { icon:'💰', name:'MOEDAS ×2',     desc:'Inimigos dropam +1 moeda.', apply(){ CONFIG.SCORE_PER_KILL += 5; } },
    { icon:'🌀', name:'BURACO NEGRO',  desc:'Cooldown do buraco negro -5s.', apply(){ BlackHoleSystem.COOLDOWN = Math.max(8, BlackHoleSystem.COOLDOWN - 5); } },
    { icon:'🎯', name:'CRÍTICO+',      desc:'+15% chance crítica.', apply(){ CONFIG._critChance = Math.min(0.6, (CONFIG._critChance || 0) + 0.15); } },
    { icon:'⭐', name:'SCORE ×2',      desc:'Score por kill ×2 por 30s.', apply(){ const old = CONFIG._scoreBoost; CONFIG._scoreBoost = (old || 1) * 2; setTimeout(()=>{ CONFIG._scoreBoost = old; }, 30000); } },
  ],

  reset() {
    this._nextAt = 60;
    this._hide();
  },

  check(elapsed) {
    if (elapsed >= this._nextAt && Game.state === 'playing') {
      this._nextAt += this._interval;
      this._show();
    }
  },

  _show() {
    if (!this._overlay) {
      this._overlay = document.getElementById('rewardOverlay');
      this._cardsEl = document.getElementById('rewardCards');
    }
    // Pause game
    Game.state = 'paused';
    this._paused = true;

    // Pick 3 random non-repeating rewards
    const shuffled = [...this._POOL].sort(() => Math.random() - 0.5).slice(0, 3);
    this._cardsEl.innerHTML = '';
    shuffled.forEach(r => {
      const card = document.createElement('div');
      card.className = 'reward-card';
      card.innerHTML = `<div class="reward-card-icon">${r.icon}</div>
        <div class="reward-card-name">${r.name}</div>
        <div class="reward-card-desc">${r.desc}</div>`;
      card.addEventListener('click', () => { this._pick(r); }, { once: true });
      this._cardsEl.appendChild(card);
    });
    this._overlay.classList.add('visible');
  },

  _pick(reward) {
    reward.apply();
    FloatText.spawn(Player.x, Player.y - 40, reward.name + ' ✓', '#ffdd00', 16, 1.5);
    this._hide();
    if (this._paused) { Game.state = 'playing'; this._paused = false; }
  },

  _hide() {
    if (this._overlay) this._overlay.classList.remove('visible');
  },
};

// ═══════════════════════════════════════════════════════════
//  ARENA SYSTEM
//  Múltiplos fundos de arena com temas diferentes.
// ═══════════════════════════════════════════════════════════
const ArenaSystem = {
  current: 'cyberpunk',
  _timer: 0,
  _CHANGE_INTERVAL: 120,

  _ARENAS: {
    cyberpunk: {
      bg: '#020810', gridColor: 'rgba(0,200,255,0.09)',
      borderColor: 'rgba(0,238,255,0.70)', cornerColor: '#00eeff',
    },
    space: {
      bg: '#04010a', gridColor: 'rgba(170,0,255,0.09)',
      borderColor: 'rgba(170,0,255,0.65)', cornerColor: '#aa00ff',
    },
    lab: {
      bg: '#010a06', gridColor: 'rgba(0,255,136,0.09)',
      borderColor: 'rgba(0,255,136,0.60)', cornerColor: '#00ff88',
    },
    digital: {
      bg: '#080010', gridColor: 'rgba(255,0,200,0.09)',
      borderColor: 'rgba(255,0,200,0.60)', cornerColor: '#ff00cc',
    },
  },

  reset() { this.current = 'cyberpunk'; this._timer = 0; },

  update(dt) {
    this._timer += dt;
    if (this._timer >= this._CHANGE_INTERVAL) {
      this._timer = 0;
      const keys = Object.keys(this._ARENAS);
      const idx  = (keys.indexOf(this.current) + 1) % keys.length;
      this.current = keys[idx];
      FloatText.spawn(CONFIG.TARGET_W / 2, 60, '◈ ' + this.current.toUpperCase(), '#00c8ff', 14, 2.0);
    }
  },

  getTheme() { return this._ARENAS[this.current] || this._ARENAS.cyberpunk; },
};


// ═══════════════════════════════════════════════════════════
//  EXPLOSION SYSTEM (Chain Explosions)
// ═══════════════════════════════════════════════════════════
const ExplosionSystem = {
  active: false,   // toggled by reward/overdrive
  _MAX_CHAIN: 8,   // profundidade máxima da cadeia (evita stack overflow)

  // Entrada pública — usa fila iterativa, sem recursão
  triggerAt(x, y, radius, color) {
    color = color || 'rgba(255,120,0,';
    // Fila: [{x,y,radius}] processada de forma iterativa
    const queue = [{ x, y, radius }];
    let depth = 0;

    while (queue.length > 0 && depth < this._MAX_CHAIN) {
      const { x: cx, y: cy, radius: cr } = queue.shift();
      depth++;

      Particles.burst(cx, cy, Math.min(22, 8 + depth * 2), color, 1.8);
      // Apenas o primeiro nível aplica shake/flash para não acumular
      if (depth === 1) {
        ScreenFX.shake(4, 0.2);
        ScreenFX.flash(color + '0.10)', 0.18);
      }

      // Coleta inimigos atingidos ANTES de modificar o array
      const toKill = [];
      for (let i = Enemies.pool.length - 1; i >= 0; i--) {
        const e = Enemies.pool[i];
        if (!e) continue;
        if (Math.hypot(e.x - cx, e.y - cy) < cr) {
          toKill.push(i);
        }
      }

      // Processa kills de trás para frente (índices estáveis)
      toKill.sort((a, b) => b - a);
      for (const idx of toKill) {
        const e = Enemies.pool[idx];
        if (!e) continue;
        e.hp--;
        if (e.hp <= 0) {
          const sg = (CONFIG.SCORE_PER_KILL + (e.scoreBonus || 0)) * (CONFIG._scoreBoost || 1);
          Game.score += sg;
          DifficultySystem.kills++;
          // Enfileira cadeia com raio menor (sem chamar triggerAt — sem recursão)
          if (this.active && depth < this._MAX_CHAIN) {
            queue.push({ x: e.x, y: e.y, radius: cr * 0.60 });
          }
          Enemies.pool.splice(idx, 1);
        }
      }
    }
  },
};

// ═══════════════════════════════════════════════════════════
//  OVERDRIVE SYSTEM (Neon Overdrive Mode)
//  Eliminar 10 inimigos rapidamente ativa overdrive.
// ═══════════════════════════════════════════════════════════
const OverdriveSystem = {
  active: false,
  _killCounter: 0,
  _timer: 0,
  KILL_THRESHOLD: 10,
  DURATION: 8,
  _overlay: null,

  reset() {
    this.active = false; this._killCounter = 0; this._timer = 0;
    this._apply(false);
  },

  onKill() {
    this._killCounter++;
    if (!this.active && this._killCounter >= this.KILL_THRESHOLD) {
      this._killCounter = 0;
      this._activate();
    }
  },

  _activate() {
    this.active = true;
    this._timer = this.DURATION;
    CONFIG._speedBoost   = (CONFIG._speedBoost || 0) + 80;
    CONFIG.FIRE_RATE     = Math.max(0.05, CONFIG.FIRE_RATE * 0.6);
    CONFIG._glowBonus    = (CONFIG._glowBonus || 0) + 20;
    this._apply(true);
    ScreenFX.flash('rgba(0,200,255,0.30)', 0.6);
    ScreenFX.shake(6, 0.4);
    FloatText.spawn(CONFIG.TARGET_W / 2, CONFIG.TARGET_H / 2 - 50, '⚡ OVERDRIVE!', '#00ffcc', 26, 2.0);
    ExplosionSystem.active = true;
  },

  _deactivate() {
    this.active = false;
    CONFIG._speedBoost   = Math.max(0, (CONFIG._speedBoost || 80) - 80);
    CONFIG.FIRE_RATE     = Math.min(0.18, CONFIG.FIRE_RATE / 0.6);
    CONFIG._glowBonus    = Math.max(0, (CONFIG._glowBonus || 20) - 20);
    this._apply(false);
    ExplosionSystem.active = false;
  },

  update(dt) {
    if (this.active) {
      this._timer -= dt;
      if (this._timer <= 0) this._deactivate();
    }
  },

  _apply(on) {
    if (!this._overlay) this._overlay = document.getElementById('overdriveOverlay');
    if (this._overlay) this._overlay.classList.toggle('active', on);
  },
};


// ═══════════════════════════════════════════════════════════
//  PERFORMANCE SYSTEM — object pool caps & cleanup
// ═══════════════════════════════════════════════════════════
const Performance = {
  MAX_PARTICLES:    220,   // reduzido para evitar spike em chain events
  MAX_BULLETS:      100,
  MAX_ENEMY_BULLETS: 36,
  MAX_FLOAT_TEXTS:   16,   // agressivo — chain events spamam FloatText
  MAX_ENEMIES:       60,   // novo cap: evita spawn absurdo travar o loop

  clampPools() {
    if (Particles.pool.length > this.MAX_PARTICLES)
      Particles.pool.splice(0, Particles.pool.length - this.MAX_PARTICLES);
    if (Bullets.pool.length > this.MAX_BULLETS)
      Bullets.pool.splice(0, Bullets.pool.length - this.MAX_BULLETS);
    if (EnemyBullets.pool.length > this.MAX_ENEMY_BULLETS)
      EnemyBullets.pool.splice(0, EnemyBullets.pool.length - this.MAX_ENEMY_BULLETS);
    if (FloatText.pool.length > this.MAX_FLOAT_TEXTS)
      FloatText.pool.splice(0, FloatText.pool.length - this.MAX_FLOAT_TEXTS);
    // Cap de inimigos para proteger o collision loop
    if (Enemies.pool.length > this.MAX_ENEMIES)
      Enemies.pool.splice(0, Enemies.pool.length - this.MAX_ENEMIES);
  },
};


// ═══════════════════════════════════════════════════════════
//  AUDIO SYSTEM — Web Audio API pura, zero arquivos externos
//  Todos os 25 efeitos sintetizados proceduralmente.
//  API pública: SFX.play('nome')
// ═══════════════════════════════════════════════════════════
const SFX = {
  _ctx: null,       // AudioContext (criado no primeiro interact)
  _master: null,    // GainNode master (volume global)
  _ready: false,
  _volume: 0.45,    // 0.0 – 1.0

  // ── Inicialização lazy (requer gesto do usuário) ─────────
  _boot() {
    if (this._ready) return true;
    try {
      this._ctx    = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._ctx.createGain();
      this._master.gain.value = this._volume;
      this._master.connect(this._ctx.destination);
      this._ready = true;
    } catch (e) { return false; }
    return true;
  },

  // ── Resume após auto-suspend (política de browsers) ──────
  _resume() {
    if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
  },

  // ── Utilitários de síntese ───────────────────────────────

  // Cria oscilador simples com envelope ADSR compacto
  _osc(type, freq, startT, dur, vol, attack, decay, sustain, release) {
    const c = this._ctx;
    const g = c.createGain();
    g.connect(this._master);
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, startT);
    g.gain.setValueAtTime(0, startT);
    g.gain.linearRampToValueAtTime(vol, startT + (attack || 0.005));
    g.gain.linearRampToValueAtTime((sustain || vol) * 0.7, startT + (attack || 0.005) + (decay || 0.05));
    g.gain.linearRampToValueAtTime(0, startT + dur);
    o.connect(g);
    o.start(startT);
    o.stop(startT + dur + 0.01);
    return { osc: o, gain: g };
  },

  // Sweep de frequência (portamento)
  _sweep(type, freqStart, freqEnd, startT, dur, vol) {
    const c = this._ctx;
    const g = c.createGain();
    g.connect(this._master);
    g.gain.setValueAtTime(vol, startT);
    g.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freqStart, startT);
    o.frequency.exponentialRampToValueAtTime(freqEnd, startT + dur);
    o.connect(g);
    o.start(startT);
    o.stop(startT + dur + 0.02);
  },

  // Ruído branco (bufferSource)
  _noise(startT, dur, vol, hiPass, loPass) {
    const c    = this._ctx;
    const size = Math.ceil(dur * c.sampleRate) + 512;
    const buf  = c.createBuffer(1, size, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, startT);
    g.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    let chain = src;
    if (hiPass) {
      const hp = c.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = hiPass;
      src.connect(hp); hp.connect(g);
    } else {
      src.connect(g);
    }
    if (loPass) {
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = loPass;
      // reconnect through lp
      const g2 = c.createGain();
      g2.gain.value = 1;
      g.connect(g2); g2.connect(this._master);
    } else {
      g.connect(this._master);
    }
    src.start(startT);
    src.stop(startT + dur + 0.02);
  },

  // Distorção simples via WaveShaper
  _distort(amount) {
    const c    = this._ctx;
    const ws   = c.createWaveShaper();
    const n    = 256;
    const curve = new Float32Array(n);
    const k    = amount;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
    ws.curve = curve;
    ws.oversample = '2x';
    return ws;
  },

  // ── CATÁLOGO DE SONS ─────────────────────────────────────
  // Cada entrada é uma função que usa this._ctx.currentTime como base.

  _sounds: {

    // 1. TIRO — disparo laser neon curto agudo
    'shoot'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('sawtooth', 1800, 600, t, 0.09, 0.28);
      SFX._osc('square', 2200, t, 0.06, 0.12, 0.002, 0.02, 0.04, 0.04);
    },

    // 2. TIRO DUPLO/TRIPLO — mais denso
    'shoot_multi'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('sawtooth', 2000, 700,  t,        0.10, 0.22);
      SFX._sweep('sawtooth', 1600, 500,  t + 0.02, 0.10, 0.10);
      SFX._osc('square', 2400, t, 0.08, 0.15, 0.002, 0.02, 0.05, 0.05);
    },

    // 3. IMPACTO EM INIMIGO — hit seco eletrônico
    'hit_enemy'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('square', 400, 180, t, 0.08, 0.18);
      SFX._noise(t, 0.06, 0.12, 800, 5000);
    },

    // 4. INIMIGO NORMAL ELIMINADO — explosão eletrônica pequena
    'kill_enemy'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('sawtooth', 320, 60,  t,        0.28, 0.18);
      SFX._sweep('square',   600, 100, t + 0.02, 0.24, 0.14);
      SFX._noise(t, 0.12, 0.20, 200, 4000);
      SFX._osc('sine', 880, t + 0.05, 0.12, 0.14, 0.01, 0.05, 0.08, 0.07);
    },

    // 5. INIMIGO TANK ELIMINADO — explosão grave pesada
    'kill_tank'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('sawtooth', 180, 30,  t,        0.45, 0.35);
      SFX._sweep('square',   220, 40,  t + 0.04, 0.38, 0.30);
      SFX._noise(t, 0.28, 0.40, 60, 1800);
      SFX._osc('sine', 55, t, 0.28, 0.35, 0.01, 0.08, 0.20, 0.15);
    },

    // 6. INIMIGO ELÉTRICO ELIMINADO — descarga + estalo
    'kill_electric'() {
      const t = SFX._ctx.currentTime;
      SFX._noise(t,        0.05, 0.35, 3000, 12000);
      SFX._noise(t + 0.05, 0.08, 0.28, 1500, 8000);
      SFX._sweep('sawtooth', 1200, 200, t, 0.18, 0.22);
      SFX._osc('square', 440, t + 0.06, 0.10, 0.20, 0.002, 0.04, 0.10, 0.06);
    },

    // 7. BOSS APARECE — BOSS AUDIO: inicialização robótica sci-fi
    'boss_appear'() {
      const t = SFX._ctx.currentTime;
      // Boot sequence: beeps mecânicos ascendentes
      SFX._osc('square', 440,  t,        0.30, 0.08, 0.005, 0.02, 0.06, 0.03);
      SFX._osc('square', 660,  t + 0.10, 0.30, 0.08, 0.005, 0.02, 0.06, 0.03);
      SFX._osc('square', 880,  t + 0.20, 0.32, 0.08, 0.005, 0.02, 0.06, 0.03);
      SFX._osc('square', 1100, t + 0.30, 0.34, 0.08, 0.005, 0.02, 0.06, 0.03);
      // Power-up mecânico (sweep grave → agudo)
      SFX._sweep('sawtooth', 80,  600,  t + 0.40, 0.50, 0.45);
      SFX._sweep('sawtooth', 120, 900,  t + 0.44, 0.40, 0.42);
      // Pulso elétrico neon
      SFX._noise(t + 0.38, 0.18, 0.28, 2000, 8000);
      // Acorde neon ciano final
      SFX._osc('square',  220, t + 0.90, 0.38, 0.55, 0.01, 0.08, 0.35, 0.18);
      SFX._osc('square',  330, t + 0.90, 0.30, 0.55, 0.01, 0.08, 0.32, 0.18);
      SFX._osc('triangle',440, t + 0.90, 0.22, 0.52, 0.01, 0.08, 0.28, 0.18);
      // Rumble mecânico baixo
      SFX._noise(t + 0.85, 0.50, 0.25, 60, 400);
    },

    // 8. BOSS TOMANDO DANO — BOSS AUDIO: impacto metálico robótico
    'boss_hit'() {
      const t = SFX._ctx.currentTime;
      // Clang metálico
      SFX._sweep('square',  380, 120, t,        0.18, 0.22);
      SFX._sweep('square',  320, 90,  t + 0.02, 0.14, 0.20);
      // Estalo elétrico
      SFX._noise(t, 0.06, 0.20, 1200, 6000);
      // Ressonância mecânica
      SFX._osc('triangle', 180, t, 0.12, 0.20, 0.003, 0.05, 0.14, 0.10);
    },

    // 9. BOSS ELIMINADO — BOSS AUDIO: colapso robótico + descarga neon
    'kill_boss'() {
      const t = SFX._ctx.currentTime;
      // Falha mecânica: sweep descendente rápido
      SFX._sweep('sawtooth', 600, 40,  t,        0.50, 0.45);
      SFX._sweep('square',   500, 30,  t + 0.05, 0.45, 0.42);
      // Descarga elétrica explosiva
      SFX._noise(t,        0.30, 0.50, 1500, 8000);
      SFX._noise(t + 0.12, 0.25, 0.42, 800,  5000);
      // Explosão mecânica grave
      SFX._noise(t + 0.08, 0.45, 0.48, 60, 1500);
      // Beeps de falha em cascata
      SFX._osc('square', 880, t + 0.05, 0.22, 0.06, 0.002, 0.02, 0.04, 0.02);
      SFX._osc('square', 660, t + 0.12, 0.22, 0.06, 0.002, 0.02, 0.04, 0.02);
      SFX._osc('square', 440, t + 0.19, 0.22, 0.06, 0.002, 0.02, 0.04, 0.02);
      SFX._osc('square', 220, t + 0.26, 0.24, 0.08, 0.002, 0.02, 0.05, 0.03);
      // Acorde neon de vitória
      SFX._osc('sine', 440, t + 0.55, 0.40, 0.55, 0.02, 0.08, 0.38, 0.22);
      SFX._osc('sine', 554, t + 0.57, 0.34, 0.55, 0.02, 0.08, 0.35, 0.22);
      SFX._osc('sine', 659, t + 0.59, 0.30, 0.58, 0.02, 0.08, 0.38, 0.24);
      // Eco neon final
      SFX._sweep('triangle', 1200, 300, t + 0.80, 0.40, 0.35);
    },

    // 10. PERDER VIDA — impacto + alerta grave
    'lose_life'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('sawtooth', 320, 80, t,        0.45, 0.30);
      SFX._sweep('square',   200, 60, t + 0.05, 0.40, 0.28);
      SFX._noise(t, 0.18, 0.30, 150, 3000);
      // Alarme pulsante
      SFX._osc('square', 220, t + 0.20, 0.12, 0.30, 0.01, 0.04, 0.20, 0.10);
      SFX._osc('square', 180, t + 0.32, 0.12, 0.28, 0.01, 0.04, 0.18, 0.10);
    },

    // 11. INVENCIBILIDADE ATIVADA — shield energético
    'shield_on'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('sine', 400, 1200, t, 0.22, 0.30);
      SFX._sweep('sine', 600, 1600, t + 0.04, 0.22, 0.20);
      SFX._osc('sine', 1800, t + 0.20, 0.22, 0.18, 0.01, 0.06, 0.14, 0.10);
    },

    // 12. DASH — whoosh eletrônico rápido
    'dash'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('sine',     800, 2400, t,        0.12, 0.18);
      SFX._sweep('sawtooth', 600, 2000, t + 0.01, 0.20, 0.18);
      SFX._noise(t, 0.08, 0.18, 1500, 8000);
    },

    // 13. MORRER / GAME OVER — descida dramática
    'game_over'() {
      const t = SFX._ctx.currentTime;
      // Descida longa e dramática
      SFX._sweep('sawtooth', 440, 55,  t,        0.50, 1.20);
      SFX._sweep('square',   330, 40,  t + 0.10, 0.45, 1.10);
      SFX._sweep('sine',     220, 28,  t + 0.20, 0.40, 1.00);
      // Ruído de colapso
      SFX._noise(t, 0.60, 0.38, 80, 3000);
      // Nota final grave
      SFX._osc('sine', 55, t + 0.90, 0.48, 0.80, 0.05, 0.15, 0.35, 0.40);
    },

    // 14. POWER-UP APARECE — brilho/ping suave
    'powerup_appear'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('sine', 900, 1800, t, 0.18, 0.18);
      SFX._osc('triangle', 2200, t + 0.12, 0.18, 0.16, 0.01, 0.05, 0.12, 0.09);
    },

    // 15. POWER-UP COLETADO — arcade positivo
    'powerup_collect'() {
      const t = SFX._ctx.currentTime;
      SFX._osc('sine', 523, t,        0.35, 0.12, 0.01, 0.04, 0.09, 0.06);
      SFX._osc('sine', 659, t + 0.08, 0.35, 0.12, 0.01, 0.04, 0.09, 0.06);
      SFX._osc('sine', 784, t + 0.16, 0.38, 0.18, 0.01, 0.05, 0.14, 0.08);
      SFX._osc('sine', 1047,t + 0.24, 0.38, 0.22, 0.01, 0.06, 0.18, 0.10);
    },

    // 16. COMBO INICIADO — click eletrônico ascendente
    'combo_start'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('square', 400, 800, t, 0.10, 0.18);
      SFX._osc('sine', 1200, t + 0.10, 0.10, 0.14, 0.005, 0.04, 0.10, 0.06);
    },

    // 17. COMBO QUEBRADO — descendente seco
    'combo_break'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('square', 600, 150, t, 0.22, 0.20);
      SFX._noise(t, 0.08, 0.14, 400, 3000);
    },

    // 18. MOEDA COLETADA — pling metálico leve
    'coin_collect'() {
      const t = SFX._ctx.currentTime;
      SFX._osc('sine', 1320, t,        0.28, 0.12, 0.005, 0.03, 0.09, 0.07);
      SFX._osc('sine', 1760, t + 0.06, 0.22, 0.10, 0.005, 0.03, 0.07, 0.06);
    },

    // 19. CONVERTER SCORE — transação digital futurista
    'score_convert'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('sine', 500, 1000, t,        0.25, 0.18);
      SFX._sweep('sine', 700, 1400, t + 0.08, 0.22, 0.18);
      SFX._osc('triangle', 1800, t + 0.18, 0.22, 0.20, 0.01, 0.05, 0.15, 0.08);
    },

    // 20. COMPRA NA LOJA — confirmação eletrônica positiva
    'shop_buy'() {
      const t = SFX._ctx.currentTime;
      SFX._osc('sine', 440,  t,        0.32, 0.10, 0.005, 0.03, 0.07, 0.05);
      SFX._osc('sine', 660,  t + 0.07, 0.32, 0.10, 0.005, 0.03, 0.07, 0.05);
      SFX._osc('sine', 880,  t + 0.14, 0.35, 0.14, 0.005, 0.04, 0.10, 0.07);
      SFX._sweep('triangle', 1200, 1800, t + 0.20, 0.18, 0.28);
    },

    // 21. SEM MOEDAS SUFICIENTES — erro suave negativo
    'shop_error'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('square', 300, 150, t,        0.28, 0.16);
      SFX._sweep('square', 280, 130, t + 0.12, 0.24, 0.16);
    },

    // 22. ABRIR MENU/LOJA — swoosh de painel futurista
    'menu_open'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('sine', 200, 800,  t,        0.25, 0.22);
      SFX._sweep('sine', 400, 1200, t + 0.04, 0.20, 0.20);
      SFX._osc('triangle', 1600, t + 0.20, 0.20, 0.16, 0.01, 0.05, 0.12, 0.08);
    },

    // 23. FECHAR MENU/LOJA — reverso do swoosh
    'menu_close'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('sine', 800,  200, t,        0.22, 0.20);
      SFX._sweep('sine', 1200, 400, t + 0.04, 0.18, 0.18);
    },

    // 24. SUBIR NÍVEL DE DIFICULDADE — acorde tenso ascendente
    'level_up'() {
      const t = SFX._ctx.currentTime;
      SFX._sweep('sawtooth', 300, 600,  t,        0.30, 0.28);
      SFX._sweep('sawtooth', 400, 800,  t + 0.05, 0.26, 0.26);
      SFX._osc('square',  900, t + 0.25, 0.30, 0.30, 0.01, 0.07, 0.22, 0.12);
      SFX._osc('sawtooth',1100,t + 0.27, 0.24, 0.28, 0.01, 0.07, 0.20, 0.12);
    },

    // 25. INICIAR JOGO (PLAY) — arranque energético
    'game_start'() {
      const t = SFX._ctx.currentTime;
      SFX._noise(t, 0.08, 0.22, 800, 6000);
      SFX._sweep('sawtooth', 100,  400,  t,        0.35, 0.28);
      SFX._sweep('sawtooth', 200,  800,  t + 0.06, 0.30, 0.26);
      SFX._sweep('sawtooth', 400,  1600, t + 0.12, 0.28, 0.24);
      SFX._osc('sine', 880,  t + 0.28, 0.38, 0.32, 0.01, 0.08, 0.25, 0.14);
      SFX._osc('sine', 1100, t + 0.30, 0.32, 0.30, 0.01, 0.08, 0.22, 0.12);
    },
  },

  // ── API pública ──────────────────────────────────────────
  // Chame: SFX.play('nome')  — seguro mesmo antes do boot
  play(name) {
    if (!this._boot()) return;
    this._resume();
    const fn = this._sounds[name];
    if (fn) fn.call(this);
  },

  // Volume global: SFX.setVolume(0.6)
  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._master) this._master.gain.value = this._volume;
  },
};



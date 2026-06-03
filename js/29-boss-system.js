// ═══════════════════════════════════════════════════════════
//  BOSS SYSTEM
// ═══════════════════════════════════════════════════════════
const BossSystem = {
  boss: null,               // null = sem boss ativo
  _spawnTimer: 60,          // primeiro boss em 60s
  _interval: 90,            // intervalo entre bosses
  _barEl: null,
  _fillEl: null,
  _labelEl: null,
  _introTimer: 0,
  _INTRO_DUR: 2.0,          // duração da entrada cinematográfica

  // ── BOSS DATA ─────────────────────────────────────────────
  // Cada boss define: emoji, nome exibido no HUD, HP base,
  // velocidade, tamanho (px), recompensa em moedas e score.
  // Robot Lord é o primeiro boss — tema robótico sci-fi neon.
  _BOSSES: [
    { emoji: '🤖', name: 'ROBOT LORD',  hp: 40, speed: 55, size: 46, coins: 20, score: 200,
      glowColor: 'rgba(0,200,255,', hitColor: 'rgba(0,200,255,0.18)', theme: 'robot' },
    { emoji: '🤖', name: 'MECH-X9000',  hp: 60, speed: 48, size: 50, coins: 30, score: 300,
      glowColor: 'rgba(80,180,255,', hitColor: 'rgba(80,180,255,0.18)', theme: 'robot' },
    { emoji: '💀', name: 'DEATH CORE',  hp: 80, speed: 42, size: 50, coins: 40, score: 400,
      glowColor: 'rgba(180,0,255,',  hitColor: 'rgba(180,0,255,0.18)', theme: 'void'  },
    { emoji: '🐉', name: 'NEON DRAGON', hp: 100,speed: 38, size: 56, coins: 60, score: 500,
      glowColor: 'rgba(0,255,140,',  hitColor: 'rgba(0,255,140,0.18)', theme: 'neon'  },
    { emoji: '🌑', name: 'VOID TITAN',  hp: 130,speed: 35, size: 60, coins: 80, score: 700,
      glowColor: 'rgba(100,0,255,',  hitColor: 'rgba(100,0,255,0.18)', theme: 'void'  },
  ],
  _bossIdx: 0,

  reset() {
    this.boss = null;
    this._spawnTimer = 60;
    this._bossIdx = 0;
    this._introTimer = 0;
    // Inicializa TODOS os elementos DOM de uma vez (evita _fillEl null no _updateBar)
    if (!this._barEl)   this._barEl   = document.getElementById('bossBar');
    if (!this._fillEl)  this._fillEl  = document.getElementById('bossBarFill');
    if (!this._labelEl) this._labelEl = document.getElementById('bossBarLabel');
    if (this._barEl) this._barEl.classList.remove('visible');
  },

  update(dt) {
    if (!this.boss) {
      this._spawnTimer -= dt;
      if (this._spawnTimer <= 0) this._spawnBoss();
      return;
    }
    const boss = this.boss;

    // Intro animation — boss slides in from top
    if (this._introTimer > 0) {
      this._introTimer -= dt;
      const t = 1 - (this._introTimer / this._INTRO_DUR);
      boss.x = CONFIG.TARGET_W / 2;
      boss.y = Util.lerp(-boss.size * 2, CONFIG.TARGET_H * 0.25, Math.min(1, t * 1.4));
      return;
    }

    // Phase-based attack patterns
    const hpRatio = boss.hp / boss.maxHp;
    const sp = boss.speed * DifficultySystem.enemySpeedMult();

    // Movement: orbit + chase
    boss._orbitAngle = (boss._orbitAngle || 0) + dt * (hpRatio < 0.5 ? 0.9 : 0.5);
    const orbitR = hpRatio < 0.5 ? 100 : 160;
    const targetX = Player.x + Math.cos(boss._orbitAngle) * orbitR;
    const targetY = Player.y + Math.sin(boss._orbitAngle) * orbitR;
    const dx = targetX - boss.x, dy = targetY - boss.y;
    const d = Math.hypot(dx, dy) || 1;
    boss.x += (dx / d) * sp * dt;
    boss.y += (dy / d) * sp * dt;
    boss.x = Util.clamp(boss.x, boss.size, CONFIG.TARGET_W - boss.size);
    boss.y = Util.clamp(boss.y, boss.size, CONFIG.TARGET_H - boss.size);

    // ── BOSS ATTACKS: laser neon tecnológico ─────────────────
    boss._shootTimer = (boss._shootTimer || 0) + dt;
    const shootInterval = hpRatio < 0.5 ? 0.75 : 1.35;
    if (boss._shootTimer >= shootInterval) {
      boss._shootTimer = 0;
      const angle  = Math.atan2(Player.y - boss.y, Player.x - boss.x);
      const gc     = boss.glowColor || 'rgba(0,200,255,';
      const isRobot = boss.theme === 'robot';
      // Laser principal
      EnemyBullets.spawn(boss.x, boss.y, angle, 165, isRobot);
      if (hpRatio < 0.5) {
        // Enrage: leque de 3 lasers (pulso elétrico)
        EnemyBullets.spawn(boss.x, boss.y, angle - 0.28, 165, isRobot);
        EnemyBullets.spawn(boss.x, boss.y, angle + 0.28, 165, isRobot);
      }
      if (hpRatio < 0.25) {
        // Fase crítica: 5 lasers em cruz + diagonal
        EnemyBullets.spawn(boss.x, boss.y, angle - 0.55, 150, isRobot);
        EnemyBullets.spawn(boss.x, boss.y, angle + 0.55, 150, isRobot);
      }
      // Flash temático ao atirar
      ScreenFX.flash(
        isRobot ? 'rgba(0,200,255,0.07)' : 'rgba(255,40,100,0.08)', 0.14
      );
    }

    // ── BOSS VISUALS: partículas tecnológicas temáticas ──────
    boss._pulseTimer = (boss._pulseTimer || 0) + dt;
    if (boss._pulseTimer > 0.35) {
      boss._pulseTimer = 0;
      const gc = boss.glowColor || 'rgba(0,200,255,';
      // Partícula neon temática (Robot Lord = ciano)
      Particles.burst(boss.x, boss.y, 4, gc, 0.55);
      // Na fase enrage, adiciona faíscas extras
      if (boss.hp / boss.maxHp < 0.5) {
        const angle = Math.random() * Math.PI * 2;
        const rx = boss.x + Math.cos(angle) * boss.size * 0.7;
        const ry = boss.y + Math.sin(angle) * boss.size * 0.7;
        Particles.burst(rx, ry, 3, 'rgba(180,240,255,', 0.8);
      }
    }

    // Collision vs player
    if (Player.invincible <= 0 && Util.dist(boss, Player) < boss.size * 0.7 + CONFIG.PLAYER_SIZE) {
      Player.hit();
    }

    this._updateBar();
  },

  takeDamage(amount) {
    if (!this.boss || this._introTimer > 0) return false;
    this.boss.hp -= amount;
    // ── BOSS VISUALS: flash usa cor temática do boss ─────────
    ScreenFX.flash(this.boss.hitColor || 'rgba(0,200,255,0.14)', 0.12);
    SFX.play('boss_hit');
    if (this.boss.hp <= 0) {
      this._killBoss();   // sets this.boss = null
      return true;
    }
    if (this.boss) this._updateBar();  // guard: boss may be null
    return true;
  },

  _spawnBoss() {
    const def = this._BOSSES[this._bossIdx % this._BOSSES.length];
    this._bossIdx++;
    const hpMult = 1 + DifficultySystem.level * 0.1;
    this.boss = {
      ...def,
      hp: Math.round(def.hp * hpMult),
      maxHp: Math.round(def.hp * hpMult),
      x: CONFIG.TARGET_W / 2,
      y: -def.size * 2,
      _orbitAngle: 0,
      _shootTimer: 1.5,
      _pulseTimer: 0,
    };
    this._introTimer = this._INTRO_DUR;
    this._spawnTimer = this._interval;

    // ── HUD UPDATE: entrada cinematográfica temática ─────────
    // Robot Lord usa ciano neon; outros bosses usam cor própria
    const flashClr = def.hitColor
      ? def.hitColor.replace(/[\d.]+\)$/, '0.35)') : 'rgba(0,200,255,0.35)';
    const textClr  = def.theme === 'robot' ? '#00c8ff' : '#ff4488';
    ScreenFX.flash(flashClr, 0.6);
    FloatText.spawn(CONFIG.TARGET_W / 2, CONFIG.TARGET_H / 2 - 80,
      '⚠ ' + def.name, textClr, 32, 2.5);
    SFX.play('boss_appear');

    this._updateBar();
    if (this._barEl) this._barEl.classList.add('visible');
  },

  _killBoss() {
    const b = this.boss;
    SFX.play('kill_boss');
    // ── BOSS VISUALS: explosão usa partículas temáticas ───────
    const gc = b.glowColor || 'rgba(0,200,255,';
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const ox = Util.rand(-50, 50), oy = Util.rand(-50, 50);
        // Partícula principal (cor do tema)
        Particles.burst(b.x + ox, b.y + oy, 28, gc, 2.4);
        // Partícula branca brilhante (spark)
        Particles.burst(b.x + ox, b.y + oy, 14, 'rgba(180,240,255,', 2.0);
      }, i * 90);
    }
    // Flash temático
    const fClr = b.hitColor
      ? b.hitColor.replace(/[\d.]+\)$/, '0.50)') : 'rgba(0,200,255,0.50)';
    ScreenFX.flash(fClr, 0.8);
    FloatText.spawn(b.x, b.y - 40, '×' + b.score, '#ffdd00', 30, 2);

    Game.score += b.score;
    CoinSystem.add(b.coins);
    CoinUI.syncCoins();
    DifficultySystem.kills += 10;

    this.boss = null;
    this._updateBar();
    if (this._barEl) this._barEl.classList.remove('visible');
  },

  _updateBar() {
    if (!this._barEl) {
      this._barEl   = document.getElementById('bossBar');
      this._fillEl  = document.getElementById('bossBarFill');
      this._labelEl = document.getElementById('bossBarLabel');
    }
    if (!this.boss) return;
    const pct = Math.max(0, this.boss.hp / this.boss.maxHp * 100);
    if (this._fillEl)  this._fillEl.style.width = pct + '%';
    if (this._labelEl) this._labelEl.textContent = '◈ ' + this.boss.name + '  ' + this.boss.hp + ' / ' + this.boss.maxHp;
  },

  // ── BOSS VISUALS ─────────────────────────────────────────
  draw() {
    if (!this.boss) return;
    const b   = this.boss;
    const now = performance.now() / 1000;

    // Cor base do tema (Robot Lord = ciano neon)
    const gc  = b.glowColor || 'rgba(0,200,255,';

    ctx.save();

    // ── Halo radial temático ────────────────────────────────
    const glowR = b.size * 2.0;
    const grad  = ctx.createRadialGradient(b.x, b.y, b.size * 0.3, b.x, b.y, glowR);
    grad.addColorStop(0, gc + '0.30)');
    grad.addColorStop(0.5, gc + '0.10)');
    grad.addColorStop(1,   gc + '0)');
    ctx.beginPath();
    ctx.arc(b.x, b.y, glowR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // ── Anel elétrico pulsante (tema robot) ─────────────────
    if (b.theme === 'robot') {
      const pulse  = 1 + Math.sin(now * 5) * 0.12;
      const ringR  = b.size * 1.3 * pulse;
      ctx.beginPath();
      ctx.arc(b.x, b.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = gc + (0.25 + Math.sin(now * 8) * 0.12) + ')';
      ctx.lineWidth   = 2;
      ctx.shadowColor = gc + '0.9)';
      ctx.shadowBlur  = 14;
      ctx.stroke();

      // Segundo anel mais fino, contrarrotante visual
      const ringR2 = b.size * 1.6 * (1 + Math.sin(now * 3 + 1) * 0.07);
      ctx.beginPath();
      ctx.arc(b.x, b.y, ringR2, 0, Math.PI * 2);
      ctx.strokeStyle = gc + '0.12)';
      ctx.lineWidth   = 1;
      ctx.shadowBlur  = 6;
      ctx.stroke();
    }

    // ── Emoji ───────────────────────────────────────────────
    const glowMult = 1 + Math.sin(now * 4) * 0.15;
    ctx.shadowColor = gc + '1)';
    ctx.shadowBlur  = (30 + (CONFIG._glowBonus || 0)) * glowMult;
    ctx.font        = `${b.size * 1.85}px serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    // Leve pulsação de escala via translate+scale
    const scalePulse = 1 + Math.sin(now * 2.5) * 0.04;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(scalePulse, scalePulse);
    ctx.fillText(b.emoji, 0, 0);
    ctx.restore();

    // ── Fase de enrage: faíscas elétricas (< 50% HP) ────────
    if (b.hp / b.maxHp < 0.5 && b.theme === 'robot') {
      const sparkCount = 3;
      for (let i = 0; i < sparkCount; i++) {
        const a  = now * 6 + i * (Math.PI * 2 / sparkCount);
        const sr = b.size * 0.9;
        const sx = b.x + Math.cos(a) * sr;
        const sy = b.y + Math.sin(a) * sr;
        ctx.beginPath();
        ctx.arc(sx, sy, 3 + Math.sin(now * 10 + i) * 1.5, 0, Math.PI * 2);
        ctx.fillStyle   = gc + '0.9)';
        ctx.shadowColor = gc + '1)';
        ctx.shadowBlur  = 12;
        ctx.fill();
      }
    }

    // ── Barra de HP flutuante abaixo do boss ────────────────
    const bw = b.size * 2.4;
    const bh = 5;
    const bx = b.x - bw / 2;
    const by = b.y + b.size + 8;
    ctx.shadowBlur = 0;
    ctx.fillStyle  = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx, by, bw, bh);
    const hpRatio  = b.hp / b.maxHp;
    const barColor = hpRatio > 0.5 ? gc + '0.9)' : 'rgba(255,80,80,0.9)';
    ctx.fillStyle   = barColor;
    ctx.shadowColor = barColor;
    ctx.shadowBlur  = 8;
    ctx.fillRect(bx, by, bw * hpRatio, bh);

    ctx.restore();
  },
};


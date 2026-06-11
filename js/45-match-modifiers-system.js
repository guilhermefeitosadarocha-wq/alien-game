// ═══════════════════════════════════════════════════════════
//  MATCH MODIFIERS SYSTEM
// ═══════════════════════════════════════════════════════════
const MatchModifiers = {
  _overlay: null,
  _selected: new Set(),

  _MODS: [
    { id: 'fast_enemies',   name: '⚡ Inimigos rápidos',   apply(){ CONFIG._modFastEnemies   = true; } },
    { id: 'low_hp',         name: '💔 Pouca vida (1 vida)', apply(){ CONFIG.PLAYER_LIVES       = 1; } },
    { id: 'double_coins',   name: '💰 Moedas dobradas',    apply(){ CONFIG.SCORE_PER_KILL    += 5; } },
    { id: 'aggressive',     name: '👾 Spawn agressivo',    apply(){ CONFIG.ENEMY_SPAWN_BASE   = 0.8; } },
    { id: 'infinite_energy',name: '🔋 Energia infinita',   apply(){ EnergySystem.rechargeRate = 999; } },
    { id: 'chaos_start',    name: '🌀 Iniciar no CAOS',    apply(){ ChaosMode.activate(); } },
  ],

  init() {
    this._overlay = document.getElementById('modifierOverlay');
    const list    = document.getElementById('modifierList');
    if (!list) return;
    list.innerHTML = '';
    this._MODS.forEach(m => {
      const row   = document.createElement('div');
      row.className = 'mod-row';
      row.innerHTML = `<span class="mod-name">${m.name}</span>
        <div class="mod-check" data-id="${m.id}"></div>`;
      row.addEventListener('click', () => {
        if (this._selected.has(m.id)) this._selected.delete(m.id);
        else this._selected.add(m.id);
        const chk = row.querySelector('.mod-check');
        chk.classList.toggle('on', this._selected.has(m.id));
        chk.textContent = this._selected.has(m.id) ? '✓' : '';
      });
      list.appendChild(row);
    });
    document.getElementById('modifierStartBtn').addEventListener('click', () => {
      this.applySelected();
      this._overlay.classList.remove('visible');

      // Verifica se já tem perfil configurado (nome salvo pelo ProfileSystem)
      let nomeExistente = null;
      try {
        nomeExistente = localStorage.getItem('neonSiege_playerName');
      } catch (e) {}

      if (nomeExistente && nomeExistente.trim().length > 0) {
        // Já tem perfil — sincroniza o nome e inicia direto
        if (typeof SupabaseSystem !== 'undefined') {
          SupabaseSystem._playerName = nomeExistente.trim();
        }
        SFX.play('game_start');
        Game.start();
      } else {
        // Nunca configurou perfil — mostra tela de perfil completo
        if (typeof ProfileSystem !== 'undefined' && ProfileSystem._overlay) {
          ProfileSystem.show();
          // Sobrescreve o botão salvar para iniciar o jogo após salvar
          const _psb = document.getElementById('profileSaveBtn');
          if (_psb) {
            const _psbClone = _psb.cloneNode(true);
            _psb.parentNode.replaceChild(_psbClone, _psb);
            _psbClone.addEventListener('click', () => {
              const nome = document.getElementById('profileNameInput').value.trim();
              if (nome.length === 0) return;
              try {
                localStorage.setItem('neonSiege_playerName', nome);
                localStorage.setItem('neonSiege_playerAvatar', ProfileSystem._currentAvatar);
              } catch (e) {}
              if (typeof SupabaseSystem !== 'undefined') SupabaseSystem._playerName = nome;
              if (typeof AuthSystem !== 'undefined') AuthSystem.syncProfile();
              ProfileSystem.hide();
              SFX.play('game_start');
              Game.start();
            });
          }
        } else {
          // Fallback: usa prompt nativo se ProfileSystem não estiver disponível
          const nome = prompt('Digite seu nome para o ranking:', 'Jogador');
          if (nome && nome.trim().length > 0) {
            try { localStorage.setItem('neonSiege_playerName', nome.trim()); } catch (e) {}
            if (typeof SupabaseSystem !== 'undefined') SupabaseSystem._playerName = nome.trim();
            if (typeof AuthSystem !== 'undefined') AuthSystem.syncProfile();
          }
          SFX.play('game_start');
          Game.start();
        }
      }
    });
  },

  show() { if (this._overlay) this._overlay.classList.add('visible'); },
  hide() { if (this._overlay) this._overlay.classList.remove('visible'); },

  applySelected() {
    this._MODS.forEach(m => {
      if (this._selected.has(m.id)) m.apply();
    });
  },

  reset() { this._selected.clear(); CONFIG._modFastEnemies = false; },
};

// ═══════════════════════════════════════════════════════════
//  CHAOS MODE
//  Modo extremo ativado após 3 min ou manualmente.
// ═══════════════════════════════════════════════════════════
const ChaosMode = {
  active: false,
  _ring: null,
  _laserTimer: 0,

  reset() {
    this.active = false;
    this._laserTimer = 0;
    this._apply(false);
  },

  activate() {
    if (this.active) return;
    this.active = true;
    CONFIG.ENEMY_SPAWN_BASE = Math.min(CONFIG.ENEMY_SPAWN_BASE, 0.4);
    ScreenFX.flash('rgba(255,0,0,0.35)', 0.8);
    ScreenFX.shake(12, 0.6);
    FloatText.spawn(CONFIG.TARGET_W / 2, CONFIG.TARGET_H / 2, '☠ CHAOS MODE ☠', '#ff2020', 30, 3.0);
    this._apply(true);
  },

  update(dt) {
    if (!this.active) return;
    // Extra laser beams from edges
    this._laserTimer += dt;
    if (this._laserTimer >= 1.8) {
      this._laserTimer = 0;
      const side  = Math.floor(Math.random() * 4);
      const W = CONFIG.TARGET_W, H = CONFIG.TARGET_H;
      let sx, sy, angle;
      if      (side === 0) { sx = Util.rand(0,W); sy = 0;  angle = Math.PI / 2; }
      else if (side === 1) { sx = W; sy = Util.rand(0,H);  angle = Math.PI; }
      else if (side === 2) { sx = Util.rand(0,W); sy = H;  angle = -Math.PI / 2; }
      else                 { sx = 0; sy = Util.rand(0,H);  angle = 0; }
      // Spawn fast bullet from edge toward player area
      EnemyBullets.pool.push({
        x: sx, y: sy,
        vx: Math.cos(angle) * 200, vy: Math.sin(angle) * 200,
        life: 3.5, maxLife: 3.5, r: 6, isRobotLaser: true,
      });
    }
    // Multiple bosses: lower boss spawn timer
    if (!BossSystem.boss && BossSystem._spawnTimer > 20) {
      BossSystem._spawnTimer = Math.min(BossSystem._spawnTimer, 20);
    }
  },

  _apply(on) {
    if (!this._ring) this._ring = document.getElementById('chaosRing');
    if (this._ring) this._ring.classList.toggle('active', on);
  },

  check(elapsed) {
    if (!this.active && elapsed >= 180) this.activate();
  },
};

// ═══════════════════════════════════════════════════════════
//  BOSS PHASE SYSTEM
//  Adiciona fases ao boss (enrage, shield, teleport).
//  Integra com BossSystem._updateBar e update.
// ═══════════════════════════════════════════════════════════
const BossPhaseSystem = {
  _phase: 0,

  reset() { this._phase = 0; },

  // Chamado no BossSystem.update quando boss existe
  update(boss, dt) {
    if (!boss) return;
    const ratio = boss.hp / boss.maxHp;
    const newPhase = ratio > 0.66 ? 0 : ratio > 0.33 ? 1 : 2;
    if (newPhase !== this._phase) {
      this._phase = newPhase;
      this._onPhaseChange(boss, newPhase);
    }
  },

  _onPhaseChange(boss, phase) {
    if (phase === 1) {
      FloatText.spawn(boss.x, boss.y - boss.size - 20, 'FASE 2: ALERTA!', '#ffaa00', 18, 2.0);
      ScreenFX.flash(boss.hitColor || 'rgba(255,100,0,0.25)', 0.5);
      ScreenFX.shake(6, 0.3);
      SlowMotion.trigger(0.4, 1.2);
      boss.speed *= 1.25;
    } else if (phase === 2) {
      FloatText.spawn(boss.x, boss.y - boss.size - 20, '☠ FASE CRÍTICA!', '#ff2020', 22, 2.5);
      ScreenFX.flash(boss.hitColor || 'rgba(255,0,0,0.35)', 0.7);
      ScreenFX.shake(10, 0.5);
      SlowMotion.trigger(0.25, 1.5);
      boss.speed *= 1.3;
      // Teleport boss to random position
      boss.x = Util.rand(boss.size * 2, CONFIG.TARGET_W - boss.size * 2);
      boss.y = Util.rand(boss.size * 2, CONFIG.TARGET_H - boss.size * 2);
      Particles.burst(boss.x, boss.y, 20, boss.glowColor || 'rgba(255,0,80,', 2.0);
    }
  },

  getPhase() { return this._phase; },
};


// ═══════════════════════════════════════════════════════════
//  MULTIPLAYER LOCAL — 2 jogadores na mesma tela
//
//  P1: WASD + mouse (sistemas existentes, intocados)
//  P2: IJKL mover, U atirar, O dash, mira automática
//
//  Regras:
//  - Ambos compartilham arena, inimigos, boss, moedas
//  - Game Over apenas quando os DOIS perdem todas as vidas
//  - Nenhum sistema existente é alterado
// ═══════════════════════════════════════════════════════════

// ── P2 INPUT — leitura de teclas dedicadas ao jogador 2 ──
const P2Input = {
  keys: {},   // preenchido pelo Input keydown/keyup existente

  isDown(code) { return !!this.keys[code]; },

  // Vetor de movimento normalizado
  getDir() {
    let dx = 0, dy = 0;
    if (this.isDown('KeyI')) dy -= 1;
    if (this.isDown('KeyK')) dy += 1;
    if (this.isDown('KeyJ')) dx -= 1;
    if (this.isDown('KeyL')) dx += 1;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    return { dx, dy };
  },

  isShooting() { return this.isDown('KeyU'); },
  isDashing()  { return this.isDown('KeyO'); },
};

// ── P2 DASH — dash independente para o jogador 2 ─────────
const P2Dash = {
  active: false,
  timer: 0,
  cooldown: 0,
  DURATION: 0.15,
  COOLDOWN: 1.2,
  SPEED: 680,
  dx: 0, dy: 0,

  reset() { this.active = false; this.timer = 0; this.cooldown = 0; },

  tryDash(dirX, dirY) {
    if (this.active || this.cooldown > 0) return;
    if (Math.abs(dirX) < 0.01 && Math.abs(dirY) < 0.01) return;
    this.active = true;
    this.timer  = this.DURATION;
    this.dx = dirX; this.dy = dirY;
    Player2.invincible = Math.max(Player2.invincible, this.DURATION + 0.05);
    Particles.burst(Player2.x, Player2.y, 8, 'rgba(255,60,200,', 1.2);
    SFX.play('dash');
  },

  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (!this.active) return;
    this.timer -= dt;
    const nx = Player2.x + this.dx * this.SPEED * dt;
    const ny = Player2.y + this.dy * this.SPEED * dt;
    Player2.x = Util.clamp(nx, CONFIG.PLAYER_SIZE, CONFIG.TARGET_W - CONFIG.PLAYER_SIZE);
    Player2.y = Util.clamp(ny, CONFIG.PLAYER_SIZE, CONFIG.TARGET_H - CONFIG.PLAYER_SIZE);
    if (this.timer <= 0) { this.active = false; this.cooldown = this.COOLDOWN; }
  },
};

// ── PLAYER 2 ──────────────────────────────────────────────
const Player2 = {
  x: 0, y: 0,
  angle: 0,
  lives: CONFIG.PLAYER_LIVES,
  invincible: 0,
  fireTimer: 0,
  vx: 0, vy: 0,
  alive: true,

  // Cores magenta neon para diferenciar do P1
  COLOR:    '#ff44cc',
  FILL:     'rgba(255,60,200,0.13)',
  GLOW:     'rgba(255,60,200,0.9)',
  SHIELD:   'rgba(255,60,200,0.6)',

  reset() {
    // Spawna no canto oposto ao P1
    this.x         = CONFIG.TARGET_W * 0.75;
    this.y         = CONFIG.TARGET_H * 0.75;
    this.angle     = Math.PI;
    this.lives     = CONFIG.PLAYER_LIVES;
    this.invincible = 0;
    this.fireTimer  = 0;
    this.vx = 0; this.vy = 0;
    this.alive      = true;
    P2Dash.reset();
    MultiplayerSystem._syncHUD();
  },

  update(dt) {
    // Decrementa invincible mesmo morto (evita ficar preso > 0 para sempre)
    if (this.invincible > 0) this.invincible = Math.max(0, this.invincible - dt);
    if (!this.alive) return;
    if (this.fireTimer > 0) this.fireTimer -= dt;

    // Movimento
    if (!P2Dash.active) {
      const { dx, dy } = P2Input.getDir();
      const topSpeed = CONFIG.PLAYER_SPEED + (CONFIG._speedBoost || 0);
      const targetVx = dx * topSpeed;
      const targetVy = dy * topSpeed;
      const isMoving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
      if (isMoving) {
        this.vx += (targetVx - this.vx) * MOVE_CONFIG.ACCEL;
        this.vy += (targetVy - this.vy) * MOVE_CONFIG.ACCEL;
      } else {
        this.vx *= (1 - MOVE_CONFIG.FRICTION);
        this.vy *= (1 - MOVE_CONFIG.FRICTION);
        if (Math.abs(this.vx) < MOVE_CONFIG.STOP_THRESHOLD) this.vx = 0;
        if (Math.abs(this.vy) < MOVE_CONFIG.STOP_THRESHOLD) this.vy = 0;
      }
      if (CONFIG._gravityShift) {
        this.vx += CONFIG._gravityShift.vx * dt;
        this.vy += CONFIG._gravityShift.vy * dt;
      }
      const margin = CONFIG.PLAYER_SIZE;
      const nx = this.x + this.vx * dt;
      const ny = this.y + this.vy * dt;
      const cx = Util.clamp(nx, margin, CONFIG.TARGET_W - margin);
      const cy = Util.clamp(ny, margin, CONFIG.TARGET_H - margin);
      if (cx !== nx) this.vx = 0;
      if (cy !== ny) this.vy = 0;
      this.x = cx; this.y = cy;

      // Dash
      if (P2Input.isDashing()) {
        const dDir = P2Input.getDir();
        const ddx  = Math.abs(dDir.dx) > 0.01 ? dDir.dx : Math.cos(this.angle);
        const ddy  = Math.abs(dDir.dy) > 0.01 ? dDir.dy : Math.sin(this.angle);
        P2Dash.tryDash(ddx, ddy);
      }
    }
    P2Dash.update(dt);

    // Mira: no modo BOT ALIADO mantém a mira automática (IA do bot);
    // em 2 jogadores reais o P2 aponta na direção do movimento (humano).
    const _p2IsBot = (typeof MPModeSelect !== 'undefined') && MPModeSelect.botAllied;
    if (_p2IsBot) {
      // Mira automática: aponta para o inimigo mais próximo
      let nearestEnemy = null, nearDist = Infinity;
      Enemies.pool.forEach(e => {
        const d = Util.dist(this, e);
        if (d < nearDist) { nearDist = d; nearestEnemy = e; }
      });
      if (BossSystem.boss) {
        const bd = Util.dist(this, BossSystem.boss);
        if (bd < nearDist) nearestEnemy = BossSystem.boss;
      }
      if (nearestEnemy) {
        this.angle = Math.atan2(nearestEnemy.y - this.y, nearestEnemy.x - this.x);
      }
    } else {
      // 2 jogadores reais: P2 aponta para onde se move (teclas IJKL).
      // Sem teclas pressionadas, mantém o último ângulo.
      const _aim = P2Input.getDir();
      if (Math.abs(_aim.dx) > 0.01 || Math.abs(_aim.dy) > 0.01) {
        this.angle = Math.atan2(_aim.dy, _aim.dx);
      }
    }

    // Tiro
    if (P2Input.isShooting() && this.fireTimer <= 0) {
      // Usa o pool compartilhado de Bullets — dano nos inimigos é o mesmo
      Bullets._addBullet(this.x, this.y, this.angle);
      this.fireTimer = CONFIG.FIRE_RATE;
      Particles.burst(
        this.x + Math.cos(this.angle) * CONFIG.PLAYER_SIZE * 1.5,
        this.y + Math.sin(this.angle) * CONFIG.PLAYER_SIZE * 1.5,
        2, 'rgba(255,60,200,', 0.5
      );
    }
  },

  hit() {
    if (this.invincible > 0) return;
    this.lives--;
    this.invincible = CONFIG.INVINCIBLE_TIME;
    Particles.burst(this.x, this.y, 12, 'rgba(255,60,60,', 1.8);
    ScreenFX.shake(6, 0.25);
    ScreenFX.flash('rgba(255,0,100,0.22)', 0.30);
    MultiplayerSystem._syncHUD();
    if (this.lives <= 0) {
      this.alive = false;
      SFX.play('lose_life');
      FloatText.spawn(this.x, this.y - 30, 'P2 ABATIDO!', '#ff44cc', 18, 2.0);
      Particles.burst(this.x, this.y, 20, 'rgba(255,60,200,', 2.0);
      // Game Over apenas se P1 também morreu (espectador via _dead OU sem vidas)
      if (Player._dead || Player.lives <= 0) {
        SFX.play('game_over');
        Game.gameOver();
      }
    } else {
      SFX.play('lose_life');
    }
  },

  draw() {
    if (!this.alive) return;
    if (this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0) return;

    const glowBonus = CONFIG._glowBonus || 0;
    ctx.save();

    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Shield ring quando invencível
    if (this.invincible > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, CONFIG.PLAYER_SIZE + 8, 0, Math.PI * 2);
      ctx.strokeStyle = this.SHIELD;
      ctx.shadowColor = this.GLOW;
      ctx.shadowBlur  = 16;
      ctx.lineWidth   = 2;
      ctx.stroke();
    }

    // Glow
    ctx.shadowColor = this.COLOR;
    ctx.shadowBlur  = 22 + glowBonus;

    // Triângulo magenta
    ctx.beginPath();
    const s = CONFIG.PLAYER_SIZE;
    ctx.moveTo( s * 1.4,  0);
    ctx.lineTo(-s,  s * 0.75);
    ctx.lineTo(-s, -s * 0.75);
    ctx.closePath();
    ctx.strokeStyle = this.COLOR;
    ctx.lineWidth   = 2.5;
    ctx.fillStyle   = this.FILL;
    ctx.fill();
    ctx.stroke();

    // Inner glow
    ctx.shadowBlur   = 8 + glowBonus * 0.5;
    ctx.lineWidth    = 1;
    ctx.strokeStyle  = 'rgba(255,180,255,0.45)';
    ctx.stroke();

    // Ponto central
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle   = this.COLOR;
    ctx.shadowColor = this.COLOR;
    ctx.shadowBlur  = 10;
    ctx.fill();

    // Label P2
    ctx.rotate(-this.angle);
    ctx.font         = 'bold 9px "Courier New"';
    ctx.fillStyle    = this.COLOR;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowBlur   = 6;
    ctx.fillText('P2', 0, -CONFIG.PLAYER_SIZE - 5);

    ctx.restore();
  },
};

// ── MULTIPLAYER SYSTEM — orquestra P2 e colisões extras ───
const MultiplayerSystem = {
  enabled: false,
  _btnEl:  null,
  _hudEl:  null,
  _livesEl: null,

  init() {
    this._btnEl   = document.getElementById('mpToggleBtn');
    this._hudEl   = document.getElementById('p2HUD');
    this._livesEl = document.getElementById('p2Lives');

    if (this._btnEl) {
      this._btnEl.addEventListener('click', () => this.toggle());
    }

    // Injeta leitura das teclas do P2 no keydown/keyup existente
    // (sem adicionar novos listeners — usa o Input já existente via patch de keys)
  },

  toggle() {
    this.enabled = !this.enabled;
    if (this._btnEl) {
      this._btnEl.textContent = '👥 2 JOGADORES: ' + (this.enabled ? 'ON' : 'OFF');
      this._btnEl.classList.toggle('on', this.enabled);
    }
    SFX.play(this.enabled ? 'powerup_collect' : 'menu_close');
  },

  showToggleBtn(show) {
    if (this._btnEl) this._btnEl.classList.toggle('visible', show);
  },

  reset() {
    if (!this.enabled) return;
    Player2.reset();
    this._syncHUD();
    if (this._hudEl) this._hudEl.classList.add('visible');
  },

  clear() {
    if (this._hudEl) this._hudEl.classList.remove('visible');
  },

  _syncHUD() {
    if (!this._livesEl) return;
    let hearts = '';
    for (let i = 0; i < CONFIG.PLAYER_LIVES; i++) {
      hearts += i < Player2.lives ? '❤️' : '🖤';
    }
    this._livesEl.textContent = hearts;
  },

  // Colisões do P2 com inimigos e balas inimigas
  checkCollisions() {
    if (!this.enabled || !Player2.alive) return;

    // Inimigos vs P2
    if (Player2.invincible <= 0) {
      for (let i = Enemies.pool.length - 1; i >= 0; i--) {
        const e = Enemies.pool[i];
        if (!e) continue;
        if (Util.dist(e, Player2) < e.size * 0.72 + CONFIG.PLAYER_SIZE * 0.8) {
          Enemies.pool.splice(i, 1);
          Player2.hit();
        }
      }
      // Boss vs P2
      if (BossSystem.boss && BossSystem._introTimer <= 0) {
        if (Util.dist(BossSystem.boss, Player2) < BossSystem.boss.size * 0.7 + CONFIG.PLAYER_SIZE) {
          Player2.hit();
        }
      }
      // EnemyBullets vs P2
      for (let i = EnemyBullets.pool.length - 1; i >= 0; i--) {
        const b = EnemyBullets.pool[i];
        if (!b) continue;
        if (Util.dist(b, Player2) < 16) {
          EnemyBullets.pool.splice(i, 1);
          Player2.hit();
        }
      }
    }
  },

  update(dt) {
    if (!this.enabled) return;
    Player2.update(dt);
    this._syncHUD();
  },

  draw() {
    if (!this.enabled) return;
    Player2.draw();
  },

  // Patch no Player.hit existente: só chama Game.gameOver
  // se P2 também estiver morto (ou MP desativado).
  // Implementado direto no Player2.hit e via substituição abaixo.
};


// ═══════════════════════════════════════════════════════════
//  MODO ÂNCORA — ANCHOR MODE SYSTEM
//  Controle central de ativação, lógica, visual e HUD.
// ═══════════════════════════════════════════════════════════

// ── Configuração principal — edite aqui ──────────────────
const ENABLE_ANCHOR_MODE = true;   // habilitar/desabilitar globalmente

const ANCHOR_CONFIG = {
  // Duração máxima de um ciclo de Modo Âncora (segundos)
  DURATION:           8.0,

  // Cooldown após sair do Modo Âncora (segundos)
  COOLDOWN:          18.0,

  // Número mínimo de inimigos próximos para auto-ativar
  AUTO_ENEMY_COUNT:   5,

  // Raio de detecção de inimigos próximos (px)
  AUTO_ENEMY_RADIUS: 180,

  // Vida mínima para auto-ativar (1 = apenas 1 coração)
  AUTO_LOW_LIFE:      1,

  // Cooldown do Pulse Aniquilador (segundos)
  PULSE_COOLDOWN:    12.0,

  // Custo de energia do Pulse (0 = sem custo)
  PULSE_ENERGY_COST:  0,

  // Raio da onda expansiva do Pulse (px)
  PULSE_WAVE_RADIUS: CONFIG.TARGET_W * 0.75,
};

// ── ANCHOR MODE STATE ────────────────────────────────────
const AnchorMode = {
  // Estado
  active:       false,
  cooldown:     0,       // cooldown restante antes de poder ativar
  duration:     0,       // duração restante do ciclo atual
  pulseCooldown:0,       // cooldown do Pulse Aniquilador

  // DOM refs
  _hudEl:       null,
  _durFillEl:   null,
  _pulseFillEl: null,
  _cdBadgeEl:   null,
  _pulseBtnEl:  null,

  // Efeito visual: onda expansiva do Pulse
  _wave: null,           // { r, maxR, alpha } ou null

  // Efeito: linhas orbitais de aura
  _orbitAngle:  0,

  // ── Inicialização ────────────────────────────────────────
  init() {
    this._hudEl       = document.getElementById('anchorHUD');
    this._durFillEl   = document.getElementById('anchorDurFill');
    this._pulseFillEl = document.getElementById('pulseFill');
    this._cdBadgeEl   = document.getElementById('anchorCooldownBadge');
    this._pulseBtnEl  = document.getElementById('anchorPulseBtn');

    // Botão mobile do Pulse
    if (this._pulseBtnEl) {
      this._pulseBtnEl.addEventListener('click', () => this.activatePulse());
      this._pulseBtnEl.addEventListener('touchend', e => {
        e.preventDefault();
        this.activatePulse();
      }, { passive: false });
    }

    // Tecla F para ativar/desativar Modo Âncora manualmente
    // (já capturada pelo Input._init via keydown global)
  },

  // ── Reset ao iniciar partida ─────────────────────────────
  reset() {
    this.active        = false;
    this.cooldown      = 0;
    this.duration      = 0;
    this.pulseCooldown = 0;
    this._wave         = null;
    this._orbitAngle   = 0;
    this._syncHUD();
  },

  // ── Ativar Modo Âncora ───────────────────────────────────
  activate() {
    if (!ENABLE_ANCHOR_MODE) return;
    if (this.active || this.cooldown > 0) return;
    if (Player._dead) return;

    this.active   = true;
    this.duration = ANCHOR_CONFIG.DURATION;

    // Efeitos de entrada
    ScreenFX.flash('rgba(255,100,0,0.28)', 0.5);
    ScreenFX.shake(5, 0.3);
    SlowMotion.trigger(0.45, 0.6);   // leve slow-mo cinematográfico na entrada
    Particles.burst(Player.x, Player.y, 18, 'rgba(255,130,0,', 1.4);
    FloatText.spawn(Player.x, Player.y - 40, '⚓ ÂNCORA!', '#ff8800', 20, 1.8);
    SFX.play('shield_on');   // som de ativação sci-fi

    this._syncHUD();
  },

  // ── Desativar Modo Âncora ────────────────────────────────
  deactivate() {
    if (!this.active) return;
    this.active   = false;
    this.cooldown = ANCHOR_CONFIG.COOLDOWN;
    this.duration = 0;

    ScreenFX.flash('rgba(255,60,0,0.15)', 0.3);
    Particles.burst(Player.x, Player.y, 10, 'rgba(255,130,0,', 1.0);
    FloatText.spawn(Player.x, Player.y - 30, 'ÂNCORA OFF', '#ff6600', 14, 1.2);

    this._syncHUD();
  },

  // ── Pulse Aniquilador ────────────────────────────────────
  activatePulse() {
    if (!this.active) return;
    if (this.pulseCooldown > 0) return;

    this.pulseCooldown = ANCHOR_CONFIG.PULSE_COOLDOWN;

    // Onda expansiva visual
    this._wave = { r: 0, maxR: ANCHOR_CONFIG.PULSE_WAVE_RADIUS, alpha: 1.0 };

    // Elimina todos os inimigos na tela
    const killed = Enemies.pool.length;
    Enemies.pool.forEach(e => {
      Particles.burst(e.x, e.y, 12, 'rgba(255,150,0,', 1.8);
      const sg = (CONFIG.SCORE_PER_KILL + (e.scoreBonus || 0)) * (CONFIG._scoreBoost || 1);
      Game.score += sg;
      DifficultySystem.kills++;
      OverdriveSystem.onKill();
    });
    Enemies.pool.length = 0;

    // Destrói projéteis inimigos
    EnemyBullets.pool.length = 0;

    // Dano significativo no boss (não o mata instantaneamente — mantém fair play)
    if (BossSystem.boss) BossSystem.takeDamage(12);

    // Efeitos cinematográficos
    ScreenFX.shake(12, 0.6);
    ScreenFX.flash('rgba(255,180,0,0.45)', 0.7);
    SlowMotion.trigger(0.2, 1.0);

    // Partículas massivas
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const rx = Util.rand(0, CONFIG.TARGET_W);
        const ry = Util.rand(0, CONFIG.TARGET_H);
        Particles.burst(rx, ry, 14, 'rgba(255,160,0,', 2.0);
      }, i * 80);
    }

    FloatText.spawn(Player.x, Player.y - 55, '★ PULSE ANIQUILADOR ★', '#ffaa00', 22, 2.5);
    SFX.play('kill_boss');   // som épico de explosão

    if (killed > 0) {
      FloatText.spawn(Player.x, Player.y - 30, killed + ' eliminados!', '#ffdd00', 15, 1.5);
    }

    this._syncHUD();
    this.deactivate();
  },

  // ── Auto-detecção de ativação ────────────────────────────
  _shouldAutoActivate() {
    if (!ENABLE_ANCHOR_MODE) return false;
    if (this.active || this.cooldown > 0) return false;
    if (Player._dead) return false;

    // Condição 1: vida muito baixa
    if (Player.lives <= ANCHOR_CONFIG.AUTO_LOW_LIFE) return true;

    // Condição 2: muitos inimigos próximos
    let nearCount = 0;
    for (const e of Enemies.pool) {
      if (Util.dist(e, Player) < ANCHOR_CONFIG.AUTO_ENEMY_RADIUS) {
        nearCount++;
        if (nearCount >= ANCHOR_CONFIG.AUTO_ENEMY_COUNT) return true;
      }
    }

    return false;
  },

  // ── Update (chamado todo frame) ──────────────────────────
  update(dt) {
    if (!ENABLE_ANCHOR_MODE) return;

    // Decrementar timers
    if (this.cooldown      > 0) this.cooldown      = Math.max(0, this.cooldown - dt);
    if (this.pulseCooldown > 0) this.pulseCooldown = Math.max(0, this.pulseCooldown - dt);

    // Auto-ativação
    if (this._shouldAutoActivate()) this.activate();

    if (this.active) {
      this.duration -= dt;
      this._orbitAngle += dt * 2.2;

      // Expiração do modo
      if (this.duration <= 0) this.deactivate();

      // Partículas de aura periódicas
      if (Math.random() < 0.18) {
        const a = Math.random() * Math.PI * 2;
        const r = CONFIG.PLAYER_SIZE + Util.rand(8, 20);
        Particles.burst(
          Player.x + Math.cos(a) * r,
          Player.y + Math.sin(a) * r,
          1, 'rgba(255,130,0,', 0.7
        );
      }
    }

    // Onda expansiva do Pulse
    if (this._wave) {
      this._wave.r     += 600 * dt;
      this._wave.alpha -= 1.4 * dt;
      if (this._wave.alpha <= 0 || this._wave.r >= this._wave.maxR) this._wave = null;
    }

    this._syncHUD();
  },

  // ── Sincroniza HUD ────────────────────────────────────────
  _syncHUD() {
    if (!this._hudEl) return;

    const show = this.active;
    this._hudEl.classList.toggle('visible', show);

    // Cooldown badge (quando não ativo mas em cooldown)
    if (this._cdBadgeEl) {
      this._cdBadgeEl.classList.toggle('visible', !show && this.cooldown > 0 && Game.state === 'playing');
    }

    if (show) {
      // Barra de duração
      if (this._durFillEl) {
        const durPct = Math.max(0, this.duration / ANCHOR_CONFIG.DURATION * 100);
        this._durFillEl.style.width = durPct + '%';
        this._durFillEl.style.background = durPct > 40
          ? 'linear-gradient(90deg,#ff4400,#ffaa00)'
          : 'linear-gradient(90deg,#ff0000,#ff4400)';
      }
      // Barra do Pulse
      if (this._pulseFillEl) {
        const pulsePct = this.pulseCooldown > 0
          ? Math.max(0, (1 - this.pulseCooldown / ANCHOR_CONFIG.PULSE_COOLDOWN) * 100)
          : 100;
        this._pulseFillEl.style.width = pulsePct + '%';
      }
      // Botão mobile
      if (this._pulseBtnEl) {
        this._pulseBtnEl.classList.add('visible');
        this._pulseBtnEl.classList.toggle('ready', this.pulseCooldown <= 0);
        this._pulseBtnEl.textContent = this.pulseCooldown > 0
          ? Math.ceil(this.pulseCooldown) + 's' : '💥';
      }
    } else {
      if (this._pulseBtnEl) this._pulseBtnEl.classList.remove('visible');
    }
  },

  // ── Draw no canvas ───────────────────────────────────────
  draw() {
    if (!ENABLE_ANCHOR_MODE) return;

    // Onda expansiva do Pulse
    if (this._wave) {
      ctx.save();
      const w = this._wave;
      // Anel primário
      ctx.beginPath();
      ctx.arc(Player.x, Player.y, w.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,180,0,${w.alpha * 0.9})`;
      ctx.shadowColor  = 'rgba(255,150,0,0.9)';
      ctx.shadowBlur   = 28;
      ctx.lineWidth    = 4;
      ctx.stroke();
      // Anel interno
      if (w.r > 30) {
        ctx.beginPath();
        ctx.arc(Player.x, Player.y, w.r * 0.55, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,220,0,${w.alpha * 0.5})`;
        ctx.lineWidth   = 2;
        ctx.shadowBlur  = 12;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Aura do Modo Âncora (só quando ativo)
    if (!this.active) return;

    const now = performance.now() / 1000;
    const px  = Player.x, py = Player.y;
    const ps  = CONFIG.PLAYER_SIZE;

    ctx.save();

    // ── Halo radial base ────────────────────────────────────
    const pulse    = 1 + Math.sin(now * 4) * 0.15;
    const haloR    = ps * 2.8 * pulse;
    const haloGrad = ctx.createRadialGradient(px, py, ps * 0.5, px, py, haloR);
    haloGrad.addColorStop(0, `rgba(255,130,0,${0.22 * pulse})`);
    haloGrad.addColorStop(0.5, `rgba(255,60,0,0.10)`);
    haloGrad.addColorStop(1,  'rgba(255,0,0,0)');
    ctx.beginPath();
    ctx.arc(px, py, haloR, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();

    // ── Linhas orbitais (4 linhas girando) ──────────────────
    const lineCount = 4;
    for (let i = 0; i < lineCount; i++) {
      const a    = this._orbitAngle + (Math.PI * 2 / lineCount) * i;
      const r1   = ps * 1.6;
      const r2   = ps * 2.6 + Math.sin(now * 3 + i) * 5;
      const lx1  = px + Math.cos(a) * r1;
      const ly1  = py + Math.sin(a) * r1;
      const lx2  = px + Math.cos(a) * r2;
      const ly2  = py + Math.sin(a) * r2;
      const alph = 0.5 + Math.sin(now * 5 + i * 1.3) * 0.3;

      ctx.beginPath();
      ctx.moveTo(lx1, ly1);
      ctx.lineTo(lx2, ly2);
      ctx.strokeStyle = `rgba(255,160,40,${alph})`;
      ctx.shadowColor  = 'rgba(255,120,0,0.9)';
      ctx.shadowBlur   = 10;
      ctx.lineWidth    = 2.5;
      ctx.lineCap      = 'round';
      ctx.stroke();

      // Ponto nas extremidades
      ctx.beginPath();
      ctx.arc(lx2, ly2, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,200,0,${alph})`;
      ctx.shadowBlur = 8;
      ctx.fill();
    }

    // ── Anel energético central ──────────────────────────────
    const ringR   = ps * 1.35 + Math.sin(now * 6) * 3;
    const ringAlp = 0.6 + Math.sin(now * 8) * 0.2;
    ctx.beginPath();
    ctx.arc(px, py, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,140,0,${ringAlp})`;
    ctx.shadowColor  = 'rgba(255,100,0,0.95)';
    ctx.shadowBlur   = 18;
    ctx.lineWidth    = 2;
    ctx.stroke();

    // ── Duração restante como arco ao redor do player ───────
    const durFrac = Math.max(0, this.duration / ANCHOR_CONFIG.DURATION);
    ctx.beginPath();
    ctx.arc(px, py, ps * 1.8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * durFrac);
    ctx.strokeStyle = durFrac > 0.4
      ? `rgba(255,180,0,0.85)` : `rgba(255,60,0,0.85)`;
    ctx.shadowColor  = 'rgba(255,120,0,0.8)';
    ctx.shadowBlur   = 12;
    ctx.lineWidth    = 3;
    ctx.stroke();

    // ── Ícone âncora (canvas text) ───────────────────────────
    ctx.font         = '12px serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = `rgba(255,180,0,${0.6 + Math.sin(now * 3) * 0.3})`;
    ctx.shadowColor  = 'rgba(255,130,0,0.9)';
    ctx.shadowBlur   = 10;
    ctx.fillText('⚓', px - 1, py - ps * 2.8 - 8);

    ctx.restore();
  },
};

// ── ANCHOR MOVEMENT BLOCK ────────────────────────────────
// Integrado ao PlayerMovement.update via flag AnchorMode.active.
// Quando ativo: bloqueia deslocamento, mantém rotação livre.
// (Veja patch em PlayerMovement.update abaixo)


// ═══════════════════════════════════════════════════════════
//  MOBILE EXPERIENCE SYSTEM
//  Cuida de: fullscreen, canvas.toWorld mobile-aware,
//  performance adaptativa e safe-area.
// ═══════════════════════════════════════════════════════════
const MobileExperience = {

  // ── Fullscreen API cross-browser ─────────────────────────
  requestFullscreen() {
    if (!MobileDetect.isMobile) return;
    const el = document.documentElement;
    const fn = el.requestFullscreen
      || el.webkitRequestFullscreen
      || el.mozRequestFullScreen
      || el.msRequestFullscreen;
    if (fn) {
      fn.call(el).catch(() => {});   // ignora erro se bloqueado
    }
    // Lock orientação landscape se preferido (opcional — comentar para permitir portrait)
    // if (screen.orientation && screen.orientation.lock) {
    //   screen.orientation.lock('landscape').catch(() => {});
    // }
  },

  exitFullscreen() {
    const fn = document.exitFullscreen
      || document.webkitExitFullscreen
      || document.mozCancelFullScreen;
    if (fn) fn.call(document).catch(() => {});
  },

  // ── Performance adaptativa no mobile ─────────────────────
  // Reduz partículas e sombras em dispositivos lentos.
  applyMobilePerf() {
    if (!MobileDetect.isMobile) return;
    // Detecta GPU fraca via heurística: tela pequena ou baixa memória
    const isLowEnd = (navigator.deviceMemory && navigator.deviceMemory <= 2)
      || (window.innerWidth * window.innerHeight < 360000);   // < ~600×600

    if (isLowEnd) {
      Performance.MAX_PARTICLES    = 120;
      Performance.MAX_BULLETS      = 60;
      Performance.MAX_ENEMY_BULLETS = 20;
      Performance.MAX_FLOAT_TEXTS  = 10;
      Performance.MAX_ENEMIES      = 35;
      // Desativa screen shake no low-end (custo de reflow)
      CONFIG._shakeDisabled = true;
    }
  },

  // ── Canvas touch-to-world correto ────────────────────────
  // Util.toWorld já usa offsetX/offsetY/scale — sem mudança necessária.
  // Este método é um alias explícito para clareza futura.
  touchToWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return Util.toWorld(clientX - r.left, clientY - r.top);
  },

  // ── Previne comportamentos padrão indesejados no mobile ──
  preventDefaults() {
    // Previne scroll/bounce ao arrastar na tela
    document.addEventListener('touchmove', e => {
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    // Previne zoom por double-tap no iOS
    let lastTap = 0;
    document.addEventListener('touchend', e => {
      const now = Date.now();
      if (now - lastTap < 300) e.preventDefault();
      lastTap = now;
    }, { passive: false });

    // Previne menu de contexto longo-pressionar
    document.addEventListener('contextmenu', e => e.preventDefault());
  },

  // ── HUD canvas: texto compacto no mobile ─────────────────
  // Retorna tamanho de fonte ajustado para mobile.
  hudFontSize(base) {
    if (!MobileDetect.isMobile) return base;
    return Math.round(base * 0.82);
  },

  init() {
    this.preventDefaults();
    this.applyMobilePerf();
    // Dispara um resize imediato para garantir que o canvas
    // ocupe 100% da área visual correta após load.
    setTimeout(resizeCanvas, 50);
    setTimeout(resizeCanvas, 300);
  },
};

// ═══════════════════════════════════════════════════════════
//  SUPABASE RANKING SYSTEM
//  Integração com banco de dados para ranking global.
// ═══════════════════════════════════════════════════════════
const SupabaseSystem = {
  _client: null,
  _table:  'recordes',
  _URL: 'https://xasgwdhartnrivgrzvri.supabase.co',
  _KEY: 'sb_publishable_L-_YjiayMOqtrX324DQy9w_JZbyZw-H',
  _ranking: [],
  _playerName: 'Jogador',
  _initialized: false,

  init() {
    try {
      this._client = (typeof AuthSystem !== 'undefined' && AuthSystem._client)
        ? AuthSystem._client
        : supabase.createClient(this._URL, this._KEY);
      this._initialized = true;
      this.loadRanking();
    } catch (e) {
      console.warn('Supabase erro:', e);
    }
  },

  // ── Salva o recorde no banco ─────────────────────────────
  saveRecord(score, tempo) {
    if (!this._initialized || score <= 0) return;
    const url = this._URL + '/rest/v1/recordes';
    const data = JSON.stringify({
      nome:  this._playerName,
      score: Math.floor(score),
      tempo: parseFloat(tempo.toFixed(2)),
    });
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('apikey', this._KEY);
    xhr.setRequestHeader('Authorization', 'Bearer ' + this._KEY);
    xhr.setRequestHeader('Prefer', 'return=minimal');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        this.loadRanking();
      } else {
        console.warn('Erro ao salvar recorde:', xhr.status, xhr.responseText);
      }
    };
    xhr.onerror = () => {
      console.warn('Erro de rede XHR');
    };
    xhr.send(data);
  },

  // ── Carrega o ranking do banco ───────────────────────────
  // ── Carrega o ranking do banco ──
  // apikey vai na URL e SEM cabeçalhos customizados → requisição "simples",
  // sem preflight CORS. Funciona em GitHub Pages, Live Server e file://.
  loadRanking() {
    if (!this._initialized) return;
    const url = this._URL
      + '/rest/v1/recordes?select=nome,score,tempo&order=score.desc&limit=100'
      + '&apikey=' + encodeURIComponent(this._KEY);
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          this._ranking = JSON.parse(xhr.responseText) || [];
          // Se o modal de ranking estiver aberto, atualiza a lista na hora
          if (typeof GameOverDOM !== 'undefined' && GameOverDOM._rankingModal
              && GameOverDOM._rankingModal.classList.contains('open')) {
            GameOverDOM._renderRanking();
          }
        } catch (e) {
          console.warn('Ranking: resposta inválida', e);
        }
      } else {
        console.warn('Erro ao carregar ranking:', xhr.status, xhr.responseText);
      }
    };
    xhr.onerror = () => { console.warn('Erro de rede ao carregar ranking'); };
    xhr.send();
  },

  // ── Formata tempo em mm:ss ───────────────────────────────
  _formatTime(s) {
    const m   = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
  },

  // ── Desenha o ranking na tela de game over ───────────────
  drawRanking() {
    if (!this._initialized || this._ranking.length === 0) return;
    const cx  = CONFIG.TARGET_W / 2;
    const startY = CONFIG.TARGET_H / 2 + 70;

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    // Título do ranking
    ctx.font        = 'bold 13px "Courier New"';
    ctx.fillStyle   = '#00c8ff';
    ctx.shadowColor = '#00c8ff';
    ctx.shadowBlur  = 10;
    ctx.fillText('◈ RANKING GLOBAL ◈', cx, startY);

    // Lista top 10
    this._ranking.forEach((r, i) => {
      const y       = startY + 20 + i * 18;
      const isPlayer = r.nome === this._playerName;
      ctx.font      = '11px "Courier New"';
      ctx.fillStyle = isPlayer ? '#ffdd00' : 'rgba(0,200,255,0.75)';
      ctx.shadowColor = isPlayer ? '#ffdd00' : 'rgba(0,200,255,0.5)';
      ctx.shadowBlur  = isPlayer ? 8 : 0;
      ctx.fillText(
        `${i + 1}. ${r.nome}  ${r.score || r.pontuacao}pts  ${this._formatTime(r.tempo)}`,
        cx, y
      );
    });

    ctx.restore();
  },
};

// ═══════════════════════════════════════════════════════════
//  HIGH SCORE SYSTEM
//  Salva e carrega o recorde de pontuação E tempo em localStorage.
//  Reage visualmente quando o recorde é superado.
// ═══════════════════════════════════════════════════════════
const HighScoreSystem = {
  _keyScore:    'neonSiege_highScore_v1',
  _keyTime:     'neonSiege_highTime_v1',
  highScore:    0,
  highTime:     0,     // melhor tempo sobrevivido em segundos
  _isNewScore:  false,
  _isNewTime:   false,
  _notified:    false,
  _glowTimer:   0,
  _glowActive:  false,
  _isFirstGame: true,    // true = nunca jogou antes, false = já tem recorde salvo

  // ── Formata segundos em mm:ss ────────────────────────────
  _formatTime(s) {
    const m   = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
  },

  // ── Carrega os recordes salvos do localStorage ───────────
  load() {
    try {
      const savedScore = localStorage.getItem(this._keyScore);
      const savedTime  = localStorage.getItem(this._keyTime);
      this.highScore    = savedScore ? parseInt(savedScore) : 0;
      this.highTime     = savedTime  ? parseFloat(savedTime) : 0;
      // Se já existe algum recorde salvo, não é mais a primeira partida
      this._isFirstGame = savedScore === null && savedTime === null;
    } catch (e) {
      this.highScore    = 0;
      this.highTime     = 0;
      this._isFirstGame = true;
    }
  },

  // ── Salva os recordes no localStorage ───────────────────
  save() {
    try {
      localStorage.setItem(this._keyScore, String(this.highScore));
      localStorage.setItem(this._keyTime,  String(this.highTime));
      // Após salvar o primeiro recorde, já não é mais primeira partida
      this._isFirstGame = false;
    } catch (e) {}
  },

  // ── Reseta flags ao iniciar partida ─────────────────────
  reset() {
    this._isNewScore = false;
    this._isNewTime  = false;
    this._notified   = false;
    this._glowTimer  = 0;
    this._glowActive = false;
  },

  // ── Verifica se o score ou tempo atual supera o recorde ──
  // Chame a cada frame durante o jogo passando Game.score e Game.elapsed.
  check(currentScore, currentTime) {
    let newRecord = false;

    // Verifica recorde de pontuação
    if (currentScore > this.highScore) {
      this.highScore   = currentScore;
      this._isNewScore = true;
      newRecord        = true;
    }

    // Verifica recorde de tempo
    if (currentTime > this.highTime) {
      this.highTime   = currentTime;
      this._isNewTime = true;
      newRecord       = true;
    }

    if (newRecord) {
      this.save();
      // Na primeira partida: nunca notifica durante o jogo,
      // apenas salva silenciosamente. A tela de game over mostrará o recorde.
      // Nas partidas seguintes: notifica imediatamente ao ultrapassar.
      if (!this._notified && !this._isFirstGame) {
        this._notified   = true;
        this._glowActive = true;
        this._glowTimer  = 5.0;
        FloatText.spawn(
          CONFIG.TARGET_W / 2,
          CONFIG.TARGET_H / 2 - 80,
          '★ NOVO RECORDE! ★',
          '#ffdd00',
          26,
          2.5
        );
        FloatText.spawn(
          CONFIG.TARGET_W / 2,
          CONFIG.TARGET_H / 2 - 40,
          'Parabéns! Superou seu recorde!',
          '#ffdd00',
          20,
          3.5
        );
        ScreenFX.flash('rgba(255,220,0,0.30)', 0.8);
        ScreenFX.shake(5, 0.4);
        SFX.play('powerup_collect');
      }
    }
  },

  // ── Atualiza o timer do efeito de glow ──────────────────
  update(dt) {
    if (this._glowTimer > 0) {
      this._glowTimer -= dt;
      if (this._glowTimer <= 0) {
        this._glowTimer  = 0;
        this._glowActive = false;
      }
    }
  },

  // ── Desenha o efeito neon de recorde no canvas ──────────
  draw() {
    if (!this._glowActive) return;
    const now   = performance.now() / 1000;
    const alpha = Math.min(1, this._glowTimer / 2.0);

    ctx.save();

    // Borda neon pulsante colorida ao redor da arena
    const pulse = 0.5 + Math.sin(now * 6) * 0.5;
    const colors = [
      `rgba(255,220,0,${alpha * pulse})`,
      `rgba(255,100,0,${alpha * pulse})`,
      `rgba(0,200,255,${alpha * pulse})`,
      `rgba(200,0,255,${alpha * pulse})`,
    ];
    const colorIndex = Math.floor(now * 4) % colors.length;
    const bw = 6;

    ctx.strokeStyle = colors[colorIndex];
    ctx.shadowColor = colors[colorIndex];
    ctx.shadowBlur  = 30 + Math.sin(now * 8) * 15;
    ctx.lineWidth   = bw;
    ctx.strokeRect(bw / 2, bw / 2, CONFIG.TARGET_W - bw, CONFIG.TARGET_H - bw);

    // Cantos com glow extra
    const cLen = 40;
    const corners = [
      [0, 0, 1, 1],
      [CONFIG.TARGET_W, 0, -1, 1],
      [0, CONFIG.TARGET_H, 1, -1],
      [CONFIG.TARGET_W, CONFIG.TARGET_H, -1, -1],
    ];
    ctx.lineWidth = 4;
    for (const [cx, cy, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * cLen, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * cLen);
      ctx.stroke();
    }

    ctx.restore();
  },

  // ── Desenha recorde no HUD do canvas ────────────────────
  drawHUD() {
    const now = performance.now() / 1000;
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowBlur   = 0;

    if (this._glowActive && (this._isNewScore || this._isNewTime)) {
      // Pisca em dourado quando está batendo recorde
      const blink     = Math.sin(now * 8) > 0;
      ctx.fillStyle   = blink ? '#ffdd00' : '#ffaa00';
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur  = 10;
      ctx.font        = '10px "Courier New"';
      ctx.fillText(
        '★ REC: ' + this.highScore + '  |  ' + this._formatTime(this.highTime),
        CONFIG.TARGET_W / 2,
        48
      );
    } else {
      ctx.fillStyle = 'rgba(0,200,255,0.40)';
      ctx.font      = '10px "Courier New"';
      ctx.fillText(
        'REC: ' + this.highScore + '  |  ' + this._formatTime(this.highTime),
        CONFIG.TARGET_W / 2,
        48
      );
    }
    ctx.restore();
  },
};

// ═══════════════════════════════════════════════════════════
//  PROFILE SYSTEM
//  Tela de edição de perfil: nome, avatar e estatísticas.
// ═══════════════════════════════════════════════════════════
const ProfileSystem = {
  _KEY_NAME:   'neonSiege_playerName',
  _KEY_AVATAR: 'neonSiege_playerAvatar',

  _overlay:      null,
  _avatarEl:     null,
  _pickerEl:     null,
  _nameInput:    null,
  _feedbackEl:   null,
  _feedbackTimer: null,
  _currentAvatar: '🚀',

  init() {
    this._overlay   = document.getElementById('profileScreen');
    this._avatarEl  = document.getElementById('profileAvatar');
    this._pickerEl  = document.getElementById('profileAvatarPicker');
    this._nameInput = document.getElementById('profileNameInput');
    this._feedbackEl = document.getElementById('profileFeedback');

    // Carrega dados salvos
    this.loadProfile();

    // Avatar: clique abre/fecha o picker
    this._avatarEl.addEventListener('click', () => {
      const visible = this._pickerEl.style.display !== 'none';
      this._pickerEl.style.display = visible ? 'none' : 'flex';
    });

    // Seleção de avatar
    this._pickerEl.addEventListener('click', e => {
      const opt = e.target.closest('.avatar-opt');
      if (!opt) return;
      this._currentAvatar = opt.dataset.emoji;
      this._avatarEl.textContent = this._currentAvatar;
      this._pickerEl.style.display = 'none';
      // Atualiza selecionado
      this._pickerEl.querySelectorAll('.avatar-opt').forEach(o => {
        o.classList.toggle('selected', o.dataset.emoji === this._currentAvatar);
      });
    });

    // Salvar perfil
    document.getElementById('profileSaveBtn').addEventListener('click', () => {
      this.saveProfile();
    });

    // Fechar sem salvar
    document.getElementById('profileCloseBtn').addEventListener('click', () => {
      this.hide();
    });

    // Resetar recorde local
    document.getElementById('profileResetBtn').addEventListener('click', () => {
      if (confirm('Tem certeza que deseja resetar seu recorde local? Esta ação não pode ser desfeita.')) {
        try {
          localStorage.removeItem('neonSiege_highScore_v1');
          localStorage.removeItem('neonSiege_highTime_v1');
          HighScoreSystem.highScore = 0;
          HighScoreSystem.highTime  = 0;
        } catch (e) {}
        this._showFeedback('Recorde resetado com sucesso!');
        this._syncStats();
      }
    });

    // Fechar clicando fora do painel
    this._overlay.addEventListener('click', e => {
      if (e.target === this._overlay) this.hide();
    });

    // Tecla Escape fecha
    window.addEventListener('keydown', e => {
      if (e.code === 'Escape' && this.isOpen()) this.hide();
    });
  },

  // ── Carrega perfil do localStorage ──────────────────────
  loadProfile() {
    try {
      const nome   = localStorage.getItem(this._KEY_NAME)   || 'Jogador';
      const avatar = localStorage.getItem(this._KEY_AVATAR) || '🚀';
      this._currentAvatar = avatar;
      if (this._avatarEl)  this._avatarEl.textContent  = avatar;
      if (this._nameInput) this._nameInput.value        = nome;
      // Sincroniza com SupabaseSystem
      if (typeof SupabaseSystem !== 'undefined') SupabaseSystem._playerName = nome;
      // Marca avatar selecionado no picker
      if (this._pickerEl) {
        this._pickerEl.querySelectorAll('.avatar-opt').forEach(o => {
          o.classList.toggle('selected', o.dataset.emoji === avatar);
        });
      }
    } catch (e) {}
  },

  // ── Salva perfil no localStorage ────────────────────────
  saveProfile(_adminVerified) {
    const nome = this._nameInput.value.trim();
    if (nome.length === 0) {
      this._showFeedback('Digite um nome válido!', true);
      return;
    }
    // Proteção: bloqueia uso do nome de admin em dispositivo sem token válido
    if (!_adminVerified && typeof window.AdminMode !== 'undefined' && nome === ADMIN_NAME) {
      window.AdminMode.tryCreateAdminProfile(nome).then(r => {
        if (r === 'denied') { this._showFeedback('Esse nome é exclusivo e já está reservado.', true); }
        else                { this.saveProfile(true); }
      });
      return;
    }
    try {
      localStorage.setItem(this._KEY_NAME,   nome);
      localStorage.setItem(this._KEY_AVATAR, this._currentAvatar);
      // Sincroniza com SupabaseSystem e NameScreen
      if (typeof SupabaseSystem !== 'undefined') SupabaseSystem._playerName = nome;
      if (typeof NameScreen !== 'undefined' && NameScreen._input) {
        NameScreen._input.value = nome;
      }
    } catch (e) {}
    if (typeof AuthSystem !== 'undefined') AuthSystem.syncProfile();
    this._showFeedback('Perfil salvo com sucesso!');
    SFX.play('shop_buy');
  },

  // ── Sincroniza estatísticas na tela ─────────────────────
  _syncStats() {
    const hsEl = document.getElementById('profileHighScore');
    const htEl = document.getElementById('profileHighTime');
    const coEl = document.getElementById('profileCoins');
    if (hsEl) hsEl.textContent = HighScoreSystem.highScore || 0;
    if (htEl) htEl.textContent = HighScoreSystem._formatTime
      ? HighScoreSystem._formatTime(HighScoreSystem.highTime || 0)
      : '00:00';
    if (coEl) coEl.textContent = CoinSystem.get ? CoinSystem.get() : 0;
  },

  // ── Exibe feedback ───────────────────────────────────────
  _showFeedback(msg, isError) {
    if (!this._feedbackEl) return;
    clearTimeout(this._feedbackTimer);
    this._feedbackEl.textContent  = msg;
    this._feedbackEl.style.color  = isError ? '#ff4466' : '#00ff88';
    this._feedbackEl.style.textShadow = isError
      ? '0 0 8px rgba(255,60,60,0.6)' : '0 0 8px rgba(0,255,136,0.6)';
    this._feedbackEl.classList.add('visible');
    this._feedbackTimer = setTimeout(() => {
      this._feedbackEl.classList.remove('visible');
    }, 2500);
  },

  // ── Abre a tela de perfil ────────────────────────────────
  show() {
    this.loadProfile();
    this._syncStats();
    this._pickerEl.style.display = 'none';
    this._overlay.classList.add('visible');
    setTimeout(() => { if (this._nameInput) this._nameInput.focus(); }, 100);
    SFX.play('menu_open');
  },

  hide() {
    this._overlay.classList.remove('visible');
    SFX.play('menu_close');
  },

  isOpen() { return this._overlay && this._overlay.classList.contains('visible'); },

  // ── Retorna o avatar atual ───────────────────────────────
  getAvatar() { return this._currentAvatar; },
};

// ═══════════════════════════════════════════════════════════
//  NAME SCREEN SYSTEM
//  Tela elegante para o jogador digitar o nome antes de jogar.
// ═══════════════════════════════════════════════════════════
const NameScreen = {
  _overlay:    null,
  _input:      null,
  _confirmBtn: null,
  _charCount:  null,
  _onConfirm:  null,   // callback chamado após confirmar o nome

  init() {
    this._overlay    = document.getElementById('nameScreen');
    this._input      = document.getElementById('nameInput');
    this._confirmBtn = document.getElementById('nameConfirmBtn');
    this._charCount  = document.getElementById('nameCharCount');

    // Atualiza contador de caracteres
    this._input.addEventListener('input', () => {
      const len = this._input.value.length;
      this._charCount.textContent = len + ' / 20 caracteres';
      this._charCount.style.color = len >= 18
        ? 'rgba(255,100,0,0.7)' : 'rgba(0,200,255,0.35)';
    });

    // Confirma com Enter
    this._input.addEventListener('keydown', e => {
      if (e.key === 'Enter') this._confirm();
    });

    // Confirma com botão
    this._confirmBtn.addEventListener('click', () => this._confirm());
  },

  // Abre a tela de nome e chama onConfirm quando concluído
  show(onConfirm) {
    this._onConfirm = onConfirm;
    this._overlay.classList.add('visible');
    // Foca automaticamente no input
    setTimeout(() => { if (this._input) this._input.focus(); }, 100);
    SFX.play('menu_open');
  },

  hide() {
    this._overlay.classList.remove('visible');
  },

  _confirm() {
    const nome = this._input.value.trim();
    if (nome.length === 0) {
      // Destaca o input se vazio
      this._input.style.borderColor = 'rgba(255,60,60,0.7)';
      this._input.placeholder = 'Digite seu nome!';
      setTimeout(() => {
        this._input.style.borderColor = '';
        this._input.placeholder = 'Digite seu nome...';
      }, 1200);
      return;
    }
    SupabaseSystem._playerName = nome;
    // Salva nome no localStorage para não perguntar toda vez
    try { localStorage.setItem('neonSiege_playerName', nome); } catch (e) {}
    if (typeof AuthSystem !== 'undefined') AuthSystem.syncProfile();
    this.hide();
    SFX.play('game_start');
    if (this._onConfirm) this._onConfirm();
  },

  // Carrega nome salvo do localStorage
  loadSavedName() {
    try {
      const saved = localStorage.getItem('neonSiege_playerName');
      if (saved) {
        SupabaseSystem._playerName = saved;
        if (this._input) this._input.value = saved;
        return true;   // já tem nome salvo
      }
    } catch (e) {}
    return false;   // nunca digitou nome
  },
};

// ═══════════════════════════════════════════════════════════
//  GAME OVER DOM SYSTEM
//  Tela de game over como overlay DOM com ranking modal.
// ═══════════════════════════════════════════════════════════
const GameOverDOM = {
  _overlay:     null,
  _scoreVal:    null,
  _recordWrap:  null,
  _recordVal:   null,
  _timeVal:     null,
  _rankingModal:null,
  _rankingList: null,
  _scoreShown:  0,      // valor do score atualmente exibido (acompanha animação)
  _scoreAnimRaf:null,   // handle do requestAnimationFrame da animação

  init() {
    this._overlay      = document.getElementById('gameOverDOM');
    this._scoreVal     = document.getElementById('goScoreValue');
    this._recordWrap   = document.getElementById('goRecordWrap');
    this._recordVal    = document.getElementById('goRecordValue');
    this._timeVal      = document.getElementById('goTimeValue');
    this._rankingModal = document.getElementById('rankingModal');
    this._rankingList  = document.getElementById('rankingList');

    // Botão reiniciar
    document.getElementById('goBtnRestart').addEventListener('click', () => {
      this.hide();
      Game.restart();
    });

    // Botão menu
    document.getElementById('goBtnMenu').addEventListener('click', () => {
      this.hide();
      // Volta ao menu sem reiniciar — reseta estado
      Bullets.clear();
      EnemyBullets.clear();
      Enemies.reset();
      Particles.clear();
      FloatText.clear();
      Player.reset();
      PlayerMovement.reset();
      BossSystem.reset();
      const bb = document.getElementById('bossBar');
      if (bb) bb.classList.remove('visible');
      EnergySystem.showBar(false);
      ComboSystem.reset();
      if (typeof AnchorMode !== 'undefined') AnchorMode.reset();
      MultiplayerSystem.clear();
      Game.score   = 0;
      Game.elapsed = 0;
      Game.state   = 'menu';
      PauseUI.syncPauseBtn('menu');
      const _sb = document.getElementById('settingsBtn');
      if (_sb) _sb.classList.add('visible');
      MultiplayerSystem.showToggleBtn(true);
      const _pb = document.getElementById('profileMenuBtn');
      if (_pb) { _pb.style.opacity = '1'; _pb.style.pointerEvents = 'all'; }
    });

    // Botão ver ranking
    document.getElementById('goBtnRanking').addEventListener('click', () => {
      this._openRanking();
    });

    // Fechar modal ranking
    document.getElementById('rankingCloseBtn').addEventListener('click', () => {
      this._closeRanking();
    });
    this._rankingModal.addEventListener('click', e => {
      if (e.target === this._rankingModal) this._closeRanking();
    });

    // ── HOOK: wrap em ConvertSystem.convert pra animar o score no gameover ──
    // O botão #convertBtn da HUD fica visível em cima da tela de gameover.
    // Aqui interceptamos a conversão pra animar o número do score em vez de
    // ele "saltar" instantâneo (que era a impressão de que nada mudava).
    if (typeof ConvertSystem !== 'undefined' && !ConvertSystem._origConvert) {
      ConvertSystem._origConvert = ConvertSystem.convert.bind(ConvertSystem);
      const self = this;
      ConvertSystem.convert = function() {
        const before = Game.score;
        const result = ConvertSystem._origConvert();
        // Só anima se a conversão foi feita E a tela de gameover está visível
        if (result === 'ok' && self._overlay && self._overlay.classList.contains('visible')) {
          self._animateScoreDown(self._scoreShown, Game.score);
        }
        return result;
      };
    }
  },

  // Exibe a tela de game over com os dados da partida
  show() {
    const score     = Game.score;
    const highScore = HighScoreSystem.highScore;
    const isNew     = HighScoreSystem._isNewScore && score > 0;
    const time      = UI.formatTime(Game.elapsed);

    // Score principal
    if (this._scoreVal) this._scoreVal.textContent = score;
    this._scoreShown = score;

    // Tempo
    if (this._timeVal) this._timeVal.textContent = time;

    // Recorde
    if (this._recordWrap) {
      if (isNew) {
        this._recordWrap.innerHTML =
          '<span id="goNewRecord" style="color:#ffcf3a;text-shadow:0 0 10px rgba(255,207,58,.7);animation:goPulseGold 1.1s infinite">★ NOVO RECORDE! ' + score + '</span>';
      } else if (highScore > 0) {
        this._recordWrap.innerHTML =
          '🏆 Recorde <span class="go-num" id="goRecordValue">' + highScore + '</span>';
      } else {
        this._recordWrap.innerHTML = '';
      }
    }

    // Mostra overlay
    if (this._overlay) this._overlay.classList.add('visible');
  },

  hide() {
    if (this._overlay) this._overlay.classList.remove('visible');
    this._closeRanking();
  },

  _openRanking() {
    this._renderRanking();
    if (this._rankingModal) this._rankingModal.classList.add('open');
  },

  _closeRanking() {
    if (this._rankingModal) this._rankingModal.classList.remove('open');
  },

  _renderRanking() {
    if (!this._rankingList) return;
    const raw     = (typeof SupabaseSystem !== 'undefined') ? SupabaseSystem._ranking : [];
    const myName  = (typeof SupabaseSystem !== 'undefined') ? SupabaseSystem._playerName : '';
    this._rankingList.innerHTML = '';

    if (raw.length === 0) {
      const li = document.createElement('li');
      li.style.cssText = 'justify-content:center;color:#7da3c0;padding:24px';
      li.textContent = 'Nenhum recorde ainda. Seja o primeiro!';
      this._rankingList.appendChild(li);
      return;
    }

    // Cada nome aparece UMA vez, com a melhor pontuação dele.
    // (apenas filtra na exibição — não altera o banco nem o salvamento)
    const best = {};
    raw.forEach(r => {
      const nome  = r.nome;
      const score = (r.score != null ? r.score : r.pontuacao) || 0;
      if (!(nome in best) || score > ((best[nome].score != null ? best[nome].score : best[nome].pontuacao) || 0)) {
        best[nome] = r;
      }
    });
    const list = Object.values(best)
      .sort((a, b) => ((b.score != null ? b.score : b.pontuacao) || 0) - ((a.score != null ? a.score : a.pontuacao) || 0))
      .slice(0, 10);

    list.forEach((row, i) => {
      const li = document.createElement('li');
      if (i < 3) li.classList.add('rk-top');
      if (myName && row.nome === myName) li.classList.add('rk-me');
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
      const tempo = typeof SupabaseSystem._formatTime === 'function'
        ? SupabaseSystem._formatTime(row.tempo)
        : row.tempo;
      li.innerHTML =
        `<span class="rk-pos">${medal}</span>` +
        `<span class="rk-name">${row.nome}</span>` +
        `<span class="rk-pts">${row.score || row.pontuacao}pts</span>` +
        `<span class="rk-time">${tempo}</span>`;
      this._rankingList.appendChild(li);
    });
  },

  // Anima o número exibido no #goScoreValue suavemente de `fromVal` até `toVal`
  // ao longo de `duration` ms (ease-out cubic). Cancela animação em andamento
  // se outro clique de CONVERTER chegar durante a transição.
  _animateScoreDown(fromVal, toVal, duration = 450) {
    if (!this._scoreVal) return;
    if (this._scoreAnimRaf) cancelAnimationFrame(this._scoreAnimRaf);

    const startTime = performance.now();
    const delta = toVal - fromVal; // negativo
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const current = Math.round(fromVal + delta * eased);
      this._scoreVal.textContent = current;
      this._scoreShown = current;
      if (t < 1) {
        this._scoreAnimRaf = requestAnimationFrame(step);
      } else {
        this._scoreVal.textContent = toVal;
        this._scoreShown = toVal;
        this._scoreAnimRaf = null;
      }
    };
    this._scoreAnimRaf = requestAnimationFrame(step);
  },
};

// ═══════════════════════════════════════════════════════════
//  PROFILE DELETE — apagar perfil com confirmação (módulo separado)
//  Não altera o ProfileSystem; apenas lê suas chaves e atualiza a tela.
// ═══════════════════════════════════════════════════════════
const ProfileDelete = {
  _confirmEl: null,

  init() {
    this._confirmEl = document.getElementById('profileDeleteConfirm');
    const btnOpen = document.getElementById('profileDeleteBtn');
    const btnYes  = document.getElementById('profileDeleteYes');
    const btnNo   = document.getElementById('profileDeleteNo');
    if (btnOpen) btnOpen.addEventListener('click', () => this._ask());
    if (btnNo)   btnNo.addEventListener('click',   () => this._close());
    if (btnYes)  btnYes.addEventListener('click',  () => this._doDelete());
  },

  _ask()   { if (this._confirmEl) this._confirmEl.classList.add('visible'); },
  _close() { if (this._confirmEl) this._confirmEl.classList.remove('visible'); if (typeof SFX !== 'undefined') SFX.play('menu_close'); },

  _doDelete() {
    // Apaga as chaves de perfil (nome + avatar) usadas pelo ProfileSystem
    try {
      localStorage.removeItem(ProfileSystem._KEY_NAME);
      localStorage.removeItem(ProfileSystem._KEY_AVATAR);
    } catch (e) {}

    // Volta o ProfileSystem ao padrão (nome em branco, avatar 🚀)
    ProfileSystem._currentAvatar = '🚀';
    if (ProfileSystem._avatarEl)  ProfileSystem._avatarEl.textContent = '🚀';
    if (ProfileSystem._nameInput) ProfileSystem._nameInput.value = '';
    if (ProfileSystem._pickerEl) {
      ProfileSystem._pickerEl.querySelectorAll('.avatar-opt').forEach(o => {
        o.classList.toggle('selected', o.dataset.emoji === '🚀');
      });
    }

    // Sincroniza o nome do ranking de volta ao padrão
    if (typeof SupabaseSystem !== 'undefined') SupabaseSystem._playerName = 'Jogador';
    if (typeof TutorialSystem !== 'undefined') TutorialSystem.reset();

    this._close();
    if (typeof ProfileSystem._showFeedback === 'function')
      ProfileSystem._showFeedback('Perfil apagado!');
    if (typeof SFX !== 'undefined') SFX.play('shop_error');
  },
};

// ═══════════════════════════════════════════════════════════
//  MP MODE SELECT — seleção de modo: 1 jogador / 2 reais / bot aliado
//  Módulo SEPARADO. Não altera MultiplayerSystem nem Player2.
//  Reusa MultiplayerSystem.toggle()/enabled já existentes.
//  Expõe MPModeSelect.botAllied (flag de leitura p/ etapa futura do bot).
// ═══════════════════════════════════════════════════════════
const MPModeSelect = {
  // 0 = 1 jogador | 1 = 2 jogadores reais | 2 = bot aliado
  mode: 0,
  botAllied: false,   // lida pela IA do bot numa etapa futura (hoje sem efeito)
  _btnEl: null,

  init() {
    const old = document.getElementById('mpToggleBtn');
    if (!old) return;
    // Clona o botão para remover o listener antigo (toggle direto) sem apagar código.
    const btn = old.cloneNode(true);
    old.parentNode.replaceChild(btn, old);
    this._btnEl = btn;
    // Reaponta a referência interna do MultiplayerSystem para o novo nó (mesmo id/classes).
    if (typeof MultiplayerSystem !== 'undefined') MultiplayerSystem._btnEl = btn;

    btn.addEventListener('click', () => this._cycle());
    this._render();
  },

  _cycle() {
    this.mode = (this.mode + 1) % 3;
    // enabled alvo: false no modo 0, true nos modos 1 e 2
    const wantEnabled = (this.mode !== 0);
    // Usa o toggle() EXISTENTE só quando precisa mudar o enabled real
    if (typeof MultiplayerSystem !== 'undefined'
        && MultiplayerSystem.enabled !== wantEnabled
        && typeof MultiplayerSystem.toggle === 'function') {
      MultiplayerSystem.toggle();
    }
    this.botAllied = (this.mode === 2);
    this._render();
    if (typeof SFX !== 'undefined') SFX.play(wantEnabled ? 'powerup_collect' : 'menu_close');
  },

  // Atualiza só o texto/visual do botão (o toggle existente já mexe no enabled)
  _render() {
    if (!this._btnEl) return;
    const labels = ['👥 1 JOGADOR', '👥 2 JOGADORES', '🤖 BOT ALIADO'];
    this._btnEl.textContent = labels[this.mode];
    this._btnEl.classList.toggle('on', this.mode !== 0);
  },
};

// ═══════════════════════════════════════════════════════════
//  MATCH MODIFIERS CLOSE — botão X que volta ao menu (módulo separado)
//  Não altera MatchModifiers; apenas chama o hide() já existente.
//  A tela aparece com o jogo no menu, então esconder já "volta ao menu".
// ═══════════════════════════════════════════════════════════
const MatchModifiersClose = {
  init() {
    const btn = document.getElementById('modifierCloseBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (typeof MatchModifiers !== 'undefined' && typeof MatchModifiers.hide === 'function') {
        MatchModifiers.hide();
      }
      if (typeof SFX !== 'undefined') SFX.play('menu_close');
    });
  },
};


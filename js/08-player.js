// ═══════════════════════════════════════════════════════════
//  PLAYER
// ═══════════════════════════════════════════════════════════
const Player = {
  x: 0, y: 0,
  angle: 0,
  lives: CONFIG.PLAYER_LIVES,
  invincible: 0,       // segundos restantes de invencibilidade
  fireTimer: 0,
  skin: 'default',

  reset() {
    this.x = CONFIG.TARGET_W / 2;
    this.y = CONFIG.TARGET_H / 2;
    this.angle = 0;
    this.lives = CONFIG.PLAYER_LIVES;
    this.invincible = 0;
    this.fireTimer = 0;
    this._dead = false;   // limpa flag de morte ao reiniciar
  },

  update(dt) {
    // Se P1 morreu em modo MP, para de atualizar
    if (this._dead) return;
    // ── Timers ────────────────────────────────────────────
    if (this.invincible > 0) this.invincible -= dt;
    if (this.fireTimer  > 0) this.fireTimer  -= dt;

    // ── Movimentação — delegada ao PlayerMovement system ──
    // PlayerMovement lê Input + Mobile, aplica aceleração/fricção
    // e escreve diretamente em Player.x / Player.y.
    // Também cuida do Dash (Shift) e colisão com bordas.
    PlayerMovement.update(dt);

    // ── Rotação — independente do movimento ───────────────
    // No Modo Âncora: rotação livre por mouse/touch (movimento bloqueado).
    // No modo normal: aponta para o mouse.
    this.angle = Math.atan2(Input.mouse.y - this.y, Input.mouse.x - this.x);

    // ── Tiro — modo configurável (mouse ou espaço) ──────────
    const shootActive = (typeof ControlSettings !== 'undefined' && ControlSettings.data)
      ? (ControlSettings.isShootActive() || Mobile.shooting)
      : (Input.shooting || Mobile.shooting);
    if (shootActive && this.fireTimer <= 0) {
      Bullets.spawn(this.x, this.y, this.angle);
      this.fireTimer = CONFIG.FIRE_RATE;
      Particles.burst(
        this.x + Math.cos(this.angle) * CONFIG.PLAYER_SIZE * 1.5,
        this.y + Math.sin(this.angle) * CONFIG.PLAYER_SIZE * 1.5,
        2, 'rgba(0,220,255,', 0.5
      );
    }
  },

  hit() {
    if (this.invincible > 0) return;
    if (this._dead) return;   // já morto — ignora hits extras
    this.lives--;
    this.invincible = CONFIG.INVINCIBLE_TIME;
    Particles.burst(this.x, this.y, 12, 'rgba(255,60,60,', 1.8);
    ScreenFX.shake(7, 0.3);
    ScreenFX.flash('rgba(255,0,0,0.25)', 0.35);
    ComboSystem.reset();
    if (this.lives <= 0) {
      this.lives = 0;        // nunca fica negativo
      // Em modo multiplayer, Game Over só quando P2 também morreu
      const p2Alive = MultiplayerSystem.enabled && Player2.alive;
      if (p2Alive) {
        // P1 morreu mas P2 ainda vive — marca P1 como morto (espectador)
        this._dead = true;
        // Zera joystick e tiro para evitar "congelamento" de input na próxima partida
        Mobile.joyVec.x  = 0;
        Mobile.joyVec.y  = 0;
        Mobile.shooting  = false;
        Input.shooting   = false;
        Input.keys       = {};
        SFX.play('lose_life');
        FloatText.spawn(this.x, this.y - 30, 'P1 ABATIDO!', '#00c8ff', 18, 2.0);
        Particles.burst(this.x, this.y, 20, 'rgba(0,200,255,', 2.0);
      } else {
        // Solo ou ambos mortos — Game Over
        SFX.play('game_over');
        Game.gameOver();
      }
    } else {
      SFX.play('lose_life');
    }
  },

  tipX() { return this.x + Math.cos(this.angle) * CONFIG.PLAYER_SIZE * 1.4; },
  tipY() { return this.y + Math.sin(this.angle) * CONFIG.PLAYER_SIZE * 1.4; },

  draw() {
    if (this._dead) return;   // não desenha P1 morto em modo MP
    if (this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0) return;

    const glowBonus = CONFIG._glowBonus || 0;

    ctx.save();

    // Dash arc (drawn before translate so it stays in world space)
    DashSystem.draw();

    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Shield ring when invincible (mesmo para todos os skins)
    if (this.invincible > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, CONFIG.PLAYER_SIZE + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,200,0,0.6)';
      ctx.shadowColor = 'rgba(255,200,0,0.8)';
      ctx.shadowBlur  = 16;
      ctx.lineWidth   = 2;
      ctx.stroke();
    }

    if (this.skin === 'interceptor') {
      this._drawInterceptor(glowBonus);
    } else {
      this._drawDefault(glowBonus);
    }

    ctx.restore();

    // Ship Evolution extras (wings, core, trail)
    ShipEvolution.drawExtras(this.x, this.y, this.angle);
  },

  _drawDefault(glowBonus) {
    ctx.shadowColor = CONFIG.NEON_COLOR;
    ctx.shadowBlur  = 28 + glowBonus;

    ctx.beginPath();
    const s = CONFIG.PLAYER_SIZE;
    ctx.moveTo( s * 1.4,  0);
    ctx.lineTo(-s,  s * 0.75);
    ctx.lineTo(-s, -s * 0.75);
    ctx.closePath();

    ctx.strokeStyle = CONFIG.NEON_COLOR;
    ctx.lineWidth   = 2.5;
    ctx.fillStyle   = 'rgba(0,200,255,0.13)';
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur  = 8 + glowBonus * 0.5;
    ctx.lineWidth   = 1;
    ctx.strokeStyle = 'rgba(180,240,255,0.45)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle   = CONFIG.NEON_COLOR;
    ctx.shadowColor = CONFIG.NEON_COLOR;
    ctx.shadowBlur  = 10;
    ctx.fill();
  },

  _drawInterceptor(glowBonus) {
    const s = CONFIG.PLAYER_SIZE;
    const elapsed      = (typeof Game !== 'undefined') ? Game.elapsed : (performance.now() / 1000);
    const enginePulse  = 0.8 + Math.sin(elapsed * 9) * 0.2;

    // Motores traseiros (desenhados antes do casco, ficam por baixo)
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur  = Math.round(12 * enginePulse);
    ctx.fillStyle   = `rgba(255,${Math.round(140 + 100 * enginePulse)},20,0.92)`;
    ctx.beginPath();
    ctx.arc(-s * 0.85, -s * 0.35, s * 0.17 * enginePulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-s * 0.85,  s * 0.35, s * 0.17 * enginePulse, 0, Math.PI * 2);
    ctx.fill();

    // Glow do casco
    ctx.shadowColor = '#a259ff';
    ctx.shadowBlur  = 20 + glowBonus;
    ctx.fillStyle   = 'rgba(90,30,140,0.88)';
    ctx.strokeStyle = '#00f6ff';
    ctx.lineWidth   = 1.5;

    // Asa direita
    ctx.beginPath();
    ctx.moveTo( s * 0.25,  s * 0.45);
    ctx.lineTo(-s * 0.05,  s * 1.45);
    ctx.lineTo(-s * 0.65,  s * 1.5);
    ctx.lineTo(-s * 0.8,   s * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Asa esquerda
    ctx.beginPath();
    ctx.moveTo( s * 0.25, -s * 0.45);
    ctx.lineTo(-s * 0.05, -s * 1.45);
    ctx.lineTo(-s * 0.65, -s * 1.5);
    ctx.lineTo(-s * 0.8,  -s * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fuselagem (hexágono alongado)
    ctx.beginPath();
    ctx.moveTo( s * 1.55,  0);
    ctx.lineTo( s * 0.55,  s * 0.42);
    ctx.lineTo(-s * 0.85,  s * 0.38);
    ctx.lineTo(-s * 1.05,  0);
    ctx.lineTo(-s * 0.85, -s * 0.38);
    ctx.lineTo( s * 0.55, -s * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Linhas de painel nas asas
    ctx.strokeStyle = 'rgba(162,89,255,0.5)';
    ctx.lineWidth   = 0.7;
    ctx.shadowBlur  = 3;
    ctx.beginPath();
    ctx.moveTo( s * 0.1,   s * 0.65);
    ctx.lineTo(-s * 0.45,  s * 1.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo( s * 0.1,  -s * 0.65);
    ctx.lineTo(-s * 0.45, -s * 1.25);
    ctx.stroke();

    // Cockpit
    ctx.shadowBlur = 0;
    ctx.fillStyle  = 'rgba(195,240,255,0.82)';
    ctx.beginPath();
    ctx.ellipse(s * 0.4, 0, s * 0.22, s * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.beginPath();
    ctx.ellipse(s * 0.44, -s * 0.05, s * 0.10, s * 0.07, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Ponto central
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle   = '#a259ff';
    ctx.shadowColor = '#a259ff';
    ctx.shadowBlur  = 10 + glowBonus * 0.5;
    ctx.fill();
  },
};


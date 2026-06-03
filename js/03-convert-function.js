// ═══════════════════════════════════════════════════════════
//  CONVERT FUNCTION — lógica de conversão score → moedas
// ═══════════════════════════════════════════════════════════
const ConvertSystem = {
  _cooldown: false,

  convert() {
    if (this._cooldown) return 'cooldown';
    const cost  = COIN_CONFIG.SCORE_COST;
    const coins = COIN_CONFIG.COINS_PER_CONV;

    if (ScoreSystem.get() < cost) {
      CoinUI.showFeedback('Score insuficiente (min. ' + cost + ')', 'error');
      CoinUI.flashCoinValue('flash-error');
      SFX.play('shop_error');
      return 'insufficient';
    }

    this._cooldown = true;
    if (CoinUI._elConvertBtn) CoinUI._elConvertBtn.disabled = true;
    setTimeout(() => {
      this._cooldown = false;
      if (CoinUI._elConvertBtn) CoinUI._elConvertBtn.disabled = false;
    }, COIN_CONFIG.COOLDOWN_MS);

    ScoreSystem.spend(cost);
    CoinSystem.add(coins);

    CoinUI.popCoinIcon();
    CoinUI.flashCoinValue('flash-success');
    CoinUI.spawnFloatingCoins(coins);
    CoinUI.showFeedback('+' + coins + ' moedas convertidas!', 'success');
    SFX.play('score_convert');
    return 'ok';
  },

  _init() {
    const btn = document.getElementById('convertBtn');
    if (!btn) return;
    btn.addEventListener('click', () => ConvertSystem.convert());
    btn.addEventListener('touchend', e => {
      e.preventDefault();
      ConvertSystem.convert();
    }, { passive: false });
  },
};


// ═══════════════════════════════════════════════════════════
//  MOVEMENT CONFIG
//  Todos os parâmetros de movimentação em um único lugar.
//  Altere aqui para ajustar feel sem tocar na lógica.
// ═══════════════════════════════════════════════════════════
const MOVE_CONFIG = {
  // Velocidade máxima de cruzeiro (px/s)
  BASE_SPEED: 220,

  // Aceleração: quanto da velocidade alvo é alcançado por frame.
  // 1.0 = instantâneo (sem inércia). 0.18 = inércia suave arcade.
  ACCEL: 0.18,

  // Desaceleração ao soltar teclas (friction). 0.12 = desliza levemente.
  FRICTION: 0.12,

  // Limiar mínimo de velocidade para zerar (evita micro-deslize infinito).
  STOP_THRESHOLD: 0.5,

  // Margem interna da arena em relação ao tamanho da nave.
  BORDER_MARGIN_MULT: 1.0,

  // Velocidade máxima de dash (não sobrepõe MOVE_CONFIG — DashSystem owns it).
  // Declarado aqui apenas como documentação de referência.
  DASH_SPEED_REF: 680,
};

// Multiplicador de zoom da câmera — editável pelo jogador via configurações
// 1.0 = zoom padrão, > 1.0 = mais perto, < 1.0 = mais longe
let CAMERA_ZOOM = 1.0;

// ═══════════════════════════════════════════════════════════
//  PLAYER MOVEMENT — sistema dedicado de movimentação
//
//  Responsabilidades:
//    • Ler Input.keys e Mobile.joyVec
//    • Calcular vetor de direção normalizado
//    • Aplicar aceleração / fricção via lerp
//    • Delegar ao DashSystem quando ativo
//    • Aplicar ScreenCollision ao resultado
//
//  NÃO toca em:  angle, fireTimer, invincible, lives
// ═══════════════════════════════════════════════════════════
const PlayerMovement = {
  // Velocidade atual da nave (px/s, dois eixos independentes)
  vx: 0,
  vy: 0,

  reset() {
    this.vx = 0;
    this.vy = 0;
  },

  // ── INPUT SYSTEM ─────────────────────────────────────────
  // Lê todas as fontes de entrada e devolve vetor [dx, dy]
  // já normalizado para magnitude máxima 1.
  _readInput() {
    let dx = 0, dy = 0;

    // ── Teclado: usa teclas configuráveis (fallback WASD) ──
    const cs = (typeof ControlSettings !== 'undefined' && ControlSettings.data)
      ? ControlSettings : null;
    const up    = cs ? cs.getKey('moveUp')    : 'KeyW';
    const down  = cs ? cs.getKey('moveDown')  : 'KeyS';
    const left  = cs ? cs.getKey('moveLeft')  : 'KeyA';
    const right = cs ? cs.getKey('moveRight') : 'KeyD';

    if (Input.isDown(up)    || Input.isDown('ArrowUp'))    dy -= 1;
    if (Input.isDown(down)  || Input.isDown('ArrowDown'))  dy += 1;
    if (Input.isDown(left)  || Input.isDown('ArrowLeft'))  dx -= 1;
    if (Input.isDown(right) || Input.isDown('ArrowRight')) dx += 1;

    // ── MOBILE MOVEMENT: joystick override ──
    // O joystick já entrega um vetor normalizado [-1, 1].
    // Só substitui se estiver sendo usado (magnitude > dead-zone).
    const jx = Mobile.joyVec.x, jy = Mobile.joyVec.y;
    if (Math.abs(jx) > 0.05 || Math.abs(jy) > 0.05) {
      dx = jx; dy = jy;
    }

    // ── Normalização diagonal ──
    // Garante velocidade consistente em todas as direções,
    // incluindo diagonais (sem o bug do √2 × velocidade).
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }   // ≤ 1 para joystick analógico

    return { dx, dy };
  },

  // ── PLAYER MOVEMENT (núcleo) ──────────────────────────────
  // Chame uma vez por frame passando dt (segundos).
  // Atualiza Player.x e Player.y via aceleração + fricção.
  update(dt) {
    // MODO ÂNCORA: player fixo — zera velocidade e bloqueia movimento.
    // Rotação e tiro continuam sendo tratados em Player.update().
    if (typeof AnchorMode !== 'undefined' && AnchorMode.active) {
      this.vx = 0;
      this.vy = 0;
      return;
    }

    // Quando dash está ativo, ele controla a posição diretamente.
    // Apenas sincronizamos a velocidade para uma transição suave.
    if (DashSystem.active) {
      this.vx = DashSystem.dx * DashSystem.DASH_SPEED;
      this.vy = DashSystem.dy * DashSystem.DASH_SPEED;
      return;
    }

    const { dx, dy } = this._readInput();

    // Velocidade máxima levando em conta upgrades da loja
    const topSpeed = MOVE_CONFIG.BASE_SPEED
      + (CONFIG._speedBoost  || 0)
      + (CONFIG._dashBonus   || 0);

    // Velocidade alvo neste frame
    const targetVx = dx * topSpeed;
    const targetVy = dy * topSpeed;

    const isMoving = (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01);

    if (isMoving) {
      // Aceleração suave em direção ao alvo
      const a = MOVE_CONFIG.ACCEL;
      this.vx += (targetVx - this.vx) * a;
      this.vy += (targetVy - this.vy) * a;
    } else {
      // Fricção: desacelera ao soltar teclas
      const f = MOVE_CONFIG.FRICTION;
      this.vx *= (1 - f);
      this.vy *= (1 - f);

      // Zera micro-velocidades para parada limpa
      if (Math.abs(this.vx) < MOVE_CONFIG.STOP_THRESHOLD) this.vx = 0;
      if (Math.abs(this.vy) < MOVE_CONFIG.STOP_THRESHOLD) this.vy = 0;
    }

    // Apply gravity shift event
    if (CONFIG._gravityShift) {
      this.vx += CONFIG._gravityShift.vx * dt;
      this.vy += CONFIG._gravityShift.vy * dt;
    }
    // Apply fast-enemies modifier
    if (CONFIG._modFastEnemies) { /* handled in Enemies */ }

    // Aplicar deslocamento
    const nx = Player.x + this.vx * dt;
    const ny = Player.y + this.vy * dt;

    // ── SCREEN COLLISION ─────────────────────────────────────
    // Clamp dentro da arena com margem baseada no tamanho da nave.
    const margin = CONFIG.PLAYER_SIZE * MOVE_CONFIG.BORDER_MARGIN_MULT;
    const clampedX = Util.clamp(nx, margin, CONFIG.TARGET_W - margin);
    const clampedY = Util.clamp(ny, margin, CONFIG.TARGET_H - margin);

    // Se bateu na borda, zera a componente de velocidade daquela direção
    // — evita acúmulo de velocidade "represada" contra a parede.
    if (clampedX !== nx) this.vx = 0;
    if (clampedY !== ny) this.vy = 0;

    Player.x = clampedX;
    Player.y = clampedY;

    // ── Dash trigger — tecla configurável (default Shift) ──
    const dashActive = (typeof ControlSettings !== 'undefined' && ControlSettings.data)
      ? ControlSettings.isDashKey()
      : (Input.isDown('ShiftLeft') || Input.isDown('ShiftRight'));
    if (dashActive && !DashSystem.active) {
      // Se parado, dash para frente (direção do mouse)
      const dashDx = Math.abs(dx) > 0.01 ? dx : Math.cos(Player.angle);
      const dashDy = Math.abs(dy) > 0.01 ? dy : Math.sin(Player.angle);
      DashSystem.tryDash(dashDx, dashDy);
    }
  },
};

// ═══════════════════════════════════════════════════════════
//  RESUME SYSTEM — lógica de retomada segura
// ═══════════════════════════════════════════════════════════
const ResumeSystem = {
  resume() {
    if (!PauseState.canResume()) return;
    Game.state = 'playing';
    if (typeof MusicSystem !== 'undefined') MusicSystem.resume();
    PauseUI.hidePauseMenu();
    PauseUI.syncPauseBtn('playing');
    FreezeSystem.unfreeze();
    SFX.play('menu_close');
  },

  restartFromPause() {
    PauseUI.hidePauseMenu();
    // Pequeno delay para a animação de fade terminar
    setTimeout(() => {
      Game.restart();
      PauseUI.syncPauseBtn('playing');
      FreezeSystem.unfreeze();
    }, PAUSE_CONFIG.TRANSITION_MS);
  },

  exitToMenu() {
    PauseUI.hidePauseMenu();
    setTimeout(() => {
      // Limpar todos os sistemas
      Bullets.clear();
      EnemyBullets.clear();
      Enemies.reset();
      Particles.clear();
      FloatText.clear();
      Player.reset();
      PlayerMovement.reset();

      // Resetar boss e ocultar barra de vida
      BossSystem.reset();
      const bb = document.getElementById('bossBar');
      if (bb) bb.classList.remove('visible');

      // Resetar sistemas de expansão
      EnergySystem.reset();
      EnergySystem.showBar(false);
      PortalSystem.reset();
      DroneSystem.reset();
      ShieldSystem.reset();
      BlackHoleSystem.reset();
      ChestSystem.reset();
      OverdriveSystem.reset();
      SlowMotion.reset();
      EventSystem.reset();
      ArenaSystem.reset();
      ChaosMode.reset();
      RandomRewards.reset();
      UltimateSystem.reset();
      ElectricSystem.reset();
      DifficultySystem.reset();
      DashSystem.reset();
      ComboSystem.reset();
      PowerUps.reset();
      BossPhaseSystem.reset();
      ScreenFX.shakeX = 0;
      ScreenFX.shakeY = 0;
      CONFIG._speedBoost = 0;
      CONFIG._scoreBoost = 1;
      CONFIG._stormActive    = false;
      CONFIG._invasionActive = false;
      CONFIG._gravityShift   = null;
      CONFIG._blackout       = false;

      // Mostrar botão multiplayer no menu
      MultiplayerSystem.clear();
      MultiplayerSystem.showToggleBtn(true);

      Game.score   = 0;
      Game.elapsed = 0;
      Game.state   = 'menu';
      if (typeof MusicSystem !== 'undefined') MusicSystem.stopMatch();
      PauseUI.syncPauseBtn('menu');
      FreezeSystem.unfreeze();

      // Mostra botão settings no menu
      const _sb = document.getElementById('settingsBtn');
      if (_sb) _sb.classList.add('visible');
    }, PAUSE_CONFIG.TRANSITION_MS);
  },
};

// ═══════════════════════════════════════════════════════════
//  PAUSE BUTTON EVENTS — todos os listeners do sistema pause
//  Regra: cada elemento recebe exatamente um listener.
// ═══════════════════════════════════════════════════════════
const PauseEvents = {
  _init() {
    // ── Botão flutuante de pause ─────────────────────────
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;   // só botão esquerdo / toque primário
      e.preventDefault();           // impede que o pointerdown vaze pro canvas
      if (PauseState.canPause())  PauseEvents._doPause();
      else if (PauseState.canResume()) ResumeSystem.resume();
    });

    // ── Botão Continue ────────────────────────────────────
    document.getElementById('pauseContinueBtn').addEventListener('click', () => ResumeSystem.resume());

    // ── Botão Restart ─────────────────────────────────────
    document.getElementById('pauseRestartBtn').addEventListener('click', () => ResumeSystem.restartFromPause());

    // ── Botão Exit ────────────────────────────────────────
    document.getElementById('pauseExitBtn').addEventListener('click', () => ResumeSystem.exitToMenu());

    // ── Tecla P (a que já existe em Input redireciona para
    //    este handler para manter lógica centralizada) ─────
    // Nota: Input._init já chama Game.togglePause() na KeyP.
    // Substituímos togglePause no objeto Game para usar nosso sistema.
  },

  _doPause() {
    if (!PauseState.canPause()) return;
    FreezeSystem.freeze();
    Game.state = 'paused';
    if (typeof MusicSystem !== 'undefined') MusicSystem.pause();
    PauseUI.showPauseMenu();
    PauseUI.syncPauseBtn('paused');
    SFX.play('menu_open');
  },
};


// ═══════════════════════════════════════════════════════════
//  DIFFICULTY SYSTEM
//  Progressão suave baseada em tempo + kills
// ═══════════════════════════════════════════════════════════
const DifficultySystem = {
  level: 1,           // nível atual (1-20)
  kills: 0,           // total de kills na partida
  _badgeEl: null,
  _lastLevel: 0,
  _announcedLevel: 0,

  reset() {
    this.level = 1;
    this.kills = 0;
    this._lastLevel = 0;
    this._announcedLevel = 0;
    this._updateBadge();
  },

  // Chama a cada frame durante 'playing'
  update() {
    const t = Game.elapsed;
    const k = this.kills;
    // Fórmula suave: cada 20s ou 15 kills sobe um nível
    const byTime  = Math.floor(t / 20);
    const byKills = Math.floor(k / 15);
    this.level = Math.min(20, 1 + byTime + byKills);

    if (this.level !== this._lastLevel) {
      this._lastLevel = this.level;
      this._updateBadge();
      if (this.level > this._announcedLevel) {
        this._announcedLevel = this.level;
        // Flash visual ao subir nível
        ScreenFX.flash('rgba(0,200,255,0.18)', 0.35);
        SFX.play('level_up');
        FloatText.spawn(
          CONFIG.TARGET_W / 2, CONFIG.TARGET_H / 2 - 60,
          'NÍVEL ' + this.level, '#00c8ff', 28, 1.8
        );
      }
    }
  },

  // Multiplicadores calculados a partir do nível
  enemySpeedMult()  { return 1 + (this.level - 1) * 0.08; },
  spawnIntervalMult(){ return Math.max(0.25, 1 - (this.level - 1) * 0.04); },
  enemyHpMult()     { return 1 + (this.level - 1) * 0.12; },

  // Retorna o tipo de inimigo a spawnar com base no nível
  weightedEnemyType() {
    const lv = this.level;
    const pool = ['normal'];
    if (lv >= 2 && Game.elapsed >= 35)  pool.push('fast');
    if (lv >= 3 && Game.elapsed >= 35)  pool.push('fast');
    if (lv >= 4)  pool.push('tank');
    if (lv >= 5)  pool.push('zigzag');
    if (lv >= 7)  pool.push('shooter');
    if (lv >= 8)  pool.push('electric');
    if (lv >= 10) pool.push('tank', 'electric');
    if (lv >= 14) pool.push('shooter', 'electric');
    return Util.randItem(pool);
  },

  _updateBadge() {
    if (!this._badgeEl) this._badgeEl = document.getElementById('diffBadge');
    if (!this._badgeEl) return;
    this._badgeEl.textContent = 'LV ' + this.level;
    this._badgeEl.classList.toggle('high', this.level >= 8);
  },
};


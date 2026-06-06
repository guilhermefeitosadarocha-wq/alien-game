// ═══════════════════════════════════════════════════════════
//  GAME STATE MACHINE
// ═══════════════════════════════════════════════════════════
const Game = {
  state: 'menu',   // 'menu' | 'playing' | 'paused' | 'gameover'
  score: 0,
  elapsed: 0,      // segundos de jogo
  lastTime: 0,

  start() {
    this.score   = 0;
    this.elapsed = 0;
    Player.reset();
    PlayerMovement.reset();
    Enemies.reset();
    Bullets.clear();
    Particles.clear();
    EnemyBullets.clear();
    FloatText.clear();
    DifficultySystem.reset();
    DashSystem.reset();
    ComboSystem.reset();
    PowerUps.reset();
    BossSystem.reset();
    BossPhaseSystem.reset();
    ScreenFX.shakeX = 0;
    ScreenFX.shakeY = 0;
    CONFIG._speedBoost = 0;
    CONFIG._scoreBoost = 1;
    // Expansion systems reset
    EnergySystem.reset();
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
    CriticalSystem.reset();
    MatchModifiers.reset();
    AnchorMode.reset();
    if (typeof GameOverDOM !== 'undefined') GameOverDOM.hide();
    HighScoreSystem.reset();
    EnergySystem.showBar(true);
    // Multiplayer reset
    MultiplayerSystem.reset();
    // Mobile fullscreen: tenta entrar em tela cheia ao iniciar partida
    MobileExperience.requestFullscreen();
    this.state = 'playing';
    if (typeof PauseUI !== 'undefined' && PauseUI._elPauseBtn) {
      PauseUI.syncPauseBtn('playing');
    }
    // Oculta botão settings, ONLINE e MP durante o jogo
    const _sb = document.getElementById('settingsBtn');
    if (_sb) _sb.classList.remove('visible');
    const _ob = document.getElementById('onlineBtn');
    if (_ob) _ob.classList.remove('visible');
    MultiplayerSystem.showToggleBtn(false);
    // Oculta botão de perfil durante o jogo
    const _pb = document.getElementById('profileMenuBtn');
    if (_pb) { _pb.style.opacity = '0'; _pb.style.pointerEvents = 'none'; }
  },

  restart() { this.start(); },

  gameOver() {
    this.state = 'gameover';
    // Mostra tela de game over DOM após delay para efeitos canvas terminarem
    setTimeout(() => { if (typeof GameOverDOM !== 'undefined') GameOverDOM.show(); }, 400);
    HighScoreSystem.check(this.score, this.elapsed);
    HighScoreSystem.save();
    if (typeof SupabaseSystem !== 'undefined') {
      SupabaseSystem.saveRecord(this.score, this.elapsed);
    } else {
      alert('SupabaseSystem não encontrado!');
    }
    Bullets.clear();
    EnemyBullets.clear();
    ComboSystem.reset();
    // Ocultar boss bar
    const bb = document.getElementById('bossBar');
    if (bb) bb.classList.remove('visible');
    if (typeof PauseUI !== 'undefined' && PauseUI._elPauseBtn) {
      PauseUI.syncPauseBtn('gameover');
      PauseUI.hidePauseMenu();
    }
    EnergySystem.showBar(false);
    OverdriveSystem.reset();
    ChaosMode.reset();
    SlowMotion.reset();
    MultiplayerSystem.clear();
    // Esconde HUD/badge do Modo Âncora ao acabar o jogo (cooldown congela aqui)
    if (typeof AnchorMode !== 'undefined' && AnchorMode._hudEl) {
      AnchorMode._hudEl.classList.remove('visible');
      if (AnchorMode._cdBadgeEl)  AnchorMode._cdBadgeEl.classList.remove('visible');
      if (AnchorMode._pulseBtnEl) AnchorMode._pulseBtnEl.classList.remove('visible');
    }
  },

  togglePause() {
    // Delegado ao PauseEvents para manter lógica centralizada
    if (this.state === 'playing')       PauseEvents._doPause();
    else if (this.state === 'paused')   ResumeSystem.resume();
  },

  update(dt) {
    if (this.state !== 'playing') return;

    // SlowMotion modifies effective dt for gameplay systems
    SlowMotion.update(dt);
    const gdt = dt * SlowMotion.dt;

    this.elapsed += dt;  // real time always advances at full speed

    // Core systems
    DifficultySystem.update();
    EnergySystem.update(dt);
    UltimateSystem.update(dt);
    DashSystem.update(gdt);
    ComboSystem.update(gdt);
    ComboSystem._tickBar(gdt);
    PowerUps.update(gdt);
    BossSystem.update(gdt);
    BossPhaseSystem.update(BossSystem.boss, gdt);
    EnemyBullets.update(gdt);
    ScreenFX.update(dt);
    FloatText.update(gdt);
    Performance.clampPools();

    // Anchor Mode
    AnchorMode.update(gdt);

    // Expansion systems
    PortalSystem.update(gdt);
    DroneSystem.update(gdt);
    ShieldSystem.update(gdt);
    BlackHoleSystem.update(gdt);
    ChestSystem.update(gdt);
    OverdriveSystem.update(gdt);
    EventSystem.update(gdt);
    ArenaSystem.update(dt);
    ChaosMode.update(gdt);
    ShipEvolution.update();
    RandomRewards.check(this.elapsed);
    ChaosMode.check(this.elapsed);
    HighScoreSystem.check(this.score, this.elapsed);
    HighScoreSystem.update(gdt);

    Player.update(gdt);
    MultiplayerSystem.update(gdt);   // P2 update
    Bullets.update(gdt);
    Enemies.update(gdt);
    Particles.update(gdt);
    Collision.check();
    MultiplayerSystem.checkCollisions();  // P2 collisions
  },

  draw() {
    // Limpar canvas com preto
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    switch (this.state) {
      case 'menu':
        UI.drawMenu();
        break;

      case 'playing':
        UI.drawArena();
        HighScoreSystem.draw();
        PortalSystem.draw();
        ChestSystem.draw();
        BlackHoleSystem.draw();
        PowerUps.draw();
        Particles.draw();
        EnemyBullets.draw();
        Bullets.draw();
        Enemies.draw();
        BossSystem.draw();
        DroneSystem.draw();
        ShieldSystem.draw();
        AnchorMode.draw();           // aura âncora (atrás da nave)
        Player.draw();
        MultiplayerSystem.draw();    // P2 draw
        FloatText.draw();
        EventSystem.drawOverlay();
        UI.drawHUD();
        UI.drawDashCooldown();
        UltimateSystem.drawHUD();
        break;

      case 'paused':
        UI.drawArena();
        PortalSystem.draw();
        ChestSystem.draw();
        BlackHoleSystem.draw();
        PowerUps.draw();
        Particles.draw();
        EnemyBullets.draw();
        Bullets.draw();
        Enemies.draw();
        BossSystem.draw();
        DroneSystem.draw();
        ShieldSystem.draw();
        AnchorMode.draw();           // aura âncora no pause também
        Player.draw();
        MultiplayerSystem.draw();    // P2 draw
        FloatText.draw();
        UI.drawHUD();
        UI.drawDashCooldown();
        UltimateSystem.drawHUD();
        UI.drawPause();
        break;

      case 'gameover':
        UI.drawArena();
        Particles.draw();
        Enemies.draw();
        UI.drawHUD();
        UI.drawGameOver();
        break;
    }

    ctx.restore();
  },

  loop(ts) {
    const dt = Math.min((ts - this.lastTime) / 1000, 0.05);
    this.lastTime = ts;

    // Limpar toda a área física do canvas (incluindo barras laterais)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.update(dt);

    // Apply screen shake via canvas transform offset
    const sx = ScreenFX.shakeX * scale;
    const sy = ScreenFX.shakeY * scale;
    if (sx !== 0 || sy !== 0) {
      ctx.save();
      ctx.translate(sx, sy);
      this.draw();
      ctx.restore();
    } else {
      this.draw();
    }

    requestAnimationFrame(t => this.loop(t));
  },
};


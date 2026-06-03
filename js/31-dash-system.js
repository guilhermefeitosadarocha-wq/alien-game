// ═══════════════════════════════════════════════════════════
//  DASH SYSTEM
// ═══════════════════════════════════════════════════════════
const DashSystem = {
  active: false,
  timer: 0,
  cooldown: 0,
  DASH_DURATION: 0.15,
  DASH_COOLDOWN: 1.2,
  DASH_SPEED: 680,
  dx: 0, dy: 0,
  // Trail particles
  _trailTimer: 0,

  reset() {
    this.active   = false;
    this.timer    = 0;
    this.cooldown = 0;
    this.dx = 0; this.dy = 0;
  },

  tryDash(dirX, dirY) {
    if (this.active || this.cooldown > 0) return;
    if (typeof AnchorMode !== 'undefined' && AnchorMode.active) return;
    if (Math.abs(dirX) < 0.01 && Math.abs(dirY) < 0.01) return;
    this.active = true;
    this.timer  = this.DASH_DURATION;
    this.dx = dirX; this.dy = dirY;
    Player.invincible = Math.max(Player.invincible, this.DASH_DURATION + 0.05);
    ScreenFX.flash('rgba(0,200,255,0.14)', 0.18);
    Particles.burst(Player.x, Player.y, 10, 'rgba(0,200,255,', 1.4);
    SFX.play('dash');
    EnergySystem.spend(15);   // dash costs 15 energy
  },

  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;

    // Não aplica dash se P1 morreu em modo multiplayer
    if (this.active && Player._dead) {
      this.active   = false;
      this.cooldown = 0;
      return;
    }

    if (this.active) {
      this.timer -= dt;
      // Apply dash movement
      const nx = Player.x + this.dx * this.DASH_SPEED * dt;
      const ny = Player.y + this.dy * this.DASH_SPEED * dt;
      Player.x = Util.clamp(nx, CONFIG.PLAYER_SIZE, CONFIG.TARGET_W - CONFIG.PLAYER_SIZE);
      Player.y = Util.clamp(ny, CONFIG.PLAYER_SIZE, CONFIG.TARGET_H - CONFIG.PLAYER_SIZE);

      // Trail particles
      this._trailTimer -= dt;
      if (this._trailTimer <= 0) {
        this._trailTimer = 0.03;
        Particles.burst(Player.x, Player.y, 3, 'rgba(0,180,255,', 0.6);
      }

      if (this.timer <= 0) {
        this.active   = false;
        this.cooldown = this.DASH_COOLDOWN;
      }
    }
  },

  // Draw cooldown indicator under player
  draw() {
    // Não desenha se P1 morreu em modo multiplayer (evita arco "portal" na origem)
    if (Player._dead) return;
    if (this.cooldown <= 0 && !this.active) return;
    ctx.save();
    const r = CONFIG.PLAYER_SIZE + 6;
    const prog = this.active ? 1 : (1 - this.cooldown / this.DASH_COOLDOWN);
    ctx.beginPath();
    ctx.arc(Player.x, Player.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
    ctx.strokeStyle = this.active ? 'rgba(0,255,200,0.9)' : 'rgba(0,200,255,0.5)';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur  = 8;
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.restore();
  },
};


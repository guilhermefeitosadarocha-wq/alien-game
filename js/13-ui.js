// ═══════════════════════════════════════════════════════════
//  UI — HUD, MENU, PAUSE, GAME OVER
// ═══════════════════════════════════════════════════════════
const UI = {
  // Formata tempo mm:ss
  formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  },

  drawHUD() {
    const pad = 18;
    ctx.save();

    // --- Score ---
    ctx.font      = 'bold 22px "Courier New"';
    ctx.fillStyle = '#ffdd00';
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur  = 10;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Game.score}`, CONFIG.TARGET_W / 2 - 120, pad);

    // label
    ctx.font      = '11px "Courier New"';
    ctx.fillStyle = CONFIG.NEON_DIM;
    ctx.shadowBlur = 0;
    ctx.fillText('SCORE', CONFIG.TARGET_W / 2 - 120, pad + 24);

    // --- Moedas (canvas HUD) ---
    ctx.font        = 'bold 15px "Courier New"';
    ctx.fillStyle   = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur  = 10;
    ctx.textAlign   = 'left';
    ctx.fillText('\uD83E\uDE99 ' + CoinSystem.get(), pad, pad + 44);

    // --- Tempo ---
    ctx.font      = 'bold 22px "Courier New"';
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.fillText(this.formatTime(Game.elapsed), CONFIG.TARGET_W / 2, pad);
    ctx.font      = '11px "Courier New"';
    ctx.fillStyle = CONFIG.NEON_DIM;
    ctx.shadowBlur = 0;
    ctx.fillText('TEMPO', CONFIG.TARGET_W / 2, pad + 24);

    // --- Vidas ---
    ctx.textAlign = 'right';
    ctx.shadowColor = '#ff4466';
    ctx.shadowBlur  = 10;
    ctx.font        = '20px serif';
    let heartsStr = '';
    for (let i = 0; i < CONFIG.PLAYER_LIVES; i++) {
      heartsStr += i < Player.lives ? '❤️' : '🖤';
    }
    ctx.globalAlpha = 1.0;
    ctx.shadowColor = '#ff4466';
    ctx.shadowBlur = 10;
    ctx.textBaseline = 'top';
    ctx.fillText(heartsStr, CONFIG.TARGET_W - pad, pad - 2);
    ctx.globalAlpha = 1.0;

    // label
    ctx.font      = '11px "Courier New"';
    ctx.fillStyle = CONFIG.NEON_DIM;
    ctx.shadowBlur = 0;
    ctx.fillText('VIDAS', CONFIG.TARGET_W - pad, pad + 24);

    HighScoreSystem.drawHUD();

    ctx.restore();

    // --- Vidas overlay mobile: desenhado FORA do transform do canvas ---
    // Garante que os corações apareçam em qualquer escala/offset mobile.
    if (MobileDetect.isMobile) {
      ctx.save();
      // Zera qualquer transform ativo — coordenadas de tela física real
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Calcula posição em pixels de tela reais
      const heartFontSize = Math.round(20 * scale);
      const hx = canvas.width  - Math.round(16 * scale);
      const hy = Math.round(offsetY > 0 ? offsetY + 10 * scale : 10 * scale);
      ctx.font         = heartFontSize + 'px serif';
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'top';
      ctx.globalAlpha  = 1.0;
      ctx.shadowColor  = '#ff4466';
      ctx.shadowBlur   = Math.round(10 * scale);
      ctx.fillText(heartsStr, hx, hy);
      // label VIDAS
      const labelSize = Math.max(9, Math.round(11 * scale));
      ctx.font         = labelSize + 'px "Courier New"';
      ctx.fillStyle    = 'rgba(0,200,255,0.6)';
      ctx.shadowBlur   = 0;
      ctx.fillText('VIDAS', hx, hy + heartFontSize + 2);
      ctx.restore();
    }
  },

  drawArena() {
    const theme = (typeof ArenaSystem !== 'undefined') ? ArenaSystem.getTheme() : null;
    const bg    = theme ? theme.bg : '#030a12';
    const gc    = theme ? theme.gridColor   : 'rgba(0,150,200,0.07)';
    const bc    = theme ? theme.borderColor : 'rgba(0,200,255,0.55)';
    const cc    = theme ? theme.cornerColor : CONFIG.NEON_COLOR;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CONFIG.TARGET_W, CONFIG.TARGET_H);

    ctx.save();
    ctx.strokeStyle = gc; ctx.lineWidth = 1;
    // No mobile com baixa resolução, grade maior = menos linhas = melhor FPS
    const gs = MobileDetect.isMobile ? 60 : 40;
    for (let x = 0; x <= CONFIG.TARGET_W; x += gs) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CONFIG.TARGET_H); ctx.stroke();
    }
    for (let y = 0; y <= CONFIG.TARGET_H; y += gs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CONFIG.TARGET_W, y); ctx.stroke();
    }

    const bw = 3;
    ctx.shadowColor = cc; ctx.shadowBlur = 20;
    ctx.strokeStyle = bc; ctx.lineWidth  = bw;
    ctx.strokeRect(bw / 2, bw / 2, CONFIG.TARGET_W - bw, CONFIG.TARGET_H - bw);

    const cLen = 24;
    ctx.strokeStyle = cc; ctx.lineWidth = 2;
    const corners = [
      [0, 0, 1, 1], [CONFIG.TARGET_W, 0, -1, 1],
      [0, CONFIG.TARGET_H, 1, -1], [CONFIG.TARGET_W, CONFIG.TARGET_H, -1, -1],
    ];
    for (const [cx, cy, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * cLen, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * cLen);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawMenu() {
    // Fundo + arena
    this.drawArena();

    ctx.save();
    // Vinheta
    const vg = ctx.createRadialGradient(
      CONFIG.TARGET_W/2, CONFIG.TARGET_H/2, 80,
      CONFIG.TARGET_W/2, CONFIG.TARGET_H/2, CONFIG.TARGET_W * 0.72
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, CONFIG.TARGET_W, CONFIG.TARGET_H);

    // Título
    const cx = CONFIG.TARGET_W / 2;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00eeff';
    ctx.shadowBlur  = 40;
    ctx.font        = 'bold 72px "Courier New"';
    ctx.fillStyle   = '#00eeff';
    ctx.fillText('NEON', cx, CONFIG.TARGET_H / 2 - 80);

    ctx.font      = 'bold 72px "Courier New"';
    ctx.fillStyle = '#ff00cc';
    ctx.shadowColor = '#ff00cc';
    ctx.shadowBlur = 28;
    ctx.fillText('SIEGE', cx, CONFIG.TARGET_H / 2 - 10);

    // Subtítulo
    ctx.font      = '14px "Courier New"';
    ctx.fillStyle = '#ffdd00';
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur  = 8;
    ctx.fillText('ARCADE · SURVIVAL · WAVE', cx, CONFIG.TARGET_H / 2 + 48);

    // Botão PLAY
    const bw2 = 180, bh2 = 52, bx = cx - bw2/2, by = CONFIG.TARGET_H/2 + 90;
    ctx.strokeStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur  = 20;
    ctx.lineWidth   = 2;
    ctx.fillStyle   = 'rgba(0,255,136,0.12)';
    this._roundRect(bx, by, bw2, bh2, 6);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.font        = 'bold 22px "Courier New"';
    ctx.fillText('▶  PLAY', cx, by + bh2/2);

    // Instruções
    ctx.font      = '12px "Courier New"';
    ctx.fillStyle = 'rgba(0,200,255,0.4)';
    ctx.shadowBlur = 0;
    ctx.fillText('WASD mover · Mouse mirar · Clique atirar · P pausar', cx, CONFIG.TARGET_H - 160);

    ctx.restore();

    // Salva área do botão
    this._menuBtnRect = { x: bx, y: by, w: bw2, h: bh2 };

    // Mostra botão CONTROLS (DOM) no menu
    const _sb = document.getElementById('settingsBtn');
    if (_sb && !_sb.classList.contains('visible')) _sb.classList.add('visible');
    // Mostra botão de perfil no menu
    const _pb = document.getElementById('profileMenuBtn');
    if (_pb && !_pb.classList.contains('visible')) _pb.classList.add('visible');
    // Mostra botão multiplayer no menu
    MultiplayerSystem.showToggleBtn(true);
  },

  drawPause() {
    // O menu real de pause é DOM (#pauseOverlay).
    // O canvas apenas escurece levemente o fundo do jogo.
    ctx.save();
    ctx.fillStyle = 'rgba(0,5,15,0.45)';
    ctx.fillRect(0, 0, CONFIG.TARGET_W, CONFIG.TARGET_H);
    ctx.restore();
  },

  drawGameOver() {
    // Fundo escuro simples — a tela real é o overlay DOM (#gameOverDOM)
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.fillRect(0, 0, CONFIG.TARGET_W, CONFIG.TARGET_H);
    ctx.restore();
    // Botão rect zerado — cliques gerenciados pelo DOM
    this._gameOverBtnRect = null;
  },

  _menuBtnRect: null,
  _gameOverBtnRect: null,

  _roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  },

  clickMenu(wx, wy) {
    const b = this._menuBtnRect;
    if (b && wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) {
      SFX.play('menu_open');
      // Show match modifiers — start button inside triggers Game.start()
      MatchModifiers.show();
    }
  },

  clickGameOver(wx, wy) {
    // Cliques gerenciados pelo overlay DOM (#gameOverDOM)
  },

  // Dash cooldown arc drawn in canvas HUD (called after Player.draw)
  drawDashCooldown() {
    if (DashSystem.cooldown <= 0 && !DashSystem.active) return;
    const pad = 18;
    const cx  = pad + 40;
    const cy  = CONFIG.TARGET_H - pad - 20;
    const r   = 14;
    const prog = DashSystem.active ? 1 : (1 - DashSystem.cooldown / DashSystem.DASH_COOLDOWN);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2, false);
    ctx.strokeStyle = 'rgba(0,200,255,0.18)';
    ctx.lineWidth   = 3;
    ctx.stroke();
    if (prog > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog, false);
      ctx.strokeStyle = DashSystem.active ? '#00ffcc' : CONFIG.NEON_COLOR;
      ctx.shadowColor = DashSystem.active ? '#00ffcc' : CONFIG.NEON_COLOR;
      ctx.shadowBlur  = 8;
      ctx.lineWidth   = 3;
      ctx.stroke();
    }
    ctx.font      = '10px "Courier New"';
    ctx.fillStyle = 'rgba(0,200,255,0.6)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DASH', cx, cy);
    ctx.restore();
  },
};


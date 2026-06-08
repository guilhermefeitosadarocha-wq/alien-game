// ═══════════════════════════════════════════════════════════
//  ONLINE MULTIPLAYER — Fase 1.4: jogadores na arena
//
//  Quando active=true, Game.update/draw chamam o loop daqui:
//  Player movement, balas locais, broadcast/interp da nave
//  remota, balas remotas. Arena = mesma do single player.
//  Sem inimigos/bosses/itens — só dois triângulos atirando.
// ═══════════════════════════════════════════════════════════

const ONLINE_SUPABASE_URL = 'https://xasgwdhartnrivgrzvri.supabase.co';
const ONLINE_SUPABASE_KEY = 'sb_publishable_L-_YjiayMOqtrX324DQy9w_JZbyZw-H';

function _onlineGerarCodigo() {
  const alfa = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += alfa[Math.floor(Math.random() * alfa.length)];
  return 'NEON-' + s;
}

function _onlineNormalizaCodigo(t) {
  return (t || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

const OnlineMultiplayer = {
  // ── Estado público ─────────────────────────────────────
  active:    false,
  role:      null,        // 'host' | 'guest'
  codigo:    null,
  conectado: false,
  inRoom:    false,
  meuId:     'P' + Math.random().toString(36).slice(2, 5).toUpperCase(),

  // ── Estado interno ─────────────────────────────────────
  _supa:           null,
  _canal:          null,
  _outroId:        null,
  _outraNave:      null,           // { ativa, buffer:[{x,y,a,t}] }
  _remoteBullets:  [],
  _posTimer:       0,
  _origBulletSpawn: null,
  _enemyBroadcastTimer: 0,
  _guestInvincibleTimer: 0,

  // ── Inicialização ──────────────────────────────────────
  init() {
    console.log('[OnlineMultiplayer] módulo carregado (Fase 1.4)');

    try {
      this._supa = supabase.createClient(ONLINE_SUPABASE_URL, ONLINE_SUPABASE_KEY);
    } catch (e) {
      console.error('[OnlineMultiplayer] Supabase init falhou:', e);
    }

    this._wireButtons();
    this._hookBulletSpawn();

    window.addEventListener('beforeunload', () => {
      if (this._canal) try {
        this._canal.send({ type: 'broadcast', event: 'sai', payload: { id: this.meuId } });
      } catch (e) {}
    });

    this._autoJoinFromURL();
  },

  _wireButtons() {
    const _g = id => document.getElementById(id);

    const btn = _g('onlineBtn');
    if (btn) btn.addEventListener('click', () => this.showLobby());

    const close = _g('onlineCloseBtn');
    if (close) close.addEventListener('click', () => {
      if (this.inRoom) this.sairDaSala();
      this.hideLobby();
    });

    const criarBtn = _g('onlineCriarBtn');
    if (criarBtn) criarBtn.addEventListener('click', () => this.criarSala());

    const entrarBtn = _g('onlineEntrarBtn');
    if (entrarBtn) entrarBtn.addEventListener('click', () => {
      const input = _g('onlineCodigoInput');
      if (input) this.entrarSala(input.value);
    });

    const input = _g('onlineCodigoInput');
    if (input) input.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.entrarSala(input.value);
    });

    const copiarBtn = _g('onlineCopiarBtn');
    if (copiarBtn) copiarBtn.addEventListener('click', () => this._copiarLink());

    const sairBtn = _g('onlineSairLobbyBtn');
    if (sairBtn) sairBtn.addEventListener('click', () => this.sairDaSala());

    // INICIAR PARTIDA (host only, visível quando guest conectado)
    const iniciarBtn = _g('onlineIniciarBtn');
    if (iniciarBtn) iniciarBtn.addEventListener('click', () => this._hostStartMatch());
  },

  _hookBulletSpawn() {
    // Wrapper em Bullets.spawn pra broadcastar tiro quando em modo online
    this._origBulletSpawn = Bullets.spawn.bind(Bullets);
    const self = this;
    Bullets.spawn = function(x, y, angle) {
      self._origBulletSpawn(x, y, angle);
      if (self.active && self._canal && self.conectado) {
        try {
          self._canal.send({
            type: 'broadcast', event: 'tiro',
            payload: { x, y, a: angle, t: performance.now() }
          });
        } catch (e) {}
      }
    };
  },

  // ── Lobby UI ───────────────────────────────────────────
  showLobby() {
    const el = document.getElementById('onlineLobby');
    if (el) el.classList.add('visible');
  },
  hideLobby() {
    const el = document.getElementById('onlineLobby');
    if (el) el.classList.remove('visible');
  },
  _showMainView() {
    const m = document.getElementById('onlineLobbyMain');
    const r = document.getElementById('onlineLobbyRoom');
    if (m) m.classList.remove('hide');
    if (r) r.classList.add('hide');
  },
  _showRoomView() {
    const m = document.getElementById('onlineLobbyMain');
    const r = document.getElementById('onlineLobbyRoom');
    if (m) m.classList.add('hide');
    if (r) r.classList.remove('hide');
  },
  _setStatus(msg) {
    const el = document.getElementById('onlineStatusMsg');
    if (el) el.textContent = msg;
  },
  _showErro(msg) {
    const el = document.getElementById('onlineLobbyErro');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hide');
    setTimeout(() => el.classList.add('hide'), 4000);
  },
  _showIniciarBtn(show) {
    const btn = document.getElementById('onlineIniciarBtn');
    if (!btn) return;
    btn.style.display = show ? '' : 'none';
  },

  // ── Criar / Entrar / Sair da sala ──────────────────────
  criarSala() {
    if (!this._supa) { this._showErro('Supabase não inicializado.'); return; }
    const codigo = _onlineGerarCodigo();
    this._abrirSala(codigo, true);
  },

  entrarSala(codigoRaw) {
    if (!this._supa) { this._showErro('Supabase não inicializado.'); return; }
    let c = _onlineNormalizaCodigo(codigoRaw);
    if (c.length < 4) { this._showErro('Digite um código válido (ex: NEON-A23K)'); return; }
    if (!c.startsWith('NEON-')) c = 'NEON-' + c.replace(/^-+/, '');
    this._abrirSala(c, false);
  },

  _abrirSala(codigo, comoHost) {
    this.codigo  = codigo;
    this.role    = comoHost ? 'host' : 'guest';
    this.inRoom  = true;
    this._outroId = null;

    const codigoView = document.getElementById('onlineCodigoView');
    if (codigoView) codigoView.textContent = codigo;
    this._setStatus(comoHost ? 'Aguardando segundo jogador...' : 'Conectando...');
    this._showIniciarBtn(false);
    this.showLobby();
    this._showRoomView();

    this._canal = this._supa.channel('neon-' + codigo, {
      config: { broadcast: { self: false } }
    });

    this._registerHandlers(this._canal);

    this._canal.subscribe(estado => {
      if (estado === 'SUBSCRIBED') {
        this.conectado = true;
        if (!comoHost) {
          this._canal.send({
            type: 'broadcast', event: 'hello',
            payload: { id: this.meuId }
          });
        }
      } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
        this._showErro('Erro de conexão. Tente novamente.');
        this.sairDaSala();
      }
    });
  },

  _registerHandlers(c) {
    c.on('broadcast', { event: 'hello' }, ({ payload }) => {
      if (this.role !== 'host') return;
      this._outroId = payload.id;
      this._setStatus('✓ Jogador conectado! Pronto para começar.');
      this._showIniciarBtn(true);
      this._canal.send({
        type: 'broadcast', event: 'hello_ack',
        payload: { id: this.meuId }
      });
    });

    c.on('broadcast', { event: 'hello_ack' }, ({ payload }) => {
      if (this.role !== 'guest') return;
      this._outroId = payload.id;
      this._setStatus('✓ Conectado ao host! Aguardando início da partida...');
    });

    c.on('broadcast', { event: 'sai' }, ({ payload }) => {
      if (this._outroId === payload.id) {
        this._outroId = null;
        this._setStatus(this.role === 'host'
          ? 'Outro jogador saiu. Aguardando...'
          : 'Host saiu da sala.');
        this._showIniciarBtn(false);
        if (this._outraNave) this._outraNave.ativa = false;
      }
    });

    // Host disparou o início
    c.on('broadcast', { event: 'start_match' }, () => {
      if (this.role !== 'guest') return;
      this._startMatch();
    });

    // Posição do outro jogador (10Hz)
    c.on('broadcast', { event: 'pos' }, ({ payload }) => {
      if (!this._outraNave) return;
      this._outraNave.ativa = true;
      this._outraNave.buffer.push({
        x: payload.x, y: payload.y, a: payload.a,
        t: performance.now(),
      });
      if (this._outraNave.buffer.length > 30) this._outraNave.buffer.shift();
    });

    // Tiro do outro jogador (compensação de latência)
    c.on('broadcast', { event: 'tiro' }, ({ payload }) => {
      const lat = Math.max(0, (performance.now() - payload.t) / 1000);
      const vx = Math.cos(payload.a) * CONFIG.BULLET_SPEED;
      const vy = Math.sin(payload.a) * CONFIG.BULLET_SPEED;
      this._remoteBullets.push({
        x: payload.x + vx * lat,
        y: payload.y + vy * lat,
        vx, vy,
        life: Math.max(0, CONFIG.BULLET_LIFE - lat),
      });
    });

    // ── FASE 2+4: Estado do mundo do host (inimigos + lasers + boss + score) ──
    c.on('broadcast', { event: 'world_state' }, ({ payload }) => {
      if (this.role !== 'guest') return;

      // Inimigos comuns
      if (Array.isArray(payload.enemies)) {
        Enemies.pool = payload.enemies.map(e => ({
          x: e.x, y: e.y, type: e.type, emoji: e.emoji,
          size: e.size, hp: e.hp, maxHp: e.maxHp,
          glow: e.glow, electricPulse: e.electricPulse || 0,
          scoreBonus: 0, coinBonus: 0, behaviour: 'chase',
          zigzagTimer: 0, zigzagAngle: 0, shootTimer: 0,
          speedFactor: 1, active: true,
        }));
      }

      // Lasers (EnemyBullets)
      if (Array.isArray(payload.enemyBullets)) {
        EnemyBullets.pool = payload.enemyBullets.map(b => ({
          x: b.x, y: b.y, vx: b.vx, vy: b.vy,
          life: b.life, maxLife: b.maxLife,
          r: b.r, isRobotLaser: !!b.isRobotLaser,
        }));
        // Aplica colisão dos lasers vs Player local
        this._checkEnemyBulletsVsLocalPlayer();
      }

      // Boss
      if (payload.boss) {
        const b = payload.boss;
        if (!BossSystem.boss) {
          if (!BossSystem._barEl)   BossSystem._barEl   = document.getElementById('bossBar');
          if (!BossSystem._fillEl)  BossSystem._fillEl  = document.getElementById('bossBarFill');
          if (!BossSystem._labelEl) BossSystem._labelEl = document.getElementById('bossBarLabel');
          if (BossSystem._barEl) BossSystem._barEl.classList.add('visible');
        }
        BossSystem.boss = {
          x: b.x, y: b.y, size: b.size, emoji: b.emoji,
          theme: b.theme, glowColor: b.glowColor, hitColor: b.hitColor,
          hp: b.hp, maxHp: b.maxHp, name: b.name,
        };
        BossSystem._introTimer = b.intro ? BossSystem._INTRO_DUR * 0.5 : 0;
        BossSystem._updateBar();
      } else {
        if (BossSystem.boss) {
          BossSystem.boss = null;
          if (BossSystem._barEl) BossSystem._barEl.classList.remove('visible');
        }
      }

      if (typeof payload.score === 'number') {
        Game.score = payload.score;
      }
    });

    // ── FASE 2: Notificação do host que o GUEST tomou dano ──
    c.on('broadcast', { event: 'guest_hit' }, () => {
      if (this.role !== 'guest') return;
      Player.hit();
    });
  },

  sairDaSala() {
    if (this._canal) {
      try {
        this._canal.send({ type: 'broadcast', event: 'sai', payload: { id: this.meuId } });
      } catch (e) {}
      try { this._supa.removeChannel(this._canal); } catch (e) {}
      this._canal = null;
    }
    this.codigo    = null;
    this.role      = null;
    this.conectado = false;
    this.inRoom    = false;
    this._outroId  = null;
    this._outraNave = null;
    this._remoteBullets = [];
    this._showIniciarBtn(false);
    this._showMainView();
    const input = document.getElementById('onlineCodigoInput');
    if (input) input.value = '';
  },

  // ── Iniciar partida ────────────────────────────────────
  _hostStartMatch() {
    if (this.role !== 'host') return;
    if (!this._outroId) { this._showErro('Aguarde o outro jogador entrar.'); return; }
    try {
      this._canal.send({ type: 'broadcast', event: 'start_match', payload: {} });
    } catch (e) {}
    this._startMatch();
  },

  _startMatch() {
    this.active = true;

    // Força MP LOCAL desabilitado (não pode rodar os dois ao mesmo tempo)
    if (typeof MultiplayerSystem !== 'undefined') {
      MultiplayerSystem.enabled = false;
    }

    // Game.start reseta tudo. Os sistemas "mundo" não rodam graças aos
    // desvios em Game.update / Game.draw quando active=true.
    Game.start();

    // De novo (Game.start pode mexer no toggle do MP LOCAL)
    if (typeof MultiplayerSystem !== 'undefined') {
      MultiplayerSystem.enabled = false;
      MultiplayerSystem.showToggleBtn(false);
    }

    this._outraNave = { ativa: true, buffer: [] };
    this._remoteBullets = [];
    this._posTimer = 0;

    this.hideLobby();
  },

  // ── Copiar link / Auto-join ────────────────────────────
  async _copiarLink() {
    if (!this.codigo) return;
    const link = location.origin + location.pathname + '?sala=' + encodeURIComponent(this.codigo);
    const btn = document.getElementById('onlineCopiarBtn');
    if (!btn) return;
    const originalText = btn.textContent;
    try {
      await navigator.clipboard.writeText(link);
      btn.textContent = '✓ LINK COPIADO';
    } catch (e) {
      const tmp = document.createElement('textarea');
      tmp.value = link;
      document.body.appendChild(tmp);
      tmp.select();
      try { document.execCommand('copy'); btn.textContent = '✓ LINK COPIADO'; }
      catch (e2) { btn.textContent = '✕ FALHOU'; }
      document.body.removeChild(tmp);
    }
    setTimeout(() => { btn.textContent = originalText; }, 1800);
  },

  _autoJoinFromURL() {
    const params = new URLSearchParams(location.search);
    const salaParam = params.get('sala');
    if (!salaParam) return;
    setTimeout(() => {
      this.showLobby();
      this.entrarSala(salaParam);
    }, 300);
  },

  // ═════════════════════════════════════════════════════
  //  GAME LOOP — chamado pelo Game.update/draw quando
  //  OnlineMultiplayer.active === true
  // ═════════════════════════════════════════════════════
  update(dt) {
    Game.elapsed += dt;

    // Sistemas locais leves
    DashSystem.update(dt);
    ScreenFX.update(dt);

    // Player local (movimento, rotação, tiro)
    Player.update(dt);

    // Balas locais
    Bullets.update(dt);

    // Balas remotas
    for (let i = this._remoteBullets.length - 1; i >= 0; i--) {
      const b = this._remoteBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.x > CONFIG.TARGET_W || b.y < 0 || b.y > CONFIG.TARGET_H) {
        this._remoteBullets.splice(i, 1);
      }
    }

    Particles.update(dt);
    FloatText.update(dt);

    // ── HOST: roda inimigos + colisões + broadcast do estado do mundo ──
    if (this.role === 'host') {
      DifficultySystem.update();
      Enemies.update(dt);
      Collision.check();                  // balas do host vs inimigos + player do host vs inimigos
      this._checkRemoteBulletsVsEnemies(); // balas do guest vs inimigos
      this._checkRemotePlayerVsEnemies(dt);// player do guest vs inimigos
      // Boss (Fase 4): host roda update + verifica colisões remotas
      BossSystem.update(dt);
      EnemyBullets.update(dt); // movimenta lasers + colisão vs Player do host
      this._checkRemoteBulletsVsBoss();
      this._checkRemotePlayerVsBoss(dt);

      this._enemyBroadcastTimer -= dt;
      if (this._enemyBroadcastTimer <= 0) {
        this._enemyBroadcastTimer = 0.1; // 10Hz
        this._broadcastWorldState();
      }
    }

    // Broadcast minha posição a 10Hz
    this._posTimer -= dt;
    if (this._posTimer <= 0 && this._canal && this.conectado) {
      this._posTimer = 0.1;
      try {
        this._canal.send({
          type: 'broadcast', event: 'pos',
          payload: { x: Player.x, y: Player.y, a: Player.angle, t: performance.now() }
        });
      } catch (e) {}
    }
  },

  draw() {
    // Arena IGUAL ao single player (mesmo grid, bordas, cantos)
    UI.drawArena();

    Particles.draw();

    // Inimigos (host simula; guest recebe via broadcast)
    Enemies.draw();
    // Lasers de inimigos/boss (host simula; guest recebe via broadcast)
    EnemyBullets.draw();
    // Boss (host simula; guest recebe via broadcast)
    BossSystem.draw();

    // Balas remotas (pink) atrás das minhas
    this._drawRemoteBullets();

    // Balas locais (cyan)
    Bullets.draw();

    // Nave remota (pink, interpolada)
    this._drawRemotePlayer();

    // Player local (cyan)
    Player.draw();

    FloatText.draw();

    // HUD normal
    UI.drawHUD();
    UI.drawDashCooldown();
  },

  _drawRemotePlayer() {
    if (!this._outraNave || !this._outraNave.ativa) return;
    const buf = this._outraNave.buffer;
    if (buf.length === 0) return;
    if (buf.length === 1) {
      this._drawShipAt(buf[0].x, buf[0].y, buf[0].a);
      return;
    }
    const renderTime = performance.now() - 100; // 100ms atrás (interp suave)
    let i = buf.length - 1;
    while (i > 0 && buf[i].t > renderTime) i--;
    const a = buf[i];
    const b = buf[Math.min(i + 1, buf.length - 1)];
    if (a === b) {
      this._drawShipAt(a.x, a.y, a.a);
      return;
    }
    const range = b.t - a.t;
    let t = range > 0 ? (renderTime - a.t) / range : 1;
    t = Math.max(0, Math.min(1, t));
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    let da = b.a - a.a;
    if (da >  Math.PI) da -= 2 * Math.PI;
    if (da < -Math.PI) da += 2 * Math.PI;
    const ang = a.a + da * t;
    this._drawShipAt(x, y, ang);
  },

  _drawShipAt(x, y, angle) {
    const s = CONFIG.PLAYER_SIZE;
    const color = '#ff00cc'; // pink (igual à cor secundária do game)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.shadowColor = color;
    ctx.shadowBlur  = 28;

    ctx.beginPath();
    ctx.moveTo( s * 1.4,  0);
    ctx.lineTo(-s,  s * 0.75);
    ctx.lineTo(-s, -s * 0.75);
    ctx.closePath();

    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.fillStyle   = 'rgba(255,0,200,0.13)';
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur  = 8;
    ctx.lineWidth   = 1;
    ctx.strokeStyle = 'rgba(255,180,240,0.45)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle   = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 10;
    ctx.fill();

    ctx.restore();
  },

  _drawRemoteBullets() {
    if (this._remoteBullets.length === 0) return;
    ctx.save();
    ctx.shadowColor = '#ff00cc';
    ctx.shadowBlur  = 12;
    const trailLen  = 0.05;
    for (const b of this._remoteBullets) {
      const alpha = Math.max(0, b.life / CONFIG.BULLET_LIFE);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * trailLen, b.y - b.vy * trailLen);
      const grad = ctx.createLinearGradient(
        b.x, b.y, b.x - b.vx * trailLen, b.y - b.vy * trailLen
      );
      grad.addColorStop(0, `rgba(255,80,220,${alpha * 0.7})`);
      grad.addColorStop(1, 'rgba(180,40,160,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth   = CONFIG.BULLET_RADIUS * 1.2;
      ctx.lineCap     = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(b.x, b.y, CONFIG.BULLET_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,180,240,${alpha})`;
      ctx.fill();
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════
  //  FASE 2 — Inimigos host-autoritativos
  // ═════════════════════════════════════════════════════

  // Host: colisão entre balas do GUEST (em _remoteBullets) e inimigos.
  _checkRemoteBulletsVsEnemies() {
    const enemies = Enemies.pool;
    for (let bi = this._remoteBullets.length - 1; bi >= 0; bi--) {
      const b = this._remoteBullets[bi];
      if (!b) continue;
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (!e) continue;
        const dx = b.x - e.x, dy = b.y - e.y;
        const r = e.size * 0.85 + CONFIG.BULLET_RADIUS;
        if (dx*dx + dy*dy < r*r) {
          const impactX = b.x, impactY = b.y;
          this._remoteBullets.splice(bi, 1);
          e.hp--;
          Particles.burst(impactX, impactY, 4, 'rgba(255,80,220,', 0.8);
          if (e.hp <= 0) {
            const ex = e.x, ey = e.y, eSize = e.size;
            const scoreGain = (CONFIG.SCORE_PER_KILL + (e.scoreBonus || 0)) * (CONFIG._scoreBoost || 1);
            Game.score += scoreGain;
            DifficultySystem.kills++;
            Particles.burst(ex, ey, CONFIG.PARTICLE_COUNT, 'rgba(255,100,220,', 1);
            if ((e.coinBonus || 0) > 0) CoinSystem.add(e.coinBonus);
            ScreenFX.shake(eSize > 25 ? 5 : 2, 0.12);
            SFX.play('kill_enemy');
            enemies.splice(ei, 1);
          }
          break;
        }
      }
    }
  },

  // Host: colisão entre player do GUEST (última posição reportada) e inimigos.
  _checkRemotePlayerVsEnemies(dt) {
    if (this._guestInvincibleTimer > 0) {
      this._guestInvincibleTimer -= dt;
      return;
    }
    if (!this._outraNave || !this._outraNave.ativa) return;
    const buf = this._outraNave.buffer;
    if (buf.length === 0) return;
    const last = buf[buf.length - 1];
    const enemies = Enemies.pool;
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (!e) continue;
      const dx = e.x - last.x, dy = e.y - last.y;
      const r = e.size * 0.72 + CONFIG.PLAYER_SIZE * 0.8;
      if (dx*dx + dy*dy < r*r) {
        enemies.splice(ei, 1);
        this._guestInvincibleTimer = CONFIG.INVINCIBLE_TIME || 1.2;
        try {
          this._canal.send({
            type: 'broadcast', event: 'guest_hit',
            payload: { t: performance.now() }
          });
        } catch (err) {}
        break;
      }
    }
  },

  // FASE 4: Balas remotas (do guest) vs Boss — host
  _checkRemoteBulletsVsBoss() {
    if (!BossSystem.boss || BossSystem._introTimer > 0) return;
    const boss = BossSystem.boss;
    for (let bi = this._remoteBullets.length - 1; bi >= 0; bi--) {
      const b = this._remoteBullets[bi];
      if (!b) continue;
      const dx = b.x - boss.x, dy = b.y - boss.y;
      const r = boss.size * 0.9 + CONFIG.BULLET_RADIUS;
      if (dx*dx + dy*dy < r*r) {
        this._remoteBullets.splice(bi, 1);
        if (typeof BossSystem.takeDamage === 'function') {
          BossSystem.takeDamage(1);
        }
        break;
      }
    }
  },

  // FASE 4: Player remoto (guest) vs Boss — host detecta + broadcasta hit
  _checkRemotePlayerVsBoss(dt) {
    if (this._guestInvincibleTimer > 0) return;
    if (!BossSystem.boss || BossSystem._introTimer > 0) return;
    if (!this._outraNave || !this._outraNave.ativa) return;
    const buf = this._outraNave.buffer;
    if (buf.length === 0) return;
    const last = buf[buf.length - 1];
    const boss = BossSystem.boss;
    const dx = boss.x - last.x, dy = boss.y - last.y;
    const r = boss.size * 0.7 + CONFIG.PLAYER_SIZE;
    if (dx*dx + dy*dy < r*r) {
      this._guestInvincibleTimer = CONFIG.INVINCIBLE_TIME || 1.2;
      try {
        this._canal.send({
          type: 'broadcast', event: 'guest_hit',
          payload: { t: performance.now() }
        });
      } catch (e) {}
    }
  },

  // FASE 4: Lasers recebidos vs Player local — guest
  _checkEnemyBulletsVsLocalPlayer() {
    if (Player._dead || Player.invincible > 0 || Game.state !== 'playing') return;
    for (let i = 0; i < EnemyBullets.pool.length; i++) {
      const b = EnemyBullets.pool[i];
      if (!b) continue;
      const dx = b.x - Player.x, dy = b.y - Player.y;
      if (dx*dx + dy*dy < 16*16) {
        Player.hit();
        break;
      }
    }
  },

  // Host: broadcast do estado do mundo (inimigos + lasers + boss + score) a 10Hz
  _broadcastWorldState() {
    if (!this._canal || !this.conectado) return;

    // Snapshot dos inimigos
    const enemies = (Enemies.pool || []).map(e => ({
      x: e.x, y: e.y, type: e.type, emoji: e.emoji,
      size: e.size, hp: e.hp, maxHp: e.maxHp,
      glow: e.glow, electricPulse: e.electricPulse || 0,
    }));

    // Snapshot dos lasers (EnemyBullets)
    const eb = (EnemyBullets.pool || []).map(b => ({
      x: b.x, y: b.y, vx: b.vx, vy: b.vy,
      life: b.life, maxLife: b.maxLife,
      r: b.r, isRobotLaser: !!b.isRobotLaser,
    }));

    // Snapshot do boss (ou null se não tem)
    let boss = null;
    if (BossSystem.boss) {
      const b = BossSystem.boss;
      boss = {
        x: b.x, y: b.y, size: b.size, emoji: b.emoji,
        theme: b.theme, glowColor: b.glowColor, hitColor: b.hitColor,
        hp: b.hp, maxHp: b.maxHp, name: b.name,
        intro: BossSystem._introTimer > 0,
      };
    }

    try {
      this._canal.send({
        type: 'broadcast', event: 'world_state',
        payload: {
          enemies,
          enemyBullets: eb,
          boss,
          score: Game.score,
        }
      });
    } catch (err) {}
  },
};
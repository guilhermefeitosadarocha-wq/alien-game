// ═══════════════════════════════════════════════════════════
//  ADMIN LAB — painel de laboratório (Ctrl+Shift+L)
//  Acesso restrito: verificado via Supabase RPC verify_admin_lock
// ═══════════════════════════════════════════════════════════
const ADMIN_NAME = 'rapaz';

const AdminLab = {
  _panel:          null,
  _visible:        false,
  _verified:       false,
  _locked:         false,       // anti-spam pós-falha de auth
  _lockTimer:      null,
  _feedbackTimer:  null,
  _refreshTimer:   null,
  _logLines:       [],
  _spawnFrozen:    false,       // estado do freeze de spawn de inimigos

  init() {
    window.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyL') {
        e.preventDefault();
        this._toggle();
      }
    });
    this._verifyOnLoad();
  },

  // ── Toggle / Auth ─────────────────────────────────────────
  _toggle() {
    if (!this._verified) { this._authenticate(); return; }
    this._visible ? this._hide() : this._show();
  },

  _authenticate() {
    if (this._locked) return;
    const token = localStorage.getItem('ns_admin_token');
    if (!token) {
      this._toast('Token não encontrado. Defina localStorage.ns_admin_token.', true);
      this._lockFor(3000);
      return;
    }
    this._toast('Verificando...', false);
    this._rpcVerify(ADMIN_NAME, token, ok => {
      if (ok) {
        this._verified = true;
        this._build();
        this._show();
        this._addLog('Autenticado com sucesso');
      } else {
        this._toast('Acesso negado.', true);
        this._lockFor(3000);
      }
    });
  },

  _toast(msg, isError) {
    let el = document.getElementById('_alToast');
    if (!el) {
      el = document.createElement('div');
      el.id = '_alToast';
      el.style.cssText = [
        'position:fixed;bottom:20px;left:50%;transform:translateX(-50%)',
        'background:rgba(0,0,20,0.96);border-radius:4px',
        'font:bold 11px "Courier New";padding:7px 16px',
        'z-index:1062;pointer-events:none;transition:opacity 0.3s',
      ].join(';');
      document.body.appendChild(el);
    }
    el.textContent = '🔬 LAB: ' + msg;
    el.style.color  = isError ? '#f88' : '#0ff';
    el.style.border = '1px solid ' + (isError ? 'rgba(255,60,60,0.5)' : 'rgba(0,246,255,0.4)');
    el.style.opacity = '1';
    clearTimeout(this._feedbackTimer);
    this._feedbackTimer = setTimeout(() => { el.style.opacity = '0'; }, isError ? 3500 : 1800);
  },

  _lockFor(ms) {
    this._locked = true;
    clearTimeout(this._lockTimer);
    this._lockTimer = setTimeout(() => { this._locked = false; }, ms);
  },

  _rpcVerify(name, token, cb) {
    const url = SupabaseSystem._URL + '/rest/v1/rpc/verify_admin_lock';
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type',  'application/json');
    xhr.setRequestHeader('apikey',        SupabaseSystem._KEY);
    xhr.setRequestHeader('Authorization', 'Bearer ' + SupabaseSystem._KEY);
    xhr.onload = () => {
      let ok = false;
      try { ok = JSON.parse(xhr.responseText) === true; } catch (_) {}
      cb(xhr.status >= 200 && xhr.status < 300 && ok);
    };
    xhr.onerror = () => cb(false);
    xhr.send(JSON.stringify({ p_name: name, p_token: token }));
  },

  _verifyOnLoad() {
    const profileName = localStorage.getItem(ProfileSystem._KEY_NAME);
    if (!profileName || profileName !== ADMIN_NAME) return;
    const token = localStorage.getItem('ns_admin_token');
    if (!token) {
      console.warn('[ADMIN] perfil admin ativo mas sem token. Defina localStorage.ns_admin_token.');
      return;
    }
    this._rpcVerify(ADMIN_NAME, token, ok => {
      if (ok) {
        this._verified = true;
        this._build();
        console.log('[ADMIN] modo admin ativo');
      } else {
        console.warn('[ADMIN] token inválido pro nome do perfil ativo');
      }
    });
  },

  tryCreateAdminProfile(name) {
    return new Promise(resolve => {
      if (name !== ADMIN_NAME) { resolve('ok'); return; }
      const token = localStorage.getItem('ns_admin_token');
      if (!token) { resolve('denied'); return; }
      this._rpcVerify(ADMIN_NAME, token, ok => resolve(ok ? 'ok' : 'denied'));
    });
  },

  // ── Build DOM ─────────────────────────────────────────────
  _build() {
    if (this._panel) return;

    const style = document.createElement('style');
    style.textContent = `
      #adminLab {
        position:fixed;top:8px;right:8px;width:340px;max-height:90vh;
        overflow-y:auto;background:rgba(0,0,20,0.96);
        border:1px solid rgba(0,246,255,0.35);border-radius:6px;
        z-index:1060;font:11px "Courier New",monospace;color:#00eeff;
        scrollbar-width:thin;scrollbar-color:rgba(0,246,255,0.25) transparent;
        display:none;
      }
      #adminLab::-webkit-scrollbar{width:4px}
      #adminLab::-webkit-scrollbar-thumb{background:rgba(0,246,255,0.25);border-radius:2px}
      #alHeader{
        position:sticky;top:0;background:rgba(0,0,28,0.99);
        border-bottom:1px solid rgba(0,246,255,0.25);
        padding:7px 10px;display:flex;align-items:center;
        justify-content:space-between;z-index:2;
      }
      #alHeader span{font-weight:bold;color:#0ff;font-size:12px;letter-spacing:.1em}
      #alCloseBtn{
        background:none;border:none;color:rgba(0,246,255,0.55);
        font-size:14px;cursor:pointer;padding:0 4px;line-height:1
      }
      #alCloseBtn:hover{color:#f66}
      .al-sec{border-bottom:1px solid rgba(0,246,255,0.1)}
      .al-head{
        padding:5px 10px;cursor:pointer;
        color:rgba(0,200,255,0.65);font-size:10px;letter-spacing:.12em;
        display:flex;justify-content:space-between;align-items:center;
        user-select:none;
      }
      .al-head:hover{color:#0ff;background:rgba(0,246,255,0.04)}
      .al-body{padding:6px 10px 8px;display:none}
      .al-body.open{display:block}
      .al-row{display:flex;align-items:center;gap:5px;margin:3px 0;flex-wrap:wrap}
      .al-lbl{color:rgba(0,200,255,0.55);flex-shrink:0;min-width:58px}
      .al-val{color:#0ff;font-weight:bold}
      .al-inp{
        background:rgba(0,18,38,0.9);border:1px solid rgba(0,175,255,0.35);
        border-radius:3px;color:#0ff;font:11px "Courier New";
        padding:2px 4px;outline:none;width:52px
      }
      .al-inp:focus{border-color:rgba(0,246,255,0.75)}
      .al-inp.w40{width:40px}
      .al-inp.w64{width:64px}
      .al-btn{
        background:rgba(0,55,95,0.7);border:1px solid rgba(0,175,255,0.35);
        border-radius:3px;color:#0ff;font:10px "Courier New";
        padding:3px 8px;cursor:pointer;white-space:nowrap;transition:background .12s
      }
      .al-btn:hover{background:rgba(0,110,170,0.8);border-color:rgba(0,246,255,0.65)}
      .al-btn.danger{border-color:rgba(255,55,55,0.45);color:#f88}
      .al-btn.danger:hover{background:rgba(110,0,0,0.6);border-color:#f66;color:#faa}
      .al-btn.warn{border-color:rgba(255,200,0,0.45);color:#fd0}
      .al-btn.warn:hover{background:rgba(80,55,0,0.6);border-color:#fd0}
      .al-sel{
        background:rgba(0,18,38,0.9);border:1px solid rgba(0,175,255,0.35);
        border-radius:3px;color:#0ff;font:10px "Courier New";
        padding:2px 4px;outline:none;cursor:pointer
      }
      #alLog{
        height:80px;overflow-y:auto;font-size:10px;
        color:rgba(0,200,255,0.5);line-height:1.45;
        background:rgba(0,4,14,0.6);border-radius:3px;padding:4px 6px;
        scrollbar-width:thin;scrollbar-color:rgba(0,246,255,0.15) transparent
      }
      #alLog::-webkit-scrollbar{width:3px}
      #alLog::-webkit-scrollbar-thumb{background:rgba(0,246,255,0.18)}
      .al-log-t{color:rgba(0,246,255,0.3)}
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'adminLab';
    panel.innerHTML = this._html();
    document.body.appendChild(panel);
    this._panel = panel;

    document.getElementById('alCloseBtn').addEventListener('click', () => this._hide());

    panel.querySelectorAll('.al-head').forEach(h => {
      h.addEventListener('click', () => {
        const body  = h.nextElementSibling;
        const arrow = h.querySelector('.al-arrow');
        const open  = body.classList.toggle('open');
        if (arrow) arrow.textContent = open ? '▼' : '▶';
      });
    });

    this._bind();
    this._enableDrag();
    this._restorePos();
  },

  _sec(title, id, body, defaultOpen) {
    return `<div class="al-sec" id="alSec_${id}">
      <div class="al-head">
        <span>${title}</span><span class="al-arrow">${defaultOpen ? '▼' : '▶'}</span>
      </div>
      <div class="al-body${defaultOpen ? ' open' : ''}">${body}</div>
    </div>`;
  },

  _html() {
    return `
    <div id="alHeader">
      <span>🔬 LAB — ${ADMIN_NAME}</span>
      <button id="alCloseBtn" title="Fechar (Ctrl+Shift+L)">✕</button>
    </div>

    ${this._sec('STATUS', 'status', `
      <div class="al-row"><span class="al-lbl">State</span><span class="al-val" id="alState">—</span></div>
      <div class="al-row"><span class="al-lbl">FPS</span><span class="al-val" id="alFPS">—</span></div>
      <div class="al-row"><span class="al-lbl">Elapsed</span><span class="al-val" id="alElapsed">—</span></div>
      <div class="al-row"><span class="al-lbl">Level</span><span class="al-val" id="alLevel">—</span></div>
    `, true)}

    ${this._sec('PLAYER', 'player', `
      <div class="al-row">
        <span class="al-lbl">Lives</span>
        <input class="al-inp w40" id="alLives" type="number" min="0" max="99">
        <span class="al-lbl" style="min-width:28px">Max</span>
        <input class="al-inp w40" id="alMaxLives" type="number" min="1" max="20">
        <button class="al-btn" id="alSetLives">SET</button>
      </div>
      <div class="al-row">
        <span class="al-lbl">Speed</span>
        <input class="al-inp" id="alSpeed" type="number" min="50" max="2000">
        <button class="al-btn" id="alSetSpeed">SET</button>
      </div>
      <div class="al-row">
        <button class="al-btn warn" id="alGodMode">⚡ GOD MODE</button>
        <button class="al-btn" id="alTeleport">⊕ CENTRO</button>
      </div>
      <div class="al-row">
        <button class="al-btn" id="alHealFull">❤️ HEAL FULL</button>
        <button class="al-btn" id="alHeal">+1 VIDA</button>
        <button class="al-btn danger" id="alHealMinus">-1 VIDA</button>
      </div>
    `, true)}

    ${this._sec('ECONOMY', 'economy', `
      <div class="al-row">
        <span class="al-lbl">Coins</span>
        <input class="al-inp w64" id="alCoins" type="number" min="0">
        <button class="al-btn" id="alSetCoins">SET</button>
        <button class="al-btn" id="alAdd1k">+1000</button>
      </div>
      <div class="al-row">
        <span class="al-lbl">Score</span>
        <input class="al-inp w64" id="alScore" type="number" min="0">
        <button class="al-btn" id="alSetScore">SET</button>
        <button class="al-btn danger" id="alResetCoins">RESET COINS</button>
      </div>
    `, false)}

    ${this._sec('ENEMIES', 'enemies', `
      <div class="al-row">
        <span class="al-lbl">Pool</span>
        <span class="al-val" id="alEnemyCount">0</span>
        <button class="al-btn danger" id="alClearEnemies">CLEAR</button>
        <button class="al-btn" id="alFreezeSpawn">FREEZE SPAWN</button>
      </div>
      <div class="al-row">
        <select class="al-sel" id="alEnemyType">
          <option value="normal">normal</option>
          <option value="fast">fast</option>
          <option value="tank">tank</option>
          <option value="electric">electric</option>
          <option value="shooter">shooter</option>
        </select>
        <button class="al-btn" id="alSpawnEnemy">SPAWN</button>
      </div>
    `, false)}

    ${this._sec('BOSS', 'boss', `
      <div class="al-row">
        <span class="al-lbl">Estado</span>
        <span class="al-val" id="alBossState" style="font-size:10px">—</span>
      </div>
      <div class="al-row">
        <select class="al-sel" id="alBossSelect">
          <option value="0">🤖 ROBOT LORD</option>
          <option value="1">🤖 MECH-X9000</option>
          <option value="2">💀 DEATH CORE</option>
          <option value="3">🐉 NEON DRAGON</option>
          <option value="4">🌑 VOID TITAN</option>
        </select>
        <button class="al-btn" id="alSpawnBoss">SPAWN</button>
        <button class="al-btn" id="alSkipBoss">SKIP TIMER</button>
      </div>
      <div class="al-row">
        <input class="al-inp" id="alBossHP" type="number" min="1" placeholder="HP">
        <button class="al-btn" id="alSetBossHP">SET HP</button>
        <button class="al-btn danger" id="alInstakill">INSTAKILL</button>
      </div>
    `, false)}

    ${this._sec('POWER-UPS', 'powerups', `
      <div class="al-row">
        <span class="al-lbl">Pool</span>
        <span class="al-val" id="alPUCount">0</span>
        <button class="al-btn danger" id="alClearPU">CLEAR</button>
      </div>
      <div class="al-row">
        <select class="al-sel" id="alPUType">
          <option value="heal">💊 heal (+vida)</option>
          <option value="speed">💨 speed (turbo)</option>
          <option value="invincible">🛡️ invincible</option>
          <option value="scorex">⭐ scorex (×3)</option>
          <option value="clear">💥 clear (limpar)</option>
        </select>
        <button class="al-btn" id="alApplyPU">APPLY</button>
        <button class="al-btn" id="alSpawnPU">SPAWN</button>
      </div>
    `, false)}

    ${this._sec('ESTADO', 'estado', `
      <div class="al-row">
        <button class="al-btn" id="alStart">▶ START</button>
        <button class="al-btn danger" id="alGameOver">GAME OVER</button>
        <button class="al-btn" id="alTogglePause">PAUSE⇄</button>
      </div>
      <div class="al-row">
        <button class="al-btn" id="alShake">💥 SHAKE</button>
        <button class="al-btn" id="alFlash">⚡ FLASH</button>
        <button class="al-btn" id="alAddTime">+60s</button>
      </div>
    `, false)}

    ${this._sec('ONLINE', 'online', `
      <div class="al-row"><span class="al-lbl">Active</span><span class="al-val" id="alOnlineActive">—</span></div>
      <div class="al-row"><span class="al-lbl">Role</span><span class="al-val" id="alOnlineRole">—</span></div>
      <div class="al-row"><span class="al-lbl">InRoom</span><span class="al-val" id="alOnlineRoom">—</span></div>
      <div class="al-row"><button class="al-btn danger" id="alSairSala">SAIR DA SALA</button></div>
    `, false)}

    ${this._sec('LOG', 'log', `
      <div id="alLog"></div>
      <div class="al-row" style="margin-top:4px">
        <button class="al-btn" id="alClearLog">LIMPAR LOG</button>
      </div>
    `, true)}
    `;
  },

  // ── Event bindings ────────────────────────────────────────
  _bind() {
    const $ = id => document.getElementById(id);

    // Player
    $('alSetLives').addEventListener('click', () => {
      const v = parseInt($('alLives').value);
      const m = parseInt($('alMaxLives').value);
      if (!isNaN(v)) Player.lives = Math.max(0, v);
      if (!isNaN(m) && m > 0) CONFIG.PLAYER_LIVES = m;
      this._addLog('lives=' + Player.lives + ' maxLives=' + CONFIG.PLAYER_LIVES);
      if (Player.lives <= 0 && typeof Game !== 'undefined') Game.gameOver();
    });
    $('alSetSpeed').addEventListener('click', () => {
      const v = parseInt($('alSpeed').value);
      if (!isNaN(v) && v > 0) { CONFIG.PLAYER_SPEED = v; this._addLog('speed=' + v); }
    });
    $('alGodMode').addEventListener('click', () => {
      Player.invincible = 999;
      this._addLog('God mode: invincible=999');
    });
    $('alTeleport').addEventListener('click', () => {
      Player.x = CONFIG.TARGET_W / 2;
      Player.y = CONFIG.TARGET_H / 2;
      this._addLog('Teleported to center');
    });
    $('alHealFull').addEventListener('click', () => {
      Player.lives = CONFIG.PLAYER_LIVES;
      this._addLog('Heal full → lives=' + Player.lives);
    });
    $('alHeal').addEventListener('click', () => {
      CONFIG.PLAYER_LIVES = Math.min(CONFIG.PLAYER_LIVES + 1, 20);
      Player.lives = Math.min(Player.lives + 1, CONFIG.PLAYER_LIVES);
      this._addLog('+1 vida → lives=' + Player.lives + ' max=' + CONFIG.PLAYER_LIVES);
    });
    $('alHealMinus').addEventListener('click', () => {
      Player.lives = Math.max(0, Player.lives - 1);
      this._addLog('-1 vida → lives=' + Player.lives);
      if (Player.lives <= 0 && typeof Game !== 'undefined') Game.gameOver();
    });

    // Economy
    $('alSetCoins').addEventListener('click', () => {
      const v = parseInt($('alCoins').value);
      if (!isNaN(v) && v >= 0) {
        CoinSystem._coins = v;
        CoinUI.syncCoins();
        if (typeof ShopUI !== 'undefined' && ShopUI._elCoinAmt) ShopUI.syncCoinDisplay();
        this._addLog('Coins set=' + v);
      }
    });
    $('alAdd1k').addEventListener('click', () => {
      CoinSystem.add(1000);
      this._addLog('Added 1000 coins');
    });
    $('alSetScore').addEventListener('click', () => {
      const v = parseInt($('alScore').value);
      if (!isNaN(v) && v >= 0) { Game.score = v; this._addLog('Score set=' + v); }
    });
    $('alResetCoins').addEventListener('click', () => {
      CoinSystem.reset();
      this._addLog('Coins reset to 0');
    });

    // Enemies
    $('alClearEnemies').addEventListener('click', () => {
      const n = Enemies.pool.length;
      Enemies.pool.length = 0;
      this._addLog('Cleared ' + n + ' enemies');
    });
    $('alFreezeSpawn').addEventListener('click', () => {
      this._spawnFrozen = !this._spawnFrozen;
      if (this._spawnFrozen) {
        Enemies.spawnTimer = 999999;
        $('alFreezeSpawn').textContent = '❄ FROZEN';
        $('alFreezeSpawn').classList.add('warn');
      } else {
        Enemies.spawnTimer = 0;
        $('alFreezeSpawn').textContent = 'FREEZE SPAWN';
        $('alFreezeSpawn').classList.remove('warn');
      }
      this._addLog('Spawn freeze: ' + this._spawnFrozen);
    });
    $('alSpawnEnemy').addEventListener('click', () => {
      const type = $('alEnemyType').value;
      const def  = (typeof EnemyTypes !== 'undefined') ? EnemyTypes.get(type) : {};
      const hp   = def.hp || 1;
      const pad  = 60;
      Enemies.pool.push({
        x: Util.rand(pad, CONFIG.TARGET_W - pad),
        y: Util.rand(pad, CONFIG.TARGET_H - pad),
        type,
        emoji:       def.emoji       || '👾',
        size:        def.size        || 20,
        hp, maxHp: hp,
        speedFactor: def.speedFactor || 1.0,
        scoreBonus:  def.scoreBonus  || 0,
        coinBonus:   def.coinBonus   || 0,
        glow:        def.glow        || 'rgba(200,0,255,0.8)',
        behaviour:   def.behaviour   || 'chase',
        zigzagTimer: 0, zigzagAngle: 0,
        shootTimer: 0, electricPulse: 0, active: true,
      });
      this._addLog('Spawned enemy: ' + type);
    });

    // Boss
    $('alSpawnBoss').addEventListener('click', () => {
      if (BossSystem.boss) { this._addLog('Boss já ativo'); return; }
      BossSystem._bossIdx = parseInt($('alBossSelect').value);
      BossSystem._spawnBoss();
      this._addLog('Spawned boss idx=' + $('alBossSelect').value);
    });
    $('alSkipBoss').addEventListener('click', () => {
      BossSystem._spawnTimer = 0;
      this._addLog('Boss spawn timer → 0');
    });
    $('alSetBossHP').addEventListener('click', () => {
      if (!BossSystem.boss) { this._addLog('Sem boss ativo'); return; }
      const v = parseInt($('alBossHP').value);
      if (!isNaN(v) && v > 0) {
        BossSystem.boss.hp = v;
        BossSystem._updateBar();
        this._addLog('Boss HP set=' + v);
      }
    });
    $('alInstakill').addEventListener('click', () => {
      if (!BossSystem.boss) { this._addLog('Sem boss ativo'); return; }
      const name = BossSystem.boss.name;
      BossSystem.boss.hp = 0;
      BossSystem._killBoss();
      this._addLog('Instakill: ' + name);
    });

    // Power-ups
    $('alClearPU').addEventListener('click', () => {
      const n = PowerUps.pool.length;
      PowerUps.pool.length = 0;
      this._addLog('Cleared ' + n + ' power-ups');
    });
    $('alApplyPU').addEventListener('click', () => {
      const id = $('alPUType').value;
      const t  = PowerUps._TYPES.find(t => t.id === id);
      if (t) { t.apply(); this._addLog('Applied: ' + id); }
    });
    $('alSpawnPU').addEventListener('click', () => {
      const id = $('alPUType').value;
      const t  = PowerUps._TYPES.find(t => t.id === id);
      if (!t) return;
      const pad = 60;
      PowerUps.pool.push({
        x: Util.rand(pad, CONFIG.TARGET_W - pad),
        y: Util.rand(pad, CONFIG.TARGET_H - pad),
        type: t, life: 12, maxLife: 12, pulse: 0,
      });
      this._addLog('Spawned power-up: ' + id);
    });

    // Estado
    $('alStart').addEventListener('click',       () => { Game.start();       this._addLog('Game.start()'); });
    $('alGameOver').addEventListener('click',    () => { Game.gameOver();    this._addLog('Game.gameOver()'); });
    $('alTogglePause').addEventListener('click', () => { Game.togglePause(); this._addLog('Game.togglePause()'); });
    $('alShake').addEventListener('click',       () => { ScreenFX.shake(10, 0.5); this._addLog('ScreenFX.shake(10, 0.5)'); });
    $('alFlash').addEventListener('click',       () => { ScreenFX.flash('rgba(0,246,255,0.35)', 0.4); this._addLog('ScreenFX.flash()'); });
    $('alAddTime').addEventListener('click',     () => { Game.elapsed += 60; this._addLog('elapsed +60s → ' + Math.floor(Game.elapsed) + 's'); });

    // Online
    $('alSairSala').addEventListener('click', () => {
      if (typeof OnlineMultiplayer !== 'undefined' && OnlineMultiplayer.inRoom) {
        OnlineMultiplayer.sairDaSala();
        this._addLog('sairDaSala()');
      } else {
        this._addLog('Não está em sala');
      }
    });

    // Log
    $('alClearLog').addEventListener('click', () => {
      this._logLines = [];
      const el = document.getElementById('alLog');
      if (el) el.innerHTML = '';
    });
  },

  // ── Show / Hide / Refresh ─────────────────────────────────
  _show() {
    if (!this._panel) return;
    this._panel.style.display = 'block';
    this._visible = true;
    this._refresh();
    clearInterval(this._refreshTimer);
    this._refreshTimer = setInterval(() => { if (this._visible) this._refresh(); }, 500);
  },

  _hide() {
    if (!this._panel) return;
    this._panel.style.display = 'none';
    this._visible = false;
    clearInterval(this._refreshTimer);
    this._refreshTimer = null;
  },

  _refresh() {
    const $ = id => document.getElementById(id);
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    const inp = (id, v) => {
      const el = $(id);
      if (el && document.activeElement !== el) el.value = v;
    };

    // Status
    const dtMs = performance.now() - Game.lastTime;
    const fps  = dtMs > 0 ? Math.min(999, Math.round(1000 / dtMs)) : 0;
    set('alState',   Game.state);
    set('alFPS',     fps);
    set('alElapsed', this._fmt(Game.elapsed));
    set('alLevel',   DifficultySystem.level);

    // Player
    inp('alLives',    Player.lives);
    inp('alMaxLives', CONFIG.PLAYER_LIVES);
    inp('alSpeed',    CONFIG.PLAYER_SPEED);

    // Economy
    inp('alCoins', CoinSystem.get());
    inp('alScore', Game.score);

    // Enemies
    set('alEnemyCount', Enemies.pool.length);

    // Boss
    if (BossSystem.boss) {
      const b = BossSystem.boss;
      set('alBossState', b.name + ' ' + b.hp + '/' + b.maxHp + ' HP');
    } else {
      set('alBossState', 'Nenhum (timer: ' + Math.ceil(BossSystem._spawnTimer) + 's)');
    }

    // Power-ups
    set('alPUCount', PowerUps.pool.length);

    // Online
    set('alOnlineActive', OnlineMultiplayer.active   ? 'SIM' : 'NÃO');
    set('alOnlineRole',   OnlineMultiplayer.role      || 'null');
    set('alOnlineRoom',   OnlineMultiplayer.inRoom    ? 'SIM' : 'NÃO');
  },

  _fmt(s) {
    s = Math.floor(s || 0);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  },

  _addLog(msg) {
    const now  = new Date();
    const time = String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
    this._logLines.push(time + ' ' + msg);
    if (this._logLines.length > 30) this._logLines.shift();
    const logEl = document.getElementById('alLog');
    if (!logEl) return;
    const entry = document.createElement('div');
    entry.innerHTML = `<span class="al-log-t">[${time}]</span> ${msg}`;
    logEl.appendChild(entry);
    while (logEl.children.length > 30) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
  },

  // ── Drag to reposition ────────────────────────────────────
  _enableDrag() {
    const panel  = this._panel;
    const header = document.getElementById('alHeader');
    if (!panel || !header) return;

    header.style.cursor      = 'move';
    header.style.userSelect  = 'none';
    header.style.touchAction = 'none';

    let dragging = false;
    let offsetX = 0, offsetY = 0;

    const getPoint = e =>
      e.touches && e.touches[0]
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: e.clientX, y: e.clientY };

    const onDown = e => {
      if (e.target.closest('button, input, select, textarea')) return;
      const rect = panel.getBoundingClientRect();
      const pt   = getPoint(e);
      offsetX  = pt.x - rect.left;
      offsetY  = pt.y - rect.top;
      dragging = true;
      e.preventDefault();
    };

    const onMove = e => {
      if (!dragging) return;
      const pt = getPoint(e);
      const w  = panel.offsetWidth;
      const x  = Math.max(-(w - 40), Math.min(window.innerWidth  - 40, pt.x - offsetX));
      const y  = Math.max(0,          Math.min(window.innerHeight - 40, pt.y - offsetY));
      panel.style.left   = x + 'px';
      panel.style.top    = y + 'px';
      panel.style.right  = 'auto';
      panel.style.bottom = 'auto';
      e.preventDefault();
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      try {
        localStorage.setItem('ns_admin_pos', JSON.stringify({
          left: panel.style.left,
          top:  panel.style.top,
        }));
      } catch (_) {}
    };

    header.addEventListener('mousedown',  onDown);
    window.addEventListener('mousemove',  onMove);
    window.addEventListener('mouseup',    onUp);
    header.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove',  onMove, { passive: false });
    window.addEventListener('touchend',   onUp);
  },

  _restorePos() {
    try {
      const raw = localStorage.getItem('ns_admin_pos');
      if (!raw || !this._panel) return;
      const { left, top } = JSON.parse(raw);
      if (left) { this._panel.style.left = left; this._panel.style.right = 'auto'; }
      if (top)   this._panel.style.top  = top;
    } catch (_) {}
  },
};

window.AdminMode = AdminLab;

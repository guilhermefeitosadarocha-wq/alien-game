// ═══════════════════════════════════════════════════════════
//  SETTINGS UI — renderização e interação do painel
// ═══════════════════════════════════════════════════════════
const SettingsUI = {
  _overlay: null,
  _btn: null,
  _activeSection: 'controls',
  _listening: null,       // { action, btn } quando aguardando tecla
  _savedTimer: null,

  init() {
    this._overlay = document.getElementById('settingsOverlay');
    this._btn     = document.getElementById('settingsBtn');
    this._bindEvents();
    this._refreshAll();
  },

  open() {
    this._overlay.classList.add('visible');
    this._refreshAll();
    // Se veio do jogo pausado, mantém pause ativo
    SFX.play('menu_open');
  },

  close() {
    this._stopListening();
    this._overlay.classList.remove('visible');
    SFX.play('menu_close');
  },

  isOpen() { return this._overlay.classList.contains('visible'); },

  flashSaved() {
    const badge = document.getElementById('settingsSavedBadge');
    if (!badge) return;
    clearTimeout(this._savedTimer);
    badge.classList.add('visible');
    this._savedTimer = setTimeout(() => badge.classList.remove('visible'), 1400);
  },

  // ── Sincroniza UI com dados atuais ──
  _refreshAll() {
    const d = ControlSettings.data;
    if (!d) return;

    // Shoot mode
    this._setRadioGroup('shootModeGroup', d.shootMode);

    // Keybinds
    this._refreshKeybindBtns();

    // Audio
    this._setSlider('masterVol', 'masterVolVal', d.masterVol, '%');
    this._setSlider('sfxVol',    'sfxVolVal',    d.sfxVol,    '%');
    this._setCheckbox('muteToggle', d.muted);

    // Visual
    this._setSlider('glowIntensity', 'glowIntensityVal', d.glowIntensity, '');
    this._setCheckbox('particlesToggle', d.particlesOn);
    this._setCheckbox('shakeToggle', d.shakeOn);
    this._setCheckbox('flashToggle', d.flashOn);

    // Mobile
    this._setSlider('joystickSize',  'joystickSizeVal',  d.joystickSize,  'px');
    this._setSlider('mobileOpacity', 'mobileOpacityVal', d.mobileOpacity, '%');
    this._setRadioGroup('shootBtnPos', String(d.shootBtnBottom));
    this._setRadioGroup('dashMode', d.dashMode || 'button');
    // Zoom da câmera
    this._setSlider('cameraZoom', 'cameraZoomVal', Math.round(CAMERA_ZOOM * 100), '%');
  },

  _refreshKeybindBtns() {
    document.querySelectorAll('.keybind-btn').forEach(btn => {
      const action = btn.dataset.action;
      if (action) btn.textContent = this._formatCode(ControlSettings.getKey(action));
    });
  },

  _formatCode(code) {
    const map = {
      'KeyW':'W','KeyA':'A','KeyS':'S','KeyD':'D',
      'KeyP':'P','KeyQ':'Q','KeyE':'E','KeyR':'R',
      'KeyF':'F','KeyG':'G','KeyH':'H','KeyZ':'Z','KeyX':'X','KeyC':'C','KeyV':'V',
      'KeyB':'B','KeyN':'N','KeyM':'M',
      'ShiftLeft':'L-SHIFT','ShiftRight':'R-SHIFT',
      'ControlLeft':'L-CTRL','ControlRight':'R-CTRL',
      'AltLeft':'L-ALT','AltRight':'R-ALT',
      'Space':'ESPAÇO','Enter':'ENTER','Escape':'ESC',
      'ArrowUp':'↑','ArrowDown':'↓','ArrowLeft':'←','ArrowRight':'→',
      'Tab':'TAB','CapsLock':'CAPS',
    };
    if (map[code]) return map[code];
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'NUM' + code.slice(6);
    if (code.startsWith('F')) return code;
    return code;
  },

  _setSlider(id, valId, val, suffix) {
    const el = document.getElementById(id);
    const vl = document.getElementById(valId);
    if (el) el.value = val;
    if (vl) vl.textContent = val + suffix;
  },

  _setCheckbox(id, checked) {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
  },

  _setRadioGroup(groupId, value) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.settings-radio-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === value);
    });
  },

  // ── Keybind listening ──
  _startListening(action, btn) {
    this._stopListening();
    this._listening = { action, btn };
    btn.classList.add('listening');
    btn.textContent = 'Pressione...';
  },

  _stopListening() {
    if (!this._listening) return;
    this._listening.btn.classList.remove('listening');
    this._refreshKeybindBtns();
    this._listening = null;
  },

  _onKeyForRemap(e) {
    if (!this._listening) return;
    e.preventDefault();
    e.stopPropagation();
    // Bloqueia teclas proibidas
    if (['Escape'].includes(e.code)) { this._stopListening(); return; }
    ControlSettings.remapKey(this._listening.action, e.code);
    this._stopListening();
  },

  // ── Bind de todos os eventos do painel ──
  _bindEvents() {
    // Fechar
    document.getElementById('settingsCloseBtn')
      .addEventListener('click', () => this.close());

    // Overlay click-outside
    this._overlay.addEventListener('click', e => {
      if (e.target === this._overlay) this.close();
    });

    // Tecla Escape fecha painel / cancela listening
    window.addEventListener('keydown', e => {
      if (!this.isOpen()) return;
      if (e.code === 'Escape') {
        if (this._listening) { this._stopListening(); }
        else { this.close(); }
        e.preventDefault();
        return;
      }
      if (this._listening) this._onKeyForRemap(e);
    }, true);  // capture phase → antes do Input

    // Botão settings global (flutuante)
    document.getElementById('settingsBtn')
      .addEventListener('click', () => this.open());

    // Botão no pause
    const psb = document.getElementById('pauseSettingsBtn');
    if (psb) psb.addEventListener('click', () => this.open());

    // ── Abas ──
    document.getElementById('settingsTabs').addEventListener('click', e => {
      const tab = e.target.closest('.settings-tab');
      if (!tab) return;
      const section = tab.dataset.tab;
      this._activeSection = section;
      document.querySelectorAll('.settings-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === section));
      document.querySelectorAll('.settings-section').forEach(s =>
        s.classList.toggle('active', s.dataset.section === section));
    });

    // ── Shoot mode ──
    document.getElementById('shootModeGroup').addEventListener('click', e => {
      const btn = e.target.closest('.settings-radio-btn');
      if (!btn) return;
      const val = btn.dataset.value;
      this._setRadioGroup('shootModeGroup', val);
      ControlSettings.applyShootMode(val);
      ControlSettings.data.shootMode = val;
      SaveSystem.save(ControlSettings.data);
      this.flashSaved();
    });

    // ── Keybind buttons ──
    document.getElementById('settingsBody').addEventListener('click', e => {
      const btn = e.target.closest('.keybind-btn');
      if (!btn) return;
      if (this._listening && this._listening.btn === btn) {
        this._stopListening(); return;
      }
      this._startListening(btn.dataset.action, btn);
    });

    // ── Audio sliders ──
    const makeSlider = (id, valId, suffix, onChange) => {
      const el = document.getElementById(id);
      const vl = document.getElementById(valId);
      if (!el) return;
      el.addEventListener('input', () => {
        const v = parseInt(el.value);
        if (vl) vl.textContent = v + suffix;
        onChange(v);
        AudioSettings.apply(ControlSettings.data);
        SaveSystem.save(ControlSettings.data);
        this.flashSaved();
      });
    };
    makeSlider('masterVol', 'masterVolVal', '%', v => ControlSettings.data.masterVol = v);
    makeSlider('sfxVol',    'sfxVolVal',    '%', v => ControlSettings.data.sfxVol    = v);

    // Mute toggle
    document.getElementById('muteToggle').addEventListener('change', e => {
      ControlSettings.data.muted = e.target.checked;
      AudioSettings.apply(ControlSettings.data);
      SaveSystem.save(ControlSettings.data);
      this.flashSaved();
    });

    // ── Visual sliders & toggles ──
    const glowEl = document.getElementById('glowIntensity');
    if (glowEl) glowEl.addEventListener('input', () => {
      const v = parseInt(glowEl.value);
      document.getElementById('glowIntensityVal').textContent = v;
      ControlSettings.data.glowIntensity = v;
      CONFIG._glowBonus = v;
      SaveSystem.save(ControlSettings.data);
      this.flashSaved();
    });

    const makeToggle = (id, prop, onApply) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        ControlSettings.data[prop] = el.checked;
        onApply(el.checked);
        SaveSystem.save(ControlSettings.data);
        this.flashSaved();
      });
    };
    makeToggle('particlesToggle', 'particlesOn',  v => CONFIG._particlesDisabled = !v);
    makeToggle('shakeToggle',     'shakeOn',      v => CONFIG._shakeDisabled     = !v);
    makeToggle('flashToggle',     'flashOn',      v => CONFIG._flashDisabled     = !v);

    // ── Mobile ──
    makeSlider('joystickSize',  'joystickSizeVal',  'px', v => {
      ControlSettings.data.joystickSize = v;
      MobileSettings.apply(ControlSettings.data);
    });
    makeSlider('mobileOpacity', 'mobileOpacityVal', '%', v => {
      ControlSettings.data.mobileOpacity = v;
      MobileSettings.apply(ControlSettings.data);
    });
     document.getElementById('dashMode').addEventListener('click', e => {
      const btn = e.target.closest('.settings-radio-btn');
      if (!btn) return;
      const val = btn.dataset.value;
      this._setRadioGroup('dashMode', val);
      ControlSettings.data.dashMode = val;
      if (typeof DashModeSystem !== 'undefined') DashModeSystem.apply(val);
      SaveSystem.save(ControlSettings.data);
    });

    document.getElementById('shootBtnPos').addEventListener('click', e => {
      const btn = e.target.closest('.settings-radio-btn');
      if (!btn) return;
      const val = parseInt(btn.dataset.value);
      this._setRadioGroup('shootBtnPos', btn.dataset.value);
      ControlSettings.data.shootBtnBottom = val;
      MobileSettings.apply(ControlSettings.data);
      SaveSystem.save(ControlSettings.data);
      this.flashSaved();
    });

    // Qualidade gráfica
    document.getElementById('graphicsQuality').addEventListener('click', e => {
      const btn = e.target.closest('.settings-radio-btn');
      if (!btn) return;
      const val = btn.dataset.value;
      this._setRadioGroup('graphicsQuality', val);
      if (val === 'low') {
        Performance.MAX_PARTICLES = 80;
        Performance.MAX_BULLETS   = 60;
        CONFIG._glowBonus         = 0;
        CONFIG._shakeDisabled     = true;
        CONFIG._flashDisabled     = true;
      } else if (val === 'medium') {
        Performance.MAX_PARTICLES = 150;
        Performance.MAX_BULLETS   = 100;
        CONFIG._glowBonus         = 0;
        CONFIG._shakeDisabled     = false;
        CONFIG._flashDisabled     = false;
      } else if (val === 'high') {
        Performance.MAX_PARTICLES = 280;
        Performance.MAX_BULLETS   = 120;
        CONFIG._glowBonus         = 10;
        CONFIG._shakeDisabled     = false;
        CONFIG._flashDisabled     = false;
      }
      SaveSystem.save(ControlSettings.data);
      this.flashSaved();
    });

    // Sombras toggle
    document.getElementById('shadowsToggle').addEventListener('change', e => {
      CONFIG._shadowsDisabled = !e.target.checked;
      SaveSystem.save(ControlSettings.data);
      this.flashSaved();
    });

    // Partículas máximas slider
    const maxPEl = document.getElementById('maxParticles');
    const maxPValEl = document.getElementById('maxParticlesVal');
    if (maxPEl) {
      maxPEl.addEventListener('input', () => {
        const v = parseInt(maxPEl.value);
        maxPValEl.textContent = v;
        Performance.MAX_PARTICLES = v;
        SaveSystem.save(ControlSettings.data);
        this.flashSaved();
      });
    }

    // FPS alvo
    document.getElementById('targetFPS').addEventListener('click', e => {
      const btn = e.target.closest('.settings-radio-btn');
      if (!btn) return;
      this._setRadioGroup('targetFPS', btn.dataset.value);
      CONFIG._targetFPS = parseInt(btn.dataset.value);
      SaveSystem.save(ControlSettings.data);
      this.flashSaved();
    });

    // Zoom da câmera
    const cameraZoomEl    = document.getElementById('cameraZoom');
    const cameraZoomValEl = document.getElementById('cameraZoomVal');
    if (cameraZoomEl) {
      cameraZoomEl.addEventListener('input', () => {
        const v   = parseInt(cameraZoomEl.value);
        CAMERA_ZOOM = v / 100;
        cameraZoomValEl.textContent = v + '%';
        resizeCanvas();
        SaveSystem.save(ControlSettings.data);
        this.flashSaved();
      });
    }
  },
};


// ═══════════════════════════════════════════════════════════
//  ENERGY SYSTEM
//  Barra de energia usada por Dash, Ultimate e Shield.
//  Recarrega passivamente. HUD própria (DOM lateral).
// ═══════════════════════════════════════════════════════════
const EnergySystem = {
  current: 100,
  max: 100,
  rechargeRate: 8,      // por segundo
  _barEl: null, _fillEl: null,

  reset() { this.current = this.max; this._sync(); },

  spend(amount) {
    if (this.current < amount) return false;
    this.current = Math.max(0, this.current - amount);
    this._sync(); return true;
  },

  add(amount) {
    this.current = Math.min(this.max, this.current + amount);
    this._sync();
  },

  update(dt) {
    if (this.current < this.max) {
      this.current = Math.min(this.max, this.current + this.rechargeRate * dt);
      this._sync();
    }
  },

  init() {
    this._barEl  = document.getElementById('energyBar');
    this._fillEl = document.getElementById('energyFill');
    this._sync();
  },

  showBar(show) {
    if (this._barEl) this._barEl.classList.toggle('game-active', show);
  },

  _sync() {
    if (!this._fillEl) return;
    const pct = (this.current / this.max) * 100;
    this._fillEl.style.height = pct + '%';
    if (this._fillEl) {
      this._fillEl.style.background = pct > 30
        ? 'linear-gradient(to top,#00c8ff,#00ffcc)'
        : 'linear-gradient(to top,#ff4400,#ffaa00)';
    }
  },
};

// ═══════════════════════════════════════════════════════════
//  PORTAL SYSTEM
//  Portais neon que aparecem aleatoriamente na arena.
//  Efeitos: teleportar inimigos, spawn de horda, ou power-up.
// ═══════════════════════════════════════════════════════════
const PortalSystem = {
  pool: [],
  _spawnTimer: 30,

  reset() { this.pool.length = 0; this._spawnTimer = 30; },

  update(dt) {
    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) {
      this._spawnTimer = Util.rand(25, 55);
      this._spawn();
    }
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.life -= dt;
      p.angle += dt * 1.4;
      p.pulse  = (p.pulse || 0) + dt * 3;
      if (p.life <= 0) { this._trigger(p); this.pool.splice(i, 1); }
      // Attract nearby enemies
      Enemies.pool.forEach(e => {
        const dx = p.x - e.x, dy = p.y - e.y;
        const d  = Math.hypot(dx, dy);
        if (d < p.radius * 1.5 && d > 1) {
          e.x += (dx / d) * 30 * dt;
          e.y += (dy / d) * 30 * dt;
        }
      });
    }
  },

  _spawn() {
    const pad = 80;
    this.pool.push({
      x: Util.rand(pad, CONFIG.TARGET_W - pad),
      y: Util.rand(pad, CONFIG.TARGET_H - pad),
      radius: Util.rand(22, 36),
      life: Util.rand(6, 12),
      maxLife: 10,
      angle: 0, pulse: 0,
      color: Util.randItem(['rgba(0,200,255,','rgba(140,0,255,','rgba(0,255,140,']),
      type:  Util.randItem(['horde','powerup','teleport']),
    });
    Particles.burst(this.pool[this.pool.length-1].x, this.pool[this.pool.length-1].y,
      12, 'rgba(0,200,255,', 1.2);
  },

  _trigger(p) {
    if (p.type === 'horde') {
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 / 4) * i;
        Enemies.pool.push({
          x: p.x + Math.cos(a) * p.radius, y: p.y + Math.sin(a) * p.radius,
          type: 'fast', emoji: '💫', size: 14, hp: 1, maxHp: 1,
          speedFactor: 2.2, scoreBonus: 5, coinBonus: 0,
          glow: 'rgba(0,255,200,0.9)', behaviour: 'chase',
          zigzagTimer:0, zigzagAngle:0, shootTimer:0, electricPulse:0, active:true,
        });
      }
      FloatText.spawn(p.x, p.y - 30, 'PORTAL HORDE!', '#ff4488', 16, 1.5);
    } else if (p.type === 'powerup') {
      PowerUps._spawn();
      FloatText.spawn(p.x, p.y - 30, 'PORTAL DROP!', '#ffdd00', 16, 1.5);
    } else {
      // Teleport a random enemy to the other side
      if (Enemies.pool.length > 0) {
        const e = Enemies.pool[Math.floor(Math.random() * Enemies.pool.length)];
        e.x = CONFIG.TARGET_W - e.x; e.y = CONFIG.TARGET_H - e.y;
        Particles.burst(e.x, e.y, 8, 'rgba(140,0,255,', 1.0);
      }
    }
    Particles.burst(p.x, p.y, 18, p.color, 1.4);
    ScreenFX.flash(p.color + '0.15)', 0.3);
  },

  draw() {
    ctx.save();
    for (const p of this.pool) {
      const alpha = Math.min(1, p.life / 2) * (0.7 + Math.sin(p.pulse) * 0.3);
      const r = p.radius + Math.sin(p.pulse * 0.7) * 4;
      // Outer ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = p.color + alpha + ')';
      ctx.shadowColor = p.color + '0.9)';
      ctx.shadowBlur  = 20;
      ctx.lineWidth   = 3;
      ctx.stroke();
      // Spinning segments
      for (let i = 0; i < 6; i++) {
        const a1 = p.angle + (Math.PI * 2 / 6) * i;
        const a2 = a1 + 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.65, a1, a2);
        ctx.strokeStyle = p.color + (alpha * 0.8) + ')';
        ctx.lineWidth   = 2;
        ctx.stroke();
      }
      // Center glow
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 0.5);
      grad.addColorStop(0, p.color + (alpha * 0.35) + ')');
      grad.addColorStop(1, p.color + '0)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();
    }
    ctx.restore();
  },
};

// ═══════════════════════════════════════════════════════════
//  DRONE SYSTEM
//  Drones aliados que orbitam a nave, atacam inimigos e
//  coletam moedas. Desbloqueados via shop ou rewards.
// ═══════════════════════════════════════════════════════════
const DroneSystem = {
  drones: [],
  _shootTimer: 0,
  _shootInterval: 1.2,
  count: 0,   // número de drones ativos

  reset() { this.drones.length = 0; this.count = 0; this._shootTimer = 0; },

  addDrone() {
    this.count++;
    this.drones.push({
      orbitAngle: (Math.PI * 2 / Math.max(1, this.count)) * (this.count - 1),
      orbitRadius: 45 + this.count * 5,
      x: Player.x, y: Player.y,
      shootCooldown: 0,
    });
  },

  update(dt) {
    if (this.drones.length === 0) return;
    this._shootTimer -= dt;
    const speed = 2.5;
    this.drones.forEach((d, i) => {
      // Orbit — só orbita se P1 vivo
      d.orbitAngle += dt * speed;
      if (!Player._dead) {
        const targetX = Player.x + Math.cos(d.orbitAngle) * d.orbitRadius;
        const targetY = Player.y + Math.sin(d.orbitAngle) * d.orbitRadius;
        d.x += (targetX - d.x) * 0.18;
        d.y += (targetY - d.y) * 0.18;
      }

      // Shoot nearest enemy
      if (this._shootTimer <= 0) {
        let nearest = null, nearDist = 200;
        Enemies.pool.forEach(e => {
          const dist = Util.dist(d, e);
          if (dist < nearDist) { nearDist = dist; nearest = e; }
        });
        if (nearest) {
          const angle = Math.atan2(nearest.y - d.y, nearest.x - d.x);
          Bullets.pool.push({
            x: d.x, y: d.y,
            vx: Math.cos(angle) * CONFIG.BULLET_SPEED * 0.8,
            vy: Math.sin(angle) * CONFIG.BULLET_SPEED * 0.8,
            life: CONFIG.BULLET_LIFE * 0.7, active: true,
          });
        }
      }
    });
    if (this._shootTimer <= 0) this._shootTimer = this._shootInterval;
  },

  draw() {
    if (this.drones.length === 0) return;
    ctx.save();
    this.drones.forEach(d => {
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur  = 14;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,255,200,0.9)';
      ctx.fill();
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Orbit line — só desenha se P1 vivo
      if (!Player._dead) {
        ctx.beginPath();
        ctx.moveTo(Player.x, Player.y);
        ctx.lineTo(d.x, d.y);
        ctx.strokeStyle = 'rgba(0,255,200,0.12)';
        ctx.lineWidth   = 1;
        ctx.shadowBlur  = 0;
        ctx.stroke();
      }
    });
    ctx.restore();
  },
};

// ═══════════════════════════════════════════════════════════
//  SHIELD SYSTEM
//  Escudo circular que orbita a nave e bloqueia projéteis.
// ═══════════════════════════════════════════════════════════
const ShieldSystem = {
  active: false,
  hp: 0, maxHp: 3,
  angle: 0,
  radius: 30,
  _rechargeTimer: 0,
  _RECHARGE_TIME: 8,

  reset() { this.active = false; this.hp = 0; this.angle = 0; this._rechargeTimer = 0; },

  activate() {
    this.active = true;
    this.hp     = this.maxHp;
    this._rechargeTimer = 0;
    Particles.burst(Player.x, Player.y, 12, 'rgba(0,200,255,', 1.2);
    ScreenFX.flash('rgba(0,200,255,0.18)', 0.3);
  },

  update(dt) {
    this.angle += dt * 1.8;
    if (Player._dead) return;   // para completamente se P1 morto
    if (!this.active && this.hp === 0) {
      this._rechargeTimer += dt;
      if (this._rechargeTimer >= this._RECHARGE_TIME) {
        this.hp     = this.maxHp;
        this.active = true;
        this._rechargeTimer = 0;
        FloatText.spawn(Player.x, Player.y - 30, 'SHIELD RESTORED', '#00c8ff', 14, 1.2);
      }
    }
    // Block enemy bullets
    if (this.active) {
      for (let i = EnemyBullets.pool.length - 1; i >= 0; i--) {
        const b = EnemyBullets.pool[i];
        if (!b) continue;
        if (Util.dist(b, Player) < this.radius + 8) {
          EnemyBullets.pool.splice(i, 1);
          this.hp--;
          Particles.burst(b.x, b.y, 6, 'rgba(0,200,255,', 0.9);
          if (this.hp <= 0) { this.active = false; this.hp = 0; }
          break;
        }
      }
    }
  },

  draw() {
    if (!this.active && this.hp === 0) return;
    if (Player._dead) return;   // não desenha escudo se P1 morto (evita "portal")
    ctx.save();
    const alpha = this.active ? 0.55 + Math.sin(this.angle * 2) * 0.15 : 0.20;
    const r     = this.radius;
    const cx    = Player.x, cy = Player.y;
    // Shield arc segments
    const segs = this.maxHp;
    for (let i = 0; i < segs; i++) {
      const a1 = this.angle + (Math.PI * 2 / segs) * i;
      const a2 = a1 + (Math.PI * 2 / segs) - 0.15;
      const on = i < this.hp;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a1, a2);
      ctx.strokeStyle = on ? `rgba(0,200,255,${alpha})` : 'rgba(0,200,255,0.12)';
      ctx.shadowColor = 'rgba(0,200,255,0.8)';
      ctx.shadowBlur  = on ? 12 : 3;
      ctx.lineWidth   = on ? 3 : 1.5;
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ═══════════════════════════════════════════════════════════
//  ELECTRIC SYSTEM (Chain Lightning)
//  Tiro elétrico que encadeia entre inimigos próximos.
// ═══════════════════════════════════════════════════════════
const ElectricSystem = {
  active: false,   // ligado por upgrade ou reward
  _chainRange: 90,

  reset() { this.active = false; },

  // Chamado pelo Collision quando uma bala mata um inimigo
  chainFrom(x, y, _sourceIdx) {
    if (!this.active) return;
    const chainRange = this._chainRange;
    // Snapshot: coleta candidatos ANTES de remover qualquer elemento
    const candidates = [];
    for (let i = 0; i < Enemies.pool.length; i++) {
      const e = Enemies.pool[i];
      if (!e) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < chainRange && d > 1) candidates.push({ e, i, d });
    }
    // Ordena pelo mais próximo, limita a 3
    candidates.sort((a, b) => a.d - b.d);
    const targets = candidates.slice(0, 3);

    // Aplica dano de trás para frente (preserva índices durante splice)
    const toSplice = [];
    for (const { e, i } of targets) {
      e.hp--;
      Particles.burst(e.x, e.y, 6, 'rgba(80,200,255,', 1.0);
      FloatText.spawn((x + e.x) / 2, (y + e.y) / 2, '⚡', '#80ccff', 14, 0.4);
      if (e.hp <= 0) {
        const sg = (CONFIG.SCORE_PER_KILL + (e.scoreBonus || 0)) * (CONFIG._scoreBoost || 1);
        Game.score += sg;
        DifficultySystem.kills++;
        toSplice.push(i);
      }
    }
    // Remove em ordem decrescente de índice para não deslocar os anteriores
    toSplice.sort((a, b) => b - a);
    for (const idx of toSplice) {
      if (idx < Enemies.pool.length) Enemies.pool.splice(idx, 1);
    }
  },
};

// ═══════════════════════════════════════════════════════════
//  BLACK HOLE SYSTEM
//  Habilidade que puxa e danifica inimigos na área.
// ═══════════════════════════════════════════════════════════
const BlackHoleSystem = {
  holes: [],
  _cooldown: 0,
  COOLDOWN: 20,
  COST: 40,    // energia

  reset() { this.holes.length = 0; this._cooldown = 0; },

  activate() {
    if (this._cooldown > 0) return;
    if (!EnergySystem.spend(this.COST)) {
      FloatText.spawn(Player.x, Player.y - 28, 'SEM ENERGIA', '#ff4466', 13, 0.9);
      return;
    }
    this._cooldown = this.COOLDOWN;
    SlowMotion.trigger(0.35, 3.0);
    ScreenFX.flash('rgba(80,0,180,0.25)', 0.5);
    ScreenFX.shake(4, 0.4);
    this.holes.push({ x: Player.x, y: Player.y, life: 4.0, maxLife: 4.0,
      radius: 80, pulse: 0 });
    FloatText.spawn(Player.x, Player.y - 40, 'BLACK HOLE', '#aa44ff', 18, 1.5);
  },

  update(dt) {
    if (this._cooldown > 0) this._cooldown -= dt;
    for (let i = this.holes.length - 1; i >= 0; i--) {
      const h = this.holes[i];
      h.life  -= dt;
      h.pulse += dt * 4;
      if (h.life <= 0) { this.holes.splice(i, 1); continue; }
      Enemies.pool.forEach(e => {
        const dx = h.x - e.x, dy = h.y - e.y;
        const d  = Math.hypot(dx, dy);
        if (d < h.radius && d > 1) {
          const pull = (1 - d / h.radius) * 180 * dt;
          e.x += (dx / d) * pull;
          e.y += (dy / d) * pull;
          if (d < 12) { e.hp = 0; }
        }
      });
    }
  },

  draw() {
    ctx.save();
    for (const h of this.holes) {
      const a = h.life / h.maxLife;
      const r = h.radius * (0.6 + Math.sin(h.pulse * 0.5) * 0.08);
      // Dark vortex
      const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
      grad.addColorStop(0, `rgba(0,0,0,${a * 0.9})`);
      grad.addColorStop(0.4, `rgba(60,0,120,${a * 0.5})`);
      grad.addColorStop(1, 'rgba(80,0,160,0)');
      ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();
      // Spinning ring
      ctx.beginPath(); ctx.arc(h.x, h.y, r * 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(160,80,255,${a * 0.85})`;
      ctx.shadowColor = 'rgba(120,0,255,0.9)';
      ctx.shadowBlur  = 18; ctx.lineWidth = 3; ctx.stroke();
      // Distortion ring
      ctx.beginPath(); ctx.arc(h.x, h.y, r * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(80,0,180,${a * 0.4})`;
      ctx.shadowBlur  = 8; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
  },
};

// ═══════════════════════════════════════════════════════════
//  ULTIMATE SYSTEM
//  Super ataque que consume energia e dispara mega laser/EMP.
// ═══════════════════════════════════════════════════════════
const UltimateSystem = {
  _cooldown: 0,
  COOLDOWN: 25,
  COST: 80,
  type: 'laser',   // 'laser' | 'emp' | 'circle'

  reset() { this._cooldown = 0; },

  activate() {
    if (this._cooldown > 0 || !EnergySystem.spend(this.COST)) {
      FloatText.spawn(Player.x, Player.y - 28,
        this._cooldown > 0 ? 'COOLDOWN!' : 'SEM ENERGIA', '#ff4466', 13, 0.8);
      return;
    }
    this._cooldown = this.COOLDOWN;
    SlowMotion.trigger(0.3, 1.5);
    ScreenFX.shake(10, 0.5);
    ScreenFX.flash('rgba(0,200,255,0.35)', 0.5);
    FloatText.spawn(Player.x, Player.y - 50, '★ ULTIMATE ★', '#00ffcc', 22, 1.8);

    if (this.type === 'emp') {
      // EMP: destroy all normal enemies
      Enemies.pool.forEach(e => {
        Particles.burst(e.x, e.y, 10, 'rgba(0,200,255,', 1.5);
        Game.score += (CONFIG.SCORE_PER_KILL + (e.scoreBonus || 0));
        DifficultySystem.kills++;
      });
      Enemies.pool.length = 0;
      EnemyBullets.pool.length = 0;
    } else if (this.type === 'circle') {
      // Circle explosion: radial bullets
      for (let i = 0; i < 24; i++) {
        const a = (Math.PI * 2 / 24) * i;
        Bullets.pool.push({
          x: Player.x, y: Player.y,
          vx: Math.cos(a) * CONFIG.BULLET_SPEED * 0.9,
          vy: Math.sin(a) * CONFIG.BULLET_SPEED * 0.9,
          life: CONFIG.BULLET_LIFE * 1.5, active: true,
        });
      }
    } else {
      // Mega laser: instant ray along aim angle
      const angle = Player.angle;
      for (let dist = 0; dist < CONFIG.TARGET_W; dist += 18) {
        const bx = Player.x + Math.cos(angle) * dist;
        const by = Player.y + Math.sin(angle) * dist;
        for (let i = Enemies.pool.length - 1; i >= 0; i--) {
          const e = Enemies.pool[i];
          if (!e) continue;
          if (Math.hypot(e.x - bx, e.y - by) < e.size + 8) {
            Particles.burst(e.x, e.y, 14, 'rgba(0,220,255,', 1.8);
            Game.score += (CONFIG.SCORE_PER_KILL + (e.scoreBonus || 0)) * (CONFIG._scoreBoost || 1);
            DifficultySystem.kills++;
            Enemies.pool.splice(i, 1);
          }
        }
      }
      // Boss damage
      if (BossSystem.boss) BossSystem.takeDamage(8);
    }
  },

  drawHUD() {
    if (Game.state !== 'playing') return;
    const pad = 18, cy = CONFIG.TARGET_H - 38;
    const pct = Math.max(0, 1 - this._cooldown / this.COOLDOWN);
    const w   = 90;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(pad + 60, cy - 8, w, 16);
    ctx.fillStyle = `rgba(0,220,255,${0.5 + pct * 0.4})`;
    ctx.shadowColor = '#00c8ff'; ctx.shadowBlur = 8;
    ctx.fillRect(pad + 60, cy - 8, w * pct, 16);
    ctx.font = '10px "Courier New"';
    ctx.fillStyle = 'rgba(0,200,255,0.7)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText('ULTIMATE [Q]', pad + 60, cy - 20);
    ctx.restore();
  },

  update(dt) {
    if (this._cooldown > 0) this._cooldown = Math.max(0, this._cooldown - dt);
  },
};

// ═══════════════════════════════════════════════════════════
//  CHEST SYSTEM
//  Baús futuristas raros que aparecem na arena.
// ═══════════════════════════════════════════════════════════
const ChestSystem = {
  pool: [],
  _spawnTimer: 45,

  reset() { this.pool.length = 0; this._spawnTimer = 45; },

  update(dt) {
    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) {
      this._spawnTimer = Util.rand(40, 80);
      this._spawn();
    }
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const c = this.pool[i];
      c.life -= dt;
      c.pulse = (c.pulse || 0) + dt * 2;
      if (c.life <= 0) { this.pool.splice(i, 1); continue; }
      if (Util.dist(c, Player) < 20 + CONFIG.PLAYER_SIZE) {
        this._open(c);
        this.pool.splice(i, 1);
      }
    }
  },

  _spawn() {
    const pad = 60;
    this.pool.push({
      x: Util.rand(pad, CONFIG.TARGET_W - pad),
      y: Util.rand(pad, CONFIG.TARGET_H - pad),
      life: 18, maxLife: 18, pulse: 0,
      rarity: Math.random() < 0.2 ? 'rare' : 'common',
    });
  },

  _open(c) {
    Particles.burst(c.x, c.y, 20, c.rarity === 'rare' ? 'rgba(255,200,0,' : 'rgba(0,200,255,', 1.5);
    ScreenFX.flash(c.rarity === 'rare' ? 'rgba(255,200,0,0.20)' : 'rgba(0,200,255,0.12)', 0.4);
    if (c.rarity === 'rare') {
      const coins = Util.rand(8, 18) | 0;
      CoinSystem.add(coins);
      FloatText.spawn(c.x, c.y - 28, '+' + coins + ' 🪙 RARE!', '#ffdd00', 16, 1.5);
      EnergySystem.add(30);
    } else {
      const coins = Util.rand(3, 8) | 0;
      CoinSystem.add(coins);
      FloatText.spawn(c.x, c.y - 24, '+' + coins + ' 🪙', '#00c8ff', 14, 1.2);
    }
  },

  draw() {
    ctx.save();
    for (const c of this.pool) {
      const a    = Math.min(1, c.life / 3);
      const glow = c.rarity === 'rare' ? 'rgba(255,200,0,' : 'rgba(0,200,255,';
      const s    = 1 + Math.sin(c.pulse) * 0.1;
      ctx.save();
      ctx.translate(c.x, c.y); ctx.scale(s, s);
      ctx.shadowColor = glow + '0.9)'; ctx.shadowBlur = 18;
      ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = a;
      ctx.fillText(c.rarity === 'rare' ? '🎁' : '📦', 0, 0);
      ctx.restore();
    }
    ctx.restore();
  },
};


// ═══════════════════════════════════════════════════════════
//  CONTROL SETTINGS — estado vivo e aplicação de controles
// ═══════════════════════════════════════════════════════════
const ControlSettings = {
  // Estado carregado do SaveSystem
  data: null,

  load(data) {
    this.data = data;
    this._applyAll();
  },

  // ── Aplica tudo de uma vez (ao iniciar ou após reset) ──
  _applyAll() {
    this.applyShootMode(this.data.shootMode);
    AudioSettings.apply(this.data);
    VisualSettings.apply(this.data);
    MobileSettings.apply(this.data);
  },

  // ── Tecla de uma ação ──
  getKey(action) { return this.data.keys[action]; },

  // Remapeia uma ação para um novo código de tecla.
  // Garante que não haja conflito: se a tecla já está mapeada em outra ação,
  // a ação anterior recebe a tecla que estava na nova ação (swap).
  remapKey(action, newCode) {
    const keys = this.data.keys;
    // Verifica conflito
    for (const [act, code] of Object.entries(keys)) {
      if (act !== action && code === newCode) {
        // Swap: a outra ação herda a tecla antiga
        keys[act] = keys[action];
        break;
      }
    }
    keys[action] = newCode;
    SettingsUI._refreshKeybindBtns();
    SaveSystem.save(this.data);
    SettingsUI.flashSaved();
  },

  applyShootMode(mode) {
    this.data.shootMode = mode;
    // Mouse: mantém mousedown listener ativo — nada a mudar no DOM
    // Space: o Input.keys['Space'] será checado no Player.update
    // O Input._init já captura todos os keydown — só mudamos a leitura
  },

  isShootActive() {
    const m = this.data.shootMode;
    if (m === 'mouse') return Input.shooting;
    if (m === 'space') return Input.isDown('Space');
    return Input.shooting;
  },

  isKeyDown(action) {
    return Input.isDown(this.getKey(action));
  },

  isPauseKey(code) {
    return code === this.data.keys.pause;
  },

  isDashKey() {
    const k = this.data.keys.dash;
    return Input.isDown(k);
  },
};


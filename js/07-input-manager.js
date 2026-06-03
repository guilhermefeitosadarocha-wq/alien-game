// ═══════════════════════════════════════════════════════════
//  INPUT MANAGER (teclado + mouse)
// ═══════════════════════════════════════════════════════════
const Input = {
  keys: {},
  mouse: { x: CONFIG.TARGET_W / 2, y: CONFIG.TARGET_H / 2 },
  shooting: false,
  _init() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      // Captura teclas do P2 (sem listener extra)
      if (typeof P2Input !== 'undefined') P2Input.keys[e.code] = true;
      // Pause: usa tecla configurável (default P)
      if (typeof ControlSettings !== 'undefined' && ControlSettings.data) {
        if (ControlSettings.isPauseKey(e.code)) Game.togglePause();
      } else if (e.code === 'KeyP') {
        Game.togglePause();
      }
      // Ultimate (Q), BlackHole (B), Âncora (F), Pulse (G)
      if (e.code === 'KeyQ' && Game.state === 'playing') UltimateSystem.activate();
      if (e.code === 'KeyB' && Game.state === 'playing') BlackHoleSystem.activate();
      if (e.code === 'KeyF' && Game.state === 'playing') {
        if (typeof AnchorMode !== 'undefined') {
          if (AnchorMode.active) AnchorMode.deactivate();
          else AnchorMode.activate();
        }
      }
      if (e.code === 'KeyG' && Game.state === 'playing') {
        if (typeof AnchorMode !== 'undefined') AnchorMode.activatePulse();
      }
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      // Libera teclas do P2
      if (typeof P2Input !== 'undefined') P2Input.keys[e.code] = false;
    });
    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      const w = Util.toWorld(e.clientX - r.left, e.clientY - r.top);
      this.mouse.x = w.x; this.mouse.y = w.y;
    });
    canvas.addEventListener('mousedown', e => { if (e.button === 0) this.shooting = true; });
    canvas.addEventListener('mouseup',   e => { if (e.button === 0) this.shooting = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  },
  isDown(code) { return !!this.keys[code]; },
};


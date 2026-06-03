// ═══════════════════════════════════════════════════════════
//  SCREEN FX — flash, screen shake, visual distortion
// ═══════════════════════════════════════════════════════════
const ScreenFX = {
  _flashEl: null,
  _flashTimer: 0,
  shakeX: 0, shakeY: 0,
  _shakeTimer: 0,
  _shakeMag: 0,

  init() {
    this._flashEl = document.getElementById('screenFlash');
  },

  flash(color, duration) {
    if (!this._flashEl || CONFIG._flashDisabled) return;
    this._flashEl.style.background = color;
    this._flashEl.style.opacity    = '1';
    clearTimeout(this._flashOut);
    this._flashOut = setTimeout(() => {
      if (this._flashEl) this._flashEl.style.opacity = '0';
    }, duration * 1000);
  },

  shake(magnitude, duration) {
    if (CONFIG._shakeDisabled) return;
    this._shakeMag   = magnitude;
    this._shakeTimer = duration;
  },

  update(dt) {
    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
      const mag = this._shakeMag * (this._shakeTimer > 0 ? 1 : 0);
      this.shakeX = (Math.random() - 0.5) * mag * 2;
      this.shakeY = (Math.random() - 0.5) * mag * 2;
    } else {
      this.shakeX = 0; this.shakeY = 0;
    }
  },
};


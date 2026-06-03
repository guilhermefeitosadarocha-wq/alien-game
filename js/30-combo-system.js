// ═══════════════════════════════════════════════════════════
//  COMBO SYSTEM
// ═══════════════════════════════════════════════════════════
const ComboSystem = {
  count: 0,
  timer: 0,
  maxTimer: 3.0,      // segundos para resetar o combo
  multiplier: 1,
  _displayEl: null,
  _numberEl: null,
  _barFillEl: null,

  reset() {
    this.count = 0;
    this.timer = 0;
    this.multiplier = 1;
    this._syncDOM();
  },

  onKill(x, y) {
    this.count++;
    this.timer = this.maxTimer;
    this.multiplier = Math.min(8, 1 + Math.floor(this.count / 4));

    if (this.count === 3) {
      SFX.play('combo_start');  // primeiro combo
    }
    if (this.count >= 3) {
      // Bonus score for combo
      const bonus = Math.floor(CONFIG.SCORE_PER_KILL * (this.multiplier - 1));
      if (bonus > 0) {
        Game.score += bonus;
        FloatText.spawn(Player.x, Player.y - 30, '+' + bonus, '#ffdd00', 16, 1.0);
      }
    }
    this._syncDOM();
    // Animate combo number — guard duplo: _syncDOM pode deixar _numberEl null
    const numEl = this._numberEl || document.getElementById('comboNumber');
    if (numEl) {
      this._numberEl = numEl;   // garante referência para próximas chamadas
      numEl.style.animation = 'none';
      void numEl.offsetWidth;
      numEl.style.animation = 'comboPulse 0.18s ease-out';
    }
  },

  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.count >= 3) SFX.play('combo_break');
        this.count = 0;
        this.multiplier = 1;
        this._syncDOM();
      }
    }
  },

  _syncDOM() {
    if (!this._displayEl) {
      this._displayEl = document.getElementById('comboDisplay');
      this._numberEl  = document.getElementById('comboNumber');
      this._barFillEl = document.getElementById('comboBarFill');
    }
    // Guard: elemento pode ser null se DOM não estiver pronto
    if (!this._displayEl) return;
    const active = this.count >= 2;
    this._displayEl.classList.toggle('visible', active);
    if (active && this._numberEl) {
      this._numberEl.textContent = '×' + this.multiplier;
      const pct = this.timer / this.maxTimer * 100;
      if (this._barFillEl) this._barFillEl.style.width = pct + '%';
    }
  },

  // Call every frame when active
  _tickBar(dt) {
    if (this.count >= 2 && this._barFillEl) {
      const pct = Math.max(0, this.timer / this.maxTimer * 100);
      this._barFillEl.style.width = pct + '%';
    }
  },
};


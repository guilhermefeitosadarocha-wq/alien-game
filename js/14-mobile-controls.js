// ═══════════════════════════════════════════════════════════
//  MOBILE CONTROLS
// ═══════════════════════════════════════════════════════════
const Mobile = {
  joyVec: { x: 0, y: 0 },
  shooting: false,
  _joyActive: false,
  _joyOrigin: { x: 0, y: 0 },
  _joyTouchId: null,
  _shootTouchId: null,

  _init() {
    const zone     = document.getElementById('joystickZone');
    const knob     = document.getElementById('joystickKnob');
    const base     = document.getElementById('joystickBase');
    const shootBtn = document.getElementById('shootBtn');
    // baseR dinâmico: metade do diâmetro real da base no momento do toque
    const getBaseR = () => Math.round(base.offsetWidth / 2) || 60;

    const getKnobPos = (cx, cy) => {
      const baseR = getBaseR();
      const dx = cx - this._joyOrigin.x, dy = cy - this._joyOrigin.y;
      const d  = Math.hypot(dx, dy);
      const clamped = Math.min(d, baseR);
      const angle   = Math.atan2(dy, dx);
      return {
        kx: Math.cos(angle) * clamped,
        ky: Math.sin(angle) * clamped,
        nx: d > 5 ? dx / d : 0,
        ny: d > 5 ? dy / d : 0,
      };
    };

    zone.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this._joyTouchId  = t.identifier;
      this._joyActive   = true;
      const r   = zone.getBoundingClientRect();
      const bR  = getBaseR();
      const kHf = Math.round(knob.offsetWidth / 2) || 24;
      this._joyOrigin.x = t.clientX - r.left;
      this._joyOrigin.y = t.clientY - r.top;
      // Mover base para onde tocou (joystick flutuante)
      base.style.left = (this._joyOrigin.x - bR) + 'px';
      base.style.top  = (this._joyOrigin.y - bR) + 'px';
      knob.style.left = (this._joyOrigin.x - kHf) + 'px';
      knob.style.top  = (this._joyOrigin.y - kHf) + 'px';
    }, { passive: false });

    zone.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this._joyTouchId) continue;
        const r   = zone.getBoundingClientRect();
        const cx  = t.clientX - r.left, cy = t.clientY - r.top;
        const { kx, ky, nx, ny } = getKnobPos(cx, cy);
        const kHalf = Math.round(knob.offsetWidth / 2) || 24;
        knob.style.left = (this._joyOrigin.x + kx - kHalf) + 'px';
        knob.style.top  = (this._joyOrigin.y + ky - kHalf) + 'px';
        this.joyVec.x = nx; this.joyVec.y = ny;
        // Modo Âncora: joystick controla mira (rotação) em vez de movimento
        if (typeof AnchorMode !== 'undefined' && AnchorMode.active) {
          if (Math.hypot(nx, ny) > 0.08) {
            Input.mouse.x = Player.x + nx * 120;
            Input.mouse.y = Player.y + ny * 120;
          }
        } else if (Math.hypot(nx, ny) > 0.2 && !Player._dead) {
          // Modo normal: mira na direção do joystick (só se P1 vivo)
          Input.mouse.x = Player.x + nx * 60;
          Input.mouse.y = Player.y + ny * 60;
        }
      }
    }, { passive: false });

    const joyEnd = e => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this._joyTouchId) continue;
        this._joyActive = false;
        this._joyTouchId = null;
        this.joyVec.x = 0; this.joyVec.y = 0;
        // Reseta knob para o centro da base (calculado pelo tamanho real)
        const knobHalf = Math.round(knob.offsetWidth / 2) || 24;
        const baseOff  = Math.round((zone.offsetWidth - base.offsetWidth) / 2) || 10;
        knob.style.left = '';  knob.style.top  = '';  // deixa CSS (50%/translate) assumir
        base.style.left = baseOff + 'px'; base.style.top = baseOff + 'px';
      }
    };
    zone.addEventListener('touchend',    joyEnd, { passive: false });
    zone.addEventListener('touchcancel', joyEnd, { passive: false });

    // Botão de tiro
    shootBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      this.shooting = true;
    }, { passive: false });
    shootBtn.addEventListener('touchend',    e => { e.preventDefault(); this.shooting = false; }, { passive: false });
    shootBtn.addEventListener('touchcancel', e => { e.preventDefault(); this.shooting = false; }, { passive: false });
  },
};


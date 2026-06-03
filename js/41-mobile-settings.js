// ═══════════════════════════════════════════════════════════
//  MOBILE SETTINGS
// ═══════════════════════════════════════════════════════════
const MobileSettings = {
  apply(data) {
    // Joystick size
    const zone = document.getElementById('joystickZone');
    const base = document.getElementById('joystickBase');
    const knob = document.getElementById('joystickKnob');
    if (zone) {
      const s = data.joystickSize;
      zone.style.width  = s + 'px';
      zone.style.height = s + 'px';
      const bs = Math.round(s * 0.86);
      if (base) { base.style.width = bs + 'px'; base.style.height = bs + 'px'; }
      if (knob) {
        const ks = Math.round(s * 0.34);
        knob.style.width  = ks + 'px'; knob.style.height = ks + 'px';
        knob.style.top    = Math.round((bs - ks) / 2) + 'px';
        knob.style.left   = Math.round((bs - ks) / 2) + 'px';
      }
    }
    // Opacity
    const mc = document.getElementById('mobileControls');
    if (mc) mc.style.opacity = (data.mobileOpacity / 100).toFixed(2);
    // Shoot button position
    const sb = document.getElementById('shootBtn');
    if (sb) sb.style.bottom = data.shootBtnBottom + 'px';
  },
};


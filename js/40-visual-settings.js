// ═══════════════════════════════════════════════════════════
//  VISUAL SETTINGS
// ═══════════════════════════════════════════════════════════
const VisualSettings = {
  apply(data) {
    CONFIG._glowBonus          = data.glowIntensity;
    CONFIG._particlesDisabled  = !data.particlesOn;
    CONFIG._shakeDisabled      = !data.shakeOn;
    CONFIG._flashDisabled      = !data.flashOn;
  },
};


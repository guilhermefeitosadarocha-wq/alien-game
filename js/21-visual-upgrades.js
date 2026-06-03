// ═══════════════════════════════════════════════════════════
//  VISUAL UPGRADES — efeitos visuais
// ═══════════════════════════════════════════════════════════
const VisualUpgrades = {
  applyAltColor(lvl) {
    CONFIG.NEON_COLOR = lvl > 0 ? '#ff00cc' : '#00c8ff';
    CONFIG.NEON_DIM   = lvl > 0 ? 'rgba(255,0,200,0.6)' : 'rgba(0,200,255,0.6)';
  },
  applyStrongGlow(lvl) {
    CONFIG._glowBonus = lvl * 10; // adicionado ao shadowBlur base
  },
  applySpecialParticles(lvl) {
    CONFIG._rainbowParticles = lvl > 0;
  },
  applyNeonTrail(lvl) {
    CONFIG._trailLength = lvl; // 0=padrão, 1=médio, 2=longo
  },
};


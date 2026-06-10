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

// ═══════════════════════════════════════════════════════════
//  SKIN EQUIP SYSTEM — gerencia qual skin de nave está ativo
// ═══════════════════════════════════════════════════════════
const SkinEquipSystem = {
  _equipped: null,   // null = padrão; 'interceptor' = interceptor equipado

  isEquippable(id) { return id === 'skin_interceptor'; },
  isEquipped(id)   { return id === 'skin_interceptor' && this._equipped === 'interceptor'; },

  equip(id) {
    if (id !== 'skin_interceptor') return;
    if (this._equipped === 'interceptor') {
      this._equipped = null;
      Player.skin = 'default';
    } else {
      this._equipped = 'interceptor';
      Player.skin = 'interceptor';
    }
    if (typeof ShopUI !== 'undefined') ShopUI._refreshAllCards();
  },

  onPurchase(lvl) {
    if (lvl <= 0) {
      this._equipped = null;
      if (typeof Player !== 'undefined') Player.skin = 'default';
    }
  },
};


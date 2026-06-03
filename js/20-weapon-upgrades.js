// ═══════════════════════════════════════════════════════════
//  WEAPON UPGRADES — efeitos nas armas
// ═══════════════════════════════════════════════════════════
const WeaponUpgrades = {
  applyDamage(lvl) {
    CONFIG.BULLET_RADIUS = 4 + lvl * 0.8;
  },
  applyBulletSpeed(lvl) {
    CONFIG.BULLET_SPEED = 520 + lvl * 60;
  },
  applyFireRate(lvl) {
    CONFIG.FIRE_RATE = Math.max(0.07, 0.18 - lvl * 0.022);
  },
  applyDoubleShot(lvl) {
    CONFIG._doubleShot = lvl > 0;
  },
  applyTripleShot(lvl) {
    CONFIG._tripleShot = lvl > 0;
  },
  applyDiagShot(lvl) {
    CONFIG._diagShot = lvl > 0;
  },
};


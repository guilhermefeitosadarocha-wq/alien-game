// ═══════════════════════════════════════════════════════════
//  PLAYER UPGRADES — efeitos reais no gameplay
// ═══════════════════════════════════════════════════════════
const PlayerUpgrades = {
  applySpeed(lvl) {
    const newSpeed = 220 + lvl * 28;
    CONFIG.PLAYER_SPEED    = newSpeed;
    MOVE_CONFIG.BASE_SPEED = newSpeed;   // keep movement system in sync
  },
  applyMaxLives(lvl) {
    const extra = lvl - (PurchaseSystem.getLevel('max_lives') - 1);
    if (extra > 0 && Player.lives < CONFIG.PLAYER_LIVES + lvl) {
      Player.lives = Math.min(Player.lives + extra, CONFIG.PLAYER_LIVES + lvl);
    }
    CONFIG.PLAYER_LIVES = 3 + lvl;
  },
  applyShield(lvl) {
    Player.invincible = Math.max(Player.invincible, 3 + lvl * 2);
    CONFIG.INVINCIBLE_TIME = 1.8 + lvl * 0.8;
    SFX.play('shield_on');
  },
  applyDash(lvl) {
    // Aumenta velocidade temporária no início do movimento (via CONFIG)
    CONFIG._dashBonus = lvl * 60;
  },
  applyMagnet(lvl) {
    CONFIG._magnetRadius = lvl * 80;
  },
  applyScoreMult(lvl) {
    CONFIG.SCORE_PER_KILL = 10 * (1 + lvl);
  },
  applyRegen(lvl) {
    CONFIG._regenEnabled = lvl > 0;
  },
  applyCrit(lvl) {
    CONFIG._critChance = lvl * 0.12; // 12% por nível
  },
};


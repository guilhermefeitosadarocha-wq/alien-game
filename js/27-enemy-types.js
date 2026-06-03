// ═══════════════════════════════════════════════════════════
//  ENEMY TYPES — definições de todos os tipos de inimigo
// ═══════════════════════════════════════════════════════════
const EnemyTypes = {
  // Retorna objeto de configuração para o tipo dado
  get(type) {
    const T = EnemyTypes._types;
    return T[type] || T.normal;
  },
  _types: {
    normal: {
      emoji: null,           // usa CONFIG.ENEMY_EMOJIS aleatório
      size: 20, hp: 1,
      speedFactor: 1.0,
      scoreBonus: 0,
      coinBonus: 0,
      glow: 'rgba(200,0,255,0.8)',
      behaviour: 'chase',
    },
    fast: {
      emoji: '💫',
      size: 14, hp: 1,
      speedFactor: 2.2,
      scoreBonus: 5,
      coinBonus: 0,
      glow: 'rgba(0,255,200,0.9)',
      behaviour: 'chase',
    },
    tank: {
      emoji: '🗿',
      size: 32, hp: 5,
      speedFactor: 0.45,
      scoreBonus: 20,
      coinBonus: 2,
      glow: 'rgba(150,80,255,0.8)',
      behaviour: 'chase',
    },
    zigzag: {
      emoji: '👻',
      size: 18, hp: 1,
      speedFactor: 1.4,
      scoreBonus: 10,
      coinBonus: 0,
      glow: 'rgba(0,220,255,0.8)',
      behaviour: 'zigzag',
      // zigzagTimer/zigzagAngle set per-instance in Enemies.update
    },
    shooter: {
      emoji: '🎯',
      size: 22, hp: 2,
      speedFactor: 0.55,
      scoreBonus: 15,
      coinBonus: 1,
      glow: 'rgba(255,140,0,0.8)',
      behaviour: 'shooter',
      // shootTimer set per-instance in Enemies.update
    },
    electric: {
      emoji: '⚡',
      size: 20, hp: 2,
      speedFactor: 1.25,
      scoreBonus: 12,
      coinBonus: 1,
      glow: 'rgba(80,200,255,1)',
      behaviour: 'chase',
      electricPulse: 0,
    },
  },
};


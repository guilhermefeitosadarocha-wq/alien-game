// ═══════════════════════════════════════════════════════════
//  SHOP CONFIG
// ═══════════════════════════════════════════════════════════
const SHOP_CONFIG = {
  PURCHASE_COOLDOWN_MS: 400,  // anti-spam entre compras
};

// ═══════════════════════════════════════════════════════════
//  SHOP DATA — catálogo completo de itens
//  Cada item: { id, name, desc, icon, price, maxLevel,
//               category, effect(level) }
//  Para adicionar item: push para SHOP_ITEMS e implemente
//  o efeito em PlayerUpgrades ou WeaponUpgrades.
// ═══════════════════════════════════════════════════════════
const SHOP_ITEMS = [
  // ── ARMAS ───────────────────────────────────────────────
  {
    id: 'dmg_up',      category: 'armas',
    name: 'DANO+',     icon: '⚡',
    desc: 'Balas maiores causam mais dano de área.',
    price: 15, maxLevel: 5,
    effect(lvl) { WeaponUpgrades.applyDamage(lvl); },
  },
  {
    id: 'bullet_speed', category: 'armas',
    name: 'VELOCIDADE',  icon: '🚀',
    desc: 'Projéteis viajam mais rápido.',
    price: 12, maxLevel: 5,
    effect(lvl) { WeaponUpgrades.applyBulletSpeed(lvl); },
  },
  {
    id: 'double_shot', category: 'armas',
    name: 'TIRO DUPLO', icon: '🔱',
    desc: 'Dispara dois projéteis simultâneos.',
    price: 30, maxLevel: 1,
    effect(lvl) { WeaponUpgrades.applyDoubleShot(lvl); },
  },
  {
    id: 'triple_shot', category: 'armas',
    name: 'TIRO TRIPLO', icon: '💥',
    desc: 'Dispara três projéteis em leque.',
    price: 55, maxLevel: 1,
    effect(lvl) { WeaponUpgrades.applyTripleShot(lvl); },
  },
  {
    id: 'diag_shot', category: 'armas',
    name: 'DIAGONAL',   icon: '✦',
    desc: 'Adiciona tiros nas diagonais.',
    price: 45, maxLevel: 1,
    effect(lvl) { WeaponUpgrades.applyDiagShot(lvl); },
  },
  {
    id: 'fire_rate', category: 'armas',
    name: 'TIRO RÁPIDO', icon: '🔥',
    desc: 'Reduz o intervalo entre disparos.',
    price: 20, maxLevel: 5,
    effect(lvl) { WeaponUpgrades.applyFireRate(lvl); },
  },
  // ── PLAYER ──────────────────────────────────────────────
  {
    id: 'spd_up', category: 'player',
    name: 'VELOCIDADE', icon: '💨',
    desc: 'Aumenta a velocidade de movimento.',
    price: 18, maxLevel: 5,
    effect(lvl) { PlayerUpgrades.applySpeed(lvl); },
  },
  {
    id: 'max_lives', category: 'player',
    name: 'VIDA+',     icon: '❤️',
    desc: 'Adiciona uma vida máxima permanente.',
    price: 50, maxLevel: 3,
    effect(lvl) { PlayerUpgrades.applyMaxLives(lvl); },
  },
  {
    id: 'shield', category: 'player',
    name: 'ESCUDO',    icon: '🛡️',
    desc: 'Escudo temporário de invencibilidade.',
    price: 35, maxLevel: 3,
    effect(lvl) { PlayerUpgrades.applyShield(lvl); },
  },
  {
    id: 'dash_spd', category: 'player',
    name: 'DASH+',     icon: '⚡',
    desc: 'Burst de velocidade ao iniciar movimento.',
    price: 25, maxLevel: 3,
    effect(lvl) { PlayerUpgrades.applyDash(lvl); },
  },
  // ── ESPECIAIS ───────────────────────────────────────────
  {
    id: 'magnet', category: 'especiais',
    name: 'ÍMAGEM',    icon: '🧲',
    desc: 'Moedas são atraídas automaticamente.',
    price: 40, maxLevel: 3,
    effect(lvl) { PlayerUpgrades.applyMagnet(lvl); },
  },
  {
    id: 'score_mult', category: 'especiais',
    name: 'SCORE×',    icon: '✨',
    desc: 'Multiplica a pontuação por kill.',
    price: 45, maxLevel: 4,
    effect(lvl) { PlayerUpgrades.applyScoreMult(lvl); },
  },
  {
    id: 'regen', category: 'especiais',
    name: 'REGENERAR', icon: '💚',
    desc: 'Recupera 1 vida a cada 60s de sobrevivência.',
    price: 60, maxLevel: 1,
    effect(lvl) { PlayerUpgrades.applyRegen(lvl); },
  },
  {
    id: 'crit', category: 'especiais',
    name: 'CRÍTICO',   icon: '💢',
    desc: 'Chance de causar dano crítico (2× score).',
    price: 38, maxLevel: 3,
    effect(lvl) { PlayerUpgrades.applyCrit(lvl); },
  },
  // ── VISUAL ──────────────────────────────────────────────
  {
    id: 'alt_color', category: 'visual',
    name: 'COR ALT.',  icon: '🎨',
    desc: 'Muda a cor do player para magenta neon.',
    price: 20, maxLevel: 1,
    effect(lvl) { VisualUpgrades.applyAltColor(lvl); },
  },
  {
    id: 'strong_glow', category: 'visual',
    name: 'GLOW+',     icon: '🌟',
    desc: 'Aumenta intensidade do glow neon.',
    price: 15, maxLevel: 3,
    effect(lvl) { VisualUpgrades.applyStrongGlow(lvl); },
  },
  {
    id: 'special_particles', category: 'visual',
    name: 'PARTÍCULAS', icon: '🎆',
    desc: 'Explosões com partículas rainbow.',
    price: 25, maxLevel: 1,
    effect(lvl) { VisualUpgrades.applySpecialParticles(lvl); },
  },
  {
    id: 'neon_trail', category: 'visual',
    name: 'NEON TRAIL', icon: '〽️',
    desc: 'Rastro neon avançado nas balas.',
    price: 30, maxLevel: 2,
    effect(lvl) { VisualUpgrades.applyNeonTrail(lvl); },
  },
];

const SHOP_CATEGORIES = [
  { id: 'armas',     label: '⚔ ARMAS'     },
  { id: 'player',    label: '👤 PLAYER'    },
  { id: 'especiais', label: '✦ ESPECIAIS'  },
  { id: 'visual',    label: '🎨 VISUAL'    },
];


// ═══════════════════════════════════════════════════════════
//  COIN CONFIG — configuração da conversão (altere aqui)
// ═══════════════════════════════════════════════════════════
const COIN_CONFIG = {
  SCORE_COST:      100,   // score necessário por conversão
  COINS_PER_CONV:   10,   // moedas ganhas por conversão
  COOLDOWN_MS:     600,   // ms mínimos entre cliques (anti-spam)
};

// ═══════════════════════════════════════════════════════════
//  SCORE SYSTEM — estado e acesso ao score
//  (score vive em Game.score; este objeto é a API pública)
// ═══════════════════════════════════════════════════════════
const ScoreSystem = {
  get()    { return Game.score; },
  add(n)   { Game.score = Math.max(0, Game.score + n); CoinUI.syncScore(); },
  spend(n) {
    if (Game.score < n) return false;
    Game.score = Math.max(0, Game.score - n);
    CoinUI.syncScore();
    return true;
  },
};


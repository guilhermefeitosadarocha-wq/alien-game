// ═══════════════════════════════════════════════════════════
//  COIN SYSTEM — estado e operações de moeda
// ═══════════════════════════════════════════════════════════
const CoinSystem = {
  _coins: 0,
  get()    { return this._coins; },
  add(n)   { this._coins = Math.max(0, this._coins + n); CoinUI.syncCoins(); },
  spend(n) {
    if (this._coins < n) return false;
    this._coins = Math.max(0, this._coins - n);
    CoinUI.syncCoins();
    if (typeof ShopUI !== 'undefined' && ShopUI._elCoinAmt) ShopUI.syncCoinDisplay();
    return true;
  },
  reset()  { this._coins = 0; CoinUI.syncCoins(); if (typeof ShopUI !== 'undefined' && ShopUI._elCoinAmt) ShopUI.syncCoinDisplay(); },
};


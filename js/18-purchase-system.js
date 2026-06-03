// ═══════════════════════════════════════════════════════════
//  PURCHASE SYSTEM — estado de compras e lógica de transação
// ═══════════════════════════════════════════════════════════
const PurchaseSystem = {
  // Mapa id → nível atual
  levels: {},
  _cooldown: false,

  getLevel(id)   { return this.levels[id] || 0; },
  isMaxed(id)    { return this.getLevel(id) >= (SHOP_ITEMS.find(i => i.id === id)?.maxLevel ?? 1); },

  nextPrice(item) {
    const lvl = this.getLevel(item.id);
    // Preço escala: base × 1.5^level (arredondado)
    return Math.round(item.price * Math.pow(1.5, lvl));
  },

  /**
   * Tenta comprar um item. Retorna 'ok'|'maxed'|'insufficient'|'cooldown'
   */
  buy(id) {
    if (this._cooldown) return 'cooldown';
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item) return 'error';
    if (this.isMaxed(id)) return 'maxed';

    const price = this.nextPrice(item);
    if (CoinSystem.get() < price) return 'insufficient';

    // Transação
    this._cooldown = true;
    setTimeout(() => { this._cooldown = false; }, SHOP_CONFIG.PURCHASE_COOLDOWN_MS);

    CoinSystem.spend(price);
    this.levels[id] = (this.levels[id] || 0) + 1;
    const newLvl = this.levels[id];

    // Aplicar efeito
    item.effect(newLvl);

    // Atualizar UI
    ShopUI.refreshCard(id);
    ShopUI.syncCoinDisplay();
    CoinUI.syncCoins();   // sincroniza o painel externo de moedas também

    return 'ok';
  },

  reset() {
    this.levels = {};
    // Reaplica efeitos de nível 0 em todos os itens
    SHOP_ITEMS.forEach(item => item.effect(0));
  },
};


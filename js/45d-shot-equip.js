// ═══════════════════════════════════════════════════════════
//  SHOT EQUIP SYSTEM — equipar tiro duplo/triplo
//  Módulo SEPARADO. Permite ao jogador escolher qual tiro
//  usar quando possui os dois. Só um pode ficar ativo.
//  Não altera DashSystem, Bullets, WeaponUpgrades nem PurchaseSystem.
// ═══════════════════════════════════════════════════════════
const ShotEquipSystem = {
  _EQUIPPABLE: ['double_shot', 'triple_shot'],
  _equipped: null,

  isEquippable: function(id) { return this._EQUIPPABLE.indexOf(id) !== -1; },
  isEquipped:   function(id) { return this._equipped === id; },

  init: function() {
    // Se o jogador já possui algum na sessão, equipa automaticamente
    this._autoEquip();
  },

  _autoEquip: function() {
    var hasDouble = PurchaseSystem.getLevel('double_shot') > 0;
    var hasTriple = PurchaseSystem.getLevel('triple_shot') > 0;
    if (this._equipped) {
      // Já tem algo equipado (ex: comprou um, depois comprou outro na mesma sessão)
      this.syncConfig();
      return;
    }
    // Prioridade: se tem os dois e nenhum equipado, equipa o triplo (melhor)
    if (hasTriple)      this.equip('triple_shot');
    else if (hasDouble) this.equip('double_shot');
  },

  equip: function(id) {
    if (!this.isEquippable(id)) return;
    if (typeof PurchaseSystem !== 'undefined' && PurchaseSystem.getLevel(id) <= 0) return;
    this._equipped = id;
    this.syncConfig();
    // Atualiza todos os cards da loja (o outro botão muda de "EQUIPADO" pra "EQUIPAR")
    if (typeof ShopUI !== 'undefined' && typeof ShopUI._refreshAllCards === 'function') {
      ShopUI._refreshAllCards();
    }
  },

  // Sincroniza CONFIG._doubleShot / _tripleShot com o equipado
  syncConfig: function() {
    CONFIG._doubleShot = (this._equipped === 'double_shot' && PurchaseSystem.getLevel('double_shot') > 0);
    CONFIG._tripleShot = (this._equipped === 'triple_shot' && PurchaseSystem.getLevel('triple_shot') > 0);
  }
};

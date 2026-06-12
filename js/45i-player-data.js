// ═══════════════════════════════════════════════════════════
//  PLAYER DATA — persistência de coins e nave via Supabase
//  Chamado dentro de AuthSystem.onReady().
//  Falha silenciosa: jogo continua com estado em memória.
// ═══════════════════════════════════════════════════════════
const PlayerData = {
  _saveTimer: null,
  _isReady:   false,

  init() {
    console.log('[PLAYER_DATA] init iniciando');
    this.load().then(() => {
      this._patchCoinSystem();
      this._patchSkinEquipSystem();
      this._isReady = true;
      console.log('[PLAYER_DATA] init concluído');
    });
  },

  async load() {
    const uid = AuthSystem.getUserId();
    if (!uid || !AuthSystem._client) {
      console.log('[PLAYER_DATA] load ignorado (sem auth)');
      return;
    }
    try {
      const { data, error } = await AuthSystem._client
        .from('player_data')
        .select('coins, selected_ship')
        .eq('user_id', uid)
        .single();
      if (error) {
        console.warn('[PLAYER_DATA] load falhou:', error.message);
        return;
      }
      if (data) {
        CoinSystem._coins = data.coins ?? 0;
        CoinUI.syncCoins();
        Player.skin = data.selected_ship || 'default';
        SkinEquipSystem._equipped = data.selected_ship === 'interceptor' ? 'interceptor' : null;
        console.log('[PLAYER_DATA] load OK:', { coins: data.coins, selected_ship: data.selected_ship });
      }
    } catch (e) {
      console.warn('[PLAYER_DATA] load exceção:', e.message);
    }
  },

  scheduleSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.save();
    }, 400);
  },

  async save() {
    const uid = AuthSystem.getUserId();
    if (!uid || !AuthSystem._client) return;
    const updates = {
      coins:         CoinSystem._coins,
      selected_ship: (typeof Player !== 'undefined' && Player.skin) ? Player.skin : 'default',
    };
    const { error } = await AuthSystem._client
      .from('player_data')
      .update(updates)
      .eq('user_id', uid);
    if (error) {
      console.warn('[PLAYER_DATA] save falhou:', error.message);
    } else {
      console.log('[PLAYER_DATA] save OK:', updates);
    }
  },

  _patchCoinSystem() {
    const self = this;

    const _origAdd = CoinSystem.add;
    CoinSystem.add = function(n) {
      const r = _origAdd.apply(this, arguments);
      self.scheduleSave();
      return r;
    };

    const _origSpend = CoinSystem.spend;
    CoinSystem.spend = function(n) {
      const r = _origSpend.apply(this, arguments);
      self.scheduleSave();
      return r;
    };

    const _origReset = CoinSystem.reset;
    CoinSystem.reset = function() {
      const r = _origReset.apply(this, arguments);
      self.scheduleSave();
      return r;
    };
  },

  _patchSkinEquipSystem() {
    const self = this;
    const _origEquip = SkinEquipSystem.equip;
    SkinEquipSystem.equip = function(id) {
      const r = _origEquip.apply(this, arguments);
      self.scheduleSave();
      return r;
    };
  },
};

window.PlayerData = PlayerData;

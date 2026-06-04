// ═══════════════════════════════════════════════════════════
//  SHOP UI — renderização e interação do painel
// ═══════════════════════════════════════════════════════════
const ShopUI = {
  _activeCategory: 'armas',
  _elOverlay:  null,
  _elGrid:     null,
  _elTabs:     null,
  _elCoinAmt:  null,
  _elToast:    null,
  _toastTimer: null,
  _cardEls:    {},   // id → {card, btn, pips, flash}

  init() {
    this._elOverlay = document.getElementById('shopOverlay');
    this._elGrid    = document.getElementById('shopGrid');
    this._elTabs    = document.getElementById('shopTabs');
    this._elCoinAmt = document.getElementById('shopCoinAmt');
    this._elToast   = document.getElementById('shopToast');

    this._buildTabs();
    this._buildGrid();
    this._bindEvents();
    this.syncCoinDisplay();
  },

  _pausedByShop: false,

  open() {
    this._elOverlay.classList.add('visible');
    this.syncCoinDisplay();
    this._refreshAllCards();
    SFX.play('menu_open');
    // Pausa o jogo se estava playing (sem abrir o menu de pause DOM)
    if (Game.state === 'playing') {
      this._pausedByShop = true;
      FreezeSystem.freeze();
      Game.state = 'paused';
      PauseUI.syncPauseBtn('paused');
    } else {
      this._pausedByShop = false;
    }
  },

  close() {
    this._elOverlay.classList.remove('visible');
    SFX.play('menu_close');
    if (this._pausedByShop && Game.state === 'paused') {
      Game.state = 'playing';
      FreezeSystem.unfreeze();
      PauseUI.syncPauseBtn('playing');
    }
    this._pausedByShop = false;
  },

  isOpen() { return this._elOverlay.classList.contains('visible'); },

  syncCoinDisplay() {
    if (this._elCoinAmt) this._elCoinAmt.textContent = CoinSystem.get();
  },

  flashCoin() {
    if (!this._elCoinAmt) return;
    this._elCoinAmt.classList.add('flash');
    setTimeout(() => this._elCoinAmt.classList.remove('flash'), 500);
  },

  showToast(msg, type = 'success') {
    if (!this._elToast) return;
    clearTimeout(this._toastTimer);
    this._elToast.textContent = msg;
    this._elToast.className   = 'show' + (type === 'error' ? ' error' : '');
    this._toastTimer = setTimeout(() => {
      this._elToast.className = '';
    }, 2000);
  },

  _buildTabs() {
    this._elTabs.innerHTML = '';
    SHOP_CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className   = 'shop-tab' + (cat.id === this._activeCategory ? ' active' : '');
      btn.textContent = cat.label;
      btn.dataset.cat = cat.id;
      btn.addEventListener('click', () => this._switchCategory(cat.id));
      this._elTabs.appendChild(btn);
    });
  },

  _switchCategory(catId) {
    this._activeCategory = catId;
    // Atualizar abas
    this._elTabs.querySelectorAll('.shop-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === catId);
    });
    // Mostrar/ocultar cards
    Object.entries(this._cardEls).forEach(([id, els]) => {
      const item = SHOP_ITEMS.find(i => i.id === id);
      els.card.style.display = item.category === catId ? '' : 'none';
    });
  },

  _buildGrid() {
    this._elGrid.innerHTML = '';
    this._cardEls = {};

    SHOP_ITEMS.forEach(item => {
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.dataset.id = item.id;
      card.style.display = item.category === this._activeCategory ? '' : 'none';

      // Flash overlay
      const flash = document.createElement('div');
      flash.className = 'shop-card-flash';

      // Pips de nível
      const pipsEl = document.createElement('div');
      pipsEl.className = 'shop-pips';
      for (let i = 0; i < item.maxLevel; i++) {
        const pip = document.createElement('div');
        pip.className = 'shop-pip';
        pipsEl.appendChild(pip);
      }

      const levelBar = document.createElement('div');
      levelBar.className = 'shop-level-bar';
      const levelLabel = document.createElement('span');
      levelLabel.className = 'shop-level-label';
      levelLabel.textContent = 'NV';
      levelBar.appendChild(levelLabel);
      levelBar.appendChild(pipsEl);

      // Botão
      const btn = document.createElement('button');
      btn.className = 'shop-buy-btn';

      card.innerHTML = `
        <span class="shop-card-icon">${item.icon}</span>
        <span class="shop-card-name">${item.name}</span>
        <span class="shop-card-desc">${item.desc}</span>
      `;
      card.appendChild(levelBar);
      card.appendChild(btn);
      card.appendChild(flash);

      // Listener de compra — único por card
      btn.addEventListener('click', () => {
        // Shot Equip: se já comprou um tiro equipável, clica pra equipar
        if (typeof ShotEquipSystem !== 'undefined' && ShotEquipSystem.isEquippable(item.id)
            && PurchaseSystem.isMaxed(item.id)) {
          ShotEquipSystem.equip(item.id);
          this.showToast(item.name + ' equipado!', 'success');
          SFX.play('shop_buy');
          return;
        }
        const result = PurchaseSystem.buy(item.id);
        if (result === 'ok') {
          this.flashCoin();
          this._flashCard(item.id, 'success');
          this.showToast('+1 ' + item.name + ' comprado!', 'success');
          SFX.play('shop_buy');
          // Auto-equipar ao comprar tiro duplo/triplo
          if (typeof ShotEquipSystem !== 'undefined' && ShotEquipSystem.isEquippable(item.id)) {
            ShotEquipSystem.equip(item.id);
          }
        } else if (result === 'insufficient') {
          this._flashCard(item.id, 'error');
          this.showToast('Moedas insuficientes!', 'error');
          SFX.play('shop_error');
        } else if (result === 'maxed') {
          this.showToast(item.name + ' já está no máximo!', 'error');
          SFX.play('shop_error');
        }
      });

      this._elGrid.appendChild(card);
      this._cardEls[item.id] = { card, btn, pips: pipsEl.children, flash };
      this._updateCard(item.id);
    });
  },

  _flashCard(id, type) {
    const els = this._cardEls[id];
    if (!els) return;
    els.flash.className = 'shop-card-flash ' + type;
    setTimeout(() => { els.flash.className = 'shop-card-flash'; }, 350);
  },

  _updateCard(id) {
    const item = SHOP_ITEMS.find(i => i.id === id);
    const els  = this._cardEls[id];
    if (!item || !els) return;

    const lvl    = PurchaseSystem.getLevel(id);
    const maxed  = PurchaseSystem.isMaxed(id);
    const price  = PurchaseSystem.nextPrice(item);
    const canBuy = CoinSystem.get() >= price && !maxed;

    // Card classes
    els.card.classList.toggle('maxed',      maxed);
    els.card.classList.toggle('cant-afford', !canBuy && !maxed);

    // Pips
    Array.from(els.pips).forEach((pip, i) => {
      pip.classList.remove('filled', 'maxed');
      if (i < lvl) pip.classList.add(maxed ? 'maxed' : 'filled');
    });

    // Botão
    if (maxed) {
      // Shot Equip: se é tiro duplo/triplo, mostra EQUIPAR/EQUIPADO em vez de MÁXIMO
      if (typeof ShotEquipSystem !== 'undefined' && ShotEquipSystem.isEquippable(id)) {
        var isEq = ShotEquipSystem.isEquipped(id);
        els.btn.textContent = isEq ? '✓ EQUIPADO' : 'EQUIPAR';
        els.btn.disabled    = isEq;
        els.btn.className   = isEq ? 'shop-buy-btn maxed-btn' : 'shop-buy-btn';
      } else {
        els.btn.textContent = '✓ MÁXIMO';
        els.btn.disabled    = true;
        els.btn.className   = 'shop-buy-btn maxed-btn';
      }
    } else {
      els.btn.textContent = `🪙 ${price}`;
      els.btn.disabled    = !canBuy;
      els.btn.className   = 'shop-buy-btn';
    }
  },

  refreshCard(id) { this._updateCard(id); },

  _refreshAllCards() {
    SHOP_ITEMS.forEach(item => this._updateCard(item.id));
  },

  _bindEvents() {
    // Botão abrir
    document.getElementById('shopOpenBtn').addEventListener('click', () => ShopUI.open());
    // Botão fechar
    document.getElementById('shopCloseBtn').addEventListener('click', () => ShopUI.close());
    // Fechar clicando no overlay (fora do painel)
    this._elOverlay.addEventListener('click', e => {
      if (e.target === this._elOverlay) ShopUI.close();
    });
    // Tecla O abre/fecha loja
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyO') {
        ShopUI.isOpen() ? ShopUI.close() : ShopUI.open();
      }
    });
  },
};



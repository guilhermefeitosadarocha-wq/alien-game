// ═══════════════════════════════════════════════════════════
//  UI UPDATE — atualiza o painel de moedas no DOM
// ═══════════════════════════════════════════════════════════
const CoinUI = {
  _elCoinValue:   null,
  _elCoinIcon:    null,
  _elConvertBtn:  null,
  _elFeedback:    null,
  _feedbackTimer: null,
  _iconTimer:     null,

  init() {
    this._elCoinValue  = document.getElementById('coinValue');
    this._elCoinIcon   = document.getElementById('coinIcon');
    this._elConvertBtn = document.getElementById('convertBtn');
    this._elFeedback   = document.getElementById('convertFeedback');
    this.syncCoins();
  },

  syncCoins() {
    if (this._elCoinValue) this._elCoinValue.textContent = CoinSystem.get();
  },

  syncScore() { /* hook para future score DOM */ },

  showFeedback(msg, type) {
    const el = this._elFeedback;
    if (!el) return;
    clearTimeout(this._feedbackTimer);
    el.textContent = msg;
    el.className   = 'visible ' + type;
    this._feedbackTimer = setTimeout(() => { el.className = ''; }, 2200);
  },

  popCoinIcon() {
    const el = this._elCoinIcon;
    if (!el) return;
    clearTimeout(this._iconTimer);
    el.classList.add('pop');
    this._iconTimer = setTimeout(() => el.classList.remove('pop'), 300);
  },

  flashCoinValue(type) {
    const el = this._elCoinValue;
    if (!el) return;
    el.classList.remove('flash-success', 'flash-error');
    void el.offsetWidth;
    el.classList.add(type);
    setTimeout(() => el.classList.remove(type), 500);
  },

  spawnFloatingCoins(amount) {
    const btn = this._elConvertBtn;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const el   = document.createElement('span');
    el.className   = 'coin-float';
    el.textContent = '+' + amount + ' \uD83E\uDE99';
    el.style.left  = (rect.left + rect.width / 2 - 28) + 'px';
    el.style.top   = (rect.top - 4) + 'px';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  },
};


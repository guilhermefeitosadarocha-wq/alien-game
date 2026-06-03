// ═══════════════════════════════════════════════════════════
//  PAUSE UI — renderização e animações do menu de pause
// ═══════════════════════════════════════════════════════════
const PauseUI = {
  _elOverlay:     null,
  _elPauseBtn:    null,
  _elScore:       null,
  _elTime:        null,
  _elCoins:       null,

  init() {
    this._elOverlay  = document.getElementById('pauseOverlay');
    this._elPauseBtn = document.getElementById('pauseBtn');
    this._elScore    = document.getElementById('pauseScore');
    this._elTime     = document.getElementById('pauseTime');
    this._elCoins    = document.getElementById('pauseCoins');
  },

  // Mostra/oculta o botão de pause de acordo com o estado do jogo
  syncPauseBtn(gameState) {
    if (!this._elPauseBtn) return;
    const active = (gameState === 'playing' || gameState === 'paused');
    this._elPauseBtn.classList.toggle('game-active', active);
    this._elPauseBtn.textContent = gameState === 'paused' ? '▶' : '⏸';
    this._elPauseBtn.setAttribute('aria-label', gameState === 'paused' ? 'Continuar jogo' : 'Pausar jogo');
  },

  // Atualiza os valores de score/tempo/moedas no painel
  _syncInfo() {
    if (this._elScore) this._elScore.textContent = Game.score;
    if (this._elTime)  this._elTime.textContent  = UI.formatTime(Game.elapsed);
    if (this._elCoins) this._elCoins.textContent = CoinSystem.get();
  },

  showPauseMenu() {
    this._syncInfo();
    this._elOverlay.classList.add('visible');
  },

  hidePauseMenu() {
    this._elOverlay.classList.remove('visible');
  },
};


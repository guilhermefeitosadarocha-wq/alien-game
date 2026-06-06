// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
// Unlock AudioContext no primeiro gesto do usuário
(function _unlockAudio() {
  const unlock = () => { SFX._boot(); SFX._resume(); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown',     unlock, { once: true });
  window.addEventListener('touchstart',  unlock, { once: true, passive: true });
})();

// ── Carregar configurações salvas (antes de qualquer sistema) ──
ControlSettings.load(SaveSystem.load());
HighScoreSystem.load();
SupabaseSystem.init();
NameScreen.init();
ProfileSystem.init();
ProfileDelete.init();

// Botão perfil no pause
const _pauseProfileBtn = document.getElementById('pauseProfileBtn');
if (_pauseProfileBtn) {
  _pauseProfileBtn.addEventListener('click', () => {
    PauseUI.hidePauseMenu();
    ProfileSystem.show();
  });
}

// Botão perfil no menu principal
const _profileMenuBtn = document.getElementById('profileMenuBtn');
if (_profileMenuBtn) {
  _profileMenuBtn.addEventListener('click', () => ProfileSystem.show());
}

Input._init();
Mobile._init();
CoinUI.init();
ConvertSystem._init();
ShopUI.init();
PauseUI.init();
PauseEvents._init();
ScreenFX.init();
DifficultySystem.reset();
SettingsUI.init();
EnergySystem.init();
MatchModifiers.init();
MatchModifiersClose.init();
MultiplayerSystem.init();
MPModeSelect.init();
OnlineMultiplayer.init();
AnchorMode.init();
GameOverDOM.init();
TutorialSystem.init();
ShotEquipSystem.init();
DashModeSystem.init();
MobileExperience.init();
requestAnimationFrame(ts => { Game.lastTime = ts; Game.loop(ts); });
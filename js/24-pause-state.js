// ═══════════════════════════════════════════════════════════
//  PAUSE STATE — estado único e centralizado
// ═══════════════════════════════════════════════════════════
const PauseState = {
  // Estado anterior ao pause (para restaurar corretamente)
  _prePauseState: null,

  isPaused()  { return Game.state === 'paused'; },
  canPause()  { return Game.state === 'playing'; },
  canResume() { return Game.state === 'paused'; },
};

// ═══════════════════════════════════════════════════════════
//  GAME FREEZE SYSTEM — congela todos os sistemas ao pausar
//  O congelamento real já está em Game.update():
//    if (this.state !== 'playing') return;
//  Este sistema complementa: para inputs e projéteis ativos.
// ═══════════════════════════════════════════════════════════
const FreezeSystem = {
  freeze() {
    // Zerar vetor de movimento do joystick para não acumular
    Mobile.joyVec.x = 0;
    Mobile.joyVec.y = 0;
    // Parar tiro automático
    Mobile.shooting   = false;
    Input.shooting    = false;
    // Parar teclas pressionadas (evita "pulo" ao retomar)
    Input.keys = {};
  },

  unfreeze() {
    // Garantir que deltaTime não cause salto ao retomar
    // (Game.loop usa lastTime; resetamos para o timestamp atual)
    Game.lastTime = performance.now();
  },
};


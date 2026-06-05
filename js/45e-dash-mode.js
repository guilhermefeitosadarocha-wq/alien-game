// ═══════════════════════════════════════════════════════════
//  DASH MODE SYSTEM v2 — botão OU swipe direcional 4-way
//  Módulo SEPARADO. Não altera DashSystem, Input, Mobile,
//  nem qualquer mecânica existente. Apenas adiciona uma forma
//  alternativa de ativar o dash e gerencia o botão.
//
//  Melhorias v2:
//   - Detecção em tempo real durante touchmove (dispara assim que
//     o gesto é reconhecido, sem esperar o dedo soltar).
//   - 4 direções: ↑ ↓ ← → (eixo dominante).
//   - Chama DashSystem.tryDash() direto com o vetor do swipe,
//     pra que "swipe pra esquerda" execute "dash pra esquerda"
//     independente da direção do movimento atual do player.
// ═══════════════════════════════════════════════════════════
var DashModeSystem = {
  _mode: 'button',
  _swipeStartX: 0,
  _swipeStartY: 0,
  _swipeStartTime: 0,
  _swipeTracking: false,
  _swipeTriggered: false,

  // Parâmetros anti-acidente
  _MIN_DIST:   40,     // px mínimos pra reconhecer um swipe
  _MAX_TIME:   600,    // ms máximo (rejeita arrastes muito lentos)
  _AXIS_RATIO: 0.7,    // o eixo "secundário" deve ser < 70% do dominante

  init: function() {
    var data = (typeof ControlSettings !== 'undefined' && ControlSettings.data) ? ControlSettings.data : {};
    this._mode = data.dashMode || 'button';
    this.apply(this._mode);
    this._setupSwipe();
  },

  apply: function(mode) {
    this._mode = mode;
    var btn = document.getElementById('dashBtn');
    if (btn) {
      btn.classList.toggle('dash-hidden', mode === 'swipe');
    }
  },

  // Aciona o dash direcional direto pelo DashSystem (mesma função usada
  // pelo player update — preserva cooldown, energia, efeitos, som, etc.)
  _triggerDash: function(dirX, dirY) {
    if (typeof DashSystem !== 'undefined' && typeof DashSystem.tryDash === 'function') {
      DashSystem.tryDash(dirX, dirY);
    }
  },

  // Avalia se o gesto até este ponto é um swipe válido.
  // Retorna true se disparou o dash, false caso contrário.
  _evaluateGesture: function(currentX, currentY) {
    var dx = currentX - this._swipeStartX;
    var dy = currentY - this._swipeStartY;
    var dt = Date.now() - this._swipeStartTime;
    if (dt > this._MAX_TIME) return false;

    var absDx = Math.abs(dx);
    var absDy = Math.abs(dy);
    var maxAxis = absDx > absDy ? absDx : absDy;
    if (maxAxis < this._MIN_DIST) return false;

    var dirX = 0, dirY = 0;
    if (absDx >= absDy) {
      // Eixo dominante: HORIZONTAL
      if (absDx === 0 || (absDy / absDx) > this._AXIS_RATIO) return false;
      dirX = dx > 0 ? 1 : -1;
      dirY = 0;
    } else {
      // Eixo dominante: VERTICAL
      if (absDy === 0 || (absDx / absDy) > this._AXIS_RATIO) return false;
      dirX = 0;
      // dy > 0 = dedo desceu na tela = dash pra baixo no jogo
      dirY = dy > 0 ? 1 : -1;
    }

    this._triggerDash(dirX, dirY);
    return true;
  },

  _setupSwipe: function() {
    var self = this;
    var cv = document.getElementById('gameCanvas');
    if (!cv) return;

    cv.addEventListener('touchstart', function(e) {
      if (self._mode !== 'swipe') return;
      if (typeof Game === 'undefined' || Game.state !== 'playing') return;
      var t = e.touches[0];
      self._swipeStartX   = t.clientX;
      self._swipeStartY   = t.clientY;
      self._swipeStartTime = Date.now();
      self._swipeTracking  = true;
      self._swipeTriggered = false;
    }, { passive: true });

    // Detecta no MOVE (mid-gesture) pra resposta instantânea
    cv.addEventListener('touchmove', function(e) {
      if (!self._swipeTracking || self._swipeTriggered) return;
      if (self._mode !== 'swipe') return;
      if (typeof Game === 'undefined' || Game.state !== 'playing') return;
      var t = e.touches[0];
      if (self._evaluateGesture(t.clientX, t.clientY)) {
        self._swipeTriggered = true;
      }
    }, { passive: true });

    // Último check ao soltar, se o move não disparou
    cv.addEventListener('touchend', function(e) {
      if (self._swipeTracking && !self._swipeTriggered) {
        if (self._mode === 'swipe' && typeof Game !== 'undefined' && Game.state === 'playing') {
          var t = e.changedTouches[0];
          self._evaluateGesture(t.clientX, t.clientY);
        }
      }
      self._swipeTracking  = false;
      self._swipeTriggered = false;
    }, { passive: true });

    cv.addEventListener('touchcancel', function() {
      self._swipeTracking  = false;
      self._swipeTriggered = false;
    }, { passive: true });
  }
};

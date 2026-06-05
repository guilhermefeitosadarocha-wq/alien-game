// ═══════════════════════════════════════════════════════════
//  DASH MODE SYSTEM — escolha entre botão ou swipe up
//  Módulo SEPARADO. Não altera DashSystem, Input, Mobile,
//  nem nenhuma mecânica existente. Apenas adiciona uma forma
//  alternativa de ativar o dash (swipe) e gerencia a visibilidade
//  do botão conforme a configuração.
// ═══════════════════════════════════════════════════════════
var DashModeSystem = {
  _mode: 'button',
  _swipeStartX: 0,
  _swipeStartY: 0,
  _swipeStartTime: 0,
  _swipeTracking: false,

  // Parâmetros anti-ativação-acidental
  _MIN_DIST: 50,           // px mínimos pra contar como swipe
  _MAX_TIME: 400,          // ms máximo (swipe rápido, não arraste lento)
  _DIR_RATIO: 1.8,         // |dy| deve ser > dx * ratio (predominantemente vertical)

  init: function() {
    var data = (typeof ControlSettings !== 'undefined' && ControlSettings.data) ? ControlSettings.data : {};
    this._mode = data.dashMode || 'button';
    this.apply(this._mode);
    this._setupSwipe();
  },

  // Aplica o modo: mostra/esconde botão e ativa/desativa swipe
  apply: function(mode) {
    this._mode = mode;
    var btn = document.getElementById('dashBtn');
    if (btn) {
      btn.classList.toggle('dash-hidden', mode === 'swipe');
    }
  },

  // Configura os listeners de swipe no canvas (não interfere com joystick/shootBtn)
  _setupSwipe: function() {
    var self = this;
    var cv = document.getElementById('gameCanvas');
    if (!cv) return;

    cv.addEventListener('touchstart', function(e) {
      if (self._mode !== 'swipe') return;
      if (typeof Game === 'undefined' || Game.state !== 'playing') return;
      var t = e.touches[0];
      self._swipeStartX = t.clientX;
      self._swipeStartY = t.clientY;
      self._swipeStartTime = Date.now();
      self._swipeTracking = true;
    }, { passive: true });

    cv.addEventListener('touchmove', function(e) {
      // Nada a fazer no move — só rastreamos start e end
    }, { passive: true });

    cv.addEventListener('touchend', function(e) {
      if (!self._swipeTracking) return;
      self._swipeTracking = false;
      if (self._mode !== 'swipe') return;
      if (typeof Game === 'undefined' || Game.state !== 'playing') return;

      var t = e.changedTouches[0];
      var dx = t.clientX - self._swipeStartX;
      var dy = t.clientY - self._swipeStartY;
      var dt = Date.now() - self._swipeStartTime;
      var absDx = Math.abs(dx);
      var absDy = Math.abs(dy);

      // Condições de swipe válido:
      // 1) dy negativo (pra cima na tela)
      // 2) distância vertical >= mínimo
      // 3) predominantemente vertical (|dy| > |dx| * ratio)
      // 4) rápido o suficiente (< MAX_TIME ms)
      if (dy < 0 && absDy >= self._MIN_DIST && absDy > absDx * self._DIR_RATIO && dt < self._MAX_TIME) {
        // Simula um toque breve na tecla Shift (o mesmo caminho que o botão e o teclado usam)
        if (typeof Input !== 'undefined' && Input.keys) {
          Input.keys['ShiftLeft'] = true;
          setTimeout(function() {
            if (typeof Input !== 'undefined' && Input.keys) {
              Input.keys['ShiftLeft'] = false;
            }
          }, 120);
        }
      }
    }, { passive: true });

    // Cancelamento de segurança
    cv.addEventListener('touchcancel', function() {
      self._swipeTracking = false;
    }, { passive: true });
  }
};

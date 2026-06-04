// ═══════════════════════════════════════════════════════════
//  TUTORIAL SYSTEM — guia interativo passo a passo
//  Módulo SEPARADO. Não altera nenhum sistema existente.
//  Detecta automaticamente MOBILE vs DESKTOP e mostra os
//  passos certos pra cada um.
//  Só aparece na PRIMEIRA partida (localStorage).
// ═══════════════════════════════════════════════════════════
const TutorialSystem = {
  _KEY: 'neonSiege_tutorialDone',
  _overlay: null,
  _stepEl: null,
  _subEl: null,
  _iconEl: null,
  _progressEl: null,
  _currentStep: 0,
  _active: false,
  _completed: false,
  _stepDone: false,
  _isMobile: false,
  _steps: [],

  // ── Passos DESKTOP ──
  _desktopSteps: [
    {
      icon: '🎮',
      text: 'MOVA SUA NAVE',
      sub: 'Use as teclas W A S D',
      check: function() {
        return (typeof Input !== 'undefined' && Input.keys &&
          (Input.keys['KeyW'] || Input.keys['KeyA'] || Input.keys['KeyS'] || Input.keys['KeyD']));
      }
    },
    {
      icon: '🎯',
      text: 'MIRE COM O MOUSE',
      sub: 'Mova o mouse sobre a arena',
      check: function() { return TutorialSystem._mouseMoved; }
    },
    {
      icon: '💥',
      text: 'ATIRE!',
      sub: 'Clique do mouse ou aperte ESPAÇO',
      check: function() {
        return (typeof Input !== 'undefined' &&
          (Input.shooting || (Input.keys && Input.keys['Space'])));
      }
    },
    {
      icon: '⚡',
      text: 'DESVIE COM DASH',
      sub: 'Aperte SHIFT pra desviar rápido',
      check: function() {
        return (typeof Input !== 'undefined' && Input.keys &&
          (Input.keys['ShiftLeft'] || Input.keys['ShiftRight']));
      }
    },
    {
      icon: '🚀',
      text: 'PRONTO! BOA SORTE!',
      sub: 'Elimine inimigos e sobreviva o máximo',
      check: null
    }
  ],

  // ── Passos MOBILE ──
  _mobileSteps: [
    {
      icon: '🕹️',
      text: 'MOVA SUA NAVE',
      sub: 'Toque e arraste o JOYSTICK (lado esquerdo)',
      check: function() {
        return (typeof Mobile !== 'undefined' &&
          (Mobile._joyActive || Math.abs(Mobile.joyVec.x) > 0.15 || Math.abs(Mobile.joyVec.y) > 0.15));
      }
    },
    {
      icon: '💥',
      text: 'ATIRE!',
      sub: 'Toque no botão ◎ (lado direito)',
      check: function() {
        return (typeof Mobile !== 'undefined' && Mobile.shooting);
      }
    },
    {
      icon: '🚀',
      text: 'PRONTO! BOA SORTE!',
      sub: 'Elimine inimigos e sobreviva o máximo',
      check: null
    }
  ],

  _mouseMoved: false,
  _mouseListener: null,

  // ── Detectar mobile ──
  _detectMobile() {
    // Checa se os controles mobile estão visíveis
    var mc = document.getElementById('mobileControls');
    if (mc) {
      var st = getComputedStyle(mc);
      if (st.display !== 'none' && st.visibility !== 'hidden') return true;
    }
    // Fallback: tela touch com pointer grosso (celular/tablet)
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
    // Fallback: tela estreita
    if (window.innerWidth <= 768) return true;
    return false;
  },

  init() {
    try {
      if (localStorage.getItem(this._KEY) === '1') {
        this._completed = true;
        return;
      }
    } catch (e) {}

    this._createOverlay();

    // Listener de mouse (só desktop, pra detectar aim)
    this._mouseListener = function() { TutorialSystem._mouseMoved = true; };
    document.addEventListener('mousemove', this._mouseListener);

    this._watchForGameStart();
  },

  _createOverlay() {
    var ov = document.createElement('div');
    ov.id = 'tutorialOverlay';
    ov.className = 'tutorial-overlay';

    var icon = document.createElement('div');
    icon.className = 'tutorial-icon';
    ov.appendChild(icon);
    this._iconEl = icon;

    var txt = document.createElement('div');
    txt.className = 'tutorial-text';
    ov.appendChild(txt);
    this._stepEl = txt;

    var sub = document.createElement('div');
    sub.className = 'tutorial-sub';
    ov.appendChild(sub);
    this._subEl = sub;

    var prog = document.createElement('div');
    prog.className = 'tutorial-progress';
    ov.appendChild(prog);
    this._progressEl = prog;

    var skip = document.createElement('button');
    skip.className = 'tutorial-skip';
    skip.textContent = 'PULAR TUTORIAL';
    skip.addEventListener('click', function() { TutorialSystem._finish(); });
    ov.appendChild(skip);

    document.body.appendChild(ov);
    this._overlay = ov;
    ov.style.display = 'none';
  },

  _buildDots() {
    // Reconstrói as bolinhas de progresso pro número certo de passos
    this._progressEl.innerHTML = '';
    for (var i = 0; i < this._steps.length; i++) {
      var dot = document.createElement('span');
      dot.className = 'tutorial-dot';
      this._progressEl.appendChild(dot);
    }
  },

  _watchForGameStart() {
    if (this._completed) return;
    var self = this;
    var check = function() {
      if (typeof Game !== 'undefined' && Game.state === 'playing' && !self._active && !self._completed) {
        self._start();
      } else if (!self._completed) {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  },

  _start() {
    // Detectar mobile AGORA (quando o jogo está rodando, controles já visíveis)
    this._isMobile = this._detectMobile();
    this._steps = this._isMobile ? this._mobileSteps : this._desktopSteps;

    this._active = true;
    this._currentStep = 0;
    this._mouseMoved = false;
    this._buildDots();
    this._overlay.style.display = 'flex';
    this._showStep();
    this._loop();
  },

  _showStep() {
    var step = this._steps[this._currentStep];
    this._iconEl.textContent = step.icon;
    this._stepEl.textContent = step.text;
    this._subEl.textContent = step.sub;
    this._stepDone = false;

    var dots = this._progressEl.querySelectorAll('.tutorial-dot');
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.remove('done', 'current');
      if (i < this._currentStep) dots[i].classList.add('done');
      else if (i === this._currentStep) dots[i].classList.add('current');
    }

    this._overlay.classList.remove('tutorial-check');
    this._overlay.classList.add('tutorial-enter');
    var ov = this._overlay;
    setTimeout(function() { ov.classList.remove('tutorial-enter'); }, 400);
  },

  _loop() {
    if (!this._active) return;
    var step = this._steps[this._currentStep];
    var self = this;

    // Último passo (auto-dismiss)
    if (step.check === null) {
      setTimeout(function() { self._finish(); }, 2500);
      return;
    }

    // Verifica se o jogador fez a ação
    if (!this._stepDone && step.check()) {
      this._stepDone = true;
      this._overlay.classList.add('tutorial-check');
      this._iconEl.textContent = '✓';
      this._stepEl.textContent = 'FEITO!';
      this._subEl.textContent = '';

      var dots = this._progressEl.querySelectorAll('.tutorial-dot');
      if (dots[this._currentStep]) dots[this._currentStep].classList.add('done');

      setTimeout(function() {
        self._currentStep++;
        if (self._currentStep >= self._steps.length) {
          self._finish();
        } else {
          self._showStep();
          self._loop();
        }
      }, 800);
      return;
    }

    // Se saiu de 'playing' (morreu, pausou), esconde temporariamente
    if (typeof Game !== 'undefined' && Game.state !== 'playing') {
      this._overlay.style.display = 'none';
      var waitResume = function() {
        if (typeof Game !== 'undefined' && Game.state === 'playing') {
          self._overlay.style.display = 'flex';
          self._loop();
        } else if (self._active) {
          requestAnimationFrame(waitResume);
        }
      };
      requestAnimationFrame(waitResume);
      return;
    }

    requestAnimationFrame(function() { self._loop(); });
  },

  _finish() {
    this._active = false;
    this._completed = true;
    this._overlay.classList.add('tutorial-exit');
    var ov = this._overlay;
    setTimeout(function() { if (ov) ov.style.display = 'none'; }, 500);
    try { localStorage.setItem(this._KEY, '1'); } catch (e) {}
    if (this._mouseListener) {
      document.removeEventListener('mousemove', this._mouseListener);
      this._mouseListener = null;
    }
  },

  reset() {
    try { localStorage.removeItem(this._KEY); } catch (e) {}
    this._completed = false;
    this._active = false;
    this._currentStep = 0;
  }
};

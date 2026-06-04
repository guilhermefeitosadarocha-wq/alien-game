// ═══════════════════════════════════════════════════════════
//  TUTORIAL SYSTEM — guia interativo passo a passo
//  Módulo SEPARADO. Não altera nenhum sistema existente.
//  Observa inputs e Game.state sem interferir.
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

  // Definição dos passos: cada um tem texto, subtexto, ícone, e uma condição de input
  _steps: [
    {
      icon: '🎮',
      text: 'MOVA SUA NAVE',
      sub: 'Use as teclas W A S D',
      check: function() {
        return (Input && (Input.keys['w'] || Input.keys['a'] || Input.keys['s'] || Input.keys['d']));
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
        return (Input && (Input.mouse || Input.keys[' ']));
      }
    },
    {
      icon: '⚡',
      text: 'DESVIE COM DASH',
      sub: 'Aperte SHIFT pra desviar rápido',
      check: function() {
        return (Input && Input.keys['shift']);
      }
    },
    {
      icon: '🚀',
      text: 'PRONTO! BOA SORTE!',
      sub: 'Elimine inimigos e sobreviva o máximo',
      check: null  // auto-dismiss
    }
  ],

  _mouseMoved: false,
  _mouseListener: null,

  init() {
    // Se já completou o tutorial, não faz nada
    try {
      if (localStorage.getItem(this._KEY) === '1') {
        this._completed = true;
        return;
      }
    } catch (e) {}

    // Cria o overlay do tutorial via DOM (não edita HTML existente)
    this._createOverlay();

    // Listener de mouse pra detectar movimento
    this._mouseListener = () => { this._mouseMoved = true; };
    document.addEventListener('mousemove', this._mouseListener);

    // Observa quando o jogo entra no estado 'playing' pra iniciar
    this._watchForGameStart();
  },

  _createOverlay() {
    // Container principal
    const ov = document.createElement('div');
    ov.id = 'tutorialOverlay';
    ov.className = 'tutorial-overlay';

    // Ícone grande
    const icon = document.createElement('div');
    icon.className = 'tutorial-icon';
    ov.appendChild(icon);
    this._iconEl = icon;

    // Texto principal
    const txt = document.createElement('div');
    txt.className = 'tutorial-text';
    ov.appendChild(txt);
    this._stepEl = txt;

    // Subtexto (instrução)
    const sub = document.createElement('div');
    sub.className = 'tutorial-sub';
    ov.appendChild(sub);
    this._subEl = sub;

    // Barra de progresso (bolinhas)
    const prog = document.createElement('div');
    prog.className = 'tutorial-progress';
    for (let i = 0; i < this._steps.length; i++) {
      const dot = document.createElement('span');
      dot.className = 'tutorial-dot';
      prog.appendChild(dot);
    }
    ov.appendChild(prog);
    this._progressEl = prog;

    // Botão pular
    const skip = document.createElement('button');
    skip.className = 'tutorial-skip';
    skip.textContent = 'PULAR TUTORIAL';
    skip.addEventListener('click', () => this._finish());
    ov.appendChild(skip);

    document.body.appendChild(ov);
    this._overlay = ov;

    // Começa escondido
    ov.style.display = 'none';
  },

  _watchForGameStart() {
    if (this._completed) return;
    const check = () => {
      if (typeof Game !== 'undefined' && Game.state === 'playing' && !this._active && !this._completed) {
        this._start();
      } else if (!this._completed) {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  },

  _start() {
    this._active = true;
    this._currentStep = 0;
    this._mouseMoved = false;
    this._overlay.style.display = 'flex';
    this._showStep();
    this._loop();
  },

  _showStep() {
    const step = this._steps[this._currentStep];
    this._iconEl.textContent = step.icon;
    this._stepEl.textContent = step.text;
    this._subEl.textContent = step.sub;
    this._stepDone = false;

    // Atualiza bolinhas de progresso
    const dots = this._progressEl.querySelectorAll('.tutorial-dot');
    dots.forEach((d, i) => {
      d.classList.remove('done', 'current');
      if (i < this._currentStep) d.classList.add('done');
      else if (i === this._currentStep) d.classList.add('current');
    });

    // Anima entrada
    this._overlay.classList.remove('tutorial-check');
    this._overlay.classList.add('tutorial-enter');
    setTimeout(() => this._overlay.classList.remove('tutorial-enter'), 400);
  },

  _loop() {
    if (!this._active) return;
    const step = this._steps[this._currentStep];

    // Último passo (auto-dismiss) — espera 2.5s e finaliza
    if (step.check === null) {
      setTimeout(() => this._finish(), 2500);
      return;
    }

    // Verifica se o jogador fez a ação
    if (!this._stepDone && step.check()) {
      this._stepDone = true;
      // Mostra checkmark verde
      this._overlay.classList.add('tutorial-check');
      this._iconEl.textContent = '✓';
      this._stepEl.textContent = 'FEITO!';
      this._subEl.textContent = '';

      // Marca bolinha como feita
      const dots = this._progressEl.querySelectorAll('.tutorial-dot');
      if (dots[this._currentStep]) dots[this._currentStep].classList.add('done');

      // Próximo passo após breve pausa
      setTimeout(() => {
        this._currentStep++;
        if (this._currentStep >= this._steps.length) {
          this._finish();
        } else {
          this._showStep();
          this._loop();
        }
      }, 800);
      return;
    }

    // Se o jogo saiu de 'playing' (morreu, pausou), esconde temporariamente
    if (typeof Game !== 'undefined' && Game.state !== 'playing') {
      this._overlay.style.display = 'none';
      // Espera voltar a jogar
      const waitResume = () => {
        if (typeof Game !== 'undefined' && Game.state === 'playing') {
          this._overlay.style.display = 'flex';
          this._loop();
        } else if (this._active) {
          requestAnimationFrame(waitResume);
        }
      };
      requestAnimationFrame(waitResume);
      return;
    }

    requestAnimationFrame(() => this._loop());
  },

  _finish() {
    this._active = false;
    this._completed = true;
    // Anima saída
    this._overlay.classList.add('tutorial-exit');
    setTimeout(() => {
      if (this._overlay) this._overlay.style.display = 'none';
    }, 500);
    // Salva no localStorage
    try { localStorage.setItem(this._KEY, '1'); } catch (e) {}
    // Remove listener de mouse
    if (this._mouseListener) {
      document.removeEventListener('mousemove', this._mouseListener);
      this._mouseListener = null;
    }
  },

  // Permite resetar o tutorial (ex: pra testes)
  reset() {
    try { localStorage.removeItem(this._KEY); } catch (e) {}
    this._completed = false;
    this._active = false;
    this._currentStep = 0;
  }
};

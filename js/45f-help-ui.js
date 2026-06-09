// ═══════════════════════════════════════════════════════════
//  HELP UI — Modal de controles e ajuda
//  Abre sobreposto ao painel de Configurações.
//  Lê bindings de ControlSettings.getKey() em tempo real.
// ═══════════════════════════════════════════════════════════
const HelpUI = {
  _overlay:    null,
  _closeBtn:   null,
  _helpBtn:    null,
  _escHandler: null,

  init() {
    this._overlay  = document.getElementById('helpOverlay');
    this._closeBtn = document.getElementById('helpCloseBtn');
    this._helpBtn  = document.getElementById('settingsHelpBtn');

    if (this._helpBtn)  this._helpBtn.addEventListener('click',  () => this.open());
    if (this._closeBtn) this._closeBtn.addEventListener('click', () => this.close());

    // Click no backdrop (fora do painel) fecha
    if (this._overlay) {
      this._overlay.addEventListener('click', e => {
        if (e.target === this._overlay) this.close();
      });
    }
  },

  open() {
    if (!this._overlay) return;
    this._populateControls();
    this._overlay.classList.add('open');

    // ESC local — adicionado apenas enquanto o modal está aberto
    this._escHandler = e => { if (e.key === 'Escape') { this.close(); e.stopImmediatePropagation(); } };
    document.addEventListener('keydown', this._escHandler, true);

    if (this._closeBtn) this._closeBtn.focus();
  },

  close() {
    if (!this._overlay) return;
    this._overlay.classList.remove('open');

    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler, true);
      this._escHandler = null;
    }

    if (this._helpBtn) this._helpBtn.focus();
  },

  // ── Preenche as listas ao abrir — lê ControlSettings em tempo real ──
  _populateControls() {
    this._fillList('helpDesktopList', this._desktopControls());
    this._fillList('helpMobileList',  this._mobileControls());
    this._fillList('helpP2List',      this._p2Controls());
  },

  _desktopControls() {
    const k = a => this._keyLabel(ControlSettings.getKey(a));

    // Modo de tiro: 'mouse' (click) ou 'space' (barra de espaço)
    // Fonte: ControlSettings.data.shootMode — configurável na aba Controles
    const shootMode  = (ControlSettings.data && ControlSettings.data.shootMode) || 'mouse';
    const shootLabel = shootMode === 'space' ? 'ESPAÇO' : 'CLICK';

    return [
      { key: k('moveUp'),    action: 'Mover para frente'          },
      { key: k('moveDown'),  action: 'Mover para trás'            },
      { key: k('moveLeft'),  action: 'Mover para esquerda'        },
      { key: k('moveRight'), action: 'Mover para direita'         },
      { key: k('dash'),      action: 'Dash (investida)'           },
      { key: k('pause'),     action: 'Pausar / retomar jogo'      },
      // Hardcoded em 07-input-manager.js (shoot via mouse click ou espaço)
      { key: shootLabel,     action: 'Atirar'                     },
      // Hardcoded: mira sempre segue o cursor do mouse
      { key: 'MOUSE',        action: 'Mirar'                      },
      // Hardcoded: e.code === 'KeyQ' em 07-input-manager.js
      { key: 'Q',            action: 'Ultimate'                   },
      // Hardcoded: e.code === 'KeyF' em 07-input-manager.js
      { key: 'F',            action: 'Modo Âncora (ativar/desativar)' },
    ];
  },

  _mobileControls() {
    // Controles de toque — hardcoded nos elementos #joystickZone, #shootBtn, #dashBtn
    // (js/14-mobile-controls.js e css/styles.css @media hover:none)
    return [
      { key: '🕹',  action: 'Joystick — mover a nave'  },
      { key: '◎',   action: 'Botão atirar'              },
      { key: '⚡',  action: 'Botão dash (investida)'    },
    ];
  },

  _p2Controls() {
    // Hardcoded em P2Input (js/45-match-modifiers-system.js)
    return [
      { key: 'I / K / J / L', action: 'Mover (↑ ↓ ← →)'         },
      { key: 'U',              action: 'Atirar'                   },
      { key: 'O',              action: 'Dash'                     },
    ];
  },

  _fillList(listId, items) {
    const el = document.getElementById(listId);
    if (!el) return;
    el.innerHTML = '';
    items.forEach(({ key, action }) => {
      const li = document.createElement('li');
      li.className = 'help-item';
      li.innerHTML =
        `<span class="help-key">${key}</span>` +
        `<span class="help-action">${action}</span>`;
      el.appendChild(li);
    });
  },

  // Converte KeyboardEvent.code em label legível (ex.: 'KeyW' → 'W', 'ShiftLeft' → 'SHIFT')
  _keyLabel(code) {
    if (!code) return '?';
    const map = {
      ShiftLeft:    'SHIFT',   ShiftRight:   'SHIFT',
      Space:        'ESPAÇO',  Enter:        'ENTER',
      ArrowUp:      '↑',       ArrowDown:    '↓',
      ArrowLeft:    '←',       ArrowRight:   '→',
      ControlLeft:  'CTRL',    ControlRight: 'CTRL',
      AltLeft:      'ALT',     AltRight:     'ALT',
      Backspace:    '⌫',       Tab:          'TAB',
      CapsLock:     'CAPS',    Escape:       'ESC',
    };
    if (map[code]) return map[code];
    if (code.startsWith('Key'))   return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    return code;
  },
};

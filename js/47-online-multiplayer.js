// ═══════════════════════════════════════════════════════════
//  ONLINE MULTIPLAYER — Fase 1.3: lobby com conexão Supabase
//
//  Lobby aceita CRIAR SALA / ENTRAR / link de convite (?sala=).
//  Detecta quando o outro jogador entra ou sai. Game loop e
//  player rendering vêm no sub-passo 1.4.
// ═══════════════════════════════════════════════════════════

const ONLINE_SUPABASE_URL = 'https://xasgwdhartnrivgrzvri.supabase.co';
const ONLINE_SUPABASE_KEY = 'sb_publishable_L-_YjiayMOqtrX324DQy9w_JZbyZw-H';

function _onlineGerarCodigo() {
  const alfa = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem ambíguos (I, O, 0, 1)
  let s = '';
  for (let i = 0; i < 4; i++) s += alfa[Math.floor(Math.random() * alfa.length)];
  return 'NEON-' + s;
}

function _onlineNormalizaCodigo(t) {
  return (t || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

const OnlineMultiplayer = {
  // ── Estado público ─────────────────────────────────────
  active:    false,
  role:      null,        // 'host' | 'guest'
  codigo:    null,        // código da sala
  conectado: false,       // canal Supabase subscribed
  inRoom:    false,       // true quando estamos numa sala (room view do lobby)
  meuId:     'P' + Math.random().toString(36).slice(2, 5).toUpperCase(),

  // ── Estado interno ─────────────────────────────────────
  _supa:    null,
  _canal:   null,
  _outroId: null,         // id do outro jogador quando conectado

  // ── Inicialização ──────────────────────────────────────
  init() {
    console.log('[OnlineMultiplayer] módulo carregado (Fase 1.3)');

    // Cliente Supabase compartilhado
    try {
      this._supa = supabase.createClient(ONLINE_SUPABASE_URL, ONLINE_SUPABASE_KEY);
    } catch (e) {
      console.error('[OnlineMultiplayer] Supabase init falhou:', e);
    }

    // ── Botão ONLINE do menu → abre o lobby
    const btn = document.getElementById('onlineBtn');
    if (btn) btn.addEventListener('click', () => this.showLobby());

    // ── Botão X do lobby → se tá numa sala, sai; depois fecha
    const close = document.getElementById('onlineCloseBtn');
    if (close) close.addEventListener('click', () => {
      if (this.inRoom) this.sairDaSala();
      this.hideLobby();
    });

    // ── Botão CRIAR SALA
    const criarBtn = document.getElementById('onlineCriarBtn');
    if (criarBtn) criarBtn.addEventListener('click', () => this.criarSala());

    // ── Botão ENTRAR (com código digitado)
    const entrarBtn = document.getElementById('onlineEntrarBtn');
    if (entrarBtn) entrarBtn.addEventListener('click', () => {
      const input = document.getElementById('onlineCodigoInput');
      if (input) this.entrarSala(input.value);
    });

    // ── Enter no campo → ENTRAR
    const input = document.getElementById('onlineCodigoInput');
    if (input) input.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.entrarSala(input.value);
    });

    // ── Botão COPIAR LINK
    const copiarBtn = document.getElementById('onlineCopiarBtn');
    if (copiarBtn) copiarBtn.addEventListener('click', () => this._copiarLink());

    // ── Botão SAIR DA SALA (volta pro main view do lobby)
    const sairBtn = document.getElementById('onlineSairLobbyBtn');
    if (sairBtn) sairBtn.addEventListener('click', () => this.sairDaSala());

    // ── Avisa o outro lado quando a aba fechar
    window.addEventListener('beforeunload', () => {
      if (this._canal) try {
        this._canal.send({ type: 'broadcast', event: 'sai', payload: { id: this.meuId } });
      } catch (e) {}
    });

    // ── Auto-join via ?sala=CODE
    this._autoJoinFromURL();
  },

  // ── Lobby UI ───────────────────────────────────────────
  showLobby() {
    const el = document.getElementById('onlineLobby');
    if (el) el.classList.add('visible');
  },
  hideLobby() {
    const el = document.getElementById('onlineLobby');
    if (el) el.classList.remove('visible');
  },
  _showMainView() {
    const m = document.getElementById('onlineLobbyMain');
    const r = document.getElementById('onlineLobbyRoom');
    if (m) m.classList.remove('hide');
    if (r) r.classList.add('hide');
  },
  _showRoomView() {
    const m = document.getElementById('onlineLobbyMain');
    const r = document.getElementById('onlineLobbyRoom');
    if (m) m.classList.add('hide');
    if (r) r.classList.remove('hide');
  },
  _setStatus(msg) {
    const el = document.getElementById('onlineStatusMsg');
    if (el) el.textContent = msg;
  },
  _showErro(msg) {
    const el = document.getElementById('onlineLobbyErro');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hide');
    setTimeout(() => el.classList.add('hide'), 4000);
  },

  // ── Criar / Entrar / Sair da sala ──────────────────────
  criarSala() {
    if (!this._supa) { this._showErro('Supabase não inicializado.'); return; }
    const codigo = _onlineGerarCodigo();
    this._abrirSala(codigo, true);
  },

  entrarSala(codigoRaw) {
    if (!this._supa) { this._showErro('Supabase não inicializado.'); return; }
    let c = _onlineNormalizaCodigo(codigoRaw);
    if (c.length < 4) { this._showErro('Digite um código válido (ex: NEON-A23K)'); return; }
    if (!c.startsWith('NEON-')) c = 'NEON-' + c.replace(/^-+/, '');
    this._abrirSala(c, false);
  },

  _abrirSala(codigo, comoHost) {
    this.codigo  = codigo;
    this.role    = comoHost ? 'host' : 'guest';
    this.inRoom  = true;
    this._outroId = null;

    const codigoView = document.getElementById('onlineCodigoView');
    if (codigoView) codigoView.textContent = codigo;
    this._setStatus(comoHost ? 'Aguardando segundo jogador...' : 'Conectando...');
    this.showLobby();
    this._showRoomView();

    this._canal = this._supa.channel('neon-' + codigo, {
      config: { broadcast: { self: false } }
    });

    this._registerHandlers(this._canal);

    this._canal.subscribe(estado => {
      if (estado === 'SUBSCRIBED') {
        this.conectado = true;
        if (!comoHost) {
          // Convidado se anuncia
          this._canal.send({
            type: 'broadcast', event: 'hello',
            payload: { id: this.meuId }
          });
        }
      } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
        this._showErro('Erro de conexão. Tente novamente.');
        this.sairDaSala();
      }
    });
  },

  _registerHandlers(c) {
    // Host recebe quando convidado entra
    c.on('broadcast', { event: 'hello' }, ({ payload }) => {
      if (this.role !== 'host') return;
      this._outroId = payload.id;
      this._setStatus('✓ Jogador conectado! ID: ' + payload.id);
      // Host responde pro convidado saber que tem alguém
      this._canal.send({
        type: 'broadcast', event: 'hello_ack',
        payload: { id: this.meuId }
      });
    });

    // Convidado recebe confirmação do host
    c.on('broadcast', { event: 'hello_ack' }, ({ payload }) => {
      if (this.role !== 'guest') return;
      this._outroId = payload.id;
      this._setStatus('✓ Conectado ao host! ID: ' + payload.id);
    });

    // Outro lado saiu
    c.on('broadcast', { event: 'sai' }, ({ payload }) => {
      if (this._outroId === payload.id) {
        this._outroId = null;
        this._setStatus(this.role === 'host'
          ? 'Outro jogador saiu. Aguardando...'
          : 'Host saiu da sala.');
      }
    });
  },

  sairDaSala() {
    if (this._canal) {
      try {
        this._canal.send({ type: 'broadcast', event: 'sai', payload: { id: this.meuId } });
      } catch (e) {}
      try { this._supa.removeChannel(this._canal); } catch (e) {}
      this._canal = null;
    }
    this.codigo    = null;
    this.role      = null;
    this.conectado = false;
    this.inRoom    = false;
    this._outroId  = null;
    this._showMainView();
    const input = document.getElementById('onlineCodigoInput');
    if (input) input.value = '';
  },

  // ── Copiar link de convite ─────────────────────────────
  async _copiarLink() {
    if (!this.codigo) return;
    const link = location.origin + location.pathname + '?sala=' + encodeURIComponent(this.codigo);
    const btn = document.getElementById('onlineCopiarBtn');
    if (!btn) return;
    const originalText = btn.textContent;
    try {
      await navigator.clipboard.writeText(link);
      btn.textContent = '✓ LINK COPIADO';
    } catch (e) {
      // Fallback pra navegadores antigos
      const tmp = document.createElement('textarea');
      tmp.value = link;
      document.body.appendChild(tmp);
      tmp.select();
      try { document.execCommand('copy'); btn.textContent = '✓ LINK COPIADO'; }
      catch (e2) { btn.textContent = '✕ FALHOU'; }
      document.body.removeChild(tmp);
    }
    setTimeout(() => { btn.textContent = originalText; }, 1800);
  },

  // ── Auto-join via ?sala=CODE na URL ────────────────────
  _autoJoinFromURL() {
    const params = new URLSearchParams(location.search);
    const salaParam = params.get('sala');
    if (!salaParam) return;
    setTimeout(() => {
      this.showLobby();
      this.entrarSala(salaParam);
    }, 300);
  },

  // ── Stubs pra próximos sub-passos ──────────────────────
  update(dt) { /* sub-passo 1.4 */ },
  draw()     { /* sub-passo 1.4 */ },
};
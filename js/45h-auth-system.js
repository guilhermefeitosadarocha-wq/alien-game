// ═══════════════════════════════════════════════════════════
//  AUTH SYSTEM — Supabase Anonymous Auth (silenciosa)
//  Cria ou restaura sessão anônima com timeout de 5 s.
//  Falha silenciosa: jogo continua só com localStorage.
// ═══════════════════════════════════════════════════════════
const AuthSystem = {
  _URL: 'https://xasgwdhartnrivgrzvri.supabase.co',
  _KEY: 'sb_publishable_L-_YjiayMOqtrX324DQy9w_JZbyZw-H',
  _client:    null,
  _userId:    null,
  _ready:     false,
  _callbacks: [],

  init() {
    try {
      this._client = supabase.createClient(this._URL, this._KEY, {
        auth: {
          persistSession:     true,
          autoRefreshToken:   true,
          detectSessionInUrl: false,
        },
      });
    } catch (_) {
      // supabase SDK não disponível — modo offline total
      this._ready = true;
      return;
    }

    const timeout = new Promise(resolve => setTimeout(resolve, 5000));

    Promise.race([this._tryAuth(), timeout])
      .catch(() => {})
      .finally(() => {
        this._ready = true;
        this._flush();
      });
  },

  async _tryAuth() {
    try {
      const { data: { session } } = await this._client.auth.getSession();
      if (session && session.user) {
        this._userId = session.user.id;
        return;
      }
      const { data, error } = await this._client.auth.signInAnonymously();
      if (!error && data && data.user) this._userId = data.user.id;
    } catch (_) {}
  },

  onReady(cb) {
    if (this._ready) { try { cb(); } catch (_) {} return; }
    this._callbacks.push(cb);
  },

  _flush() {
    const cbs = this._callbacks.splice(0);
    cbs.forEach(cb => { try { cb(); } catch (_) {} });
  },

  getUserId() { return this._userId; },

  // Sincroniza nome e avatar do localStorage com a tabela profiles.
  // No-op se auth ainda não completou ou falhou.
  syncProfile() {
    if (!this._userId || !this._client) return;
    const name   = localStorage.getItem('neonSiege_playerName')   || '';
    const avatar = localStorage.getItem('neonSiege_playerAvatar') || '';
    if (!name) return;
    this._client
      .from('profiles')
      .upsert(
        { id: this._userId, name, avatar, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      .then(() => {})
      .catch(() => {});
  },
};

window.AuthSystem = AuthSystem;

// ═══════════════════════════════════════════════════════════
//  ONLINE MULTIPLAYER — Fase 1: estrutura básica
//
//  Quando `active = true`, Game.update() e Game.draw() desviam
//  pra um loop online minimalista (player + balas + render do
//  outro jogador). Nenhum sistema "mundo" (inimigos, bosses,
//  drones, etc.) roda no modo online ainda — vamos ligando
//  aos poucos nas fases seguintes.
// ═══════════════════════════════════════════════════════════
const OnlineMultiplayer = {
  // ── Estado público ─────────────────────────────────────
  active:    false,     // true quando estamos numa partida online
  role:      null,      // 'host' | 'guest'
  codigo:    null,      // código da sala
  conectado: false,     // canal Supabase subscribed
  meuId:     'P' + Math.random().toString(36).slice(2, 5).toUpperCase(),

  // ── Estado interno ─────────────────────────────────────
  _canal:     null,
  _outraNave: null,     // { ativa, id, x, y, angle, buffer, vidas }
  _supa:      null,     // cliente Supabase

  // ── Inicialização (chamado uma vez no boot) ────────────
  init() {
    // Por enquanto só registra o módulo. Lobby/conexão/loop
    // virão nos sub-passos 1.2, 1.3, 1.4 e 1.5.
    console.log('[OnlineMultiplayer] módulo carregado (Fase 1, stub)');
  },

  // ── API pública (stubs — serão implementados depois) ───
  showLobby()    { /* sub-passo 1.2 */ },
  hideLobby()    { /* sub-passo 1.2 */ },
  criarSala()    { /* sub-passo 1.3 */ },
  entrarSala(c)  { /* sub-passo 1.3 */ },
  sairDaSala()   { /* sub-passo 1.5 */ },
  update(dt)     { /* sub-passo 1.4 */ },
  draw()         { /* sub-passo 1.4 */ },
};
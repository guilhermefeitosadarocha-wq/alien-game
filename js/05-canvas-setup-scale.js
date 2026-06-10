// ═══════════════════════════════════════════════════════════
//  CANVAS SETUP & SCALE
// ═══════════════════════════════════════════════════════════
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let scale = 1;
let offsetX = 0, offsetY = 0;

// ── MOBILE DETECTION ─────────────────────────────────────────
// Detecta mobile uma vez; usado para ajustes de escala e HUD.
const MobileDetect = {
  isMobile: /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024),
  isLandscape() { return window.innerWidth > window.innerHeight; },
  safeTop()    { return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0') || 0; },
  safeBottom() { return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0') || 0; },
};

// Altura de referência para a qual todas as velocidades e tamanhos foram calibrados.
const _ARENA_BASE_H = 780;

// ── CANVAS RESIZE — arena dinâmica: preenche toda a tela sem barras pretas ──
// Scale é calculado pela altura (preserva tamanho visual dos elementos).
// TARGET_W e TARGET_H são derivados do viewport — mais tela = mais arena.
// Mobile recebe 1.35× de zoom: arena menor, elementos maiores para toque.
function resizeCanvas() {
  const vvp = window.visualViewport;
  const sw  = vvp ? vvp.width  : window.innerWidth;
  const sh  = vvp ? vvp.height : window.innerHeight;

  canvas.width  = sw;
  canvas.height = sh;

  scale = MobileDetect.isMobile
    ? (sh / _ARENA_BASE_H) * 1.35
    : (sh / _ARENA_BASE_H);

  scale   = scale * CAMERA_ZOOM;
  offsetX = 0;
  offsetY = 0;

  CONFIG.TARGET_W = Math.round(sw / scale);
  CONFIG.TARGET_H = Math.round(sh / scale);

  if (typeof Player !== 'undefined' && Player.x !== undefined) {
    const r = CONFIG.PLAYER_SIZE;
    Player.x = Math.max(r, Math.min(CONFIG.TARGET_W - r, Player.x));
    Player.y = Math.max(r, Math.min(CONFIG.TARGET_H - r, Player.y));
  }
}
resizeCanvas();

// Escuta resize e visualViewport (mobile browser chrome show/hide)
window.addEventListener('resize', resizeCanvas);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resizeCanvas);
  window.visualViewport.addEventListener('scroll', resizeCanvas);
}

// Atualiza ao mudar orientação
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 120));

